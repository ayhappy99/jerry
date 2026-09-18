// localStorage 읽기/쓰기와 스키마 마이그레이션만 담당한다.
// 접근 실패(스토리지 차단 등)는 여기서 삼키지 않고 그대로 throw 한다. 사용자 메시지는 main.js 한 곳에서만 만든다.

import {
  HISTORY_LIMITS,
  JACKPOT_SEED,
  MODE_KEYS,
  SCHEMA_VERSION,
  START_COINS,
  STORAGE_KEY,
} from './config.js';

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    player: { nickname: null, createdAt: null },
    wallet: { coins: START_COINS, totalRefills: 0 },
    jackpot: { pool: JACKPOT_SEED, seed: JACKPOT_SEED },
    settings: { mode: MODE_KEYS[1], betIdx: 2, sound: true, music: true, turbo: false },
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
  };
}

function mergeSection(base, stored) {
  return stored === undefined || stored === null ? base : { ...base, ...stored };
}

function mergeList(base, stored) {
  return Array.isArray(stored) ? stored : base;
}

// 스키마 버전이 달라도 기존 데이터를 날리지 않는다. 누락된 필드만 기본값으로 채운다.
function migrate(stored) {
  const base = defaultState();
  return {
    schema: SCHEMA_VERSION,
    player: mergeSection(base.player, stored.player),
    wallet: mergeSection(base.wallet, stored.wallet),
    jackpot: mergeSection(base.jackpot, stored.jackpot),
    settings: mergeSection(base.settings, stored.settings),
    stats: mergeSection(base.stats, stored.stats),
    jackpotHistory: mergeList(base.jackpotHistory, stored.jackpotHistory),
    bigWins: mergeList(base.bigWins, stored.bigWins),
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

export function addJackpotRecord(state, entry) {
  state.jackpotHistory = pushHistory(state.jackpotHistory, entry, HISTORY_LIMITS.jackpotHistory);
}

export function addBigWinRecord(state, entry) {
  state.bigWins = pushHistory(state.bigWins, entry, HISTORY_LIMITS.bigWins);
}

export function hasPlayer(state) {
  return typeof state.player.nickname === 'string' && state.player.nickname.length > 0;
}
