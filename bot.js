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

export function randomMove(board) {
  const moves = getMoves(board);
  return moves[Math.floor(Math.random() * moves.length)]
}

const DIST_TABLE = new Uint8Array(81 * 81);

for (let i = 0; i < 81; i++) {
  for (let j = 0; j < 81; j++) {
    DIST_TABLE[81 * i + j] = dist(i, j);
  }
}
function dist(idx1, idx2) {
  return Math.max(Math.abs((idx1 % 9) - (idx2 % 9)), Math.abs(Math.floor(idx1/9) - Math.floor(idx2/9)));
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
  return (0.2 + (casesVides/63)) * scorePieces + (scoreCases/4);
}

function synergy(cases, CASESTOSEE) {
  let casesToSee = [...CASESTOSEE]
  if (cases.length === 0 || casesToSee.length === 0) return 0;
  let score = 0;
  for (let i = 0; i < cases.length; i++) {
    let min = Infinity
    let minCase = null;
    for (let j = 0; j < casesToSee.length; j++) {
      const distance = DIST_TABLE[81 * cases[i] + casesToSee[j]]
      if (min > distance) {
        min = distance;
        minCase = j;
      }
    }
    score += 9 - min;
    casesToSee.splice(minCase, 1);
    if (casesToSee.length === 0) return score;
  }
  return score;
}

function evaluationStategique(board) {
  let scorePieces = 0;
  let scoreCases = 0;
  let casesVides = [];
  const piecesPos = new Map([
    [-3, []],
    [-2, []],
    [-1, []],
    [1, []],
    [2, []],
    [3, []]
  ]);
  const pieces = board.pieces;
  const cases = board.cases;

  for (let i = 0; i < 81; i++) {
    const piece = pieces[i];
    if (piece !== 0) {
      if (piece > 0) scorePieces += 5;
      else scorePieces -= 5;
      piecesPos.get(piece).push(i);
    }
    const square = cases[i];
    if (square === 0) {
      casesVides.push(i);
    }
    else if (square === 1) {
      scoreCases += i % 9 + 1;
    }
    else {
      scoreCases -= (9 - (i % 9));
    }
  }
  
  let PPpositioning = 0;
  const blueR = piecesPos.get(1);
  const blueP = piecesPos.get(2);
  const blueS = piecesPos.get(3);
  const redR = piecesPos.get(-1);
  const redP = piecesPos.get(-2);
  const redS = piecesPos.get(-3);
  PPpositioning += (synergy(blueR, blueS) + synergy(blueP, blueR) + synergy(blueS, blueP)) / (blueP.length + blueR.length + blueS.length);
  PPpositioning -= (synergy(redR, redS) + synergy(redP, redR) + synergy(redS, redP)) / (redP.length + redR.length + redS.length);

  let PCpositionning = 0;
  PCpositionning += synergy([...blueR, ...blueP, ...blueS], casesVides);
  PCpositionning -= synergy([...redR, ...redP, ...redS], casesVides);
  
  //if (Math.random() < 0.00005) console.log(scoreCases, scorePieces, PPpositioning, PCpositionning);
  return (0.8 + (casesVides.length/63)) * (scorePieces/40) + 10.5 * (scoreCases/61) + PPpositioning + PCpositionning;
}

const bluePieces = new Uint8Array(9);
const redPieces = new Uint8Array(9);
const emptySquares = new Uint8Array(63);

const squareValue = new Uint8Array([3, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.8]);

function evalVirtualMap(board) {
  let Pscore = 0;
  let Cscore = 0;

  let blueCount = 0;
  let redCount = 0;
  let emptyCount = 0;

  const pieces = board.pieces;
  const cases = board.cases;

  for (let i = 0; i < 81; i++) {
    const p = pieces[i];
    const c = cases[i];

    if (p > 0) {
      Pscore += 15;
      bluePieces[blueCount++] = i;
    } else if (p < 0) {
      Pscore -= 15;
      redPieces[redCount++] = i;
    };

    if (c === 0) {
      emptySquares[emptyCount++] = i;
    } else if (c === 1) {
      Cscore += squareValue[i % 9];
    } else {
      Cscore -= squareValue[8 - (i % 9)];
    }
  }

  let PpositioningScore = 0;
  for (let i = 0; i < emptyCount; i++) {
    const square = emptySquares[i];
    let minBlue = 10;
    let minRed = 10;

    for (let j = 0; j < blueCount; j++) {
      const d = DIST_TABLE[81 * square + bluePieces[j]]; 
      if (d < minBlue) minBlue = d;
    }

    for (let j = 0; j < redCount; j++) {
      const d = DIST_TABLE[81 * square + redPieces[j]]; 
      if (d < minRed) minRed = d;
    }

    if (minBlue < minRed) {
      PpositioningScore += 0.3 * squareValue[emptySquares[i] % 9];
    } else if (minBlue > minRed) {
      PpositioningScore -= 0.3 * squareValue[8 - (emptySquares[i] % 9)];
    }
    PpositioningScore -= minBlue/3.4;
    PpositioningScore += minRed/3.4;
  }
  return Pscore + Cscore + PpositioningScore;
}




let memory = new Map();
let nodeCount = 0;
let timeLimit = 0;
let startTime = 0;

function minimaxMemory(board, depth, evalFunction, alpha = -Infinity, beta = Infinity) {
  if (depth <= 0) {
    if (memToPiece[movePtr-1] === 0) return [evalFunction(board), null];
  }
  if (isGameOver(board)) {
    return [winner(board) ? 9999999 + depth : -9999999 - depth, null];
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
      if (Math.abs(bestEval) > 9999999) return [bestEval, bestMove];
    }
  } catch (error) {
      if (error.message !== "Timeout") throw error;
  }
  console.log(maxDepth, bestEval);
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

  "Bot #4": (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime, evalVirtualMap)[1];
    return [move >> 8, move & 255];
  },
}