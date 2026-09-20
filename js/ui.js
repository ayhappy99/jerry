// 미터·메시지·모달·토스트 렌더. 게임 판정은 하지 않는다.

import {
  AUTO_SPINS,
  BETS,
  HOLD,
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
  POUCH,
  POUCH_JACKPOT,
  POUCH_TIER_KEYS,
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
import { vesselBarMarkup } from './vessel.js';

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
  pouchBar: document.getElementById('pouch-jackpot-bar'),
  modes: document.getElementById('modes'),
  window: document.querySelector('.cabinet__window'),
  frame: document.querySelector('.cabinet__frame'),
  marquee: document.querySelector('.marquee'),
  flash: document.getElementById('flash'),
  reels: document.getElementById('reels'),
  lines: document.getElementById('lines'),
  freespinBadge: document.getElementById('freespin-badge'),
  chainBadge: document.getElementById('chain-badge'),
  attract: document.getElementById('attract'),
  holdBadge: document.getElementById('hold-badge'),
  readout: document.getElementById('reel-readout'),
  credit: document.getElementById('credit-meter'),
  betSub: document.getElementById('bet-sub'),
  winMeter: document.getElementById('win-meter'),
  message: document.getElementById('message'),
  betDown: document.getElementById('bet-down'),
  betUp: document.getElementById('bet-up'),
  betMax: document.getElementById('bet-max'),
  betLabel: document.getElementById('bet-label'),
  spin: document.getElementById('spin'),
  auto: document.getElementById('auto'),
  autoPick: document.getElementById('auto-pick'),
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
      '</span></button>'
    );
  }).join('');
}

export function setCredit(value) {
  el.credit.textContent = formatCoins(value);
}

// 큰 숫자는 한 번 돌릴 때 실제로 빠지는 총액이다.
// 단위 베팅(라인당·기본)은 아래 보조 줄에서 계산식으로 보여준다.
export function setBet(totalBet, note) {
  el.betLabel.textContent = formatCoins(totalBet);
  el.betSub.textContent = note;
}

export function setWin(value) {
  el.winMeter.textContent = formatCoins(value);
  // 패배 시에는 강조하지 않는다.
  el.winMeter.classList.toggle('dock__winvalue--lit', value > 0);
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

// ── 복주머니 잭팟 바 ──────────────────────
// 복주머니는 공유 풀을 쓰지 않으므로 이 바는 캐비닛 화면에만 있다.

export function renderPouchVessels() {
  el.pouchBar.innerHTML = vesselBarMarkup(POUCH_TIER_KEYS, POUCH_JACKPOT.tiers);
}

// 어느 잭팟 바를 보여줄지는 게임 종류가 정한다.
export function setJackpotBarKind(kind) {
  const cluster = kind === 'cluster';
  el.jackpotBar.hidden = cluster;
  el.pouchBar.hidden = !cluster;
}

function vesselOf(key) {
  return el.pouchBar.querySelector(`.vessel[data-tier="${key}"]`);
}

// 주머니는 속이 보이지 않는다. 얼마나 찼는지 알 수 있으면 언제 터질지 짐작이 되므로
// 화면에 남기는 단서는 금액 하나뿐이다.
export function setPouchJackpot(pools) {
  for (const key of POUCH_TIER_KEYS) {
    vesselOf(key).querySelector(`[data-pouch-value="${key}"]`).textContent = formatCoins(pools[key]);
  }
}

// 적립분만큼 금액을 굴려 올린다.
export function rollPouchJackpot(from, to, duration) {
  for (const key of POUCH_TIER_KEYS) {
    countUp(vesselOf(key).querySelector(`[data-pouch-value="${key}"]`), from[key], to[key], duration);
  }
}

// 세로 화면에서는 릴을 보는 동안 잭팟 바가 화면 밖에 있다.
// 터지는 걸 놓치지 않게 먼저 화면 안으로 들인다.
export function revealJackpotBar(ms) {
  el.pouchBar.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 이번 스핀에 채워진 주머니를 한 번 밝힌다. 숫자만 굴러가면 눈에 안 띈다.
export function flashVessel(key) {
  const vessel = vesselOf(key);
  vessel.classList.remove('vessel--fed');
  void vessel.offsetWidth;
  vessel.classList.add('vessel--fed');
  setTimeout(() => vessel.classList.remove('vessel--fed'), TIMING.vesselFeed);
}

// 팡! 끝나면 클래스를 떼어 다음 적립을 다시 그릴 수 있게 한다.
export function burstVessel(key, ms) {
  const vessel = vesselOf(key);
  vessel.classList.remove('vessel--burst');
  // 연달아 터질 때 애니메이션이 처음부터 다시 돌게 강제로 배치를 다시 계산한다
  void vessel.offsetWidth;
  vessel.classList.add('vessel--burst');
  return new Promise((resolve) => {
    setTimeout(() => {
      vessel.classList.remove('vessel--burst');
      resolve();
    }, ms);
  });
}

export function setMessage(text, muted = false) {
  el.message.textContent = text;
  el.message.classList.toggle('message--muted', muted);
}

export function setReadout(text) {
  el.readout.textContent = text;
}

// maxIdx는 지금 가진 코인으로 돌릴 수 있는 가장 큰 단계다. 베팅 단계의 끝이 아니다.
export function setBetButtons(betIdx, maxIdx) {
  el.betDown.disabled = betIdx === 0;
  el.betUp.disabled = betIdx === BETS.length - 1;
  el.betMax.disabled = betIdx === maxIdx;
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

// 자동 스핀 중에는 STOP과 남은 횟수를 같은 버튼에 보여준다. null은 무한이다.
export function setAutoButton(running, remaining = null) {
  el.auto.dataset.running = String(running);
  if (!running) {
    el.auto.textContent = '자동';
    el.auto.setAttribute('aria-label', '자동 스핀 시작');
    return;
  }
  const left = remaining === null ? '∞' : `${remaining}회`;
  el.auto.innerHTML = `STOP<span class="btn__sub">${left}</span>`;
  el.auto.setAttribute(
    'aria-label',
    remaining === null ? '자동 스핀 중지 (무한)' : `자동 스핀 중지, ${remaining}회 남음`,
  );
}

// 자동 스핀 횟수 선택 목록을 연다. 선택 결과는 onPick으로 넘긴다.
export function openAutoPick(onPick) {
  el.autoPick.innerHTML = AUTO_SPINS.map((count) => {
    const label = count === null ? '무한' : `${count}회`;
    return (
      `<button class="autopick__item" type="button" role="menuitem" ` +
      `data-count="${count === null ? 'infinite' : count}">${label}</button>`
    );
  }).join('');
  el.autoPick.hidden = false;
  el.auto.setAttribute('aria-expanded', 'true');

  for (const item of el.autoPick.querySelectorAll('.autopick__item')) {
    item.addEventListener('click', () => {
      const raw = item.dataset.count;
      closeAutoPick();
      onPick(raw === 'infinite' ? null : Number(raw));
    });
  }
  el.autoPick.querySelector('.autopick__item').focus();
}

export function closeAutoPick() {
  el.autoPick.hidden = true;
  el.autoPick.innerHTML = '';
  el.auto.setAttribute('aria-expanded', 'false');
}

export function autoPickOpen() {
  return !el.autoPick.hidden;
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

// 어트랙트 모드 표시. 데모라는 사실을 화면에 남긴다.
export function setAttract(on) {
  el.attract.hidden = !on;
  el.cabinet.dataset.attract = String(on);
  if (on) el.message.textContent = '';
}

// 프리스핀 전용 화면. 배경과 릴 프레임 색이 바뀐다.
export function setFreeSpinScreen(on) {
  el.cabinet.dataset.free = String(on);
}

// 홀드 앤 스핀 전용 화면과 남은 리스핀 표시
export function setHoldScreen(on) {
  el.cabinet.dataset.hold = String(on);
  if (!on) el.holdBadge.hidden = true;
}

export function setHoldBadge(text) {
  el.holdBadge.hidden = text === null;
  if (text !== null) el.holdBadge.textContent = text;
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

/**
 * 덩어리 당첨을 하나씩 보여준 뒤 마지막에 전체를 함께 보여준다.
 * 줄이 없는 판정이라 선은 그리지 않고 칸만 표시한다.
 */
export async function playClusterWins(wins, { speed = 1, instant = false, onWin = () => {} } = {}) {
  if (wins.length === 0) return;
  const showAll = () => {
    clearHighlights(el.reels);
    for (const win of wins) markCells(win, 'cell--win', false);
    el.reels.classList.add('reels--focus');
  };
  if (instant) {
    showAll();
    return;
  }
  for (const win of wins) {
    clearHighlights(el.reels);
    markCells(win, 'cell--win', true);
    el.reels.classList.add('reels--focus');
    onWin(win);
    if (wins.length > 1) await wait(TIMING.clusterHold / speed);
  }
  if (wins.length > 1) showAll();
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
    `<button class="tile jp--${tier}" type="button" data-tier="${tier}" aria-label="${index + 1}번 카드 뒤집기">` +
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
  overlay.setAttribute('aria-label', '잭팟 뽑기');
  overlay.innerHTML =
    '<h2 class="pick__title">잭팟 뽑기</h2>' +
    `<p class="pick__desc">카드를 뒤집어 같은 등급 ${PICK_MATCH}장을 모으면 그 잭팟에 쌓인 돈을 전부 받습니다.</p>` +
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

// ── 체험형 안내 ───────────────────────────

let tourNode = null;

// 대상 요소를 구멍 하나로 남기고 나머지를 덮는다. 구멍은 거대한 box-shadow로 만든다.
function placeTour(target) {
  const spot = tourNode.querySelector('.tour__spot');
  const bubble = tourNode.querySelector('.tour__bubble');
  const node = target === null ? null : document.querySelector(target);

  if (node === null) {
    spot.style.cssText = 'left:50%; top:50%; width:0; height:0';
    bubble.style.cssText = 'left:50%; top:50%; transform:translate(-50%,-50%)';
    return;
  }

  const pad = 8;
  const rect = node.getBoundingClientRect();
  spot.style.cssText =
    `left:${rect.left - pad}px; top:${rect.top - pad}px; ` +
    `width:${rect.width + pad * 2}px; height:${rect.height + pad * 2}px`;

  // 말풍선은 대상 아래에 두고, 아래가 좁으면 위로 올린다.
  bubble.style.transform = 'none';
  const below = window.innerHeight - rect.bottom;
  const top = below > bubble.offsetHeight + 24
    ? rect.bottom + 16
    : Math.max(8, rect.top - bubble.offsetHeight - 16);
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - bubble.offsetWidth / 2),
    Math.max(8, window.innerWidth - bubble.offsetWidth - 8),
  );
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

/**
 * 안내 한 단계를 보여준다.
 * action이 true면 대상을 직접 누를 수 있게 오버레이가 클릭을 통과시킨다.
 * @returns {Promise<'next'|'action'|'skip'>}
 */
export function showTourStep({ target = null, text, button = null, action = false, step, total }) {
  if (tourNode === null) {
    tourNode = document.createElement('div');
    tourNode.className = 'tour';
    tourNode.setAttribute('role', 'dialog');
    tourNode.setAttribute('aria-label', '게임 방법 안내');
    tourNode.innerHTML = '<div class="tour__spot"></div><div class="tour__bubble"></div>';
    el.overlayRoot.append(tourNode);
  }
  tourNode.classList.toggle('tour--pass', action);

  const bubble = tourNode.querySelector('.tour__bubble');
  bubble.innerHTML =
    `<p class="tour__count">${step} / ${total}</p>` +
    `<p class="tour__text">${text}</p>` +
    (button === null
      ? '<p class="tour__hint">위에서 반짝이는 버튼을 직접 눌러 보세요</p>'
      : `<button class="btn btn--primary btn--wide" type="button" data-tour-next>${button}</button>`) +
    '<button class="tour__skip" type="button" data-tour-skip>안내 그만 보기</button>';

  placeTour(target);
  const focusTo = bubble.querySelector('[data-tour-next]') ?? bubble.querySelector('[data-tour-skip]');
  focusTo.focus();

  return new Promise((resolve) => {
    const targetNode = action && target !== null ? document.querySelector(target) : null;
    const reposition = () => placeTour(target);
    const onAction = () => finish('action');

    function finish(how) {
      window.removeEventListener('resize', reposition);
      if (targetNode !== null) targetNode.removeEventListener('click', onAction);
      resolve(how);
    }

    window.addEventListener('resize', reposition);
    if (targetNode !== null) targetNode.addEventListener('click', onAction);
    bubble.querySelector('[data-tour-skip]').addEventListener('click', () => finish('skip'));
    const next = bubble.querySelector('[data-tour-next]');
    if (next !== null) next.addEventListener('click', () => finish('next'));
  });
}

export function closeTour() {
  if (tourNode === null) return;
  tourNode.remove();
  tourNode = null;
}

/**
 * 스와이프·뒤로 동작이 닫을 수 있는 층. 위에서부터 하나만 닫고 닫았는지 알려준다.
 * true를 돌려주면 호출자는 이전 화면으로 가지 않는다.
 */
export function closeTopLayer() {
  // 뽑기 화면은 골라야 넘어간다. 스와이프로 건너뛸 수 없다.
  if (el.overlayRoot.querySelector('.pick') !== null) return true;
  if (el.modalRoot.firstElementChild !== null) {
    closeModal();
    return true;
  }
  if (autoPickOpen()) {
    closeAutoPick();
    return true;
  }
  const confirm = el.overlayRoot.querySelector('.overlay--jackpot [data-confirm]');
  if (confirm !== null) {
    confirm.click();
    return true;
  }
  // 안내는 노드를 지우지 않고 "그만 보기"를 누른다. 그래야 기다리고 있는 약속이 풀리고
  // 안내를 본 시각이 저장된다. 노드만 지우면 runTour가 영원히 멈춰 선다.
  const skip = tourNode === null ? null : tourNode.querySelector('[data-tour-skip]');
  if (skip !== null) {
    skip.click();
    return true;
  }
  return false;
}

// 가로 화면에서는 하단 툴바를 숨기고 이 메뉴 하나로 모든 항목에 들어간다.
const MENU_ITEMS = [
  { open: 'howto', icon: '?', label: '게임 방법', desc: '처음이면 여기부터' },
  { open: 'paytable', icon: '▤', label: '배당표', desc: '심볼별로 얼마를 받는지' },
  { open: 'history', icon: '★', label: '기록', desc: '잭팟·크게 딴 기록' },
  { act: 'sound', icon: '♪', label: '소리 켜고 끄기', desc: '효과음과 배경음' },
  { act: 'refill', icon: '＋', label: '코인 충전', desc: '코인이 떨어졌을 때' },
  { open: 'settings', icon: '⚙', label: '설정', desc: '닉네임·속도·소리·초기화' },
];

export function openMenu() {
  return openModal({
    title: '메뉴',
    body:
      '<div class="menu">' +
      MENU_ITEMS.map((item) => {
        const attr = item.open === undefined ? `data-act="${item.act}"` : `data-open="${item.open}"`;
        return (
          `<button class="menu__item" type="button" ${attr}>` +
          `<span class="menu__icon" aria-hidden="true">${item.icon}</span>` +
          `<span class="menu__text"><span class="menu__label">${item.label}</span>` +
          `<span class="menu__desc">${item.desc}</span></span></button>`
        );
      }).join('') +
      '</div>',
  });
}

export function setFieldError(input, errorEl, message) {
  const hasError = message !== null;
  errorEl.hidden = !hasError;
  errorEl.textContent = hasError ? message : '';
  input.setAttribute('aria-invalid', String(hasError));
}

// ── 설정 ──────────────────────────────────

export function openSettings({
  nickname, turbo, sound, music, ambience,
  onNickname, onTurbo, onSound, onMusic, onAmbience, onReset,
}) {
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
      '<span>빠르게 돌리기<span class="switch__desc">릴이 도는 시간과 당첨 연출을 1/3로 줄입니다. 결과는 달라지지 않습니다.</span></span></label>' +
      '<h3 class="modal__section">소리</h3>' +
      `<label class="switch"><input type="checkbox" data-sound ${sound ? 'checked' : ''}>` +
      '<span>효과음<span class="switch__desc">첫 조작 시점에 오디오가 준비됩니다. 이걸 끄면 배경음도 함께 꺼집니다.</span></span></label>' +
      `<label class="switch"><input type="checkbox" data-music ${music ? 'checked' : ''}>` +
      '<span>배경음<span class="switch__desc">일렉트로 하우스 128 BPM 루프를 직접 합성해 재생합니다. 음원 파일을 쓰지 않습니다.</span></span></label>' +
      `<label class="switch"><input type="checkbox" data-ambience ${ambience ? 'checked' : ''}>` +
      '<span>홀 생활소음<span class="switch__desc">옆 기계의 릴 소리와 동전 소리를 아주 낮게 깔아 카지노 홀에 앉은 느낌을 만듭니다.</span></span></label>' +
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
  wrap.querySelector('[data-ambience]').addEventListener('change', (event) => onAmbience(event.target.checked));
  wrap.querySelector('[data-sound]').addEventListener('change', (event) => onSound(event.target.checked));
  wrap.querySelector('[data-music]').addEventListener('change', (event) => onMusic(event.target.checked));
  wrap.querySelector('[data-reset]').addEventListener('click', onReset);
  return wrap;
}

// ── 기록 ──────────────────────────────────

// 기록에 남은 판 이름. 페이라인 게임은 모드 이름, 줄이 없는 게임은 게임 이름이다.
function recordModeLabel(key) {
  return MODES[key]?.short ?? GAMES[key]?.label ?? key;
}

function recordRow(entry, extra = '') {
  const mode = recordModeLabel(entry.mode);
  const tier = entry.tier === undefined ? '' : ` · ${JACKPOT_TIERS[entry.tier]?.label ?? entry.tier}`;
  return (
    '<div class="record">' +
    `<div><span class="record__who">${escapeHtml(entry.nickname)}</span>` +
    `<span class="record__meta">${tier} · ${mode} · 걸었던 돈 ${formatCoins(entry.bet)}${extra}</span>` +
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
        '아직 잭팟이 없습니다. 공짜 스핀·잭팟 게임에서 다이아를 노려보세요.',
        () => '',
      ) +
      historySection(
        `크게 딴 기록 (최신 ${HISTORY_LIMITS.bigWins}건)`,
        bigWins,
        `아직 없습니다. 거는 돈의 ${WIN_TIERS.big}배 이상 따면 여기에 남습니다.`,
        (entry) => ` · ${Math.floor(entry.multiple)}배`,
      ),
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
          `<td>${formatCoins(CLASSIC_PAYS[key])}배</td></tr>`,
      )
      .join('');
  }
  return keys
    .map((key) => {
      if (key === SCATTER) {
        const cells = [3, 4, 5]
          .map((n) => `<td>${SCATTER_PAYS[n]}배<small> 거는 돈</small></td>`)
          .join('');
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}<small> 흩어져도 OK</small></span></div></td>${cells}</tr>`
        );
      }
      if (key === HOLD.symbol) {
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}` +
          `<span>${SYMBOLS[key].label}<small> 라인 배당 없음</small></span></div></td>` +
          `<td colspan="3">${HOLD.trigger}개 이상 나오면 홀드 앤 스핀</td></tr>`
        );
      }
      const note = key === WILD ? '<small> 아무 심볼로 변신</small>' : '';
      const cells = [3, 4, 5].map((n) => `<td>${formatCoins(LINE_PAYS[key][n])}배</td>`).join('');
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
        `<div class="mini">${miniLine(line, mode.reels)}<span class="mini__label">${index + 1}번 줄</span></div>`,
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
          `<span>${SYMBOLS[key].label}<small> 아무 심볼로 변신</small></span></div></td>` +
          '<td colspan="4">오벨리스크만 빼고 어떤 심볼로든 변신합니다</td></tr>'
        );
      }
      if (key === PHARAOH.scatter) {
        const shown = [4, 5, 6];
        const cells = shown.map((n) => `<td>${PHARAOH.scatterPays[n]}배</td>`).join('');
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}` +
          `<span>${SYMBOLS[key].label}<small> 흩어져도 OK</small></span></div></td>` +
          `<td>-</td>${cells}</tr>`
        );
      }
      const cells = counts.map((n) => `<td>${PHARAOH.pays[key][n]}배</td>`).join('');
      return (
        `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}</span></div></td>${cells}</tr>`
      );
    })
    .join('');
}

function openWaysPaytable() {
  const rules = [
    `<b>줄이 없습니다.</b> 맨 왼쪽 칸부터 옆 칸으로 계속 같은 심볼이 있으면 위아래 어디든 당첨입니다. ` +
      `${PHARAOH.minMatch}칸 이상 이어져야 합니다.`,
    '같은 심볼이 여러 개면 <b>경로 수</b>만큼 곱해 받습니다. 예를 들어 첫 칸에 2개, 둘째 칸에 3개, ' +
      `셋째 칸에 1개면 2 × 3 × 1 = 6배로 받습니다. 최대 ${PHARAOH.rows ** PHARAOH.reels}가지까지 나옵니다.`,
    '심볼 종류마다 따로 계산해서 한 번에 다 줍니다.',
    `당첨된 심볼이 <b>사라지고 위에서 새 심볼이 떨어져</b> 다시 따질 수 있습니다(연속 당첨). ` +
      `연속으로 이어질수록 받는 돈이 ${PHARAOH.multipliers.join('배 → ')}배로 커집니다.`,
    `오벨리스크가 ${PHARAOH.scatterMin}개 이상 나오면 <b>공짜로 ${PHARAOH.freeSpins}번</b> 더 돌리고, ` +
      `그동안 당첨금이 ${PHARAOH.freeMultiplier}배가 됩니다.`,
    `연속 당첨이 <b>${PHARAOH.jackpotChain}번</b>까지 이어지면 잭팟 뽑기 화면이 열립니다.`,
  ];
  openModal({
    title: `배당표 · ${GAMES.pharaoh.label}`,
    body:
      '<p class="modal__note">경로 1개당 <b>한 번에 거는 돈</b>의 몇 배를 받는지 적은 표입니다.</p>' +
      '<table class="table"><thead><tr><th>심볼</th><th>3칸</th><th>4칸</th><th>5칸</th><th>6칸</th></tr></thead>' +
      `<tbody>${waysPaytableRows()}</tbody></table>` +
      `<ul class="modal__note" style="padding-left:1.1em">${rules.map((line) => `<li>${line}</li>`).join('')}</ul>`,
  });
}

function clusterPaytableRows() {
  const bands = POUCH.sizeBands;
  return POUCH.symbolOrder
    .map((key) => {
      if (key === POUCH.wild) {
        return (
          `<tr><td><div class="table__sym">${symbolMarkup(key)}` +
          `<span>${SYMBOLS[key].label}</span></div></td>` +
          `<td colspan="${bands.length}">아무 심볼로 변신해 떨어진 두 덩어리를 이어 줍니다</td></tr>`
        );
      }
      // 배수라는 건 표 머리와 안내문이 말한다. 칸마다 "배"를 붙이면 열이 넘친다.
      const cells = bands.map((n) => `<td>${POUCH.pays[key][n]}</td>`).join('');
      return (
        `<tr><td><div class="table__sym">${symbolMarkup(key)}<span>${SYMBOLS[key].label}</span></div></td>${cells}</tr>`
      );
    })
    .join('');
}

function openClusterPaytable() {
  const bands = POUCH.sizeBands;
  const header =
    '<tr><th>심볼</th>' +
    bands.map((n, i) => `<th>${n}${i === bands.length - 1 ? '+' : ''}</th>`).join('') +
    '</tr>';
  // 어느 주머니가 채워지는지는 config의 feed가 정한다. 개수가 큰 것부터 먼저 걸리므로
  // 맨 위만 "이상"이고 나머지는 정확히 그 개수다.
  const feedList = POUCH_JACKPOT.feed
    .map((entry, index) => {
      const range = index === 0 ? `${entry.count}개 이상` : `${entry.count}개`;
      return `<b>${range}</b>이면 ${POUCH_JACKPOT.tiers[entry.tier].label}`;
    })
    .join(', ');
  const rules = [
    `<b>줄이 없습니다.</b> 같은 심볼이 <b>위아래 옆으로 붙어</b> ${POUCH.minCluster}칸 이상 뭉치면 당첨입니다. ` +
      '대각선은 붙은 것으로 보지 않습니다.',
    '뭉친 칸이 많을수록 받는 돈이 커집니다. 표의 칸 수가 그 구간입니다.',
    `<b>${SYMBOLS[POUCH.wild].label}</b>는 아무 심볼로든 변신해서, 떨어져 있던 두 덩어리를 하나로 이어 줍니다. ` +
      '변신 심볼만으로 뭉친 것은 당첨이 아닙니다.',
    `<b>${SYMBOLS[POUCH.wild].label} 심볼이 화면에 나오면</b> 그 개수만큼 큰 주머니에 돈이 쌓입니다. ` +
      `${feedList}. 하나도 없으면 아무 주머니도 쌓이지 않습니다.`,
    '주머니마다 <b>천장</b>이 있어서, 늦어도 그 금액에 닿기 전에 <b>반드시 터집니다</b>. ' +
      '주머니는 속이 안 보이고 터질 지점도 화면에 나오지 않습니다. 쌓인 금액만 보입니다.',
    '복주머니 잭팟은 이 게임만의 돈입니다. 다른 게임의 잭팟과 섞이지 않습니다.',
  ];
  openModal({
    title: `배당표 · ${GAMES.pouch.label}`,
    body:
      '<p class="modal__note">가로줄은 심볼, 세로줄은 <b>뭉친 칸 수</b>입니다. ' +
      '숫자는 <b>한 번에 거는 돈</b>의 배수입니다.</p>' +
      `<div class="table-scroll"><table class="table table--bands"><thead>${header}</thead>` +
      `<tbody>${clusterPaytableRows()}</tbody></table></div>` +
      `<ul class="modal__note" style="padding-left:1.1em">${rules.map((line) => `<li>${line}</li>`).join('')}</ul>`,
  });
}

export function openPaytable(gameKey, modeKey) {
  if (GAMES[gameKey].kind === 'cascade') {
    openWaysPaytable();
    return;
  }
  if (GAMES[gameKey].kind === 'cluster') {
    openClusterPaytable();
    return;
  }
  const mode = MODES[modeKey];
  const header =
    mode.payKind === 'classic'
      ? '<tr><th>심볼</th><th>3개</th></tr>'
      : '<tr><th>심볼</th><th>3개</th><th>4개</th><th>5개</th></tr>';
  const rules = [
    `아래 그림의 <b>당첨 줄</b> 위에서, 맨 왼쪽부터 옆으로 같은 심볼이 ${MIN_MATCH}개 이상 이어지면 당첨입니다. ` +
      '중간에 다른 심볼이 끼면 거기서 끝납니다.',
    mode.wild
      ? '<b>왕관</b>은 아무 심볼로든 변신합니다(별만 빼고). 변신했을 때는 원래 심볼 배당과 왕관 배당 중 ' +
        '더 많은 쪽을 받습니다.'
      : '이 게임에는 변신 심볼과 흩어지는 심볼이 없습니다.',
    mode.scatter
      ? `<b>별</b>은 줄과 상관없이 화면에 ${SCATTER_MIN}개만 있으면 됩니다. 나오면 <b>공짜로 10번</b> 더 돌리고, ` +
        '그동안 당첨금이 2배가 됩니다.'
      : '',
    mode.jackpot
      ? `한 줄에 <b>다이아가 ${JACKPOT_MATCH}개 이상</b>(왕관이 변신한 것은 빼고) 이어지면 잭팟 뽑기가 열려 ` +
        `${JACKPOT_TIER_KEYS.map((key) => JACKPOT_TIERS[key].label).join('/')} 중 한 등급에 쌓인 돈을 전부 받습니다.`
      : '',
    mode.hold
      ? `<b>골드 코인이 ${HOLD.trigger}개 이상</b> 나오면 그 코인이 자리에 붙고 빈 칸만 ${HOLD.respins}번 더 돕니다. ` +
        `새 코인이 하나라도 붙으면 횟수가 다시 ${HOLD.respins}번으로 늘어납니다. 끝나면 붙은 코인에 적힌 배수를 ` +
        '모두 합쳐 받고, <b>15칸을 다 채우면 잭팟 뽑기</b>가 열립니다.'
      : '',
  ].filter((line) => line !== '');

  openModal({
    title: `배당표 · ${mode.label}`,
    body:
      `<p class="modal__note"><b>한 줄에 거는 돈</b>의 몇 배를 받는지 적은 표입니다.</p>` +
      `<table class="table"><thead>${header}</thead><tbody>${paytableRows(mode)}</tbody></table>` +
      `<h3 class="modal__title" style="margin:var(--sp-5) 0 var(--sp-2)">당첨 줄 ${mode.lines}개</h3>` +
      `<div class="lines-grid">${paylineGrid(mode)}</div>` +
      `<ul class="modal__note" style="padding-left:1.1em">${rules.map((line) => `<li>${line}</li>`).join('')}</ul>`,
  });
}
