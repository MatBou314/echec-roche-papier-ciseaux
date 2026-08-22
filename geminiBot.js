import { getMovesEncode, isGameOver } from "./board.js";

// ==========================================
// 1. ZOBRIST HASHING
// ==========================================
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

function initialHash(board) {
  let hash = 0n;
  for (let i = 0; i < 81; i++) {
    hash ^= zobristCases[(i * 3) + board.cases[i] + 1];
    hash ^= zobristPieces[(i * 7) + board.pieces[i] + 3];
  }
  if (board.turn) hash ^= zobristTurn;
  board.hash = hash;
}

// ==========================================
// 2. ÉTAT INCRÉMENTAL & MÉMOIRE
// ==========================================
const MAX_PLY = 512;
const memFromPiece = new Int8Array(MAX_PLY);
const memToPiece   = new Int8Array(MAX_PLY);
const memToCase    = new Int8Array(MAX_PLY);
const memHash      = new BigUint64Array(MAX_PLY);
let movePtr = 0;

let blueSquaresCount = 0;
let redSquaresCount = 0;
let bluePiecesCount = 0;
let redPiecesCount = 0;

function initState(board) {
  bluePiecesCount = 0;
  redPiecesCount = 0;
  blueSquaresCount = 0;
  redSquaresCount = 0;
  
  for (let i = 0; i < 81; i++) {
    if (board.cases[i] === 1) blueSquaresCount++;
    else if (board.cases[i] === -1) redSquaresCount++;

    if (board.pieces[i] > 0) bluePiecesCount++;
    else if (board.pieces[i] < 0) redPiecesCount++;
  }
}

function playHash(board, from, to) {
  const pieces = board.pieces;
  const toCase = board.cases[to];
  const toPiece = pieces[to];
  const fromPiece = pieces[from];
  let hash = board.hash;

  memFromPiece[movePtr] = fromPiece;
  memToPiece[movePtr] = toPiece;
  memToCase[movePtr] = toCase;
  memHash[movePtr] = hash;
  movePtr++;

  pieces[from] = 0;
  hash ^= zobristPieces[from * 7 + fromPiece + 3];
  hash ^= zobristPieces[from * 7 + 3];

  pieces[to] = fromPiece;
  hash ^= zobristPieces[to * 7 + toPiece + 3];
  hash ^= zobristPieces[to * 7 + fromPiece + 3];

  if (toPiece > 0) bluePiecesCount--;
  else if (toPiece < 0) redPiecesCount--;

  if (toCase === 0) {
    if (fromPiece > 0) {
      blueSquaresCount++;
      board.cases[to] = 1;
      hash ^= zobristCases[to * 3 + 2];
    } else {
      redSquaresCount++;
      board.cases[to] = -1;
      hash ^= zobristCases[to * 3];
    }
    hash ^= zobristCases[to * 3 + 1];
  }

  hash ^= zobristTurn;
  board.turn = !board.turn;
  board.hash = hash;
}

function UndoHash(board, from, to) {
  movePtr--;
  const fromPiece = memFromPiece[movePtr];
  const toPiece = memToPiece[movePtr];
  const toCase = memToCase[movePtr];
  
  if (toCase === 0) {
    if (fromPiece > 0) blueSquaresCount--;
    else redSquaresCount--;
  }

  if (toPiece > 0) bluePiecesCount++;
  else if (toPiece < 0) redPiecesCount++;

  board.cases[to] = toCase;
  board.pieces[to] = toPiece;
  board.pieces[from] = fromPiece;
  board.turn = !board.turn;
  board.hash = memHash[movePtr];
}

function isGameOverOpt() {
  return (bluePiecesCount <= 0) || (redPiecesCount <= 0) || (blueSquaresCount + redSquaresCount >= 81);
}

// ==========================================
// 3. MATRICE DE PRÉDATION & ÉVALUATION ULTRA-RAPIDE
// ==========================================
const DIST_TABLE = new Uint8Array(81 * 81);
for (let i = 0; i < 81; i++) {
  for (let j = 0; j < 81; j++) {
    DIST_TABLE[81 * i + j] = Math.max(Math.abs((i % 9) - (j % 9)), Math.abs(Math.floor(i / 9) - Math.floor(j / 9)));
  }
}

// [Proie, Prédateur] pour chaque type de pièce
const RELATIONS = {
  1:  [-3, -2], // Roche Bleue (+1) vise Ciseaux Rouges (-3), craint Papier Rouge (-2)
  2:  [-1, -3], // Papier Bleu (+2) vise Roche Rouge (-1), craint Ciseaux Rouges (-3)
  3:  [-2, -1], // Ciseaux Bleus (+3) vise Papier Rouge (-2), craint Roche Rouge (-1)
  "-1": [3, 2],  // Roche Rouge (-1) vise Ciseaux Bleus (+3), craint Papier Bleu (+2)
  "-2": [1, 3],  // Papier Rouge (-2) vise Roche Bleue (+1), craint Ciseaux Bleus (+3)
  "-3": [2, 1]   // Ciseaux Rouges (-3) vise Papier Bleu (+2), craint Roche Bleue (+1)
};

function evaluate(board) {
  if (isGameOverOpt()) {
    if (bluePiecesCount <= 0) return -1000000 + movePtr;
    if (redPiecesCount <= 0) return 1000000 - movePtr;
    return blueSquaresCount > redSquaresCount ? (1000000 - movePtr) : (-1000000 + movePtr);
  }

  let score = 0;
  score += (bluePiecesCount - redPiecesCount) * 1000;
  score += (blueSquaresCount - redSquaresCount) * 60;

  // Extraction rapide des pièces actives (max 18 pièces)
  const activePieces = [];
  for (let i = 0; i < 81; i++) {
    if (board.pieces[i] !== 0) activePieces.push(i);
  }

  const count = activePieces.length;
  for (let a = 0; a < count; a++) {
    const i = activePieces[a];
    const p = board.pieces[i];
    const isBlue = p > 0;
    const [targetType, predatorType] = RELATIONS[p];

    // Positionnement central léger
    const centerDist = DIST_TABLE[81 * i + 40];
    score += (isBlue ? 1 : -1) * (4 - centerDist) * 5;

    for (let b = 0; b < count; b++) {
      if (a === b) continue;
      const j = activePieces[b];
      const enemy = board.pieces[j];
      
      if (isBlue === (enemy > 0)) continue; // Même équipe

      const dist = DIST_TABLE[81 * i + j];
      if (dist <= 3) {
        if (enemy === targetType) {
          score += (isBlue ? 1 : -1) * (15 - dist * 4);
        } else if (enemy === predatorType) {
          score -= (isBlue ? 1 : -1) * (20 - dist * 5);
        }
      }
    }
  }

  return score;
}

// ==========================================
// 4. TRANSPOSITION TABLE (Typed Arrays O(1))
// ==========================================
const TT_SIZE = 1 << 19; // ~500k entrées
const TT_MASK = TT_SIZE - 1;

const ttHashHigh = new Int32Array(TT_SIZE);
const ttHashLow  = new Int32Array(TT_SIZE);
const ttEval     = new Int32Array(TT_SIZE);
const ttMove     = new Uint16Array(TT_SIZE);
const ttDepth    = new Int8Array(TT_SIZE);
const ttFlag     = new Uint8Array(TT_SIZE);

const FLAG_EXACT = 1;
const FLAG_LOWER = 2;
const FLAG_UPPER = 3;

function writeTT(hash, depth, val, flag, move) {
  const index = Number(hash & BigInt(TT_MASK));
  ttHashHigh[index] = Number(hash >> 32n);
  ttHashLow[index] = Number(hash & 0xFFFFFFFFn);
  ttEval[index] = val;
  ttFlag[index] = flag;
  ttDepth[index] = depth;
  ttMove[index] = move || 0;
}

function readTT(hash, depth, alpha, beta) {
  const index = Number(hash & BigInt(TT_MASK));
  if (ttHashHigh[index] === Number(hash >> 32n) && ttHashLow[index] === Number(hash & 0xFFFFFFFFn)) {
    const flag = ttFlag[index];
    const val = ttEval[index];
    const move = ttMove[index];
    
    if (ttDepth[index] >= depth) {
      if (flag === FLAG_EXACT) return { hit: true, val: val, move: move };
      if (flag === FLAG_LOWER && val >= beta) return { hit: true, val: val, move: move };
      if (flag === FLAG_UPPER && val <= alpha) return { hit: true, val: val, move: move };
    }
    return { hit: false, val: null, move: move };
  }
  return { hit: false, val: null, move: 0 };
}

// ==========================================
// 5. RECHERCHE NEGAMAX & MOVE ORDERING
// ==========================================
let nodes = 0;
let timeLimit = 0;
let startTime = 0;
let timeOut = false;
const killerMoves = new Uint16Array(MAX_PLY * 2);

function scoreMoves(moves, board, ttMove, ply) {
  const scoredMoves = [];
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    let score = 0;
    
    if (move === ttMove) {
      score = 10000;
    } else {
      const to = move & 255;
      if (board.pieces[to] !== 0) score += 5000;
      if (board.cases[to] === 0) score += 1000;
      if (move === killerMoves[ply * 2]) score += 800;
      else if (move === killerMoves[ply * 2 + 1]) score += 700;
    }
    scoredMoves.push({ move, score });
  }
  scoredMoves.sort((a, b) => b.score - a.score);
  for (let i = 0; i < moves.length; i++) moves[i] = scoredMoves[i].move;
}

function negamax(board, depth, alpha, beta, color, ply) {
  if ((nodes++ & 1023) === 0 && Date.now() - startTime > timeLimit) {
    timeOut = true;
    return 0;
  }

  const alphaOrig = alpha;
  const ttData = readTT(board.hash, depth, alpha, beta);
  if (ttData.hit) return ttData.val;

  if (depth <= 0 || isGameOverOpt()) {
    return color * evaluate(board);
  }

  const moves = getMovesEncode(board);
  scoreMoves(moves, board, ttData.move, ply);

  let bestMove = 0;
  let bestVal = -Infinity;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const from = move >> 8;
    const to = move & 255;

    playHash(board, from, to);
    const val = -negamax(board, depth - 1, -beta, -alpha, -color, ply + 1);
    UndoHash(board, from, to);

    if (timeOut) return 0;

    if (val > bestVal) {
      bestVal = val;
      bestMove = move;
    }

    if (val > alpha) alpha = val;

    if (alpha >= beta) {
      if (board.pieces[to] === 0) {
        killerMoves[ply * 2 + 1] = killerMoves[ply * 2];
        killerMoves[ply * 2] = move;
      }
      break;
    }
  }

  let flag = FLAG_EXACT;
  if (bestVal <= alphaOrig) flag = FLAG_UPPER;
  else if (bestVal >= beta) flag = FLAG_LOWER;
  
  writeTT(board.hash, depth, bestVal, flag, bestMove);
  return bestVal;
}

// ==========================================
// 6. ITERATIVE DEEPENING
// ==========================================
function getBestMove(board, maxTime) {
  timeLimit = maxTime - 15;
  startTime = Date.now();
  timeOut = false;
  nodes = 0;
  movePtr = 0;
  killerMoves.fill(0);
  
  initialHash(board);
  initState(board);

  let bestMove = null;
  let bestScore = 0;
  const color = board.turn ? 1 : -1;

  for (let depth = 1; depth <= 64; depth++) {
    let alpha = -Infinity;
    let beta = Infinity;
    
    if (depth > 2) {
      alpha = bestScore - 300;
      beta = bestScore + 300;
    }

    let score = negamax(board, depth, alpha, beta, color, 0);
    
    if ((score <= alpha || score >= beta) && !timeOut) {
      score = negamax(board, depth, -Infinity, Infinity, color, 0);
    }

    if (timeOut) break;

    bestScore = score;
    const ttData = readTT(board.hash, 0, -Infinity, Infinity);
    if (ttData.move) bestMove = ttData.move;

    if (Math.abs(bestScore) > 900000) break;
  }

  if (!bestMove) {
    const fallbackMoves = getMovesEncode(board);
    bestMove = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
  }

  return [bestMove >> 8, bestMove & 255];
}

export const botListGemini = {
  "Gemini Titan V2": getBestMove
};