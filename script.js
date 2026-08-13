import {} from "./board.js"
import { setUpBoard, changePanel, mainAffBoard, nextTurn } from "./boardGestion.js";

const modes = {
  jvj: "play in person",
  jvb: "play bot",
  bvb: "bot VS bot"
};

let actualMode = "jvj";

function changeMode(mode) {
  actualMode = mode;
  mainAffBoard.mode = mode;
  createMenu()
  changePanel(mainAffBoard, mode);

  if (mode === "jvj") {
    mainAffBoard.isBot.true = false;
    mainAffBoard.isBot.false = false;
  } else
  if (mode === "jvb") {
    mainAffBoard.isBot.true = false;
    mainAffBoard.isBot.false = true;
  } else 
  if (mode === "bvb") {
    mainAffBoard.isBot.true = true;
    mainAffBoard.isBot.false = true;
  }
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

