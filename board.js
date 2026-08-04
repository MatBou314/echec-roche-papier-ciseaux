const boards = document.querySelectorAll(".board");

const piecesName = [null, "rock", "paper", "scissors"];
const colsName = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const piecesImage = ["", "🪨", "📄", "✂️"];
const casesClass ={
  1: "color-case-bleu",
  0: "color-case-vide",
  "-1": "color-case-rouge"
}

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

console.log(casesDebut);

boards.forEach(boardElem => {
    const board = {
        elem: boardElem,
        cases: [...casesDebut],
        pieces: [...piecesDebut],
        caseSelect: null,
        turn: true
    };
    initBoard(board);
})

function getCaseName(idx) {
  return colsName[Math.floor(idx / 9)] + (idx % 9 + 1);
}

function initBoard(boardObj) {
  for (let i = 0; i < 81; i++) {
    const caseElem = document.createElement("div");
    caseElem.classList.add("case");
    caseElem.classList.add("color-case-vide");
    caseElem.addEventListener("click", () => {manageClick(boardObj, i)});
    boardObj.elem.appendChild(caseElem);
  }
  updateCases(boardObj, [...Array(81).keys()]);
}

function updateCases(boardObj, casesIdx) {
  const boardElem = boardObj.elem;
  const cases = boardObj.cases;
  const pieces = boardObj.pieces;
  for (const i of casesIdx) {
    const caseElem = boardElem.children[i];
    if (boardObj.caseSelect === i) {caseElem.classList.add("case-select");}
    else {caseElem.classList.remove("case-select");}
    caseElem.classList.remove("color-case-bleu");
    caseElem.classList.remove("color-case-rouge");
    caseElem.classList.remove("color-case-vide");
    caseElem.classList.add(casesClass[cases[i]]);
    const piece = pieces[i];
    if (piece > 0) {caseElem.classList.remove("shadow-piece-rouge"); caseElem.classList.add("shadow-piece-bleu");}
    else if (piece < 0) {caseElem.classList.remove("shadow-piece-bleu"); caseElem.classList.add("shadow-piece-rouge");}
    else caseElem.classList.remove("shadow-piece-bleu", "shadow-piece-rouge");
    caseElem.textContent = piecesImage[Math.abs(piece)];
  }
}

function manageClick(boardObj, caseIdx) {
  const caseSelect = boardObj.caseSelect;
  let casesUpdate = [caseIdx];
  if (caseSelect === null) boardObj.caseSelect = caseIdx;
  else if (caseSelect === caseIdx) boardObj.caseSelect = null;
  else {
    const piece = boardObj.pieces[caseSelect];
    if (piece === 0) {
      casesUpdate.push(caseSelect);
      boardObj.caseSelect = caseIdx;
    } else if ((piece > 0) === boardObj.turn & casesContour[caseSelect].includes(caseIdx) & canPieceGo(boardObj.pieces, piece, caseIdx)) {
      casesUpdate.push(caseSelect);
      movePiece(boardObj, piece, caseSelect, caseIdx);
    } else {
      casesUpdate.push(caseSelect);
      boardObj.caseSelect = caseIdx;
    }
  }
  updateCases(boardObj, casesUpdate);
}

function movePiece(boardObj, piece, fromIdx, toIdx) {
  boardObj.pieces[fromIdx] = 0;
  boardObj.pieces[toIdx] = piece;
  boardObj.caseSelect = null;
  boardObj.turn = !boardObj.turn;
  if (boardObj.cases[toIdx] === 0) {
    boardObj.cases[toIdx] = (piece > 0) ? 1 : -1;
  }
}

function getMoves(boardObj) {
  const pieces = boardObj.pieces;
  let moves = [];
  for (let caseIdx = 0; caseIdx < 81; caseIdx++) {
    if (pieces[caseIdx] === 0) continue;
    const piece = pieces[caseIdx];
    for (const toIdx of casesContour[caseIdx]) {
      if (canPieceGo(pieces, piece, toIdx)) moves.push([caseIdx, toIdx]);
    }
  }
}

function canPieceGo(pieces, piece, toIdx) {
  const toPiece = pieces[toIdx];
  if (toPiece === 0) return true;
  if ((toPiece * piece < 0) & (captures[Math.abs(piece)] === Math.abs(toPiece))) return true; 
  return false;
}