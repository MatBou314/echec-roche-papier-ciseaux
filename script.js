const boards = document.querySelectorAll(".board");

const piecesName = [null, "rock", "paper", "scissors"];
const colsName = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

const casesDebut = [
  ...Array(27).fill(0),
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  1, 1, 1, 0, 0, 0, -1, -1, -1,
  ...Array(27).fill(0)
]

const piecesDebut = [
  ...Array(27).fill(0),
  1, 2, 3, 0, 0, 0, -3, -2, -1,
  3, 1, 2, 1, -1, 0, -2, -1, -3,
  2, 3, 1, 0, 0, 0, -1, -2, -3,
  ...Array(27).fill(0)
]

console.log(casesDebut);

// on fait un objet pour chaque board, on a l'élement du board, les cases (-1, 0 ou 1), et les pièces (0, 1, 2, 3, -1, -2 ou -3)
boards.forEach(boardElem => {
    const board = {
        elem: boardElem,
        cases: [...casesDebut],
        pieces: [...piecesDebut]
    };
    initBoard(board);
})

function getCaseName(idx) {
  return colsName[Math.floor(idx / 9)] + (idx % 9);
}

function initBoard(boardObj) {
  for (let i = 0; i < 81; i++) {
    const caseElem = document.createElement("div");
    caseElem.classList.add("case");
    caseElem.classList.add("color-case-vide")
    boardObj.elem.appendChild(caseElem);
  }
  updateBoard(boardObj);
}

function updateBoard(boardObj) {
  const boardElem = boardObj.elem;
  const cases = boardObj.cases;
  const pieces = boardObj.pieces;
  for (let i = 0; i < 81; i++) {
    const caseElem = boardElem.children[i];
    switch (cases[i]) {
      case 0:
        caseElem.classList.remove("color-case-bleu");
        caseElem.classList.remove("color-case-rouge");
        caseElem.classList.add("color-case-vide");
        break;
      case 1:
        caseElem.classList.remove("color-case-vide");
        caseElem.classList.remove("color-case-rouge");
        caseElem.classList.add("color-case-bleu");
        break;
      case -1:
        caseElem.classList.remove("color-case-vide");
        caseElem.classList.remove("color-case-bleu");
        caseElem.classList.add("color-case-rouge");
        break;
    }
    const piece = pieces[i];
    if (piece > 0) {caseElem.classList.remove("shadow-piece-rouge"); caseElem.classList.add("shadow-piece-bleu");}
    else if (piece < 0) {caseElem.classList.remove("shadow-piece-bleu"); caseElem.classList.add("shadow-piece-rouge");}
    else {caseElem.classList.remove("shadow-piece-bleu"); caseElem.classList.remove("shadow-piece-rouge");}
    switch (piece) {
      case 0:
        caseElem.textContent = "";
        break;
      case 1:
        caseElem.textContent = "🪨";
        break;
      case 2:
        caseElem.textContent = "📄";
        break;
      case 3:
        caseElem.textContent = "✂️";
        break;
      case -1:
        caseElem.textContent = "🪨";
        break;
      case -2:
        caseElem.textContent = "📄";
        break;
      case -3:
        caseElem.textContent = "✂️";
        break;
    }
  }
}

