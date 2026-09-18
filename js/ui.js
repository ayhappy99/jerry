// 미터·메시지·모달·토스트 렌더. 게임 판정은 하지 않는다.

import {
  BETS,
  CLASSIC_PAYS,
  HISTORY_LIMITS,
  LINE_PAYS,
  MIN_MATCH,
  MODES,
  MODE_KEYS,
  NICKNAME_RULES,
  SCATTER,
  SCATTER_MIN,
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
  cabinet: document.getElementById('screen-cabinet'),
  nicknameForm: document.getElementById('nickname-form'),
  nicknameInput: document.getElementById('nickname-input'),
  nicknameError: document.getElementById('nickname-error'),
  bulbs: document.querySelector('.marquee__bulbs'),
  seat: document.getElementById('seat-label'),
  jackpotMeter: document.getElementById('jackpot-meter'),
  jackpotHint: document.getElementById('jackpot-hint'),
  modes: document.getElementById('modes'),
  window: document.querySelector('.cabinet__window'),
  reels: document.getElementById('reels'),
  lines: document.getElementById('lines'),
  freespinBadge: document.getElementById('freespin-badge'),
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

export function setSeat(nickname) {
  el.seat.textContent = `${nickname}님의 자리`;
}

export function setCredit(value) {
  el.credit.textContent = formatCoins(value);
}

export function setBet(lineBet, mode) {
  el.betLabel.textContent = formatCoins(lineBet);
  el.betMeter.textContent = formatCoins(lineBet * mode.lines);
  el.betSub.textContent = `라인당 ${formatCoins(lineBet)} × ${mode.lines}`;
}

export function setWin(value) {
  el.winMeter.textContent = formatCoins(value);
}

export function setJackpot(value) {
  el.jackpotMeter.textContent = formatCoins(value);
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

export function rollJackpot(from, to, duration) {
  return countUp(el.jackpotMeter, from, to, duration);
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

function markCells(win, className) {
  for (const { reel, row } of win.cells) {
    cellAt(el.reels, reel, row).classList.add(className);
  }
}

function showAllWins(lineWins, scatter) {
  clearHighlights(el.reels);
  syncLinesViewBox();
  el.lines.innerHTML = lineWins.map((win) => winPath(win, 'line-path line-path--all')).join('');
  for (const win of lineWins) markCells(win, 'cell--win');
  if (scatter !== null) markCells(scatter, 'cell--scatter');
}

function showSingleWin(win) {
  clearHighlights(el.reels);
  syncLinesViewBox();
  el.lines.innerHTML = winPath(win, 'line-path');
  markCells(win, 'cell--win');
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 당첨 라인을 하나씩 순서대로 보여준 뒤 마지막에 전체를 함께 보여준다.
 * instant=true면 순차 연출 없이 전체를 한 번에 정적으로 표시한다.
 */
export async function playLineWins(lineWins, scatter, { speed = 1, instant = false, onLine = () => {} } = {}) {
  if (lineWins.length === 0 && scatter === null) return;
  if (instant) {
    showAllWins(lineWins, scatter);
    return;
  }
  if (lineWins.length > 1) {
    for (const win of lineWins) {
      showSingleWin(win);
      onLine(win);
      await wait(TIMING.lineHighlight / speed);
    }
  }
  showAllWins(lineWins, scatter);
  if (lineWins.length > 1) await wait(TIMING.lineHighlightAll / speed);
}

// ── 빅윈 / 메가윈 / 잭팟 ──────────────────

const PARTICLE_COUNT = 34;

function spawnParticles(duration) {
  const layer = document.createElement('div');
  layer.className = 'particles';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = Array.from(
    { length: PARTICLE_COUNT },
    () => `<span class="particle" style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 0.7).toFixed(2)}s"></span>`,
  ).join('');
  el.overlayRoot.append(layer);
  setTimeout(() => layer.remove(), duration);
}

// 빅윈: 상단 배너 + 금색 파티클. 카운트업과 나란히 진행되도록 기다리지 않는다.
export function showBigWin(text, speed = 1) {
  const hold = TIMING.bannerHold / speed;
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.setAttribute('role', 'status');
  banner.textContent = text;
  el.overlayRoot.append(banner);
  spawnParticles(hold + 600);
  setTimeout(() => banner.remove(), hold);
}

// 메가윈: 전체 화면 오버레이. 금액이 오버레이 안에서 굴러 올라간다.
export async function showMegaWin(amount, speed = 1) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'status');
  overlay.innerHTML =
    '<p class="overlay__kicker">MEGA WIN</p>' +
    '<h2 class="overlay__title">메가 윈</h2>' +
    '<p class="overlay__amount">0</p>';
  el.overlayRoot.append(overlay);
  spawnParticles(TIMING.countUpMega / speed + 600);
  await countUp(overlay.querySelector('.overlay__amount'), 0, amount, TIMING.countUpMega / speed);
  await wait(TIMING.bannerHold / speed);
  overlay.remove();
}

// 잭팟: 전용 풀스크린. 확인 버튼을 눌러야 닫힌다.
export function showJackpot(nickname, amount, speed = 1) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay--jackpot';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '잭팟 당첨');
  overlay.innerHTML =
    '<p class="overlay__kicker">PROGRESSIVE JACKPOT</p>' +
    '<h2 class="overlay__title">JACKPOT</h2>' +
    `<p class="overlay__who">${escapeHtml(nickname)}님, 잭팟!</p>` +
    '<p class="overlay__amount">0</p>' +
    '<button class="btn btn--primary" type="button" data-confirm>확인</button>';
  el.overlayRoot.append(overlay);
  spawnParticles(TIMING.countUpMega / speed + 1200);

  const confirm = overlay.querySelector('[data-confirm]');
  confirm.focus();
  countUp(overlay.querySelector('.overlay__amount'), 0, amount, TIMING.countUpMega / speed);

  return new Promise((resolve) => {
    confirm.addEventListener('click', () => {
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

export function openSettings({ nickname, turbo, sound, onNickname, onTurbo, onSound, onReset }) {
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
      `<label class="switch"><input type="checkbox" data-sound ${sound ? 'checked' : ''}>` +
      '<span>소리<span class="switch__desc">효과음을 켭니다. 첫 조작 시점에 오디오가 준비됩니다.</span></span></label>' +
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
  wrap.querySelector('[data-reset]').addEventListener('click', onReset);
  return wrap;
}

// ── 기록 ──────────────────────────────────

function recordRow(entry, extra = '') {
  const mode = MODES[entry.mode]?.short ?? entry.mode;
  return (
    '<div class="record">' +
    `<div><span class="record__who">${escapeHtml(entry.nickname)}</span>` +
    `<span class="record__meta"> · ${mode} · 총베팅 ${formatCoins(entry.bet)}${extra}</span>` +
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

export function openPaytable(modeKey) {
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
    mode.jackpot ? '한 라인에 다이아 5개(와일드 대체 제외)가 뜨면 잭팟 풀 전액을 받습니다.' : '',
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
