// 골드 코인 홀드 앤 스핀의 환수율 기여를 재고, 라인 환수율과 합쳐 균형점을 찾는다.
//   node tools/hold-sim.mjs            코인 가중치별 총 환수율 표
//   node tools/hold-sim.mjs 4 2000000  코인 가중치 4로 200만 스핀 상세
//
// 리스핀은 앞선 상태에 의존해 해석적 계산이 불가능하다. 그래서 이 게임의 이 기능만
// 몬테카를로로 재고 표준오차를 함께 기록한다.
// 판정은 js/hold.js와 js/engine.js를 그대로 호출하므로 게임과 계산기가 어긋날 수 없다.

import { HOLD, JACKPOT_TIERS, JACKPOT_TIER_KEYS, MODES, rebuildMode } from '../js/config.js';
import { spinHold, triggered } from '../js/hold.js';
import { buildGrid, drawStops } from '../js/rng.js';
import { modeRtp } from './rtp.mjs';

// 코인 가중치 w를 넣은 보너스 모드
function withCoin(weight) {
  return rebuildMode(MODES.bonus, { ...MODES.bonus.weights, coin: weight });
}

// 홀드 앤 스핀 기여를 측정한다. 반환은 스핀 1회당 총 베팅 배수.
function measureHold(mode, spins) {
  let triggers = 0;
  let paySum = 0;
  let paySquares = 0;
  let coinSum = 0;
  let triggerCoinSum = 0;
  let fulls = 0;
  let maxPay = 0;

  for (let i = 0; i < spins; i += 1) {
    const stops = drawStops(mode.strips);
    const grid = buildGrid(mode.strips, stops, mode.rows);
    if (!triggered(grid)) continue;
    triggers += 1;
    const result = spinHold({ grid, reels: mode.reels, rows: mode.rows });
    paySum += result.payMultiple;
    paySquares += result.payMultiple ** 2;
    coinSum += result.coins.length;
    triggerCoinSum += result.trigger;
    if (result.full) fulls += 1;
    if (result.payMultiple > maxPay) maxPay = result.payMultiple;
  }

  const rtp = paySum / spins;
  // 스핀당 지급의 표준오차. 미적중 스핀은 0이므로 전체 스핀으로 나눈다.
  const variance = paySquares / spins - rtp ** 2;
  return {
    triggers,
    triggerRate: triggers / spins,
    rtp,
    stderr: Math.sqrt(variance / spins),
    avgCoins: triggers === 0 ? 0 : coinSum / triggers,
    avgTriggerCoins: triggers === 0 ? 0 : triggerCoinSum / triggers,
    avgPay: triggers === 0 ? 0 : paySum / triggers,
    fullRate: triggers === 0 ? 0 : fulls / triggers,
    fulls,
    maxPay,
  };
}

// 잭팟 시드가 주는 공짜 몫. 다이아 경로와 전 칸 채움 경로 모두 픽 보너스를 열므로
// 티어별 시드를 픽 가중치로 평균한 값을 쓴다.
const PICK_WEIGHT_TOTAL = JACKPOT_TIER_KEYS.reduce((s, k) => s + JACKPOT_TIERS[k].pickWeight, 0);
const AVG_SEED =
  JACKPOT_TIER_KEYS.reduce((s, k) => s + JACKPOT_TIERS[k].seed * JACKPOT_TIERS[k].pickWeight, 0) /
  PICK_WEIGHT_TOTAL;

function seedEffect(perSpin, refBet) {
  return (perSpin * AVG_SEED) / refBet;
}

const pct = (v) => `${(v * 100).toFixed(2)}%`;
const REF_BET = 90000;

const [weightArg, spinsArg] = process.argv.slice(2);
const spins = Number(spinsArg ?? 400000);

if (weightArg === undefined) {
  console.log(`코인 가중치별 균형 (보너스 모드, ${spins.toLocaleString()} 스핀)\n`);
  console.log('가중치  라인      스캐터    프리스핀  적립    홀드앤스핀  시드효과  합계     트리거');
  for (const weight of [0, 2, 3, 4, 5, 6, 8]) {
    const mode = withCoin(weight);
    const analytic = modeRtp(mode);
    const hold = weight === 0
      ? { rtp: 0, triggerRate: 0, fullRate: 0 }
      : measureHold(mode, spins);
    const fullSeed = weight === 0 ? 0 : seedEffect(hold.triggerRate * hold.fullRate, REF_BET);
    const diamondSeed = analytic.jackpot === null ? 0 : seedEffect(analytic.jackpot.probability, REF_BET);
    const seed = fullSeed + diamondSeed;
    const total = analytic.total + hold.rtp + seed;
    const odds = hold.triggerRate === 0 ? '-' : `1/${Math.round(1 / hold.triggerRate)}`;
    console.log(
      `${String(weight).padStart(4)}    ${pct(analytic.lineRtp).padStart(8)}  ${pct(analytic.scatterRtp).padStart(7)}  ` +
      `${pct(analytic.freeRtp).padStart(8)}  ${pct(analytic.jackpotRtp).padStart(6)}  ` +
      `${pct(hold.rtp).padStart(9)}  ${pct(seed).padStart(8)}  ${pct(total).padStart(7)}  ${odds}`,
    );
  }
  console.log('\n목표는 합계 94~96%다. 코인 가중치가 오르면 라인이 내려가고 홀드앤스핀이 올라간다.');
} else {
  const weight = Number(weightArg);
  const mode = withCoin(weight);
  const analytic = modeRtp(mode);
  const hold = measureHold(mode, spins);
  const fullSeed = seedEffect(hold.triggerRate * hold.fullRate, REF_BET);
  const diamondSeed = analytic.jackpot === null ? 0 : seedEffect(analytic.jackpot.probability, REF_BET);

  console.log(`보너스 모드 · 코인 가중치 ${weight} · ${spins.toLocaleString()} 스핀`);
  console.log(`  스트립        ${mode.strips.map((s) => s.length).join('/')}`);
  console.log(`  라인          ${pct(analytic.lineRtp)}`);
  console.log(`  스캐터        ${pct(analytic.scatterRtp)}`);
  console.log(`  프리스핀      ${pct(analytic.freeRtp)}  (발동 1/${Math.round(1 / analytic.triggerRate)})`);
  console.log(`  잭팟 적립     ${pct(analytic.jackpotRtp)}  (다이아 ${analytic.jackpot ? `1/${analytic.jackpot.odds.toLocaleString()}` : '-'})`);
  console.log(`  홀드앤스핀    ${pct(hold.rtp)}  (표준오차 ±${pct(hold.stderr)})`);
  console.log(`  다이아 시드   ${pct(diamondSeed)}`);
  console.log(`  전 칸 시드    ${pct(fullSeed)}`);
  console.log(`  합계          ${pct(analytic.total + hold.rtp + diamondSeed + fullSeed)}`);
  console.log('');
  console.log(`  트리거        1/${Math.round(1 / hold.triggerRate)} (${hold.triggers.toLocaleString()}회)`);
  console.log(`  진입 코인     평균 ${hold.avgTriggerCoins.toFixed(2)}개 (트리거 ${HOLD.trigger}개 이상)`);
  console.log(`  종료 코인     평균 ${hold.avgCoins.toFixed(2)}개 / ${mode.reels * mode.rows}칸`);
  console.log(`  1회 지급      평균 ${hold.avgPay.toFixed(1)}배 · 최대 ${hold.maxPay}배`);
  console.log(`  전 칸 채움    ${pct(hold.fullRate)} (${hold.fulls}회) → 픽 보너스`);
}
