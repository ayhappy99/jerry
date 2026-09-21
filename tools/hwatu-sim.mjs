// 화투 몬테카를로 시뮬레이터 (개발용).
//   node tools/hwatu-sim.mjs [스핀 수]
// hwatu-rtp.mjs가 해석적으로 낸 값을 게임이 실제로 호출하는 spinHwatu로 교차 검증한다.
// 고(GO) 단계를 스핀에 물려 돌리므로 정상분포 가정까지 함께 확인된다.

import { BETS, HWATU } from '../js/config.js';
import { spinHwatu } from '../js/hwatu.js';
import { drawStops } from '../js/rng.js';

const spins = Number(process.argv[2] ?? 2000000);
const totalBet = BETS[2] * HWATU.betUnits;

export function simulate(count) {
  let wagered = 0;
  let won = 0;
  let sumSq = 0;
  let hits = 0;
  let best = 0;
  let go = 0;
  const goSeen = new Array(HWATU.go.multipliers.length).fill(0);
  const handCount = Object.fromEntries(HWATU.hands.map((hand) => [hand.key, 0]));

  for (let i = 0; i < count; i += 1) {
    goSeen[go] += 1;
    const result = spinHwatu({ stops: drawStops(HWATU.strips), totalBet, go });
    wagered += totalBet;
    won += result.totalWin;
    sumSq += (result.totalWin / totalBet) ** 2;
    if (result.totalWin > 0) hits += 1;
    best = Math.max(best, result.totalWin);
    for (const hand of result.hands) handCount[hand.key] += 1;
    go = result.nextGo;
  }

  const rtp = won / wagered;
  const variance = sumSq / count - rtp ** 2;
  return {
    rtp,
    stderr: Math.sqrt(Math.max(variance, 0) / count),
    hitRate: hits / count,
    bestMultiple: best / totalBet,
    goSeen: goSeen.map((n) => n / count),
    handRate: Object.fromEntries(Object.entries(handCount).map(([k, n]) => [k, n / count])),
    count,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = simulate(spins);
  const pct = (v) => `${(v * 100).toFixed(4)}%`;
  console.log(`화투 · ${spins.toLocaleString()} 스핀 / 총 베팅 ${totalBet.toLocaleString()}`);
  console.log(`  RTP          ${pct(r.rtp)}  (표준오차 ±${(r.stderr * 100).toFixed(3)}%p, 95% 신뢰구간 ${pct(r.rtp - 1.96 * r.stderr)} ~ ${pct(r.rtp + 1.96 * r.stderr)})`);
  console.log(`  적중률       ${pct(r.hitRate)}`);
  console.log(`  고 분포      ${r.goSeen.map((v, k) => `${k}고 ${pct(v)}`).join(' · ')}`);
  console.log(`  최고 당첨    ${r.bestMultiple.toFixed(1)}x`);
  console.log('  족보 빈도:');
  for (const hand of HWATU.hands) {
    const p = r.handRate[hand.key];
    console.log(`    ${hand.label.padEnd(12, ' ')} ${pct(p).padStart(10)} ${(p === 0 ? '-' : `1/${Math.round(1 / p).toLocaleString()}`).padStart(12)}`);
  }
}
