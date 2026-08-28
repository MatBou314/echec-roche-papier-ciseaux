import { play, UndoMove, isGameOver, casesContour, casesContourNoDiagonal } from "./board.js";

const captures = [null, 3, 1, 2];

const memMoves = Array(128);
for (let i = 0; i < 128; i++) memMoves[i] = new Uint32Array(72);

function getMoves(moves) {
  let count = 0;
  if (turn) {
    for (let i = 0; i < blueRCount; i++) {
      const from = blueRocks[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === -3) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < bluePCount; i++) {
      const from = bluePapers[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === -1) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < blueSCount; i++) {
      const from = blueScissors[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === -2) moves[count++] = from << 8 | to;
      }
    }
  } else {
    for (let i = 0; i < blueRCount; i++) {
      const from = redRocks[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === 3) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < redPCount; i++) {
      const from = redPapers[i];
      const contour = casesContour[from];
      for (let j = 0; j < contour.length; j++) {
        const to = contour[j];
        const toPiece = pieces[to];
        if (toPiece === 0 || toPiece === 1) moves[count++] = from << 8 | to;
      }
    }

    for (let i = 0; i < redSCount; i++) {
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
    for (let i = 0; i < blueRCount; i++) {
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
          score = move === bestMove ? 1024 : 50 - redSCount
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < bluePCount; i++) {
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
          score = move === bestMove ? 1024 : 50 - blueRCount
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < blueSCount; i++) {
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
          score = move === bestMove ? 1024 : 50 - redPCount
          moves[count++] = score << 16 | move;
        }
      }
    }
  } else {
    for (let i = 0; i < blueRCount; i++) {
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
          score = move === bestMove ? 1024 : 50 - blueSCount;
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < redPCount; i++) {
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
          score = move === bestMove ? 1024 : 50 - blueRCount;
          moves[count++] = score << 16 | move;
        }
      }
    }

    for (let i = 0; i < redSCount; i++) {
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
          score = move === bestMove ? 1024 : 50 - bluePCount;
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
let blueRCount = 3;
const bluePapers = new Uint8Array(3);
let bluePCount = 3;
const blueScissors = new Uint8Array(3);
let blueSCount = 3;

let bluePiecesCount = 9;

const redRocks = new Uint8Array(3);
let redRCount = 3;
const redPapers = new Uint8Array(3);
let redPCount = 3;
const redScissors = new Uint8Array(3);
let redSCount = 3;

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
  blueRCount = 0;
  redRCount = 0;
  bluePCount = 0;
  redPCount = 0;
  blueSCount = 0;
  redSCount = 0;
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
      if (piece === 1) blueRocks[blueRCount++] = i;
      else if (piece === 2) bluePapers[bluePCount++] = i;
      else blueScissors[blueSCount++] = i;
    }
    else if (piece < 0) {
      redPiecesCount++;
      if (piece === -1) redRocks[redRCount++] = i;
      else if (piece === -2) redPapers[redPCount++] = i;
      else redScissors[redSCount++] = i;
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
        const lastPieceSquare = blueRocks[--blueRCount];
        blueRocks[idx] = lastPieceSquare;
      }
      else if (toPiece === 2) {
        const idx = bluePapers.indexOf(to);
        const lastPieceSquare = bluePapers[--bluePCount];
        bluePapers[idx] = lastPieceSquare;
      }
      else {
        const idx = blueScissors.indexOf(to);
        const lastPieceSquare = blueScissors[--blueSCount];
        blueScissors[idx] = lastPieceSquare;
      }
  }
  else if (toPiece < 0) {
      redPiecesCount--;
      if (toPiece === -1) {
        const idx = redRocks.indexOf(to);
        const lastPieceSquare = redRocks[--redRCount];
        redRocks[idx] = lastPieceSquare;
      }
      else if (toPiece === -2) {
        const idx = redPapers.indexOf(to);
        const lastPieceSquare = redPapers[--redPCount];
        redPapers[idx] = lastPieceSquare;
      }
      else {
        const idx = redScissors.indexOf(to);
        const lastPieceSquare = redScissors[--redSCount];
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
    if (toPiece === 1) blueRocks[blueRCount++] = to;
    else if (toPiece === 2) bluePapers[bluePCount++] = to;
    else blueScissors[blueSCount++] = to;

  }
  else if (toPiece < 0) {
    redPiecesCount++; 
    if (toPiece === -1) redRocks[redRCount++] = to;
    else if (toPiece === -2) redPapers[redPCount++] = to;
    else redScissors[redSCount++] = to;
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



function potentialTerritory2() {
  let score = 0;

  for (let i = 0; i < 81; i++) {
    if (squares[i] !== 0) continue;
    /*
    let colorTouched = false;
    const contour = casesContourNoDiagonal[i];
    for (let j = 0; j < contour.length; j++) {
      if (squares[contour[j]] !== 0) { colorTouched = true; break; }
    }
    if (!colorTouched) continue;
   */
    let minBlue = 10;

    for (let j = 0; j < blueRCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + blueRocks[j]];
      if (pieceDist < minBlue) minBlue = pieceDist;
    }
    for (let j = 0; j < bluePCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + bluePapers[j]];
      if (pieceDist < minBlue) minBlue = pieceDist;
    }
    for (let j = 0; j < blueSCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + blueScissors[j]];
      if (pieceDist < minBlue) minBlue = pieceDist;
    }

    let minRed = 10;
    for (let j = 0; j < redRCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + redRocks[j]];
      if (pieceDist < minRed) minRed = pieceDist;
    }
  
    for (let j = 0; j < redPCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + redPapers[j]];
      if (pieceDist < minRed) minRed = pieceDist;
    }

    for (let j = 0; j < redSCount; j++) {
      const pieceDist = DIST_TABLE[81 * i + redScissors[j]];
      if (pieceDist < minRed) minRed = pieceDist;
    }
    if (minBlue < minRed) score += 10;
    else if (minBlue === minRed) score += turn ? 10 : -10;
    else score -= 10;
  }
  return score;
}


const flatBlue = new Uint8Array(9);
const flatRed = new Uint8Array(9);

function potentialTerritory() {
  let bCount = 0;
  for (let j = 0; j < blueRCount; j++) flatBlue[bCount++] = blueRocks[j];
  for (let j = 0; j < bluePCount; j++) flatBlue[bCount++] = bluePapers[j];
  for (let j = 0; j < blueSCount; j++) flatBlue[bCount++] = blueScissors[j];

  let rCount = 0;
  for (let j = 0; j < redRCount; j++) flatRed[rCount++] = redRocks[j];
  for (let j = 0; j < redPCount; j++) flatRed[rCount++] = redPapers[j];
  for (let j = 0; j < redSCount; j++) flatRed[rCount++] = redScissors[j];

  let score = 0;
  
  for (let i = 0; i < 81; i++) {
    if (squares[i] !== 0) continue;
    
    const offset = i * 81;
    let minBlue = 10;
    let minRed = 10;

    for (let j = 0; j < bCount; j++) {
      const pieceDist = DIST_TABLE[offset + flatBlue[j]];
      if (pieceDist < minBlue) minBlue = pieceDist;
    }

    for (let j = 0; j < rCount; j++) {
      const pieceDist = DIST_TABLE[offset + flatRed[j]];
      if (pieceDist < minRed) minRed = pieceDist;
    }

    if (minBlue < minRed) score += 8;
    else if (minBlue === minRed) score += turn ? 8 : -8;
    else score -= 8;
    score += (minRed - minBlue) * 0.1
  }
  
  return score;
}


function imbalance2() {
  const bluePower = (blueRCount * (5 + redSCount - redPCount) 
                    + bluePCount * (5 + redRCount - redSCount) 
                    + blueSCount * (5 + redPCount - redRCount));

  const redPower = (redRCount * (5 + blueSCount - bluePCount) 
                    + redPCount * (5 + blueRCount - blueSCount) 
                    + redSCount * (5 + bluePCount - blueRCount));
  return bluePower - redPower;
}

function imbalance() {
  const idx = (blueRCount << 10) | (bluePCount << 8) | (blueSCount << 6) | (redRCount << 4) | (redPCount << 2) | redSCount;
  return MATERIAL_TABLE[idx];
}

function minimaxMaterial(bR, bP, bS, rR, rP, rS, turn) {
  let bestEval = turn ? -Infinity : Infinity;
  if (turn) {
    if (bR > 0 && rS > 0) {
      const moveEval = minimaxMaterial(bR, bP, bS, rR, rP, rS-1, !turn)
      if (moveEval > bestEval) bestEval = moveEval;
    }
    if (bP > 0 && rR > 0) {
      const moveEval = minimaxMaterial(bR, bP, bS, rR-1, rP, rS, !turn)
      if (moveEval > bestEval) bestEval = moveEval;
    }
    if (bS > 0 && rP > 0) {
      const moveEval = minimaxMaterial(bR, bP, bS, rR, rP-1, rS, !turn)
      if (moveEval > bestEval) bestEval = moveEval;
    }
  } else {
    if (rR > 0 && bS > 0) {
      const moveEval = minimaxMaterial(bR, bP, bS-1, rR, rP, rS, !turn)
      if (moveEval < bestEval) bestEval = moveEval;
    }
    if (rP > 0 && bR > 0) {
      const moveEval = minimaxMaterial(bR-1, bP, bS, rR, rP, rS, !turn)
      if (moveEval < bestEval) bestEval = moveEval;
    }
    if (rS > 0 && bP > 0) {
      const moveEval = minimaxMaterial(bR, bP-1, bS, rR, rP, rS, !turn)
      if (moveEval < bestEval) bestEval = moveEval;
    }
  }
  if (bestEval === (turn ? -Infinity : Infinity)) {
    return bR + bP + bS - rR - rP - rS;
  }
  return bestEval;
}

const MATERIAL_TABLE = new Int16Array(4096);
function initMaterialTable() {
  for (let bR = 0; bR <= 3; bR++) {
    for (let bP = 0; bP <= 3; bP++) {
      for (let bS = 0; bS <= 3; bS++) {
        for (let rR = 0; rR <= 3; rR++) {
          for (let rP = 0; rP <= 3; rP++) {
            for (let rS = 0; rS <= 3; rS++) {
              const scoreBlueFirst = minimaxMaterial(bR, bP, bS, rR, rP, rS, true);
              const scoreRedFirst = minimaxMaterial(bR, bP, bS, rR, rP, rS, false);
              const finalScore = (scoreBlueFirst + scoreRedFirst) / 2;
              const index = (bR << 10) | (bP << 8) | (bS << 6) | (rR << 4) | (rP << 2) | rS;
              MATERIAL_TABLE[index] = Math.round(finalScore * 220);
            }
          }
        }
      }
    }
  }
}
initMaterialTable();

function piecesProximity(blueAtkFactor=2, redAtkFactor=2) {
  let blueAtkSum = 0, blueAtkCount = 0;
  let blueDefSum = 0, blueDefCount = 0;

  let redAtkSum = 0, redAtkCount = 0;
  let redDefSum = 0, redDefCount = 0;

  // ================= BLEUS =================
  
  // Blue Rocks
  for (let i = 0; i < blueRCount; i++) {
    const sq = blueRocks[i] * 81;
    
    if (redSCount > 0) {
      let minAtk = 10;
      for (let j = 0; j < redSCount; j++) {
        const d = DIST_TABLE[sq + redScissors[j]];
        if (d < minAtk) minAtk = d;
      }
      blueAtkSum += 10 - minAtk;
      blueAtkCount++;
    }

    if (blueSCount > 0) {
      let minDef = 10;
      for (let j = 0; j < blueSCount; j++) {
        const d = DIST_TABLE[sq + blueScissors[j]];
        if (d < minDef) minDef = d;
      }
      blueDefSum += 10 - minDef;
      blueDefCount++;
    }
  }

  // Blue Papers
  for (let i = 0; i < bluePCount; i++) {
    const sq = bluePapers[i] * 81;

    if (redRCount > 0) {
      let minAtk = 10;
      for (let j = 0; j < blueRCount; j++) {
        const d = DIST_TABLE[sq + redRocks[j]];
        if (d < minAtk) minAtk = d;
      }
      blueAtkSum += 10 - minAtk;
      blueAtkCount++;
    }

    if (blueRCount > 0) {
      let minDef = 10;
      for (let j = 0; j < blueRCount; j++) {
        const d = DIST_TABLE[sq + blueRocks[j]];
        if (d < minDef) minDef = d;
      }
      blueDefSum += 10 - minDef;
      blueDefCount++;
    }
  }

  // Blue Scissors
  for (let i = 0; i < blueSCount; i++) {
    const sq = blueScissors[i] * 81;

    if (redPCount > 0) {
      let minAtk = 10;
      for (let j = 0; j < redPCount; j++) {
        const d = DIST_TABLE[sq + redPapers[j]];
        if (d < minAtk) minAtk = d;
      }
      blueAtkSum += 10 - minAtk;
      blueAtkCount++;
    }

    if (bluePCount > 0) {
      let minDef = 10;
      for (let j = 0; j < bluePCount; j++) {
        const d = DIST_TABLE[sq + bluePapers[j]];
        if (d < minDef) minDef = d;
      }
      blueDefSum += 10 - minDef;
      blueDefCount++;
    }
  }

  // ================= ROUGES =================

  // Red Rocks
  for (let i = 0; i < redRCount; i++) {
    const sq = redRocks[i] * 81;

    if (blueSCount > 0) {
      let minAtk = 10;
      for (let j = 0; j < blueSCount; j++) {
        const d = DIST_TABLE[sq + blueScissors[j]];
        if (d < minAtk) minAtk = d;
      }
      redAtkSum += 10 - minAtk;
      redAtkCount++;
    }

    if (redSCount > 0) {
      let minDef = 10;
      for (let j = 0; j < redSCount; j++) {
        const d = DIST_TABLE[sq + redScissors[j]];
        if (d < minDef) minDef = d;
      }
      redDefSum += 10 - minDef;
      redDefCount++;
    }
  }

  // Red Papers
  for (let i = 0; i < redPCount; i++) {
    const sq = redPapers[i] * 81;

    if (blueRCount > 0) {
      let minAtk = 10;
      for (let j = 0; j < blueRCount; j++) {
        const d = DIST_TABLE[sq + blueRocks[j]];
        if (d < minAtk) minAtk = d;
      }
      redAtkSum += 10 - minAtk;
      redAtkCount++;
    }

    if (redRCount > 0) {
      let minDef = 10;
      for (let j = 0; j < blueRCount; j++) {
        const d = DIST_TABLE[sq + redRocks[j]];
        if (d < minDef) minDef = d;
      }
      redDefSum += 10 - minDef;
      redDefCount++;
    }
  }

  // Red Scissors
  for (let i = 0; i < redSCount; i++) {
    const sq = redScissors[i] * 81;

    if (bluePCount > 0) {
      let minAtk = 10;
      for (let j = 0; j < bluePCount; j++) {
        const d = DIST_TABLE[sq + bluePapers[j]];
        if (d < minAtk) minAtk = d;
      }
      redAtkSum += 10 - minAtk;
      redAtkCount++;
    }

    if (redPCount > 0) {
      let minDef = 10;
      for (let j = 0; j < redPCount; j++) {
        const d = DIST_TABLE[sq + redPapers[j]];
        if (d < minDef) minDef = d;
      }
      redDefSum += 10 - minDef;
      redDefCount++;
    }
  }

  const blueAvgAtk = blueAtkCount > 0 ? (blueAtkSum / blueAtkCount) : 0;
  const blueAvgDef = blueDefCount > 0 ? (blueDefSum / blueDefCount) : 0;

  const redAvgAtk  = redAtkCount > 0  ? (redAtkSum / redAtkCount)   : 0;
  const redAvgDef  = redDefCount > 0  ? (redDefSum / redDefCount)   : 0;

  const blueScore = (blueAvgAtk * 2 * blueAtkFactor + blueAvgDef)/(blueAtkFactor + 1);
  const redScore  = (redAvgAtk * 2 * redAtkFactor  + redAvgDef)/(redAtkFactor + 1);

  return blueScore - redScore;
}

function evalTotale() {
  if (blueSquaresCount >= 41) return 879 + imbalance() * 4 + potentialTerritory() + blueSquaresCount + redSquaresCount + piecesProximity(4, 1.5) * 20;
  if (redSquaresCount >= 41) return -879 + imbalance() * 4 + potentialTerritory() - blueSquaresCount - redSquaresCount + piecesProximity(1.5, 4) * 20;
  //console.log(imbalance(), potentialTerritory(), (blueSquaresValue - redSquaresValue), piecesProximity() * 5)
  return imbalance() * 3 + potentialTerritory() + (blueSquaresValue - redSquaresValue) + piecesProximity(4, 4) * 20;
}

function evalAgressive() {

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

function iterativeDeepening(board, maxTime, evalFunction = evalTotale) {
  //console.profile("Iterative");
  timeLimit = maxTime;
  startTime = Date.now();
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
      if (Math.abs(bestEval) > 9999999) break;
      console.log(depth, nodeCount);
    }
  } catch (error) {
      if (error.message !== "Timeout") throw error;
  }
  totNode += nodeCount;
  computedMoves++;
  console.log(`D ${evalFunction.name} (${board.turn ? "blue" : "red"}):
  depth: ${reachedDepth}
  eval ${Math.round(bestEval)/100}
  nodeCount: ${nodeCount}
  meanNode: ${totNode/computedMoves}
  `);
  //console.profileEnd("Iterative")
  return [bestEval, bestMove];
}

export const botList4 = {
  "Bot D1": (board, maxTime) => {
    const move = iterativeDeepening(board, maxTime, evalTotale)[1];
    return [move >> 8, move & 255];
  },
}