// 파라오의 문: 올웨이즈 판정과 캐스케이딩 연쇄.
// DOM을 참조하지 않는 순수 함수만 둔다. 스톱 배열만 받으면 결과가 결정되므로
// 밸런스 시뮬레이터가 게임과 똑같은 함수를 그대로 호출한다.

import { PHARAOH } from './config.js';
import { buildGrid } from './rng.js';

const PAY_SYMBOLS = Object.keys(PHARAOH.pays);

function cloneGrid(grid) {
  return grid.map((column) => [...column]);
}

// 한 릴에서 해당 심볼(와일드 대체 포함)이 나온 행 번호
function matchRows(column, symbol) {
  const rows = [];
  column.forEach((cell, row) => {
    if (cell === symbol || cell === PHARAOH.wild) rows.push(row);
  });
  return rows;
}

/**
 * 올웨이즈 판정. 왼쪽 릴부터 연속으로 해당 심볼이 있으면 당첨이고,
 * ways는 각 릴의 개수를 곱한 값이다. 심볼마다 독립으로 평가해 모두 지급한다.
 * 반환 pay는 총 베팅 배수다.
 */
export function evaluateWays(grid) {
  const wins = [];
  for (const symbol of PAY_SYMBOLS) {
    const perReel = [];
    for (let reel = 0; reel < PHARAOH.reels; reel += 1) {
      const rows = matchRows(grid[reel], symbol);
      if (rows.length === 0) break;
      perReel.push(rows);
    }
    if (perReel.length < PHARAOH.minMatch) continue;
    const count = perReel.length;
    const ways = perReel.reduce((product, rows) => product * rows.length, 1);
    wins.push({
      symbol,
      count,
      ways,
      pay: PHARAOH.pays[symbol][count] * ways,
      cells: perReel.flatMap((rows, reel) => rows.map((row) => ({ reel, row }))),
    });
  }
  return wins;
}

// 스캐터는 위치 무관, 개수로만 판정한다.
export function countScatters(grid) {
  let count = 0;
  for (const column of grid) {
    for (const cell of column) {
      if (cell === PHARAOH.scatter) count += 1;
    }
  }
  return count;
}

/**
 * 당첨 셀을 없애고 위에서 새 심볼이 내려오게 한다.
 * 새 심볼은 릴 스트립을 계속 거슬러 올라가며 가져오므로 물리 릴과 일관된다.
 */
export function cascadeOnce(grid, cells, cursors) {
  const removed = new Set(cells.map(({ reel, row }) => `${reel}:${row}`));
  const nextCursors = [...cursors];
  const nextGrid = grid.map((column, reel) => {
    const kept = column.filter((_, row) => !removed.has(`${reel}:${row}`));
    const strip = PHARAOH.strips[reel];
    const added = [];
    let cursor = nextCursors[reel];
    for (let i = kept.length; i < PHARAOH.rows; i += 1) {
      cursor = (cursor - 1 + strip.length) % strip.length;
      // 먼저 들어온 심볼이 더 아래에 쌓인다.
      added.unshift(strip[cursor]);
    }
    nextCursors[reel] = cursor;
    return [...added, ...kept];
  });
  return { grid: nextGrid, cursors: nextCursors };
}

function chainMultiplierOf(chain) {
  const ladder = PHARAOH.multipliers;
  return ladder[Math.min(chain, ladder.length) - 1];
}

/**
 * 스핀 1회. 연쇄가 끝날 때까지 돌려 단계별 결과를 모두 담아 반환한다.
 * 연출은 steps를 순서대로 보여주기만 하면 된다.
 * @param {{stops: number[], totalBet: number, freeSpin: boolean}} input
 */
export function spinCascade({ stops, totalBet, freeSpin = false }) {
  const initialGrid = buildGrid(PHARAOH.strips, stops, PHARAOH.rows);
  const scatters = countScatters(initialGrid);
  const multiplier = freeSpin ? PHARAOH.freeMultiplier : 1;

  let grid = initialGrid;
  let cursors = [...stops];
  const steps = [];
  let chain = 0;
  let payMultiple = 0;

  while (chain < PHARAOH.maxChain) {
    const wins = evaluateWays(grid);
    if (wins.length === 0) break;
    chain += 1;
    const chainMultiplier = chainMultiplierOf(chain);
    const stepMultiple = wins.reduce((sum, win) => sum + win.pay, 0) * chainMultiplier;
    payMultiple += stepMultiple;

    const before = cloneGrid(grid);
    const next = cascadeOnce(grid, wins.flatMap((win) => win.cells), cursors);
    steps.push({ grid: before, wins, chain, chainMultiplier, stepMultiple, nextGrid: next.grid });
    grid = next.grid;
    cursors = next.cursors;
  }

  const scatterMultiple =
    scatters >= PHARAOH.scatterMin ? PHARAOH.scatterPays[scatters] ?? 0 : 0;
  const totalWin = Math.round((payMultiple + scatterMultiple) * multiplier * totalBet);

  return {
    initialGrid,
    finalGrid: grid,
    steps,
    chain,
    scatters,
    scatterMultiple,
    freeSpinsAwarded: scatters >= PHARAOH.scatterMin ? PHARAOH.freeSpins : 0,
    multiplier,
    payMultiple,
    totalBet,
    totalWin,
    freeSpin,
    // 연쇄가 기준 단계에 닿으면 잭팟 픽 보너스가 열린다.
    jackpot: { hit: chain >= PHARAOH.jackpotChain },
  };
}
