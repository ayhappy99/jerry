// 복주머니(5x5 클러스터)의 환수율을 재고, 필수 적중 잭팟 기여를 해석적으로 더한다.
//   node tools/cluster-sim.mjs 2000000
//
// 클러스터 판정은 격자 전체 모양에 의존해 전수 열거가 불가능하다(8^25 = 3.8e22).
// 그래서 클러스터 몫만 몬테카를로로 재고 표준오차를 함께 기록한다.
// 잭팟은 적립과 지급이 모두 확정적이라 정확히 계산된다.
//
// 판정은 js/cluster.js를 그대로 호출하므로 게임과 계산기가 어긋날 수 없다.

import { POUCH, POUCH_JACKPOT, POUCH_TIER_KEYS } from '../js/config.js';
import { beadExpectation, drawBeads } from '../js/bead.js';
import { countPouches, evaluateClusters, payBand, pouchFeed } from '../js/cluster.js';
import { buildGrid, drawStops } from '../js/rng.js';

const REF_BET = 200000;

// 등급 t의 기여 = P(그 주머니를 채우는 심볼 개수) × rate × (시드 + 천장) / (천장 − 시드)
// 적립분은 전액 되돌아오고 시드만큼이 공짜로 얹히기 때문이다.
// 심볼 개수 확률만 실측이고 나머지는 해석적이다.
export function jackpotRtp(feedProb) {
  const rows = POUCH_JACKPOT.feed.map((entry, index) => {
    const tier = POUCH_JACKPOT.tiers[entry.tier];
    const p = feedProb[entry.tier] ?? 0;
    const rtp = p * entry.rate * ((tier.seed + tier.mustHitBy) / (tier.mustHitBy - tier.seed));
    const perSpin = p * entry.rate * REF_BET;
    const cycle = perSpin === 0 ? Infinity : ((tier.seed + tier.mustHitBy) / 2 - tier.seed) / perSpin;
    return {
      // feed는 개수가 큰 것부터 먼저 걸리므로, 맨 위만 "이상"이고 나머지는 정확히 그 개수다
      key: entry.tier, label: tier.label, count: entry.count, p, rate: entry.rate,
      range: index === 0 ? `${entry.count}개+` : `${entry.count}개`,
      rtp, cycle, avgPay: (tier.seed + tier.mustHitBy) / 2,
    };
  });
  return { rows, total: rows.reduce((sum, row) => sum + row.rtp, 0) };
}

export function measureCluster(spins) {
  let paySum = 0;
  let paySquares = 0;
  let hits = 0;
  let maxPay = 0;
  const bySymbol = Object.fromEntries(Object.keys(POUCH.pays).map((key) => [key, 0]));
  const bySize = new Map();
  // 어느 주머니가 몇 번 채워졌는지. 잭팟 환수율은 이 확률에서 나온다.
  const feedCount = Object.fromEntries(POUCH_TIER_KEYS.map((key) => [key, 0]));
  let feedNone = 0;
  let beadSpins = 0;
  let beadApplied = 0;

  for (let i = 0; i < spins; i += 1) {
    const grid = buildGrid(POUCH.strips, drawStops(POUCH.strips), POUCH.rows);
    const feed = pouchFeed(countPouches(grid));
    if (feed === null) feedNone += 1;
    else feedCount[feed.tier] += 1;
    const beads = drawBeads({ reels: POUCH.reels, rows: POUCH.rows });
    if (beads.length > 0) beadSpins += 1;
    const wins = evaluateClusters(grid);
    if (wins.length === 0) continue;
    hits += 1;
    if (beads.length > 0) beadApplied += 1;
    // 구슬 배수는 덩어리 합 전체에 곱한다. 심볼별 기여는 배수 없는 값으로 남긴다.
    const beadMult = beads.reduce((sum, bead) => sum + bead.mult, 0) || 1;
    let pay = 0;
    for (const win of wins) {
      pay += win.pay * beadMult;
      bySymbol[win.symbol] += win.pay;
      const band = payBand(win.size);
      bySize.set(band, (bySize.get(band) ?? 0) + 1);
    }
    paySum += pay;
    paySquares += pay ** 2;
    if (pay > maxPay) maxPay = pay;
  }

  const rtp = paySum / spins;
  const variance = paySquares / spins - rtp ** 2;
  return {
    rtp,
    stderr: Math.sqrt(variance / spins),
    hitRate: hits / spins,
    maxPay,
    bySymbol,
    bySize,
    feedProb: Object.fromEntries(POUCH_TIER_KEYS.map((key) => [key, feedCount[key] / spins])),
    feedNoneProb: feedNone / spins,
    beadRate: beadSpins / spins,
    beadAppliedRate: beadApplied / spins,
  };
}

const pct = (v) => `${(v * 100).toFixed(2)}%`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const spins = Number(process.argv[2] ?? 500000);
  const cl = measureCluster(spins);
  const jp = jackpotRtp(cl.feedProb);

  console.log(`복주머니 (5x5 클러스터) · ${spins.toLocaleString()} 스핀`);
  console.log(`  스트립        ${POUCH.strips.map((s) => s.length).join('/')}`);
  console.log(`  클러스터      ${pct(cl.rtp)}  (표준오차 ±${pct(cl.stderr)})`);
  console.log(`  잭팟          ${pct(jp.total)}  (심볼 개수 확률만 실측, 나머지는 해석적)`);
  console.log(`  합계          ${pct(cl.rtp + jp.total)}`);
  console.log('');
  console.log(`  적중률        ${pct(cl.hitRate)}`);
  console.log(`  1회 최대      ${cl.maxPay.toFixed(1)}배`);
  console.log('');
  console.log(`  금구슬 등장 ${pct(cl.beadRate)} · 실제로 곱해진 스핀 ${pct(cl.beadAppliedRate)} · 배수 기대값 ${beadExpectation().toFixed(3)}`);
  console.log(`  아무 주머니도 안 채우는 스핀 ${pct(cl.feedNoneProb)}`);
  console.log('');
  console.log('  등급별 잭팟 (복주머니 심볼 개수가 주머니를 정한다)');
  for (const row of jp.rows) {
    console.log(
      `    ${row.label.padEnd(6)} 심볼 ${row.range.padEnd(6)} ${pct(row.p).padStart(7)} · 한 번에 ${(row.rate * 100).toFixed(1)}% 적립 ` +
      `· 기여 ${pct(row.rtp)} · 평균 ${Math.round(row.cycle).toLocaleString()}스핀마다 ` +
      `· 평균 지급 ${Math.round(row.avgPay).toLocaleString()}`,
    );
  }
  console.log('');
  console.log('  심볼별 기여');
  for (const [key, sum] of Object.entries(cl.bySymbol)) {
    console.log(`    ${key.padEnd(9)} ${pct(sum / spins)}`);
  }
  console.log('');
  console.log('  덩어리 크기 분포 (당첨 1건 기준)');
  const sizes = [...cl.bySize.entries()].sort((a, b) => a[0] - b[0]);
  const totalWins = sizes.reduce((sum, [, n]) => sum + n, 0);
  for (const [band, n] of sizes) {
    console.log(`    ${String(band).padStart(2)}칸+  ${pct(n / totalWins)}`);
  }
}
