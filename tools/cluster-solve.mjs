// 클러스터 RTP는 배당에 선형이다(덩어리가 생기는 확률은 배당액과 무관하다).
// (심볼, 구간)별 계수 = 스핀 1회당 그 조합이 나오는 기대 횟수
// 계수를 한 번 재면 어떤 배당표의 RTP든 즉시 나온다. 그래서 목표에 맞춰 정확히 풀 수 있다.
import { POUCH, POUCH_JACKPOT } from '../js/config.js';
import { evaluateClusters, payBand } from '../js/cluster.js';
import { buildGrid, drawStops } from '../js/rng.js';

const SPINS = Number(process.argv[2] ?? 3000000);
const SYMS = Object.keys(POUCH.pays);
const BANDS = POUCH.sizeBands;

const coef = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(BANDS.map((b) => [b, 0]))]));
let hits = 0;
for (let i = 0; i < SPINS; i += 1) {
  const grid = buildGrid(POUCH.strips, drawStops(POUCH.strips), POUCH.rows);
  const wins = evaluateClusters(grid);
  if (wins.length > 0) hits += 1;
  for (const win of wins) coef[win.symbol][payBand(win.size)] += 1;
}
for (const s of SYMS) for (const b of BANDS) coef[s][b] /= SPINS;

const jpTotal = Object.values(POUCH_JACKPOT.tiers).reduce(
  (sum, t) => sum + POUCH_JACKPOT.contribRate * t.contribShare * ((t.seed + t.mustHitBy) / (t.mustHitBy - t.seed)), 0);
const TARGET = Number(process.argv[3] ?? 0.95);
const target = TARGET - jpTotal;

const rtpOf = (pays) => SYMS.reduce((sum, s) => sum + BANDS.reduce((t, b) => t + coef[s][b] * (pays[s][b] ?? 0), 0), 0);
const base = rtpOf(POUCH.pays);

console.log(`${SPINS.toLocaleString()} 스핀으로 계수 측정 · 적중률 ${(hits / SPINS * 100).toFixed(2)}%`);
console.log(`잭팟 기여 ${(jpTotal * 100).toFixed(3)}% → 클러스터 목표 ${(target * 100).toFixed(2)}%`);
console.log(`현재 배당표의 클러스터 RTP ${(base * 100).toFixed(2)}% → 필요 배율 ${(target / base).toFixed(4)}\n`);

console.log('(심볼, 구간)별 계수 = 스핀 1회당 기대 횟수');
console.log('심볼        ' + BANDS.map((b) => String(b).padStart(9)).join(''));
for (const s of SYMS) {
  console.log(s.padEnd(10) + BANDS.map((b) => coef[s][b].toExponential(2).padStart(9)).join(''));
}

// 보기 좋은 값 격자에 맞춰 배율을 적용한다
const NICE = [];
for (const mag of [0.1, 1, 10, 100, 1000]) {
  for (const step of [1, 1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8]) NICE.push(+(mag * step).toFixed(2));
}
NICE.sort((a, b) => a - b);
const snap = (v) => NICE.reduce((best, n) => (Math.abs(n - v) < Math.abs(best - v) ? n : best), NICE[0]);

const scale = target / base;
const scaled = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(BANDS.map((b) => [b, snap(POUCH.pays[s][b] * scale)]))]));
console.log(`\n배율 ${scale.toFixed(4)} 적용 후 보기 좋은 값으로 스냅 → 클러스터 ${(rtpOf(scaled) * 100).toFixed(2)}%`);

// 배당 사다리가 뒤집히면(6칸이 5칸보다 싸면) 표가 말이 안 된다. 그리디가 그걸
// 깨지 않도록 단조성을 검사한다.
const monotonic = (pays) =>
  SYMS.every((s) => BANDS.every((b, i) => i === 0 || pays[s][b] >= pays[s][BANDS[i - 1]])) &&
  BANDS.every((b) => SYMS.every((s, i) => i === 0 || pays[s][b] >= pays[SYMS[i - 1]][b]));

// 개별 배당을 한 칸씩 움직여 목표에 더 붙인다
let best = scaled, bestErr = Math.abs(rtpOf(scaled) - target);
for (let pass = 0; pass < 40; pass += 1) {
  let improved = false;
  for (const s of SYMS) {
    for (const b of BANDS) {
      const idx = NICE.indexOf(best[s][b]);
      for (const d of [-1, 1]) {
        const next = NICE[idx + d];
        if (next === undefined) continue;
        const trial = { ...best, [s]: { ...best[s], [b]: next } };
        if (!monotonic(trial)) continue;
        const err = Math.abs(rtpOf(trial) - target);
        if (err < bestErr - 1e-9) { best = trial; bestErr = err; improved = true; }
      }
    }
  }
  if (!improved) break;
}
console.log(`그리디 보정 후 클러스터 ${(rtpOf(best) * 100).toFixed(3)}% · 합계 ${((rtpOf(best) + jpTotal) * 100).toFixed(3)}%\n`);
console.log('  pays: {');
for (const s of SYMS) {
  console.log(`    ${s}: { ${BANDS.map((b) => `${b}: ${best[s][b]}`).join(', ')} },`);
}
console.log('  },');
