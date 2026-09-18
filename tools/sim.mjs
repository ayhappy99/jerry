// 밸런스 시뮬레이터 (개발용). 배포 산출물에 포함되지 않는다.
//   node tools/sim.mjs [스핀 수] [모드키]
// 환수율(RTP) = 총 획득 / 총 베팅. 프리스핀 당첨은 베팅 없이 얻으므로 분자에만 들어간다.
// 잭팟은 적립분(총 베팅의 1%)이 장기적으로 전액 플레이어에게 돌아가므로
// "적립분만" 지급으로 계산한다. 초기 seed 5천만은 하우스가 얹어주는 프로모션이라 RTP에서 제외한다.

import { BETS, JACKPOT_CONTRIB_RATE, MODES, MODE_KEYS } from '../js/config.js';
import { evaluateSpin, totalBetOf } from '../js/engine.js';
import { buildGrid, drawStops } from '../js/rng.js';

const spins = Number(process.argv[2] ?? 100000);
const only = process.argv[3];
const lineBet = BETS[2];

function spinOnce(mode, freeSpin, jackpotPool) {
  const stops = drawStops(mode.strips);
  const grid = buildGrid(mode.strips, stops, mode.rows);
  return evaluateSpin({ modeKey: mode.key, grid, lineBet, freeSpin, jackpotPool });
}

function simulate(modeKey, count) {
  const mode = MODES[modeKey];
  const totalBet = totalBetOf(mode, lineBet);
  let wagered = 0;
  let won = 0;
  let jackpotPool = 0; // 적립분만 추적
  let jackpotHits = 0;
  let jackpotPaid = 0;
  let freeTriggers = 0;
  let freeSpinsPlayed = 0;
  let retriggers = 0;
  let hits = 0;
  let best = 0;

  for (let i = 0; i < count; i += 1) {
    wagered += totalBet;
    if (mode.jackpot) jackpotPool += totalBet * JACKPOT_CONTRIB_RATE;

    let result = spinOnce(mode, false, jackpotPool);
    if (result.jackpot.hit) {
      jackpotHits += 1;
      jackpotPaid += jackpotPool;
      jackpotPool = 0;
    }
    won += result.totalWin;
    if (result.totalWin > 0) hits += 1;
    best = Math.max(best, result.totalWin);

    let free = result.freeSpinsAwarded;
    if (free > 0) freeTriggers += 1;
    while (free > 0) {
      free -= 1;
      freeSpinsPlayed += 1;
      result = spinOnce(mode, true, jackpotPool);
      if (result.jackpot.hit) {
        jackpotHits += 1;
        jackpotPaid += jackpotPool;
        jackpotPool = 0;
      }
      won += result.totalWin;
      best = Math.max(best, result.totalWin);
      if (result.freeSpinsAwarded > 0) {
        retriggers += 1;
        free += result.freeSpinsAwarded;
      }
    }
  }

  return {
    modeKey,
    rtp: (won / wagered) * 100,
    rtpNoJackpot: ((won - jackpotPaid) / wagered) * 100,
    hitRate: (hits / count) * 100,
    freeTriggerRate: (freeTriggers / count) * 100,
    freeSpinsPerSpin: freeSpinsPlayed / count,
    retriggerRate: freeSpinsPlayed === 0 ? 0 : (retriggers / freeSpinsPlayed) * 100,
    jackpotHits,
    jackpotOdds: jackpotHits === 0 ? Infinity : Math.round(count / jackpotHits),
    bestMultiple: best / totalBet,
  };
}

console.log(`스핀 ${spins.toLocaleString()}회 / 라인 베팅 ${lineBet.toLocaleString()}`);
for (const key of only ? [only] : MODE_KEYS) {
  const r = simulate(key, spins);
  console.log(
    [
      key.padEnd(8),
      `RTP ${r.rtp.toFixed(2)}%`,
      `(잭팟제외 ${r.rtpNoJackpot.toFixed(2)}%)`,
      `적중률 ${r.hitRate.toFixed(2)}%`,
      `프리스핀발동 ${r.freeTriggerRate.toFixed(3)}%`,
      `리트리거 ${r.retriggerRate.toFixed(2)}%`,
      `잭팟 1/${r.jackpotOdds}`,
      `최고 ${r.bestMultiple.toFixed(0)}x`,
    ].join('  '),
  );
}
