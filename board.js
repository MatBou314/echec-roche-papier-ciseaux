const captures = [null, 3, 1, 2];

const casesDebut = new Int8Array([
  ...Array(27).fill(0),
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  ...Array(27).fill(0)
])

const piecesDebut = new Int8Array([
  ...Array(27).fill(0),
  2, 3, 1, 0, 0, 0, -1, -3, -2,
  3, 1, 2, 0, 0, 0, -2, -1, -3,
  1, 2, 3, 0, 0, 0, -3, -2, -1,
  ...Array(27).fill(0)
])


function getCaseContour(caseIdx) {
  let casesContour = [];
  const isLeft = ((caseIdx % 9) === 0);
  const isRight = ((caseIdx % 9) === 8);
  if (!isLeft) {
    casesContour.push(caseIdx - 10);
    casesContour.push(caseIdx - 1);
    casesContour.push(caseIdx + 8);
  }
  if (!isRight) {
    casesContour.push(caseIdx - 8);
    casesContour.push(caseIdx + 1);
    casesContour.push(caseIdx + 10);
  }
  casesContour.push(caseIdx - 9);
  casesContour.push(caseIdx + 9);
  return casesContour.filter(idx => (idx >= 0 && idx < 81))
}

export const casesContour = new Array(81);

for (let i = 0; i < 81; i++) {
  casesContour[i] = getCaseContour(i);
}

export function newBoard() {
  return {
    cases: new Int8Array(casesDebut),
    pieces: new Int8Array(piecesDebut),
    turn: true,
    eval: 0,
    gameOver: false,
    emptyCases: 63,
    bluePiece: 9,
    redPiece: 9,
    hash: null
  }
}

export function getMoves(board) {
  const pieces = board.pieces;
  const turn = board.turn;
  let moves = [];
  for (let fromIdx = 0; fromIdx < 81; fromIdx++) {
    const piece = pieces[fromIdx];
    if (piece === 0) continue;
    if (piece > 0 !== turn) continue;
    for (const toIdx of casesContour[fromIdx]) {
      if (canPieceGo(pieces, piece, toIdx)) moves.push([fromIdx, toIdx]);
    }
  }
  return moves;
}

function canPieceGo(pieces, piece, toIdx) {
  const toPiece = pieces[toIdx];
  if (toPiece === 0) return true;
  if ((toPiece * piece < 0) && (captures[Math.abs(piece)] === Math.abs(toPiece))) return true; 
  return false;
}

export function isLegal(board, from, to) {
  const fromPiece = board.pieces[from];
  if (fromPiece === 0 || (fromPiece > 0) !== board.turn) return false;
  if (casesContour[from].includes(to) && canPieceGo(board.pieces, fromPiece, to)) return true;
  return false;
}

export function getCasesCount(board) {
  let blueCount = 0;
  let redCount = 0;
  for (const c of board.cases) {
    if (c === 1) {blueCount += 1; continue;}
    if (c === -1) redCount += 1;
  }
  return [blueCount, redCount];
}

export function play(board, from, to) {
  const pieces = board.pieces;
  const toCase = board.cases[to];
  const captured = pieces[to];
  const piece = pieces[from];
  pieces[from] = 0;
  pieces[to] = piece;
  if (toCase === 0) board.cases[to] = (piece > 0) ? 1 : -1;
  board.turn = !board.turn;
  return {from, to, piece, captured, toCase};
}

export function UndoMove(board, lastMove) {
  const from = lastMove.from;
  const to = lastMove.to;
  const pieces = board.pieces;
  board.cases[to] = lastMove.toCase;
  pieces[to] = lastMove.captured;
  pieces[from] = lastMove.piece;
  board.turn = !board.turn;
}

export function isGameOver(board) {
  if (!board.cases.includes(0)) return true;
  if (!board.pieces.some(p => p > 0)) return true;
  if (!board.pieces.some(p => p < 0)) return true;
  return false;
}

export function winner(board) {
  if (!board.cases.includes(0)) {const casesCount = getCasesCount(board); return (casesCount[0] > casesCount[1]) ? true : false;}
  if (!board.pieces.some(p => p > 0)) return false;
  if (!board.pieces.some(p => p < 0)) return true;
  return null;
}