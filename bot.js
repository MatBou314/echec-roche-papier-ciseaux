import { play, getMoves } from "./board.js";

export function randomMove(board, maxTime) {
  const startTime = Date.now();
  while (Date.now() -startTime < maxTime) {
    let num = Math.sqrt(Math.random() * 9994737);
  }
  const moves = getMoves(board);
  return moves[Math.floor(Math.random() * moves.length)]
}

export const botList = {
  random: randomMove
}