// 정확한(해석적) 환수율 계산기. 개발용이며 배포 산출물에 포함되지 않는다.
//   node tools/rtp.mjs
//
// 릴 스톱이 균등분포이므로 각 칸의 심볼 확률은 (스트립 내 개수 / 스트립 길이)로 정확히 정해진다.
// 라인 1개의 기대 배당을 전수 열거(최대 8^5=32768)로 구하고, 9라인 전체 RTP는
// 라인 1개의 기대값과 같다(총 베팅 = 라인 베팅 × 9).
// 스캐터는 릴별 "3행 윈도우 안의 스타 개수" 분포를 스트립 전체 스톱에서 정확히 구해 합성한다.
//
// 판정은 engine.js의 함수를 그대로 호출하므로 게임과 계산기가 어긋날 수 없다.

import {
  FREE_SPIN_AWARD,
  JACKPOT_MATCH,
  FREE_SPIN_MULTIPLIER,
  JACKPOT_CONTRIB_RATE,
  MODES,
  MODE_KEYS,
  SCATTER,
  SCATTER_MIN,
  SCATTER_PAYS,
} from '../js/config.js';
import { evaluateLineSymbols } from '../js/engine.js';

// 릴 스트립의 심볼별 확률
function reelProbs(strip) {
  const counts = new Map();
  for (const symbol of strip) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  return [...counts].map(([symbol, count]) => ({ symbol, p: count / strip.length }));
}

// 라인 1개의 기대 배당(라인 베팅 배수). 전수 열거이므로 오차가 없다.
function expectedLinePay(mode) {
  const perReel = mode.strips.map(reelProbs);
  let expected = 0;
  const symbols = new Array(mode.reels);

  const walk = (reel, probability) => {
    if (reel === mode.reels) {
      const combo = evaluateLineSymbols(symbols);
      if (combo !== null) expected += probability * combo.pay;
      return;
    }
    for (const { symbol, p } of perReel[reel]) {
      symbols[reel] = symbol;
      walk(reel + 1, probability * p);
    }
  };
  walk(0, 1);
  return expected;
}


// 릴 하나의 3행 윈도우에 스타가 몇 개 보이는지의 정확한 분포
function reelScatterDist(strip, rows) {
  const dist = [];
  for (let stop = 0; stop < strip.length; stop += 1) {
    let count = 0;
    for (let row = 0; row < rows; row += 1) {
      if (strip[(stop + row) % strip.length] === SCATTER) count += 1;
    }
    dist[count] = (dist[count] ?? 0) + 1 / strip.length;
  }
  return dist.map((value) => value ?? 0);
}

function convolve(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((pa, i) => b.forEach((pb, j) => { out[i + j] += pa * pb; }));
  return out;
}

function scatterDist(mode) {
  return mode.strips
    .map((strip) => reelScatterDist(strip, mode.rows))
    .reduce((acc, dist) => convolve(acc, dist), [1]);
}

// 라인 하나에 왼쪽부터 순수 다이아가 JACKPOT_MATCH개 이상일 확률
function jackpotOdds(mode) {
  if (!mode.jackpot) return null;
  const perReel = mode.strips.map(reelProbs);
  const pDiamond = perReel.map((entries) => entries.find((e) => e.symbol === 'diamond')?.p ?? 0);
  let perLine = 0;
  for (let run = JACKPOT_MATCH; run <= mode.reels; run += 1) {
    let p = 1;
    for (let reel = 0; reel < run; reel += 1) p *= pDiamond[reel];
    // 정확히 run개로 끊기는 경우(마지막 릴까지면 끊김 조건 없음)
    if (run < mode.reels) p *= 1 - pDiamond[run];
    perLine += p;
  }
  const probability = 1 - (1 - perLine) ** mode.lines;
  return { probability, odds: Math.round(1 / probability) };
}

export function modeRtp(mode) {
  // 총 베팅 기준으로 환산. 라인 1개 기대값 / 라인 수 × 라인 수 = 라인 1개 기대값.
  const lineRtp = expectedLinePay(mode);

  let scatterRtp = 0;
  let triggerRate = 0;
  if (mode.scatter) {
    const dist = scatterDist(mode);
    for (let count = SCATTER_MIN; count < dist.length; count += 1) {
      triggerRate += dist[count];
      scatterRtp += dist[count] * (SCATTER_PAYS[count] ?? 0);
    }
  }

  const base = lineRtp + scatterRtp;
  // 프리스핀 1회 발동당 실제로 돌게 되는 총 프리스핀 수 (리트리거 포함)
  const chain = triggerRate === 0 ? 0 : FREE_SPIN_AWARD / (1 - FREE_SPIN_AWARD * triggerRate);
  const freeSpinsPerSpin = triggerRate * chain;
  const freeRtp = freeSpinsPerSpin * FREE_SPIN_MULTIPLIER * base;
  const jackpotRtp = mode.jackpot ? JACKPOT_CONTRIB_RATE : 0;

  return {
    modeKey: mode.key,
    lineRtp,
    scatterRtp,
    freeRtp,
    jackpotRtp,
    total: base + freeRtp + jackpotRtp,
    triggerRate,
    freeSpinsPerSpin,
    chain,
    jackpot: jackpotOdds(mode),
    stripLengths: mode.strips.map((s) => s.length),
  };
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('해석적 환수율 (전수 열거, 오차 없음)\n');
  for (const key of MODE_KEYS) {
    const r = modeRtp(MODES[key]);
    console.log(`[${key}] 스트립 ${r.stripLengths.join('/')}`);
    console.log(`  라인      ${pct(r.lineRtp)}`);
    console.log(`  스캐터    ${pct(r.scatterRtp)}`);
    console.log(`  프리스핀  ${pct(r.freeRtp)}  (발동 ${pct(r.triggerRate)} = 1/${r.triggerRate ? Math.round(1 / r.triggerRate) : '-'}, 발동당 ${r.chain.toFixed(1)}회, 스핀당 ${r.freeSpinsPerSpin.toFixed(3)}회)`);
        console.log(`  잭팟적립  ${pct(r.jackpotRtp)}${r.jackpot ? `  (다이아 ${JACKPOT_MATCH}개 이상 1/${r.jackpot.odds.toLocaleString()})` : ''}`);
    if (MODES[key].hold === true) {
      // 홀드 앤 스핀은 리스핀이 앞선 상태에 의존해 해석적 계산이 불가능하다.
      console.log(`  합계      ${pct(r.total)}  (홀드 앤 스핀 제외)`);
      console.log('  → 홀드 앤 스핀을 포함한 합계는 node tools/hold-sim.mjs 3 10000000 으로 측정한다\n');
      continue;
    }
    console.log(`  합계      ${pct(r.total)}\n`);
  }
}
