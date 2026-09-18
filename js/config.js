// 이 파일은 게임의 모든 밸런스 수치를 담는다.
// 배당·가중치·베팅·연출 시간은 여기서만 정의하고, 다른 파일에는 숫자를 하드코딩하지 않는다.

export const STORAGE_KEY = 'lucky-cabinet:v1';
export const SCHEMA_VERSION = 1;

export const WILD = 'crown';
export const SCATTER = 'star';

// 라인 당첨 최소 연속 개수
export const MIN_MATCH = 3;

export const SYMBOLS = {
  cherry: { key: 'cherry', label: '체리', kind: 'normal' },
  lemon: { key: 'lemon', label: '레몬', kind: 'normal' },
  bell: { key: 'bell', label: '벨', kind: 'normal' },
  bar: { key: 'bar', label: 'BAR', kind: 'normal' },
  seven: { key: 'seven', label: '세븐', kind: 'normal' },
  diamond: { key: 'diamond', label: '다이아', kind: 'normal' },
  crown: { key: 'crown', label: '크라운', kind: 'wild' },
  star: { key: 'star', label: '스타', kind: 'scatter' },
};

// 심볼 순서. 릴 스트립을 만들 때의 배치 순서이자 배당표 표시 순서다.
export const SYMBOL_ORDER = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond', 'crown', 'star'];

// 5릴 라인 배당 (라인 베팅 배수)
export const LINE_PAYS = {
  cherry: { 3: 5, 4: 15, 5: 40 },
  lemon: { 3: 5, 4: 20, 5: 60 },
  bell: { 3: 10, 4: 40, 5: 120 },
  bar: { 3: 15, 4: 60, 5: 200 },
  seven: { 3: 25, 4: 100, 5: 400 },
  diamond: { 3: 50, 4: 250, 5: 1000 },
  crown: { 3: 100, 4: 500, 5: 2000 },
};

// 클래식 3릴 배당 (라인 베팅 배수, 3개 일치)
// 레몬만 지시서 초기값 15에서 12로 낮췄다. 이유는 README의 밸런스 항목 참고.
export const CLASSIC_PAYS = {
  cherry: 10,
  lemon: 12,
  bell: 30,
  bar: 60,
  seven: 150,
  diamond: 400,
};

// 스캐터 배당 (총 베팅 배수)
export const SCATTER_PAYS = { 3: 2, 4: 10, 5: 50 };

// 페이라인. 값은 행 인덱스(0=상단)
export const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
];

export const BETS = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];

export const START_COINS = 10000000;
export const REFILL_AMOUNT = 1000000;

export const JACKPOT_SEED = 50000000;
// 매 스핀 총 베팅의 1%를 잭팟 풀에 적립한다. 프리스핀은 적립하지 않는다.
export const JACKPOT_CONTRIB_RATE = 0.01;
// 잭팟 미터는 실제 풀 값으로만 굴러간다. 화면에서만 올려 보여주는 가짜 증가는 넣지 않는다.
export const JACKPOT_ROLL_MS = 900;

export const FREE_SPIN_AWARD = 10;
export const FREE_SPIN_MULTIPLIER = 2;
export const SCATTER_MIN = 3;

// 총 베팅 배수 기준 당첨 등급
export const WIN_TIERS = { big: 20, mega: 100 };

export const HISTORY_LIMITS = { jackpotHistory: 20, bigWins: 10 };

export const NICKNAME_RULES = { min: 2, max: 12 };

export const TIMING = {
  reelSpinBase: 620,      // 1번 릴이 도는 최소 시간
  reelStagger: 200,       // 릴 간 정지 간격
  reelStopBounce: 220,    // 정지 후 오버슈트 복귀
  blurClearBefore: 200,   // 정지 직전 블러를 해제하는 구간
  anticipationExtra: 900, // 앤티시페이션 시 남은 릴이 더 도는 시간
  lineHighlight: 420,     // 라인 하나당 하이라이트 유지 시간
  lineHighlightAll: 900,  // 마지막에 전체 라인을 함께 보여주는 시간
  countUpMin: 420,
  countUpMax: 2500,
  countUpMega: 5000,
  countUpTickMs: 55,
  bannerHold: 1800,
  toast: 2600,
  turboDivisor: 3,
  // prefers-reduced-motion 에서 당첨 연출을 더 짧게 줄이는 배수
  reducedMotionDivisor: 6,
  autoSpinGap: 520,
};

// 스트립 셔플용 시드. 값이 고정이므로 릴 스트립은 항상 같다(실제 슬롯의 물리 릴과 동일).
export const STRIP_SEED = 0x9e3779b9;

// 릴 스트립을 만든다. 가중치만큼 심볼을 라운드로빈으로 배치해 같은 심볼이 뭉치지 않게 한다.
function buildOrderedStrip(weights) {
  const remaining = SYMBOL_ORDER
    .filter((key) => (weights[key] ?? 0) > 0)
    .map((key) => ({ key, left: weights[key] }));
  const strip = [];
  while (remaining.length > 0) {
    for (const entry of remaining) {
      strip.push(entry.key);
      entry.left -= 1;
    }
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      if (remaining[i].left === 0) remaining.splice(i, 1);
    }
  }
  return strip;
}

// mulberry32. 시드가 고정이라 결과가 재현된다.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 라운드로빈 배치는 심볼 순서가 그대로 보여 릴이 패턴처럼 읽힌다. 고정 시드로 한 번 섞는다.
function shuffleStrip(strip, seed) {
  const random = seededRandom(seed);
  const out = strip.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 릴마다 별도 스트립을 둔다. reelWeights는 기본 가중치에 덮어쓰는 부분 맵이다.
// 밸런스 계산기(tools/)도 이 함수로 후보 스트립을 만들기 때문에 export 한다.
export function buildStrips(reels, weights, reelWeights, seed) {
  return Array.from({ length: reels }, (_, reel) =>
    shuffleStrip(
      buildOrderedStrip({ ...weights, ...(reelWeights[reel] ?? {}) }),
      seed + reel * 0x85ebca6b,
    ),
  );
}

function defineMode(mode) {
  return {
    ...mode,
    strips: buildStrips(mode.reels, mode.weights, mode.reelWeights, STRIP_SEED + mode.seedOffset),
  };
}

export const MODE_KEYS = ['classic', 'lines9', 'bonus'];

export const MODES = {
  classic: defineMode({
    key: 'classic',
    label: '클래식 3릴',
    seedOffset: 0,
    short: '클래식',
    reels: 3,
    rows: 1,
    lines: 1,
    payKind: 'classic',
    wild: false,
    scatter: false,
    jackpot: false,
    weights: { cherry: 6, lemon: 5, bell: 4, bar: 3, seven: 2, diamond: 1 },
    reelWeights: [],
  }),
  lines9: defineMode({
    key: 'lines9',
    label: '5릴 9라인',
    seedOffset: 101,
    short: '9라인',
    reels: 5,
    rows: 3,
    lines: 9,
    payKind: 'lines',
    wild: true,
    scatter: false,
    jackpot: false,
    weights: { cherry: 16, lemon: 11, bell: 9, bar: 7, seven: 4, diamond: 3, crown: 2 },
    // 1번 릴에는 와일드를 넣지 않는다.
    reelWeights: [{ crown: 0 }],
  }),
  bonus: defineMode({
    key: 'bonus',
    label: '프리스핀·잭팟',
    seedOffset: 202,
    short: '보너스',
    reels: 5,
    rows: 3,
    lines: 9,
    payKind: 'lines',
    wild: true,
    scatter: true,
    jackpot: true,
    weights: { cherry: 12, lemon: 8, bell: 6, bar: 4, seven: 3, diamond: 2, crown: 1, star: 1 },
    reelWeights: [{ crown: 0 }],
  }),
};

export function modePaylines(mode) {
  return PAYLINES.slice(0, mode.lines);
}
