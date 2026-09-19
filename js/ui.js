// 미터·메시지·모달·토스트 렌더. 게임 판정은 하지 않는다.

import {
  BETS,
  CLASSIC_PAYS,
  EFFECTS,
  GAMES,
  GAME_KEYS,
  PHARAOH,
  HISTORY_LIMITS,
  JACKPOT_MATCH,
  JACKPOT_TIERS,
  JACKPOT_TIER_KEYS,
  LINE_PAYS,
  MIN_MATCH,
  MODES,
  MODE_KEYS,
  NICKNAME_RULES,
  SCATTER,
  SCATTER_MIN,
  PICK_MATCH,
  SCATTER_PAYS,
  SYMBOLS,
  SYMBOL_ORDER,
  TIMING,
  WILD,
  WIN_TIERS,
  modePaylines,
} from './config.js';
import { cellAt, clearHighlights } from './reels.js';
import { symbolMarkup } from './symbols.js';

const MARQUEE_BULBS = 18;

export const el = {
  sprite: document.getElementById('sprite'),
  fatal: document.getElementById('fatal'),
  onboarding: document.getElementById('screen-onboarding'),
  lobby: document.getElementById('screen-lobby'),
  cabinet: document.getElementById('screen-cabinet'),
  lobbySeat: document.getElementById('lobby-seat'),
  lobbyCredit: document.getElementById('lobby-credit'),
  lobbyJackpots: document.getElementById('lobby-jackpots'),
  lobbyGames: document.getElementById('lobby-games'),
  toLobby: document.getElementById('to-lobby'),
  nicknameForm: document.getElementById('nickname-form'),
  nicknameInput: document.getElementById('nickname-input'),
  nicknameError: document.getElementById('nickname-error'),
  bulbs: document.querySelector('.marquee__bulbs'),
  seat: document.getElementById('seat-label'),
  jackpotBar: document.getElementById('jackpot-bar'),
  jackpotHint: document.getElementById('jackpot-hint'),
  modes: document.getElementById('modes'),
  window: document.querySelector('.cabinet__window'),
  frame: document.querySelector('.cabinet__frame'),
  marquee: document.querySelector('.marquee'),
  flash: document.getElementById('flash'),
  reels: document.getElementById('reels'),
  lines: document.getElementById('lines'),
  freespinBadge: document.getElementById('freespin-badge'),
  chainBadge: document.getElementById('chain-badge'),
  readout: document.getElementById('reel-readout'),
  credit: document.getElementById('credit-meter'),
  betMeter: document.getElementById('bet-meter'),
  betSub: document.getElementById('bet-sub'),
  winMeter: document.getElementById('win-meter'),
  message: document.getElementById('message'),
  betDown: document.getElementById('bet-down'),
  betUp: document.getElementById('bet-up'),
  betMax: document.getElementById('bet-max'),
  betLabel: document.getElementById('bet-label'),
  spin: document.getElementById('spin'),
  auto: document.getElementById('auto'),
  soundToggle: document.getElementById('sound-toggle'),
  refill: document.getElementById('refill'),
  modalRoot: document.getElementById('modal-root'),
  overlayRoot: document.getElementById('overlay-root'),
  toastRoot: document.getElementById('toast-root'),
};

export function reelsHost() {
  return el.reels;
}

// 닉네임은 사용자 입력이다. innerHTML에 넣기 전에 반드시 이스케이프한다.
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function formatCoins(value) {
  return Math.round(value).toLocaleString('ko-KR');
}

export function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function showScreen(name) {
  el.onboarding.hidden = name !== 'onboarding';
  el.lobby.hidden = name !== 'lobby';
  el.cabinet.hidden = name !== 'cabinet';
}

export function mountBulbs() {
  el.bulbs.innerHTML = Array.from(
    { length: MARQUEE_BULBS },
    (_, i) => `<span class="bulb" style="animation-delay: ${(i * 0.09).toFixed(2)}s"></span>`,
  ).join('');
}

export function renderModeTabs(activeKey) {
  el.modes.innerHTML = MODE_KEYS.map((key) => {
    const mode = MODES[key];
    const sub = `${mode.reels}릴 · ${mode.lines}라인`;
    const selected = key === activeKey;
    // 선택된 탭만 탭 순서에 남기고(탭 위젯 표준), 패널의 이름표 역할도 맡는다.
    return (
      `<button class="mode-tab" type="button" role="tab" data-mode="${key}" ` +
      `aria-controls="reels-panel" aria-selected="${selected}" tabindex="${selected ? 0 : -1}"` +
      `${selected ? ' id="mode-tab-selected"' : ''}>` +
      `${mode.label}<span class="mode-tab__sub">${sub}</span></button>`
    );
  }).join('');
}

export function modeTabs() {
  return [...el.modes.querySelectorAll('.mode-tab')];
}

export function setSeat(nickname, gameLabel = null) {
  el.seat.textContent =
    gameLabel === null ? `${nickname}님의 자리` : `${gameLabel} · ${nickname}님의 자리`;
  el.lobbySeat.textContent = `${nickname}님, 어느 대에 앉으시겠습니까?`;
}

// ── 로비 ──────────────────────────────────

function gameCardStats(section) {
  const { stats } = section;
  if (stats.spins === 0) return '아직 플레이 기록이 없습니다';
  const rtp =
    stats.totalWagered === 0 ? '-' : `${((stats.totalWon / stats.totalWagered) * 100).toFixed(2)}%`;
  return `스핀 ${formatCoins(stats.spins)}회 · 실측 환수율 ${rtp} · 최고 ${formatCoins(stats.bestWin)}`;
}

export function renderLobby(state) {
  el.lobbyCredit.textContent = formatCoins(state.wallet.coins);
  el.lobbyGames.innerHTML = GAME_KEYS.map((key) => {
    const game = GAMES[key];
    const art = game.artSymbols.map((symbol) => symbolMarkup(symbol)).join('');
    return (
      `<button class="gamecard" type="button" role="listitem" data-game="${key}">` +
      `<span class="gamecard__art" aria-hidden="true">${art}</span>` +
      '<span class="gamecard__body">' +
      `<span class="gamecard__name">${game.label}</span>` +
      `<span class="gamecard__badge">${game.badge}</span>` +
      `<span class="gamecard__tagline">${game.tagline}</span>` +
      `<span class="gamecard__stats">${gameCardStats(state.games[key])}</span>` +
      '</span></button>'
    );
  }).join('');
}

export function setCredit(value) {
  el.credit.textContent = formatCoins(value);
}

export function setBet(unitBet, totalBet, note) {
  el.betLabel.textContent = formatCoins(unitBet);
  el.betMeter.textContent = formatCoins(totalBet);
  el.betSub.textContent = note;
}

export function setWin(value) {
  el.winMeter.textContent = formatCoins(value);
}

// 4단 잭팟 바를 만든다. 티어 순서는 config의 JACKPOT_TIER_KEYS를 따른다.
// 로비와 캐비닛 두 곳에 같은 바를 그리므로 대상 요소를 받는다.
export function renderJackpotBar(host) {
  host.innerHTML = JACKPOT_TIER_KEYS.map((key) => {
    const tier = JACKPOT_TIERS[key];
    return (
      `<div class="jp jp--${key}" data-tier="${key}">` +
      `<span class="jp__label">${tier.label}</span>` +
      `<output class="jp__value" data-tier-value="${key}" aria-label="${tier.label} 잭팟">0</output>` +
      '</div>'
    );
  }).join('');
}

// 잭팟 풀은 공유이므로 로비·캐비닛에 그려진 모든 바를 함께 갱신한다.
export function setJackpot(pools) {
  for (const key of JACKPOT_TIER_KEYS) {
    for (const node of document.querySelectorAll(`[data-tier-value="${key}"]`)) {
      node.textContent = formatCoins(pools[key]);
    }
  }
}

// 적립분만큼 티어별로 굴려 올린다. 화면에 보이는 캐비닛 쪽 바만 움직인다.
export function rollJackpot(from, to, duration) {
  for (const key of JACKPOT_TIER_KEYS) {
    countUp(el.jackpotBar.querySelector(`[data-tier-value="${key}"]`), from[key], to[key], duration);
  }
}

// 적중한 티어를 잠깐 강조한다.
export function flashJackpotTier(key, ms) {
  const box = el.jackpotBar.querySelector(`.jp[data-tier="${key}"]`);
  box.classList.add('jp--hit');
  setTimeout(() => box.classList.remove('jp--hit'), ms);
}

export function setJackpotHint(text) {
  el.jackpotHint.textContent = text;
}

export function setMessage(text, muted = false) {
  el.message.textContent = text;
  el.message.classList.toggle('message--muted', muted);
}

export function setReadout(text) {
  el.readout.textContent = text;
}

export function setBetButtons(betIdx) {
  el.betDown.disabled = betIdx === 0;
  el.betUp.disabled = betIdx === BETS.length - 1;
  el.betMax.disabled = betIdx === BETS.length - 1;
}

export function setSoundButton(on) {
  el.soundToggle.setAttribute('aria-pressed', String(on));
  el.soundToggle.querySelector('.tool__label').textContent = on ? '소리' : '소리 끔';
}

export function setBusy(busy, autoRunning) {
  el.spin.disabled = busy || autoRunning;
  el.betDown.disabled = busy;
  el.betUp.disabled = busy;
  el.betMax.disabled = busy;
  el.refill.disabled = busy;
  for (const tab of el.modes.querySelectorAll('.mode-tab')) tab.disabled = busy || autoRunning;
}

export function setAutoButton(running) {
  el.auto.dataset.running = String(running);
  el.auto.textContent = running ? '중지' : '자동';
}

// 모드가 없는 게임에서는 탭 줄을 숨긴다.
export function setModesVisible(visible) {
  el.modes.hidden = !visible;
}

export function setGameTheme(gameKey) {
  el.cabinet.dataset.game = gameKey;
}

export function setChainBadge(text) {
  el.chainBadge.hidden = text === null;
  if (text !== null) el.chainBadge.textContent = text;
}

export function setFreeSpinBadge(remaining) {
  el.freespinBadge.hidden = remaining <= 0;
  if (remaining > 0) el.freespinBadge.textContent = `프리스핀 ${remaining}회 남음`;
}

export function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  el.toastRoot.append(node);
  setTimeout(() => node.remove(), TIMING.toast);
}

export function showFatal(text) {
  el.fatal.hidden = false;
  el.fatal.textContent = text;
}

// ── 숫자 카운트업 ─────────────────────────

// 같은 요소에서 굴러가던 이전 카운트업은 취소한다.
const counters = new WeakMap();

export function countUp(element, from, to, duration, onTick = null) {
  const previous = counters.get(element);
  if (previous !== undefined) previous.cancelled = true;
  const token = { cancelled: false };
  counters.set(element, token);

  return new Promise((resolve) => {
    const start = performance.now();
    let lastTick = start;
    const step = (now) => {
      if (token.cancelled) {
        resolve();
        return;
      }
      const progress = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = formatCoins(from + (to - from) * eased);
      if (onTick !== null && now - lastTick >= TIMING.countUpTickMs) {
        lastTick = now;
        onTick();
      }
      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }
      resolve();
    };
    requestAnimationFrame(step);
  });
}

export function countUpCredit(from, to, duration, onTick) {
  return countUp(el.credit, from, to, duration, onTick);
}

// ── 당첨 라인 하이라이트 ──────────────────

function windowRect() {
  return el.window.getBoundingClientRect();
}

function syncLinesViewBox() {
  const rect = windowRect();
  el.lines.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
}

function cellCenter(rect, cell) {
  const box = cell.getBoundingClientRect();
  return `${box.left - rect.left + box.width / 2},${box.top - rect.top + box.height / 2}`;
}

function winPath(win, className) {
  const rect = windowRect();
  const points = win.cells.map(({ reel, row }) => cellCenter(rect, cellAt(el.reels, reel, row))).join(' ');
  return `<polyline class="${className}" points="${points}"/>`;
}

export function clearLines() {
  el.lines.innerHTML = '';
}

// 라인 경로를 왼쪽부터 그려 나간다.
function drawLine(polyline, duration) {
  const length = polyline.getTotalLength();
  polyline.style.strokeDasharray = String(length);
  polyline.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
    duration,
    easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)',
  });
}

function markCells(win, className, effects) {
  for (const { reel, row } of win.cells) {
    const cell = cellAt(el.reels, reel, row);
    cell.classList.add(className);
    if (effects) spawnBurst(cell);
  }
}

// 당첨 셀에서 링이 한 번 퍼진다.
function spawnBurst(cell) {
  const face = cell.querySelector('.cell__face');
  const burst = document.createElement('span');
  burst.className = 'burst';
  burst.style.setProperty('--burst-dur', `${TIMING.burst}ms`);
  face.append(burst);
  setTimeout(() => burst.remove(), TIMING.burst);
}

function showAllWins(lineWins, scatter, { effects, speed }) {
  clearHighlights(el.reels);
  syncLinesViewBox();
  el.lines.innerHTML = lineWins.map((win) => winPath(win, 'line-path line-path--all')).join('');
  if (effects) {
    for (const polyline of el.lines.querySelectorAll('polyline')) drawLine(polyline, TIMING.lineDraw / speed);
  }
  for (const win of lineWins) markCells(win, 'cell--win', false);
  if (scatter !== null) markCells(scatter, 'cell--scatter', false);
  el.reels.classList.add('reels--focus');
}

function showSingleWin(win, { effects, speed }) {
  clearHighlights(el.reels);
  syncLinesViewBox();
  el.lines.innerHTML = winPath(win, 'line-path');
  if (effects) drawLine(el.lines.querySelector('polyline'), TIMING.lineDraw / speed);
  markCells(win, 'cell--win', effects);
  el.reels.classList.add('reels--focus');
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 당첨 라인을 하나씩 순서대로 보여준 뒤 마지막에 전체를 함께 보여준다.
 * instant=true면 순차 연출 없이 전체를 한 번에 정적으로 표시한다.
 */
export async function playLineWins(lineWins, scatter, { speed = 1, instant = false, onLine = () => {} } = {}) {
  if (lineWins.length === 0 && scatter === null) return;
  const options = { effects: !instant, speed };
  if (instant) {
    showAllWins(lineWins, scatter, options);
    return;
  }
  if (lineWins.length > 1) {
    for (const win of lineWins) {
      showSingleWin(win, options);
      onLine(win);
      await wait(TIMING.lineHighlight / speed);
    }
  } else if (lineWins.length === 1) {
    showSingleWin(lineWins[0], options);
    onLine(lineWins[0]);
  }
  showAllWins(lineWins, scatter, options);
  if (lineWins.length > 1) await wait(TIMING.lineHighlightAll / speed);
}

// ── 순간 연출: 섬광 · 흔들림 · 마퀴 ───────

// 당첨이 확정된 순간 릴 유리에 섬광이 터진다. 등급이 높을수록 강하다.
export function flashWindow(tier, speed = 1) {
  const peak = EFFECTS.flashPeak[tier] ?? 0;
  if (peak === 0) return;
  el.flash.animate([{ opacity: 0 }, { opacity: peak, offset: 0.18 }, { opacity: 0 }], {
    duration: TIMING.flash / speed,
    easing: 'ease-out',
  });
}

// 캐비닛이 통째로 흔들린다. 등급이 높을수록 크게 흔든다.
// 이동량을 정수 픽셀로 맞추고 회전을 넣지 않는다. 소수점 변형은 셀 경계에
// 합성 이음선을 만든다(실측으로 확인).
export function shakeCabinet(tier, speed = 1) {
  const amount = EFFECTS.shakePx[tier] ?? 0;
  if (amount === 0) return;
  const frames = [0, -1, 0.75, -0.5, 0.25, 0].map((ratio, index) => ({
    transform: `translate(${Math.round(amount * ratio)}px, ${Math.round(amount * ratio * -0.5)}px)`,
    offset: index / 5,
  }));
  el.frame.animate(frames, { duration: TIMING.shake / speed, easing: 'ease-out' });
}

// 마퀴 전구와 릴 프레임이 당첨 동안 빠르게 점등한다.
export function celebrate(ms) {
  el.marquee.classList.add('marquee--celebrate');
  el.frame.classList.add('cabinet__frame--celebrate');
  setTimeout(() => {
    el.marquee.classList.remove('marquee--celebrate');
    el.frame.classList.remove('cabinet__frame--celebrate');
  }, ms);
}

// ── 금화 파티클 ───────────────────────────

function coinMarkup(kind) {
  const size = 10 + Math.round(Math.random() * 10);
  const delay = (Math.random() * 0.8).toFixed(2);
  if (kind === 'rain') {
    return `<span class="coin coin--rain" style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${delay}s;--size:${size}px"></span>`;
  }
  const tx = (Math.random() * 2 - 1) * 46;
  const rise = 32 + Math.random() * 34;
  return (
    `<span class="coin coin--fountain" style="--tx:${tx.toFixed(1)}vw;--rise:${rise.toFixed(1)}vh;` +
    `--d:${delay}s;--size:${size}px"></span>`
  );
}

// 등급에 맞는 개수의 금화를 한 파동 쏟는다.
export function spawnCoins(tier, lifetimeMs) {
  const rain = EFFECTS.coinRain[tier] ?? 0;
  const fountain = EFFECTS.coinFountain[tier] ?? 0;
  if (rain === 0 && fountain === 0) return;
  const layer = document.createElement('div');
  layer.className = 'particles';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML =
    Array.from({ length: rain }, () => coinMarkup('rain')).join('') +
    Array.from({ length: fountain }, () => coinMarkup('fountain')).join('');
  el.overlayRoot.append(layer);
  setTimeout(() => layer.remove(), lifetimeMs);
}

// 오버레이가 열려 있는 동안 금화를 반복해서 쏟는다. 멈추는 함수를 돌려준다.
function coinWaves(tier) {
  const spawn = () => spawnCoins(tier, EFFECTS.coinLifeMs);
  spawn();
  const timer = setInterval(spawn, EFFECTS.coinWaveMs);
  return () => clearInterval(timer);
}

// ── 빅윈 / 메가윈 / 잭팟 ──────────────────

// 빅윈: 상단 배너 + 금화. 카운트업과 나란히 진행되도록 기다리지 않는다.
export function showBigWin(text, { speed = 1, tier = 'big', effects = true } = {}) {
  const hold = TIMING.bannerHold / speed;
  const banner = document.createElement('div');
  banner.className = tier === 'free' ? 'banner banner--free' : 'banner';
  banner.setAttribute('role', 'status');
  banner.textContent = text;
  bannerStack().append(banner);
  if (effects) spawnCoins(tier === 'free' ? 'big' : tier, hold + 2200);
  setTimeout(() => banner.remove(), hold);
}

// 배너는 한 스핀에 둘 이상 뜰 수 있으므로 스택 컨테이너에 넣는다.
function bannerStack() {
  const existing = el.overlayRoot.querySelector('.banner-stack');
  if (existing !== null) return existing;
  const stack = document.createElement('div');
  stack.className = 'banner-stack';
  el.overlayRoot.append(stack);
  return stack;
}

function overlayLayers(effects, fastRays) {
  if (!effects) return '';
  return `<div class="rays${fastRays ? ' rays--fast' : ''}" aria-hidden="true"></div><div class="halo" aria-hidden="true"></div>`;
}

// 메가윈: 전체 화면 오버레이. 금액이 오버레이 안에서 굴러 올라간다.
export async function showMegaWin(amount, { speed = 1, effects = true } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'status');
  overlay.innerHTML =
    overlayLayers(effects, false) +
    '<div class="overlay__inner">' +
    '<p class="overlay__kicker">MEGA WIN</p>' +
    '<h2 class="overlay__title">메가 윈</h2>' +
    '<p class="overlay__amount overlay__amount--ticking">0</p>' +
    '</div>';
  el.overlayRoot.append(overlay);
  const duration = TIMING.countUpMega / speed;
  const stopCoins = effects ? coinWaves('mega') : () => {};
  await countUp(overlay.querySelector('.overlay__amount'), 0, amount, duration);
  overlay.querySelector('.overlay__amount').classList.remove('overlay__amount--ticking');
  await wait(TIMING.bannerHold / speed);
  stopCoins();
  overlay.remove();
}

// ── 잭팟 픽 보너스 ────────────────────────

function tileMarkup(tier, index, amount) {
  const label = JACKPOT_TIERS[tier].label;
  return (
    `<button class="tile jp--${tier}" type="button" data-tier="${tier}" aria-label="타일 ${index + 1} 뒤집기">` +
    '<span class="tile__inner">' +
    '<span class="tile__face tile__face--back" aria-hidden="true">?</span>' +
    '<span class="tile__face tile__face--front">' +
    `<span class="tile__tier">${label}</span>` +
    `<span class="tile__amount">${formatCoins(amount)}</span>` +
    '</span></span></button>'
  );
}

function chipText(tier, count) {
  return `${JACKPOT_TIERS[tier].label} ${count}/${PICK_MATCH}`;
}

/**
 * 타일을 뒤집어 같은 티어 3개를 모으는 화면. 당첨 티어는 이미 확정되어 있고
 * 타일 구성상 그 티어만 3개가 모일 수 있다. 뒤집는 순서는 결과를 바꾸지 않는다.
 */
export function openPickBonus({ tiles, pools, speed = 1, effects = true }) {
  const overlay = document.createElement('div');
  overlay.className = 'pick';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '잭팟 픽 보너스');
  overlay.innerHTML =
    '<h2 class="pick__title">잭팟 픽</h2>' +
    `<p class="pick__desc">타일을 뒤집어 같은 등급 ${PICK_MATCH}개를 모으면 그 잭팟을 받습니다.</p>` +
    `<div class="pick__grid">${tiles.map((tier, i) => tileMarkup(tier, i, pools[tier])).join('')}</div>` +
    '<div class="pick__progress">' +
    JACKPOT_TIER_KEYS.map(
      (key) => `<span class="pick__chip jp--${key}" data-chip="${key}">${chipText(key, 0)}</span>`,
    ).join('') +
    '</div>';
  el.overlayRoot.append(overlay);
  if (effects) spawnCoins('big', EFFECTS.coinLifeMs);

  const counts = Object.fromEntries(JACKPOT_TIER_KEYS.map((key) => [key, 0]));
  const buttons = [...overlay.querySelectorAll('.tile')];
  buttons[0].focus();

  return new Promise((resolve) => {
    const onPick = (event) => {
      const button = event.currentTarget;
      const tier = button.dataset.tier;
      button.disabled = true;
      button.classList.add('tile--flipped');
      counts[tier] += 1;
      overlay.querySelector(`[data-chip="${tier}"]`).textContent = chipText(tier, counts[tier]);
      if (counts[tier] < PICK_MATCH) return;
      for (const other of buttons) other.disabled = true;
      setTimeout(() => {
        overlay.remove();
        resolve(tier);
      }, TIMING.bannerHold / speed);
    };
    for (const button of buttons) button.addEventListener('click', onPick);
  });
}

// 잭팟: 전용 풀스크린. 확인 버튼을 눌러야 닫힌다.
export function showJackpot(nickname, amount, { speed = 1, effects = true, tierLabel = '' } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay--jackpot';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '잭팟 당첨');
  overlay.innerHTML =
    overlayLayers(effects, true) +
    '<div class="overlay__inner">' +
    `<p class="overlay__kicker">${tierLabel === '' ? 'PROGRESSIVE' : tierLabel} JACKPOT</p>` +
    `<h2 class="overlay__title">${tierLabel === '' ? 'JACKPOT' : tierLabel}</h2>` +
    `<p class="overlay__who">${escapeHtml(nickname)}님, 잭팟!</p>` +
    '<p class="overlay__amount overlay__amount--ticking">0</p>' +
    '<button class="btn btn--primary" type="button" data-confirm>확인</button>' +
    '</div>';
  el.overlayRoot.append(overlay);

  const duration = TIMING.countUpMega / speed;
  // 확인을 누를 때까지 열려 있으므로 금화를 계속 쏟는다.
  const stopCoins = effects ? coinWaves('jackpot') : () => {};
  const confirm = overlay.querySelector('[data-confirm]');
  confirm.focus();
  const amountEl = overlay.querySelector('.overlay__amount');
  countUp(amountEl, 0, amount, duration).then(() => amountEl.classList.remove('overlay__amount--ticking'));

  return new Promise((resolve) => {
    confirm.addEventListener('click', () => {
      stopCoins();
      overlay.remove();
      resolve();
    });
  });
}

// ── 모달 ──────────────────────────────────

let lastFocused = null;

export function closeModal() {
  const open = el.modalRoot.firstElementChild;
  if (open === null) return;
  open.remove();
  if (lastFocused !== null) lastFocused.focus();
  lastFocused = null;
}

function trapFocus(box, event) {
  if (event.key !== 'Tab') return;
  const focusable = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openModal({ title, body, foot = '' }) {
  closeModal();
  lastFocused = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', title);
  wrap.innerHTML =
    '<div class="modal__box">' +
    `<div class="modal__head"><h2 class="modal__title">${title}</h2>` +
    '<button class="icon-btn" type="button" data-close aria-label="닫기">✕</button></div>' +
    `<div class="modal__body">${body}</div>` +
    (foot === '' ? '' : `<div class="modal__foot">${foot}</div>`) +
    '</div>';

  wrap.addEventListener('click', (event) => {
    if (event.target === wrap || event.target.closest('[data-close]') !== null) closeModal();
  });
  const box = wrap.querySelector('.modal__box');
  wrap.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    trapFocus(box, event);
  });

  el.modalRoot.append(wrap);
  wrap.querySelector('[data-close]').focus();
  return wrap;
}

export function setFieldError(input, errorEl, message) {
  const hasError = message !== null;
  errorEl.hidden = !hasError;
  errorEl.textContent = hasError ? message : '';
  input.setAttribute('aria-invalid', String(hasError));
}

// ── 설정 ──────────────────────────────────

export function openSettings({ nickname, turbo, sound, music, onNickname, onTurbo, onSound, onMusic, onReset }) {
  const wrap = openModal({
    title: '설정',
    body:
      '<div class="field">' +
      '<label class="field__label" for="settings-nickname">닉네임</label>' +
      `<input id="settings-nickname" class="field__input" type="text" maxlength="${NICKNAME_RULES.max}" ` +
      `autocomplete="off" spellcheck="false" value="${escapeHtml(nickname)}" aria-describedby="settings-nickname-error">` +
      '<p class="field__error" id="settings-nickname-error" role="alert" hidden></p>' +
      '</div>' +
      '<button class="btn btn--primary btn--wide" type="button" data-save-nickname>닉네임 저장</button>' +
      '<p class="modal__note">바꿔도 코인·통계·기록은 그대로 유지됩니다. 이미 남은 잭팟 기록에는 당첨 당시 닉네임이 그대로 남습니다.</p>' +
      '<h3 class="modal__section">연출</h3>' +
      `<label class="switch"><input type="checkbox" data-turbo ${turbo ? 'checked' : ''}>` +
      '<span>터보 모드<span class="switch__desc">전체 애니메이션 시간을 1/3로 줄입니다.</span></span></label>' +
      '<h3 class="modal__section">소리</h3>' +
      `<label class="switch"><input type="checkbox" data-sound ${sound ? 'checked' : ''}>` +
      '<span>효과음<span class="switch__desc">첫 조작 시점에 오디오가 준비됩니다. 이걸 끄면 배경음도 함께 꺼집니다.</span></span></label>' +
      `<label class="switch"><input type="checkbox" data-music ${music ? 'checked' : ''}>` +
      '<span>배경음<span class="switch__desc">일렉트로 하우스 128 BPM 루프를 직접 합성해 재생합니다. 음원 파일을 쓰지 않습니다.</span></span></label>' +
      '<h3 class="modal__section">초기화</h3>' +
      '<p class="modal__note">코인·통계·잭팟 기록·닉네임이 모두 지워지고 처음 상태로 돌아갑니다.</p>' +
      '<button class="btn btn--danger btn--wide" type="button" data-reset>전체 초기화</button>',
  });

  const input = wrap.querySelector('#settings-nickname');
  const error = wrap.querySelector('#settings-nickname-error');

  wrap.querySelector('[data-save-nickname]').addEventListener('click', () => {
    const message = onNickname(input.value);
    setFieldError(input, error, message);
    if (message === null) closeModal();
  });
  wrap.querySelector('[data-turbo]').addEventListener('change', (event) => onTurbo(event.target.checked));
  wrap.querySelector('[data-sound]').addEventListener('change', (event) => onSound(event.target.checked));
  wrap.querySelector('[data-music]').addEventListener('change', (event) => onMusic(event.target.checked));
  wrap.querySelector('[data-reset]').addEventListener('click', onReset);
  return wrap;
}

// ── 기록 ──────────────────────────────────

function recordRow(entry, extra = '') {
  const mode = MODES[entry.mode]?.short ?? entry.mode;
  const tier = entry.tier === undefined ? '' : ` · ${JACKPOT_TIERS[entry.tier]?.label ?? entry.tier}`;
  return (
    '<div class="record">' +
    `<div><span class="record__who">${escapeHtml(entry.nickname)}</span>` +
    `<span class="record__meta">${tier} · ${mode} · 총베팅 ${formatCoins(entry.bet)}${extra}</span>` +
    `<span class="record__meta" style="display:block">${formatDateTime(entry.at)}</span></div>` +
    `<span class="record__amount">${formatCoins(entry.amount)}</span>` +
    '</div>'
  );
}

function historySection(title, entries, emptyText, extraOf) {
  const body =
    entries.length === 0
      ? `<p class="empty">${emptyText}</p>`
      : entries.map((entry) => recordRow(entry, extraOf(entry))).join('');
  return `<h3 class="modal__section">${title}</h3>${body}`;
}

export function openHistory({ jackpotHistory, bigWins }) {
  openModal({
    title: '기록',
    body:
      historySection(
        `잭팟 (최신 ${HISTORY_LIMITS.jackpotHistory}건)`,
        jackpotHistory,
        '아직 잭팟이 없습니다. 프리스핀·잭팟 모드에서 다이아 5개를 노려보세요.',
        () => '',
      ) +
      historySection(
        `빅윈 (최신 ${HISTORY_LIMITS.bigWins}건)`,
        bigWins,
        `아직 빅윈이 없습니다. 총 베팅의 ${WIN_TIERS.big}배 이상 당첨되면 여기에 남습니다.`,
        (entry) => ` · ${Math.floor(entry.multiple)}배`,
      ),
  });
}

// ── 통계 ──────────────────────────────────

function stat(label, value, accent = false) {
  return (
    `<div class="stat"><span class="stat__label">${label}</span>` +
    `<span class="stat__value${accent ? ' stat__value--accent' : ''}">${value}</span></div>`
  );
}

export function openStats({ stats, wallet }) {
  // 실측 환수율 = 총 획득 / 총 베팅. 프리스핀 당첨은 베팅 없이 얻으므로 분자에만 들어간다.
  const rtp =
    stats.totalWagered === 0
      ? '스핀 기록 없음'
      : `${((stats.totalWon / stats.totalWagered) * 100).toFixed(2)}%`;

  openModal({
    title: '통계',
    body:
      '<div class="stat-grid">' +
      stat('총 스핀', `${formatCoins(stats.spins)}회`) +
      stat('실측 환수율', rtp, true) +
      stat('총 베팅', formatCoins(stats.totalWagered)) +
      stat('총 획득', formatCoins(stats.totalWon)) +
      stat('최고 당첨', formatCoins(stats.bestWin)) +
      stat('프리스핀 발동', `${formatCoins(stats.freeSpinsTriggered)}회`) +
      stat('최장 연속 꽝', `${formatCoins(stats.longestDrySpell)}회`) +
      stat('충전 횟수', `${formatCoins(wallet.totalRefills)}회`) +
      '</div>' +
      (stats.bestWinAt === null
        ? ''
        : `<p class="modal__note">최고 당첨 시각 ${formatDateTime(stats.bestWinAt)}</p>`) +
      '<p class="modal__note">실측 환수율은 총 획득 ÷ 총 베팅입니다. 스핀이 쌓일수록 ' +
      '시뮬레이션 값(클래식 95.02% / 9라인 95.00% / 보너스 94.94%)에 수렴합니다.</p>',
  });
}

// ── 배당표 ────────────────────────────────

function paytableRows(mode) {
  const keys = SYMBOL_ORDER.filter((key) => (mode.weights[key] ?? 0) > 0);
  if (mode.payKind === 'classic') {
    return keys
      .map(
        (key) =>
          `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}</span></div></td>` +
          `<td>${formatCoins(CLASSIC_PAYS[key])}×</td></tr>`,
      )
      .join('');
  }
  return keys
    .map((key) => {
      if (key === SCATTER) {
        const cells = [3, 4, 5]
          .map((n) => `<td>${SCATTER_PAYS[n]}×<small> 총베팅</small></td>`)
          .join('');
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}<small> 스캐터</small></span></div></td>${cells}</tr>`
        );
      }
      const note = key === WILD ? '<small> 와일드</small>' : '';
      const cells = [3, 4, 5].map((n) => `<td>${formatCoins(LINE_PAYS[key][n])}×</td>`).join('');
      return `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}${note}</span></div></td>${cells}</tr>`;
    })
    .join('');
}

function miniLine(line, reels) {
  const cellSize = 18;
  const pitch = 20;
  const rows = reels === 3 ? 1 : 3;
  const width = reels * pitch;
  const height = rows * pitch + 4;
  let cells = '';
  for (let reel = 0; reel < reels; reel += 1) {
    for (let row = 0; row < rows; row += 1) {
      cells += `<rect class="mini__cell" x="${1 + reel * pitch}" y="${3 + row * pitch}" width="${cellSize}" height="${cellSize}" rx="3"/>`;
    }
  }
  const points = line
    .slice(0, reels)
    .map((row, reel) => `${1 + reel * pitch + cellSize / 2},${3 + row * pitch + cellSize / 2}`)
    .join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${cells}<polyline class="mini__path" points="${points}"/></svg>`;
}

function paylineGrid(mode) {
  return modePaylines(mode)
    .map(
      (line, index) =>
        `<div class="mini">${miniLine(line, mode.reels)}<span class="mini__label">라인 ${index + 1}</span></div>`,
    )
    .join('');
}

function waysPaytableRows() {
  const counts = [3, 4, 5, 6];
  return PHARAOH.symbolOrder
    .map((key) => {
      if (key === PHARAOH.wild) {
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}` +
          `<span>${SYMBOLS[key].label}<small> 와일드</small></span></div></td>` +
          '<td colspan="4">스캐터를 뺀 모든 심볼을 대체</td></tr>'
        );
      }
      if (key === PHARAOH.scatter) {
        const shown = [4, 5, 6];
        const cells = shown.map((n) => `<td>${PHARAOH.scatterPays[n]}×</td>`).join('');
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}` +
          `<span>${SYMBOLS[key].label}<small> 스캐터</small></span></div></td>` +
          `<td>-</td>${cells}</tr>`
        );
      }
      const cells = counts.map((n) => `<td>${PHARAOH.pays[key][n]}×</td>`).join('');
      return (
        `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}</span></div></td>${cells}</tr>`
      );
    })
    .join('');
}

function openWaysPaytable() {
  const rules = [
    `왼쪽 릴부터 연속된 릴에 같은 심볼이 있으면 행과 무관하게 당첨입니다. ${PHARAOH.minMatch}릴 이상이어야 합니다.`,
    '배당은 <b>총 베팅 배수 × ways</b>입니다. ways는 각 릴에 나온 개수를 곱한 값이고 ' +
      `6릴 ${PHARAOH.rows}행이면 최대 ${PHARAOH.rows ** PHARAOH.reels}가지입니다.`,
    '심볼마다 따로 계산해 동시에 모두 지급합니다.',
    `당첨 심볼이 사라지고 위에서 새 심볼이 내려와 다시 판정합니다(연쇄). 연쇄 배수는 ` +
      `${PHARAOH.multipliers.join(' → ')}로 올라갑니다.`,
    `스캐터 ${PHARAOH.scatterMin}개 이상이면 프리스핀 ${PHARAOH.freeSpins}회를 받고 당첨금이 ` +
      `${PHARAOH.freeMultiplier}배가 됩니다.`,
    `연쇄가 ${PHARAOH.jackpotChain}단에 닿으면 잭팟 픽 보너스가 열립니다.`,
  ];
  openModal({
    title: `배당표 · ${GAMES.pharaoh.label}`,
    body:
      '<p class="modal__note">ways 하나당 총 베팅 배수입니다.</p>' +
      '<table class="table"><thead><tr><th>심볼</th><th>3릴</th><th>4릴</th><th>5릴</th><th>6릴</th></tr></thead>' +
      `<tbody>${waysPaytableRows()}</tbody></table>` +
      `<ul class="modal__note" style="padding-left:1.1em">${rules.map((line) => `<li>${line}</li>`).join('')}</ul>`,
  });
}

export function openPaytable(gameKey, modeKey) {
  if (GAMES[gameKey].kind === 'cascade') {
    openWaysPaytable();
    return;
  }
  const mode = MODES[modeKey];
  const header =
    mode.payKind === 'classic'
      ? '<tr><th>심볼</th><th>3개</th></tr>'
      : '<tr><th>심볼</th><th>3개</th><th>4개</th><th>5개</th></tr>';
  const rules = [
    `왼쪽 릴부터 연속으로 같은 심볼이 ${MIN_MATCH}개 이상이면 당첨입니다. 중간에 끊기면 거기서 끝납니다.`,
    mode.wild
      ? '크라운(와일드)은 스캐터를 뺀 모든 심볼을 대체합니다. 대체 시 원래 심볼 배당과 크라운 배당 중 큰 쪽을 받습니다.'
      : '이 모드에는 와일드와 스캐터가 없습니다.',
    mode.scatter
      ? `스타(스캐터)는 위치와 무관하게 개수로만 판정합니다. ${SCATTER_MIN}개 이상이면 프리스핀 10회를 받고, 프리스핀 중 당첨금은 2배입니다.`
      : '',
    mode.jackpot
      ? `한 라인에 순수 다이아 ${JACKPOT_MATCH}개 이상(와일드 대체 제외)이면 픽 보너스가 열려 ` +
        `${JACKPOT_TIER_KEYS.map((key) => JACKPOT_TIERS[key].label).join('/')} 중 한 등급의 풀 전액을 받습니다.`
      : '',
  ].filter((line) => line !== '');

  openModal({
    title: `배당표 · ${mode.label}`,
    body:
      `<p class="modal__note">라인당 베팅 기준 배수입니다.</p>` +
      `<table class="table"><thead>${header}</thead><tbody>${paytableRows(mode)}</tbody></table>` +
      `<h3 class="modal__title" style="margin:var(--sp-5) 0 var(--sp-2)">페이라인 ${mode.lines}개</h3>` +
      `<div class="lines-grid">${paylineGrid(mode)}</div>` +
      `<ul class="modal__note" style="padding-left:1.1em">${rules.map((line) => `<li>${line}</li>`).join('')}</ul>`,
  });
}
