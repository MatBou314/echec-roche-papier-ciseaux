import { newBoard, play } from "./board.js"
import { setUpBoard, changePanel, mainAffBoard, nextTurn, cancelAllBotRequests, getBotMove, newAffBoard } from "./boardGestion.js";
import { botList } from "./bot.js";

const modes = {
  jvj: "play in person",
  jvb: "play bot",
  bvb: "bot VS bot"
};

let actualMode = "jvj";

function changeMode(mode) {
  cancelAllBotRequests()
  actualMode = mode;
  mainAffBoard.mode = mode;
  mainAffBoard.botPause = true;

  if (mode === "jvj") {
    mainAffBoard.bot.true = null;
    mainAffBoard.bot.false = null;
  } else
  if (mode === "jvb") {
    mainAffBoard.bot.true = null;
    mainAffBoard.bot.false = "bot1";
  } else 
  if (mode === "bvb") {
    mainAffBoard.bot.true = "bot1";
    mainAffBoard.bot.false = "bot2";
  }
  createMenu()
  changePanel(mainAffBoard);
  nextTurn(mainAffBoard)
}


function createMenu() {
  const menu = document.querySelector("#main-menu")
  menu.innerHTML = "";
  for (const mode in modes) {
    if (mode === actualMode) continue;
    const option = document.createElement("p");
    option.textContent = modes[mode];
    option.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        changeMode(mode)
    })
    menu.appendChild(option)
  }
}

createMenu()
setUpBoard(mainAffBoard, "jvj")

async function testBots() {
  const affBoard = newAffBoard();
  let totTimeMinimax = 0;
  let totTimeIterative = 0;
  const messageSameMove = "The bots gave the same move";
  const messageDiffMoves = "The bots gave different moves";
  affBoard.bot1.id = "minimax";
  affBoard.bot2.id = "iterativeDeepening";

  for (let i = 1; i <= 1000; i++) {
    affBoard.bot.true = "bot1";
    affBoard.bot.false = "bot1"
    const startTime1 = Date.now();
    const moveMinimax = await getBotMove(affBoard);
    const timeMinimax = Date.now() - startTime1;
    totTimeMinimax += timeMinimax;
    
    affBoard.bot.true = "bot2";
    affBoard.bot.false = "bot2"
    const startTime2 = Date.now();
    const moveIterative = await getBotMove(affBoard);
    const timeIterative = Date.now() - startTime2;
    totTimeIterative += timeIterative;

    console.log(`
      Minimax: 
      - time: ${timeMinimax}
      - mean time: ${totTimeMinimax/i}
      Iterative: 
      - time: ${timeIterative}
      - mean time: ${totTimeIterative/i}
      ${(moveIterative[0] === moveMinimax[0] && moveIterative[1] === moveMinimax[1]) ? messageSameMove : messageDiffMoves}
      `)
    play(affBoard.board, moveIterative[0], moveIterative[1]);
  }
}
