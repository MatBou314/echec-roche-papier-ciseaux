import { newBoard, movePiece, isLegal, getCasesCount, play } from "./board.js";
import { randomMove } from "./bot.js"

const piecesName = [null, "rock", "paper", "scissors"];
const colsName = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const piecesImage = ["", "🪨", "📄", "✂️"];
const casesClass ={
  1: "color-case-bleu",
  0: "color-case-vide",
  "-1": "color-case-rouge"
}

export function setUpBoards() {
  const boards = document.querySelectorAll(".board");
  boards.forEach(boardElem => {
      const mode = boardElem.dataset.mode;
      console.log(mode);
      const affBoard = {
          elem: boardElem,
          infoElem: null,
          caseSelect: null,
          mode: mode,
          board: newBoard()
      };
      initBoardElem(affBoard);
      initInfoElem(affBoard);
      if (affBoard.mode === "bvb") {
        setInterval( () => {
          const move = randomMove(affBoard.board);
          play(affBoard.board, move[0], move[1]);
          updateCases(affBoard, move);
          updateInfo(affBoard)
        }, 2000)
      }
})
}

function initInfoElem(affBoard) {
  const infoElem = document.createElement("div");
  infoElem.classList.add("board-info");
  affBoard.elem.parentNode.insertBefore(infoElem, affBoard.elem);
  affBoard.infoElem = infoElem;
  updateInfo(affBoard);
}

function initBoardElem(affBoard) {
  for (let i = 0; i < 81; i++) {
    const caseElem = document.createElement("div");
    caseElem.classList.add("case");
    caseElem.classList.add("color-case-vide");
    caseElem.addEventListener("click", () => {manageClick(affBoard, i)});
    affBoard.elem.appendChild(caseElem);
  }
  updateCases(affBoard, [...Array(81).keys()]);
}

function updateCases(affBoard, casesIdx) {
  const boardElem = affBoard.elem;
  const board = affBoard.board;
  const cases = board.cases;
  const pieces = board.pieces;
  for (const i of casesIdx) { 
    const caseElem = boardElem.children[i];
    caseElem.className = "case";
    if (affBoard.caseSelect === i) {caseElem.classList.add("case-select");}
    else {caseElem.classList.remove("case-select");}
    caseElem.classList.add(casesClass[cases[i]]);
    const piece = pieces[i];
    if (piece > 0) {caseElem.classList.remove("shadow-piece-rouge"); caseElem.classList.add("shadow-piece-bleu");}
    else if (piece < 0) {caseElem.classList.remove("shadow-piece-bleu"); caseElem.classList.add("shadow-piece-rouge");}
    else caseElem.classList.remove("shadow-piece-bleu", "shadow-piece-rouge");
    caseElem.textContent = piecesImage[Math.abs(piece)];
  }
}

function updateInfo(affBoard) {
  const infoElem = affBoard.infoElem;
  const board = affBoard.board;
  if (!infoElem) return;
  const casesCount = getCasesCount(board);
  infoElem.textContent = `${board.turn ? "Blue" : "Red"} to play  ---  Blue Score: ${casesCount[0]}  ---  Red Score: ${casesCount[1]}`;
}

function manageClick(affBoard, caseIdx) {
  const caseSelect = affBoard.caseSelect;
  const board = affBoard.board;
  let casesUpdate = [caseIdx];
  if (caseSelect === null) affBoard.caseSelect = caseIdx;
  else if (caseSelect === caseIdx) affBoard.caseSelect = null;
  else {
    const piece = board.pieces[caseSelect];
    if (piece === 0) {
      casesUpdate.push(caseSelect);
      affBoard.caseSelect = caseIdx;
    } else if (isLegal(board, caseSelect, caseIdx)) {
      casesUpdate.push(caseSelect);
      movePiece(board, piece, caseSelect, caseIdx);
      affBoard.caseSelect = null;
    } else {
      casesUpdate.push(caseSelect);
      affBoard.caseSelect = caseIdx;
    }
  }
  updateInfo(affBoard);
  updateCases(affBoard, casesUpdate);
}