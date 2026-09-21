// 페이라인 배당표를 목표 환수율에 맞춘다.
// 라인 RTP는 배당값에 선형이고 rtp.mjs의 열거가 오차 없이 빠르므로(8^5 = 32,768),
// 배당표를 직접 바꿔 가며 재측정하는 그리디를 쓸 수 있다.
//
//   node tools/line-solve.mjs <목표 RTP>      예: node tools/line-solve.mjs 1.05

import { LINE_PAYS, MODES, SCATTER_PAYS } from '../js/config.js';
import { modeRtp } from './rtp.mjs';

const TARGET = Number(process.argv[2] ?? 1.05);
// 잭팟 시드가 얹어 주는 몫. tools/sim.mjs에서 실측한 값이고 배당표로 움직이지 않는다.
const SEED_SHARE = 0.03;

const NICE = [];
for (const mag of [0.1, 1, 10, 100, 1000]) {
  for (const step of [1, 1.2, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8]) NICE.push(+(mag * step).toFixed(2));
}
NICE.sort((a, b) => a - b);
const snap = (v) => NICE.reduce((best, n) => (Math.abs(n - v) < Math.abs(best - v) ? n : best), NICE[0]);

// ── 라인 배당 (LINE_PAYS · SCATTER_PAYS) ──
// 예전에는 스캐터·프리스핀·잭팟이 없는 9라인 모드로 라인 몫을 따로 뽑았다. 그 모드를
// 없앤 뒤로는 보너스 모드의 lineRtp·scatterRtp·freeRtp를 직접 본다. modeRtp가 몫을
// 나눠 돌려주므로 결과는 같고, 목표는 "배당으로 오는 몫"이다.
// (홀드 앤 스핀 몫과 잭팟 적립·시드는 배당표로 움직이지 않으므로 목표에서 뺀다)
const payKeys = Object.keys(LINE_PAYS);
const COUNTS = [3, 4, 5];
const payShare = (mode) => {
  const r = modeRtp(mode);
  return r.lineRtp + r.scatterRtp + r.freeRtp;
};

const HOLD_SHARE = 0.2557;
const payTarget = TARGET - HOLD_SHARE - modeRtp(MODES.bonus).jackpotRtp - SEED_SHARE;
const base = payShare(MODES.bonus);
const scale = payTarget / base;
console.log(`배당 몫 현재 ${(base * 100).toFixed(2)}% → 목표 ${(payTarget * 100).toFixed(2)}% · 배율 ${scale.toFixed(4)}`);

for (const n of Object.keys(SCATTER_PAYS)) SCATTER_PAYS[n] = snap(SCATTER_PAYS[n] * scale);
for (const k of payKeys) for (const n of COUNTS) LINE_PAYS[k][n] = snap(LINE_PAYS[k][n] * scale);

// 사다리가 뒤집히면(4개가 3개보다 싸면) 표가 말이 안 된다
const monotonic = () => payKeys.every((k) => COUNTS.every((n, i) => i === 0 || LINE_PAYS[k][n] >= LINE_PAYS[k][COUNTS[i - 1]]));

let err = Math.abs(payShare(MODES.bonus) - payTarget);
for (let pass = 0; pass < 40; pass += 1) {
  let improved = false;
  for (const k of payKeys) {
    for (const n of COUNTS) {
      const idx = NICE.indexOf(LINE_PAYS[k][n]);
      for (const d of [-1, 1]) {
        const next = NICE[idx + d];
        if (next === undefined) continue;
        const prev = LINE_PAYS[k][n];
        LINE_PAYS[k][n] = next;
        const e = Math.abs(payShare(MODES.bonus) - payTarget);
        if (monotonic() && e < err - 1e-9) { err = e; improved = true; } else { LINE_PAYS[k][n] = prev; }
      }
    }
  }
  if (!improved) break;
}
console.log(`  → ${(payShare(MODES.bonus) * 100).toFixed(3)}%`);
console.log('export const LINE_PAYS = {');
for (const k of payKeys) console.log(`  ${k}: { 3: ${LINE_PAYS[k][3]}, 4: ${LINE_PAYS[k][4]}, 5: ${LINE_PAYS[k][5]} },`);
console.log('};');
console.log(`export const SCATTER_PAYS = { 3: ${SCATTER_PAYS[3]}, 4: ${SCATTER_PAYS[4]}, 5: ${SCATTER_PAYS[5]} };\n`);

// ── 보너스: 위에서 정한 배당으로 각 몫이 어떻게 되는지 ──
const b = modeRtp(MODES.bonus);
console.log(`보너스 (홀드 앤 스핀·시드 제외)`);
console.log(`  라인 ${(b.lineRtp * 100).toFixed(2)}% · 스캐터 ${(b.scatterRtp * 100).toFixed(2)}% · 프리스핀 ${(b.freeRtp * 100).toFixed(2)}% · 적립 ${(b.jackpotRtp * 100).toFixed(2)}%`);
console.log(`  배당으로 오는 몫 합계 ${((b.lineRtp + b.scatterRtp + b.freeRtp) * 100).toFixed(2)}%`);
console.log(`  잭팟 확률 ${b.jackpot === null ? '-' : '1/' + b.jackpot.odds.toLocaleString()}`);
console.log(`\n  홀드 ${(HOLD_SHARE * 100).toFixed(2)}%를 그대로 둘 때 남는 시드 여유 = ${((TARGET - (b.lineRtp + b.scatterRtp + b.freeRtp) - b.jackpotRtp - HOLD_SHARE) * 100).toFixed(2)}%p`);
