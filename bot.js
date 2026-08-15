import { play, getMoves, UndoMove, isGameOver, winner } from "./board.js";

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

function minimaxMemory(board, depth, alpha = -Infinity, beta = Infinity, memory = {}) {
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


export const botList = {
  random: randomMove,
  minimax: (board, maxTime) => {
    return minimax(board, 6)[1];
  }
}