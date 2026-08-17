import { play, getMoves, UndoMove, isGameOver, winner, getMovesEncode } from "./board.js";

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
  let hash = 0n; // BigInt à 0

  for (let i = 0; i < 81; i++) {
    hash ^= zobristCases[(i * 3) + board.cases[i] + 1];
    hash ^= zobristPieces[(i * 7) + board.pieces[i] + 3];
  }

  if (board.turn) {
    hash ^= zobristTurn;
  }

  board.hash = hash;
}

const memFromPiece = new Int8Array(128);
const memToPiece   = new Int8Array(128);
const memToCase    = new Int8Array(128);
const memHash      = new BigUint64Array(128);

let movePtr = 0;

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

  pieces[from] = 0;
  hash ^= zobristPieces[fromZorbP + fromPiece + 3]
  hash ^= zobristPieces[fromZorbP + 3]

  pieces[to] = fromPiece;
  hash ^= zobristPieces[toZorbP + toPiece + 3]
  hash ^= zobristPieces[toZorbP + fromPiece + 3]

  if (toCase === 0) {
    const newToCase = (fromPiece > 0) ? 1 : -1;
    board.cases[to] = newToCase;
    hash ^= zobristCases[toZorbC + 1]
    hash ^= zobristCases[toZorbC + newToCase + 1]
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
  const lastHash = memHash[movePtr];
  const pieces = board.pieces;
  const cases = board.cases;

  board.cases[to] = toCase;
  pieces[to] = toPiece;
  pieces[from] = fromPiece;
  board.turn = !board.turn;
  board.hash = lastHash;
}

function hash(board) {
  return board.cases.join('') + board.pieces.join('') + (board.turn ? '1' : '0');
}

export function randomMove(board) {
  const moves = getMoves(board);
  return moves[Math.floor(Math.random() * moves.length)]
}

function evaluation(board) {
  let score = 0;
  const pieces = board.pieces;
  const cases = board.cases;
  for (let i = 0; i < 81; i++) {
    const piece = pieces[i];
    if (piece > 0) score += 5;
    else if (piece < 0) score -= 5;
    score += cases[i];
  }
  return score;
}

function evaluationAm(board) {
  let scorePieces = 0;
  let scoreCases = 0;
  let casesVides = 0;

  const pieces = board.pieces;
  const cases = board.cases;

  for (let i = 0; i < 81; i++) {
    const piece = pieces[i];
    if (piece > 0) scorePieces += 5;
    else if (piece < 0) scorePieces -= 5;
    const square = cases[i];
    if (square === 0) {
      casesVides += 1;
    }
    else scoreCases += square;
  }
  return (casesVides/63) * scorePieces + scoreCases;
}

function evaluationCasesMap(board) {
  let scorePieces = 0;
  let scoreCases = 0;
  let casesVides = 0;

  const pieces = board.pieces;
  const cases = board.cases;

  for (let i = 0; i < 81; i++) {
    const piece = pieces[i];
    if (piece > 0) scorePieces += 5;
    else if (piece < 0) scorePieces -= 5;
    const square = cases[i];
    if (square === 0) {
      casesVides += 1;
    }
    else if (square === 1) {
      scoreCases += i % 9 + 1;
    }
    else {
      scoreCases -= (9 - (i % 9));
    }
  }
  return (casesVides/63) * scorePieces + (scoreCases/4);
}

let memory = new Map();
let nodeCount = 0;
let timeLimit = 0;
let startTime = 0;

function minimaxMemory(board, depth, evalFunction, alpha = -Infinity, beta = Infinity) {
  if (depth <= 0) {
    return [evalFunction(board), null];
  }
  if (isGameOver(board)) {
    return [winner(board) ? 150 + depth : -150 - depth, null];
  }
  const boardMemory = memory.get(board.hash)
  let lastBestMove = null;
  if (boardMemory) {
    if (boardMemory.depth >= depth) {
      return [boardMemory.eval, boardMemory.move];
    }
    else lastBestMove = boardMemory.move;
  }
  nodeCount++;
  if ((nodeCount & 1023) === 0) {
    if (Date.now() - startTime > timeLimit) throw new Error("Timeout");
  }
  if (board.turn) {
    let bestMove = null;
    let bestEval = -Infinity;
    const moves = getMovesEncode(board);
    if (lastBestMove) orderMoves(moves, lastBestMove);
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const from = move >> 8;
      const to = move & 255;
      playHash(board, from, to);
      const [moveEval, TestBestMove] = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
      UndoHash(board, from, to);
      if (moveEval > bestEval) {
        bestEval = moveEval;
        bestMove = move;
        alpha = Math.max(alpha, bestEval);
        if (beta <= alpha) {
          break;
        }
      }
      
    }
    if (boardMemory) {
      boardMemory.eval = bestEval;
      boardMemory.move = bestMove;
      boardMemory.depth = depth;
    } else {
      memory.set(board.hash, {
        eval: bestEval,
        move: bestMove,
        depth
      })
  }
    return [bestEval, bestMove];
  } else {
    let bestMove = null;
    let bestEval = Infinity;
    const moves = getMovesEncode(board);
    if (lastBestMove) orderMoves(moves, lastBestMove);
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const from = move >> 8;
      const to = move & 255; 
      playHash(board, from, to);
      const [moveEval, TestBestMove] = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
      UndoHash(board, from, to);
      if (moveEval < bestEval) {
        bestEval = moveEval;
        bestMove = move;
        beta = Math.min(beta, bestEval);
        if (beta <= alpha) {
          break;
        }
      }
      
    }
    if (boardMemory) {
      boardMemory.eval = bestEval;
      boardMemory.move = bestMove;
      boardMemory.depth = depth;
    } else {
      memory.set(board.hash, {
        eval: bestEval,
        move: bestMove,
        depth
      })
  }
    return [bestEval, bestMove];
  }  
}

function orderMoves(moves, bestMove) {
  const index = moves.indexOf(bestMove)
  if (index > 0) {
    const temp = moves[0];
    moves[0] = bestMove;
    moves[index] = temp;
  }
}

function iterativeDeepening(board, maxTime, evalFunction=evaluation) {
  console.profile("Iterative");
  timeLimit = maxTime
  startTime = Date.now()
  let bestMove = null;
  let bestEval = null;
  let maxDepth = 0;
  initialHash(board);

  memory = new Map();
  movePtr = 0;
  nodeCount = 0;
  try {
    for (let depth = 2; depth < 2048; depth++) {
      const [currentEval, currentMove] = minimaxMemory(board, depth, evalFunction);
      bestEval = currentEval;
      bestMove = currentMove;
      maxDepth = depth;
      if (Math.abs(bestEval) > 140) return [bestEval, bestMove];
    }
  } catch (error) {
      if (error.message !== "Timeout") throw error;
  }
  console.log(maxDepth);
  console.profileEnd("Iterative")
  return [bestEval, bestMove];
}

export const botList = {

  "Bot #1": (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime, evaluation)[1];
    return [move >> 8, move & 255]
  },

  "Bot #2": (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime, evaluationAm)[1];
    return [move >> 8, move & 255];
  },

  "Bot #3": (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime, evaluationCasesMap)[1];
    return [move >> 8, move & 255];
  },
}