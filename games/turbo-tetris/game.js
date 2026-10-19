import { loadCss } from "../shared.js";

const CELL = 22;
const GAP = 2;
const STEP = CELL + GAP;
const BOARD_COLUMNS = 10;
const BOARD_ROWS = 20;
const BOARD_PIXELS_WIDE = BOARD_COLUMNS * CELL + (BOARD_COLUMNS - 1) * GAP;
const BOARD_PIXELS_TALL = BOARD_ROWS * CELL + (BOARD_ROWS - 1) * GAP;
const BOARD_X = (280 - BOARD_PIXELS_WIDE) / 2;
const BOARD_Y = 46;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 550;
const FALL_INTERVAL = 850;
const MIN_FALL_INTERVAL = 100;
const SHAPES = [
  { name: "I", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: "O", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "T", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "S", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: "Z", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { name: "J", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "L", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
];

function shuffledShapes() {
  const bag = [...SHAPES];
  for (let index = bag.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  return bag;
}

function cellKey(column, row) {
  return `${column},${row}`;
}

function rotateCells(cells) {
  const height = Math.max(...cells.map(([, y]) => y)) + 1;
  return cells.map(([x, y]) => [height - 1 - y, x]);
}

function shapeWidth(cells) {
  return Math.max(...cells.map(([x]) => x)) + 1;
}

function shapeHeight(cells) {
  return Math.max(...cells.map(([, y]) => y)) + 1;
}

function emptyRow() {
  return Array(BOARD_COLUMNS).fill(null);
}

export async function mount(container) {
  await loadCss(new URL("./game.css", import.meta.url));

  const root = document.createElement("div");
  root.className = "tt";
  root.innerHTML = `
    <div class="tt-layout">
      <div class="tt-play-area">
        <canvas class="tt-board" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"
          role="img" tabindex="0" aria-label="Turbo Tetris playfield"></canvas>
      </div>
      <aside class="tt-next" aria-label="Game information">
        <h4>Next</h4>
        <div class="tt-preview" data-preview aria-hidden="true"></div>
        <p data-next-name></p>
        <dl class="tt-stats">
          <div><dt>Score</dt><dd data-score>0</dd></div>
          <div><dt>Lines</dt><dd data-lines>0</dd></div>
          <div><dt>Level</dt><dd data-level>1</dd></div>
        </dl>
      </aside>
    </div>
    <div class="tt-controls" aria-label="Game controls">
      <p class="tt-status" data-status role="status" aria-live="polite"></p>
      <button class="button" type="button" data-left aria-label="Move left">←</button>
      <button class="button" type="button" data-rotate aria-label="Rotate clockwise">↑</button>
      <button class="button" type="button" data-right aria-label="Move right">→</button>
      <button class="button" type="button" data-down aria-label="Soft drop">↓</button>
      <button class="button" type="button" data-drop>Hard drop</button>
      <button class="button tt-new" type="button" data-new>New game</button>
    </div>
    <p class="tt-instructions">Use ← and → to move, ↑ to rotate, ↓ to soft drop, or Space to hard drop. Rows inside the box clear at 10 blocks; rows below it span the full screen.</p>`;
  container.append(root);

  const board = root.querySelector(".tt-board");
  const context = board.getContext("2d");
  if (!context) throw new Error("Turbo Tetris could not create a drawing context");

  const status = root.querySelector("[data-status]");
  const preview = root.querySelector("[data-preview]");
  const nextName = root.querySelector("[data-next-name]");
  const scoreOutput = root.querySelector("[data-score]");
  const linesOutput = root.querySelector("[data-lines]");
  const levelOutput = root.querySelector("[data-level]");
  const moveButtons = [
    root.querySelector("[data-left]"),
    root.querySelector("[data-rotate]"),
    root.querySelector("[data-right]"),
    root.querySelector("[data-down]"),
    root.querySelector("[data-drop]"),
  ];

  const overlay = document.createElement("canvas");
  overlay.className = "tt-fall-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.append(overlay);
  const overlayContext = overlay.getContext("2d");
  if (!overlayContext) throw new Error("Turbo Tetris could not create its page overlay");

  let grid = [];
  let outsideCells = new Map();
  let bag = [];
  let piece = null;
  let next = null;
  let pieceColumn = 0;
  let pieceRow = 0;
  let boardLeft = 0;
  let pageTop = 0;
  let scale = 1;
  let timer = null;
  let gameOver = false;
  let score = 0;
  let lines = 0;
  let level = 1;

  function takeShape() {
    if (bag.length === 0) bag = shuffledShapes();
    const shape = bag.pop();
    return { ...shape, cells: shape.cells.map(([x, y]) => [x, y]) };
  }

  function pageRows() {
    const pageHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
    const lastRow = Math.floor(
      (pageHeight - pageTop - CELL * scale) / (STEP * scale),
    );
    return Math.max(BOARD_ROWS, lastRow + 1);
  }

  function outsideColumnBounds() {
    const originX = boardLeft + BOARD_X * scale - window.scrollX;
    const step = STEP * scale;
    const cell = CELL * scale;
    return {
      min: Math.ceil(-originX / step),
      max: Math.floor((window.innerWidth - cell - originX) / step),
    };
  }

  function measureBoard() {
    const rect = board.getBoundingClientRect();
    scale = rect.width / CANVAS_WIDTH;
    boardLeft = rect.left + window.scrollX;
    pageTop = rect.top + window.scrollY + BOARD_Y * scale;
  }

  function fitGridToPage() {
    const rows = pageRows();
    for (const key of outsideCells.keys()) {
      const [, row] = key.split(",").map(Number);
      if (row >= rows) outsideCells.delete(key);
    }
    if (piece && pieceRow + shapeHeight(piece.cells) > rows) {
      pieceRow = Math.max(0, rows - shapeHeight(piece.cells));
    }
  }

  function accentColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2f6fed";
  }

  function drawBlock(target, x, y, size, color) {
    target.fillStyle = color;
    target.beginPath();
    target.roundRect(x, y, size, size, Math.max(2, 7 * scale));
    target.fill();
    target.strokeStyle = "rgb(255 255 255 / 55%)";
    target.lineWidth = Math.max(1, 2 * scale);
    target.stroke();
  }

  function drawBoard() {
    const style = getComputedStyle(document.documentElement);
    const surface = style.getPropertyValue("--surface").trim() || "#fff";
    const line = style.getPropertyValue("--line").trim() || "#d5dde5";
    const bg = style.getPropertyValue("--bg").trim() || "#f2f5f8";
    const accent = accentColor();

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = surface;
    context.strokeStyle = line;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(
      BOARD_X - 7,
      BOARD_Y - 7,
      BOARD_PIXELS_WIDE + 14,
      BOARD_PIXELS_TALL + 14,
      12,
    );
    context.fill();
    context.stroke();

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let column = 0; column < BOARD_COLUMNS; column++) {
        const x = BOARD_X + column * STEP;
        const y = BOARD_Y + row * STEP;
        drawBlock(context, x, y, CELL, grid[row]?.[column] ? accent : bg);
      }
    }
  }

  function drawNext() {
    const cells = new Set(next.cells.map(([x, y]) => `${x},${y}`));
    preview.replaceChildren();
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = document.createElement("span");
        if (cells.has(`${x},${y}`)) cell.className = "is-filled";
        preview.append(cell);
      }
    }
    nextName.textContent = `${next.name} tetromino`;
  }

  function drawOverlayBlock(column, row, color) {
    const cell = CELL * scale;
    const step = STEP * scale;
    const x = boardLeft + (BOARD_X + column * STEP) * scale - window.scrollX;
    const y = pageTop + row * step - window.scrollY;
    drawBlock(overlayContext, x, y, cell, color);
  }

  function drawPieces() {
    const ratio = window.devicePixelRatio || 1;
    overlayContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    overlayContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const accent = accentColor();

    for (const key of outsideCells.keys()) {
      const [column, row] = key.split(",").map(Number);
      drawOverlayBlock(column, row, accent);
    }

    if (piece && !gameOver) {
      for (const [column, row] of piece.cells) {
        drawOverlayBlock(pieceColumn + column, pieceRow + row, accent);
      }
    }

    board.setAttribute(
      "aria-label",
      `Turbo Tetris playfield. Score ${score}, ${lines} lines, level ${level}. ${
        gameOver
          ? "Game over."
          : piece
            ? `${piece.name} tetromino at column ${pieceColumn + 1}, page row ${pieceRow + 1}.`
            : "Ready."
      }`,
    );
  }

  function draw() {
    drawBoard();
    drawPieces();
    scoreOutput.textContent = score.toLocaleString();
    linesOutput.textContent = lines.toString();
    levelOutput.textContent = level.toString();
  }

  function collides(cells, column, row) {
    return cells.some(([x, y]) => {
      const targetColumn = column + x;
      const targetRow = row + y;
      if (targetRow < 0 || targetRow >= pageRows()) return true;
      if (targetRow < BOARD_ROWS) {
        return (
          targetColumn < 0 ||
          targetColumn >= BOARD_COLUMNS ||
          grid[targetRow][targetColumn] !== null
        );
      }
      const { min, max } = outsideColumnBounds();
      return (
        targetColumn < min ||
        targetColumn > max ||
        outsideCells.has(cellKey(targetColumn, targetRow))
      );
    });
  }

  function setGameOver() {
    gameOver = true;
    piece = null;
    clearInterval(timer);
    timer = null;
    moveButtons.forEach((button) => (button.disabled = true));
    status.textContent = `Game over. Final score: ${score.toLocaleString()}.`;
    draw();
  }

  function spawnPiece() {
    piece = next;
    next = takeShape();
    pieceColumn = Math.floor((BOARD_COLUMNS - shapeWidth(piece.cells)) / 2);
    pieceRow = 0;
    drawNext();

    if (collides(piece.cells, pieceColumn, pieceRow)) {
      setGameOver();
      return false;
    }
    return true;
  }

  function updateSpeed() {
    clearInterval(timer);
    if (!gameOver) {
      const interval = Math.max(
        MIN_FALL_INTERVAL,
        FALL_INTERVAL * 0.85 ** (level - 1),
      );
      timer = setInterval(tick, interval);
    }
  }

  function clearCompletedRows() {
    const clearedInsideRows = [];
    grid.forEach((row, index) => {
      if (row.every((cell) => cell !== null)) clearedInsideRows.push(index);
    });
    const { min, max } = outsideColumnBounds();
    const outsideRows = new Set(
      [...outsideCells.keys()].map((key) => Number(key.slice(key.indexOf(",") + 1))),
    );
    const clearedOutsideRows = [...outsideRows].filter((row) => {
      if (row < BOARD_ROWS || row >= pageRows()) return false;
      for (let column = min; column <= max; column++) {
        if (!outsideCells.has(cellKey(column, row))) return false;
      }
      return true;
    });
    const cleared = clearedInsideRows.length + clearedOutsideRows.length;
    if (cleared === 0) return;

    const clearedOutsideSet = new Set(clearedOutsideRows);
    const shiftedOutsideCells = new Map();
    for (const [key, color] of outsideCells) {
      const [column, row] = key.split(",").map(Number);
      if (clearedOutsideSet.has(row)) continue;
      const shiftedRow =
        row + clearedOutsideRows.filter((clearedRow) => clearedRow > row).length;
      shiftedOutsideCells.set(cellKey(column, shiftedRow), color);
    }
    outsideCells = shiftedOutsideCells;

    const remainingInside = grid.filter((_, row) => !clearedInsideRows.includes(row));
    while (remainingInside.length < BOARD_ROWS) {
      remainingInside.unshift(emptyRow());
    }
    grid = remainingInside;
    lines += cleared;
    score += ([0, 100, 300, 500, 800][cleared] || cleared * 200) * level;
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      status.textContent = `Level ${level}!`;
      updateSpeed();
    }
  }

  function lockPiece() {
    for (const [x, y] of piece.cells) {
      const row = pieceRow + y;
      const column = pieceColumn + x;
      if (row < 0) {
        setGameOver();
        return;
      }
      if (row >= BOARD_ROWS) {
        outsideCells.set(cellKey(column, row), piece.name);
      } else {
        grid[row][column] = piece.name;
      }
    }

    clearCompletedRows();
    draw();
    if (!spawnPiece()) return;
    draw();
  }

  function tick() {
    if (!piece || gameOver) return;
    if (!collides(piece.cells, pieceColumn, pieceRow + 1)) {
      pieceRow++;
      drawPieces();
    } else {
      lockPiece();
    }
  }

  function move(amount) {
    if (!piece || gameOver) return;
    const column = pieceColumn + amount;
    if (!collides(piece.cells, column, pieceRow)) {
      pieceColumn = column;
      drawPieces();
    }
  }

  function rotate() {
    if (!piece || gameOver || piece.name === "O") return;
    const rotated = rotateCells(piece.cells);
    for (const [columnKick, rowKick] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
    ]) {
      const column = pieceColumn + columnKick;
      const row = pieceRow + rowKick;
      if (!collides(rotated, column, row)) {
        piece.cells = rotated;
        pieceColumn = column;
        pieceRow = row;
        drawPieces();
        return;
      }
    }
  }

  function softDrop() {
    if (!piece || gameOver) return;
    if (collides(piece.cells, pieceColumn, pieceRow + 1)) {
      lockPiece();
      return;
    }
    pieceRow++;
    score++;
    draw();
  }

  function hardDrop() {
    if (!piece || gameOver) return;
    let distance = 0;
    while (!collides(piece.cells, pieceColumn, pieceRow + 1)) {
      pieceRow++;
      distance++;
    }
    score += distance * 2;
    lockPiece();
  }

  function startGame() {
    clearInterval(timer);
    measureBoard();
    grid = Array.from(
      { length: BOARD_ROWS },
      emptyRow,
    );
    outsideCells = new Map();
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    moveButtons.forEach((button) => (button.disabled = false));
    status.textContent = "";
    next = takeShape();
    spawnPiece();
    draw();
    updateSpeed();
  }

  function resizeOverlay() {
    const ratio = window.devicePixelRatio || 1;
    overlay.width = Math.round(window.innerWidth * ratio);
    overlay.height = Math.round(window.innerHeight * ratio);
    overlay.style.width = `${window.innerWidth}px`;
    overlay.style.height = `${window.innerHeight}px`;
    measureBoard();
    fitGridToPage();
    draw();
  }

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("input, textarea, select, [contenteditable]")
    ) return;
    if (event.key === "ArrowLeft") move(-1);
    else if (event.key === "ArrowRight") move(1);
    else if (event.key === "ArrowUp") rotate();
    else if (event.key === "ArrowDown") softDrop();
    else if (event.key === " " && !(target instanceof HTMLButtonElement)) hardDrop();
    else return;
    event.preventDefault();
  };

  root.querySelector("[data-left]").addEventListener("click", () => move(-1));
  root.querySelector("[data-rotate]").addEventListener("click", rotate);
  root.querySelector("[data-right]").addEventListener("click", () => move(1));
  root.querySelector("[data-down]").addEventListener("click", softDrop);
  root.querySelector("[data-drop]").addEventListener("click", hardDrop);
  root.querySelector("[data-new]").addEventListener("click", startGame);
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("scroll", drawPieces, { passive: true });
  window.addEventListener("resize", resizeOverlay);

  resizeOverlay();
  startGame();

  return {
    destroy() {
      clearInterval(timer);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", drawPieces);
      window.removeEventListener("resize", resizeOverlay);
      overlay.remove();
      root.remove();
    },
  };
}
