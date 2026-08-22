import { play, getMoves, UndoMove, isGameOver, winner } from "./board.js";

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

const bluePiecesSquares = new Uint8Array(9);
const bluePiecesIdx  = new Uint8Array(81);
let bluePiecesCount  = 0;

const redPiecesSquares  = new Uint8Array(9);
const redPiecesIdx= new Uint8Array(81);
let redPiecesCount   = 0;

const emptySquares = new Uint8Array(81);
const emptyIdx  = new Uint8Array(81);
let emptyCount  = 0;
let blueSquaresCount = 9;
let redSquaresCount = 9;

function addBlue(sq) {
  bluePiecesSquares[bluePiecesCount] = sq;
  bluePiecesIdx[sq] = bluePiecesCount;
  bluePiecesCount++;
}

function removeBlue(sq) {
  bluePiecesCount--;
  const idx = bluePiecesIdx[sq];
  const lastSquare = bluePiecesSquares[bluePiecesCount];
  bluePiecesSquares[idx] = lastSquare;
  bluePiecesIdx[lastSquare] = idx;
}

function addRed(sq) {
  redPiecesSquares[redPiecesCount] = sq;
  redPiecesIdx[sq] = redPiecesCount;
  redPiecesCount++;
}

function removeRed(sq) {
  redPiecesCount--;
  const idx = redPiecesIdx[sq];
  const lastSquare = redPiecesSquares[redPiecesCount];
  redPiecesSquares[idx] = lastSquare;
  redPiecesIdx[lastSquare] = idx;
}

function addEmpty(sq) {
  emptySquares[emptyCount] = sq;
  emptyIdx[sq] = emptyCount;
  emptyCount++;
}

function removeEmpty(sq) {
  emptyCount--;
  const idx = emptyIdx[sq];
  const lastSquare = emptySquares[emptyCount];
  emptySquares[idx] = lastSquare;
  emptyIdx[lastSquare] = idx;
}

function initIncrementalState(board) {
  bluePiecesCount = 0;
  redPiecesCount = 0;
  blueSquaresCount = 0;
  redSquaresCount = 0;
  emptyCount = 0;

  for (let i = 0; i < 81; i++) {
    const p = board.pieces[i];
    const c = board.cases[i];

    if (p > 0) addBlue(i);
    else if (p < 0) addRed(i);

    if (c === 0) addEmpty(i);
    else if (c === 1) blueSquaresCount += 1;
    else redSquaresCount += 1;
  }
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
    removeEmpty(to);
    if (newToCase === 1) blueSquaresCount += 1;
    else redSquaresCount += 1;
  }

  if (fromPiece > 0) {
    removeBlue(from);
    if (toPiece !== 0) removeRed(to);
    addBlue(to)
  }
  else {
    removeRed(from);
    if (toPiece !== 0) removeBlue(to);
    addRed(to)
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

  if (fromPiece > 0) {
    addBlue(from);
    removeBlue(to)
    if (toPiece !== 0) addRed(to);
  }
  else {
    addRed(from);
    removeRed(to)
    if (toPiece !== 0) addBlue(to);
  }
  if (toCase === 0) {
    addEmpty(to);
    if (fromPiece > 0) blueSquaresCount -= 1;
    else redSquaresCount -= 1;
  }
}

function isGameOverOpt() {
  return (emptyCount <= 0) || (bluePiecesCount <= 0) || (redPiecesCount <= 0);
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

const squareValue = new Float32Array([3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.4, 3.4, 3.4]);

function evalVirtualMap(board) {
  let Cscore = 0;
  let Pscore = (bluePiecesCount - redPiecesCount) * 17;

  const pieces = board.pieces;
  const cases = board.cases;

  for (let i = 0; i < 81; i++) {
    const square = cases[i];
    if (square === 1) {
      Cscore += squareValue[i % 9];
    } else if (square === -1) {
      Cscore -= squareValue[8 - (i % 9)];
    }
  }

  let PpositioningScore = 0;
  for (let i = 0; i < emptyCount; i++) {
    const square = emptySquares[i];
    let minBlue = 10;
    let minRed = 10;

    for (let j = 0; j < bluePiecesCount; j++) {
      const d = DIST_TABLE[81 * square + bluePiecesSquares[j]]; 
      if (d < minBlue) minBlue = d;
    }

    for (let j = 0; j < redPiecesCount; j++) {
      const d = DIST_TABLE[81 * square + redPiecesSquares[j]]; 
      if (d < minRed) minRed = d;
    }

    if (minBlue < minRed) {
      PpositioningScore += 0.3 * squareValue[8 - (square % 9)];
    } else if (minBlue > minRed) {
      PpositioningScore -= 0.3 * squareValue[square % 9];
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
    if (memToPiece[movePtr-1] === 0) return evalFunction(board);
  }
  if (isGameOverOpt()) {
    return winner(board) ? 9999999 + depth : -9999999 - depth;
  }
  const boardMemory = memory.get(board.hash)
  let lastBestMove = null;
  if (boardMemory) {
    if (boardMemory.depth >= depth) {
      if (boardMemory.flag === "EXACT") return boardMemory.eval;
      if (boardMemory.flag === "LOWER" && boardMemory.eval >= beta) return boardMemory.eval;
      if (boardMemory.flag === "UPPER" && boardMemory.eval <= alpha) return boardMemory.eval;
    }
  lastBestMove = boardMemory.move;
  }
  nodeCount++;
  if ((nodeCount & 1023) === 0) {
    if (Date.now() - startTime > timeLimit) throw new Error("Timeout");
  }
  let flag = "EXACT";
  const originAlpha = alpha;
  const originBeta = beta;

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
      const moveEval = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
      UndoHash(board, from, to);
      if (moveEval > bestEval) {
        bestEval = moveEval;
        bestMove = move;
        if (bestEval > alpha) {
          alpha = bestEval;
        }
        if (beta <= alpha) {
          flag = "LOWER";
          break;
        }
      }
    }
    if (flag !== "LOWER" && bestEval <= originAlpha) {
      flag = "UPPER";
    }
    if (boardMemory) {
      boardMemory.eval = bestEval;
      boardMemory.move = bestMove;
      boardMemory.depth = depth;
      boardMemory.flag = flag;
    } else {
      memory.set(board.hash, {
        eval: bestEval,
        flag,
        move: bestMove,
        depth
      })
  }
    return bestEval;
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
      const moveEval = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
      UndoHash(board, from, to);
      if (moveEval < bestEval) {
        bestEval = moveEval;
        bestMove = move;
        if (bestEval < beta) {
          beta = bestEval;
        }
        if (beta <= alpha) {
          flag = "UPPER"
          break;
        }
      }
    }
    if (flag !== "UPPER" && bestEval >= originBeta) {
      flag = "LOWER";
    }
    if (boardMemory) {
      boardMemory.eval = bestEval;
      boardMemory.move = bestMove;
      boardMemory.depth = depth;
      boardMemory.flag = flag;
    } else {
      memory.set(board.hash, {
        eval: bestEval,
        flag,
        move: bestMove,
        depth
      })
  }
    return bestEval;
  }  
}

function getMinimax(board, depth, evalFunction, lastBestMove, alpha = -Infinity, beta = Infinity) {
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
      const moveEval = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
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
      const moveEval = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
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
  initIncrementalState(board);
  memory = new Map();
  movePtr = 0;
  nodeCount = 0;
  try {
    for (let depth = 2; depth < 2048; depth++) {
      const [currentEval, currentMove] = getMinimax(board, depth, evalFunction, bestMove);
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

export const botList2 = {
  "Bot B1": (board, maxTime) => {
    const move = iterativeDeepening(board, maxTime, evalVirtualMap)[1];
    return [move >> 8, move & 255]
  },
}