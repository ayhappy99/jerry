// 복주머니(5x5 클러스터)의 환수율을 재고, 필수 적중 잭팟 기여를 해석적으로 더한다.
//   node tools/cluster-sim.mjs 2000000
//
// 클러스터 판정은 격자 전체 모양에 의존해 전수 열거가 불가능하다(8^25 = 3.8e22).
// 그래서 클러스터 몫만 몬테카를로로 재고 표준오차를 함께 기록한다.
// 잭팟은 적립과 지급이 모두 확정적이라 정확히 계산된다.
//
// 판정은 js/cluster.js를 그대로 호출하므로 게임과 계산기가 어긋날 수 없다.

import { POUCH, POUCH_JACKPOT } from '../js/config.js';
import { evaluateClusters, payBand } from '../js/cluster.js';
import { buildGrid, drawStops } from '../js/rng.js';

const TIER_KEYS = Object.keys(POUCH_JACKPOT.tiers);
const REF_BET = 200000;

// 등급 t의 기여 = 적립률 × 분배비율 × (시드 + 천장) / (천장 − 시드)
// 적립분은 전액 되돌아오고 시드만큼이 공짜로 얹히기 때문이다.
export function jackpotRtp() {
  const rows = TIER_KEYS.map((key) => {
    const tier = POUCH_JACKPOT.tiers[key];
    const rtp =
      POUCH_JACKPOT.contribRate *
      tier.contribShare *
      ((tier.seed + tier.mustHitBy) / (tier.mustHitBy - tier.seed));
    const perSpin = POUCH_JACKPOT.contribRate * tier.contribShare * REF_BET;
    const cycle = ((tier.seed + tier.mustHitBy) / 2 - tier.seed) / perSpin;
    return { key, label: tier.label, rtp, cycle, avgPay: (tier.seed + tier.mustHitBy) / 2 };
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

  for (let i = 0; i < spins; i += 1) {
    const grid = buildGrid(POUCH.strips, drawStops(POUCH.strips), POUCH.rows);
    const wins = evaluateClusters(grid);
    if (wins.length === 0) continue;
    hits += 1;
    let pay = 0;
    for (const win of wins) {
      pay += win.pay;
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
  };
}

const pct = (v) => `${(v * 100).toFixed(2)}%`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const spins = Number(process.argv[2] ?? 500000);
  const jp = jackpotRtp();
  const cl = measureCluster(spins);

  console.log(`복주머니 (5x5 클러스터) · ${spins.toLocaleString()} 스핀`);
  console.log(`  스트립        ${POUCH.strips.map((s) => s.length).join('/')}`);
  console.log(`  클러스터      ${pct(cl.rtp)}  (표준오차 ±${pct(cl.stderr)})`);
  console.log(`  잭팟          ${pct(jp.total)}  (해석적, 오차 없음)`);
  console.log(`  합계          ${pct(cl.rtp + jp.total)}`);
  console.log('');
  console.log(`  적중률        ${pct(cl.hitRate)}`);
  console.log(`  1회 최대      ${cl.maxPay.toFixed(1)}배`);
  console.log('');
  console.log('  등급별 잭팟');
  for (const row of jp.rows) {
    console.log(
      `    ${row.label.padEnd(6)} ${pct(row.rtp)} · 평균 ${Math.round(row.cycle).toLocaleString()}스핀마다 ` +
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
