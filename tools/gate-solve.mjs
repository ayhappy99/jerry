// 용문 배당표를 목표 환수율에 맞추고, 같은 실행에서 실측 결과도 낸다.
//   node tools/gate-solve.mjs [목표 RTP] [스핀]
//
// 가변 릴 + 캐스케이딩은 해석적 계산이 불가능하다. 다만 심볼 제거 여부는 당첨 성립만
// 보고 배당액은 보지 않으므로 RTP가 배당에 선형이다. (심볼, 개수)별 계수를 한 번 재면
// 어떤 배당표의 RTP든 즉시 나온다.

import { GATE } from '../js/config.js';
import { drawHeights, evaluateGate, buildGateGrid, countGateScatters, gateCascade, gateMultiplier } from '../js/gate.js';
import { drawStops } from '../js/rng.js';

const TARGET = Number(process.argv[2] ?? 1.05);
const SPINS = Number(process.argv[3] ?? 500000);
const SYMS = Object.keys(GATE.pays);
const COUNTS = [3, 4, 5, 6];

const C = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(COUNTS.map((n) => [n, 0]))]));
const SC = {};
let freePlayed = 0;
let freeTriggers = 0;
let hits = 0;
let played = 0;
const waysBuckets = { '<100': 0, '100+': 0, '1k+': 0, '10k+': 0, '50k+': 0 };

// 한 스핀. spinGate와 같은 순서로 돌면서 배당값만 쓰지 않고 계수를 센다.
function play(freeSpin) {
  const stops = drawStops(GATE.strips);
  const heights = drawHeights();
  const freeMult = freeSpin ? GATE.freeMultiplier : 1;
  let grid = buildGateGrid(stops, heights);
  played += 1;

  const ways = heights.reduce((p, r) => p * r, 1);
  const bucket = ways >= 50000 ? '50k+' : ways >= 10000 ? '10k+' : ways >= 1000 ? '1k+' : ways >= 100 ? '100+' : '<100';
  waysBuckets[bucket] += 1;

  const scatters = countGateScatters(grid);
  if (scatters >= GATE.scatterMin) {
    if (GATE.scatterPays[scatters] !== undefined) SC[scatters] = (SC[scatters] ?? 0) + freeMult;
    if (!freeSpin) freeTriggers += 1;
  }

  let chain = 0;
  let cursors = [...stops];
  let anyWin = false;
  while (chain < GATE.maxChain) {
    const wins = evaluateGate(grid);
    if (wins.length === 0) break;
    anyWin = true;
    chain += 1;
    const mult = gateMultiplier(chain, freeSpin) * freeMult;
    for (const win of wins) C[win.symbol][Math.min(win.count, 6)] += win.ways * mult;
    const next = gateCascade(grid, wins.flatMap((win) => win.cells), cursors);
    grid = next.grid;
    cursors = next.cursors;
  }
  if (anyWin || scatters >= GATE.scatterMin) hits += 1;
  // 프리스핀 중에도 스캐터가 다시 나오면 리트리거된다(spinGate가 freeSpin을 보지 않는다)
  return scatters >= GATE.scatterMin ? GATE.freeSpins : 0;
}

for (let i = 0; i < SPINS; i += 1) {
  let free = play(false);
  while (free > 0) {
    free -= 1;
    freePlayed += 1;
    free += play(true);
  }
}

const coef = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(COUNTS.map((n) => [n, C[s][n] / SPINS]))]));
const scatKeys = Object.keys(GATE.scatterPays).map(Number);
const scatCoef = Object.fromEntries(scatKeys.map((n) => [n, (SC[n] ?? 0) / SPINS]));
const rtpOf = (pays) =>
  SYMS.reduce((sum, s) => sum + COUNTS.reduce((t, n) => t + coef[s][n] * pays[s][n], 0), 0) +
  scatKeys.reduce((t, n) => t + scatCoef[n] * GATE.scatterPays[n], 0);

const pct = (v) => `${(v * 100).toFixed(2)}%`;
console.log(`용문 · ${SPINS.toLocaleString()} 스핀 (프리스핀 ${freePlayed.toLocaleString()}회 포함)`);
console.log(`  스트립      ${GATE.strips.map((s) => s.length).join('/')}`);
console.log(`  적중률      ${pct(hits / played)}`);
console.log(`  프리스핀    1/${Math.round(SPINS / freeTriggers)} · 스핀당 ${(freePlayed / SPINS).toFixed(3)}회`);
console.log(`  ways 분포   ${Object.entries(waysBuckets).map(([k, v]) => `${k} ${pct(v / played)}`).join(' · ')}`);
console.log(`  현재 배당의 RTP ${pct(rtpOf(GATE.pays))} → 목표 ${pct(TARGET)} · 배율 ${(TARGET / rtpOf(GATE.pays)).toFixed(4)}\n`);

let NICE = [];
for (const mag of [0.001, 0.01, 0.1, 1, 10]) {
  for (const step of [1, 1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8]) NICE.push(+(mag * step).toFixed(4));
}
// 배당 0은 허용하지 않는다. 0이면 그 심볼이 연속을 끊는 벽이 되어 규칙이 달라진다.
NICE = [...new Set(NICE.filter((n) => n > 0))].sort((a, b) => a - b);
const snap = (v) => NICE.reduce((best, n) => (Math.abs(n - v) < Math.abs(best - v) ? n : best), NICE[0]);

// 같은 심볼 안에서 개수가 늘면 배당도 늘어야 하고(세로),
// 같은 개수에서 희귀한 심볼이 더 비싸야 한다(가로). 둘 다 지킨다.
const monotonic = (p) =>
  SYMS.every((s) => COUNTS.every((n, i) => i === 0 || p[s][n] >= p[s][COUNTS[i - 1]])) &&
  COUNTS.every((n) => SYMS.every((s, i) => i === 0 || p[s][n] >= p[SYMS[i - 1]][n]));

const scale = TARGET / rtpOf(GATE.pays);
let best = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(COUNTS.map((n) => [n, snap(GATE.pays[s][n] * scale)]))]));
let err = Math.abs(rtpOf(best) - TARGET);
for (let pass = 0; pass < 40; pass += 1) {
  let improved = false;
  for (const s of SYMS) {
    for (const n of COUNTS) {
      const idx = NICE.indexOf(best[s][n]);
      for (const d of [-1, 1]) {
        const next = NICE[idx + d];
        if (next === undefined) continue;
        const trial = { ...best, [s]: { ...best[s], [n]: next } };
        if (!monotonic(trial)) continue;
        const e = Math.abs(rtpOf(trial) - TARGET);
        if (e < err - 1e-9) { best = trial; err = e; improved = true; }
      }
    }
  }
  if (!improved) break;
}
console.log(`스냅 + 그리디 후 ${pct(rtpOf(best))}\n`);
console.log('  pays: {');
for (const s of SYMS) console.log(`    ${s}: { 3: ${best[s][3]}, 4: ${best[s][4]}, 5: ${best[s][5]}, 6: ${best[s][6]} },`);
console.log('  },');
