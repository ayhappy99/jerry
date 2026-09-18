// 부트스트랩과 화면 라우팅. 사용자에게 보여줄 오류 메시지는 이 파일 한 곳에서만 만든다.

import {
  BETS,
  JACKPOT_CONTRIB_RATE,
  MODES,
  MODE_KEYS,
  JACKPOT_ROLL_MS,
  NICKNAME_RULES,
  REFILL_AMOUNT,
  TIMING,
  WIN_TIERS,
} from './config.js';
import { evaluateSpin, totalBetOf } from './engine.js';
import { buildGrid, drawStops } from './rng.js';
import { clearHighlights, renderReels, spinReels } from './reels.js';
import * as storage from './storage.js';
import { mountSymbolSprite } from './symbols.js';
import * as ui from './ui.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const game = {
  state: null,
  mode: null,
  lineBet: 0,
  freeSpinsLeft: 0,
  busy: false,
  auto: false,
  looping: false,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function animationSpeed() {
  return game.state.settings.turbo ? TIMING.turboDivisor : 1;
}

// 당첨 연출은 모션 최소화 설정에서 한 번 더 짧아진다.
function presentationSpeed() {
  return animationSpeed() * (reducedMotion.matches ? TIMING.reducedMotionDivisor : 1);
}

// 당첨금이 클수록 카운트업이 길어진다. 상한은 TIMING.countUpMax.
function countUpDuration(result) {
  if (reducedMotion.matches) return 0;
  const ratio = result.totalWin / result.totalBet;
  const span = TIMING.countUpMax - TIMING.countUpMin;
  return (TIMING.countUpMin + Math.min(1, ratio / WIN_TIERS.mega) * span) / animationSpeed();
}

function currentTotalBet() {
  return totalBetOf(game.mode, game.lineBet);
}

function syncMeters() {
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(game.lineBet, game.mode);
  ui.setJackpot(game.state.jackpot.pool);
  ui.setFreeSpinBadge(game.freeSpinsLeft);
  if (!game.busy) ui.setBetButtons(game.state.settings.betIdx);
}

function syncJackpotHint() {
  ui.setJackpotHint(
    game.mode.jackpot
      ? '한 라인에 다이아 5개 · 매 스핀 총 베팅의 1% 적립'
      : '프리스핀·잭팟 모드에서만 적중합니다',
  );
}

function selectMode(modeKey) {
  game.mode = MODES[modeKey];
  game.state.settings.mode = modeKey;
  ui.renderModeTabs(modeKey);
  renderReels(ui.reelsHost(), game.mode, drawStops(game.mode.strips));
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
  if (result.totalWin > 0) return `${result.lineWins.length}개 라인 당첨 · ${ui.formatCoins(result.totalWin)}`;
  return '';
}

// 꽝이면 아무 연출도 하지 않는다. 조용히 다음 스핀을 받는다.
async function presentWin(result, coinsBeforeWin) {
  if (result.totalWin === 0) return;
  const speed = presentationSpeed();

  await ui.playLineWins(result.lineWins, result.scatter, {
    speed,
    instant: reducedMotion.matches,
  });

  if (result.jackpot.hit) {
    await ui.showJackpot(game.state.player.nickname, result.jackpot.amount, speed);
  } else if (result.tier === 'mega') {
    await ui.showMegaWin(result.totalWin, speed);
  } else if (result.tier === 'big') {
    // 배너는 카운트업과 나란히 진행된다.
    ui.showBigWin(`빅 윈 ${Math.floor(result.totalWin / result.totalBet)}배!`, speed);
  }

  await ui.countUpCredit(coinsBeforeWin, game.state.wallet.coins, countUpDuration(result));
}

// 모션 최소화 설정이면 릴을 돌리지 않고 결과를 즉시 보여준다.
async function revealSpin(spin) {
  if (reducedMotion.matches) {
    renderReels(ui.reelsHost(), game.mode, spin.stops);
    return;
  }
  await spinReels(ui.reelsHost(), game.mode, spin, { turbo: game.state.settings.turbo });
}

async function runSpin() {
  const isFree = game.freeSpinsLeft > 0;
  const totalBet = currentTotalBet();
  if (!isFree && game.state.wallet.coins < totalBet) {
    ui.toast('코인이 부족합니다. 충전 버튼을 눌러 주세요.');
    stopAuto();
    return false;
  }

  clearHighlights(ui.reelsHost());
  ui.clearLines();
  ui.setWin(0);
  ui.setMessage(isFree ? `프리스핀 ${game.freeSpinsLeft}회 남음 · 당첨금 2배` : '', true);

  if (isFree) {
    game.freeSpinsLeft -= 1;
  } else {
    game.state.wallet.coins -= totalBet;
    const poolBefore = game.state.jackpot.pool;
    // 잭팟 적립은 프리스핀에서는 하지 않는다.
    game.state.jackpot.pool += totalBet * JACKPOT_CONTRIB_RATE;
    ui.rollJackpot(poolBefore, game.state.jackpot.pool, JACKPOT_ROLL_MS / animationSpeed());
  }
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(game.lineBet, game.mode);
  ui.setFreeSpinBadge(game.freeSpinsLeft);

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

  await revealSpin({ stops, grid });

  const coinsBeforeWin = game.state.wallet.coins;
  if (result.jackpot.hit) game.state.jackpot.pool = game.state.jackpot.seed;
  game.state.wallet.coins += result.totalWin;
  game.freeSpinsLeft += result.freeSpinsAwarded;
  // 프리스핀 배지는 연출을 기다리지 않고 획득 즉시 보여준다.
  ui.setFreeSpinBadge(game.freeSpinsLeft);
  recordStats(result);
  recordWinHistory(result);

  ui.setWin(result.totalWin);
  ui.setMessage(resultMessage(result));
  ui.setReadout(result.totalWin === 0 ? '당첨 없음' : `${ui.formatCoins(result.totalWin)} 코인 당첨`);

  // 스핀 1회당 저장은 여기 한 번뿐이다. 자동스핀 중에도 같다.
  storage.save(game.state);

  await presentWin(result, coinsBeforeWin);
  syncMeters();
  return true;
}

function hasPendingSpin() {
  return game.freeSpinsLeft > 0 || game.auto;
}

async function runSpinLoop() {
  if (game.looping) return;
  game.looping = true;
  game.busy = true;
  ui.setBusy(true, game.auto);

  let running = true;
  while (running) {
    running = await runSpin();
    if (!running || !hasPendingSpin()) break;
    await delay(TIMING.autoSpinGap / animationSpeed());
  }

  game.busy = false;
  game.looping = false;
  ui.setBusy(false, game.auto);
  syncMeters();
}

function stopAuto() {
  game.auto = false;
  ui.setAutoButton(false);
}

function toggleAuto() {
  if (game.auto) {
    stopAuto();
    return;
  }
  game.auto = true;
  ui.setAutoButton(true);
  runSpinLoop();
}

// ── 닉네임 ────────────────────────────────

// 무엇이 잘못됐는지 그대로 알려준다. 모호한 "오류"를 쓰지 않는다.
function validateNickname(raw) {
  const value = raw.trim();
  const length = Array.from(value).length;
  if (length === 0) {
    return { value, error: '닉네임을 입력해 주세요. 공백만으로는 만들 수 없습니다.' };
  }
  if (length < NICKNAME_RULES.min) {
    return { value, error: `${NICKNAME_RULES.min}자 이상이어야 합니다. 지금 ${length}자입니다.` };
  }
  if (length > NICKNAME_RULES.max) {
    return { value, error: `${NICKNAME_RULES.max}자 이하여야 합니다. 지금 ${length}자입니다.` };
  }
  return { value, error: null };
}

function saveNickname(raw) {
  const { value, error } = validateNickname(raw);
  if (error !== null) return error;
  game.state.player.nickname = value;
  storage.save(game.state);
  ui.setSeat(value);
  return null;
}

function openSettings() {
  ui.openSettings({
    nickname: game.state.player.nickname,
    turbo: game.state.settings.turbo,
    sound: game.state.settings.sound,
    onNickname: (raw) => {
      const error = saveNickname(raw);
      if (error === null) ui.toast('닉네임을 변경했습니다. 기존 기록은 그대로 유지됩니다.');
      return error;
    },
    onTurbo: (on) => {
      game.state.settings.turbo = on;
      storage.save(game.state);
    },
    onSound: (on) => {
      setSound(on);
    },
    onReset: () => {
      const ok = window.confirm('코인·통계·잭팟 기록·닉네임이 모두 지워집니다. 초기화할까요?');
      if (!ok) return;
      storage.reset();
      window.location.reload();
    },
  });
}

function setSound(on) {
  game.state.settings.sound = on;
  ui.setSoundButton(on);
  storage.save(game.state);
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

  ui.el.spin.addEventListener('click', () => { runSpinLoop(); });
  ui.el.auto.addEventListener('click', toggleAuto);

  ui.el.refill.addEventListener('click', () => {
    game.state.wallet.coins += REFILL_AMOUNT;
    game.state.wallet.totalRefills += 1;
    syncMeters();
    storage.save(game.state);
    ui.toast(`${ui.formatCoins(REFILL_AMOUNT)} 코인을 충전했습니다.`);
  });

  ui.el.soundToggle.addEventListener('click', () => setSound(!game.state.settings.sound));

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener === null) return;
    if (opener.dataset.open === 'paytable') ui.openPaytable(game.mode.key);
    if (opener.dataset.open === 'history') ui.openHistory(game.state);
    if (opener.dataset.open === 'stats') ui.openStats(game.state);
    if (opener.dataset.open === 'settings') openSettings();
  });
}

function wireOnboarding() {
  ui.el.nicknameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const { value, error } = validateNickname(ui.el.nicknameInput.value);
    ui.setFieldError(ui.el.nicknameInput, ui.el.nicknameError, error);
    if (error !== null) return;
    game.state.player.nickname = value;
    game.state.player.createdAt = Date.now();
    storage.save(game.state);
    enterCabinet();
  });
}

function enterCabinet() {
  const modeKey = MODE_KEYS.includes(game.state.settings.mode) ? game.state.settings.mode : MODE_KEYS[1];
  ui.setSeat(game.state.player.nickname);
  ui.showScreen('cabinet');
  selectMode(modeKey);
  ui.setAutoButton(false);
  ui.setSoundButton(game.state.settings.sound);
  ui.setMessage('스핀을 눌러 시작하세요.', true);
  ui.setWin(0);
}

function boot() {
  mountSymbolSprite(ui.el.sprite);
  ui.mountBulbs();

  game.state = storage.load();
  game.lineBet = BETS[game.state.settings.betIdx];
  wireOnboarding();
  wireControls();

  if (storage.hasPlayer(game.state)) {
    enterCabinet();
    return;
  }
  ui.showScreen('onboarding');
  ui.el.nicknameInput.focus();
}

try {
  boot();
} catch (error) {
  ui.showFatal(
    '이 브라우저에서는 기록을 저장할 수 없습니다. 시크릿 모드이거나 사이트 데이터가 차단되어 있으면 저장이 막힙니다.',
  );
  throw error;
}
