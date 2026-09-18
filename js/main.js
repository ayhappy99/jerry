// 부트스트랩과 화면 라우팅. 사용자에게 보여줄 오류 메시지는 이 파일 한 곳에서만 만든다.

import {
  BETS,
  JACKPOT_CONTRIB_RATE,
  MODES,
  MODE_KEYS,
  REFILL_AMOUNT,
} from './config.js';
import { evaluateSpin, totalBetOf } from './engine.js';
import { buildGrid, drawStops } from './rng.js';
import { renderReels } from './reels.js';
import * as storage from './storage.js';
import { mountSymbolSprite } from './symbols.js';
import * as ui from './ui.js';

const game = {
  state: null,
  mode: null,
  lineBet: 0,
  freeSpinsLeft: 0,
  busy: false,
  auto: false,
};

function currentTotalBet() {
  return totalBetOf(game.mode, game.lineBet);
}

function syncMeters() {
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(game.lineBet, game.mode);
  ui.setJackpot(game.state.jackpot.pool);
  ui.setBetButtons(game.state.settings.betIdx);
  ui.setFreeSpinBadge(game.freeSpinsLeft);
}

function syncJackpotHint() {
  ui.setJackpotHint(
    game.mode.jackpot
      ? '한 라인에 다이아 5개 · 매 스핀 총 베팅의 1% 적립'
      : '프리스핀·잭팟 모드에서만 적중합니다',
  );
}

function blankGrid(mode) {
  return buildGrid(mode.strips, drawStops(mode.strips), mode.rows);
}

function selectMode(modeKey) {
  game.mode = MODES[modeKey];
  game.state.settings.mode = modeKey;
  ui.renderModeTabs(modeKey);
  renderReels(ui.reelsHost(), game.mode, blankGrid(game.mode));
  syncJackpotHint();
  syncMeters();
  storage.save(game.state);
}

function changeBet(nextIdx) {
  game.state.settings.betIdx = nextIdx;
  game.lineBet = BETS[nextIdx];
  syncMeters();
  storage.save(game.state);
}

// ── 스핀 ──────────────────────────────────

function recordStats(result) {
  const stats = game.state.stats;
  stats.spins += 1;
  if (!result.freeSpin) stats.totalWagered += result.totalBet;
  stats.totalWon += result.totalWin;
  if (result.freeSpinsAwarded > 0 && !result.freeSpin) stats.freeSpinsTriggered += 1;
  if (result.totalWin > stats.bestWin) {
    stats.bestWin = result.totalWin;
    stats.bestWinAt = Date.now();
  }
  if (result.totalWin > 0) {
    stats.currentDrySpell = 0;
  } else {
    stats.currentDrySpell += 1;
    stats.longestDrySpell = Math.max(stats.longestDrySpell, stats.currentDrySpell);
  }
}

function recordWinHistory(result) {
  if (result.jackpot.hit) {
    storage.addJackpotRecord(game.state, {
      nickname: game.state.player.nickname,
      amount: result.jackpot.amount,
      mode: result.modeKey,
      bet: result.totalBet,
      at: Date.now(),
    });
  }
  if (result.tier === 'big' || result.tier === 'mega') {
    storage.addBigWinRecord(game.state, {
      nickname: game.state.player.nickname,
      amount: result.totalWin,
      mode: result.modeKey,
      bet: result.totalBet,
      multiple: result.totalWin / result.totalBet,
      at: Date.now(),
    });
  }
}

function resultMessage(result) {
  if (result.jackpot.hit) return `잭팟! ${ui.formatCoins(result.jackpot.amount)} 획득`;
  if (result.freeSpinsAwarded > 0) return `스캐터 ${result.scatter.count}개! 프리스핀 10회`;
  if (result.totalWin > 0) {
    const lines = result.lineWins.length;
    return `${lines}개 라인 당첨 · ${ui.formatCoins(result.totalWin)}`;
  }
  return '';
}

function readoutText(result) {
  if (result.totalWin === 0) return '당첨 없음';
  return `${ui.formatCoins(result.totalWin)} 코인 당첨`;
}

async function runSpin() {
  const isFree = game.freeSpinsLeft > 0;
  const totalBet = currentTotalBet();
  if (!isFree && game.state.wallet.coins < totalBet) {
    ui.toast('코인이 부족합니다. 충전 버튼을 눌러 주세요.');
    stopAuto();
    return;
  }

  game.busy = true;
  ui.setBusy(true, game.auto);
  ui.setWin(0);
  ui.setMessage('');

  if (isFree) {
    game.freeSpinsLeft -= 1;
  } else {
    game.state.wallet.coins -= totalBet;
    game.state.jackpot.pool += totalBet * JACKPOT_CONTRIB_RATE;
  }
  ui.setCredit(game.state.wallet.coins);
  ui.setJackpot(game.state.jackpot.pool);

  // 결과는 여기서 완전히 확정된다. 이후 연출은 이 결과를 보여줄 뿐이다.
  const stops = drawStops(game.mode.strips);
  const grid = buildGrid(game.mode.strips, stops, game.mode.rows);
  const result = evaluateSpin({
    modeKey: game.mode.key,
    grid,
    lineBet: game.lineBet,
    freeSpin: isFree,
    jackpotPool: game.state.jackpot.pool,
  });

  renderReels(ui.reelsHost(), game.mode, grid);

  if (result.jackpot.hit) game.state.jackpot.pool = game.state.jackpot.seed;
  game.state.wallet.coins += result.totalWin;
  game.freeSpinsLeft += result.freeSpinsAwarded;
  recordStats(result);
  recordWinHistory(result);

  ui.setWin(result.totalWin);
  ui.setMessage(resultMessage(result));
  ui.setReadout(readoutText(result));
  syncMeters();

  // 스핀 1회당 저장은 여기 한 번뿐이다.
  storage.save(game.state);

  game.busy = false;
  ui.setBusy(false, game.auto);
}

function stopAuto() {
  game.auto = false;
  ui.setAutoButton(false);
  ui.setBusy(game.busy, false);
}

// ── 이벤트 배선 ───────────────────────────

function wireControls() {
  ui.el.modes.addEventListener('click', (event) => {
    const tab = event.target.closest('.mode-tab');
    if (tab === null || tab.disabled) return;
    selectMode(tab.dataset.mode);
  });

  ui.el.betDown.addEventListener('click', () => changeBet(game.state.settings.betIdx - 1));
  ui.el.betUp.addEventListener('click', () => changeBet(game.state.settings.betIdx + 1));
  ui.el.betMax.addEventListener('click', () => changeBet(BETS.length - 1));

  ui.el.spin.addEventListener('click', () => { runSpin(); });

  ui.el.refill.addEventListener('click', () => {
    game.state.wallet.coins += REFILL_AMOUNT;
    game.state.wallet.totalRefills += 1;
    syncMeters();
    storage.save(game.state);
    ui.toast(`${ui.formatCoins(REFILL_AMOUNT)} 코인을 충전했습니다.`);
  });

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener === null) return;
    if (opener.dataset.open === 'paytable') ui.openPaytable(game.mode.key);
  });
}

function boot() {
  mountSymbolSprite(ui.el.sprite);
  ui.mountBulbs();

  game.state = storage.load();
  const modeKey = MODE_KEYS.includes(game.state.settings.mode) ? game.state.settings.mode : MODE_KEYS[1];
  game.lineBet = BETS[game.state.settings.betIdx];

  ui.setSeat(game.state.player.nickname ?? '손님');
  ui.showScreen('cabinet');
  selectMode(modeKey);
  ui.setMessage('스핀을 눌러 시작하세요.', true);
  ui.setWin(0);
  wireControls();
}

try {
  boot();
} catch (error) {
  ui.showFatal(
    '이 브라우저에서는 기록을 저장할 수 없습니다. 시크릿 모드이거나 사이트 데이터가 차단되어 있으면 저장이 막힙니다.',
  );
  throw error;
}
