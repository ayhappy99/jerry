// 이 파일은 게임의 모든 밸런스 수치를 담는다.
// 배당·가중치·베팅·연출 시간은 여기서만 정의하고, 다른 파일에는 숫자를 하드코딩하지 않는다.

export const STORAGE_KEY = 'lucky-cabinet:v1';
// 스키마 이력. 버전이 올라가도 기존 데이터는 지우지 않고 누락 필드만 채운다.
//   1: 최초
//   2: settings.music(배경음) 추가
//   3: jackpot.pool(단일) → jackpot.pools(4단 티어별)
//   4: 게임 2종 지원. 통계·기록을 games[게임키] 아래로 분리(코인·잭팟 풀은 공유)
//   5: player.tourDoneAt(게임 방법 안내를 본 시각) 추가
//   6: settings.ambience(홀 생활소음) 추가
//   7: pouchJackpot(복주머니 전용 풀 + 터질 지점) 추가. 공유 풀과 별개다
export const SCHEMA_VERSION = 7;

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
  coin: { key: 'coin', label: '골드 코인', kind: 'hold' },
  // 복주머니 (5x5 클러스터)
  yeopjeon: { key: 'yeopjeon', label: '엽전', kind: 'normal' },
  maedeup: { key: 'maedeup', label: '매듭', kind: 'normal' },
  moran: { key: 'moran', label: '모란', kind: 'normal' },
  cheongja: { key: 'cheongja', label: '청자', kind: 'normal' },
  crane: { key: 'crane', label: '학', kind: 'normal' },
  toad: { key: 'toad', label: '금두꺼비', kind: 'normal' },
  tiger: { key: 'tiger', label: '호랑이', kind: 'normal' },
  pouch: { key: 'pouch', label: '복주머니', kind: 'wild' },
  // 파라오의 문
  ankh: { key: 'ankh', label: '앙크', kind: 'normal' },
  lotus: { key: 'lotus', label: '연꽃', kind: 'normal' },
  papyrus: { key: 'papyrus', label: '파피루스', kind: 'normal' },
  cobra: { key: 'cobra', label: '코브라', kind: 'normal' },
  falcon: { key: 'falcon', label: '매', kind: 'normal' },
  scarab: { key: 'scarab', label: '스카라베', kind: 'normal' },
  mask: { key: 'mask', label: '황금 가면', kind: 'normal' },
  eye: { key: 'eye', label: '호루스의 눈', kind: 'wild' },
  obelisk: { key: 'obelisk', label: '오벨리스크', kind: 'scatter' },
  rank10: { key: 'rank10', label: '10', kind: 'normal' },
  rankj: { key: 'rankj', label: 'J', kind: 'normal' },
  rankq: { key: 'rankq', label: 'Q', kind: 'normal' },
  rankk: { key: 'rankk', label: 'K', kind: 'normal' },
  ranka: { key: 'ranka', label: 'A', kind: 'normal' },
};

// 심볼 순서. 릴 스트립을 만들 때의 배치 순서이자 배당표 표시 순서다.
// 게임별 스트립은 자기 weights에 있는 키만 쓰므로 두 게임의 심볼을 한 배열에 둬도 섞이지 않는다.
export const SYMBOL_ORDER = [
  'cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond', 'crown', 'star', 'coin',
  'rank10', 'rankj', 'rankq', 'rankk', 'ranka',
  'ankh', 'lotus', 'papyrus', 'cobra', 'falcon', 'scarab', 'mask', 'eye', 'obelisk',
  'yeopjeon', 'maedeup', 'moran', 'cheongja', 'crane', 'toad', 'tiger', 'pouch',
];

// 5릴 라인 배당 (라인 베팅 배수)
export const LINE_PAYS = {
  cherry: { 3: 6, 4: 18, 5: 40 },
  lemon: { 3: 6, 4: 20, 5: 60 },
  bell: { 3: 12, 4: 40, 5: 120 },
  bar: { 3: 18, 4: 60, 5: 200 },
  seven: { 3: 30, 4: 120, 5: 400 },
  diamond: { 3: 60, 4: 300, 5: 1200 },
  crown: { 3: 120, 4: 600, 5: 2000 },
};

// 클래식 3릴 배당 (라인 베팅 배수, 3개 일치)
// 레몬만 지시서 초기값 15에서 12로 낮췄다. 이유는 README의 밸런스 항목 참고.
export const CLASSIC_PAYS = {
  cherry: 12,
  lemon: 15,
  bell: 30,
  bar: 60,
  seven: 150,
  diamond: 500,
};

// 스캐터 배당 (총 베팅 배수)
export const SCATTER_PAYS = { 3: 2, 4: 12, 5: 60 };

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

// 자동 스핀 횟수 선택지. null은 무한이며, 남은 횟수는 프리스핀으로는 줄지 않는다.
export const AUTO_SPINS = [10, 25, 50, 100, null];

export const START_COINS = 10000000;
export const REFILL_AMOUNT = 1000000;

// 4단 프로그레시브 잭팟.
// contribShare: 적립분 1%를 티어별로 나누는 비율. pickWeight: 픽 보너스에서 티어가 뽑힐 가중치.
// 적립 비율을 추첨 가중치보다 크게 두면 그 티어의 평균 풀이 커진다.
// 평균 풀 비율은 (contribShare / pickWeight)에 비례하므로 GRAND가 가장 크게 쌓인다.
// 잭팟이 20배 자주 터지게 만든 대신 시드를 3.75배 낮췄다. 시드는 매 적중마다
// 공짜로 나가는 돈이라 빈도와 곱해져 환수율에 바로 들어간다. 30,000,000을 그대로 두고
// 빈도만 올리면 시드 효과 하나가 26%p를 먹는다.
export const JACKPOT_TIERS = {
  grand: { key: 'grand', label: 'GRAND', seed: 8000000, contribShare: 0.5, pickWeight: 8 },
  major: { key: 'major', label: 'MAJOR', seed: 2000000, contribShare: 0.25, pickWeight: 16 },
  minor: { key: 'minor', label: 'MINOR', seed: 800000, contribShare: 0.15, pickWeight: 30 },
  mini: { key: 'mini', label: 'MINI', seed: 300000, contribShare: 0.1, pickWeight: 46 },
};

// 잭팟 트리거: 한 라인에 순수 다이아가 이 개수 이상(와일드 대체 불인정).
// 5 → 4 → 3으로 두 번 낮췄다. 4개는 1/17,334로 한 자리에 앉아 있는 동안 사실상
// 볼 수 없었다. 3개면 1/867이다. 릴 스트립과 라인 배당은 건드리지 않으므로
// 라인 RTP는 그대로고, 늘어난 적중 빈도는 시드 효과로만 환수율에 들어온다.
export const JACKPOT_SYMBOL = 'diamond';
export const JACKPOT_MATCH = 3;

export const JACKPOT_TIER_KEYS = ['grand', 'major', 'minor', 'mini'];

// 픽 보너스: 타일 9장(3×3) 중 같은 티어 3개를 모으면 그 티어 당첨.
// 당첨 티어만 3개를 넣고 나머지 세 티어는 2개씩 넣는다(3 + 2×3 = 9).
// 그래서 당첨 티어 외에는 3개가 모일 수 없고 결과가 모호해지지 않는다.
export const PICK_TILES = 9;
export const PICK_MATCH = 3;

// 골드 코인 홀드 앤 스핀.
// 코인이 trigger개 이상 나오면 그 코인이 자리에 고정되고 빈 칸만 다시 돈다.
// 새 코인이 하나라도 붙으면 남은 횟수가 respins로 초기화된다. 0이 되면 끝난다.
// 15칸(5 x 3)을 모두 채우면 GRAND 잭팟을 받는다.
//
// 코인 심볼은 라인 배당이 없다. LINE_PAYS에 없으므로 engine의 linePayOf가 0을 돌려주고
// 왼쪽부터 세는 연속을 끊는다. 즉 코인을 스트립에 넣으면 라인 환수율이 저절로 내려간다.
// 그 내려간 몫을 홀드 앤 스핀이 되돌려 받는 구조다(tools/hold-sim.mjs로 균형점을 찾았다).
export const HOLD = {
  symbol: 'coin',
  // 트리거 개수. 6개로 두면 1/2,300으로 사실상 볼 수 없고, 4개로 두면 1/41로 너무 잦다.
  trigger: 5,
  respins: 3,
  // 리스핀에서 빈 칸 하나에 코인이 붙을 확률.
  // 이 값이 모이는 코인 수와 전 칸 채움 빈도를 함께 정한다(0.05에서 평균 7.76개, 전 칸 1/200,000).
  cellOdds: 0.05,
  // 코인 값 = 총 베팅 배수. weight는 뽑힐 가중치다.
  // 평균 7.78배. 이 값은 "홀드 앤 스핀이 채워야 할 몫 24.78%"에서 역산했다
  // (24.78% ÷ 트리거 1/242 ÷ 평균 7.76개 = 7.74배).
  values: [
    { mult: 1, weight: 26 },
    { mult: 2, weight: 18 },
    { mult: 3, weight: 13 },
    { mult: 5, weight: 13 },
    { mult: 10, weight: 15 },
    { mult: 20, weight: 11 },
    { mult: 50, weight: 5 },
  ],
};

// 매 스핀 총 베팅의 1%를 잭팟 풀에 적립한다. 프리스핀은 적립하지 않는다.
export const JACKPOT_CONTRIB_RATE = 0.01;
// 잭팟 미터는 실제 풀 값으로만 굴러간다. 화면에서만 올려 보여주는 가짜 증가는 넣지 않는다.
export const JACKPOT_ROLL_MS = 900;

export const FREE_SPIN_AWARD = 10;
export const FREE_SPIN_MULTIPLIER = 2;
export const SCATTER_MIN = 3;

// 총 베팅 배수 기준 당첨 등급
export const WIN_TIERS = { big: 20, mega: 100 };

// 당첨 등급별 연출 세기. 코인 파티클 개수와 흔들림 강도(px).
export const EFFECTS = {
  coinRain: { win: 0, big: 24, mega: 34, jackpot: 40 },
  coinFountain: { win: 0, big: 16, mega: 26, jackpot: 32 },
  shakePx: { win: 3, big: 7, mega: 12, jackpot: 14 },
  // 섬광 세기. 일반 당첨은 자주 나오므로 약하게 터뜨린다.
  flashPeak: { win: 0.4, big: 0.72, mega: 0.95, jackpot: 1 },
  // 오버레이가 오래 열려 있는 동안 금화를 다시 쏟는 주기. 한 파동의 수명보다 길게 잡아
  // 파동이 겹쳐 노드가 쌓이지 않게 한다.
  coinWaveMs: 2200,
  coinLifeMs: 2400,
};

export const HISTORY_LIMITS = { jackpotHistory: 20, bigWins: 10 };

export const NICKNAME_RULES = { min: 2, max: 12 };

export const TIMING = {
  cascadeHold: 620,       // 연쇄 당첨을 보여주는 시간
  cascadePop: 260,        // 당첨 심볼이 터지는 시간
  cascadeDrop: 300,       // 새 심볼이 내려오는 시간
  reelSpinBase: 620,      // 1번 릴이 도는 최소 시간
  reelStagger: 200,       // 릴 간 정지 간격
  reelStopBounce: 220,    // 정지 후 오버슈트 복귀
  blurClearBefore: 200,   // 정지 직전 블러를 해제하는 구간
  anticipationExtra: 900, // 앤티시페이션 시 남은 릴이 더 도는 시간
  lineHighlight: 420,     // 라인 하나당 하이라이트 유지 시간
  lineHighlightAll: 1100, // 마지막에 전체 라인을 함께 보여주는 시간
  lineDraw: 300,          // 라인 경로를 그려 나가는 시간
  flash: 280,             // 당첨 확정 순간의 섬광
  shake: 460,             // 캐비닛 흔들림
  burst: 640,             // 당첨 셀에서 퍼지는 링
  celebrateHold: 1600,    // 마퀴 전구 고속 점등 유지 시간
  countUpMin: 420,
  countUpMax: 2500,
  countUpMega: 5000,
  countUpTickMs: 55,
  bannerHold: 1800,
  toast: 2600,

  // 홀드 앤 스핀
  holdEnter: 1000,        // 트리거 코인을 보여주는 시간
  holdRoll: 460,          // 빈 칸이 도는 시간
  holdReveal: 380,        // 새로 붙은 코인을 보여주는 시간
  holdFinish: 1200,       // 합계를 보여주는 시간

  clusterHold: 640,       // 덩어리 당첨을 보여주는 시간
  clusterGap: 220,        // 다음 덩어리로 넘어가는 간격
  beadHold: 1100,         // 금구슬 배수를 보여 주는 시간
  vesselFeed: 900,        // 채워진 주머니를 밝히는 시간
  pouchReveal: 420,       // 잭팟 바를 화면 안으로 들이는 시간
  pouchBurst: 1100,       // 복주머니가 팡 하고 터지는 시간

  // 어트랙트 모드: 실제 캐비닛처럼 손을 떼면 혼자 돌며 손님을 부른다.
  attractIdle: 30000,
  attractGap: 1400,
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

// 밸런스 탐색 도구가 가중치만 바꿔 같은 방식으로 모드를 다시 만들 수 있게 열어 둔다.
// 도구가 스트립 생성을 따로 구현하면 게임과 어긋날 수 있다.
export function rebuildMode(mode, weights) {
  return {
    ...mode,
    weights,
    strips: buildStrips(mode.reels, weights, mode.reelWeights, STRIP_SEED + mode.seedOffset),
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
    hold: true,
    // 코인 3개. 코인은 라인 배당이 없어 연속을 끊으므로, 가중치를 올리면 라인 환수율이
    // 내려가고 홀드 앤 스핀 트리거가 올라간다. 3에서 라인 62.92% / 트리거 1/242로
    // 적중률 33%를 지키면서 보너스를 볼 수 있는 빈도가 나왔다.
    weights: {
      cherry: 12, lemon: 8, bell: 6, bar: 4, seven: 3, diamond: 2, crown: 1, star: 1, coin: 3,
    },
    reelWeights: [{ crown: 0 }],
  }),
};

export function modePaylines(mode) {
  return PAYLINES.slice(0, mode.lines);
}

// ── 파라오의 문 (6릴 올웨이즈 캐스케이딩) ──
// 라인이 없으므로 배당은 "총 베팅 배수 × ways"다. ways는 왼쪽부터 연속된 릴에서
// 해당 심볼이 나온 개수의 곱이다(6릴 4행이면 최대 4^6 = 4096 ways).
// 연쇄가 이어질 때마다 배수가 올라가고, JACKPOT_CHAIN단에 닿으면 픽 보너스가 열린다.
export const PHARAOH = {
  key: 'pharaoh',
  reels: 6,
  rows: 4,
  wild: 'eye',
  scatter: 'obelisk',
  minMatch: 3,
  // 총 베팅 = BETS[betIdx] × betUnits
  betUnits: 10,
  symbolOrder: [
    'rank10', 'rankj', 'rankq', 'rankk', 'ranka',
    'ankh', 'lotus', 'papyrus', 'cobra', 'falcon', 'scarab', 'mask', 'eye', 'obelisk',
  ],
  // ways당 총 베팅 배수. 실측 계수로 맞춘 확정값은 README의 밸런스 항목 참고.
  pays: {
    rank10: { 3: 0.01, 4: 0.06, 5: 0.25, 6: 1 },
    rankj: { 3: 0.02, 4: 0.08, 5: 0.3, 6: 1.2 },
    rankq: { 3: 0.03, 4: 0.1, 5: 0.3, 6: 1.2 },
    rankk: { 3: 0.03, 4: 0.12, 5: 0.4, 6: 1.5 },
    ranka: { 3: 0.05, 4: 0.15, 5: 0.5, 6: 1.8 },
    ankh: { 3: 0.06, 4: 0.18, 5: 0.6, 6: 3 },
    lotus: { 3: 0.06, 4: 0.25, 5: 0.6, 6: 3 },
    papyrus: { 3: 0.06, 4: 0.25, 5: 1, 6: 4 },
    cobra: { 3: 0.1, 4: 0.3, 5: 1.5, 6: 6 },
    falcon: { 3: 0.15, 4: 0.5, 5: 2, 6: 10 },
    scarab: { 3: 0.25, 4: 0.8, 5: 3, 6: 15 },
    mask: { 3: 0.5, 4: 2, 5: 6, 6: 40 },
  },
  // 스캐터는 위치 무관, 개수로만 판정 (총 베팅 배수).
  // 가중치가 2라 한 릴에 2개까지 보일 수 있어 최대 12개다. 그 이상 키는 없다.
  scatterMin: 4,
  scatterPays: { 4: 2, 5: 5, 6: 15, 7: 40, 8: 100, 9: 200, 10: 400, 11: 800, 12: 2000 },
  freeSpins: 10,
  freeMultiplier: 2,
  // 연쇄 단계별 배수. 마지막 값 이후로는 그 값을 유지한다.
  multipliers: [1, 2, 3, 5, 8, 12],
  // 이 단계에 닿으면 잭팟 픽 보너스가 열린다.
  // 5단은 1/488로 너무 잦아 공유 시드 효과가 +10%p까지 치솟았다. 7단은 1/13,748로
  // 캐비닛의 잭팟 빈도(1/12,664)와 비슷해 시드 효과가 +0.37%p에 머문다.
  jackpotChain: 5,
  // 연쇄 상한. 게임 규칙이며 여기서 연쇄를 멈춘다. 실측에서 이 값에 닿는 경우는 없었다.
  maxChain: 30,
  weights: {
    rank10: 7, rankj: 7, rankq: 6, rankk: 6, ranka: 6,
    ankh: 5, lotus: 5, papyrus: 4, cobra: 4, falcon: 3, scarab: 3, mask: 2,
    eye: 3, obelisk: 2,
  },
  // 1번 릴에는 와일드를 넣지 않는다.
  reelWeights: [{ eye: 0 }],
  seedOffset: 303,
};

PHARAOH.strips = buildStrips(
  PHARAOH.reels,
  PHARAOH.weights,
  PHARAOH.reelWeights,
  STRIP_SEED + PHARAOH.seedOffset,
);

// ── 복주머니 (5x5 클러스터) ────────────────
// 줄도 릴 경계도 없다. 상하좌우로 붙은 같은 심볼이 minCluster개 이상 뭉치면 당첨이다.
// 복주머니(와일드)는 어느 덩어리에도 붙어 두 덩어리를 하나로 이어 준다.
// 배당은 덩어리 크기 구간별 총 베팅 배수다.
//
// 클러스터 판정은 격자 전체 모양에 의존해 전수 열거가 불가능하다(8^25).
// 그래서 이 게임만 몬테카를로로 재고 표준오차를 함께 기록한다(tools/cluster-sim.mjs).
// 금구슬: 복주머니 격자 위에 떨어져 그 스핀의 당첨 합에 배수를 곱한다.
// 릴 심볼이 아니라 격자 위에 얹는 층이다. 심볼로 넣으면 스트립 구성이 바뀌어
// 덩어리가 생기는 확률까지 흔들린다. 층으로 두면 덩어리 확률은 그대로이고
// 배당만 배수 기대값으로 나누면 환수율이 정확히 유지된다.
//
// 배수 기대값 = Σ P(개수) × (개수 × 평균 배수), 개수 0이면 1.
// 평균 배수 4.415, 기대값 1.353. 덩어리 배당을 이 값으로 나눠 맞췄다.
// 구슬이 실제로 당첨에 곱해지는 건 스핀의 9% × 적중률 33.7% = 3%뿐이다.
// 드물게 터져야 큰 배수가 의미를 갖는다.
export const BEADS = {
  counts: [
    { count: 0, weight: 91 },
    { count: 1, weight: 8 },
    { count: 2, weight: 1 },
  ],
  values: [
    { mult: 2, weight: 45 },
    { mult: 3, weight: 28 },
    { mult: 5, weight: 17 },
    { mult: 10, weight: 7 },
    { mult: 25, weight: 2.5 },
    { mult: 100, weight: 0.5 },
  ],
};

export const POUCH = {
  key: 'pouch',
  reels: 5,
  rows: 5,
  wild: 'pouch',
  minCluster: 5,
  // 총 베팅 = BETS[betIdx] × betUnits
  betUnits: 20,
  // 덩어리 크기 구간. 5/6/7/8~9/10~11/12~14/15칸 이상
  sizeBands: [5, 6, 7, 8, 9, 10, 12],
  // 배당은 총 베팅 배수다. 300만 스핀으로 (심볼, 구간)별 계수를 재고
  // 목표 92.06%에 맞춰 역산한 값이다(tools/cluster-sim.mjs, README 밸런스 항목).
  // 잭팟 몫 6.0%를 빼고 남는 99.0%를 덩어리가 채운다.
  // 금구슬 배수 기대값 1.3515를 이미 반영한 값이다. 배당표에 배율을 걸고 보기 좋은
  // 값으로 스냅한 뒤 개별 배당을 한 칸씩 움직이는 그리디로 맞췄다.
  // 사다리 단조성은 세로(개수)·가로(심볼) 둘 다 검사한다.
  pays: {
    yeopjeon: { 5: 0.8, 6: 1.5, 7: 1.8, 8: 2, 9: 4, 10: 5, 12: 12 },
    maedeup: { 5: 0.8, 6: 1.5, 7: 2, 8: 4, 9: 6, 10: 8, 12: 20 },
    moran: { 5: 1.2, 6: 2, 7: 3, 8: 4, 9: 8, 10: 8, 12: 20 },
    cheongja: { 5: 1.5, 6: 2, 7: 4, 8: 6, 9: 8, 10: 15, 12: 30 },
    crane: { 5: 2, 6: 4, 7: 6, 8: 8, 9: 12, 10: 20, 12: 30 },
    toad: { 5: 3, 6: 6, 7: 8, 8: 15, 9: 20, 10: 40, 12: 100 },
    tiger: { 5: 4, 6: 8, 7: 15, 8: 20, 9: 30, 10: 40, 12: 120 },
  },
  // 가중치를 16배로 키워 스트립을 704칸으로 만든다. 44칸으로 두면 세로로 붙는 정도가
  // 스트립 배열의 우연에 지배되어, 같은 가중치인데도 심볼별 덩어리 빈도가 20배씩 흔들렸다
  // (시드 +505에서 엽전 20.2% / 매듭 1.7%). 길게 늘리면 스톱이 놓일 자리가 많아져
  // 평균화되고, 덩어리 빈도가 가중치 순서대로 정렬된다(시드를 바꿔도 안정적이다).
  weights: {
    yeopjeon: 144, maedeup: 128, moran: 112, cheongja: 96,
    crane: 80, toad: 64, tiger: 48, pouch: 32,
  },
  reelWeights: [],
  seedOffset: 404,
};

POUCH.strips = buildStrips(POUCH.reels, POUCH.weights, POUCH.reelWeights, STRIP_SEED + POUCH.seedOffset);
POUCH.symbolOrder = SYMBOL_ORDER.filter((key) => (POUCH.weights[key] ?? 0) > 0);

// 복주머니 전용 4단 잭팟. 기존 두 게임의 공유 풀과 별개다.
//
// 필수 적중(Must Hit By): 등급마다 "반드시 터지는 금액"이 정해져 있고, 실제 터지는 지점은
// (시드, 반드시터지는금액] 사이에서 균등하게 뽑힌다. 풀이 그 지점에 닿으면 그 스핀에 터진다.
export const POUCH_TIER_KEYS = ['grand', 'major', 'minor', 'mini'];

// 복주머니 잭팟은 돌릴 때마다 쌓이지 않는다. 화면에 나온 복주머니 심볼 개수로
// 어느 주머니에 쌓일지가 정해진다. 많이 나오면 큰 주머니가 채워진다.
//   1개 → MINI · 2개 → MINOR · 3개 → MAJOR · 4개 이상 → GRAND · 0개면 아무것도 안 쌓인다
// rate는 그때 그 주머니에 넣는 총 베팅 배수다.
//
// 개수별 확률은 실측값이다(200만 스핀): 1개 37.895% · 2개 21.785% · 3개 7.678% · 4개+ 2.184%.
// 등급 t의 환수율 = P(개수) x rate x (시드 + 천장) / (천장 - 시드)이고,
// 네 등급 모두 천장 = 시드 x 5라 마지막 항이 1.5다. 그래서
//   MINI  1.5 x 0.37895 x 0.018 = 1.02%
//   MINOR 1.5 x 0.21785 x 0.037 = 1.21%
//   MAJOR 1.5 x 0.07678 x 0.13  = 1.50%
//   GRAND 1.5 x 0.02184 x 0.7   = 2.29%
// 합계 6.02%. 돌릴 때마다 4%씩 쌓던 이전 방식과 환수율도, 터지는 주기도 같다
// (총 베팅 20만 기준 147 / 496 / 2,004 / 7,849스핀).
//
// 주기는 (천장 - 시드) / (2 x P x rate x 총베팅)이고 평균 지급은 주기 x 환수율 x 총베팅이다.
// 즉 환수율을 고정하면 "자주 터지는 것"과 "많이 주는 것"은 정확히 반비례한다.
// 둘을 같이 올리는 방법은 잭팟에 배정하는 환수율 자체를 올리는 것뿐이고,
// 그만큼 덩어리 배당이 내려간다.
export const POUCH_JACKPOT = {
  // 개수가 큰 것부터 둔다. 먼저 걸리는 것이 그 스핀의 주머니다.
  feed: [
    { count: 4, tier: 'grand', rate: 0.7 },
    { count: 3, tier: 'major', rate: 0.13 },
    { count: 2, tier: 'minor', rate: 0.037 },
    { count: 1, tier: 'mini', rate: 0.018 },
  ],
  tiers: {
    grand: { key: 'grand', label: 'GRAND', seed: 12000000, mustHitBy: 60000000 },
    major: { key: 'major', label: 'MAJOR', seed: 2000000, mustHitBy: 10000000 },
    minor: { key: 'minor', label: 'MINOR', seed: 400000, mustHitBy: 2000000 },
    mini: { key: 'mini', label: 'MINI', seed: 100000, mustHitBy: 500000 },
  },
};

// ── 게임 레지스트리 ───────────────────────
// 코인과 잭팟 풀은 게임 사이에 공유하고, 통계·기록은 게임별로 따로 쌓는다.
export const GAMES = {
  cabinet: {
    key: 'cabinet',
    label: '럭키 캐비닛',
    tagline: '어두운 옻칠 목재와 황동 프레임. 클래식 3릴부터 프리스핀·잭팟까지 모드 3종.',
    // 페이라인 판정 엔진을 쓴다.
    kind: 'lines',
    modeKeys: MODE_KEYS,
    badge: '3~5릴 · 모드 3종',
    // 로비 카드에 띄울 대표 심볼
    artSymbols: ['seven', 'diamond', 'crown'],
  },

  pharaoh: {
    key: 'pharaoh',
    label: '파라오의 문',
    tagline: '6릴 올웨이즈. 당첨 심볼이 무너지고 새 심볼이 내려와 연쇄가 이어진다.',
    // 올웨이즈 캐스케이딩 엔진을 쓴다.
    kind: 'cascade',
    modeKeys: [],
    badge: '6릴 4행 · 최대 4096 ways',
    artSymbols: ['mask', 'scarab', 'eye'],
  },

  pouch: {
    key: 'pouch',
    label: '복주머니',
    tagline: '5x5 덩어리 판정. 복주머니 심볼이 나온 개수만큼 큰 주머니가 채워지고, 천장에 닿으면 팡 터진다.',
    // 덩어리(클러스터) 판정 엔진을 쓴다.
    kind: 'cluster',
    modeKeys: [],
    badge: '5x5 덩어리 · 반드시 터지는 잭팟',
    artSymbols: ['pouch', 'tiger', 'toad'],
  },
};

export const GAME_KEYS = ['cabinet', 'pharaoh', 'pouch'];
