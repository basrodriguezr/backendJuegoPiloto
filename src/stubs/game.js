import { MATCH_PAYTABLES, PAY_SYMBOLS, getMatchMultiplier } from "./paytable.js";

const LEVEL_ONE_SIZE = { rows: 3, cols: 5 };
const LEVEL_TWO_SIZE = { rows: 7, cols: 5 };
const MAX_CASCADES = 20;
const BONUS_TRIGGER_SYMBOL = "N";
const BONUS_LEVEL_ONE_MULTIPLIERS = [2, 3, 5, 8];
const BONUS_LEVEL_TWO_MULTIPLIERS = [4, 6, 8, 10, 12, 16, 20, 30, 40];
const BONUS_MAX_ROUNDS = 25;
const BET_VALUES = [200, 300, 400, 500, 1000, 2000, 5000, 10000];
const JACKPOTS = { mayor: 34906, menor: 3700 };
const AVAILABLE_MODES = ["nivel1", "nivel2", "pack"];
const PACK_LEVELS = ["nivel1", "nivel2"];

const COMMON_WEIGHTS = [
  { symbol: "A", weight: 6 },
  { symbol: "B", weight: 6 },
  { symbol: "C", weight: 6 },
  { symbol: "D", weight: 6 },
  { symbol: "E", weight: 2 },
  { symbol: "F", weight: 2 },
  { symbol: "G", weight: 2 },
  { symbol: "H", weight: 2 },
  { symbol: "I", weight: 2 },
  { symbol: "J", weight: 2 },
  { symbol: "K", weight: 2 },
  { symbol: "L", weight: 2 },
  { symbol: "M", weight: 2 },
  { symbol: "N", weight: 2 }
];

const LEVEL_ONE_WEIGHTS = COMMON_WEIGHTS;
const LEVEL_TWO_WEIGHTS = COMMON_WEIGHTS;

const PAYTABLE_ENTRIES = MATCH_PAYTABLES.map((entry) => ({
  symbol: entry.symbol,
  minCluster: 3,
  win: entry.matches[0] ? entry.matches[0].multiplier : 0
}));

function pickSymbol(weights) {
  const total = weights.reduce((acc, item) => acc + item.weight, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (const item of weights) {
    acc += item.weight;
    if (roll <= acc) {
      return item.symbol;
    }
  }
  return weights[weights.length - 1] ? weights[weights.length - 1].symbol : PAY_SYMBOLS[0];
}

function buildGrid(rows, cols, weights) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => pickSymbol(weights))
  );
}

function countSymbolOnGrid(grid, symbol) {
  return grid.reduce((acc, row) => acc + row.filter((cell) => cell === symbol).length, 0);
}

function buildBonusData(mode, triggerCount) {
  const multipliers = mode === "nivel1" ? BONUS_LEVEL_ONE_MULTIPLIERS : BONUS_LEVEL_TWO_MULTIPLIERS;
  return {
    mode,
    triggerCount,
    prizeMultipliers: multipliers,
    endCode: "TERMINO_DE_BONUS",
    maxRounds: BONUS_MAX_ROUNDS
  };
}

function findClusters(grid, { includeDiagonals = false } = {}) {
  const rows = grid.length;
  const cols = grid[0] ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const clusters = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (visited[row][col]) continue;
      const symbol = grid[row][col];
      if (!symbol) {
        visited[row][col] = true;
        continue;
      }

      const queue = [{ row, col }];
      const cells = [];
      visited[row][col] = true;

      while (queue.length > 0) {
        const current = queue.pop();
        if (!current) continue;
        cells.push(current);

        const neighbors = [
          { row: current.row - 1, col: current.col },
          { row: current.row + 1, col: current.col },
          { row: current.row, col: current.col - 1 },
          { row: current.row, col: current.col + 1 }
        ];
        if (includeDiagonals) {
          neighbors.push(
            { row: current.row - 1, col: current.col - 1 },
            { row: current.row - 1, col: current.col + 1 },
            { row: current.row + 1, col: current.col - 1 },
            { row: current.row + 1, col: current.col + 1 }
          );
        }

        neighbors.forEach((next) => {
          if (
            next.row >= 0 &&
            next.row < rows &&
            next.col >= 0 &&
            next.col < cols &&
            !visited[next.row][next.col] &&
            grid[next.row][next.col] === symbol
          ) {
            visited[next.row][next.col] = true;
            queue.push(next);
          }
        });
      }

      if (cells.length >= 3) {
        clusters.push({ symbol, cells });
      }
    }
  }

  return clusters;
}

function applyCascadeStep(grid, step) {
  const rows = grid.length;
  const cols = grid[0] ? grid[0].length : 0;
  const removed = new Set(step.removeCells.map((cell) => `${cell.row}-${cell.col}`));

  const result = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

  for (let col = 0; col < cols; col += 1) {
    const survivors = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      const key = `${row}-${col}`;
      if (!removed.has(key)) {
        survivors.push(grid[row][col]);
      }
    }

    const drop = step.dropIn.find((d) => d.col === col)?.symbols ?? [];
    let writeRow = rows - 1;

    survivors.forEach((symbol) => {
      if (writeRow >= 0) {
        result[writeRow][col] = symbol;
        writeRow -= 1;
      }
    });

    for (let i = drop.length - 1; i >= 0; i -= 1) {
      if (writeRow >= 0) {
        result[writeRow][col] = drop[i];
        writeRow -= 1;
      }
    }
  }

  return result;
}

function applyReplaceStep(grid, removeCells, weights) {
  const result = grid.map((row) => [...row]);
  removeCells.forEach((cell) => {
    result[cell.row][cell.col] = pickSymbol(weights);
  });
  return result;
}

function buildCascades(
  grid0,
  weights,
  bet,
  { includeDiagonals = false, fillMode = "cascade", bonusMode = "nivel1" } = {}
) {
  const cascades = [];
  let totalWin = 0;
  let grid = grid0;

  for (let stepIndex = 0; stepIndex < MAX_CASCADES; stepIndex += 1) {
    const bonusCount = countSymbolOnGrid(grid, BONUS_TRIGGER_SYMBOL);
    const shouldTriggerBonus = bonusMode === "nivel1" ? bonusCount >= 1 : bonusCount >= 3;
    if (shouldTriggerBonus) {
      cascades.push({
        removeCells: [],
        dropIn: [],
        winStep: 0,
        bonus: true,
        bonusData: buildBonusData(bonusMode, bonusCount),
        gridAfter: grid
      });
      break;
    }

    const clusters = findClusters(grid, { includeDiagonals });
    if (clusters.length === 0) break;

    clusters.sort((a, b) => {
      const symbolCompare = a.symbol.localeCompare(b.symbol);
      if (symbolCompare !== 0) return symbolCompare;
      const aCell = a.cells[0];
      const bCell = b.cells[0];
      if (!aCell || !bCell) return 0;
      if (aCell.row !== bCell.row) return aCell.row - bCell.row;
      return aCell.col - bCell.col;
    });

    const targetCluster = clusters[0];
    const removeCells = targetCluster.cells;
    const removedByCol = new Map();
    removeCells.forEach((cell) => {
      removedByCol.set(cell.col, (removedByCol.get(cell.col) ?? 0) + 1);
    });
    let dropIn = [];
    let nextGrid;

    if (fillMode === "replace") {
      nextGrid = applyReplaceStep(grid, removeCells, weights);
    } else {
      dropIn = Array.from(removedByCol.entries()).map(([col, count]) => ({
        col,
        symbols: Array.from({ length: count }, () => pickSymbol(weights))
      }));
      nextGrid = applyCascadeStep(grid, { removeCells, dropIn });
    }

    const multiplier = getMatchMultiplier(targetCluster.symbol, targetCluster.cells.length);
    const winStep = multiplier <= 0 ? 0 : Math.round(bet * multiplier);

    cascades.push({ removeCells, dropIn, winStep, gridAfter: nextGrid });
    totalWin += winStep;
    grid = nextGrid;
  }

  return { cascades, totalWin };
}

export function buildConfig({ clientCode, companyCode, gameCode }) {
  return {
    clientCode,
    companyCode,
    gameCode,
    money: {
      currency: "$",
      decimals: 0,
      decimalSeparator: ",",
      thousandSeparator: "."
    },
    betOptions: {
      minBet: BET_VALUES[0],
      maxBet: BET_VALUES[BET_VALUES.length - 1],
      step: 100
    },
    betValues: BET_VALUES,
    jackpots: JACKPOTS,
    availableModes: AVAILABLE_MODES,
    packLevels: PACK_LEVELS,
    modes: [
      {
        code: "nivel1",
        enabled: true,
        weights: LEVEL_ONE_WEIGHTS,
        paytable: PAYTABLE_ENTRIES
      },
      {
        code: "nivel2",
        enabled: true,
        weights: LEVEL_TWO_WEIGHTS,
        paytable: PAYTABLE_ENTRIES
      }
    ],
    packSizes: [5, 10, 15, 20],
    board: {
      rows: LEVEL_TWO_SIZE.rows,
      cols: LEVEL_TWO_SIZE.cols,
      symbols: PAY_SYMBOLS
    },
    symbolPaytable: MATCH_PAYTABLES,
    branding: {
      logoUrl: "/logo.svg",
      backgroundUrl: "/bg-texture.svg",
      primaryColor: "#0ea5e9",
      accentColor: "#38bdf8",
      fontFamily: "var(--font-geist-sans)"
    }
  };
}

export function buildPlayOutcome({ mode, bet }) {
  const boardMode = mode === "nivel2" ? "nivel2" : "nivel1";
  const size = boardMode === "nivel2" ? LEVEL_TWO_SIZE : LEVEL_ONE_SIZE;
  const weights = boardMode === "nivel2" ? LEVEL_TWO_WEIGHTS : LEVEL_ONE_WEIGHTS;
  const includeDiagonals = boardMode === "nivel1";
  const fillMode = boardMode === "nivel1" ? "replace" : "cascade";
  const grid0 = buildGrid(size.rows, size.cols, weights);
  const { cascades, totalWin } = buildCascades(grid0, weights, bet, {
    includeDiagonals,
    fillMode,
    bonusMode: boardMode
  });

  return {
    playId: `${mode}-${Date.now()}`,
    mode,
    bet,
    grid0,
    cascades,
    totalWin
  };
}

export function buildPackOutcome({ mode, bet, packSize, packLevel }) {
  const resolvedLevel = mode === "nivel2" ? "nivel2" : mode === "nivel1" ? "nivel1" : packLevel;
  const plays = Array.from({ length: packSize }).map((_, idx) => {
    const outcome = buildPlayOutcome({ mode: resolvedLevel, bet });
    return {
      playId: `${outcome.playId}-${idx}`,
      mode: outcome.mode,
      bet,
      ticketIndex: idx,
      grid0: outcome.grid0,
      cascades: outcome.cascades,
      totalWin: outcome.totalWin
    };
  });

  const totalWin = plays.reduce((acc, play) => acc + play.totalWin, 0);
  const bestIndex = plays.reduce((best, play, idx, list) => {
    if (play.totalWin > list[best].totalWin) {
      return idx;
    }
    return best;
  }, 0);

  return {
    packId: `${resolvedLevel}-pack-${packSize}-${Date.now()}`,
    packLevel: resolvedLevel,
    plays,
    totalBet: bet * packSize,
    totalWin,
    bestIndex
  };
}
