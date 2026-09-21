// 용문: 가변 릴 높이 + 올웨이즈 + 캐스케이딩.
// DOM을 참조하지 않는 순수 함수만 둔다. 스톱과 높이만 받으면 결과가 결정되므로
// 밸런스 시뮬레이터가 게임과 똑같은 함수를 그대로 호출한다.
//
// 릴마다 보이는 칸 수가 매 스핀 다르다. ways는 릴 높이의 곱이라 최대 7^6 = 117,649다.
// 판정 자체는 파라오와 같은 올웨이즈이고, 릴별 개수의 곱을 쓰는 구조도 같다.

import { GATE } from './config.js';

const PAY_SYMBOLS = Object.keys(GATE.pays);
const HEIGHT_TOTAL = GATE.heights.reduce((sum, entry) => sum + entry.weight, 0);

// 릴 하나의 높이를 가중치대로 뽑는다.
function drawHeight() {
  let roll = Math.random() * HEIGHT_TOTAL;
  for (const entry of GATE.heights) {
    roll -= entry.weight;
    if (roll < 0) return entry.rows;
  }
  return GATE.heights[GATE.heights.length - 1].rows;
}

export function drawHeights() {
  return Array.from({ length: GATE.reels }, drawHeight);
}

// 이 스핀의 ways 수. 화면에 그대로 띄운다.
export function waysOf(heights) {
  return heights.reduce((product, rows) => product * rows, 1);
}

// 릴별 높이가 다른 격자를 만든다. grid[reel]의 길이가 릴마다 다르다.
export function buildGateGrid(stops, heights) {
  return GATE.strips.map((strip, reel) =>
    Array.from(
      { length: heights[reel] },
      (_, row) => strip[(stops[reel] + row) % strip.length],
    ),
  );
}

function cloneGrid(grid) {
  return grid.map((column) => [...column]);
}

// 한 릴에서 해당 심볼(와일드 대체 포함)이 나온 행 번호
function matchRows(column, symbol) {
  const rows = [];
  column.forEach((cell, row) => {
    if (cell === symbol || cell === GATE.wild) rows.push(row);
  });
  return rows;
}

/**
 * 올웨이즈 판정. 왼쪽 릴부터 연속으로 해당 심볼이 있으면 당첨이고
 * ways는 각 릴의 개수를 곱한 값이다. 심볼마다 독립으로 평가해 모두 지급한다.
 */
export function evaluateGate(grid) {
  const wins = [];
  for (const symbol of PAY_SYMBOLS) {
    const perReel = [];
    for (let reel = 0; reel < GATE.reels; reel += 1) {
      const rows = matchRows(grid[reel], symbol);
      if (rows.length === 0) break;
      perReel.push(rows);
    }
    if (perReel.length < GATE.minMatch) continue;
    const count = perReel.length;
    const ways = perReel.reduce((product, rows) => product * rows.length, 1);
    wins.push({
      symbol,
      count,
      ways,
      pay: GATE.pays[symbol][count] * ways,
      cells: perReel.flatMap((rows, reel) => rows.map((row) => ({ reel, row }))),
    });
  }
  return wins;
}

export function countGateScatters(grid) {
  let count = 0;
  for (const column of grid) {
    for (const cell of column) {
      if (cell === GATE.scatter) count += 1;
    }
  }
  return count;
}

/**
 * 당첨 셀을 없애고 위에서 새 심볼이 내려오게 한다. 릴 높이는 그대로 유지된다.
 * 새 심볼은 릴 스트립을 계속 거슬러 올라가며 가져오므로 물리 릴과 일관된다.
 */
export function gateCascade(grid, cells, cursors) {
  const removed = new Set(cells.map(({ reel, row }) => `${reel}:${row}`));
  const nextCursors = [...cursors];
  const nextGrid = grid.map((column, reel) => {
    const kept = column.filter((_, row) => !removed.has(`${reel}:${row}`));
    const strip = GATE.strips[reel];
    const added = [];
    let cursor = nextCursors[reel];
    for (let i = kept.length; i < column.length; i += 1) {
      cursor = (cursor - 1 + strip.length) % strip.length;
      added.unshift(strip[cursor]);
    }
    nextCursors[reel] = cursor;
    return [...added, ...kept];
  });
  return { grid: nextGrid, cursors: nextCursors };
}

// 연쇄 배수. 유료 스핀은 사다리를 따르고, 프리스핀은 단계마다 1씩 올라가며 상한이 없다.
export function gateMultiplier(chain, freeSpin) {
  if (freeSpin) return 1 + (chain - 1) * GATE.freeChainStep;
  return GATE.multipliers[Math.min(chain, GATE.multipliers.length) - 1];
}

/**
 * 스핀 1회. 연쇄가 끝날 때까지 돌려 단계별 결과를 모두 담아 반환한다.
 * 연출은 steps를 순서대로 보여주기만 하면 된다.
 * @param {{stops: number[], heights: number[], totalBet: number, freeSpin: boolean}} input
 */
export function spinGate({ stops, heights, totalBet, freeSpin = false }) {
  const initialGrid = buildGateGrid(stops, heights);
  const scatters = countGateScatters(initialGrid);
  const freeMult = freeSpin ? GATE.freeMultiplier : 1;

  let grid = initialGrid;
  let cursors = [...stops];
  const steps = [];
  let chain = 0;
  let payMultiple = 0;

  while (chain < GATE.maxChain) {
    const wins = evaluateGate(grid);
    if (wins.length === 0) break;
    chain += 1;
    const chainMultiplier = gateMultiplier(chain, freeSpin);
    const stepMultiple = wins.reduce((sum, win) => sum + win.pay, 0) * chainMultiplier;
    payMultiple += stepMultiple;

    const before = cloneGrid(grid);
    const next = gateCascade(grid, wins.flatMap((win) => win.cells), cursors);
    steps.push({ grid: before, wins, chain, chainMultiplier, stepMultiple, nextGrid: next.grid });
    grid = next.grid;
    cursors = next.cursors;
  }

  const scatterMultiple = scatters >= GATE.scatterMin ? GATE.scatterPays[scatters] ?? 0 : 0;
  const totalWin = Math.round((payMultiple + scatterMultiple) * freeMult * totalBet);

  return {
    initialGrid,
    finalGrid: grid,
    heights,
    ways: waysOf(heights),
    steps,
    chain,
    scatters,
    scatterMultiple,
    freeSpinsAwarded: scatters >= GATE.scatterMin ? GATE.freeSpins : 0,
    multiplier: freeMult,
    payMultiple,
    totalBet,
    totalWin,
    freeSpin,
  };
}
