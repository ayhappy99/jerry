// 금구슬: 격자 위에 떨어져 그 스핀의 당첨 합에 배수를 곱한다.
// DOM을 참조하지 않는 순수 함수만 둔다.
//
// 구슬은 릴 심볼이 아니다. 심볼로 넣으면 스트립 구성이 바뀌어 덩어리가 생기는 확률까지
// 흔들리고, 그러면 덩어리 배당을 처음부터 다시 풀어야 한다. 격자 위에 얹는 층으로 두면
// 덩어리 확률은 그대로이고 배당만 배수 기대값으로 나누면 환수율이 정확히 유지된다.

import { BEADS } from './config.js';

const COUNT_TOTAL = BEADS.counts.reduce((sum, entry) => sum + entry.weight, 0);
const VALUE_TOTAL = BEADS.values.reduce((sum, entry) => sum + entry.weight, 0);

function drawWeighted(table, total) {
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll < 0) return entry;
  }
  return table[table.length - 1];
}

// 이번 스핀에 떨어질 구슬 개수
function drawCount() {
  return drawWeighted(BEADS.counts, COUNT_TOTAL).count;
}

// 구슬 하나의 배수
function drawMult() {
  return drawWeighted(BEADS.values, VALUE_TOTAL).mult;
}

/**
 * 구슬을 뽑는다. 서로 다른 칸에 떨어지고, 개수가 0이면 빈 배열이다.
 * @param {{reels: number, rows: number}} spec
 */
export function drawBeads({ reels, rows }) {
  const count = Math.min(drawCount(), reels * rows);
  const cells = [];
  for (let reel = 0; reel < reels; reel += 1) {
    for (let row = 0; row < rows; row += 1) cells.push({ reel, row });
  }
  // 앞에서 count개만 필요하므로 그만큼만 섞는다
  for (let i = 0; i < count; i += 1) {
    const pick = i + Math.floor(Math.random() * (cells.length - i));
    [cells[i], cells[pick]] = [cells[pick], cells[i]];
  }
  return cells.slice(0, count).map((cell) => ({ ...cell, mult: drawMult() }));
}

/**
 * 구슬이 당첨 합에 곱할 배수. 구슬이 없으면 1이다.
 * 여러 개면 배수를 더한다(곱하지 않는다). 곱하면 두 개만으로도 상한이 터진다.
 */
export function beadMultiple(beads) {
  if (beads.length === 0) return 1;
  return beads.reduce((sum, bead) => sum + bead.mult, 0);
}

// 구슬이 곱하는 배수의 기대값. 배당을 이 값으로 나누면 환수율이 유지된다.
// 구슬 등장은 당첨과 독립이므로 조건부 기대값도 같다.
export function beadExpectation() {
  const meanMult =
    BEADS.values.reduce((sum, entry) => sum + entry.mult * entry.weight, 0) / VALUE_TOTAL;
  return BEADS.counts.reduce((sum, entry) => {
    const applied = entry.count === 0 ? 1 : entry.count * meanMult;
    return sum + (entry.weight / COUNT_TOTAL) * applied;
  }, 0);
}
