// 화투: 5릴 2행에 깔린 카드 10장을 한 손으로 보고 족보를 센다.
// DOM을 참조하지 않는 순수 함수만 둔다. 스톱과 고 단계만 받으면 결과가 결정되므로
// 밸런스 계산기가 게임과 똑같은 함수를 그대로 호출한다.
//
// 줄도 위치도 보지 않는다. 심볼의 "개수"만 본다. 그래서 환수율이 해석적으로 정확히
// 계산되고(tools/hwatu-rtp.mjs), 배당표를 실측 오차 없이 맞출 수 있다.

import { HWATU } from './config.js';

const { gwang, rain, godori, yeol, tti, pi } = HWATU.groups;
const HAND_BY_KEY = Object.fromEntries(HWATU.hands.map((hand) => [hand.key, hand]));
const MAX_GO = HWATU.go.multipliers.length - 1;

export function buildHwatuGrid(stops) {
  return HWATU.strips.map((strip, reel) =>
    Array.from({ length: HWATU.rows }, (_, row) => strip[(stops[reel] + row) % strip.length]),
  );
}

// 심볼별 장수. 족보 판정이 보는 유일한 값이다.
export function countCards(grid) {
  const counts = {};
  for (const column of grid) {
    for (const symbol of column) counts[symbol] = (counts[symbol] ?? 0) + 1;
  }
  return counts;
}

function sumOf(counts, keys) {
  return keys.reduce((total, key) => total + (counts[key] ?? 0), 0);
}

/**
 * 개수만으로 성립한 족보 키를 고른다. 배당을 보지 않으므로 이 함수는
 * 배당표를 바꿔도 결과가 같다 — 환수율이 배당에 선형인 근거다.
 * @param {Record<string, number>} counts
 * @returns {string[]}
 */
export function handKeysOf(counts) {
  const keys = [];

  // 광: 장수 구간이 배타적이라 하나만 걸린다. 비광이 섞이면 "비" 붙은 족보가 된다.
  const gwangCount = sumOf(counts, gwang);
  const hasRain = (counts[rain] ?? 0) > 0;
  const band = gwangCount >= 5 ? 5 : gwangCount === 4 ? 4 : gwangCount === 3 ? 3 : 0;
  if (band > 0) keys.push(hasRain ? `bi${band}` : `gwang${band}`);

  // 고도리: 매조·기러기·사슴 세 종류가 다 있어야 한다.
  if (godori.every((key) => (counts[key] ?? 0) > 0)) keys.push('godori');

  // 단 세 가지는 각각 석 장부터. 서로 겹쳐 걸릴 수 있다.
  if ((counts.hongdan ?? 0) >= 3) keys.push('hongdan');
  if ((counts.cheongdan ?? 0) >= 3) keys.push('cheongdan');
  if ((counts.chodan ?? 0) >= 3) keys.push('chodan');

  // 열끗·띠·피는 장수 구간. 상한을 넘으면 맨 위 구간으로 묶인다.
  const yeolCount = sumOf(counts, yeol);
  if (yeolCount >= 7) keys.push('yeol7');
  else if (yeolCount === 6) keys.push('yeol6');
  else if (yeolCount === 5) keys.push('yeol5');

  const ttiCount = sumOf(counts, tti);
  if (ttiCount >= 7) keys.push('tti7');
  else if (ttiCount === 6) keys.push('tti6');
  else if (ttiCount === 5) keys.push('tti5');

  const piCount = sumOf(counts, pi);
  if (piCount >= 8) keys.push('pi8');
  else if (piCount === 7) keys.push('pi7');
  else if (piCount === 6) keys.push('pi6');

  return keys;
}

// 족보 하나가 가리키는 칸. 배너를 띄울 때 그 칸만 밝히려고 함께 돌려준다.
const HAND_CELLS = {
  gwang5: gwang, bi5: gwang, gwang4: gwang, bi4: gwang, gwang3: gwang, bi3: gwang,
  godori,
  hongdan: ['hongdan'], cheongdan: ['cheongdan'], chodan: ['chodan'],
  yeol7: yeol, yeol6: yeol, yeol5: yeol,
  tti7: tti, tti6: tti, tti5: tti,
  pi8: pi, pi7: pi, pi6: pi,
};

function cellsOf(grid, symbols) {
  const cells = [];
  grid.forEach((column, reel) => {
    column.forEach((symbol, row) => {
      if (symbols.includes(symbol)) cells.push({ reel, row });
    });
  });
  return cells;
}

/**
 * 성립한 족보를 모두 돌려준다. 배당은 더해서 지급한다.
 * @param {string[][]} grid
 */
export function evaluateHwatu(grid) {
  const counts = countCards(grid);
  return handKeysOf(counts).map((key) => ({
    key,
    label: HAND_BY_KEY[key].label,
    pay: HAND_BY_KEY[key].pay,
    cells: cellsOf(grid, HAND_CELLS[key]),
  }));
}

// 스핀에 들어갈 때의 고 단계로 곱한다. 나가는 값이 아니라 들어오는 값을 쓰는 이유는
// 정상분포 계산을 위해서다(tools/hwatu-rtp.mjs).
export function goMultiplier(go) {
  return HWATU.go.multipliers[Math.min(go, MAX_GO)];
}

// 당첨이면 한 단계 올리고, 꽝이면 0으로 되돌린다.
export function nextGo(go, won) {
  return won ? Math.min(go + 1, MAX_GO) : 0;
}

/**
 * 스핀 1회. 결과 전체가 여기서 확정된다.
 * @param {{stops: number[], totalBet: number, go: number}} input
 */
export function spinHwatu({ stops, totalBet, go = 0 }) {
  const grid = buildHwatuGrid(stops);
  const hands = evaluateHwatu(grid);
  const payMultiple = hands.reduce((sum, hand) => sum + hand.pay, 0);
  const goMultiple = goMultiplier(go);

  return {
    grid,
    hands,
    counts: countCards(grid),
    payMultiple,
    go,
    goMultiple,
    nextGo: nextGo(go, payMultiple > 0),
    totalBet,
    totalWin: Math.round(payMultiple * goMultiple * totalBet),
  };
}
