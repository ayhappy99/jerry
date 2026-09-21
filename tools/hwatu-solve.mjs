// 화투 배당표를 목표 환수율에 맞춘다.
//   node tools/hwatu-solve.mjs [목표 RTP]
//
// 다른 게임의 솔버와 달리 실측이 없다. 족보 확률이 해석적으로 정확히 나오고
// 환수율은 배당에 선형이므로, 확률 벡터와 배당 벡터의 내적 하나가 곧 환수율이다.
// 남은 일은 "보기 좋은 값"으로 스냅하면서 사다리 순서를 지키는 것뿐이다.

import { HWATU } from '../js/config.js';
import { goFactor, handProbabilities, rtpOf } from './hwatu-rtp.mjs';

const TARGET = Number(process.argv[2] ?? 1.05);

// 배당의 모양(상대 비율)만 사람이 정한다. 절대값은 솔버가 목표에 맞춰 스케일한다.
// 고스톱의 점수 서열을 따르되 슬롯답게 위쪽을 크게 벌렸다.
const SHAPE = {
  gwang5: 6000, bi5: 1500,
  gwang4: 500, bi4: 130,
  gwang3: 60, bi3: 20,
  godori: 25,
  hongdan: 4, cheongdan: 4, chodan: 4,
  yeol7: 10, yeol6: 3.5, yeol5: 1,
  tti7: 9, tti6: 3, tti5: 0.8,
  pi8: 6, pi7: 2, pi6: 0.5,
};

// 단 세 가지는 확률이 1.8% 안에서 같다. 배당을 다르게 주면 근거 없이 달라 보이므로
// 하나의 변수로 묶어 항상 같은 값을 유지한다.
const DAN = ['hongdan', 'cheongdan', 'chodan'];
// 사다리 순서. 오른쪽이 왼쪽보다 반드시 커야 한다(같으면 구간을 나눈 뜻이 없다).
const LADDERS = [
  ['gwang3', 'gwang4', 'gwang5'],
  ['bi3', 'bi4', 'bi5'],
  ['bi3', 'gwang3'], ['bi4', 'gwang4'], ['bi5', 'gwang5'],
  ['yeol5', 'yeol6', 'yeol7'],
  ['tti5', 'tti6', 'tti7'],
  ['pi6', 'pi7', 'pi8'],
];

// 가장 싼 족보의 바닥. 이름 붙은 족보가 베팅의 6%를 주면 당첨이라 부르기 민망하다.
// 바닥을 올린 몫은 솔버가 위쪽 족보에서 가져온다.
const MIN_PAY = 0.2;

let NICE = [];
for (const mag of [0.1, 1, 10, 100]) {
  for (const step of [1, 1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8]) NICE.push(+(mag * step).toFixed(4));
}
// 배당 0은 허용하지 않는다. 족보 이름을 띄우고 0을 주면 당첨이라 부를 수 없다.
NICE = [...new Set(NICE.filter((n) => n >= MIN_PAY))].sort((a, b) => a - b);
const snap = (v) => NICE.reduce((best, n) => (Math.abs(n - v) < Math.abs(best - v) ? n : best), NICE[0]);

const ordered = (pays) => LADDERS.every((chain) => chain.every((key, i) => i === 0 || pays[key] > pays[chain[i - 1]]));

const { probability, hitRate, states, checksum } = handProbabilities();
const { pi, factor } = goFactor(hitRate);
const rtp = (pays) => rtpOf(probability, pays, factor).total;

const shapeRtp = rtp(SHAPE);
const scale = TARGET / shapeRtp;
const pct = (v) => `${(v * 100).toFixed(3)}%`;

console.log(`화투 배당표 솔버 (해석적)`);
console.log(`  개수 상태   ${states.toLocaleString()} (확률 합 ${checksum.toFixed(12)})`);
console.log(`  적중률      ${pct(hitRate)}`);
console.log(`  고 분포     ${pi.map((v, k) => `${k}고 ${pct(v)}`).join(' · ')}`);
console.log(`  고 계수     ${factor.toFixed(4)} → 배당 몫 예산 ${pct(TARGET / factor)}`);
console.log(`  모양 배당의 RTP ${pct(shapeRtp)} → 목표 ${pct(TARGET)} · 배율 ${scale.toFixed(5)}\n`);

// 스냅 후 그리디. 단 세 가지는 한 번에 같이 움직인다.
let best = Object.fromEntries(Object.entries(SHAPE).map(([key, value]) => [key, snap(value * scale)]));
for (const key of DAN) best[key] = best.hongdan;
let err = Math.abs(rtp(best) - TARGET);

const VARS = [...Object.keys(SHAPE).filter((key) => !DAN.includes(key)), 'dan'];
for (let pass = 0; pass < 60; pass += 1) {
  let improved = false;
  for (const name of VARS) {
    const keys = name === 'dan' ? DAN : [name];
    const idx = NICE.indexOf(best[keys[0]]);
    for (const step of [-1, 1]) {
      const next = NICE[idx + step];
      if (next === undefined) continue;
      const trial = { ...best };
      for (const key of keys) trial[key] = next;
      if (!ordered(trial)) continue;
      const e = Math.abs(rtp(trial) - TARGET);
      if (e < err - 1e-12) { best = trial; err = e; improved = true; }
    }
  }
  if (!improved) break;
}

const { base, total } = rtpOf(probability, best, factor);
console.log(`스냅 + 그리디 후 배당 몫 ${pct(base)} · 고 포함 ${pct(total)}\n`);
console.log('  족보              확률          1/N        배당      기여');
for (const hand of HWATU.hands) {
  const p = probability[hand.key];
  console.log(
    `  ${hand.label.padEnd(12, ' ')} ${pct(p).padStart(10)} ${`1/${Math.round(1 / p).toLocaleString()}`.padStart(12)} ` +
    `${String(best[hand.key]).padStart(8)} ${pct(p * best[hand.key] * factor).padStart(10)}`,
  );
}
console.log('\n  hands: [');
for (const hand of HWATU.hands) {
  console.log(`    { key: '${hand.key}', label: '${hand.label}', pay: ${best[hand.key]} },`);
}
console.log('  ],');
