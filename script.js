const mazeElement = document.getElementById("maze");
const timerElement = document.getElementById("timer");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const resultElement = document.getElementById("result");
const resultTitle = document.getElementById("result-title");
const resultRestartButton = document.getElementById("result-restart-button");
const bgmToggleButton = document.getElementById("bgm-toggle-button");
const bgmVolumeInput = document.getElementById("bgm-volume");

const mazeRows = 51;
const mazeColumns = 71;
const startPosition = { row: 1, column: 1 };
const goalPosition = { row: mazeRows - 2, column: mazeColumns - 2 };
const timeLimit = 55;

let mazeLayout = [];

function generateMaze(rows, columns) {
  const maze = Array.from({ length: rows }, () =>
    Array(columns).fill("#"),
  );
  const directions = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];
  let seed = 20261124;

  function randomIndex(length) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % length;
  }

  const frontier = [];

  function addFrontier(row, column) {
    directions.forEach(([rowOffset, columnOffset]) => {
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;

      if (
        nextRow > 0 &&
        nextRow < rows - 1 &&
        nextColumn > 0 &&
        nextColumn < columns - 1 &&
        maze[nextRow][nextColumn] === "#"
      ) {
        frontier.push({
          row: nextRow,
          column: nextColumn,
          previousRow: row,
          previousColumn: column,
        });
      }
    });
  }

  maze[1][1] = ".";
  addFrontier(1, 1);

  while (frontier.length > 0) {
    const [next] = frontier.splice(randomIndex(frontier.length), 1);

    if (maze[next.row][next.column] !== "#") {
      continue;
    }

    maze[(next.row + next.previousRow) / 2][
      (next.column + next.previousColumn) / 2
    ] = ".";
    maze[next.row][next.column] = ".";
    addFrontier(next.row, next.column);
  }

  maze[startPosition.row][startPosition.column] = "S";
  maze[goalPosition.row][goalPosition.column] = "G";

  return maze.map((row) => row.join(""));
}

let avatarPosition = { ...startPosition };
let remainingTime = timeLimit;
let timerId = null;
let gameFinished = false;
let gameStarted = false;
let audioContext = null;
let bgmGain = null;
let bgmTimerId = null;
let bgmStep = 0;
let bgmStopped = false;
const bgmOscillators = new Set();

function enableAudio() {
  if (!window.AudioContext) {
    return;
  }

  audioContext ??= new window.AudioContext();
  bgmGain ??= audioContext.createGain();
  bgmGain.gain.setValueAtTime(
    Number(bgmVolumeInput.value) / 100,
    audioContext.currentTime,
  );
  bgmGain.connect(audioContext.destination);

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

function playBgmNote() {
  if (!audioContext || !bgmGain || bgmStopped) {
    return;
  }

  const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
  const startTime = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(melody[bgmStep % melody.length], startTime);
  noteGain.gain.setValueAtTime(0.001, startTime);
  noteGain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
  noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

  oscillator.connect(noteGain);
  noteGain.connect(bgmGain);
  bgmOscillators.add(oscillator);
  oscillator.onended = () => bgmOscillators.delete(oscillator);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.4);
  bgmStep += 1;
}

function startBgm() {
  enableAudio();
  if (!audioContext || !bgmGain) {
    return;
  }

  window.clearInterval(bgmTimerId);
  bgmStopped = false;
  bgmToggleButton.textContent = "BGMを停止";
  playBgmNote();
  bgmTimerId = window.setInterval(playBgmNote, 400);
}

function stopBgm() {
  window.clearInterval(bgmTimerId);
  bgmStopped = true;

  bgmOscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch {
      // The oscillator may already have ended.
    }
  });
  bgmOscillators.clear();
  bgmToggleButton.textContent = "BGMを再生";
}

function toggleBgm() {
  if (bgmStopped) {
    startBgm();
  } else {
    stopBgm();
  }
}

function playSound(notes) {
  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime;

  notes.forEach(({ frequency, duration, delay = 0, type = "sine" }) => {
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const noteStart = startTime + delay;
    const noteEnd = noteStart + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    volume.gain.setValueAtTime(0.001, noteStart);
    volume.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.001, noteEnd);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  });
}

function createMaze() {
  mazeLayout = generateMaze(mazeRows, mazeColumns);
  mazeElement.style.setProperty("--columns", mazeLayout[0].length);
  mazeElement.style.setProperty("--rows", mazeLayout.length);
  mazeElement.replaceChildren();

  mazeLayout.forEach((row, rowIndex) => {
    [...row].forEach((symbol, columnIndex) => {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (symbol === "#") {
        cell.classList.add("wall");
      } else if (symbol === "S") {
        cell.classList.add("start");
      } else if (symbol === "G") {
        cell.classList.add("goal");
      } else {
        cell.classList.add("path");
      }

      cell.dataset.row = rowIndex;
      cell.dataset.column = columnIndex;
      mazeElement.appendChild(cell);
    });
  });
}

function getCell(row, column) {
  return mazeElement.querySelector(
    `.cell[data-row="${row}"][data-column="${column}"]`,
  );
}

function renderAvatar() {
  mazeElement.querySelectorAll(".avatar").forEach((cell) => {
    cell.classList.remove("avatar");
  });

  getCell(avatarPosition.row, avatarPosition.column)?.classList.add("avatar");
}

function moveAvatar(rowOffset, columnOffset) {
  if (!gameStarted || gameFinished) {
    return;
  }

  const nextRow = avatarPosition.row + rowOffset;
  const nextColumn = avatarPosition.column + columnOffset;
  const nextCell = getCell(nextRow, nextColumn);

  if (!nextCell || nextCell.classList.contains("wall")) {
    playSound([{ frequency: 150, duration: 0.12, type: "triangle" }]);
    return;
  }

  avatarPosition = { row: nextRow, column: nextColumn };
  renderAvatar();

  if (nextRow === goalPosition.row && nextColumn === goalPosition.column) {
    finishGame(true);
  } else {
    playSound([{ frequency: 440, duration: 0.07, type: "triangle" }]);
  }
}

function finishGame(isCleared) {
  gameFinished = true;
  window.clearInterval(timerId);
  playSound(
    isCleared
      ? [
          { frequency: 523, duration: 0.16 },
          { frequency: 659, duration: 0.16, delay: 0.14 },
          { frequency: 784, duration: 0.3, delay: 0.28 },
        ]
      : [
          { frequency: 330, duration: 0.2 },
          { frequency: 247, duration: 0.2, delay: 0.18 },
          { frequency: 165, duration: 0.35, delay: 0.36 },
        ],
  );
  resultTitle.textContent = isCleared ? "クリア！" : "タイムアップ";
  resultElement.hidden = false;
  resultRestartButton.focus();
}

function updateTimer() {
  remainingTime -= 1;
  timerElement.textContent = remainingTime;

  if (remainingTime <= 0) {
    finishGame(false);
  }
}

function startGame() {
  window.clearInterval(timerId);
  avatarPosition = { ...startPosition };
  remainingTime = timeLimit;
  gameStarted = true;
  gameFinished = false;
  resultElement.hidden = true;
  timerElement.textContent = remainingTime;
  renderAvatar();
  timerId = window.setInterval(updateTimer, 1000);
  if (!bgmStopped) {
    startBgm();
  }
}

function handleKeydown(event) {
  const moves = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };

  if (!moves[event.key]) {
    return;
  }

  event.preventDefault();
  if (!gameFinished) {
    enableAudio();
  }
  moveAvatar(...moves[event.key]);
}

document.addEventListener("keydown", handleKeydown);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
resultRestartButton.addEventListener("click", startGame);
bgmToggleButton.addEventListener("click", toggleBgm);
bgmVolumeInput.addEventListener("input", () => {
  if (audioContext && bgmGain) {
    bgmGain.gain.setTargetAtTime(
      Number(bgmVolumeInput.value) / 100,
      audioContext.currentTime,
      0.02,
    );
  }
});

createMaze();
renderAvatar();
