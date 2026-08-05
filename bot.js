import { play, getMoves } from "./board.js";

export function randomMove(board) {
  const moves = getMoves(board);
  return moves[Math.floor(Math.random() * moves.length)]
}