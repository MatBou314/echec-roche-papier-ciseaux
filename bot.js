import { play, getMoves, UndoMove, isGameOver, winner } from "./board.js";

export function randomMove(board, maxTime) {
  const startTime = Date.now();
  while (Date.now() -startTime < maxTime) {
    let num = Math.sqrt(Math.random() * 9994737);
  }
  const moves = getMoves(board);
  return moves[Math.floor(Math.random() * moves.length)]
}

function evaluation(board) {
  let score = 0;
  for (const square of board.cases) {
    score += square;
  }
  for (const piece of board.pieces) {
    score += (piece > 0) * 5;
  }
  return score;
}

function minimax(board, depth) {
  if (depth <= 0) return [evaluation(board), null];
  if (isGameOver(board)) return [winner(board) ? 150 : -150, null]
  if (board.turn) {
    let bestMove = null;
    let bestEval = -Infinity;
    const moves = getMoves(board);
    for (const move of moves) {
      const memMove = play(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimax(board, depth-1);
      UndoMove(board, memMove);
      if (moveEval > bestEval) {
        bestEval = moveEval;
        bestMove = move;
      }
    }
    return [bestEval, bestMove];
  } else {
    let bestMove = null;
    let bestEval = Infinity;
    const moves = getMoves(board);
    for (const move of moves) {
      const memMove = play(board, move[0], move[1]);
      const [moveEval, TestBestMove] = minimax(board, depth-1);
      UndoMove(board, memMove);
      if (moveEval < bestEval) {
        bestEval = moveEval;
        bestMove = move;
      }
    }
    return [bestEval, bestMove];
  }
  
}


export const botList = {
  random: randomMove,
  minimax: (board, maxTime) => {
    return minimax(board, 4)[1];
  }
}