// 스핀 결과 판정. DOM을 절대 참조하지 않는 순수 함수만 둔다.
// 입력(모드, 그리드, 베팅)만 받아 결과 객체를 반환하므로 콘솔/Node에서 그대로 검증할 수 있다.

import {
  CLASSIC_PAYS,
  FREE_SPIN_AWARD,
  JACKPOT_MATCH,
  JACKPOT_SYMBOL,
  FREE_SPIN_MULTIPLIER,
  LINE_PAYS,
  MIN_MATCH,
  MODES,
  SCATTER,
  SCATTER_MIN,
  SCATTER_PAYS,
  WILD,
  WIN_TIERS,
  modePaylines,
} from './config.js';

export function totalBetOf(mode, lineBet) {
  return lineBet * mode.lines;
}

function lineSymbols(grid, line) {
  return line.map((row, reel) => grid[reel][row]);
}

// target과 같거나 와일드인 심볼이 왼쪽부터 몇 개 연속되는지 센다.
function runLength(symbols, target) {
  let count = 0;
  for (const symbol of symbols) {
    if (symbol !== target && symbol !== WILD) break;
    count += 1;
  }
  return count;
}

function linePayOf(symbol, count) {
  return LINE_PAYS[symbol]?.[count] ?? 0;
}

// 와일드는 스캐터를 제외한 모든 심볼을 대체한다.
// 대체 시 원래 심볼의 배당과 와일드 자체 배당 중 큰 쪽을 적용한다.
// 라인 하나의 심볼 배열만 받아 판정하므로 밸런스 계산기도 이 함수를 그대로 쓴다.
export function evaluateLineSymbols(symbols) {
  const candidates = [];
  const wildRun = runLength(symbols, WILD);
  if (wildRun >= MIN_MATCH) candidates.push({ symbol: WILD, count: wildRun });

  const base = symbols.find((symbol) => symbol !== WILD && symbol !== SCATTER);
  if (base !== undefined) {
    const baseRun = runLength(symbols, base);
    if (baseRun >= MIN_MATCH) candidates.push({ symbol: base, count: baseRun });
  }

  let best = null;
  for (const candidate of candidates) {
    const pay = linePayOf(candidate.symbol, candidate.count);
    if (pay > 0 && (best === null || pay > best.pay)) best = { ...candidate, pay };
  }
  return best;
}

function cellsOf(line, count) {
  return Array.from({ length: count }, (_, reel) => ({ reel, row: line[reel] }));
}

function evaluateLineMode(mode, grid, lineBet) {
  const wins = [];
  modePaylines(mode).forEach((line, lineIndex) => {
    const symbols = lineSymbols(grid, line);
    const combo = evaluateLineSymbols(symbols);
    if (combo === null) return;
    wins.push({
      lineIndex,
      symbol: combo.symbol,
      count: combo.count,
      amount: combo.pay * lineBet,
      cells: cellsOf(line, combo.count),
    });
  });
  return wins;
}

function evaluateClassicMode(mode, grid, lineBet) {
  const symbols = grid.map((reel) => reel[0]);
  const first = symbols[0];
  if (!symbols.every((symbol) => symbol === first)) return [];
  return [
    {
      lineIndex: 0,
      symbol: first,
      count: mode.reels,
      amount: CLASSIC_PAYS[first] * lineBet,
      cells: symbols.map((_, reel) => ({ reel, row: 0 })),
    },
  ];
}

function countScatters(grid) {
  let count = 0;
  for (const reel of grid) {
    for (const symbol of reel) {
      if (symbol === SCATTER) count += 1;
    }
  }
  return count;
}

function scatterCells(grid) {
  const cells = [];
  grid.forEach((reel, reelIndex) => {
    reel.forEach((symbol, row) => {
      if (symbol === SCATTER) cells.push({ reel: reelIndex, row });
    });
  });
  return cells;
}

function evaluateScatter(mode, grid, totalBet) {
  if (!mode.scatter) return null;
  const count = countScatters(grid);
  if (count < SCATTER_MIN) return null;
  return {
    count,
    amount: (SCATTER_PAYS[count] ?? 0) * totalBet,
    cells: scatterCells(grid),
    freeSpins: FREE_SPIN_AWARD,
  };
}

// 잭팟은 한 라인에 왼쪽부터 순수 다이아가 JACKPOT_MATCH개 이상. 와일드 대체는 인정하지 않는다.
function pureRunLength(symbols, target) {
  let count = 0;
  for (const symbol of symbols) {
    if (symbol !== target) break;
    count += 1;
  }
  return count;
}

function findJackpotLine(mode, grid) {
  if (!mode.jackpot) return -1;
  const lines = modePaylines(mode);
  for (let i = 0; i < lines.length; i += 1) {
    if (pureRunLength(lineSymbols(grid, lines[i]), JACKPOT_SYMBOL) >= JACKPOT_MATCH) return i;
  }
  return -1;
}

export function winTierOf(totalWin, totalBet) {
  const ratio = totalWin / totalBet;
  if (ratio >= WIN_TIERS.mega) return 'mega';
  if (ratio >= WIN_TIERS.big) return 'big';
  if (totalWin > 0) return 'win';
  return 'none';
}

/**
 * 스핀 1회를 판정한다.
 * 잭팟은 적중 여부만 판정한다. 티어와 금액은 rng.drawJackpotTier()와 현재 풀로 정해지므로
 * 이 함수의 totalWin에는 포함되지 않는다.
 * @param {{modeKey: string, grid: string[][], lineBet: number, freeSpin: boolean}} input
 */
export function evaluateSpin({ modeKey, grid, lineBet, freeSpin = false }) {
  const mode = MODES[modeKey];
  const totalBet = totalBetOf(mode, lineBet);
  const multiplier = freeSpin ? FREE_SPIN_MULTIPLIER : 1;

  const lineWins =
    mode.payKind === 'classic'
      ? evaluateClassicMode(mode, grid, lineBet)
      : evaluateLineMode(mode, grid, lineBet);
  const scatter = evaluateScatter(mode, grid, totalBet);

  const lineTotal = lineWins.reduce((sum, win) => sum + win.amount, 0);
  const scatterTotal = scatter === null ? 0 : scatter.amount;
  // 프리스핀 2배는 라인·스캐터 당첨에만 적용한다. 잭팟 풀은 풀 전액을 그대로 지급한다.
  const baseWin = (lineTotal + scatterTotal) * multiplier;

  const jackpotLine = findJackpotLine(mode, grid);

  return {
    modeKey,
    lineBet,
    totalBet,
    freeSpin,
    multiplier,
    lineWins,
    scatter,
    freeSpinsAwarded: scatter === null ? 0 : scatter.freeSpins,
    jackpot: { hit: jackpotLine !== -1, lineIndex: jackpotLine },
    baseWin,
    totalWin: baseWin,
    tier: winTierOf(baseWin, totalBet),
  };
}
