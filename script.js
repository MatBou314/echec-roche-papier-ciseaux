import {} from "./board.js"
import { setUpBoard, changePanel, mainAffBoard, nextTurn, cancelAllBotRequests } from "./boardGestion.js";

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

