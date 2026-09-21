// 화투 환수율 해석적 계산기. 몬테카를로 오차가 없다.
//   node tools/hwatu-rtp.mjs
//
// 족보 판정이 심볼의 "개수"에만 의존하므로, 릴별 2칸 창의 분포를 개수 벡터로 접어
// 5릴을 합성하면 모든 족보의 확률이 오차 없이 나온다. 스톱 조합은 648^5 = 114조지만
// 10장을 13종에 나누는 개수 벡터는 C(22,12) = 646,646가지가 상한이라 그쪽으로 접는다
// (실제 도달은 608,019가지). 확률 합이 1.000000000000으로 떨어지는 것이 검산이다.
//
// 고(GO) 배수도 정확히 더한다. 스핀에 들어갈 때의 단계로 곱하므로, 단계는
// "당첨이면 +1, 꽝이면 0" 마르코프 사슬이고 그 정상분포가 닫힌 형태로 나온다.

import { HWATU } from '../js/config.js';
import { handKeysOf } from '../js/hwatu.js';

const HAND_BY_KEY = Object.fromEntries(HWATU.hands.map((hand) => [hand.key, hand]));

const SYMS = HWATU.symbolOrder;
const INDEX = Object.fromEntries(SYMS.map((key, i) => [key, i]));

// 릴 하나의 2칸 창 분포. 스톱이 스트립 길이만큼 있고 모두 같은 확률이다.
function reelWindows(strip) {
  const windows = new Map();
  for (let stop = 0; stop < strip.length; stop += 1) {
    const vector = new Array(SYMS.length).fill(0);
    for (let row = 0; row < HWATU.rows; row += 1) {
      vector[INDEX[strip[(stop + row) % strip.length]]] += 1;
    }
    const key = vector.join(',');
    const found = windows.get(key);
    if (found === undefined) windows.set(key, { vector, weight: 1 });
    else found.weight += 1;
  }
  return [...windows.values()].map(({ vector, weight }) => ({ vector, p: weight / strip.length }));
}

// 릴을 하나씩 합성한다. 상태는 지금까지 깔린 카드의 개수 벡터다.
function countDistribution() {
  let states = new Map([[new Array(SYMS.length).fill(0).join(','), 1]]);
  for (const strip of HWATU.strips) {
    const windows = reelWindows(strip);
    const next = new Map();
    for (const [key, p] of states) {
      const base = key.split(',').map(Number);
      for (const win of windows) {
        const merged = base.map((n, i) => n + win.vector[i]).join(',');
        next.set(merged, (next.get(merged) ?? 0) + p * win.p);
      }
    }
    states = next;
  }
  return states;
}

// 족보별 확률. 개수 벡터 하나하나를 그대로 판정 함수에 넣는다.
export function handProbabilities() {
  const probability = Object.fromEntries(HWATU.hands.map((hand) => [hand.key, 0]));
  let hitRate = 0;
  let states = 0;
  let checksum = 0;
  // 배당 몫의 1·2차 모멘트와 이론 최대. 도달 가능한 상태를 다 훑으므로 전부 정확하다.
  let mean = 0;
  let meanSq = 0;
  let maxMultiple = 0;
  let maxKeys = [];

  for (const [key, p] of countDistribution()) {
    states += 1;
    checksum += p;
    const counts = {};
    key.split(',').forEach((n, i) => {
      const value = Number(n);
      if (value > 0) counts[SYMS[i]] = value;
    });
    const keys = handKeysOf(counts);
    if (keys.length > 0) hitRate += p;
    for (const handKey of keys) probability[handKey] += p;
    const multiple = keys.reduce((sum, handKey) => sum + HAND_BY_KEY[handKey].pay, 0);
    mean += p * multiple;
    meanSq += p * multiple ** 2;
    if (multiple > maxMultiple) { maxMultiple = multiple; maxKeys = keys; }
  }

  return { probability, hitRate, states, checksum, mean, meanSq, maxMultiple, maxKeys };
}

/**
 * 고 배수의 기대 계수. 스핀에 들어갈 때의 단계 분포를 정상분포로 구한다.
 * 단계 k로 들어간다 = 직전 k번이 모두 당첨, 그 앞이 꽝. 상한 단계는 흡수한다.
 *   pi(k) = (1-p) p^k  (k < max),  pi(max) = p^max
 * @param {number} p 스핀 1회의 적중률
 */
export function goFactor(p) {
  const mult = HWATU.go.multipliers;
  const max = mult.length - 1;
  const pi = [];
  for (let k = 0; k < max; k += 1) pi.push((1 - p) * p ** k);
  pi.push(p ** max);
  return {
    pi,
    factor: pi.reduce((sum, weight, k) => sum + weight * mult[k], 0),
  };
}

// 배당표가 주어졌을 때의 환수율. 배당에 선형이므로 확률과 내적하면 끝이다.
export function rtpOf(probability, pays, factor) {
  const base = HWATU.hands.reduce((sum, hand) => sum + probability[hand.key] * pays[hand.key], 0);
  return { base, total: base * factor };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pct = (v) => `${(v * 100).toFixed(4)}%`;
  const { probability, hitRate, states, checksum, mean, meanSq, maxMultiple, maxKeys } = handProbabilities();
  const { pi, factor } = goFactor(hitRate);
  const pays = Object.fromEntries(HWATU.hands.map((hand) => [hand.key, hand.pay]));
  const { base, total } = rtpOf(probability, pays, factor);
  const sd = Math.sqrt(meanSq - mean ** 2);

  console.log(`화투 · 해석적 계산 (몬테카를로 아님)`);
  console.log(`  스트립      ${HWATU.strips.map((s) => s.length).join('/')}`);
  console.log(`  스톱 조합   ${HWATU.strips.reduce((n, s) => n * s.length, 1).toLocaleString()}`);
  console.log(`  개수 상태   ${states.toLocaleString()} (확률 합 ${checksum.toFixed(12)})`);
  console.log(`  적중률      ${pct(hitRate)} (1/${(1 / hitRate).toFixed(2)})`);
  console.log(`  고 분포     ${pi.map((v, k) => `${k}고 ${pct(v)}`).join(' · ')}`);
  console.log(`  고 계수     ${factor.toFixed(4)} (배수 ${HWATU.go.multipliers.join('/')})`);
  console.log(`  배당 몫     ${pct(base)} → 고 포함 ${pct(total)}`);
  console.log(`  스핀당 표준편차 ${sd.toFixed(3)}배 (평균 ${mean.toFixed(4)}배, 고 제외)`);
  console.log(`  이론 최대   ${maxMultiple}배 → 4고에서 ${maxMultiple * HWATU.go.multipliers[HWATU.go.multipliers.length - 1]}배`);
  console.log(`              ${maxKeys.map((key) => HAND_BY_KEY[key].label).join(' + ')}\n`);

  console.log('  족보              확률          1/N          현재 배당   기여');
  for (const hand of HWATU.hands) {
    const p = probability[hand.key];
    const share = p * pays[hand.key];
    console.log(
      `  ${hand.label.padEnd(12, ' ')} ${pct(p).padStart(11)} ${(p === 0 ? '-' : `1/${Math.round(1 / p).toLocaleString()}`).padStart(12)} ` +
      `${String(pays[hand.key]).padStart(10)} ${pct(share).padStart(10)}`,
    );
  }
}
