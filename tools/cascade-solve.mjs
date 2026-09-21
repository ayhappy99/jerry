// 파라오 배당표를 목표 환수율에 맞춘다.
// 캐스케이딩 RTP는 배당값에 선형이다(심볼 제거 여부는 당첨 성립만 보고 배당액은 안 본다).
// (심볼, 개수)별 계수를 한 번 재면 어떤 배당표의 RTP든 즉시 나온다.
//
//   node tools/cascade-solve.mjs <목표 RTP> <스핀>
import { JACKPOT_CONTRIB_RATE, JACKPOT_TIERS, JACKPOT_TIER_KEYS, PHARAOH } from '../js/config.js';
import { evaluateWays, cascadeOnce, countScatters, dropWilds } from '../js/cascade.js';
import { buildGrid, drawStops } from '../js/rng.js';

const TARGET = Number(process.argv[2] ?? 1.05);
const SPINS = Number(process.argv[3] ?? 1000000);
const SYMS = Object.keys(PHARAOH.pays).filter((k) => k !== PHARAOH.scatter);
const COUNTS = [3, 4, 5, 6];
const REF_BET = 100000;

const C = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(COUNTS.map((n) => [n, 0]))]));
const SC = {};
let freePlayed = 0;
let freeTriggers = 0;
let jackpotTriggers = 0;
// 부적 게이지는 스핀을 넘겨 이어진다. 게이지가 만든 당첨도 계수에 들어가므로
// 선형 모형은 그대로 성립한다(계수만 커진다).
let charge = 0;
let chargeFired = 0;

function ladder(chain) {
  return PHARAOH.multipliers[Math.min(chain, PHARAOH.multipliers.length) - 1];
}

// 한 스핀. 계수만 모은다(배당값을 쓰지 않는다).
function play(freeSpin) {
  const stops = drawStops(PHARAOH.strips);
  const freeMult = freeSpin ? PHARAOH.freeMultiplier : 1;
  let grid = buildGrid(PHARAOH.strips, stops, PHARAOH.rows);
  const scatters = countScatters(grid);
  if (scatters >= PHARAOH.scatterMin) {
    // 게임은 scatterPays에 없는 개수를 0으로 준다. 있는 개수만 센다.
    if (PHARAOH.scatterPays[scatters] !== undefined) SC[scatters] = (SC[scatters] ?? 0) + freeMult;
    if (!freeSpin) freeTriggers += 1;
  }
  // spinCascade와 같은 순서로 돈다. 배당값만 쓰지 않고 계수를 센다.
  let chain = 0;
  let cursors = [...stops];
  let fired = 0;
  while (chain < PHARAOH.maxChain) {
    const wins = evaluateWays(grid);
    if (wins.length === 0) break;
    chain += 1;
    const mult = ladder(chain) * freeMult;
    for (const win of wins) {
      if (win.symbol === PHARAOH.scatter) continue;
      C[win.symbol][Math.min(win.count, 6)] += win.ways * mult;
    }
    const next = cascadeOnce(grid, wins.flatMap((win) => win.cells), cursors);
    grid = next.grid;
    cursors = next.cursors;

    charge += 1;
    if (charge < PHARAOH.charge.capacity || fired > 0) continue;
    charge = 0;
    fired += 1;
    chargeFired += 1;
    grid = dropWilds(grid, PHARAOH.charge.wilds).grid;
  }
  if (chain >= PHARAOH.jackpotChain) jackpotTriggers += 1;
  // 프리스핀 중에도 스캐터가 다시 나오면 리트리거된다(spinCascade가 freeSpin을 보지 않는다).
  // 여기서 !freeSpin으로 걸러 버리면 프리스핀 수가 9% 적게 나와 환수율이 1.3%p 낮게 잡힌다.
  return scatters >= PHARAOH.scatterMin ? PHARAOH.freeSpins : 0;
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
const scatKeys = Object.keys(PHARAOH.scatterPays).map(Number);
const scatCoef = Object.fromEntries(scatKeys.map((n) => [n, (SC[n] ?? 0) / SPINS]));
const rtpOf = (pays) =>
  SYMS.reduce((sum, s) => sum + COUNTS.reduce((t, n) => t + coef[s][n] * pays[s][n], 0), 0) +
  scatKeys.reduce((t, n) => t + scatCoef[n] * PHARAOH.scatterPays[n], 0);

// 시드 효과: 연쇄 잭팟이 픽 보너스를 열고, 티어별 시드를 픽 가중치로 평균한 값이 공짜로 나간다
const PW = JACKPOT_TIER_KEYS.reduce((s, k) => s + JACKPOT_TIERS[k].pickWeight, 0);
const AVG_SEED = JACKPOT_TIER_KEYS.reduce((s, k) => s + JACKPOT_TIERS[k].seed * JACKPOT_TIERS[k].pickWeight, 0) / PW;
// 환수율은 "건 돈"에 대한 비율이므로 분모는 유료 스핀이다. 프리스핀은 걸지 않지만
// 그 스핀에서 터진 잭팟도 유료 스핀 하나가 만든 것이다.
const jpRate = jackpotTriggers / SPINS;
const seedEffect = (jpRate * AVG_SEED) / REF_BET;
const accrual = JACKPOT_CONTRIB_RATE;
const payTarget = TARGET - accrual - seedEffect;

const pct = (v) => `${(v * 100).toFixed(2)}%`;
console.log(`${SPINS.toLocaleString()} 스핀 (프리스핀 ${freePlayed.toLocaleString()}회 포함)`);
console.log(`연쇄 ${PHARAOH.jackpotChain}단 트리거 1/${Math.round(1 / jpRate).toLocaleString()} · 평균 시드 ${Math.round(AVG_SEED).toLocaleString()} → 시드 효과 ${pct(seedEffect)}`);
console.log(`부적 게이지 발동 1/${(SPINS / chargeFired).toFixed(1)}스핀 (와일드 ${PHARAOH.charge.wilds}개 · 용량 ${PHARAOH.charge.capacity})`);
console.log(`적립 ${pct(accrual)} · 배당으로 채울 몫 ${pct(payTarget)}`);
console.log(`현재 배당의 RTP ${pct(rtpOf(PHARAOH.pays))} → 배율 ${(payTarget / rtpOf(PHARAOH.pays)).toFixed(4)}\n`);

let NICE = [];
// 파라오 저배당은 0.015까지 내려간다. 격자가 0.1에서 끊기면 사다리가 뭉개진다.
// toFixed(2)로 자르면 0.001이 0으로 뭉개져 배당 0이 나온다. 소수 4자리로 남긴다.
for (const mag of [0.001, 0.01, 0.1, 1, 10]) {
  for (const step of [1, 1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8]) NICE.push(+(mag * step).toFixed(4));
}
// 배당 0은 허용하지 않는다. 0이면 그 심볼이 연속을 끊는 벽이 되어 규칙이 달라진다.
NICE = [...new Set(NICE.filter((n) => n > 0))].sort((a, b) => a - b);
const snap = (v) => NICE.reduce((best, n) => (Math.abs(n - v) < Math.abs(best - v) ? n : best), NICE[0]);

const scale = payTarget / rtpOf(PHARAOH.pays);
let best = Object.fromEntries(SYMS.map((s) => [s, Object.fromEntries(COUNTS.map((n) => [n, snap(PHARAOH.pays[s][n] * scale)]))]));
// 같은 심볼 안에서 개수가 늘면 배당도 늘어야 하고(세로),
// 같은 개수에서 희귀한 심볼이 더 비싸야 한다(가로). 둘 다 지킨다.
const monotonic = (p) =>
  SYMS.every((s) => COUNTS.every((n, i) => i === 0 || p[s][n] >= p[s][COUNTS[i - 1]])) &&
  COUNTS.every((n) => SYMS.every((s, i) => i === 0 || p[s][n] >= p[SYMS[i - 1]][n]));
let err = Math.abs(rtpOf(best) - payTarget);
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
        const e = Math.abs(rtpOf(trial) - payTarget);
        if (e < err - 1e-9) { best = trial; err = e; improved = true; }
      }
    }
  }
  if (!improved) break;
}
console.log(`스냅 + 그리디 후 배당 몫 ${pct(rtpOf(best))} · 합계 ${pct(rtpOf(best) + accrual + seedEffect)}\n`);
console.log('  pays: {');
for (const s of SYMS) console.log(`    ${s}: { 3: ${best[s][3]}, 4: ${best[s][4]}, 5: ${best[s][5]}, 6: ${best[s][6]} },`);
console.log('  },');
