// 골드 코인 홀드 앤 스핀. DOM을 참조하지 않는 순수 로직만 둔다.
// 그래서 밸런스 시뮬레이터가 게임과 똑같은 함수를 그대로 호출한다.
//
// 한 판이 이 파일에서 전부 확정되고, 연출은 steps를 순서대로 재생하기만 한다.

import { HOLD } from './config.js';
import { randomInt } from './rng.js';

const VALUE_TOTAL = HOLD.values.reduce((sum, entry) => sum + entry.weight, 0);

// 코인 값 하나를 가중치대로 뽑는다.
function drawValue() {
  let roll = Math.random() * VALUE_TOTAL;
  for (const entry of HOLD.values) {
    roll -= entry.weight;
    if (roll < 0) return entry.mult;
  }
  return HOLD.values[HOLD.values.length - 1].mult;
}

// 그리드에서 코인이 놓인 칸을 찾는다.
export function findCoins(grid) {
  const cells = [];
  grid.forEach((column, reel) => {
    column.forEach((symbol, row) => {
      if (symbol === HOLD.symbol) cells.push({ reel, row });
    });
  });
  return cells;
}

export function coinCount(grid) {
  return findCoins(grid).length;
}

export function triggered(grid) {
  return coinCount(grid) >= HOLD.trigger;
}

function cellKey({ reel, row }) {
  return `${reel}:${row}`;
}

// 아직 코인이 없는 칸 목록
function emptyCells(reels, rows, held) {
  const taken = new Set(held.map(cellKey));
  const cells = [];
  for (let reel = 0; reel < reels; reel += 1) {
    for (let row = 0; row < rows; row += 1) {
      if (!taken.has(`${reel}:${row}`)) cells.push({ reel, row });
    }
  }
  return cells;
}

/**
 * 홀드 앤 스핀 한 판.
 * 트리거로 나온 코인을 고정한 뒤, 빈 칸만 반복해서 돌린다.
 * 새 코인이 하나라도 붙으면 남은 횟수가 HOLD.respins로 초기화된다.
 * @param {{grid: string[][], reels: number, rows: number}} input 트리거가 확정된 그리드
 */
export function spinHold({ grid, reels, rows }) {
  const held = findCoins(grid).map((cell) => ({ ...cell, mult: drawValue() }));
  const total = reels * rows;
  const steps = [];
  let respinsLeft = HOLD.respins;

  while (respinsLeft > 0 && held.length < total) {
    const added = [];
    for (const cell of emptyCells(reels, rows, held)) {
      if (Math.random() < HOLD.cellOdds) added.push({ ...cell, mult: drawValue() });
    }
    held.push(...added);
    // 하나라도 붙으면 횟수가 초기화되고, 없으면 하나 줄어든다.
    respinsLeft = added.length > 0 ? HOLD.respins : respinsLeft - 1;
    steps.push({ added, respinsLeft, held: held.length });
  }

  return {
    coins: held,
    steps,
    // 총 베팅 배수의 합
    payMultiple: held.reduce((sum, coin) => sum + coin.mult, 0),
    full: held.length >= total,
    trigger: findCoins(grid).length,
  };
}

// 코인 하나를 무작위 칸에 놓는다. 시뮬레이터가 트리거 그리드를 만들 때 쓴다.
export function randomCell(reels, rows) {
  return { reel: randomInt(reels), row: randomInt(rows) };
}
