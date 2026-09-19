// 파라오의 문 몬테카를로 시뮬레이터 (개발용).
//   node tools/cascade-sim.mjs [스핀 수]
// 캐스케이딩은 연쇄 기대값이 그리드 상태에 의존해 해석적 계산이 불가능하다.
// 그래서 이 게임만은 몬테카를로로 측정하고 표준오차를 함께 출력한다.

import { BETS, JACKPOT_CONTRIB_RATE, PHARAOH } from '../js/config.js';
import { spinCascade } from '../js/cascade.js';
import { drawStops } from '../js/rng.js';

const spins = Number(process.argv[2] ?? 200000);
const totalBet = BETS[2] * PHARAOH.betUnits;

export function simulate(count) {
  let wagered = 0;
  let won = 0;
  let sumSq = 0;
  let hits = 0;
  let freeTriggers = 0;
  let freeSpinsPlayed = 0;
  let retriggers = 0;
  let jackpotTriggers = 0;
  let best = 0;
  const chains = [];

  const play = (freeSpin) => {
    const result = spinCascade({ stops: drawStops(PHARAOH.strips), totalBet, freeSpin });
    chains[result.chain] = (chains[result.chain] ?? 0) + 1;
    if (result.jackpot.hit) jackpotTriggers += 1;
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
  // 스핀당 수익률의 표준편차로 평균의 표준오차를 구한다
  const variance = sumSq / count - rtp ** 2;
  return {
    rtp,
    stderr: Math.sqrt(Math.max(variance, 0) / count),
    hitRate: hits / count,
    freeTriggerRate: freeTriggers / count,
    freeSpinsPerSpin: freeSpinsPlayed / count,
    retriggerRate: freeSpinsPlayed === 0 ? 0 : retriggers / freeSpinsPlayed,
    jackpotRate: jackpotTriggers / count,
    bestMultiple: best / totalBet,
    chains,
    count,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = simulate(spins);
  const pct = (v) => `${(v * 100).toFixed(2)}%`;
  console.log(`파라오의 문 · ${spins.toLocaleString()} 스핀 / 총 베팅 ${totalBet.toLocaleString()}`);
  console.log(`  기본 RTP     ${pct(r.rtp)}  (표준오차 ±${(r.stderr * 100).toFixed(2)}%p, 95% 신뢰구간 ${pct(r.rtp - 1.96 * r.stderr)} ~ ${pct(r.rtp + 1.96 * r.stderr)})`);
  console.log(`  잭팟 적립 포함 ${pct(r.rtp + JACKPOT_CONTRIB_RATE)}  (목표 94~96%)`);
  console.log(`  적중률       ${pct(r.hitRate)}`);
  console.log(`  프리스핀 발동 ${pct(r.freeTriggerRate)} (1/${Math.round(1 / r.freeTriggerRate)}), 스핀당 ${r.freeSpinsPerSpin.toFixed(3)}회, 리트리거 ${pct(r.retriggerRate)}`);
  console.log(`  잭팟 트리거(연쇄 ${PHARAOH.jackpotChain}단) ${pct(r.jackpotRate)} (1/${Math.round(1 / r.jackpotRate)})`);
  console.log(`  최고 당첨    ${r.bestMultiple.toFixed(0)}x`);
  console.log('  연쇄 분포:');
  r.chains.forEach((n, chain) => {
    if (n !== undefined) console.log(`    ${chain}단 ${pct(n / (r.count + r.freeSpinsPerSpin * r.count))}`);
  });
}
