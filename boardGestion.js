import { newBoard, movePiece, isLegal, getCasesCount, play, UndoMove } from "./board.js";
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
          history: [],
          backMoves: 0,
          board: newBoard()
      };
      initBoardElem(affBoard);
      if (mode) initControlMenuElem(affBoard);
      
      if (affBoard.mode === "bvb") {
        setInterval( () => {
          const move = randomMove(affBoard.board);
          play(affBoard.board, move[0], move[1]);
          updateCases(affBoard, move);
          updateInfo(affBoard)
        }, 1000)
      }
      if (mode) {
        document.addEventListener("keydown", (e) => {
          if (e.key === "ArrowLeft") undo(affBoard);
          if (e.key === "ArrowRight") redo(affBoard);
        })
      }
})
}

function initControlMenuElem(affBoard) {
  const controlMenuElem = document.createElement("div");
  controlMenuElem.classList.add("game-control-menu");
  const infoElem = document.createElement("div");
  infoElem.classList.add("board-info");
  controlMenuElem.appendChild(infoElem);
  affBoard.elem.parentNode.appendChild(controlMenuElem);
  affBoard.infoElem = infoElem;
  updateInfo(affBoard);
  const arrowContainer = document.createElement("div");
  arrowContainer.classList.add("arrow-container");
  const arrowLeft = document.createElement("div");
  const arrowRight = document.createElement("div");
  arrowLeft.classList.add("control-arrow");
  arrowRight.classList.add("control-arrow");
  arrowLeft.textContent = "←";
  arrowRight.textContent = "→";
  arrowLeft.addEventListener("pointerdown", (e) => {e.preventDefault(); undo(affBoard);});
  arrowRight.addEventListener("pointerdown", (e) => {e.preventDefault; redo(affBoard);});
  arrowContainer.appendChild(arrowLeft);
  arrowContainer.appendChild(arrowRight);
  controlMenuElem.appendChild(arrowContainer);
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
    caseElem.addEventListener("pointerdown", () => {manageClick(affBoard, i)});
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
  infoElem.textContent = `${board.turn ? "Blue" : "Red"} to play\n Squares:\n-Blue: ${casesCount[0]}\n-Red: ${casesCount[1]}`;
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
    } else if (affBoard.mode !== "bvb" && isLegal(board, caseSelect, caseIdx)) {
      casesUpdate.push(caseSelect);
      playWithHistory(affBoard, caseSelect, caseIdx);
      affBoard.caseSelect = null;
    } else {
      casesUpdate.push(caseSelect);
      affBoard.caseSelect = caseIdx;
    }
  }
  updateInfo(affBoard);
  updateCases(affBoard, casesUpdate);
}

function playWithHistory(affBoard, from, to) {
  const history = affBoard.history;
  history.splice(history.length-affBoard.backMoves);
  const move = play(affBoard.board, from, to);
  history.push(move);
  affBoard.backMoves = 0;
}

function undo(affBoard) {
  if (affBoard.backMoves >= affBoard.history.length) return;
  affBoard.backMoves += 1;
  const history = affBoard.history;
  const move = history[history.length-affBoard.backMoves];
  UndoMove(affBoard.board, move); 
  updateInfo(affBoard);
  updateCases(affBoard, [move.from, move.to]);
}

function redo(affBoard) {
  if (affBoard.backMoves <= 0) return;
  const history = affBoard.history;
  const move = history[history.length-affBoard.backMoves];
  play(affBoard.board, move.from, move.to);
  affBoard.backMoves -= 1; 
  updateInfo(affBoard);
  updateCases(affBoard, [move.from, move.to]);
}