// 부트스트랩과 화면 라우팅. 사용자에게 보여줄 오류 메시지는 이 파일 한 곳에서만 만든다.

import {
  BETS,
  EFFECTS,
  JACKPOT_CONTRIB_RATE,
  JACKPOT_MATCH,
  JACKPOT_ROLL_MS,
  JACKPOT_TIERS,
  JACKPOT_TIER_KEYS,
  GAMES,
  GAME_KEYS,
  GATE,
  HWATU,
  MODES,
  MODE_KEYS,
  NICKNAME_RULES,
  PHARAOH,
  POUCH,
  POUCH_JACKPOT,
  REFILL_AMOUNT,
  SCATTER,
  SYMBOLS,
  TIMING,
  WIN_TIERS,
} from './config.js';
import * as audio from './audio.js';
import { evaluateSpin, totalBetOf, winTierOf } from './engine.js';
import { spinCascade } from './cascade.js';
import { drawHeights, spinGate } from './gate.js';
import { spinHwatu } from './hwatu.js';
import { drawBeads } from './bead.js';
import { contributePouch, countPouches, pouchFeed, spinCluster } from './cluster.js';
import { spinHold, triggered } from './hold.js';
import { buildGrid, buildPickTiles, drawJackpotTier, drawStops } from './rng.js';
import { clearBeads, clearHighlights, markBeads, playCascade, playHold, renderReels, spinReels } from './reels.js';
import * as storage from './storage.js';
import { mountSymbolSprite } from './symbols.js';
import * as ui from './ui.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const game = {
  state: null,
  key: null,
  kind: null,
  mode: null,
  lineBet: 0,
  freeSpinsLeft: 0,
  // 용문의 이번 판 릴 높이. 스핀마다 다시 뽑고, 화면에 그려진 높이와 항상 같아야 한다.
  gateHeights: null,
  // 직전 스핀의 ways. 늘었을 때만 ways 표시가 튀어오른다.
  gateWays: 0,
  busy: false,
  // 진행 중인 스핀 루프. 체험형 안내가 스핀 종료를 기다릴 때 쓴다.
  loopPromise: Promise.resolve(),
  // 어트랙트 모드(유휴 시 데모 스핀)
  attract: false,
  idleTimer: null,
  auto: false,
  // 남은 자동 스핀 횟수. null은 무한이다.
  autoLeft: null,
  looping: false,
};

// 현재 고른 게임이 따로 쌓는 설정·통계·기록. 코인과 잭팟 풀은 game.state에 공유로 둔다.
function section() {
  return game.state.games[game.key];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function animationSpeed() {
  return game.state.settings.turbo ? TIMING.turboDivisor : 1;
}

// 당첨 연출은 모션 최소화 설정에서 한 번 더 짧아진다.
function presentationSpeed() {
  return animationSpeed() * (reducedMotion.matches ? TIMING.reducedMotionDivisor : 1);
}

// 당첨금이 클수록 카운트업이 길어진다. 상한은 TIMING.countUpMax.
function countUpDuration(payout, result) {
  if (reducedMotion.matches) return 0;
  const ratio = payout.totalWin / result.totalBet;
  const span = TIMING.countUpMax - TIMING.countUpMin;
  return (TIMING.countUpMin + Math.min(1, ratio / WIN_TIERS.mega) * span) / animationSpeed();
}

// 현재 게임의 릴 구성. 페이라인 게임은 모드가, 나머지는 게임별 상수가 그 역할을 한다.
function spec() {
  if (game.kind === 'cascade') return PHARAOH;
  if (game.kind === 'cluster') return POUCH;
  if (game.kind === 'gate') return GATE;
  if (game.kind === 'hwatu') return HWATU;
  return game.mode;
}

// 이번에 그려야 할 릴 높이. 가변 릴 게임이 아니면 null이고 모든 릴이 spec().rows다.
function heights() {
  return game.kind === 'gate' ? game.gateHeights : null;
}

// 줄이 없는 게임은 기본 금액을 정해진 칸 수에 한꺼번에 건다.
function betUnits() {
  return spec().betUnits;
}

// 베팅 단계 idx를 골랐을 때 실제로 빠지는 총액
function totalBetAt(idx) {
  return game.kind === 'lines' ? totalBetOf(game.mode, BETS[idx]) : BETS[idx] * betUnits();
}

function currentTotalBet() {
  return totalBetAt(section().settings.betIdx);
}

// "최대"는 지금 가진 코인으로 한 판 돌릴 수 있는 가장 큰 금액이다.
// 베팅 단계의 마지막 값이 아니다 — 못 돌릴 금액을 골라 주면 SPIN이 바로 막힌다.
function affordableBetIdx() {
  const coins = game.state.wallet.coins;
  for (let idx = BETS.length - 1; idx > 0; idx -= 1) {
    if (totalBetAt(idx) <= coins) return idx;
  }
  return 0;
}

// 총액이 어떻게 나왔는지 계산식으로 보여준다. "왜 10배가 빠지냐"에 화면이 답해야 한다.
function betNote(unitBet) {
  return game.kind === 'lines'
    ? `한 줄에 ${ui.formatCoins(unitBet)} × ${game.mode.lines}줄`
    : `기본 ${ui.formatCoins(unitBet)} × ${betUnits()}`;
}

function syncMeters() {
  const unitBet = BETS[section().settings.betIdx];
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(currentTotalBet(), betNote(unitBet));
  ui.setJackpot(game.state.jackpot.pools);
  if (game.kind === 'cluster') ui.setPouchJackpot(game.state.pouchJackpot.pools);
  ui.setFreeSpinBadge(game.freeSpinsLeft);
  if (!game.busy) ui.setBetButtons(section().settings.betIdx, affordableBetIdx());
}

function selectMode(modeKey) {
  game.mode = MODES[modeKey];
  section().settings.mode = modeKey;
  ui.renderModeTabs(modeKey);
  renderReels(ui.reelsHost(), game.mode, drawStops(game.mode.strips));
  syncMeters();
  storage.save(game.state);
}

function changeBet(nextIdx) {
  section().settings.betIdx = nextIdx;
  game.lineBet = BETS[nextIdx];
  syncMeters();
  storage.save(game.state);
}

// 캐스케이딩 게임은 모드가 없다. 릴만 그려 두고 탭 줄을 숨긴다.
function setupCascade() {
  renderReels(ui.reelsHost(), PHARAOH, drawStops(PHARAOH.strips));
  ui.setCharge(section().charge);
  syncMeters();
  storage.save(game.state);
}

// 덩어리 게임도 모드가 없다.
function setupCluster() {
  renderReels(ui.reelsHost(), POUCH, drawStops(POUCH.strips));
  syncMeters();
  storage.save(game.state);
}

// 가변 릴 게임. 첫 화면에도 높이를 뽑아 둬야 릴이 빈 채로 남지 않는다.
function setupGate() {
  game.gateHeights = drawHeights();
  game.gateWays = 0;
  renderReels(ui.reelsHost(), GATE, drawStops(GATE.strips), game.gateHeights);
  showGateWays();
  syncMeters();
  storage.save(game.state);
}

// 이번 판에 열린 경로 수를 띄운다. 직전보다 늘었으면 한 번 튀어오른다.
function showGateWays() {
  const ways = game.gateHeights.reduce((product, rows) => product * rows, 1);
  ui.setWays(ways, game.gateWays);
  game.gateWays = ways;
}

// 족보 게임. 고 단계는 스핀을 넘겨 이어지므로 들어올 때 저장값을 그대로 띄운다.
function setupHwatu() {
  renderReels(ui.reelsHost(), HWATU, drawStops(HWATU.strips));
  ui.setGo(section().go);
  syncMeters();
  storage.save(game.state);
}

// ── 스핀 ──────────────────────────────────

// 잭팟 적중이면 티어와 금액을 여기서 확정하고 그 티어 풀을 시드로 리셋한다.
function resolveJackpot(result) {
  if (game.kind === 'cluster') return resolvePouchJackpot(result);
  if (!result.jackpot.hit) return null;
  const tier = drawJackpotTier();
  const amount = game.state.jackpot.pools[tier];
  game.state.jackpot.pools[tier] = JACKPOT_TIERS[tier].seed;
  return { kind: 'pick', tier, amount, tiles: buildPickTiles(tier), hits: [{ tier, amount }] };
}

// 복주머니: 어느 등급이 터졌는지는 적립이 지점에 닿는 순간 이미 정해졌다.
// 뽑기가 없으므로 여기서는 금액만 합친다.
function resolvePouchJackpot(result) {
  const hits = result.pouchHits;
  if (hits.length === 0) return null;
  const amount = Math.round(hits.reduce((sum, hit) => sum + hit.amount, 0));
  // 둘 이상 터지는 일은 계산상 가능하지만 사실상 없다. 대표 등급은 큰 쪽으로 두고
  // 금액은 합쳐 준다. 빠뜨리면 준 돈과 기록이 어긋난다.
  const tier = hits.reduce((best, hit) => (hit.amount > best.amount ? hit : best)).tier;
  return { kind: 'burst', tier, amount, tiles: null, hits };
}

// 등급 이름표. 게임마다 잭팟 표가 다르다.
function jackpotTierLabel(tier) {
  return game.kind === 'cluster' ? POUCH_JACKPOT.tiers[tier].label : JACKPOT_TIERS[tier].label;
}

// 이 게임/모드에서 공유 잭팟이 터질 수 있는가. 적립 여부를 이 값으로 가른다.
// 복주머니는 자기 풀을 쓰므로 공유 풀에 적립하지 않는다.
function canWinJackpot() {
  return game.kind === 'cascade' || (game.kind === 'lines' && game.mode.jackpot);
}

function contributeJackpot(totalBet) {
  const before = { ...game.state.jackpot.pools };
  for (const key of JACKPOT_TIER_KEYS) {
    game.state.jackpot.pools[key] += totalBet * JACKPOT_CONTRIB_RATE * JACKPOT_TIERS[key].contribShare;
  }
  ui.rollJackpot(before, game.state.jackpot.pools, JACKPOT_ROLL_MS / animationSpeed());
}

// 복주머니 잭팟 적립. 풀이 미리 정해 둔 지점에 닿으면 그 등급이 터진다.
// 적립과 적중 판정이 한 함수에 있는 이유: 이 잭팟은 적립의 결과로만 터진다.
function contributePouchPool(totalBet, feed) {
  const before = { ...game.state.pouchJackpot.pools };
  const next = contributePouch({
    pools: game.state.pouchJackpot.pools,
    hitPoints: game.state.pouchJackpot.hitPoints,
    totalBet,
    feed,
  });
  game.state.pouchJackpot = { pools: next.pools, hitPoints: next.hitPoints };
  // 터진 등급은 풀이 이미 시드로 되돌아갔다. 화면은 터지기 직전 금액까지 올려 둬야
  // 팡 하는 연출이 가득 찬 주머니에서 시작한다. 되돌리는 건 연출이 끝난 뒤다.
  const shown = { ...next.pools };
  for (const hit of next.hits) shown[hit.tier] = hit.amount;
  ui.rollPouchJackpot(before, shown, JACKPOT_ROLL_MS / animationSpeed());
  // 어느 주머니가 채워졌는지 보여 준다. 숫자만 굴러가면 눈에 안 띈다.
  if (feed !== null) ui.flashVessel(feed.tier);
  return next.hits;
}

function recordStats(result, payout) {
  const stats = section().stats;
  stats.spins += 1;
  if (!result.freeSpin) stats.totalWagered += result.totalBet;
  stats.totalWon += payout.totalWin;
  if (result.freeSpinsAwarded > 0 && !result.freeSpin) stats.freeSpinsTriggered += 1;
  if (payout.totalWin > stats.bestWin) {
    stats.bestWin = payout.totalWin;
    stats.bestWinAt = Date.now();
  }
  if (payout.totalWin > 0) {
    stats.currentDrySpell = 0;
  } else {
    stats.currentDrySpell += 1;
    stats.longestDrySpell = Math.max(stats.longestDrySpell, stats.currentDrySpell);
  }
}

function recordWinHistory(result, payout) {
  if (payout.jackpot !== null) {
    // 등급마다 한 줄씩 남긴다. 복주머니는 한 스핀에 둘이 터질 수도 있다.
    for (const hit of payout.jackpot.hits) {
      storage.addJackpotRecord(section(), {
        nickname: game.state.player.nickname,
        amount: Math.round(hit.amount),
        tier: hit.tier,
        mode: result.modeKey,
        bet: result.totalBet,
        at: Date.now(),
      });
    }
  }
  if (payout.tier === 'big' || payout.tier === 'mega') {
    storage.addBigWinRecord(section(), {
      nickname: game.state.player.nickname,
      amount: payout.totalWin,
      mode: result.modeKey,
      bet: result.totalBet,
      multiple: payout.totalWin / result.totalBet,
      at: Date.now(),
    });
  }
}

function readoutText(result, payout) {
  if (payout.jackpot !== null) {
    const label = payout.jackpot.hits.map((hit) => jackpotTierLabel(hit.tier)).join(', ');
    return `${label} 잭팟 당첨. ${ui.formatCoins(payout.jackpot.amount)} 코인. 총 ${ui.formatCoins(payout.totalWin)} 코인 획득.`;
  }
  if (result.cluster !== undefined) {
    if (payout.totalWin === 0) return '당첨 없음';
    const parts = result.cluster.wins.map((win) => `${SYMBOLS[win.symbol].label} ${win.size}칸`);
    const bead = result.cluster.beadMult > 1 ? ` 금구슬 ${result.cluster.beadMult}배.` : '';
    return `${parts.join(', ')}.${bead} ${ui.formatCoins(payout.totalWin)} 코인 획득.`;
  }
  if (result.cascade !== undefined) {
    if (payout.totalWin === 0) return '당첨 없음';
    const free = result.freeSpinsAwarded > 0 ? ` 공짜 스핀 ${result.freeSpinsAwarded}번 획득.` : '';
    return `연속 당첨 ${result.cascade.chain}번. ${ui.formatCoins(payout.totalWin)} 코인 획득.${free}`;
  }
  if (result.gate !== undefined) {
    const ways = `경로 ${result.gate.ways.toLocaleString('ko-KR')}가지.`;
    if (payout.totalWin === 0) return `${ways} 당첨 없음`;
    const free = result.freeSpinsAwarded > 0 ? ` 공짜 스핀 ${result.freeSpinsAwarded}번 획득.` : '';
    return `${ways} 연속 당첨 ${result.gate.chain}번. ${ui.formatCoins(payout.totalWin)} 코인 획득.${free}`;
  }
  if (result.hwatu !== undefined) {
    if (payout.totalWin === 0) return `당첨 없음. 고 단계가 0으로 돌아갑니다.`;
    const names = result.hwatu.hands.map((hand) => `${hand.label} ${hand.pay}배`).join(', ');
    const go = result.hwatu.go > 0 ? ` ${result.hwatu.go}고로 ${result.hwatu.goMultiple}배.` : '';
    return `${names}.${go} ${ui.formatCoins(payout.totalWin)} 코인 획득. 다음 판은 ${result.hwatu.nextGo}고입니다.`;
  }
  const parts = result.lineWins.map(
    (win) => `${SYMBOLS[win.symbol].label} ${win.count}개 ${win.lineIndex + 1}번 줄`,
  );
  if (result.hold != null) {
    parts.push(`골드 코인 ${result.hold.coins.length}개, ${result.hold.payMultiple}배`);
  }
  if (result.scatter !== null) parts.push(`${SYMBOLS[SCATTER].label} ${result.scatter.count}개`);
  if (parts.length === 0) return '당첨 없음';
  const free = result.freeSpinsAwarded > 0 ? ` 공짜 스핀 ${result.freeSpinsAwarded}번 획득.` : '';
  return `${parts.join(', ')}. ${ui.formatCoins(payout.totalWin)} 코인 획득.${free}`;
}

// 프리스핀을 준 심볼이 몇 개였나. 게임마다 그 수를 담는 자리가 다르다.
function scatterCountOf(result) {
  if (result.cascade !== undefined) return result.cascade.scatters;
  if (result.gate !== undefined) return result.gate.scatters;
  return result.scatter.count;
}

function resultMessage(result, payout) {
  if (payout.jackpot !== null) {
    const label = payout.jackpot.hits.map((hit) => jackpotTierLabel(hit.tier)).join(' + ');
    return `${label} 잭팟! ${ui.formatCoins(payout.jackpot.amount)} 획득`;
  }
  if (result.freeSpinsAwarded > 0) {
    const count = scatterCountOf(result);
    return `흩어진 심볼 ${count}개! 공짜 스핀 ${result.freeSpinsAwarded}번`;
  }
  if (payout.totalWin === 0) return '';
  if (result.cluster !== undefined) {
    const bead = result.cluster.beadMult > 1 ? ` · 금구슬 ×${result.cluster.beadMult}` : '';
    return `${result.cluster.wins.length}덩어리 당첨${bead} · ${ui.formatCoins(payout.totalWin)}`;
  }
  if (result.cascade !== undefined) {
    return `연속 당첨 ${result.cascade.chain}번 · ${ui.formatCoins(payout.totalWin)}`;
  }
  if (result.gate !== undefined) {
    return `${result.gate.ways.toLocaleString('ko-KR')}경로 · 연속 ${result.gate.chain}번 · ${ui.formatCoins(payout.totalWin)}`;
  }
  if (result.hwatu !== undefined) {
    const go = result.hwatu.go > 0 ? ` · ${result.hwatu.go}고 ×${result.hwatu.goMultiple}` : '';
    return `${result.hwatu.hands.map((hand) => hand.label).join(' + ')}${go} · ${ui.formatCoins(payout.totalWin)}`;
  }
  if (result.hold != null) {
    return `골드 코인 ${result.hold.coins.length}개 · ${ui.formatCoins(payout.totalWin)}`;
  }
  return `${result.lineWins.length}줄 당첨 · ${ui.formatCoins(payout.totalWin)}`;
}

// 꽝이면 아무 연출도 하지 않는다. 조용히 다음 스핀을 받는다.
async function presentWin(result, payout, coinsBeforeWin) {
  if (payout.totalWin === 0) return;
  const speed = presentationSpeed();
  const effects = !reducedMotion.matches;
  const tier = payout.jackpot === null ? payout.tier : 'jackpot';

  // 당첨이 확정된 순간: 섬광 → 캐비닛 흔들림 → 마퀴·프레임 고속 점등
  if (effects) {
    ui.flashWindow(tier, speed);
    ui.shakeCabinet(tier, speed);
    ui.celebrate(TIMING.celebrateHold / speed);
  }

  // 빅윈 이상은 전용 사운드가 있으므로 일반 당첨음을 겹치지 않게 한다.
  if (tier === 'win') audio.playWin();
  if (result.hwatu !== undefined) {
    // 화투는 금화 대신 꽃잎이 흩날린다
    if (effects) ui.spawnPetals(EFFECTS.petals[tier] ?? 0, TIMING.petalLife);
    await ui.playHwatuHands(result.hwatu.hands, {
      speed,
      instant: reducedMotion.matches,
      onHand: () => audio.playLineTick(),
    });
    // 고 배수가 붙었으면 그 사실을 한 번 크게 보여 준다
    if (result.hwatu.goMultiple > 1) {
      audio.playGo();
      ui.showBigWin(`${result.hwatu.go}고 · ${result.hwatu.goMultiple}배!`, {
        speed, tier: 'big', effects, coins: false,
      });
      if (effects) ui.spawnPetals(EFFECTS.petals.big, TIMING.petalLife);
      if (effects) await delay(TIMING.goStamp / speed);
    }
  } else if (result.cluster === undefined) {
    await ui.playLineWins(result.lineWins, result.scatter, {
      speed,
      instant: reducedMotion.matches,
      onLine: () => audio.playLineTick(),
    });
  } else {
    await ui.playClusterWins(result.cluster.wins, {
      speed,
      instant: reducedMotion.matches,
      onWin: () => audio.playLineTick(),
    });
    // 구슬이 붙었으면 배수를 한 번 크게 보여 준다. 없으면 이 줄을 건너뛴다.
    if (result.cluster.beadMult > 1) {
      audio.playBeadHit();
      ui.showBigWin(`금구슬 ×${result.cluster.beadMult}!`, { speed, tier: 'big', effects });
      if (effects) await delay(TIMING.beadHold / speed);
    }
  }

  if (result.freeSpinsAwarded > 0) {
    ui.showBigWin(`공짜 스핀 ${result.freeSpinsAwarded}번 획득!`, { speed, tier: 'free', effects });
  }
  if (result.hold != null && result.hold.full) {
    ui.showBigWin('15칸 전부 채움! 잭팟 뽑기', { speed, tier: 'big', effects });
  }

  if (payout.jackpot !== null && payout.jackpot.kind === 'burst') {
    // 복주머니는 뽑기가 없다. 가득 찬 주머니가 그대로 팡 터진다.
    audio.duckMusic(TIMING.countUpMega / speed / 1000);
    // 동전 쏟아지는 소리를 먼저 깔고 그 위에서 주머니가 터진다.
    audio.playJackpot();
    if (effects) {
      await ui.revealJackpotBar(TIMING.pouchReveal / speed);
      for (const hit of payout.jackpot.hits) {
        await ui.burstVessel(hit.tier, TIMING.pouchBurst / speed);
      }
    }
    await ui.showJackpot(game.state.player.nickname, payout.jackpot.amount, {
      speed,
      effects,
      tierLabel: payout.jackpot.hits.map((hit) => jackpotTierLabel(hit.tier)).join(' + '),
    });
  } else if (payout.jackpot !== null) {
    // 티어가 확정된 뒤 픽 화면을 연다. 뒤집는 순서는 결과를 바꾸지 않는다.
    audio.duckMusic(TIMING.countUpMega / speed / 1000);
    await ui.openPickBonus({
      tiles: payout.jackpot.tiles,
      pools: { ...game.state.jackpot.pools, [payout.jackpot.tier]: payout.jackpot.amount },
      speed,
      effects,
    });
    audio.playJackpot();
    ui.flashJackpotTier(payout.jackpot.tier, TIMING.countUpMega / speed);
    await ui.showJackpot(game.state.player.nickname, payout.jackpot.amount, {
      speed,
      effects,
      tierLabel: jackpotTierLabel(payout.jackpot.tier),
    });
  } else if (tier === 'mega') {
    audio.duckMusic(TIMING.countUpMega / speed / 1000);
    audio.playBigWin('mega');
    await ui.showMegaWin(payout.totalWin, { speed, effects });
  } else if (tier === 'big') {
    audio.duckMusic(TIMING.bannerHold / speed / 1000);
    audio.playBigWin();
    // 배너는 카운트업과 나란히 진행된다.
    ui.showBigWin(`빅 윈 ${Math.floor(payout.totalWin / result.totalBet)}배!`, { speed, tier: 'big', effects });
  }

  await ui.countUpCredit(coinsBeforeWin, game.state.wallet.coins, countUpDuration(payout, result), () =>
    audio.playCountTick(),
  );
}

// 모션 최소화 설정이면 릴을 돌리지 않고 결과를 즉시 보여준다.
async function revealSpin(spin) {
  if (reducedMotion.matches) {
    renderReels(ui.reelsHost(), spec(), spin.stops, heights());
    return;
  }
  const lastReel = spec().reels - 1;
  audio.startReelLoop();
  await spinReels(ui.reelsHost(), spec(), spin, {
    turbo: game.state.settings.turbo,
    heights: heights(),
    onAnticipate: () => audio.playAnticipation(),
    onReelStop: (reel) => {
      if (reel === lastReel) audio.stopReelLoop();
      audio.playReelStop();
    },
  });
}

// 페이라인 게임 한 스핀
function drawLines(isFree) {
  const stops = drawStops(game.mode.strips);
  const grid = buildGrid(game.mode.strips, stops, game.mode.rows);
  const result = evaluateSpin({
    modeKey: game.mode.key,
    grid,
    lineBet: game.lineBet,
    freeSpin: isFree,
  });

  // 홀드 앤 스핀도 스핀 시작 시점에 전부 확정한다. 리스핀 연출은 이 결과를 재생만 한다.
  const hold =
    game.mode.hold === true && triggered(grid)
      ? spinHold({ grid, reels: game.mode.reels, rows: game.mode.rows })
      : null;
  const holdWin = hold === null ? 0 : hold.payMultiple * result.totalBet;

  return {
    ...result,
    hold,
    totalWin: result.totalWin + holdWin,
    // 15칸을 다 채우면 다이아 경로와 같은 픽 보너스를 연다.
    jackpot: { ...result.jackpot, hit: result.jackpot.hit || (hold !== null && hold.full) },
    spin: { stops, grid },
  };
}

// 홀드 앤 스핀을 재생한다. 남은 리스핀과 모인 배수를 배지에 띄운다.
async function playHoldBonus(result) {
  const speed = presentationSpeed();
  ui.setHoldScreen(true);
  audio.duckMusic(0.6);
  await playHold(ui.reelsHost(), game.mode, result.hold, {
    speed,
    instant: reducedMotion.matches,
    onStep: ({ held, respinsLeft, added, done }) => {
      const sum = result.hold.coins
        .slice(0, held)
        .reduce((total, coin) => total + coin.mult, 0);
      ui.setHoldBadge(done ? null : `리스핀 ${respinsLeft}`);
      ui.setMessage(`골드 코인 ${held}개 · ${sum}배`, true);
      if (added.length > 0) audio.playReelStop();
    },
  });
  if (!reducedMotion.matches) await delay(TIMING.holdFinish / speed);
  ui.setHoldScreen(false);
  // 트리거 당시 화면으로 되돌린다. 홀드 판을 그대로 두면 이어지는
  // 라인 하이라이트가 엉뚱한 칸을 짚는다.
  renderReels(ui.reelsHost(), game.mode, result.spin.stops);
}

// 덩어리 게임 한 스핀. 격자와 당첨이 전부 여기서 확정된다.
// 잭팟은 적립의 결과이므로 적립에서 나온 hits를 그대로 싣는다.
// 덩어리 게임 한 스핀의 순수 부분. 격자와 당첨, 그리고 어느 주머니를 채울지가
// 여기서 확정된다. 적립은 격자에 달려 있으므로 격자를 먼저 뽑아야 한다.
function drawClusterSpin(totalBet) {
  const stops = drawStops(POUCH.strips);
  const beads = drawBeads({ reels: POUCH.reels, rows: POUCH.rows });
  const result = spinCluster({ stops, totalBet, beads });
  return { stops, result, feed: pouchFeed(countPouches(result.grid)) };
}

// 그 위에 적립 결과를 얹어 스핀 결과로 만든다.
function clusterResult(spin, totalBet, pouchHits) {
  return {
    modeKey: POUCH.key,
    totalBet,
    freeSpin: false,
    lineWins: [],
    scatter: null,
    freeSpinsAwarded: 0,
    totalWin: spin.result.totalWin,
    jackpot: { hit: pouchHits.length > 0 },
    cluster: spin.result,
    pouchFeed: spin.feed,
    pouchHits,
    spin: { stops: spin.stops, grid: spin.result.grid },
  };
}

// 캐스케이딩 게임 한 스핀. 연쇄 전체가 여기서 확정된다.
function drawCascade(isFree, totalBet) {
  const stops = drawStops(PHARAOH.strips);
  // 부적 게이지는 스핀을 넘겨 이어진다. 들어온 값으로 시작해 나온 값을 다시 저장한다.
  const result = spinCascade({ stops, totalBet, freeSpin: isFree, charge: section().charge });
  return {
    modeKey: PHARAOH.key,
    totalBet,
    freeSpin: isFree,
    lineWins: [],
    scatter: null,
    freeSpinsAwarded: result.freeSpinsAwarded,
    totalWin: result.totalWin,
    jackpot: result.jackpot,
    cascade: result,
    spin: { stops, grid: result.initialGrid },
  };
}

// 가변 릴 게임 한 스핀. 릴 높이와 연쇄 전체가 여기서 확정된다.
function drawGate(isFree, totalBet) {
  const stops = drawStops(GATE.strips);
  const result = spinGate({ stops, heights: game.gateHeights, totalBet, freeSpin: isFree });
  return {
    modeKey: GATE.key,
    totalBet,
    freeSpin: isFree,
    lineWins: [],
    scatter: null,
    freeSpinsAwarded: result.freeSpinsAwarded,
    totalWin: result.totalWin,
    jackpot: { hit: false },
    gate: result,
    spin: { stops, grid: result.initialGrid },
  };
}

// 연쇄를 단계별로 재생한다. 파라오와 같은 구조지만 릴 높이를 함께 넘긴다.
async function playGateSteps(result) {
  const speed = presentationSpeed();
  await playCascade(ui.reelsHost(), GATE, result.gate.steps, {
    speed,
    instant: reducedMotion.matches,
    heights: result.gate.heights,
    onStep: (step) => {
      const ways = step.wins.reduce((sum, win) => sum + win.ways, 0);
      ui.setChainBadge(`연속 ${step.chain}번째 · ${step.chainMultiplier}배 · ${ways}경로`);
      audio.playLineTick();
    },
  });
}

// 족보 게임 한 스핀. 고 단계를 물려 돌린다 — 들어온 값으로 곱하고 나온 값을 저장한다.
function drawHwatu(totalBet) {
  const stops = drawStops(HWATU.strips);
  const result = spinHwatu({ stops, totalBet, go: section().go });
  return {
    modeKey: HWATU.key,
    totalBet,
    freeSpin: false,
    lineWins: [],
    scatter: null,
    freeSpinsAwarded: 0,
    totalWin: result.totalWin,
    jackpot: { hit: false },
    hwatu: result,
    spin: { stops, grid: result.grid },
  };
}

// 고 결과를 저장하고 화면에 반영한다. 결과는 이미 확정돼 있고 값을 옮길 뿐이다.
function syncGo(result) {
  const before = result.hwatu.go;
  section().go = result.hwatu.nextGo;
  ui.setGo(result.hwatu.nextGo, before);
}

// 게이지 결과를 저장하고 화면에 반영한다. 결과는 이미 확정돼 있고 값을 옮길 뿐이다.
function syncCharge(result) {
  section().charge = result.cascade.charge;
  ui.setCharge(result.cascade.charge);
}

// 연쇄를 단계별로 재생한다. 각 단계의 ways와 배수를 배지에 띄운다.
async function playCascadeSteps(result) {
  const speed = presentationSpeed();
  await playCascade(ui.reelsHost(), PHARAOH, result.cascade.steps, {
    speed,
    instant: reducedMotion.matches,
    onStep: (step) => {
      if (step.charge !== undefined) {
        ui.setChainBadge('부적 발동 · 호루스의 눈 강림');
        ui.flashCharge(TIMING.chargeDrop);
        ui.setCharge(0);
        audio.playCharge();
        return;
      }
      const ways = step.wins.reduce((sum, win) => sum + win.ways, 0);
      ui.setChainBadge(`연속 ${step.chain}번째 · ${step.chainMultiplier}배 · ${ways}경로`);
      audio.playLineTick();
    },
  });
}

async function runSpin() {
  const isFree = game.freeSpinsLeft > 0;
  const totalBet = currentTotalBet();
  if (!isFree && game.state.wallet.coins < totalBet) {
    ui.toast('코인이 부족합니다. 충전 버튼을 눌러 주세요.');
    stopAuto();
    return false;
  }

  clearHighlights(ui.reelsHost());
  clearBeads(ui.reelsHost());
  ui.clearLines();
  ui.setWin(0);
  ui.setMessage(isFree ? `공짜 스핀 ${game.freeSpinsLeft}번 남음 · 당첨금 2배` : '', true);

  // 덩어리 게임의 복주머니 적립은 격자에 달려 있다. 어느 주머니가 채워질지가
  // 화면에 나온 복주머니 심볼 개수로 정해지므로 격자를 먼저 뽑는다.
  const clusterSpin = game.kind === 'cluster' ? drawClusterSpin(totalBet) : null;

  // 릴 높이는 스핀마다 새로 뽑는다. 릴이 돌기 시작하는 프레임에 이미 정해져 있어야
  // 연출이 결과를 바꾸는 일이 없다.
  if (game.kind === 'gate') {
    game.gateHeights = drawHeights();
    showGateWays();
  }

  let pouchHits = [];
  if (isFree) {
    setFreeSpins(game.freeSpinsLeft - 1);
  } else {
    game.state.wallet.coins -= totalBet;
    // 프리스핀은 적립하지 않는다. 잭팟이 터질 수 없는 모드도 적립하지 않는다.
    // (클래식·9라인에서 적립하면 맞출 수 없는 돈을 내는 셈이 되어 환수율이 1%p 낮아진다)
    if (canWinJackpot()) contributeJackpot(totalBet);
    if (clusterSpin !== null) pouchHits = contributePouchPool(totalBet, clusterSpin.feed);
  }
  ui.setCredit(game.state.wallet.coins);
  ui.setBet(totalBet, betNote(BETS[section().settings.betIdx]));
  ui.setChainBadge(null);

  // 결과는 여기서 완전히 확정된다. 이후 연출은 이 결과를 보여줄 뿐이다.
  const result =
    game.kind === 'cascade' ? drawCascade(isFree, totalBet)
    : game.kind === 'gate' ? drawGate(isFree, totalBet)
    : game.kind === 'hwatu' ? drawHwatu(totalBet)
    : clusterSpin !== null ? clusterResult(clusterSpin, totalBet, pouchHits)
    : drawLines(isFree);
  // 잭팟 티어까지 여기서 확정된다. 픽 화면은 이 결과를 보여주는 연출일 뿐이다.
  const jackpot = resolveJackpot(result);
  const totalWin = result.totalWin + (jackpot === null ? 0 : jackpot.amount);
  const payout = { totalWin, jackpot, tier: winTierOf(totalWin, result.totalBet) };

  await revealSpin(result.spin);
  if (result.cascade !== undefined) syncCharge(result);
  // 고 단계는 릴이 멈춘 뒤에 올린다. 배수는 이미 적용된 값이고 여기서 보여 주는 것은
  // "다음 판의 단계"다. 스핀 전에 올리면 이번 판에 쓴 배수와 화면이 어긋난다.
  if (result.hwatu !== undefined) syncGo(result);
  // 금구슬은 릴이 멈춘 뒤 격자 위에 얹는다. 결과는 이미 확정돼 있고 보여 주기만 한다.
  if (result.cluster !== undefined && result.cluster.beads.length > 0) {
    markBeads(ui.reelsHost(), result.cluster.beads);
    audio.playBead();
  }
  if (result.cascade !== undefined) await playCascadeSteps(result);
  if (result.gate !== undefined) await playGateSteps(result);
  if (result.hold != null) await playHoldBonus(result);

  const coinsBeforeWin = game.state.wallet.coins;
  game.state.wallet.coins += payout.totalWin;
  // 프리스핀 배지와 전용 화면은 연출을 기다리지 않고 획득 즉시 바뀐다.
  setFreeSpins(game.freeSpinsLeft + result.freeSpinsAwarded);
  recordStats(result, payout);
  recordWinHistory(result, payout);

  ui.setWin(payout.totalWin);
  ui.setMessage(resultMessage(result, payout));
  ui.setReadout(readoutText(result, payout));

  // 스핀 1회당 저장은 여기 한 번뿐이다. 자동스핀 중에도 같다.
  storage.save(game.state);

  await presentWin(result, payout, coinsBeforeWin);
  syncMeters();
  return true;
}

function hasPendingSpin() {
  return game.freeSpinsLeft > 0 || game.auto;
}

async function runSpinLoop() {
  if (game.looping) return;
  game.looping = true;
  game.busy = true;
  ui.setBusy(true, game.auto);

  let running = true;
  while (running) {
    // 프리스핀은 자동 스핀 횟수를 소모하지 않는다.
    const wasFree = game.freeSpinsLeft > 0;
    running = await runSpin();
    if (running && !wasFree) consumeAuto();
    if (!running || !hasPendingSpin()) break;
    await delay(TIMING.autoSpinGap / animationSpeed());
  }

  game.busy = false;
  game.looping = false;
  ui.setBusy(false, game.auto);
  syncMeters();
}

function stopAuto() {
  game.auto = false;
  game.autoLeft = null;
  ui.setAutoButton(false);
}

// 유료 스핀 1회를 소모한다. 무한(null)은 줄지 않는다.
function consumeAuto() {
  if (!game.auto || game.autoLeft === null) return;
  game.autoLeft -= 1;
  if (game.autoLeft <= 0) {
    stopAuto();
    return;
  }
  ui.setAutoButton(true, game.autoLeft);
}

function startAuto(count) {
  game.auto = true;
  game.autoLeft = count;
  ui.setAutoButton(true, count);
  game.loopPromise = runSpinLoop();
}

function toggleAuto() {
  if (game.auto) {
    stopAuto();
    return;
  }
  if (ui.autoPickOpen()) {
    ui.closeAutoPick();
    return;
  }
  ui.openAutoPick(startAuto);
}

// ── 닉네임 ────────────────────────────────

// 무엇이 잘못됐는지 그대로 알려준다. 모호한 "오류"를 쓰지 않는다.
function validateNickname(raw) {
  const value = raw.trim();
  const length = Array.from(value).length;
  if (length === 0) {
    return { value, error: '닉네임을 입력해 주세요. 공백만으로는 만들 수 없습니다.' };
  }
  if (length < NICKNAME_RULES.min) {
    return { value, error: `${NICKNAME_RULES.min}자 이상이어야 합니다. 지금 ${length}자입니다.` };
  }
  if (length > NICKNAME_RULES.max) {
    return { value, error: `${NICKNAME_RULES.max}자 이하여야 합니다. 지금 ${length}자입니다.` };
  }
  return { value, error: null };
}

function saveNickname(raw) {
  const { value, error } = validateNickname(raw);
  if (error !== null) return error;
  game.state.player.nickname = value;
  storage.save(game.state);
  ui.setSeat(value);
  return null;
}

function openSettings() {
  ui.openSettings({
    nickname: game.state.player.nickname,
    turbo: game.state.settings.turbo,
    sound: game.state.settings.sound,
    music: game.state.settings.music,
    ambience: game.state.settings.ambience,
    onNickname: (raw) => {
      const error = saveNickname(raw);
      if (error === null) ui.toast('닉네임을 변경했습니다. 기존 기록은 그대로 유지됩니다.');
      return error;
    },
    onTurbo: (on) => {
      game.state.settings.turbo = on;
      storage.save(game.state);
    },
    onSound: (on) => {
      setSound(on);
    },
    onMusic: (on) => {
      setMusic(on);
    },
    onAmbience: (on) => {
      setAmbience(on);
    },
    onReset: () => {
      const ok = window.confirm('코인·통계·잭팟 기록·닉네임이 모두 지워집니다. 초기화할까요?');
      if (!ok) return;
      storage.reset();
      window.location.reload();
    },
  });
}

function setSound(on) {
  game.state.settings.sound = on;
  audio.setEnabled(on);
  // 이 함수는 사용자 조작에서만 호출되므로 여기서 컨텍스트를 만들어도 제스처 안이다.
  if (on) audio.unlock();
  ui.setSoundButton(on);
  storage.save(game.state);
}

// 배경음은 효과음 마스터에 종속된다. 소리가 꺼져 있으면 컨텍스트가 없어 재생되지 않는다.
function setMusic(on) {
  game.state.settings.music = on;
  audio.setMusicEnabled(on);
  storage.save(game.state);
}

// 홀 생활소음. 배경음과 따로 켜고 끈다.
function setAmbience(on) {
  game.state.settings.ambience = on;
  audio.setAmbienceEnabled(on);
  storage.save(game.state);
}

// ── 어트랙트 모드 ─────────────────────────
// 실제 캐비닛은 손을 떼면 혼자 돌며 손님을 부른다.
// 데모일 뿐이므로 코인을 건드리지 않고 판정도 하지 않는다. 통계와 저장도 없다.

function canAttract() {
  return (
    !ui.el.cabinet.hidden &&
    !game.busy &&
    !game.auto &&
    !game.attract &&
    game.freeSpinsLeft === 0 &&
    document.querySelector('.modal, .tour, .pick, .overlay') === null
  );
}

async function runAttract() {
  if (!canAttract()) return;
  game.attract = true;
  ui.setAttract(true);
  audio.stopReelLoop();

  while (game.attract) {
    // 결과 판정 없이 스톱만 뽑아 릴을 돌린다. 소리도 내지 않는다.
    const stops = drawStops(spec().strips);
    await spinReels(ui.reelsHost(), spec(), { stops, grid: buildGrid(spec().strips, stops, spec().rows) }, {
      turbo: true,
    });
    if (!game.attract) break;
    await delay(TIMING.attractGap);
  }
}

function stopAttract() {
  if (!game.attract) return;
  game.attract = false;
  ui.setAttract(false);
  // 데모가 남긴 화면을 실제 상태로 되돌린다.
  renderReels(ui.reelsHost(), spec(), drawStops(spec().strips));
  ui.setMessage('SPIN을 눌러 시작하세요.', true);
}

function resetIdle() {
  if (game.idleTimer !== null) clearTimeout(game.idleTimer);
  stopAttract();
  game.idleTimer = setTimeout(runAttract, TIMING.attractIdle);
}

// ── 프리스핀 전용 화면 ────────────────────
// 진입하면 배경과 음악이 함께 바뀐다. 다른 세계에 들어왔다는 신호다.

// 남은 개수 변경은 전부 이 함수를 지난다. 화면 전환을 놓치지 않게 하려는 것이다.
function setFreeSpins(count) {
  const wasFree = game.freeSpinsLeft > 0;
  const isFree = count > 0;
  game.freeSpinsLeft = count;
  ui.setFreeSpinBadge(count);
  if (wasFree === isFree) return;
  ui.setFreeSpinScreen(isFree);
  audio.setMusicMode(isFree ? 'free' : 'base');
}

// ── 이벤트 배선 ───────────────────────────

// 탭을 벗어나면 배경음을 멈춘다. 돌아오면 다시 시작한다.
function wireVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.stopMusic();
      audio.stopAmbience();
      stopAttract();
      return;
    }
    audio.startMusic();
    audio.startAmbience();
    resetIdle();
  });
}

// 왼쪽에서 오른쪽으로 미는 동작: 열려 있는 것을 닫고, 없으면 이전 화면으로 간다.
// 조건을 좁게 잡아 릴을 훑거나 표를 가로로 넘기는 동작과 겹치지 않게 한다.
const SWIPE = { minX: 72, maxY: 50, maxMs: 600 };

function swipeBack() {
  if (ui.closeTopLayer()) return;
  if (!ui.el.cabinet.hidden) enterLobby();
}

function wireSwipeBack() {
  let start = null;

  document.addEventListener('pointerdown', (event) => {
    // 가로로 스크롤되는 칸(배당표 표) 안에서는 그쪽 동작이 우선이다
    start = event.target.closest('.table-scroll') === null
      ? { x: event.clientX, y: event.clientY, at: performance.now() }
      : null;
  });

  document.addEventListener('pointerup', (event) => {
    if (start === null) return;
    const dx = event.clientX - start.x;
    const dy = Math.abs(event.clientY - start.y);
    const ms = performance.now() - start.at;
    start = null;
    if (dx >= SWIPE.minX && dy <= SWIPE.maxY && ms <= SWIPE.maxMs) swipeBack();
  });

  document.addEventListener('pointercancel', () => { start = null; });
}

// 첫 제스처에서 오디오를 준비한다. 소리가 꺼져 있으면 컨텍스트를 만들지 않는다.
function wireAudioUnlock() {
  const handler = () => {
    audio.unlock();
    audio.playButton();
  };
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') === null) return;
    handler();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    handler();
  });
}

// ── 체험형 안내 ───────────────────────────

// 실제 화면 요소를 하나씩 짚는다. SPIN 단계만 직접 누르게 하고 나머지는 읽고 넘긴다.
// 게임 종류마다 당첨 규칙과 잭팟 설명이 다르다.
const TOUR_RULE = {
  lines: '맨 왼쪽부터 옆으로 같은 심볼이 <b>3개 이상</b> 이어지면 당첨입니다. ' +
    '당첨된 칸은 네모로 표시되고 당첨된 줄이 그려집니다.',
  cascade: '맨 왼쪽 칸부터 옆으로 같은 심볼이 <b>3칸 이상</b> 이어지면 당첨입니다. 위아래 위치는 상관없어요. ' +
    '당첨된 칸은 네모로 표시되고, 그 심볼이 사라지면서 새 심볼이 떨어져 또 당첨될 수 있습니다.',
  cluster: '줄이 없습니다. 같은 심볼이 <b>위아래 옆으로 붙어 5칸 이상</b> 뭉치면 당첨입니다. ' +
    '대각선은 붙은 것으로 보지 않아요. 뭉친 칸이 많을수록 받는 돈이 커집니다.',
  gate: '맨 왼쪽 칸부터 옆으로 같은 심볼이 <b>3칸 이상</b> 이어지면 당첨입니다. 위아래 위치는 상관없어요. ' +
    '이 게임은 <b>릴마다 칸 수가 매번 달라집니다</b>. 칸이 많이 열릴수록 당첨 경로가 폭발적으로 늘어나요.',
  hwatu: '줄도 위치도 보지 않습니다. 깔린 <b>열 장을 한 손으로</b> 보고 족보를 셉니다. ' +
    '성립한 족보는 모두 한 번에 받아요. 카드가 어디 있든 상관없습니다.',
};

const TOUR_JACKPOT = {
  lines: {
    target: '#jackpot-bar',
    text: '<b>쌓이는 상금</b>입니다. 돌릴 때마다 조금씩 쌓이고, 조건을 맞추면 쌓인 돈을 전부 받아요. ' +
      '럭키 캐비닛과 파라오의 문이 같은 상금을 함께 쌓습니다.',
  },
  cascade: {
    target: '#jackpot-bar',
    text: '<b>쌓이는 상금</b>입니다. 돌릴 때마다 조금씩 쌓이고, 조건을 맞추면 쌓인 돈을 전부 받아요. ' +
      '럭키 캐비닛과 파라오의 문이 같은 상금을 함께 쌓습니다.',
  },
  hwatu: {
    target: '#go',
    text: '<b>고(GO)</b>입니다. 이긴 판 다음에 한 단씩 올라가고, 배수가 1 → 2 → 3 → 5 → <b>10배</b>로 커집니다. ' +
      '못 딴 판이 나오면 0으로 돌아가요. 작은 족보도 고를 이어 가는 밑돌입니다. ' +
      '이 게임에는 쌓이는 상금이 없고, 고가 그 자리를 대신합니다.',
  },
  gate: {
    target: '#ways',
    text: '이번 판에 열린 <b>당첨 경로 수</b>입니다. 릴 여섯 개가 모두 높게 열리면 ' +
      '117,649가지까지 나옵니다. 이 게임에는 쌓이는 상금이 없고, 대신 경로 수와 연속 당첨이 배수를 키웁니다.',
  },
  cluster: {
    target: '#pouch-jackpot-bar',
    text: '<b>복주머니 심볼이 화면에 나오면</b> 그 개수만큼 큰 주머니에 돈이 쌓입니다. ' +
      '1개면 MINI, 2개면 MINOR, 3개면 MAJOR, 4개 이상이면 GRAND예요. 하나도 없으면 안 쌓입니다. ' +
      '주머니는 속이 안 보여서 얼마나 찼는지 알 수 없어요. 그래도 천장이 있어서 ' +
      '언젠가는 반드시 <b>팡</b> 하고 터집니다.',
  },
};

function tourSteps() {
  const lines = game.kind === 'lines';
  const betTarget = section().settings.betIdx === BETS.length - 1 ? '#bet-down' : '#bet-up';
  return [
    {
      target: '#reels-panel',
      text: '심볼이 돌아가는 이 칸이 <b>릴</b>입니다. 돌린 뒤 여기 멈춘 심볼로 당첨을 따집니다.',
      button: '다음',
    },
    {
      target: '#credit-meter',
      text: '<b>내 코인</b>입니다. 이 돈으로 게임합니다. 떨어지면 메뉴에서 충전할 수 있어요.',
      button: '다음',
    },
    {
      target: '#bet-label',
      text: lines
        ? '한 번 돌릴 때 <b>실제로 빠지는 돈</b>입니다. 한 줄에 거는 돈 × 줄 수라서, ' +
          '한 줄에 10,000이면 9줄이니까 90,000이 빠집니다. 아래 작은 글씨가 그 계산식이에요.'
        : `한 번 돌릴 때 <b>실제로 빠지는 돈</b>입니다. 이 게임은 줄이 없어서 기본 금액을 ` +
          `${betUnits()}칸에 한꺼번에 걸기 때문에 기본 금액의 ${betUnits()}배가 빠집니다. ` +
          '아래 작은 글씨가 그 계산식이에요.',
      button: '다음',
    },
    {
      target: betTarget,
      text: '이 버튼으로 거는 돈을 바꿉니다. 한 번 눌러 보세요. 많이 걸면 당첨금도 같이 커집니다.',
      action: true,
    },
    {
      target: '#spin',
      text: '준비됐습니다. <b>SPIN</b>을 눌러 직접 돌려 보세요.',
      action: true,
      waitSpin: true,
    },
    {
      target: '#reels-panel',
      text: TOUR_RULE[game.kind],
      button: '다음',
    },
    {
      target: '#win-meter',
      text: '이번에 딴 금액이 여기 뜹니다. 못 땄으면 0이에요. 못 따는 게 더 흔한 게 정상입니다.',
      button: '다음',
    },
    {
      target: TOUR_JACKPOT[game.kind].target,
      text: TOUR_JACKPOT[game.kind].text,
      button: '다음',
    },
    {
      target: '#auto',
      text: '<b>자동</b>을 누르면 횟수를 골라 알아서 돌려줍니다. 도중에 STOP으로 멈출 수 있어요.',
      button: '다음',
    },
    {
      target: '.marquee__settings',
      text: '규칙을 다시 보려면 이 버튼 → <b>게임 방법</b>을 누르면 됩니다. 이제 즐기세요.',
      button: '시작하기',
    },
  ];
}

async function runTour() {
  if (game.busy) return;
  stopAuto();
  const steps = tourSteps();
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const how = await ui.showTourStep({ ...step, step: index + 1, total: steps.length });
    if (how === 'skip') break;
    // 직접 돌린 단계는 스핀 연출이 끝날 때까지 기다린다.
    if (step.waitSpin === true) await game.loopPromise;
  }
  ui.closeTour();
  game.state.player.tourDoneAt = Date.now();
  storage.save(game.state);
}

function refill() {
  game.state.wallet.coins += REFILL_AMOUNT;
  game.state.wallet.totalRefills += 1;
  syncMeters();
  storage.save(game.state);
  ui.toast(`${ui.formatCoins(REFILL_AMOUNT)} 코인을 충전했습니다.`);
}

// 모달 라우팅 한 곳. 툴바와 메뉴가 같은 이름을 쓴다.
function openPanel(name) {
  if (name === 'menu') ui.openMenu();
  if (name === 'howto') {
    ui.closeModal();
    runTour();
  }
  if (name === 'paytable') ui.openPaytable(game.key, game.mode?.key);
  if (name === 'history') ui.openHistory(section());
  if (name === 'settings') openSettings();
}

function wireControls() {
  ui.el.modes.addEventListener('click', (event) => {
    const tab = event.target.closest('.mode-tab');
    if (tab === null || tab.disabled) return;
    selectMode(tab.dataset.mode);
  });

  // 탭 위젯 표준 키보드 조작: 좌우 화살표로 모드를 옮긴다.
  ui.el.modes.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (step === undefined || game.kind !== 'lines') return;
    const tabs = ui.modeTabs();
    if (tabs.some((tab) => tab.disabled)) return;
    event.preventDefault();
    const current = MODE_KEYS.indexOf(game.mode.key);
    const next = (current + step + MODE_KEYS.length) % MODE_KEYS.length;
    selectMode(MODE_KEYS[next]);
    ui.modeTabs()[next].focus();
  });

  ui.el.betDown.addEventListener('click', () => changeBet(section().settings.betIdx - 1));
  ui.el.betUp.addEventListener('click', () => changeBet(section().settings.betIdx + 1));
  ui.el.betMax.addEventListener('click', () => changeBet(affordableBetIdx()));

  // loopPromise는 체험형 안내가 "직접 돌려 보세요" 단계를 기다리는 데 쓴다.
  ui.el.spin.addEventListener('click', () => { game.loopPromise = runSpinLoop(); });
  ui.el.auto.addEventListener('click', toggleAuto);

  ui.el.autoPick.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    ui.closeAutoPick();
    ui.el.auto.focus();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!ui.autoPickOpen() || event.target.closest('.dock__auto') !== null) return;
    ui.closeAutoPick();
  });

  ui.el.refill.addEventListener('click', refill);

  ui.el.soundToggle.addEventListener('click', () => setSound(!game.state.settings.sound));

  // 스페이스바 = 스핀. 버튼·입력에 포커스가 있을 때는 그쪽 기본 동작을 방해하지 않는다.
  document.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.code !== 'Space') return;
    if (ui.el.cabinet.hidden) return;
    if (event.target.closest('button, input, textarea, select, [role="dialog"]') !== null) return;
    if (ui.autoPickOpen()) return;
    event.preventDefault();
    game.loopPromise = runSpinLoop();
  });

  // 아무 조작이 있으면 어트랙트를 멈추고 유휴 시계를 다시 센다.
  for (const type of ['pointerdown', 'keydown', 'wheel']) {
    document.addEventListener(type, resetIdle, { passive: true });
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener !== null) openPanel(opener.dataset.open);

    // 메뉴 안의 즉시 실행 항목(소리·충전)
    const actor = event.target.closest('[data-act]');
    if (actor === null) return;
    ui.closeModal();
    if (actor.dataset.act === 'sound') setSound(!game.state.settings.sound);
    if (actor.dataset.act === 'refill') refill();
  });
}

function wireOnboarding() {
  ui.el.nicknameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const { value, error } = validateNickname(ui.el.nicknameInput.value);
    ui.setFieldError(ui.el.nicknameInput, ui.el.nicknameError, error);
    if (error !== null) return;
    game.state.player.nickname = value;
    game.state.player.createdAt = Date.now();
    storage.save(game.state);
    enterLobby();
  });
}

function wireLobby() {
  ui.el.lobbyGames.addEventListener('click', (event) => {
    const card = event.target.closest('.gamecard');
    if (card === null) return;
    enterGame(card.dataset.game);
  });
  ui.el.toLobby.addEventListener('click', enterLobby);
}

function enterLobby() {
  stopAuto();
  stopAttract();
  if (game.idleTimer !== null) clearTimeout(game.idleTimer);
  ui.closeAutoPick();
  ui.setSeat(game.state.player.nickname);
  ui.renderLobby(game.state);
  ui.setJackpot(game.state.jackpot.pools);
  ui.showScreen('lobby');
}

function enterGame(gameKey) {
  game.key = gameKey;
  game.kind = GAMES[gameKey].kind;
  game.state.settings.game = gameKey;
  setFreeSpins(0);
  ui.setFreeSpinScreen(false);
  game.mode = null;

  const stored = section().settings;
  game.lineBet = BETS[stored.betIdx];

  ui.setSeat(game.state.player.nickname, GAMES[gameKey].label);
  ui.setGameTheme(gameKey);
  ui.setModesVisible(game.kind === 'lines');
  ui.setJackpotBarKind(game.kind);
  ui.setChargeVisible(game.kind === 'cascade');
  ui.setWaysVisible(game.kind === 'gate');
  ui.setGoVisible(game.kind === 'hwatu');
  ui.showScreen('cabinet');
  ui.setChainBadge(null);

  if (game.kind === 'cascade') {
    setupCascade();
  } else if (game.kind === 'cluster') {
    setupCluster();
  } else if (game.kind === 'gate') {
    setupGate();
  } else if (game.kind === 'hwatu') {
    setupHwatu();
  } else {
    const modeKey = GAMES[gameKey].modeKeys.includes(stored.mode) ? stored.mode : MODE_KEYS[1];
    selectMode(modeKey);
  }

  ui.setAutoButton(false);
  ui.setSoundButton(game.state.settings.sound);
  ui.setMessage('SPIN을 눌러 시작하세요.', true);
  ui.setWin(0);
  storage.save(game.state);

  resetIdle();

  // 처음 앉은 사람에게는 안내를 자동으로 한 번 띄운다.
  if (game.state.player.tourDoneAt === null) runTour();
}

function boot() {
  mountSymbolSprite(ui.el.sprite);
  ui.mountBulbs();
  ui.renderJackpotBar(ui.el.jackpotBar);
  ui.renderJackpotBar(ui.el.lobbyJackpots);
  ui.renderPouchVessels();
  ui.mountLobbyCreditNote();
  ui.mountGoLadder();
  ui.mountCharge();

  game.state = storage.load();
  game.key = GAME_KEYS.includes(game.state.settings.game) ? game.state.settings.game : GAME_KEYS[0];
  game.kind = GAMES[game.key].kind;
  game.lineBet = BETS[section().settings.betIdx];
  audio.setEnabled(game.state.settings.sound);
  audio.setMusicEnabled(game.state.settings.music);
  audio.setAmbienceEnabled(game.state.settings.ambience);
  wireAudioUnlock();
  wireVisibility();
  wireSwipeBack();
  wireOnboarding();
  wireLobby();
  wireControls();

  if (storage.hasPlayer(game.state)) {
    enterLobby();
    return;
  }
  ui.showScreen('onboarding');
  ui.el.nicknameInput.focus();
}

try {
  boot();
} catch (error) {
  ui.showFatal(
    '이 브라우저에서는 기록을 저장할 수 없습니다. 시크릿 모드이거나 사이트 데이터가 차단되어 있으면 저장이 막힙니다.',
  );
  throw error;
}
