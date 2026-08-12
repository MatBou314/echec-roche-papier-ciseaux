import {} from "./board.js"
import { setUpBoard, changePanel, mainAffBoard } from "./boardGestion.js";

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
    mainAffBoard.playerBlue = "human";
    mainAffBoard.playerRed = "human";
  } else
  if (mode === "jvb") {
    mainAffBoard.playerBlue = "human";
    mainAffBoard.playerRed = mainAffBoard.bot1.id;
  } else 
  if (mode === "bvb") {
    mainAffBoard.playerBlue = mainAffBoard.bot1.id;
    mainAffBoard.playerRed = mainAffBoard.bot2.id;
  }
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

