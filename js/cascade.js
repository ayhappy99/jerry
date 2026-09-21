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
 * 부적 게이지가 꽉 찼을 때: 와일드가 아닌 칸 중 몇 개를 골라 와일드로 바꾼다.
 * 격자를 바꾸지 않고 새 격자를 만들어 돌려준다.
 */
export function dropWilds(grid, count) {
  const open = [];
  grid.forEach((column, reel) => {
    // 1번 릴에는 와일드를 놓지 않는다. 스트립도 같은 규칙이다(reelWeights의 eye: 0).
    // ways 판정은 왼쪽 릴부터 세므로 1번 릴 와일드 하나가 모든 심볼의 당첨을 연다.
    if (PHARAOH.reelWeights[reel]?.[PHARAOH.wild] === 0) return;
    column.forEach((cell, row) => {
      if (cell !== PHARAOH.wild) open.push({ reel, row });
    });
  });
  const take = Math.min(count, open.length);
  // 앞에서 take개만 필요하므로 그만큼만 섞는다
  for (let i = 0; i < take; i += 1) {
    const pick = i + Math.floor(Math.random() * (open.length - i));
    [open[i], open[pick]] = [open[pick], open[i]];
  }
  const next = cloneGrid(grid);
  const cells = open.slice(0, take);
  for (const { reel, row } of cells) next[reel][row] = PHARAOH.wild;
  return { grid: next, cells };
}

/**
 * 스핀 1회. 연쇄가 끝날 때까지 돌려 단계별 결과를 모두 담아 반환한다.
 * 연출은 steps를 순서대로 보여주기만 하면 된다.
 *
 * charge는 스핀을 넘겨 이어지는 부적 게이지다. 연쇄 한 단계마다 1칸 차고,
 * 용량에 닿으면 그 자리에서 와일드가 내려앉아 연쇄가 이어진다. 게이지가 차는 시점도
 * 와일드가 앉는 자리도 전부 이 함수 안에서 확정되고, 연출은 steps를 재생만 한다.
 * @param {{stops: number[], totalBet: number, freeSpin: boolean, charge: number}} input
 */
export function spinCascade({ stops, totalBet, freeSpin = false, charge = 0 }) {
  const initialGrid = buildGrid(PHARAOH.strips, stops, PHARAOH.rows);
  const scatters = countScatters(initialGrid);
  const multiplier = freeSpin ? PHARAOH.freeMultiplier : 1;

  let grid = initialGrid;
  let cursors = [...stops];
  const steps = [];
  let chain = 0;
  let payMultiple = 0;
  let chargeLeft = charge;
  let chargeFired = 0;

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

    chargeLeft += 1;
    // 한 스핀에 한 번만 발동한다. 막지 않으면 발동이 연쇄를 늘리고 그 연쇄가 게이지를
    // 다시 채워 끝없이 이어진다(막기 전 실측 환수율 387%). 발동 뒤 쌓인 칸은
    // 다음 스핀으로 넘어간다.
    if (chargeLeft < PHARAOH.charge.capacity || chargeFired > 0) continue;
    // 게이지가 꽉 찼다. 와일드가 내려앉고 연쇄는 끊기지 않고 이어진다.
    chargeLeft = 0;
    chargeFired += 1;
    const dropped = dropWilds(grid, PHARAOH.charge.wilds);
    steps.push({ grid: cloneGrid(grid), charge: dropped.cells, nextGrid: dropped.grid });
    grid = dropped.grid;
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
    charge: chargeLeft,
    chargeFired,
    // 연쇄가 기준 단계에 닿으면 잭팟 픽 보너스가 열린다.
    jackpot: { hit: chain >= PHARAOH.jackpotChain },
  };
}
