import { newBoard, isLegal, getCasesCount, play, UndoMove, isGameOver, winner } from "./board.js";
import { randomMove, botList } from "./bot.js"

const piecesName = [null, "rock", "paper", "scissors"];
const colsName = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const piecesImage = ["", "🪨", "📄", "✂️"];
const casesClass ={
  1: "color-case-bleu",
  0: "color-case-vide",
  "-1": "color-case-rouge"
}

const PanelStructure = {
  jvj: [createBoardInfo, createNavArrows],
  jvb: [createBoardInfo, createBotPanel, createBotPause, createNavArrows],
  bvb: [createBoardInfo, createBotPanel, createBotPanel, createBotPause, createNavArrows]
}

export const mainAffBoard = newAffBoard();
export let worker = new Worker("worker.js", {type: "module"});
const moveRequests = new Map();

function initWorker() {
  worker = new Worker("worker.js", {type: "module"});
  worker.onmessage = function(event) {
    const {move, requestId, error} = event.data;
    if (!moveRequests.has(requestId)) return;
    const {resolve, reject} = moveRequests.get(requestId);
    if (error) reject(error);
    else {
      moveRequests.delete(requestId);
      resolve(move);
    }
  }
}
initWorker();

export function cancelAllBotRequests() {
  for (const [, { reject }] of moveRequests) {
    reject("Cancelled");
  }
  moveRequests.clear();
  worker.terminate();
  initWorker();
}

function newBot() {
  return {
    id: Object.keys(botList)[0],
    maxTime: 2000,
    maxDepth: 20,
    isControlled: false
  }
}

export function newAffBoard(mode="jvj") {
  return {
          elem: null,
          infoElem: null,
          panelElem: null,
          caseSelect: null,
          mode: mode,
          history: [],
          backMoves: 0,
          bot: {
            true: null,
            false: null
          },
          bot1: newBot(),
          bot2: newBot(),
          botPause: true,
          board: newBoard(),
          isBot() {
            if (this.bot[this.board.turn] === null) return false;
            return true;
          },
          getBot() {
            return this[this.bot[this.board.turn]];
          },
      }
}

export function changePanel(affBoard) {
  const panel = affBoard.panelElem;
  if (panel === null) {console.log("NO panel"); return} 
  panel.innerHTML = "";
  updatePanel(affBoard);
}

export function setUpBoard(affBoard) {
  const elem = document.querySelector(".board");
  affBoard.elem = elem;
  console.log(affBoard.mode);
  initBoardElem(affBoard);
  updatePanel(affBoard);
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") undo(affBoard);
    if (e.key === "ArrowRight") redo(affBoard);
  })
  nextTurn(affBoard);
}

function createBoardInfo(affBoard, mainPanel) {
  const infoElem = document.createElement("div");
  infoElem.classList.add("board-info");
  affBoard.infoElem = infoElem;
  updateInfo(affBoard);
  mainPanel.appendChild(infoElem);
}

function createNavArrows(affBoard, mainPanel) {
  const arrowContainer = document.createElement("div");
  arrowContainer.classList.add("arrow-container");
  const arrowLeft = document.createElement("div");
  const arrowRight = document.createElement("div");
  arrowLeft.classList.add("control-arrow");
  arrowRight.classList.add("control-arrow");
  arrowLeft.textContent = "←";
  arrowRight.textContent = "→";
  arrowLeft.addEventListener("pointerdown", (e) => {e.preventDefault(); undo(affBoard);});
  arrowRight.addEventListener("pointerdown", (e) => {e.preventDefault(); redo(affBoard);});
  arrowContainer.appendChild(arrowLeft);
  arrowContainer.appendChild(arrowRight);
  mainPanel.appendChild(arrowContainer)
}

function createBotPanel(affBoard, mainPanel) {
  const botName = !affBoard.bot1.isControlled ? "bot1" : "bot2"
  const bot = affBoard[botName];
  bot.isControlled = true;
  
  const panel = document.createElement("div");
  panel.classList.add('bot-panel')
  // Bot type 
  panel.appendChild(createText("Bot type:"));
  const select = document.createElement("select");
  panel.appendChild(select);
  for (const bot in botList) {
    const option = document.createElement("option");
    option.textContent = bot;
    option.value = bot;
    select.appendChild(option);
  }
  select.value = bot.id;
  select.addEventListener("change", () => {
    bot.id = select.value;
    cancelAllBotRequests();
    nextTurn(affBoard);
  });
  // max Time
  panel.appendChild(createText("max time:"));
  const maxTime = document.createElement("input");
  maxTime.type = "number";
  maxTime.value = bot.maxTime;
  panel.appendChild(maxTime);
  maxTime.addEventListener("change", () => {
    bot.maxTime = parseInt(maxTime.value);
    cancelAllBotRequests();
    nextTurn(affBoard);
  })
  // color change
  const colorChange = document.createElement("div");
  colorChange.classList.add("color-change");
  if (affBoard.bot.false === botName) {
    colorChange.style.borderColor = "rgb(255, 20, 20)";
  }
  colorChange.textContent = "Change Color ↺";
  colorChange.addEventListener("pointerdown", () => {
    const blueBot = affBoard.bot.true;
    affBoard.bot.true = affBoard.bot.false;
    affBoard.bot.false = blueBot;
    cancelAllBotRequests();
    updatePanel(affBoard);
    nextTurn(affBoard);
  })
  panel.appendChild(colorChange);

  mainPanel.appendChild(panel)
}

function createBotPause(affBoard, mainPanel) {
  const botPause = document.createElement("div");
  botPause.classList.add("bot-pause");
  botPause.textContent = affBoard.botPause ? "▶ Resume Bot" : "⏸ Pause Bot";
  botPause.addEventListener("pointerdown", () => {
    cancelAllBotRequests();
    affBoard.botPause = !affBoard.botPause;
    botPause.textContent = affBoard.botPause ? "▶ Resume Bot" : "⏸ Pause Bot";
    nextTurn(affBoard);
  })
  mainPanel.appendChild(botPause)
}

function updatePanel(affBoard) {
  if (affBoard.panelElem === null) {
    const mainPanel = document.createElement("div");
    mainPanel.classList.add("game-control-menu");
    affBoard.elem.parentNode.appendChild(mainPanel);
    affBoard.panelElem = mainPanel;
  } 
  affBoard.bot1.isControlled = false;
  affBoard.bot2.isControlled = false;
  const mainPanel = affBoard.panelElem;
  mainPanel.innerHTML = "";
  PanelStructure[affBoard.mode].forEach((part) => {
    part(affBoard, mainPanel);
  })
}

function createText(text, size="20px") {
  const textElem = document.createElement("p");
  textElem.style.fontSize = size;
  textElem.textContent = text;
  return textElem;
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
  for (const i of casesIdx.filter(idx => idx !== null)) { 
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
  infoElem.textContent = !isGameOver(affBoard.board) ? `${board.turn ? "Blue" : "Red"} to play\n\n` : `victory for ${winner(affBoard.board) ? "Blue" : "Red"}\n\n`;
  infoElem.textContent += `Squares:\n-Blue: ${casesCount[0]}\n-Red: ${casesCount[1]}`;
}

function manageClick(affBoard, caseIdx) {
  const isBot = affBoard.isBot();
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
    } else if (!isBot && !isGameOver(board) && isLegal(board, caseSelect, caseIdx)) {
      casesUpdate.push(caseSelect);
      playWithHistory(affBoard, caseSelect, caseIdx);
      affBoard.caseSelect = null;
      nextTurn(affBoard);
    } else {
      casesUpdate.push(caseSelect);
      affBoard.caseSelect = caseIdx;
    }
  }
  updateInfo(affBoard);
  updateCases(affBoard, casesUpdate);
}

export function nextTurn(affBoard) {
  if (isGameOver(affBoard.board)) return;
  if (!affBoard.botPause && affBoard.isBot()) {
    playBotMove(affBoard)
  }
}

async function playBotMove(affBoard) {
  try {
    const move = await getBotMove(affBoard);
    playWithHistory(affBoard, move[0], move[1]);
    updateCases(affBoard, move);
    updateInfo(affBoard);
    nextTurn(affBoard);
  } catch {
  }
}

export function getBotMove(affBoard) {
  return new Promise((resolve, reject) => {
    const bot = affBoard.getBot();
    const requestId = Date.now();
    moveRequests.set(requestId, {resolve, reject});
    worker.postMessage({
      requestId,
      botId: bot.id,
      board: affBoard.board,
      maxTime: bot.maxTime
    })
  })
}

function playWithHistory(affBoard, from, to) {
  const history = affBoard.history;
  history.splice(history.length-affBoard.backMoves);
  const move = play(affBoard.board, from, to);
  history.push(move);
  affBoard.backMoves = 0;
  if (isGameOver(affBoard.board)) {
    affBoard.botPause = true;
    updatePanel(affBoard);
    updateInfo(affBoard);
  }
}

function undo(affBoard) {
  if (affBoard.backMoves >= affBoard.history.length) return;
  cancelAllBotRequests()
  affBoard.backMoves += 1;
  const history = affBoard.history;
  const move = history[history.length-affBoard.backMoves];
  const caseSelect = affBoard.caseSelect;
  affBoard.caseSelect = null;
  affBoard.botPause = true;
  UndoMove(affBoard.board, move); 
  updateInfo(affBoard);
  updateCases(affBoard, [move.from, move.to, caseSelect]);
  updatePanel(affBoard);
  nextTurn(affBoard);
}

function redo(affBoard) {
  if (affBoard.backMoves <= 0) return;
  cancelAllBotRequests()
  affBoard.botPause = true;
  const history = affBoard.history;
  const move = history[history.length-affBoard.backMoves];
  play(affBoard.board, move.from, move.to);
  affBoard.backMoves -= 1; 
  const caseSelect = affBoard.caseSelect;
  affBoard.caseSelect = null;
  updateInfo(affBoard);
  updateCases(affBoard, [move.from, move.to, caseSelect]);
  updatePanel(affBoard);
  nextTurn(affBoard);
}