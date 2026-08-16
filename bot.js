import { play, getMoves, UndoMove, isGameOver, winner, hash } from "./board.js";

export function randomMove(board, maxTime) {
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

function minimax(board, depth, alpha = -Infinity, beta = Infinity) {
  if (isGameOver(board)) return [winner(board) ? 150 + depth : -150 - depth, null]
  if (depth <= 0) return [evaluation(board), null];
  if (board.turn) {
    let bestMove = null;
    let bestEval = -Infinity;
    const moves = getMoves(board);
    for (const move of moves) {
      const memMove = play(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimax(board, depth-1, alpha, beta);
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
    for (const move of moves) {
      const memMove = play(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimax(board, depth-1, alpha, beta);
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

let memory = {};
let nodeCount = 0;
let timeLimit = 0;
let startTime = 0;

function minimaxMemory(board, depth, alpha = -Infinity, beta = Infinity) {
  if (isGameOver(board)) {
    return [winner(board) ? 150 + depth : -150 - depth, null];
  }
  if (depth <= 0) {
    return [evaluation(board), null];
  }
  const boardMemory = memory[hash(board)];
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
      const memMove = play(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimaxMemory(board, depth-1, alpha, beta);
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
    memory[hash(board)] = {
      eval: bestEval,
      move: bestMove,
      depth
    }
    return [bestEval, bestMove];
  } else {
    let bestMove = null;
    let bestEval = Infinity;
    const moves = getMoves(board);
    if (lastBestMove) orderMoves(moves, lastBestMove);
    for (const move of moves) {
      const memMove = play(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimaxMemory(board, depth-1, alpha, beta);
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
    memory[hash(board)] = {
      eval: bestEval,
      move: bestMove,
      depth
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

function iterativeDeepening(board, maxTime) {
  timeLimit = maxTime
  startTime = Date.now()
  let bestMove = null;
  let bestEval = null;
  try {
    for (let depth = 1; depth < 2048; depth++) {
      const [currentEval, currentMove] = minimaxMemory(board, depth);
      bestEval = currentEval;
      bestMove = currentMove;
      if (Math.abs(bestEval) > 140) return [bestEval, bestMove];
    }
  } catch (error) {
      if (error.message !== "Timeout") throw error;
  }
  memory = {};
  return [bestEval, bestMove];
}

export const botList = {
  random: randomMove,
  minimax: (board, maxTime) => {
    return minimax(board, 6)[1];
  },
  iterativeDeepening: (board, maxTime) => {
    const startTime = Date.now();
    const move = iterativeDeepening(board, maxTime)[1];
    //console.log(`Iterative: ${Date.now() - startTime}`);
    return move;
  }
}