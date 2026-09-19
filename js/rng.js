// 난수와 릴 스톱 결정만 담당한다. 여기서 결과가 확정되고, 연출은 이 결과를 따라갈 뿐이다.

import { JACKPOT_TIERS, JACKPOT_TIER_KEYS, PICK_MATCH, PICK_TILES } from './config.js';

export function randomInt(max) {
  return Math.floor(Math.random() * max);
}

// 릴별 스톱 인덱스. 스핀 시작 시점에 여기서 결과가 전부 확정된다.
export function drawStops(strips) {
  return strips.map((strip) => randomInt(strip.length));
}

// 스톱 인덱스에서 보이는 그리드를 만든다. grid[reel][row]
export function buildGrid(strips, stops, rows) {
  return strips.map((strip, reel) =>
    Array.from({ length: rows }, (_, row) => strip[(stops[reel] + row) % strip.length]),
  );
}

// 잭팟 티어는 여기서 확정된다. 픽 보너스의 타일 배치는 이 결과를 보여주는 연출일 뿐이다.
export function drawJackpotTier() {
  const total = JACKPOT_TIER_KEYS.reduce((sum, key) => sum + JACKPOT_TIERS[key].pickWeight, 0);
  let roll = Math.random() * total;
  for (const key of JACKPOT_TIER_KEYS) {
    roll -= JACKPOT_TIERS[key].pickWeight;
    if (roll < 0) return key;
  }
  return JACKPOT_TIER_KEYS[JACKPOT_TIER_KEYS.length - 1];
}

// 확정된 티어만 3개, 나머지 티어는 2개씩 넣고 섞는다.
export function buildPickTiles(wonTier) {
  const others = JACKPOT_TIER_KEYS.filter((key) => key !== wonTier);
  const perOther = (PICK_TILES - PICK_MATCH) / others.length;
  const tiles = [
    ...Array.from({ length: PICK_MATCH }, () => wonTier),
    ...others.flatMap((key) => Array.from({ length: perOther }, () => key)),
  ];
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}
