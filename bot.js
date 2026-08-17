import { play, getMoves, UndoMove, isGameOver, winner } from "./board.js";

function rand64() {
  const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  return (high << 32n) | low;
}

const zobristPieces = Array.from({length: 81}, () => {
  const map = {};
  for (let i = -3; i <= 3; i++) map[i] = rand64();
  return map;
})

const zobristCases = Array.from({length: 81}, () => ({
    "-1": rand64(),
    "0": rand64(),
    "1": rand64()
}))

const zobristTurn = rand64();

function initialHash(board) {
  let hash = 0n; // BigInt à 0

  for (let i = 0; i < 81; i++) {
    const c = board.cases[i];
    const p = board.pieces[i];

    hash ^= zobristCases[i][c];
    hash ^= zobristPieces[i][p];
  }

  if (board.turn) {
    hash ^= zobristTurn;
  }

  board.hash = hash;
}

function playHash(board, from, to) {
  const pieces = board.pieces;
  const toCase = board.cases[to];
  const lastHash = board.hash;

  const toPiece = pieces[to];
  const fromPiece = pieces[from];

  pieces[from] = 0;
  board.hash ^= zobristPieces[from][fromPiece];
  board.hash ^= zobristPieces[from][0];

  pieces[to] = fromPiece;
  board.hash ^= zobristPieces[to][toPiece];
  board.hash ^= zobristPieces[to][fromPiece];

  if (toCase === 0) {
    const newToCase = (fromPiece > 0) ? 1 : -1;
    board.cases[to] = newToCase;
    board.hash ^= zobristCases[to][0];
    board.hash ^= zobristCases[to][newToCase];
  }

  board.hash ^= zobristTurn;
  board.turn = !board.turn;

  return {from, to, fromPiece, toPiece, toCase, lastHash};
}

function UndoHash(board, lastMove) {
  const {from, to, fromPiece, toPiece, toCase, lastHash} = lastMove;
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



function minimax(board, depth, alpha = -Infinity, beta = Infinity) {
  if (isGameOver(board)) return [winner(board) ? 150 + depth : -150 - depth, null]
  if (depth <= 0) return [evaluation(board), null];
  if (board.turn) {
    let bestMove = null;
    let bestEval = -Infinity;
    const moves = getMoves(board);
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const memMove = play(board, move[0], move[1]);
      const moveEval = minimax(board, depth-1, alpha, beta)[0];
      UndoMove(board, memMove);
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
    const moves = getMoves(board);
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const memMove = play(board, move[0], move[1]);
      const moveEval = minimax(board, depth-1, alpha, beta)[0];
      UndoMove(board, memMove);
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
    const moves = getMoves(board);
    if (lastBestMove) orderMoves(moves, lastBestMove);
    for (const move of moves) {
      const memMove = playHash(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
      UndoHash(board, memMove);
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
    const moves = getMoves(board);
    if (lastBestMove) orderMoves(moves, lastBestMove);
    for (const move of moves) {
      const memMove = playHash(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimaxMemory(board, depth-1, evalFunction, alpha, beta);
      UndoHash(board, memMove);
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
  const index = moves.findIndex(m => m[0] === bestMove[0] && m[1] === bestMove[1]);
  if (index > 0) {
    const [move] = moves.splice(index, 1);
    moves.unshift(move);
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
    return move;
  },

  "Bot #2": (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime, evaluationAm)[1];
    return move;
  },

  "Bot #3": (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime, evaluationCasesMap)[1];
    return move;
  },
}