import { play, UndoMove, isGameOver, casesContour, casesContourNoDiagonal } from "./board.js";

const captures = [null, 3, 1, 2];

const memMoves = Array(128);
for (let i = 0; i < 128; i++) memMoves[i] = new Uint32Array(72);

function getMoves(moves) {
  let count = 0;
  if (turn) {
    for (let i = 0; i < blueRocksCount; i++) {
      const from = blueRocks[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === -3) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < bluePapersCount; i++) {
      const from = bluePapers[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === -1) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < blueScissorsCount; i++) {
      const from = blueScissors[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === -2) moves[count++] = from << 8 | to;
      }
    }
  } else {
    for (let i = 0; i < redRocksCount; i++) {
      const from = redRocks[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === 3) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < redPapersCount; i++) {
      const from = redPapers[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === 1) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < redScissorsCount; i++) {
      const from = redScissors[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === 2) moves[count++] = from << 8 | to;
      }
    }
  }
  return count;
}

function getMovesOrdered(moves, bestMove) {
  let count = 0;
  let score = 0;
  if (turn) {
    for (let i = 0; i < blueRocksCount; i++) {
      const from = blueRocks[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0) {
            const move = from << 8 | to;
            score = move === bestMove ? 1024 : SQUAREVALUE[to];
            moves[count++] = score << 16 | move;
            
        } else if (toPiece === -3) {
          const move = from << 8 | to;
          score = move === bestMove ? 1024 : 50 - redScissorsCount
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < bluePapersCount; i++) {
      const from = bluePapers[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0) {
            const move = from << 8 | to;
            score = move === bestMove ? 1024 : SQUAREVALUE[to];
            moves[count++] = score << 16 | move;  
        } else if (toPiece === -1) {
          const move = from << 8 | to;
          score = move === bestMove ? 1024 : 50 - redRocksCount
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < blueScissorsCount; i++) {
      const from = blueScissors[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0) {
            const move = from << 8 | to;
            score = move === bestMove ? 1024 : SQUAREVALUE[to];
            moves[count++] = score << 16 | move;

        } else if (toPiece === -2) {
          const move = from << 8 | to;
          score = move === bestMove ? 1024 : 50 - redPapersCount
          moves[count++] = score << 16 | move;
        }
      }
    }
  } else {
    for (let i = 0; i < redRocksCount; i++) {
      const from = redRocks[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0) {
            const move = from << 8 | to;
            score = move === bestMove ? 1024 : SQUAREVALUE[80 - to];
            moves[count++] = score << 16 | move;

        } else if (toPiece === 3) {
          const move = from << 8 | to;
          score = move === bestMove ? 1024 : 50 - blueScissorsCount;
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < redPapersCount; i++) {
      const from = redPapers[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0) {
            const move = from << 8 | to;
            score = move === bestMove ? 1024 : SQUAREVALUE[80 - to];
            moves[count++] = score << 16 | move;
            
        } else if (toPiece === 1) {
          const move = from << 8 | to;
          score = move === bestMove ? 1024 : 50 - blueRocksCount;
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < redScissorsCount; i++) {
      const from = redScissors[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0) {
            const move = from << 8 | to;
            score = move === bestMove ? 1024 : SQUAREVALUE[80 - to];
            moves[count++] = score << 16 | move;
            
        } else if (toPiece === 2) {
          const move = from << 8 | to;
          score = move === bestMove ? 1024 : 50 - bluePapersCount;
          moves[count++] = score << 16 | move;
        }
      }
    }
  }
  moves.subarray(0, count).sort()
  return count;
}

function winner() {
  if (bluePiecesCount <= 0) return false;
  if (redPiecesCount <= 0) return true;
  if ((redSquaresCount + blueSquaresCount) >= 81) return (blueSquaresCount > redSquaresCount) ? true : false;
  return null;
}


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

function initialHash() {
  hash = 0n; // BigInt à 0

  for (let i = 0; i < 81; i++) {
    hash ^= zobristCases[(i * 3) + squares[i] + 1];
    hash ^= zobristPieces[(i * 7) + pieces[i] + 3];
  }

  if (turn) {
    hash ^= zobristTurn;
  }
}

const memFromPiece = new Int8Array(128);
const memToPiece   = new Int8Array(128);
const memToCase    = new Int8Array(128);
const memHash      = new BigUint64Array(128);
let movePtr = 0;

const squares = new Int8Array(81);
const pieces = new Int8Array(81);
let turn = true;
let hash = 0n;

let blueSquaresCount = 9;
let redSquaresCount = 9;

const blueRocks = new Uint8Array(3);
let blueRocksCount = 3;
const bluePapers = new Uint8Array(3);
let bluePapersCount = 3;
const blueScissors = new Uint8Array(3);
let blueScissorsCount = 3;

let bluePiecesCount = 9;

const redRocks = new Uint8Array(3);
let redRocksCount = 3;
const redPapers = new Uint8Array(3);
let redPapersCount = 3;
const redScissors = new Uint8Array(3);
let redScissorsCount = 3;

let redPiecesCount = 9;

let blueSquaresValue = 0;
let redSquaresValue = 0;

function initState(board) {
  movePtr = 0;
  squares.set(board.cases);
  pieces.set(board.pieces);
  turn = board.turn;

  bluePiecesCount = 0;
  redPiecesCount = 0;
  blueSquaresCount = 0;
  redSquaresCount = 0;
  blueRocksCount = 0;
  redRocksCount = 0;
  bluePapersCount = 0;
  redPapersCount = 0;
  blueScissorsCount = 0;
  redScissorsCount = 0;
  blueSquaresValue = 0;
  redSquaresValue = 0;
  for (let i = 0; i < 81; i++) {
    if (squares[i] === 1) {
      blueSquaresCount++;
      blueSquaresValue += SQUAREVALUE[i];
    }
    else if (squares[i] === -1) {
      redSquaresCount++;
      redSquaresValue += SQUAREVALUE[80-i];
    }

    const piece = pieces[i];
    if (piece > 0) {
      bluePiecesCount++;
      if (piece === 1) blueRocks[blueRocksCount++] = i;
      else if (piece === 2) bluePapers[bluePapersCount++] = i;
      else blueScissors[blueScissorsCount++] = i;
    }
    else if (piece < 0) {
      redPiecesCount++;
      if (piece === -1) redRocks[redRocksCount++] = i;
      else if (piece === -2) redPapers[redPapersCount++] = i;
      else redScissors[redScissorsCount++] = i;
    }
  }
  initialHash()
}

function playHash(from, to) {
  const toCase = squares[to];
  const toPiece = pieces[to];
  const fromPiece = pieces[from];

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

  if (toPiece > 0) {
      bluePiecesCount--;
      if (toPiece === 1) {
        const idx = blueRocks.indexOf(to);
        const lastPieceSquare = blueRocks[--blueRocksCount];
        blueRocks[idx] = lastPieceSquare;
      }
      else if (toPiece === 2) {
        const idx = bluePapers.indexOf(to);
        const lastPieceSquare = bluePapers[--bluePapersCount];
        bluePapers[idx] = lastPieceSquare;
      }
      else {
        const idx = blueScissors.indexOf(to);
        const lastPieceSquare = blueScissors[--blueScissorsCount];
        blueScissors[idx] = lastPieceSquare;
      }
  }
  else if (toPiece < 0) {
      redPiecesCount--;
      if (toPiece === -1) {
        const idx = redRocks.indexOf(to);
        const lastPieceSquare = redRocks[--redRocksCount];
        redRocks[idx] = lastPieceSquare;
      }
      else if (toPiece === -2) {
        const idx = redPapers.indexOf(to);
        const lastPieceSquare = redPapers[--redPapersCount];
        redPapers[idx] = lastPieceSquare;
      }
      else {
        const idx = redScissors.indexOf(to);
        const lastPieceSquare = redScissors[--redScissorsCount];
        redScissors[idx] = lastPieceSquare;
      }
  }

  if (fromPiece === 1) {
        const idx = blueRocks.indexOf(from);
        blueRocks[idx] = to;
  }
  else if (fromPiece === 2) {
    const idx = bluePapers.indexOf(from);
    bluePapers[idx] = to;
  }
  else if (fromPiece === 3) {
    const idx = blueScissors.indexOf(from);
    blueScissors[idx] = to;
  }
  else if (fromPiece === -1) {
        const idx = redRocks.indexOf(from);
        redRocks[idx] = to;
  }
  else if (fromPiece === -2) {
    const idx = redPapers.indexOf(from);
    redPapers[idx] = to;
  }
  else {
    const idx = redScissors.indexOf(from);
    redScissors[idx] = to;
  }

  if (toCase === 0) {
    if (fromPiece > 0) {
      blueSquaresCount++;
      squares[to] = 1;
      hash ^= zobristCases[toZorbC + 2];
      blueSquaresValue += SQUAREVALUE[to];

    } else {
      redSquaresCount++;
      squares[to] = -1;
      hash ^= zobristCases[toZorbC]
      redSquaresValue += SQUAREVALUE[80 - to];
    }
    hash ^= zobristCases[toZorbC + 1]
  }

  hash ^= zobristTurn;
  turn = !turn;
}

function UndoHash(from, to) {
  movePtr--;
  const fromPiece = memFromPiece[movePtr];
  const toPiece = memToPiece[movePtr];
  const toCase = memToCase[movePtr];
  const lastHash = memHash[movePtr];
  
  if (toCase === 0) {
    if (fromPiece > 0) {
      blueSquaresCount--;
      blueSquaresValue -= SQUAREVALUE[to];
    }
    else {
      redSquaresCount--;
      redSquaresValue -= SQUAREVALUE[80 - to];
    }
  }

  if (toPiece > 0) {
    bluePiecesCount++;
    if (toPiece === 1) blueRocks[blueRocksCount++] = to;
    else if (toPiece === 2) bluePapers[bluePapersCount++] = to;
    else blueScissors[blueScissorsCount++] = to;

  }
  else if (toPiece < 0) {
    redPiecesCount++; 
    if (toPiece === -1) redRocks[redRocksCount++] = to;
    else if (toPiece === -2) redPapers[redPapersCount++] = to;
    else redScissors[redScissorsCount++] = to;
  }

  if (fromPiece === 1) {
        const idx = blueRocks.indexOf(to);
        blueRocks[idx] = from;
  }
  else if (fromPiece === 2) {
    const idx = bluePapers.indexOf(to);
    bluePapers[idx] = from;
  }
  else if (fromPiece === 3) {
    const idx = blueScissors.indexOf(to);
    blueScissors[idx] = from;
  }
  else if (fromPiece === -1) {
        const idx = redRocks.indexOf(to);
        redRocks[idx] = from;
  }
  else if (fromPiece === -2) {
    const idx = redPapers.indexOf(to);
    redPapers[idx] = from;
  }
  else {
    const idx = redScissors.indexOf(to);
    redScissors[idx] = from;
  }


  squares[to] = toCase;
  pieces[to] = toPiece;
  pieces[from] = fromPiece;
  turn = !turn;
  hash = lastHash;
}

function isGameOverOpt() {
  return (bluePiecesCount <= 0) || (redPiecesCount <= 0) || (blueSquaresCount + redSquaresCount >= 81);
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


const SQUAREVALUE = new Uint8Array([
  30, 31, 32, 33, 34, 36, 34, 34, 34,
  30, 31, 32, 34, 36, 35, 35, 35, 35, 
  30, 31, 33, 36, 35, 35, 36, 36, 37,
  0 , 0 , 0 , 34, 34, 35, 0 , 0 , 0 ,
  0 , 0 , 0 , 34, 34, 35, 0 , 0 , 0 ,
  0 , 0 , 0 , 34, 34, 35, 0 , 0 , 0 ,
  30, 31, 33, 36, 35, 35, 36, 36, 37,
  30, 31, 32, 34, 36, 35, 35, 35, 35,
  30, 31, 32, 33, 34, 36, 34, 34, 34,
]);

function imbalance() {
  const bluePower = (blueRocksCount * (5 + redScissorsCount - redPapersCount) 
                    + bluePapersCount * (5 + redRocksCount - redScissorsCount) 
                    + blueScissorsCount * (5 + redPapersCount - redRocksCount));

  const redPower = (redRocksCount * (5 + blueScissorsCount - bluePapersCount) 
                    + redPapersCount * (5 + blueRocksCount - blueScissorsCount) 
                    + redScissorsCount * (5 + bluePapersCount - blueRocksCount));
  return bluePower - redPower;
}

function emptyProximity() {
  let score = 0;
  for (let i = 0; i < 81; i++) {
    if (squares[i] !== 0) continue;
    let colorTouched = false;
    const contour = casesContourNoDiagonal[i];
    for (let j = 0; j < contour.length; j++) {
      if (squares[contour[j]] !== 0) { colorTouched = true; break; }
    }
    if (!colorTouched) continue;

    let minBlueR = 10;
    for (let j = 0; j < blueRocksCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + blueRocks[j]];
      if (pieceDist < minBlueR) minBlueR = pieceDist;
    }
    let minBlueP = 10;
    for (let j = 0; j < bluePapersCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + bluePapers[j]];
      if (pieceDist < minBlueP) minBlueP = pieceDist;
    }
    let minBlueS = 10;
    for (let j = 0; j < blueScissorsCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + blueScissors[j]];
      if (pieceDist < minBlueS) minBlueS = pieceDist;
    }

    let minRedR = 10;
    for (let j = 0; j < redRocksCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + redRocks[j]];
      if (pieceDist < minRedR) minRedR = pieceDist;
    }
    let minRedP = 10;
    for (let j = 0; j < redPapersCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + redPapers[j]];
      if (pieceDist < minRedP) minRedP = pieceDist;
    }
    let minRedS = 10;
    for (let j = 0; j < redScissorsCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + redScissors[j]];
      if (pieceDist < minRedS) minRedS = pieceDist;
    }
    score += minRedR + minRedP + minRedS - minBlueR - minBlueP - minBlueS;
  }
  return score;
}

function piecesProximity(attackFactor=1) {
  let score = 0;
  let min = 10;

  // Blue Rocks
  for (let i = 0; i < blueRocksCount; i++) {
    const square = blueRocks[i] * 81;
    min = 10;
    for (let j = 0; j < redScissorsCount; j++) {
      const piecesDist = DIST_TABLE[square + redScissors[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score += (10 - min) * 4 * attackFactor;

    min = 10;
    for (let j = 0; j < blueScissorsCount; j++) {
      const piecesDist = DIST_TABLE[square + blueScissors[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score += 10 - min;
  }

  // Blue Papers
  for (let i = 0; i < bluePapersCount; i++) {
    const square = bluePapers[i] * 81;
    min = 10;
    for (let j = 0; j < redRocksCount; j++) {
      const piecesDist = DIST_TABLE[square + redRocks[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score += (10 - min) * 4 * attackFactor;

    min = 10;
    for (let j = 0; j < blueRocksCount; j++) {
      const piecesDist = DIST_TABLE[square + blueRocks[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score += 10 - min;
  }

  // Blue Scissors
  for (let i = 0; i < blueScissorsCount; i++) {
    const square = blueScissors[i] * 81;
    min = 10;
    for (let j = 0; j < redPapersCount; j++) {
      const piecesDist = DIST_TABLE[square + redPapers[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score += (10 - min) * 4 * attackFactor;

    min = 10;
    for (let j = 0; j < bluePapersCount; j++) {
      const piecesDist = DIST_TABLE[square + bluePapers[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score += 10 - min;
  }

  // Red Rocks
  for (let i = 0; i < redRocksCount; i++) {
    const square = redRocks[i] * 81;
    min = 10;
    for (let j = 0; j < blueScissorsCount; j++) {
      const piecesDist = DIST_TABLE[square + blueScissors[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score -= (10 - min) * 4 * attackFactor;

    min = 10;
    for (let j = 0; j < redScissorsCount; j++) {
      const piecesDist = DIST_TABLE[square + redScissors[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score -= 10 - min;
  }

  // Red Papers
  for (let i = 0; i < redPapersCount; i++) {
    const square = redPapers[i] * 81;
    min = 10;
    for (let j = 0; j < blueRocksCount; j++) {
      const piecesDist = DIST_TABLE[square + blueRocks[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score -= (10 - min) * 4 * attackFactor;

    min = 10;
    for (let j = 0; j < redRocksCount; j++) {
      const piecesDist = DIST_TABLE[square + redRocks[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score -= 10 - min;
  }

  // Red Scissors
  for (let i = 0; i < redScissorsCount; i++) {
    const square = redScissors[i] * 81;
    min = 10;
    for (let j = 0; j < bluePapersCount; j++) {
      const piecesDist = DIST_TABLE[square + bluePapers[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score -= (10 - min) * 4 * attackFactor;

    min = 10;
    for (let j = 0; j < redPapersCount; j++) {
      const piecesDist = DIST_TABLE[square + redPapers[j]];
      if (piecesDist < min) min = piecesDist;
    }
    score -=  10 - min;
  }
  return score;
}

function evalTotale() {
  if (blueSquaresCount >= 41) return 200 + imbalance() * 42 + emptyProximity() * 8 + blueSquaresCount + redSquaresCount + piecesProximity(2) * 3;
  if (redSquaresCount >= 41) return -200 + imbalance() * 42 + emptyProximity() * 8 - blueSquaresCount - redSquaresCount + piecesProximity(2) * 3;
  return imbalance() * 40 + emptyProximity() * 2 + (blueSquaresValue - redSquaresValue) + piecesProximity();
}

let memory = new Map();
let nodeCount = 0;
let timeLimit = 0;
let startTime = 0;

function minimaxMemory(depth, evalFunction, alpha = -Infinity, beta = Infinity) {
  if (depth <= 0) {
    if (memToPiece[movePtr-1] === 0) {
      nodeCount++;
      if ((nodeCount & 2047) === 0) {
        if (Date.now() - startTime > timeLimit) throw new Error("Timeout");
      }
      return evalFunction();
    }
  }
  if (isGameOverOpt()) {
    nodeCount++;
      if ((nodeCount & 2047) === 0) {
        if (Date.now() - startTime > timeLimit) throw new Error("Timeout");
      }
    return winner() ? 9999999 + depth : -9999999 - depth;
  }
  const boardMemory = memory.get(hash)
  let lastBestMove = null;
  if (boardMemory) {
    if (boardMemory.depth >= depth) {
      if (boardMemory.flag === "EXACT") return boardMemory.eval;
      if (boardMemory.flag === "LOWER" && boardMemory.eval >= beta) return boardMemory.eval;
      if (boardMemory.flag === "UPPER" && boardMemory.eval <= alpha) return boardMemory.eval;
    }
  lastBestMove = boardMemory.move;
  }
  let flag = "EXACT";
  const originAlpha = alpha;
  const originBeta = beta;

  if (turn) {
    let bestMove = null;
    let bestEval = -Infinity;
    const moves = memMoves[movePtr];
    const movesCount = getMovesOrdered(moves, lastBestMove);
    for (let i = movesCount-1; i >= 0; i--) {
      const move = moves[i] & 0xFFFF;
      const from = move >> 8;
      const to = move & 255;
      playHash(from, to);
      let moveEval;
      if (i === movesCount-1) {
        moveEval = minimaxMemory(depth-1, evalFunction, alpha, beta);
      } else {
        moveEval = minimaxMemory(depth-1, evalFunction, alpha, alpha + 1);
      }
      if (moveEval > alpha && moveEval < beta) {
          moveEval = minimaxMemory(depth - 1, evalFunction, moveEval, beta);
      }
      UndoHash(from, to);
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
      memory.set(hash, {
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
    const moves = memMoves[movePtr];
    const movesCount = getMovesOrdered(moves, lastBestMove);
    for (let i = movesCount-1; i >= 0; i--) {
      const move = moves[i] & 0xFFFF;
      const from = move >> 8;
      const to = move & 255; 
      playHash(from, to);
      let moveEval;
      if (i === movesCount-1) {
        moveEval = minimaxMemory(depth-1, evalFunction, alpha, beta);
      } else {
        moveEval = minimaxMemory(depth-1, evalFunction, beta - 1, beta);
      }
      if (moveEval < beta && moveEval > alpha) {
          moveEval = minimaxMemory(depth - 1, evalFunction, alpha, moveEval);
      }
      UndoHash(from, to);
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
      memory.set(hash, {
        eval: bestEval,
        flag,
        move: bestMove,
        depth
      })
  }
  return bestEval;
  }  
}

function getMinimax(depth, evalFunction, lastBestMove, alpha = -Infinity, beta = Infinity) {
  if (turn) {
    let bestMove = null;
    let bestEval = -Infinity;
    const moves = memMoves[movePtr];
    const movesCount = getMovesOrdered(moves, lastBestMove);
    for (let i = movesCount-1; i >= 0; i--) {
      const move = moves[i] & 0xFFFF;
      const from = move >> 8;
      const to = move & 255;
      playHash(from, to);
      let moveEval;
      if (i === movesCount-1) {
        moveEval = minimaxMemory(depth-1, evalFunction, alpha, beta);
      } else {
        moveEval = minimaxMemory(depth-1, evalFunction, alpha, alpha+1);
      }
      if (moveEval > alpha && moveEval < beta) {
          moveEval = minimaxMemory(depth - 1, evalFunction, moveEval, beta);
      }
      UndoHash(from, to);
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
    const moves = memMoves[movePtr];
    const movesCount = getMovesOrdered(moves, lastBestMove);
    for (let i = movesCount-1; i >= 0; i--) {
      const move = moves[i] & 0xFFFF;
      const from = move >> 8;
      const to = move & 255; 
      playHash(from, to);
      let moveEval;
      if (i === movesCount-1) {
        moveEval = minimaxMemory(depth-1, evalFunction, alpha, beta);
      } else {
        moveEval = minimaxMemory(depth-1, evalFunction, beta - 1, beta);
      }
      if (moveEval < beta && moveEval > alpha) {
          moveEval = minimaxMemory(depth - 1, evalFunction, alpha, moveEval);
      }
      UndoHash(from, to);
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

function orderMoves(moves,  bestMove) {
  const idx = moves.indexOf(bestMove);
  const temp = moves[0];
  moves[0] = bestMove;
  moves[idx] = temp;
}

let totNode = 0;
let computedMoves = 0;

function iterativeDeepening(board, maxTime, evalFunction=evaluation) {
  //console.profile("Iterative");
  timeLimit = maxTime
  startTime = Date.now()
  let bestMove = null;
  let bestEval = null;
  let reachedDepth = 0;
  initState(board);
  memory = new Map();
  movePtr = 0;
  nodeCount = 0;
  try {
    for (let depth = 2; depth < 2048; depth++) {
      const [currentEval, currentMove] = getMinimax(depth, evalFunction, bestMove);
      bestEval = currentEval;
      bestMove = currentMove;
      reachedDepth = depth;
      postMessage({
        type: "analysisUpdate",
        depth: reachedDepth,
        eval: Math.round(bestEval)/100,
        move: `${currentMove >> 8} => ${currentMove & 255}`
      });
      if (Math.abs(bestEval) > 9999999) return [bestEval, bestMove];
      if (depth === 8) console.log(nodeCount, " nodes avant depth 8");
    }
  } catch (error) {
      if (error.message !== "Timeout") throw error;
  }
  totNode += nodeCount;
  computedMoves++;
  console.log(`C ${evalFunction.name} (${board.turn ? "blue" : "red"}):
  depth: ${reachedDepth}
  eval ${bestEval}
  nodeCount: ${nodeCount}
  meanNode: ${totNode/computedMoves}
  `);
  //console.profileEnd("Iterative")
  return [bestEval, bestMove];
}

export const botList3 = {
  "Bot C1": (board, maxTime) => {
    const move = iterativeDeepening(board, maxTime, evalTotale)[1];
    return [move >> 8, move & 255];
  },
}