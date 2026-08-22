// deepSeekBot.js
// Imports from existing modules
import { getMovesEncode, play, UndoMove, isGameOver, winner, casesContour } from "./board.js";

// ================================
// Zobrist hashing
// ================================
function rand64() {
  const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  return (high << 32n) | low;
}

const zobristPieces = new BigUint64Array(81 * 7);
for (let i = 0; i < 81 * 7; i++) zobristPieces[i] = rand64();

const zobristCases = new BigUint64Array(81 * 3);
for (let i = 0; i < 81 * 3; i++) zobristCases[i] = rand64();

const zobristTurn = rand64();

// ================================
// Precomputed distances and square values
// ================================
const DIST_TABLE = new Uint8Array(81 * 81);
for (let i = 0; i < 81; i++) {
  for (let j = 0; j < 81; j++) {
    DIST_TABLE[81 * i + j] = dist(i, j);
  }
}
function dist(idx1, idx2) {
  return Math.max(Math.abs((idx1 % 9) - (idx2 % 9)), Math.abs(Math.floor(idx1 / 9) - Math.floor(idx2 / 9)));
}

// Piece-square values for pieces (encouraging center and opponent side)
const PSQ = new Int8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 2, 3, 4, 3, 2, 1, 0,
  0, 2, 4, 6, 8, 6, 4, 2, 0,
  0, 3, 6, 9,12, 9, 6, 3, 0,
  0, 4, 8,12,16,12, 8, 4, 0,
  0, 3, 6, 9,12, 9, 6, 3, 0,
  0, 2, 4, 6, 8, 6, 4, 2, 0,
  0, 1, 2, 3, 4, 3, 2, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0
]);

// Square control value: encourage occupying central and opponent territory
const SQ_VAL = new Int8Array([
  0, 1, 2, 3, 4, 3, 2, 1, 0,
  1, 2, 3, 4, 5, 4, 3, 2, 1,
  2, 3, 5, 6, 7, 6, 5, 3, 2,
  3, 4, 6, 8, 9, 8, 6, 4, 3,
  4, 5, 7, 9,10, 9, 7, 5, 4,
  3, 4, 6, 8, 9, 8, 6, 4, 3,
  2, 3, 5, 6, 7, 6, 5, 3, 2,
  1, 2, 3, 4, 5, 4, 3, 2, 1,
  0, 1, 2, 3, 4, 3, 2, 1, 0
]);

// ================================
// Incremental state
// ================================
const PIECE_VALUES = [0, 10, 10, 10]; // base value for rock, paper, scissors
// Capture bonus based on RPS: rock(1) beats scissors(3), scissors(3) beats paper(2), paper(2) beats rock(1)
const CAPTURE_BONUS = [
  [0, 0, 0, 0],
  [0, 0, 0, 3], // rock captures scissors +3
  [0, 2, 0, 0], // paper captures rock +2
  [0, 0, 1, 0]  // scissors captures paper +1
];

// We'll track piece positions for each type and color
let blueRock = [], bluePaper = [], blueScissor = [];
let redRock = [], redPaper = [], redScissor = [];
let blueCount = 0, redCount = 0;
let blueSquares = 0, redSquares = 0;
let blueScore = 0, redScore = 0; // material + positional

// For incremental evaluation, we maintain:
// - material score (imbalance)
// - square control score
// - mobility (we'll compute on the fly)
// - piece-square sum

// We'll recompute mobility from scratch each evaluation (fast enough)

// ================================
// Board state management with hashing
// ================================
let memFromPiece = new Int8Array(256);
let memToPiece = new Int8Array(256);
let memToCase = new Int8Array(256);
let memHash = new BigUint64Array(256);
let movePtr = 0;

function initialHash(board) {
  let hash = 0n;
  for (let i = 0; i < 81; i++) {
    hash ^= zobristCases[(i * 3) + board.cases[i] + 1];
    hash ^= zobristPieces[(i * 7) + board.pieces[i] + 3];
  }
  if (board.turn) hash ^= zobristTurn;
  board.hash = hash;
}

function initState(board) {
  // Reset counts
  blueRock = []; bluePaper = []; blueScissor = [];
  redRock = []; redPaper = []; redScissor = [];
  blueCount = 0; redCount = 0;
  blueSquares = 0; redSquares = 0;
  blueScore = 0; redScore = 0;

  const pieces = board.pieces;
  const cases = board.cases;
  for (let i = 0; i < 81; i++) {
    const p = pieces[i];
    if (p > 0) {
      blueCount++;
      if (p === 1) blueRock.push(i);
      else if (p === 2) bluePaper.push(i);
      else blueScissor.push(i);
    } else if (p < 0) {
      redCount++;
      if (p === -1) redRock.push(i);
      else if (p === -2) redPaper.push(i);
      else redScissor.push(i);
    }
    const c = cases[i];
    if (c === 1) { blueSquares++; blueScore += SQ_VAL[i]; }
    else if (c === -1) { redSquares++; redScore += SQ_VAL[80 - i]; } // mirror for red
  }
  // Compute material imbalance
  // We'll compute material score from scratch
  blueScore += computeMaterialScore(true);
  redScore += computeMaterialScore(false);
}

function computeMaterialScore(isBlue) {
  // Return material advantage for given color
  let score = 0;
  if (isBlue) {
    // Blue pieces
    let bR = blueRock.length, bP = bluePaper.length, bS = blueScissor.length;
    let rR = redRock.length, rP = redPaper.length, rS = redScissor.length;
    // Base values
    score += (bR + bP + bS) * 10;
    // Capture bonuses: blue captures red
    score += bR * (rS * 3); // rock captures scissors
    score += bP * (rR * 2); // paper captures rock
    score += bS * (rP * 1); // scissors captures paper
    // Penalty for being capturable
    score -= rR * (bP * 2); // red rock captured by blue paper
    score -= rP * (bS * 1); // red paper captured by blue scissors
    score -= rS * (bR * 3); // red scissors captured by blue rock
  } else {
    let bR = blueRock.length, bP = bluePaper.length, bS = blueScissor.length;
    let rR = redRock.length, rP = redPaper.length, rS = redScissor.length;
    score += (rR + rP + rS) * 10;
    score += rR * (bS * 3);
    score += rP * (bR * 2);
    score += rS * (bP * 1);
    score -= bR * (rP * 2);
    score -= bP * (rS * 1);
    score -= bS * (rR * 3);
  }
  return score;
}

function addPiece(color, type, sq) {
  // color: true=blue, false=red; type: 1,2,3
  const isBlue = color;
  if (isBlue) {
    blueCount++;
    if (type === 1) blueRock.push(sq);
    else if (type === 2) bluePaper.push(sq);
    else blueScissor.push(sq);
  } else {
    redCount++;
    if (type === 1) redRock.push(sq);
    else if (type === 2) redPaper.push(sq);
    else redScissor.push(sq);
  }
}

function removePiece(color, type, sq) {
  const isBlue = color;
  let arr;
  if (isBlue) {
    if (type === 1) arr = blueRock;
    else if (type === 2) arr = bluePaper;
    else arr = blueScissor;
    blueCount--;
  } else {
    if (type === 1) arr = redRock;
    else if (type === 2) arr = redPaper;
    else arr = redScissor;
    redCount--;
  }
  const idx = arr.indexOf(sq);
  if (idx !== -1) arr.splice(idx, 1);
}

function playHash(board, from, to) {
  const pieces = board.pieces;
  const toCase = board.cases[to];
  const toPiece = pieces[to];
  const fromPiece = pieces[from];
  let hash = board.hash;

  const fromZorbP = from * 7;
  const toZorbP = to * 7;
  const toZorbC = to * 3;

  memFromPiece[movePtr] = fromPiece;
  memToPiece[movePtr] = toPiece;
  memToCase[movePtr] = toCase;
  memHash[movePtr] = hash;
  movePtr++;

  // Update hash for from square
  hash ^= zobristPieces[fromZorbP + fromPiece + 3];
  hash ^= zobristPieces[fromZorbP + 3];

  // Update hash for to square
  hash ^= zobristPieces[toZorbP + toPiece + 3];
  hash ^= zobristPieces[toZorbP + fromPiece + 3];

  // Update incremental state
  const fromColor = fromPiece > 0;
  const fromType = Math.abs(fromPiece);
  const toColor = toPiece > 0;
  const toType = Math.abs(toPiece);

  // Remove from piece from its list
  removePiece(fromColor, fromType, from);

  // If capture, remove captured piece
  if (toPiece !== 0) {
    removePiece(toColor, toType, to);
  }

  // Add piece to new square
  addPiece(fromColor, fromType, to);

  // Update square control
  if (toCase === 0) {
    const newCase = fromColor ? 1 : -1;
    board.cases[to] = newCase;
    hash ^= zobristCases[toZorbC + 1];
    hash ^= zobristCases[toZorbC + newCase + 1];
    if (fromColor) {
      blueSquares++;
      blueScore += SQ_VAL[to];
    } else {
      redSquares++;
      redScore += SQ_VAL[80 - to];
    }
  }

  // Update material scores (recompute from scratch for simplicity, but we could update incrementally)
  // We'll update blueScore and redScore incrementally for piece changes, but capture bonus changes require recompute
  // To keep it simple, we'll recompute material score each evaluation.

  pieces[from] = 0;
  pieces[to] = fromPiece;

  hash ^= zobristTurn;
  board.turn = !board.turn;
  board.hash = hash;
}

function undoHash(board, from, to) {
  movePtr--;
  const fromPiece = memFromPiece[movePtr];
  const toPiece = memToPiece[movePtr];
  const toCase = memToCase[movePtr];
  const lastHash = memHash[movePtr];
  const pieces = board.pieces;
  const cases = board.cases;

  // Undo square control
  if (toCase === 0) {
    const fromColor = fromPiece > 0;
    if (fromColor) {
      blueSquares--;
      blueScore -= SQ_VAL[to];
    } else {
      redSquares--;
      redScore -= SQ_VAL[80 - to];
    }
    cases[to] = 0;
  }

  // Remove piece from to
  const fromColor = fromPiece > 0;
  const fromType = Math.abs(fromPiece);
  removePiece(fromColor, fromType, to);
  // Add back to from
  addPiece(fromColor, fromType, from);
  // If there was a captured piece, add it back
  if (toPiece !== 0) {
    const toColor = toPiece > 0;
    const toType = Math.abs(toPiece);
    addPiece(toColor, toType, to);
  }

  pieces[to] = toPiece;
  pieces[from] = fromPiece;
  board.turn = !board.turn;
  board.hash = lastHash;
}

// ================================
// Evaluation function (from perspective of blue)
// ================================
function evaluate(board) {
  // Compute material score
  let matBlue = computeMaterialScore(true);
  let matRed = computeMaterialScore(false);
  let matScore = matBlue - matRed;

  // Square control score
  let sqScore = (blueScore - redScore) * 2; // weight

  // Piece-square positional score
  let posBlue = 0, posRed = 0;
  for (let i = 0; i < blueRock.length; i++) posBlue += PSQ[blueRock[i]];
  for (let i = 0; i < bluePaper.length; i++) posBlue += PSQ[bluePaper[i]];
  for (let i = 0; i < blueScissor.length; i++) posBlue += PSQ[blueScissor[i]];
  for (let i = 0; i < redRock.length; i++) posRed += PSQ[80 - redRock[i]]; // mirror for red
  for (let i = 0; i < redPaper.length; i++) posRed += PSQ[80 - redPaper[i]];
  for (let i = 0; i < redScissor.length; i++) posRed += PSQ[80 - redScissor[i]];
  let posScore = (posBlue - posRed) * 0.5;

  // Mobility (number of legal moves)
  let moves = getMovesEncode(board);
  let mobility = moves.length;
  // For opponent, we would need to compute separately, but we can approximate by counting moves for current side only.
  // Instead, we'll compute for both sides by temporarily changing turn? That's costly. We'll only use mobility of current side as a bonus.
  // Since evaluation is called many times, we avoid double move generation.
  // We'll just use the moves count of current side as a factor.
  let mobScore = 0;
  if (board.turn) mobScore += mobility * 0.1; // blue to move, mobility is good
  else mobScore -= mobility * 0.1; // red to move, we want to minimize their mobility

  // Endgame: if few pieces left, territory becomes more important
  let totalPieces = blueCount + redCount;
  let endgameFactor = Math.min(1, (81 - (blueSquares + redSquares)) / 30);
  let terrWeight = 2 + endgameFactor * 4;

  let score = matScore + terrWeight * (blueSquares - redSquares) + posScore + mobScore;

  // Winning/losing if game over
  if (isGameOver(board)) {
    const w = winner(board);
    if (w === true) return 1000000;
    if (w === false) return -1000000;
  }
  return score;
}

// ================================
// Search
// ================================
let transpositionTable = new Map();
let nodeCount = 0;
let timeLimit = 0;
let startTime = 0;
let killerMoves = new Array(128).fill(0);
let historyTable = new Array(81 * 81).fill(0);
let currentDepth = 0;

function orderMoves(moves, bestMove, depth) {
  // Sort moves by capture value, then history, then killer
  moves.sort((a, b) => {
    const aFrom = a >> 8, aTo = a & 255;
    const bFrom = b >> 8, bTo = b & 255;
    // Capture bonus: if move captures, prioritize
    let aVal = 0, bVal = 0;
    // We need to know if capture: we can check if board.pieces[to] != 0
    // But we don't have board here; we can use a global or pass board.
    // We'll just use history heuristic primarily.
    // Simpler: just use history and killer.
    // We'll use a scoring system: history heuristic + killer bonus.
    let aScore = historyTable[aFrom * 81 + aTo];
    let bScore = historyTable[bFrom * 81 + bTo];
    if (a === bestMove) aScore += 10000;
    if (b === bestMove) bScore += 10000;
    // Killer: if move is killer at this depth
    if (killerMoves[depth] === a) aScore += 5000;
    if (killerMoves[depth] === b) bScore += 5000;
    return bScore - aScore;
  });
}

function isGameOverOpt() {
  return (blueCount === 0 || redCount === 0 || (blueSquares + redSquares) >= 81);
}

function minimax(board, depth, alpha, beta, isPV) {
  if (depth <= 0) {
    // Quiescence: if we are in check? Not applicable.
    return evaluate(board);
  }
  if (isGameOverOpt()) {
    return winner(board) ? 1000000 + depth : -1000000 - depth;
  }

  // Transposition table lookup
  const hash = board.hash;
  const ttEntry = transpositionTable.get(hash);
  let ttMove = 0;
  if (ttEntry) {
    if (ttEntry.depth >= depth) {
      if (ttEntry.flag === 0) return ttEntry.eval; // exact
      if (ttEntry.flag === -1 && ttEntry.eval <= alpha) return ttEntry.eval; // lower bound
      if (ttEntry.flag === 1 && ttEntry.eval >= beta) return ttEntry.eval; // upper bound
    }
    ttMove = ttEntry.move;
  }

  nodeCount++;
  if ((nodeCount & 1023) === 0 && Date.now() - startTime > timeLimit) {
    throw new Error("Timeout");
  }

  let moves = getMovesEncode(board);
  if (moves.length === 0) {
    // No legal moves? Should not happen unless game over.
    return winner(board) ? 1000000 : -1000000;
  }

  // Move ordering
  orderMoves(moves, ttMove, depth);

  let bestMove = moves[0];
  let bestEval;
  let alpha0 = alpha;

  if (board.turn) {
    bestEval = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const from = move >> 8, to = move & 255;
      playHash(board, from, to);
      let score;
      if (i === 0) {
        score = -minimax(board, depth - 1, -beta, -alpha, isPV);
      } else {
        // PVS: search with null window
        score = -minimax(board, depth - 1, -alpha - 1, -alpha, false);
        if (score > alpha && score < beta) {
          // re-search with full window
          score = -minimax(board, depth - 1, -beta, -alpha, true);
        }
      }
      undoHash(board, from, to);
      if (score > bestEval) {
        bestEval = score;
        bestMove = move;
        if (score > alpha) {
          alpha = score;
          if (score >= beta) {
            // Beta cutoff: store killer and history
            killerMoves[depth] = move;
            historyTable[from * 81 + to] += depth * depth;
            break;
          }
        }
      }
    }
  } else {
    bestEval = Infinity;
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const from = move >> 8, to = move & 255;
      playHash(board, from, to);
      let score;
      if (i === 0) {
        score = minimax(board, depth - 1, alpha, beta, isPV);
      } else {
        score = minimax(board, depth - 1, alpha, alpha + 1, false);
        if (score > alpha && score < beta) {
          score = minimax(board, depth - 1, alpha, beta, true);
        }
      }
      undoHash(board, from, to);
      if (score < bestEval) {
        bestEval = score;
        bestMove = move;
        if (score < beta) {
          beta = score;
          if (alpha >= beta) {
            killerMoves[depth] = move;
            historyTable[from * 81 + to] += depth * depth;
            break;
          }
        }
      }
    }
  }

  // Store in TT
  let flag;
  if (bestEval <= alpha0) flag = -1; // upper bound
  else if (bestEval >= beta) flag = 1; // lower bound
  else flag = 0; // exact
  transpositionTable.set(hash, {
    eval: bestEval,
    move: bestMove,
    depth: depth,
    flag: flag
  });

  return bestEval;
}

function getBestMove(board, maxTime) {
  timeLimit = maxTime;
  startTime = Date.now();
  nodeCount = 0;
  transpositionTable = new Map();
  killerMoves = new Array(128).fill(0);
  historyTable = new Array(81 * 81).fill(0);
  movePtr = 0;
  initialHash(board);
  initState(board);

  let bestMove = 0;
  let bestEval = 0;
  let depth = 2;
  try {
    while (true) {
      // Aspiration window
      let alpha = -Infinity, beta = Infinity;
      if (depth > 3) {
        alpha = bestEval - 50;
        beta = bestEval + 50;
      }
      let score = minimax(board, depth, alpha, beta, true);
      // If outside window, re-search with full window
      if (score <= alpha || score >= beta) {
        score = minimax(board, depth, -Infinity, Infinity, true);
      }
      bestEval = score;
      // Get the move from TT for this position
      const tt = transpositionTable.get(board.hash);
      if (tt && tt.move) {
        bestMove = tt.move;
      }
      depth++;
      // If we have a winning move, stop early
      if (Math.abs(score) > 900000) break;
      // If time is up, break
      if (Date.now() - startTime > timeLimit * 0.9) break;
    }
  } catch (e) {
    if (e.message !== "Timeout") throw e;
  }
  // At the end, we have bestMove encoded
  return [bestMove >> 8, bestMove & 255];
}

// ================================
// Bot export
// ================================
export const botListDeepSeek = {
  "DeepSeekBot": (board, maxTime) => {
    return getBestMove(board, maxTime);
  }
};