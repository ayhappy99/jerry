// 부트스트랩과 화면 라우팅. 사용자에게 보여줄 오류 메시지는 이 파일 한 곳에서만 만든다.

import {
  BETS,
  JACKPOT_CONTRIB_RATE,
  JACKPOT_MATCH,
  JACKPOT_ROLL_MS,
  JACKPOT_TIERS,
  JACKPOT_TIER_KEYS,
  GAMES,
  GAME_KEYS,
  MODES,
  MODE_KEYS,
  NICKNAME_RULES,
  PHARAOH,
  REFILL_AMOUNT,
  SYMBOLS,
  TIMING,
  WIN_TIERS,
} from './config.js';
import * as audio from './audio.js';
import { evaluateSpin, totalBetOf, winTierOf } from './engine.js';
import { spinCascade } from './cascade.js';
import { buildGrid, buildPickTiles, drawJackpotTier, drawStops } from './rng.js';
import { clearHighlights, playCascade, renderReels, spinReels } from './reels.js';
import * as storage from './storage.js';
import { mountSymbolSprite } from './symbols.js';
import * as ui from './ui.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const game = {
  state: null,
  key: null,
  kind: null,
  mode: null,
  lineBet: 0,
  freeSpinsLeft: 0,
  busy: false,
  auto: false,
  looping: false,
};

// 현재 고른 게임이 따로 쌓는 설정·통계·기록. 코인과 잭팟 풀은 game.state에 공유로 둔다.
function section() {
  return game.state.games[game.key];
}

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
function countUpDuration(payout, result) {
  if (reducedMotion.matches) return 0;
  const ratio = payout.totalWin / result.totalBet;
  const span = TIMING.countUpMax - TIMING.countUpMin;
  return (TIMING.countUpMin + Math.min(1, ratio / WIN_TIERS.mega) * span) / animationSpeed();
}

// 현재 게임의 릴 구성. 페이라인 게임은 모드, 캐스케이딩 게임은 PHARAOH가 그 역할을 한다.
function spec() {
  return game.kind === 'cascade' ? PHARAOH : game.mode;
}

function currentTotalBet() {
  return game.kind === 'cascade'
    ? BETS[section().settings.betIdx] * PHARAOH.betUnits
    : totalBetOf(game.mode, game.lineBet);
}

function betNote(unitBet) {
  return game.kind === 'cascade'
    ? `베팅 단위 ${ui.formatCoins(unitBet)} × ${PHARAOH.betUnits}`
    : `라인당 ${ui.formatCoins(unitBet)} × ${game.mode.lines}`;
}

function syncMeters() {
  const unitBet = BETS[section().settings.betIdx];
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(unitBet, currentTotalBet(), betNote(unitBet));
  ui.setJackpot(game.state.jackpot.pools);
  ui.setFreeSpinBadge(game.freeSpinsLeft);
  if (!game.busy) ui.setBetButtons(section().settings.betIdx);
}

function jackpotHint() {
  if (game.kind === 'cascade') {
    return `연쇄 ${PHARAOH.jackpotChain}단 도달 → 픽 보너스에서 등급 추첨 · 매 스핀 총 베팅의 1% 적립`;
  }
  return game.mode.jackpot
    ? `한 라인에 다이아 ${JACKPOT_MATCH}개 이상 → 픽 보너스에서 등급 추첨 · 매 스핀 총 베팅의 1% 적립`
    : '프리스핀·잭팟 모드에서만 적중합니다';
}

function syncJackpotHint() {
  ui.setJackpotHint(jackpotHint());
}

function selectMode(modeKey) {
  game.mode = MODES[modeKey];
  section().settings.mode = modeKey;
  ui.renderModeTabs(modeKey);
  renderReels(ui.reelsHost(), game.mode, drawStops(game.mode.strips));
  syncJackpotHint();
  syncMeters();
  storage.save(game.state);
}

function changeBet(nextIdx) {
  section().settings.betIdx = nextIdx;
  game.lineBet = BETS[nextIdx];
  syncMeters();
  storage.save(game.state);
}

// 캐스케이딩 게임은 모드가 없다. 릴만 그려 두고 탭 줄을 숨긴다.
function setupCascade() {
  renderReels(ui.reelsHost(), PHARAOH, drawStops(PHARAOH.strips));
  syncJackpotHint();
  syncMeters();
  storage.save(game.state);
}

// ── 스핀 ──────────────────────────────────

// 잭팟 적중이면 티어와 금액을 여기서 확정하고 그 티어 풀을 시드로 리셋한다.
function resolveJackpot(result) {
  if (!result.jackpot.hit) return null;
  const tier = drawJackpotTier();
  const amount = game.state.jackpot.pools[tier];
  game.state.jackpot.pools[tier] = JACKPOT_TIERS[tier].seed;
  return { tier, amount, tiles: buildPickTiles(tier) };
}

function contributeJackpot(totalBet) {
  const before = { ...game.state.jackpot.pools };
  for (const key of JACKPOT_TIER_KEYS) {
    game.state.jackpot.pools[key] += totalBet * JACKPOT_CONTRIB_RATE * JACKPOT_TIERS[key].contribShare;
  }
  ui.rollJackpot(before, game.state.jackpot.pools, JACKPOT_ROLL_MS / animationSpeed());
}

function recordStats(result, payout) {
  const stats = section().stats;
  stats.spins += 1;
  if (!result.freeSpin) stats.totalWagered += result.totalBet;
  stats.totalWon += payout.totalWin;
  if (result.freeSpinsAwarded > 0 && !result.freeSpin) stats.freeSpinsTriggered += 1;
  if (payout.totalWin > stats.bestWin) {
    stats.bestWin = payout.totalWin;
    stats.bestWinAt = Date.now();
  }
  if (payout.totalWin > 0) {
    stats.currentDrySpell = 0;
  } else {
    stats.currentDrySpell += 1;
    stats.longestDrySpell = Math.max(stats.longestDrySpell, stats.currentDrySpell);
  }
}

function recordWinHistory(result, payout) {
  if (payout.jackpot !== null) {
    storage.addJackpotRecord(section(), {
      nickname: game.state.player.nickname,
      amount: payout.jackpot.amount,
      tier: payout.jackpot.tier,
      mode: result.modeKey,
      bet: result.totalBet,
      at: Date.now(),
    });
  }
  if (payout.tier === 'big' || payout.tier === 'mega') {
    storage.addBigWinRecord(section(), {
      nickname: game.state.player.nickname,
      amount: payout.totalWin,
      mode: result.modeKey,
      bet: result.totalBet,
      multiple: payout.totalWin / result.totalBet,
      at: Date.now(),
    });
  }
}

function readoutText(result, payout) {
  if (payout.jackpot !== null) {
    const label = JACKPOT_TIERS[payout.jackpot.tier].label;
    return `${label} 잭팟 당첨. ${ui.formatCoins(payout.jackpot.amount)} 코인. 총 ${ui.formatCoins(payout.totalWin)} 코인 획득.`;
  }
  if (result.cascade !== undefined) {
    if (payout.totalWin === 0) return '당첨 없음';
    const free = result.freeSpinsAwarded > 0 ? ` 프리스핀 ${result.freeSpinsAwarded}회 획득.` : '';
    return `연쇄 ${result.cascade.chain}단. ${ui.formatCoins(payout.totalWin)} 코인 획득.${free}`;
  }
  const parts = result.lineWins.map(
    (win) => `${SYMBOLS[win.symbol].label} ${win.count}개 라인 ${win.lineIndex + 1}`,
  );
  if (result.scatter !== null) parts.push(`스캐터 ${result.scatter.count}개`);
  if (parts.length === 0) return '당첨 없음';
  const free = result.freeSpinsAwarded > 0 ? ` 프리스핀 ${result.freeSpinsAwarded}회 획득.` : '';
  return `${parts.join(', ')}. ${ui.formatCoins(payout.totalWin)} 코인 획득.${free}`;
}

function resultMessage(result, payout) {
  if (payout.jackpot !== null) {
    const label = JACKPOT_TIERS[payout.jackpot.tier].label;
    return `${label} 잭팟! ${ui.formatCoins(payout.jackpot.amount)} 획득`;
  }
  if (result.freeSpinsAwarded > 0) {
    const count = result.cascade === undefined ? result.scatter.count : result.cascade.scatters;
    return `스캐터 ${count}개! 프리스핀 ${result.freeSpinsAwarded}회`;
  }
  if (payout.totalWin === 0) return '';
  if (result.cascade !== undefined) {
    return `연쇄 ${result.cascade.chain}단 · ${ui.formatCoins(payout.totalWin)}`;
  }
  return `${result.lineWins.length}개 라인 당첨 · ${ui.formatCoins(payout.totalWin)}`;
}

// 꽝이면 아무 연출도 하지 않는다. 조용히 다음 스핀을 받는다.
async function presentWin(result, payout, coinsBeforeWin) {
  if (payout.totalWin === 0) return;
  const speed = presentationSpeed();
  const effects = !reducedMotion.matches;
  const tier = payout.jackpot === null ? payout.tier : 'jackpot';

  // 당첨이 확정된 순간: 섬광 → 캐비닛 흔들림 → 마퀴·프레임 고속 점등
  if (effects) {
    ui.flashWindow(tier, speed);
    ui.shakeCabinet(tier, speed);
    ui.celebrate(TIMING.celebrateHold / speed);
  }

  // 빅윈 이상은 전용 사운드가 있으므로 일반 당첨음을 겹치지 않게 한다.
  if (tier === 'win') audio.playWin();
  await ui.playLineWins(result.lineWins, result.scatter, {
    speed,
    instant: reducedMotion.matches,
    onLine: () => audio.playLineTick(),
  });

  if (result.freeSpinsAwarded > 0) {
    ui.showBigWin(`프리스핀 ${result.freeSpinsAwarded}회 획득!`, { speed, tier: 'free', effects });
  }

  if (payout.jackpot !== null) {
    // 티어가 확정된 뒤 픽 화면을 연다. 뒤집는 순서는 결과를 바꾸지 않는다.
    audio.duckMusic(TIMING.countUpMega / speed / 1000);
    await ui.openPickBonus({
      tiles: payout.jackpot.tiles,
      pools: { ...game.state.jackpot.pools, [payout.jackpot.tier]: payout.jackpot.amount },
      speed,
      effects,
    });
    audio.playJackpot();
    ui.flashJackpotTier(payout.jackpot.tier, TIMING.countUpMega / speed);
    await ui.showJackpot(game.state.player.nickname, payout.jackpot.amount, {
      speed,
      effects,
      tierLabel: JACKPOT_TIERS[payout.jackpot.tier].label,
    });
  } else if (tier === 'mega') {
    audio.duckMusic(TIMING.countUpMega / speed / 1000);
    audio.playBigWin();
    await ui.showMegaWin(payout.totalWin, { speed, effects });
  } else if (tier === 'big') {
    audio.duckMusic(TIMING.bannerHold / speed / 1000);
    audio.playBigWin();
    // 배너는 카운트업과 나란히 진행된다.
    ui.showBigWin(`빅 윈 ${Math.floor(payout.totalWin / result.totalBet)}배!`, { speed, tier: 'big', effects });
  }

  await ui.countUpCredit(coinsBeforeWin, game.state.wallet.coins, countUpDuration(payout, result), () =>
    audio.playCountTick(),
  );
}

// 모션 최소화 설정이면 릴을 돌리지 않고 결과를 즉시 보여준다.
async function revealSpin(spin) {
  if (reducedMotion.matches) {
    renderReels(ui.reelsHost(), spec(), spin.stops);
    return;
  }
  const lastReel = spec().reels - 1;
  audio.startReelLoop();
  await spinReels(ui.reelsHost(), spec(), spin, {
    turbo: game.state.settings.turbo,
    onAnticipate: () => audio.playAnticipation(),
    onReelStop: (reel) => {
      if (reel === lastReel) audio.stopReelLoop();
      audio.playReelStop();
    },
  });
}

// 페이라인 게임 한 스핀
function drawLines(isFree) {
  const stops = drawStops(game.mode.strips);
  const grid = buildGrid(game.mode.strips, stops, game.mode.rows);
  const result = evaluateSpin({
    modeKey: game.mode.key,
    grid,
    lineBet: game.lineBet,
    freeSpin: isFree,
  });
  return { ...result, spin: { stops, grid } };
}

// 캐스케이딩 게임 한 스핀. 연쇄 전체가 여기서 확정된다.
function drawCascade(isFree, totalBet) {
  const stops = drawStops(PHARAOH.strips);
  const result = spinCascade({ stops, totalBet, freeSpin: isFree });
  return {
    modeKey: PHARAOH.key,
    totalBet,
    freeSpin: isFree,
    lineWins: [],
    scatter: null,
    freeSpinsAwarded: result.freeSpinsAwarded,
    totalWin: result.totalWin,
    jackpot: result.jackpot,
    cascade: result,
    spin: { stops, grid: result.initialGrid },
  };
}

// 연쇄를 단계별로 재생한다. 각 단계의 ways와 배수를 배지에 띄운다.
async function playCascadeSteps(result) {
  const speed = presentationSpeed();
  await playCascade(ui.reelsHost(), PHARAOH, result.cascade.steps, {
    speed,
    instant: reducedMotion.matches,
    onStep: (step) => {
      const ways = step.wins.reduce((sum, win) => sum + win.ways, 0);
      ui.setChainBadge(`연쇄 ${step.chain}단 ×${step.chainMultiplier} · ${ways} ways`);
      audio.playLineTick();
    },
  });
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
    // 잭팟 적립은 프리스핀에서는 하지 않는다.
    contributeJackpot(totalBet);
  }
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(BETS[section().settings.betIdx], totalBet, betNote(BETS[section().settings.betIdx]));
  ui.setFreeSpinBadge(game.freeSpinsLeft);
  ui.setChainBadge(null);

  // 결과는 여기서 완전히 확정된다. 이후 연출은 이 결과를 보여줄 뿐이다.
  const result = game.kind === 'cascade' ? drawCascade(isFree, totalBet) : drawLines(isFree);
  // 잭팟 티어까지 여기서 확정된다. 픽 화면은 이 결과를 보여주는 연출일 뿐이다.
  const jackpot = resolveJackpot(result);
  const totalWin = result.totalWin + (jackpot === null ? 0 : jackpot.amount);
  const payout = { totalWin, jackpot, tier: winTierOf(totalWin, result.totalBet) };

  await revealSpin(result.spin);
  if (result.cascade !== undefined) await playCascadeSteps(result);

  const coinsBeforeWin = game.state.wallet.coins;
  game.state.wallet.coins += payout.totalWin;
  game.freeSpinsLeft += result.freeSpinsAwarded;
  // 프리스핀 배지는 연출을 기다리지 않고 획득 즉시 보여준다.
  ui.setFreeSpinBadge(game.freeSpinsLeft);
  recordStats(result, payout);
  recordWinHistory(result, payout);

  ui.setWin(payout.totalWin);
  ui.setMessage(resultMessage(result, payout));
  ui.setReadout(readoutText(result, payout));

  // 스핀 1회당 저장은 여기 한 번뿐이다. 자동스핀 중에도 같다.
  storage.save(game.state);

  await presentWin(result, payout, coinsBeforeWin);
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
    music: game.state.settings.music,
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
    onMusic: (on) => {
      setMusic(on);
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
  audio.setEnabled(on);
  // 이 함수는 사용자 조작에서만 호출되므로 여기서 컨텍스트를 만들어도 제스처 안이다.
  if (on) audio.unlock();
  ui.setSoundButton(on);
  storage.save(game.state);
}

// 배경음은 효과음 마스터에 종속된다. 소리가 꺼져 있으면 컨텍스트가 없어 재생되지 않는다.
function setMusic(on) {
  game.state.settings.music = on;
  audio.setMusicEnabled(on);
  storage.save(game.state);
}

// ── 이벤트 배선 ───────────────────────────

// 탭을 벗어나면 배경음을 멈춘다. 돌아오면 다시 시작한다.
function wireVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.stopMusic();
    else audio.startMusic();
  });
}

// 첫 제스처에서 오디오를 준비한다. 소리가 꺼져 있으면 컨텍스트를 만들지 않는다.
function wireAudioUnlock() {
  const handler = () => {
    audio.unlock();
    audio.playButton();
  };
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') === null) return;
    handler();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    handler();
  });
}

function wireControls() {
  ui.el.modes.addEventListener('click', (event) => {
    const tab = event.target.closest('.mode-tab');
    if (tab === null || tab.disabled) return;
    selectMode(tab.dataset.mode);
  });

  // 탭 위젯 표준 키보드 조작: 좌우 화살표로 모드를 옮긴다.
  ui.el.modes.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (step === undefined || game.kind === 'cascade') return;
    const tabs = ui.modeTabs();
    if (tabs.some((tab) => tab.disabled)) return;
    event.preventDefault();
    const current = MODE_KEYS.indexOf(game.mode.key);
    const next = (current + step + MODE_KEYS.length) % MODE_KEYS.length;
    selectMode(MODE_KEYS[next]);
    ui.modeTabs()[next].focus();
  });

  ui.el.betDown.addEventListener('click', () => changeBet(section().settings.betIdx - 1));
  ui.el.betUp.addEventListener('click', () => changeBet(section().settings.betIdx + 1));
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

  // 스페이스바 = 스핀. 버튼·입력에 포커스가 있을 때는 그쪽 기본 동작을 방해하지 않는다.
  document.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.code !== 'Space') return;
    if (ui.el.cabinet.hidden) return;
    if (event.target.closest('button, input, textarea, select, [role="dialog"]') !== null) return;
    event.preventDefault();
    runSpinLoop();
  });

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener === null) return;
    if (opener.dataset.open === 'paytable') ui.openPaytable(game.key, game.mode?.key);
    if (opener.dataset.open === 'history') ui.openHistory(section());
    if (opener.dataset.open === 'stats') ui.openStats({ stats: section().stats, wallet: game.state.wallet });
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
    enterLobby();
  });
}

function wireLobby() {
  ui.el.lobbyGames.addEventListener('click', (event) => {
    const card = event.target.closest('.gamecard');
    if (card === null) return;
    enterGame(card.dataset.game);
  });
  ui.el.toLobby.addEventListener('click', enterLobby);
}

function enterLobby() {
  stopAuto();
  ui.setSeat(game.state.player.nickname);
  ui.renderLobby(game.state);
  ui.setJackpot(game.state.jackpot.pools);
  ui.showScreen('lobby');
}

function enterGame(gameKey) {
  game.key = gameKey;
  game.kind = GAMES[gameKey].kind;
  game.state.settings.game = gameKey;
  game.freeSpinsLeft = 0;
  game.mode = null;

  const stored = section().settings;
  game.lineBet = BETS[stored.betIdx];

  ui.setSeat(game.state.player.nickname, GAMES[gameKey].label);
  ui.setGameTheme(gameKey);
  ui.setModesVisible(game.kind !== 'cascade');
  ui.showScreen('cabinet');
  ui.setChainBadge(null);

  if (game.kind === 'cascade') {
    setupCascade();
  } else {
    const modeKey = GAMES[gameKey].modeKeys.includes(stored.mode) ? stored.mode : MODE_KEYS[1];
    selectMode(modeKey);
  }

  ui.setAutoButton(false);
  ui.setSoundButton(game.state.settings.sound);
  ui.setMessage('스핀을 눌러 시작하세요.', true);
  ui.setWin(0);
  storage.save(game.state);
}

function boot() {
  mountSymbolSprite(ui.el.sprite);
  ui.mountBulbs();
  ui.renderJackpotBar(ui.el.jackpotBar);
  ui.renderJackpotBar(ui.el.lobbyJackpots);

  game.state = storage.load();
  game.key = GAME_KEYS.includes(game.state.settings.game) ? game.state.settings.game : GAME_KEYS[0];
  game.kind = GAMES[game.key].kind;
  game.lineBet = BETS[section().settings.betIdx];
  audio.setEnabled(game.state.settings.sound);
  audio.setMusicEnabled(game.state.settings.music);
  wireAudioUnlock();
  wireVisibility();
  wireOnboarding();
  wireLobby();
  wireControls();

  if (storage.hasPlayer(game.state)) {
    enterLobby();
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
