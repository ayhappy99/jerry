// localStorage 읽기/쓰기와 스키마 마이그레이션만 담당한다.
// 접근 실패(스토리지 차단 등)는 여기서 삼키지 않고 그대로 throw 한다. 사용자 메시지는 main.js 한 곳에서만 만든다.

import {
  GAME_KEYS,
  HISTORY_LIMITS,
  JACKPOT_TIERS,
  JACKPOT_TIER_KEYS,
  MODE_KEYS,
  PHARAOH,
  POUCH_JACKPOT,
  POUCH_TIER_KEYS,
  SCHEMA_VERSION,
  START_COINS,
  STORAGE_KEY,
} from './config.js';
import { drawHitPoint, seedPouchHitPoints, seedPouchPools } from './cluster.js';

export function seedPools() {
  return Object.fromEntries(JACKPOT_TIER_KEYS.map((key) => [key, JACKPOT_TIERS[key].seed]));
}

// 게임 하나가 따로 쌓는 것들. 코인과 잭팟 풀은 여기 들어가지 않는다(공유).
export function defaultGameState() {
  return {
    settings: { mode: MODE_KEYS[1], betIdx: 2 },
    stats: {
      spins: 0,
      totalWagered: 0,
      totalWon: 0,
      bestWin: 0,
      bestWinAt: null,
      freeSpinsTriggered: 0,
      longestDrySpell: 0,
      currentDrySpell: 0,
    },
    jackpotHistory: [],
    bigWins: [],
    // 부적 게이지(파라오). 스핀을 넘겨 이어지므로 저장한다.
    charge: 0,
  };
}

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    player: { nickname: null, createdAt: null, tourDoneAt: null },
    wallet: { coins: START_COINS, totalRefills: 0 },
    jackpot: { pools: seedPools() },
    // 복주머니는 공유 풀을 쓰지 않는다. 자기 풀과 "터질 지점"을 따로 들고 있다.
    // 터질 지점을 저장하는 이유: 브라우저를 닫았다 열어도 천장까지의 거리가 유지돼야
    // 환수율이 계산대로 나온다. 매번 새로 뽑으면 천장이 무한히 멀어질 수 있다.
    pouchJackpot: { pools: seedPouchPools(), hitPoints: seedPouchHitPoints() },
    settings: { game: GAME_KEYS[0], sound: true, music: true, ambience: true, turbo: false },
    games: Object.fromEntries(GAME_KEYS.map((key) => [key, defaultGameState()])),
  };
}

function mergeSection(base, stored) {
  return stored === undefined || stored === null ? base : { ...base, ...stored };
}

function mergeList(base, stored) {
  return Array.isArray(stored) ? stored : base;
}

// v2 이하의 단일 풀(jackpot.pool)은 GRAND 티어로 옮긴다. 쌓아둔 금액을 버리지 않기 위한 것이다.
function mergeJackpot(base, stored) {
  if (stored === undefined || stored === null) return base;
  const pools = { ...base.pools, ...(stored.pools ?? {}) };
  if (stored.pools === undefined && typeof stored.pool === 'number') pools.grand = stored.pool;
  return { pools };
}

// 복주머니 잭팟. 풀은 시드 아래로 내려갈 수 없고, 터질 지점은 시드~천장 안이어야 한다.
// 저장된 값이 범위를 벗어나면(손으로 고쳤거나 config의 천장이 바뀐 경우) 새로 뽑는다.
function mergePouchJackpot(base, stored) {
  if (stored === undefined || stored === null) return base;
  const pools = {};
  const hitPoints = {};
  for (const key of POUCH_TIER_KEYS) {
    const tier = POUCH_JACKPOT.tiers[key];
    const pool = stored.pools?.[key];
    pools[key] = typeof pool === 'number' && pool >= tier.seed ? pool : tier.seed;
    const point = stored.hitPoints?.[key];
    const inRange = typeof point === 'number' && point > tier.seed && point <= tier.mustHitBy;
    hitPoints[key] = inRange ? point : drawHitPoint(key);
  }
  return { pools, hitPoints };
}

// 전역 설정은 아는 키만 가져온다. v3 이하의 mode/betIdx가 섞여 들어오지 않게 하려는 것이다.
function mergeGlobalSettings(base, stored) {
  if (stored === undefined || stored === null) return base;
  return {
    game: GAME_KEYS.includes(stored.game) ? stored.game : base.game,
    sound: stored.sound ?? base.sound,
    music: stored.music ?? base.music,
    ambience: stored.ambience ?? base.ambience,
    turbo: stored.turbo ?? base.turbo,
  };
}

function mergeGameSection(base, stored) {
  const charge = stored?.charge;
  return {
    settings: mergeSection(base.settings, stored?.settings),
    stats: mergeSection(base.stats, stored?.stats),
    jackpotHistory: mergeList(base.jackpotHistory, stored?.jackpotHistory),
    bigWins: mergeList(base.bigWins, stored?.bigWins),
    // 손으로 고친 값이나 용량이 줄어든 경우를 걸러 낸다
    charge: Number.isInteger(charge) && charge >= 0 && charge < PHARAOH.charge.capacity
      ? charge
      : base.charge,
  };
}

function mergeGames(base, stored) {
  return Object.fromEntries(
    GAME_KEYS.map((key) => [key, mergeGameSection(base[key], stored?.[key])]),
  );
}

// 스키마 버전이 달라도 기존 데이터를 날리지 않는다. 누락된 필드만 기본값으로 채운다.
function migrate(stored) {
  const base = defaultState();
  const games = mergeGames(base.games, stored.games);

  // v3 이하에는 게임이 하나뿐이었다. 최상위 설정·통계·기록을 첫 게임으로 옮긴다.
  if (stored.games === undefined) {
    const first = GAME_KEYS[0];
    games[first] = mergeGameSection(base.games[first], {
      settings: stored.settings,
      stats: stored.stats,
      jackpotHistory: stored.jackpotHistory,
      bigWins: stored.bigWins,
    });
  }

  return {
    schema: SCHEMA_VERSION,
    player: mergeSection(base.player, stored.player),
    wallet: mergeSection(base.wallet, stored.wallet),
    jackpot: mergeJackpot(base.jackpot, stored.jackpot),
    pouchJackpot: mergePouchJackpot(base.pouchJackpot, stored.pouchJackpot),
    settings: mergeGlobalSettings(base.settings, stored.settings),
    games,
  };
}

export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return defaultState();
  return migrate(JSON.parse(raw));
}

export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 저장된 상태의 일부 섹션만 갱신한다.
export function patch(partial) {
  const next = { ...load(), ...partial };
  save(next);
  return next;
}

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
}

// 최신 항목을 앞에 넣고 상한을 넘으면 오래된 것부터 버린다.
export function pushHistory(list, entry, limit) {
  return [entry, ...list].slice(0, limit);
}

// 기록은 게임별 섹션에 쌓는다.
export function addJackpotRecord(section, entry) {
  section.jackpotHistory = pushHistory(section.jackpotHistory, entry, HISTORY_LIMITS.jackpotHistory);
}

export function addBigWinRecord(section, entry) {
  section.bigWins = pushHistory(section.bigWins, entry, HISTORY_LIMITS.bigWins);
}

export function hasPlayer(state) {
  return typeof state.player.nickname === 'string' && state.player.nickname.length > 0;
}
