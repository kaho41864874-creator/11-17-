const mazeElement = document.getElementById("maze");
const timerElement = document.getElementById("timer");
const restartButton = document.getElementById("restart-button");
const resultElement = document.getElementById("result");
const resultTitle = document.getElementById("result-title");
const resultRestartButton = document.getElementById("result-restart-button");

const mazeRows = 31;
const mazeColumns = 41;
const startPosition = { row: 1, column: 1 };
const goalPosition = { row: mazeRows - 2, column: mazeColumns - 2 };
const timeLimit = 120;

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
  let seed = 20261118;

  function randomIndex(length) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % length;
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const target = randomIndex(index + 1);
      [items[index], items[target]] = [items[target], items[index]];
    }
  }

  function carve(row, column) {
    maze[row][column] = ".";
    const nextDirections = [...directions];
    shuffle(nextDirections);

    nextDirections.forEach(([rowOffset, columnOffset]) => {
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;

      if (
        nextRow > 0 &&
        nextRow < rows - 1 &&
        nextColumn > 0 &&
        nextColumn < columns - 1 &&
        maze[nextRow][nextColumn] === "#"
      ) {
        maze[row + rowOffset / 2][column + columnOffset / 2] = ".";
        carve(nextRow, nextColumn);
      }
    });
  }

  carve(1, 1);
  maze[startPosition.row][startPosition.column] = "S";
  maze[goalPosition.row][goalPosition.column] = "G";

  return maze.map((row) => row.join(""));
}

let avatarPosition = { ...startPosition };
let remainingTime = timeLimit;
let timerId = null;
let gameFinished = false;

function createMaze() {
  mazeLayout = generateMaze(mazeRows, mazeColumns);
  mazeElement.style.setProperty("--columns", mazeLayout[0].length);
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
  if (gameFinished) {
    return;
  }

  const nextRow = avatarPosition.row + rowOffset;
  const nextColumn = avatarPosition.column + columnOffset;
  const nextCell = getCell(nextRow, nextColumn);

  if (!nextCell || nextCell.classList.contains("wall")) {
    return;
  }

  avatarPosition = { row: nextRow, column: nextColumn };
  renderAvatar();

  if (nextRow === goalPosition.row && nextColumn === goalPosition.column) {
    finishGame(true);
  }
}

function finishGame(isCleared) {
  gameFinished = true;
  window.clearInterval(timerId);
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
  gameFinished = false;
  resultElement.hidden = true;
  timerElement.textContent = remainingTime;
  renderAvatar();
  timerId = window.setInterval(updateTimer, 1000);
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
  moveAvatar(...moves[event.key]);
}

document.addEventListener("keydown", handleKeydown);
restartButton.addEventListener("click", startGame);
resultRestartButton.addEventListener("click", startGame);

createMaze();
startGame();
