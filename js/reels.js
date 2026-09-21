// 릴 DOM 생성과 회전 애니메이션.
// 결과는 스핀 시작 시점에 이미 확정되어 있고, 이 파일은 그 결과를 "보여주는" 일만 한다.
// 앤티시페이션도 확정된 결과를 읽어 연출을 고르는 것이며 확률에 개입하지 않는다.

import { HOLD, SCATTER, SCATTER_MIN, TIMING } from './config.js';
import { symbolHref } from './symbols.js';

// 스트립 맨 위의 여유 셀 1개. 정지 시 오버슈트로 내려갈 때 빈 공간이 보이지 않게 한다.
const BUFFER_CELLS = 1;
// 회전 중 지나갈 셀 수
const SPIN_CELLS = 24;
// 목표 위치를 지나치는 정도 (셀 높이 비율)
const OVERSHOOT = 0.16;
// 등속 구간이 끝나는 시점과 그때까지 이동한 비율
const CRUISE_AT = 0.72;
const CRUISE_RATIO = 0.84;

function cellMarkup(symbol) {
  return (
    `<div class="cell" data-symbol="${symbol}">` +
    `<div class="cell__face"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="${symbolHref(symbol)}"/></svg></div>` +
    '</div>'
  );
}

// 정지 상태의 transform. --cell 하나로 정해지므로 브레이크포인트가 바뀌어도 그대로 맞는다.
function restStyle() {
  return `transform: translateY(calc(var(--cell) * ${-BUFFER_CELLS}))`;
}

// rows를 넘기면 그 릴만 높이가 달라진다(용문). --rows는 .reels에 깔려 있고
// 인라인으로 덮어쓰면 그 릴에만 적용된다. 높이 계산은 CSS 한 줄이 전부다.
function reelMarkup(reel, cells, rows = null) {
  // null이면 인라인 변수를 아예 쓰지 않는다. `--rows: null`을 넣으면
  // calc(var(--cell) * null)이 무효가 되어 height 선언이 통째로 버려지고
  // 릴이 내용 높이로 늘어난다(overflow:hidden이 잘라 낼 것이 없어진다).
  const style = rows === null ? '' : ` style="--rows: ${rows}"`;
  return (
    `<div class="reel" data-reel="${reel}"${style}>` +
    `<div class="reel__strip" style="${restStyle()}">${cells.map(cellMarkup).join('')}</div>` +
    '</div>'
  );
}

// 이 스핀에서 릴 하나가 보여 줄 행 수. 가변 릴이 아니면 모든 릴이 같다.
function rowsOf(mode, heights, reel) {
  return heights === null ? mode.rows : heights[reel];
}

// 스톱 위치 기준으로 실제 릴 스트립을 잘라낸다. stop 바로 앞 심볼이 여유 셀이 된다.
function sliceStrip(strip, stop, count) {
  const length = strip.length;
  return Array.from(
    { length: count },
    (_, index) => strip[(((stop - BUFFER_CELLS + index) % length) + length) % length],
  );
}

function stripOf(host, reel) {
  return host.querySelector(`.reel[data-reel="${reel}"] .reel__strip`);
}

// 정지 상태의 릴을 그린다. 모션 최소화 설정에서 결과를 즉시 보여줄 때도 이 함수를 쓴다.
export function renderReels(host, mode, stops, heights = null) {
  host.style.setProperty('--rows', String(mode.rows));
  host.classList.toggle('reels--ragged', heights !== null);
  host.innerHTML = mode.strips
    .map((strip, reel) => {
      const rows = rowsOf(mode, heights, reel);
      return reelMarkup(reel, sliceStrip(strip, stops[reel], BUFFER_CELLS + rows), heights && rows);
    })
    .join('');
}

// 그리드를 그대로 그린다. 캐스케이딩은 스톱이 아니라 단계별 그리드를 받는다.
export function renderGrid(host, mode, grid, heights = null) {
  host.style.setProperty('--rows', String(mode.rows));
  host.classList.toggle('reels--ragged', heights !== null);
  host.innerHTML = mode.strips
    .map((strip, reel) => reelMarkup(reel, [strip[0], ...grid[reel]], heights && grid[reel].length))
    .join('');
}

export function cellAt(host, reel, row) {
  return stripOf(host, reel).children[BUFFER_CELLS + row];
}

/**
 * 금구슬을 격자 위에 얹는다. 릴 심볼이 아니라 칸 위에 붙는 배지다.
 * clearHighlights가 아니라 clearBeads로 따로 지운다 — 당첨을 하나씩 보여 주는 동안
 * clearHighlights가 여러 번 불리는데 그때 구슬이 같이 사라지면 안 된다.
 */
export function markBeads(host, beads) {
  for (const { reel, row, mult } of beads) {
    const bead = document.createElement('span');
    bead.className = 'bead';
    bead.textContent = `×${mult}`;
    // .cell__face가 아니라 .cell에 붙인다. face 안에 넣으면 당첨 아닌 칸을 흐리게 하는
    // face의 opacity가 그룹으로 걸려 배수를 읽을 수 없다.
    cellAt(host, reel, row).append(bead);
  }
}

export function clearBeads(host) {
  for (const bead of host.querySelectorAll('.bead')) bead.remove();
}

export function clearHighlights(host) {
  for (const cell of host.querySelectorAll('.cell--win, .cell--scatter')) {
    cell.classList.remove('cell--win', 'cell--scatter');
  }
  for (const burst of host.querySelectorAll('.burst')) burst.remove();
  host.classList.remove('reels--focus');
}

// 현재 화면에 보이는 심볼. 회전 시작 프레임을 이 심볼로 채워 튀는 느낌을 없앤다.
// 이전 스핀의 릴 높이가 이번과 다를 수 있다. 실제로 그려져 있는 셀 수만 읽는다.
function visibleSymbols(host, mode) {
  return mode.strips.map((_, reel) => {
    const cells = stripOf(host, reel).children;
    return Array.from(cells).slice(BUFFER_CELLS).map((cell) => cell.dataset.symbol);
  });
}

function scatterCount(grid, untilReel, scatter) {
  let count = 0;
  for (let reel = 0; reel < untilReel; reel += 1) {
    for (const symbol of grid[reel]) {
      if (symbol === scatter) count += 1;
    }
  }
  return count;
}

// 스캐터가 이미 (최소 개수 - 1)개 나와 있으면 남은 릴부터 느려진다.
// mode.scatter가 true면 기본 스캐터, 문자열이면 그 게임 고유의 스캐터다.
function anticipationStart(mode, grid) {
  if (!mode.scatter) return -1;
  const scatter = mode.scatter === true ? SCATTER : mode.scatter;
  const min = mode.scatterMin ?? SCATTER_MIN;
  for (let reel = 1; reel < mode.reels; reel += 1) {
    if (scatterCount(grid, reel, scatter) >= min - 1) return reel;
  }
  return -1;
}

function reelDuration(reel, anticipateFrom, speed) {
  const base = TIMING.reelSpinBase + reel * TIMING.reelStagger;
  const extra = anticipateFrom !== -1 && reel >= anticipateFrom ? TIMING.anticipationExtra : 0;
  return (base + extra) / speed;
}

function animateReel(reelEl, pitch, travelCells, duration, anticipate) {
  const strip = reelEl.querySelector('.reel__strip');
  const from = -(BUFFER_CELLS + travelCells) * pitch;
  const rest = -BUFFER_CELLS * pitch;
  const cruise = from + (rest - from) * CRUISE_RATIO;
  const over = -(BUFFER_CELLS - OVERSHOOT) * pitch;

  reelEl.classList.add('reel--spinning');
  if (anticipate) reelEl.classList.add('reel--anticipate');

  const animation = strip.animate(
    [
      { transform: `translateY(${from}px)`, offset: 0, easing: 'linear' },
      { transform: `translateY(${cruise}px)`, offset: CRUISE_AT, easing: 'cubic-bezier(0.2, 0.65, 0.3, 1)' },
      { transform: `translateY(${over}px)`, offset: 0.9, easing: 'cubic-bezier(0.36, 1.25, 0.6, 1)' },
      { transform: `translateY(${rest}px)`, offset: 1 },
    ],
    { duration },
  );

  // 정지 직전 구간에서 모션 블러를 약하게 바꾼다.
  const settleAt = Math.max(0, duration - TIMING.blurClearBefore);
  const settleTimer = setTimeout(() => reelEl.classList.add('reel--settling'), settleAt);

  return animation.finished.then(() => {
    clearTimeout(settleTimer);
    reelEl.classList.remove('reel--spinning', 'reel--settling', 'reel--anticipate');
  });
}

/**
 * 릴을 돌려 확정된 결과를 보여준다.
 * @param {{stops: number[], grid: string[][]}} spin 스핀 시작 시점에 확정된 결과
 */
export async function spinReels(host, mode, spin, { turbo = false, heights = null, onReelStop = () => {}, onAnticipate = () => {} } = {}) {
  const previous = visibleSymbols(host, mode);
  const anticipateFrom = anticipationStart(mode, spin.grid);
  const speed = turbo ? TIMING.turboDivisor : 1;

  host.style.setProperty('--rows', String(mode.rows));
  host.classList.toggle('reels--ragged', heights !== null);
  host.innerHTML = mode.strips
    .map((strip, reel) => {
      const rows = rowsOf(mode, heights, reel);
      // 위에서부터: 여유 셀 · 최종 결과 · 지나갈 스트립 · 직전 화면
      const cells = [
        ...sliceStrip(strip, spin.stops[reel], BUFFER_CELLS + rows + SPIN_CELLS),
        ...previous[reel],
      ];
      return reelMarkup(reel, cells, heights && rows);
    })
    .join('');

  const pitch = host.querySelector('.cell').offsetHeight;
  if (anticipateFrom !== -1) onAnticipate(anticipateFrom);

  await Promise.all(
    mode.strips.map((_, reel) => {
      const reelEl = host.querySelector(`.reel[data-reel="${reel}"]`);
      const duration = reelDuration(reel, anticipateFrom, speed);
      const anticipate = anticipateFrom !== -1 && reel >= anticipateFrom;
      // 높이가 릴마다 다르면 지나갈 셀 수도 릴마다 다르다
      const travelCells = rowsOf(mode, heights, reel) + SPIN_CELLS;
      return animateReel(reelEl, pitch, travelCells, duration, anticipate).then(() => onReelStop(reel));
    }),
  );
}

// ── 캐스케이딩 연출 ───────────────────────

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function reelEl(host, reel) {
  return host.querySelector(`.reel[data-reel="${reel}"]`);
}

// 릴별로 사라질 셀 수를 센다. 그만큼 위에서 내려오므로 낙하 거리가 된다.
// 와일드 셀은 여러 심볼의 당첨에 동시에 들어가므로 cascade.js와 똑같이 중복을 걷어낸다.
function removedPerReel(mode, cells) {
  const counts = new Array(mode.reels).fill(0);
  const seen = new Set();
  for (const { reel, row } of cells) {
    const key = `${reel}:${row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts[reel] += 1;
  }
  return counts;
}

function markCascadeWins(host, wins) {
  for (const win of wins) {
    for (const { reel, row } of win.cells) cellAt(host, reel, row).classList.add('cell--win');
  }
}

function popCascadeWins(host, wins, duration) {
  for (const win of wins) {
    for (const { reel, row } of win.cells) {
      const cell = cellAt(host, reel, row);
      cell.style.setProperty('--pop-dur', `${duration}ms`);
      cell.classList.add('cell--pop');
    }
  }
}

// 새 심볼이 위에서 떨어져 내려오는 느낌을 준다. 릴별 낙하 거리는 사라진 셀 수다.
function dropIn(host, mode, drops, duration) {
  const pitch = host.querySelector('.cell').offsetHeight;
  mode.strips.forEach((_, reel) => {
    if (drops[reel] === 0) return;
    const strip = reelEl(host, reel).querySelector('.reel__strip');
    strip.animate(
      [
        { transform: `translateY(${-(BUFFER_CELLS + drops[reel]) * pitch}px)` },
        { transform: `translateY(${-BUFFER_CELLS * pitch}px)` },
      ],
      { duration, easing: 'cubic-bezier(0.3, 0.05, 0.4, 1)' },
    );
  });
}

/**
 * 연쇄 단계를 순서대로 보여준다. 결과는 이미 확정되어 있고 steps를 재생할 뿐이다.
 * instant=true면 마지막 그리드만 즉시 표시한다.
 */
export async function playCascade(host, mode, steps, { speed = 1, instant = false, heights = null, onStep = () => {} } = {}) {
  if (steps.length === 0) return;
  if (instant) {
    const last = steps[steps.length - 1];
    if (last.wins !== undefined) markCascadeWins(host, last.wins);
    else renderGrid(host, mode, last.nextGrid, heights);
    onStep(last);
    return;
  }
  for (const step of steps) {
    // 부적 게이지 단계는 당첨이 없다. 와일드가 내려앉는 것만 보여 준다.
    if (step.charge !== undefined) {
      onStep(step);
      renderGrid(host, mode, step.nextGrid, heights);
      for (const { reel, row } of step.charge) cellAt(host, reel, row).classList.add('cell--descend');
      await wait(TIMING.chargeDrop / speed);
      continue;
    }
    markCascadeWins(host, step.wins);
    onStep(step);
    await wait(TIMING.cascadeHold / speed);

    const popDuration = TIMING.cascadePop / speed;
    popCascadeWins(host, step.wins, popDuration);
    await wait(popDuration);

    renderGrid(host, mode, step.nextGrid, heights);
    dropIn(host, mode, removedPerReel(mode, step.wins.flatMap((win) => win.cells)), TIMING.cascadeDrop / speed);
    await wait(TIMING.cascadeDrop / speed);
  }
}

// ── 홀드 앤 스핀 연출 ──────────────────────
// 고정된 코인은 값과 함께 남고, 빈 칸만 다시 돈다.

function holdCellMarkup(coin) {
  if (coin === undefined) {
    return '<div class="cell cell--blank"><div class="cell__face"></div></div>';
  }
  return (
    '<div class="cell cell--held" data-symbol="coin">' +
    '<div class="cell__face">' +
    `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="${symbolHref(HOLD.symbol)}"/></svg>` +
    `<span class="cell__value">${coin.mult}배</span>` +
    '</div></div>'
  );
}

// 고정 코인 목록으로 판을 그린다. 여유 셀 한 칸은 다른 렌더와 같은 구조를 유지하려고 둔다.
export function renderHoldGrid(host, mode, coins) {
  const placed = new Map(coins.map((coin) => [`${coin.reel}:${coin.row}`, coin]));
  host.style.setProperty('--rows', String(mode.rows));
  host.classList.remove('reels--ragged');
  host.innerHTML = mode.strips
    .map((_, reel) => {
      const cells = [holdCellMarkup(undefined)];
      for (let row = 0; row < mode.rows; row += 1) {
        cells.push(holdCellMarkup(placed.get(`${reel}:${row}`)));
      }
      return (
        `<div class="reel" data-reel="${reel}">` +
        `<div class="reel__strip" style="${restStyle()}">${cells.join('')}</div>` +
        '</div>'
      );
    })
    .join('');
}

function markRolling(host, mode, coins) {
  const placed = new Set(coins.map((coin) => `${coin.reel}:${coin.row}`));
  for (let reel = 0; reel < mode.reels; reel += 1) {
    for (let row = 0; row < mode.rows; row += 1) {
      if (placed.has(`${reel}:${row}`)) continue;
      cellAt(host, reel, row).classList.add('cell--rolling');
    }
  }
}

function markFresh(host, added) {
  for (const { reel, row } of added) cellAt(host, reel, row).classList.add('cell--fresh');
}

/**
 * 홀드 앤 스핀 한 판을 재생한다. 결과는 이미 확정되어 있고 steps를 따라가기만 한다.
 * @param {{coins: object[], steps: object[], trigger: number}} hold
 */
export async function playHold(host, mode, hold, { speed = 1, instant = false, onStep = () => {} } = {}) {
  const shown = hold.coins.slice(0, hold.trigger);
  renderHoldGrid(host, mode, shown);
  onStep({ held: shown.length, respinsLeft: HOLD.respins, added: [], done: false });

  if (instant) {
    renderHoldGrid(host, mode, hold.coins);
    onStep({ held: hold.coins.length, respinsLeft: 0, added: [], done: true });
    return;
  }

  markFresh(host, shown);
  await wait(TIMING.holdEnter / speed);

  for (const step of hold.steps) {
    markRolling(host, mode, shown);
    await wait(TIMING.holdRoll / speed);
    shown.push(...step.added);
    renderHoldGrid(host, mode, shown);
    markFresh(host, step.added);
    onStep({ held: shown.length, respinsLeft: step.respinsLeft, added: step.added, done: false });
    await wait(TIMING.holdReveal / speed);
  }
  onStep({ held: shown.length, respinsLeft: 0, added: [], done: true });
}
