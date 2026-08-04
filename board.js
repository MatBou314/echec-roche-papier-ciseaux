const captures = [null, 3, 1, 2];

const casesDebut = [
  ...Array(27).fill(0),
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  ...Array(27).fill(0)
]

const piecesDebut = [
  ...Array(27).fill(0),
  2, 3, 1, 0, 0, 0, -1, -3, -2,
  3, 1, 2, 0, 0, 0, -2, -1, -3,
  1, 2, 3, 0, 0, 0, -3, -2, -1,
  ...Array(27).fill(0)
]


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
  return casesContour.filter(idx => (idx >= 0 & idx < 81))
}

const casesContour = {};

for (let i = 0; i < 81; i++) {
  casesContour[i] = getCaseContour(i);
}

export function newBoard() {
  return {
    cases: [...casesDebut],
    pieces: [...piecesDebut],
    turn: true,
    game: [],
    legalMoves: []
  }
}

export function movePiece(board, piece, fromIdx, toIdx) {
  board.pieces[fromIdx] = 0;
  board.pieces[toIdx] = piece;
  board.turn = !board.turn;
  if (board.cases[toIdx] === 0) {
    board.cases[toIdx] = (piece > 0) ? 1 : -1;
  }
}

function getMoves(board) {
  const pieces = board.pieces;
  let moves = [];
  for (let caseIdx = 0; caseIdx < 81; caseIdx++) {
    if (pieces[caseIdx] === 0) continue;
    const piece = pieces[caseIdx];
    for (const toIdx of casesContour[caseIdx]) {
      if (canPieceGo(pieces, piece, toIdx)) moves.push([caseIdx, toIdx]);
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