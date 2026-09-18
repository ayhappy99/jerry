// 릴 DOM 생성과 회전 애니메이션. 결과를 바꾸지 않고 이미 확정된 그리드를 "보여주는" 일만 한다.

import { TIMING } from './config.js';
import { symbolHref } from './symbols.js';

// 스트립 맨 위에 두는 여유 셀 1개. 정지 시 오버슈트로 내려갈 때 빈 공간이 보이지 않게 한다.
const BUFFER_CELLS = 1;
// 회전 중 지나가는 더미 셀 수
const SPIN_CELLS = 22;

function cellMarkup(symbol) {
  return (
    `<div class="cell" data-symbol="${symbol}">` +
    `<div class="cell__face"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="${symbolHref(symbol)}"/></svg></div>` +
    '</div>'
  );
}

// 셀 높이는 CSS 변수 --cell 하나로 정해지므로 위치 계산에 JS 측정이 필요 없다.
function offsetStyle(cells) {
  return `transform: translateY(calc(var(--cell) * ${-cells}))`;
}

function reelMarkup(reel, cells, offset) {
  return (
    `<div class="reel" data-reel="${reel}">` +
    `<div class="reel__strip" style="${offsetStyle(offset)}">${cells.map(cellMarkup).join('')}</div>` +
    '</div>'
  );
}

// 정지 상태의 릴을 그린다. 애니메이션 없이 결과만 즉시 보여줄 때도 이 함수를 쓴다.
export function renderReels(host, mode, grid) {
  host.style.setProperty('--rows', String(mode.rows));
  host.innerHTML = mode.strips
    .map((strip, reel) => reelMarkup(reel, [strip[0], ...grid[reel]], BUFFER_CELLS))
    .join('');
}

export function cellAt(host, reel, row) {
  const strip = host.querySelector(`.reel[data-reel="${reel}"] .reel__strip`);
  return strip.children[BUFFER_CELLS + row];
}

export function clearHighlights(host) {
  for (const cell of host.querySelectorAll('.cell--win, .cell--scatter')) {
    cell.classList.remove('cell--win', 'cell--scatter');
  }
}
