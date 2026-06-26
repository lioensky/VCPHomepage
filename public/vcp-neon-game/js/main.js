import { AudioSystem } from "./audio.js";
import { Game, UI } from "./game.js";

const canvas = document.querySelector("#game-canvas");
const audio = new AudioSystem();
const ui = new UI();
const game = new Game(canvas, ui, audio);

ui.onChoose = (choice) => game.chooseUpgrade(choice);

document.querySelector("#start-button").addEventListener("click", () => {
  game.start();
});

document.querySelector("#restart-button").addEventListener("click", () => {
  game.start();
});

document.querySelector("#sound-button").addEventListener("click", (event) => {
  const enabled = audio.toggleAll();
  event.currentTarget.textContent = enabled ? "声音 ON" : "声音 OFF";
  game.say(enabled ? "Nova: 8bit 声卡上线，开始电子蹦迪。" : "Nova: 静音模式。现在只剩你和弹幕的沉默。");
});

game.draw();