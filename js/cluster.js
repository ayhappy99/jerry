// 복주머니: 5x5 클러스터 판정과 필수 적중 잭팟.
// DOM을 참조하지 않는 순수 함수만 둔다. 그래서 밸런스 시뮬레이터가 게임과
// 똑같은 함수를 그대로 호출한다.

import { POUCH, POUCH_JACKPOT } from './config.js';
import { buildGrid } from './rng.js';

const PAY_SYMBOLS = Object.keys(POUCH.pays);
const TIER_KEYS = Object.keys(POUCH_JACKPOT.tiers);

// 덩어리 크기를 배당 구간으로 바꾼다. 구간은 config의 sizeBands가 정한다.
export function payBand(size) {
  const bands = POUCH.sizeBands;
  let band = 0;
  for (const value of bands) {
    if (size >= value) band = value;
  }
  return band;
}

function neighbours(reel, row) {
  return [
    { reel: reel - 1, row },
    { reel: reel + 1, row },
    { reel, row: row - 1 },
    { reel, row: row + 1 },
  ].filter((cell) => cell.reel >= 0 && cell.reel < POUCH.reels && cell.row >= 0 && cell.row < POUCH.rows);
}

/**
 * 상하좌우로 붙은 같은 심볼 덩어리를 찾는다.
 * 복주머니(와일드)는 어느 덩어리에도 붙어 떨어진 두 덩어리를 하나로 이어 준다.
 * 와일드만으로 이뤄진 덩어리는 배당하지 않는다(시작점을 와일드가 아닌 칸으로만 잡는다).
 */
export function evaluateClusters(grid) {
  const wins = [];

  for (const symbol of PAY_SYMBOLS) {
    const seen = new Set();

    for (let reel = 0; reel < POUCH.reels; reel += 1) {
      for (let row = 0; row < POUCH.rows; row += 1) {
        if (grid[reel][row] !== symbol) continue;
        const key = `${reel}:${row}`;
        if (seen.has(key)) continue;

        // 너비 우선으로 퍼뜨린다. 같은 심볼이거나 와일드면 같은 덩어리다.
        const group = [];
        const queue = [{ reel, row }];
        seen.add(key);
        while (queue.length > 0) {
          const cell = queue.pop();
          group.push(cell);
          for (const next of neighbours(cell.reel, cell.row)) {
            const nextKey = `${next.reel}:${next.row}`;
            if (seen.has(nextKey)) continue;
            const value = grid[next.reel][next.row];
            if (value !== symbol && value !== POUCH.wild) continue;
            seen.add(nextKey);
            queue.push(next);
          }
        }

        if (group.length < POUCH.minCluster) continue;
        wins.push({
          symbol,
          size: group.length,
          cells: group,
          pay: POUCH.pays[symbol][payBand(group.length)],
        });
      }
    }
  }

  return wins;
}

/**
 * 스핀 1회. 클러스터 판정만 한다. 잭팟은 적립 결과로 따로 정해진다.
 * @param {{stops: number[], totalBet: number}} input
 */
export function spinCluster({ stops, totalBet }) {
  const grid = buildGrid(POUCH.strips, stops, POUCH.rows);
  const wins = evaluateClusters(grid);
  const payMultiple = wins.reduce((sum, win) => sum + win.pay, 0);
  return {
    grid,
    wins,
    payMultiple,
    totalBet,
    totalWin: Math.round(payMultiple * totalBet),
  };
}

// ── 필수 적중 잭팟 ────────────────────────

// 등급마다 "터지는 지점"을 뽑는다. 시드와 반드시터지는금액 사이의 균등분포다.
export function drawHitPoint(tierKey) {
  const tier = POUCH_JACKPOT.tiers[tierKey];
  return tier.seed + Math.random() * (tier.mustHitBy - tier.seed);
}

export function seedPouchPools() {
  return Object.fromEntries(TIER_KEYS.map((key) => [key, POUCH_JACKPOT.tiers[key].seed]));
}

export function seedPouchHitPoints() {
  return Object.fromEntries(TIER_KEYS.map((key) => [key, drawHitPoint(key)]));
}

/**
 * 스핀 1회의 적립과 적중 판정. 풀이 터지는 지점에 닿으면 그 등급이 터진다.
 * 상태를 바꾸지 않고 다음 상태를 만들어 돌려준다.
 * @param {{pools: object, hitPoints: object, totalBet: number}} input
 */
export function contributePouch({ pools, hitPoints, totalBet }) {
  const nextPools = { ...pools };
  const nextHitPoints = { ...hitPoints };
  const hits = [];

  for (const key of TIER_KEYS) {
    const tier = POUCH_JACKPOT.tiers[key];
    nextPools[key] += totalBet * POUCH_JACKPOT.contribRate * tier.contribShare;
    if (nextPools[key] < hitPoints[key]) continue;
    // 터졌다. 적립된 전액을 주고 시드로 되돌리며 다음 터질 지점을 새로 뽑는다.
    hits.push({ tier: key, amount: nextPools[key] });
    nextPools[key] = tier.seed;
    nextHitPoints[key] = drawHitPoint(key);
  }

  return { pools: nextPools, hitPoints: nextHitPoints, hits };
}
