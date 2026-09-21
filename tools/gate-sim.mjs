// 용문 몬테카를로 시뮬레이터 (개발용).
//   node tools/gate-sim.mjs [스핀 수]
// gate-solve.mjs는 계수를 재기 위해 스핀 루프를 다시 구현한다. 이 파일은 게임이 실제로
// 호출하는 spinGate를 그대로 돌려 그 계수 계산이 맞았는지 독립으로 검증한다.

import { BETS, GATE } from '../js/config.js';
import { spinGate, drawHeights } from '../js/gate.js';
import { drawStops } from '../js/rng.js';

const spins = Number(process.argv[2] ?? 300000);
const totalBet = BETS[2] * GATE.betUnits;

export function simulate(count) {
  let wagered = 0;
  let won = 0;
  let sumSq = 0;
  let hits = 0;
  let freeTriggers = 0;
  let freeSpinsPlayed = 0;
  let retriggers = 0;
  let best = 0;
  const chains = [];
  const waysBuckets = { '<100': 0, '100+': 0, '1k+': 0, '10k+': 0, '50k+': 0 };
  let played = 0;

  const play = (freeSpin) => {
    const result = spinGate({ stops: drawStops(GATE.strips), heights: drawHeights(), totalBet, freeSpin });
    chains[result.chain] = (chains[result.chain] ?? 0) + 1;
    const w = result.ways;
    const key = w >= 50000 ? '50k+' : w >= 10000 ? '10k+' : w >= 1000 ? '1k+' : w >= 100 ? '100+' : '<100';
    waysBuckets[key] += 1;
    played += 1;
    return result;
  };

  for (let i = 0; i < count; i += 1) {
    wagered += totalBet;
    let result = play(false);
    let spinWin = result.totalWin;

    let free = result.freeSpinsAwarded;
    if (free > 0) freeTriggers += 1;
    while (free > 0) {
      free -= 1;
      freeSpinsPlayed += 1;
      result = play(true);
      spinWin += result.totalWin;
      if (result.freeSpinsAwarded > 0) {
        retriggers += 1;
        free += result.freeSpinsAwarded;
      }
    }

    won += spinWin;
    sumSq += (spinWin / totalBet) ** 2;
    if (spinWin > 0) hits += 1;
    best = Math.max(best, spinWin);
  }

  const rtp = won / wagered;
  const variance = sumSq / count - rtp ** 2;
  return {
    rtp,
    stderr: Math.sqrt(Math.max(variance, 0) / count),
    hitRate: hits / played,
    freeTriggerRate: freeTriggers / count,
    freeSpinsPerSpin: freeSpinsPlayed / count,
    retriggerRate: freeSpinsPlayed === 0 ? 0 : retriggers / freeSpinsPlayed,
    bestMultiple: best / totalBet,
    waysBuckets,
    chains,
    played,
    count,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = simulate(spins);
  const pct = (v) => `${(v * 100).toFixed(2)}%`;
  console.log(`용문 · ${spins.toLocaleString()} 스핀 / 총 베팅 ${totalBet.toLocaleString()}`);
  console.log(`  RTP          ${pct(r.rtp)}  (표준오차 ±${(r.stderr * 100).toFixed(2)}%p, 95% 신뢰구간 ${pct(r.rtp - 1.96 * r.stderr)} ~ ${pct(r.rtp + 1.96 * r.stderr)})`);
  console.log(`  적중률       ${pct(r.hitRate)}`);
  console.log(`  프리스핀 발동 ${pct(r.freeTriggerRate)} (1/${Math.round(1 / r.freeTriggerRate)}), 스핀당 ${r.freeSpinsPerSpin.toFixed(3)}회, 리트리거 ${pct(r.retriggerRate)}`);
  console.log(`  최고 당첨    ${r.bestMultiple.toFixed(0)}x`);
  console.log(`  ways 분포    ${Object.entries(r.waysBuckets).map(([k, v]) => `${k} ${pct(v / r.played)}`).join(' · ')}`);
  console.log('  연쇄 분포:');
  r.chains.forEach((n, chain) => {
    if (n !== undefined) console.log(`    ${chain}단 ${pct(n / r.played)}`);
  });
}
