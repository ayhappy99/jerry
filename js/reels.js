// 릴 DOM 생성과 회전 애니메이션.
// 결과는 스핀 시작 시점에 이미 확정되어 있고, 이 파일은 그 결과를 "보여주는" 일만 한다.
// 앤티시페이션도 확정된 결과를 읽어 연출을 고르는 것이며 확률에 개입하지 않는다.

import { SCATTER, SCATTER_MIN, TIMING } from './config.js';
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

function reelMarkup(reel, cells) {
  return (
    `<div class="reel" data-reel="${reel}">` +
    `<div class="reel__strip" style="${restStyle()}">${cells.map(cellMarkup).join('')}</div>` +
    '</div>'
  );
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
export function renderReels(host, mode, stops) {
  host.style.setProperty('--rows', String(mode.rows));
  host.innerHTML = mode.strips
    .map((strip, reel) => reelMarkup(reel, sliceStrip(strip, stops[reel], BUFFER_CELLS + mode.rows)))
    .join('');
}

export function cellAt(host, reel, row) {
  return stripOf(host, reel).children[BUFFER_CELLS + row];
}

export function clearHighlights(host) {
  for (const cell of host.querySelectorAll('.cell--win, .cell--scatter')) {
    cell.classList.remove('cell--win', 'cell--scatter');
  }
}

// 현재 화면에 보이는 심볼. 회전 시작 프레임을 이 심볼로 채워 튀는 느낌을 없앤다.
function visibleSymbols(host, mode) {
  return mode.strips.map((_, reel) =>
    Array.from({ length: mode.rows }, (_, row) => cellAt(host, reel, row).dataset.symbol),
  );
}

function scatterCount(grid, untilReel) {
  let count = 0;
  for (let reel = 0; reel < untilReel; reel += 1) {
    for (const symbol of grid[reel]) {
      if (symbol === SCATTER) count += 1;
    }
  }
  return count;
}

// 스캐터가 이미 (최소 개수 - 1)개 나와 있으면 남은 릴부터 느려진다.
function anticipationStart(mode, grid) {
  if (!mode.scatter) return -1;
  for (let reel = 1; reel < mode.reels; reel += 1) {
    if (scatterCount(grid, reel) >= SCATTER_MIN - 1) return reel;
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
export async function spinReels(host, mode, spin, { turbo = false, onReelStop = () => {}, onAnticipate = () => {} } = {}) {
  const previous = visibleSymbols(host, mode);
  const anticipateFrom = anticipationStart(mode, spin.grid);
  const speed = turbo ? TIMING.turboDivisor : 1;
  const travelCells = mode.rows + SPIN_CELLS;

  host.style.setProperty('--rows', String(mode.rows));
  host.innerHTML = mode.strips
    .map((strip, reel) => {
      // 위에서부터: 여유 셀 · 최종 결과 · 지나갈 스트립 · 직전 화면
      const cells = [
        ...sliceStrip(strip, spin.stops[reel], BUFFER_CELLS + mode.rows + SPIN_CELLS),
        ...previous[reel],
      ];
      return reelMarkup(reel, cells);
    })
    .join('');

  const pitch = host.querySelector('.cell').offsetHeight;
  if (anticipateFrom !== -1) onAnticipate(anticipateFrom);

  await Promise.all(
    mode.strips.map((_, reel) => {
      const reelEl = host.querySelector(`.reel[data-reel="${reel}"]`);
      const duration = reelDuration(reel, anticipateFrom, speed);
      const anticipate = anticipateFrom !== -1 && reel >= anticipateFrom;
      return animateReel(reelEl, pitch, travelCells, duration, anticipate).then(() => onReelStop(reel));
    }),
  );
}
