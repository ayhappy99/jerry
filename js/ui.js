// 미터·메시지·모달·토스트 렌더. 게임 판정은 하지 않는다.

import {
  BETS,
  NICKNAME_RULES,
  CLASSIC_PAYS,
  LINE_PAYS,
  MIN_MATCH,
  MODES,
  MODE_KEYS,
  SCATTER,
  SCATTER_MIN,
  SCATTER_PAYS,
  SYMBOLS,
  SYMBOL_ORDER,
  TIMING,
  WILD,
  modePaylines,
} from './config.js';
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
    return (
      `<button class="mode-tab" type="button" role="tab" data-mode="${key}" ` +
      `aria-selected="${key === activeKey}">${mode.label}<span class="mode-tab__sub">${sub}</span></button>`
    );
  }).join('');
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

export function focusNicknameInput(value) {
  el.nicknameInput.value = value;
  el.nicknameInput.focus();
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
