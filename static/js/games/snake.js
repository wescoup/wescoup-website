/*
  Tony's Snake Game
  - Refactor: moved all JS out of the HTML into this file.
  - Fix: game speed is now time-based (ms per move) instead of frame-count based.
        This prevents phones with higher refresh rates from running faster.
  - Add: 5 levels (single-page) + simple lobby with locked levels (session-only).
  - Keep: low-tech controls (Left/Right turn buttons + keyboard).

  Mobile control rules (2026-01):
  - Running: Left/Right turn.
  - Paused: Left/Right (and ArrowLeft/ArrowRight) unpause only (no turn on that input).
  - Death: Left/Right disabled briefly, then either Left/Right restarts current level.
  - Level cleared: Left/Right disabled briefly, then either Left/Right advances to next level (if any).
*/

(function () {
  'use strict';

  // Bump this for each deploy. It makes cache issues obvious.
  const SNAKE_BUILD = '2026-01-05b';
  console.log(`[Tony's Snake Game] build ${SNAKE_BUILD}`);

  // --- DOM
  const uiScore = document.getElementById('uiScore');
  const uiLevel = document.getElementById('uiLevel');
  const uiBanner = document.getElementById('uiBanner');
  const lobby = document.getElementById('lobby');
  const gameArea = document.getElementById('gameArea');
  const levelSelect = document.getElementById('levelSelect');
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnPause = document.getElementById('btnPause');
  const btnQuit = document.getElementById('btnQuit');

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Toggle a body class so CSS can optimize the mobile (landscape) play layout.
  function setPlayingMode(isPlaying) {
    document.body.classList.toggle('snake-playing', !!isPlaying);
  }

  // --- Game constants
  const GRID = 16;
  const COLS = Math.floor(canvas.width / GRID);  // 800/16 = 50
  const ROWS = Math.floor(canvas.height / GRID); // 400/16 = 25

  // --- Levels (loaded from /levels/levelN.json on demand)
  const LEVEL_COUNT = 5;
  const LEVEL_CACHE = new Map(); // levelNum -> normalized config

  // Fallback so the game is still playable if a level JSON is missing.
  const DEFAULT_LEVEL_FALLBACK = {
    id: 1,
    moveMs: 110,
    targetScore: 8,
    spawn: { x: 10, y: 12 },
    direction: 'right',
    randomBadApples: { enabled: false, maxCount: 0 },
    fixedObstacles: [], // array of {x,y} grid coords
  };

  function expandObstacleSegments(obstacles) {
    const cells = [];
    if (!Array.isArray(obstacles)) return cells;

    for (const o of obstacles) {
      if (!o || o.type !== 'segment') continue;
      const ori = o.orientation;
      const start = o.start || {};
      const length = Number(o.length) || 0;

      if (!start || typeof start.x !== 'number' || typeof start.y !== 'number') continue;
      if (length <= 0) continue;

      for (let i = 0; i < length; i++) {
        if (ori === 'horizontal') cells.push({ x: start.x + i, y: start.y });
        else cells.push({ x: start.x, y: start.y + i }); // default vertical
      }
    }
    return cells;
  }

  // Support obstacles defined as explicit grid points:
  //  - { type: 'points', points: [{x,y}, ...] }
  //  - or a bare point object {x,y} (treated as a single obstacle cell)
  function expandObstaclePoints(obstacles) {
    const cells = [];
    if (!Array.isArray(obstacles)) return cells;

    for (const o of obstacles) {
      if (!o) continue;

      // Explicit points list
      if (o.type === 'points' && Array.isArray(o.points)) {
        for (const p of o.points) {
          if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
          cells.push({ x: p.x, y: p.y });
        }
        continue;
      }

      // Implicit single point (no type)
      if (typeof o.x === 'number' && typeof o.y === 'number' && !o.type) {
        cells.push({ x: o.x, y: o.y });
      }
    }

    return cells;
  }


  function normalizeLevelJson(levelNum, data) {
    const lvl = Number(data && data.level) || levelNum;

    const spawn = (data && data.snake && data.snake.spawn) || DEFAULT_LEVEL_FALLBACK.spawn;
    const direction = (data && data.snake && data.snake.direction) || DEFAULT_LEVEL_FALLBACK.direction;
    const moveMs = Number(data && data.snake && data.snake.speedMs) || DEFAULT_LEVEL_FALLBACK.moveMs;

    const targetScore = Number(data && data.winCondition && data.winCondition.targetScore) || DEFAULT_LEVEL_FALLBACK.targetScore;

    const randomBad = (data && data.randomBadApples) || {};
    const enabled = !!randomBad.enabled;
    const maxCount = Math.max(0, Number(randomBad.maxCount) || 0);

    const fixedCellsRaw = [
      ...expandObstacleSegments(data && data.obstacles),
      ...expandObstaclePoints(data && data.obstacles),
    ];

    // De-dupe in case a level mixes formats or repeats points.
    const seen = new Set();
    const fixedCells = [];
    for (const c of fixedCellsRaw) {
      const k = `${c.x},${c.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      fixedCells.push(c);
    }
    const fixedObstacles = fixedCells.map((c) => ({ x: c.x, y: c.y }));

    return {
      id: lvl,
      moveMs,
      targetScore,
      spawn: { x: Number(spawn.x) || DEFAULT_LEVEL_FALLBACK.spawn.x, y: Number(spawn.y) || DEFAULT_LEVEL_FALLBACK.spawn.y },
      direction,
      randomBadApples: { enabled, maxCount },
      fixedObstacles,
    };
  }

  async function loadLevelConfig(levelNum) {
    if (LEVEL_CACHE.has(levelNum)) return LEVEL_CACHE.get(levelNum);

    const url = `/static/js/games/levels/level${levelNum}.json?b=${encodeURIComponent(SNAKE_BUILD)}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cfg = normalizeLevelJson(levelNum, data);
      LEVEL_CACHE.set(levelNum, cfg);
      return cfg;
    } catch (err) {
      console.warn(`[Snake] Failed to load ${url}. Using fallback.`, err);
      const cfg = { ...DEFAULT_LEVEL_FALLBACK, id: levelNum };
      LEVEL_CACHE.set(levelNum, cfg);
      return cfg;
    }
  }


  // --- Session-only progress
  let highestUnlockedLevel = 1;

  // --- Game loop timing
  let rafId = null;
  let lastTime = 0;
  let accumulator = 0;

  // --- Game state
  let running = false;
  let paused = false;
  let gameOver = false;
  let level = 1;
  let score = 0;

  // Post-stop action state (death / level-clear)
  // mode: 'none' | 'death' | 'clear'
  let postStopMode = 'none';
  let postStopUnlockAt = 0;     // ms timestamp (Date.now)
  let postStopNextLevel = null; // for 'clear'

  const DEATH_LOCK_MS = 8000;  // 10–15 seconds requested; set to 12s
  const CLEAR_LOCK_MS = 2000;   // prevent accidental next-level start

  // Snake direction is always one of: left/right/up/down.
  // Start moving to the right.
  const snake = {
    x: 10 * GRID,
    y: 10 * GRID,
    dx: GRID,
    dy: 0,
    cells: [],
    maxCells: 4,
  };

  const apple = { x: 20 * GRID, y: 10 * GRID };
  const obstacles = []; // each {x, y} in *pixels*
  let randomBadCount = 0; // number of random bad apples currently placed

  // --- Helpers
  function banner(msg) {
    uiBanner.textContent = msg || '';
  }

  function setScore(n) {
    score = n;
    uiScore.textContent = String(score);
  }

  function setLevel(n) {
    level = n;
    uiLevel.textContent = String(level);
  }

  function nowMs() {
    return Date.now();
  }

  function isPostStopLocked() {
    return (postStopMode !== 'none') && (nowMs() < postStopUnlockAt);
  }

  function armPostStop(mode, lockMs, nextLevel) {
    postStopMode = mode;
    postStopUnlockAt = nowMs() + (lockMs || 0);
    postStopNextLevel = (mode === 'clear') ? nextLevel : null;

    // Ensure controls update right away (disabled), then again after unlock.
    syncControls();
    if (lockMs && lockMs > 0) {
      window.setTimeout(syncControls, lockMs + 50);
    }
  }

  function clearPostStop() {
    postStopMode = 'none';
    postStopUnlockAt = 0;
    postStopNextLevel = null;
  }

  function syncControls() {
    // Desired behavior:
    // - Running: L/R enabled
    // - Paused: L/R enabled (unpause only)
    // - Death: L/R disabled during lock, then enabled to restart
    // - Clear: L/R disabled during lock, then enabled to advance (if any)
    // - Game over with no action: disabled
    const locked = isPostStopLocked();

    let leftRightEnabled = false;

    if (running) {
      leftRightEnabled = true;
    } else if (paused) {
      leftRightEnabled = true; // unpause on L/R
    } else if (gameOver && postStopMode !== 'none' && !locked) {
      // armed to restart/advance
      if (postStopMode === 'death') leftRightEnabled = true;
      if (postStopMode === 'clear') leftRightEnabled = typeof postStopNextLevel === 'number';
    }

    btnLeft.disabled = !leftRightEnabled;
    btnRight.disabled = !leftRightEnabled;

    // Pause only makes sense while actively running (not gameOver)
    btnPause.disabled = (!running || gameOver);
  }

  function getLevelConfig(levelNum) {
    return LEVEL_CACHE.get(levelNum) || { ...DEFAULT_LEVEL_FALLBACK, id: levelNum };
  }

  function randInt(min, max) {
    // inclusive min, exclusive max
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function samePos(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function posKey(p) {
    return `${p.x},${p.y}`;
  }

  function buildOccupiedSet(includeSnake = true) {
    const set = new Set();
    if (includeSnake) {
      for (const c of snake.cells) set.add(posKey(c));
    }
    set.add(posKey(apple));
    for (const o of obstacles) set.add(posKey(o));
    return set;
  }

  function placeApple() {
    const occupied = buildOccupiedSet(true);
    let tries = 0;
    while (tries++ < 500) {
      const p = { x: randInt(0, COLS) * GRID, y: randInt(0, ROWS) * GRID };
      if (!occupied.has(posKey(p))) {
        apple.x = p.x;
        apple.y = p.y;
        return;
      }
    }
  }

  function addRandomBadApple(cfg) {
    if (!cfg || !cfg.randomBadApples || !cfg.randomBadApples.enabled) return;
    if (randomBadCount >= cfg.randomBadApples.maxCount) return;

    const occupied = buildOccupiedSet(true);
    let tries = 0;
    while (tries++ < 500) {
      const p = { x: randInt(0, COLS) * GRID, y: randInt(0, ROWS) * GRID };
      // Keep bad apples away from the snake head so it doesn't feel "cheap".
      const head = { x: snake.x, y: snake.y };
      const manhattan = Math.abs(p.x - head.x) + Math.abs(p.y - head.y);
      if (manhattan < 6 * GRID) continue;

      if (!occupied.has(posKey(p))) {
        obstacles.push(p);
        randomBadCount++;
        return;
      }
    }
  }


  function lockLevelsUI() {
    // Disable options above unlocked level.
    for (const opt of levelSelect.options) {
      const v = Number(opt.value);
      opt.disabled = v > highestUnlockedLevel;
    }
    // If current selection is now illegal, bring it back.
    if (Number(levelSelect.value) > highestUnlockedLevel) {
      levelSelect.value = String(highestUnlockedLevel);
    }
  }

  function showLobby() {
    lobby.hidden = false;
    gameArea.hidden = true;
    setPlayingMode(false);
    banner('');
    paused = false;
    btnPause.textContent = 'Pause';
    clearPostStop();
    lockLevelsUI();
    syncControls();
  }

  function showGame() {
    lobby.hidden = true;
    gameArea.hidden = false;
    setPlayingMode(true);
    syncControls();
  }

  // --- Game lifecycle
  function resetStateForLevel(levelNum) {
    const cfg = getLevelConfig(levelNum);

    cancelAnimationFrame(rafId);
    rafId = null;

    running = false;
    paused = false;
    gameOver = false;
    btnPause.textContent = 'Pause';
    clearPostStop();

    setLevel(levelNum);
    setScore(0);
    banner(`Target score: ${cfg.targetScore}`);

    snake.x = (cfg.spawn.x * GRID);
    snake.y = (cfg.spawn.y * GRID);

    // Direction from JSON
    if (cfg.direction === 'left') {
      snake.dx = -GRID; snake.dy = 0;
    } else if (cfg.direction === 'up') {
      snake.dx = 0; snake.dy = -GRID;
    } else if (cfg.direction === 'down') {
      snake.dx = 0; snake.dy = GRID;
    } else {
      snake.dx = GRID; snake.dy = 0; // right (default)
    }
    snake.cells = [];
    snake.maxCells = 4;

    apple.x = 20 * GRID;
    apple.y = 10 * GRID;

    obstacles.length = 0;
    randomBadCount = 0;

    // Fixed obstacles from JSON (grid coords -> pixels)
    if (cfg.fixedObstacles && cfg.fixedObstacles.length) {
      for (const c of cfg.fixedObstacles) {
        obstacles.push({ x: c.x * GRID, y: c.y * GRID });
      }
    }

    placeApple();

    lastTime = 0;
    accumulator = 0;

    syncControls(); // keeps buttons consistent during setup
  }

  async function start() {
    const requested = Number(levelSelect.value) || 1;
    if (requested > highestUnlockedLevel) {
      banner(`Level ${requested} is locked — clear Level ${highestUnlockedLevel} first.`);
      levelSelect.value = String(highestUnlockedLevel);
      return;
    }

    banner(`Loading Level ${requested}...`);
    await loadLevelConfig(requested);

    resetStateForLevel(requested);
    showGame();

    running = true;
    syncControls(); // IMPORTANT: enable buttons now that we're running
    rafId = requestAnimationFrame(loop);
  }


  async function startLevelDirect(levelNum) {
    // Used by post-level-clear "advance" action and post-death restart.
    banner(`Loading Level ${levelNum}...`);
    await loadLevelConfig(levelNum);

    resetStateForLevel(levelNum);
    showGame();

    running = true;
    syncControls();
    rafId = requestAnimationFrame(loop);
  }

  function restartCurrentLevel() {
    // Keep selection aligned with current level (useful if user quit to lobby later).
    levelSelect.value = String(level);
    // Fire-and-forget; UI is already gated by syncControls().
    startLevelDirect(level);
  }

  function quitToLobby() {
    cancelAnimationFrame(rafId);
    rafId = null;
    running = false;
    paused = false;
    gameOver = false;
    clearPostStop();
    showLobby();
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
    banner(paused ? 'Paused' : `Target score: ${getLevelConfig(level).targetScore}`);
    syncControls();
  }

  function endGame(msg, mode) {
    // mode: 'death' | 'clear' | undefined
    gameOver = true;
    running = false;

    // Freeze the paused flag off (overlay is enough)
    paused = false;
    btnPause.textContent = 'Pause';

    if (msg) banner(msg);

    // Arm post-stop actions
    if (mode === 'death') {
      armPostStop('death', DEATH_LOCK_MS, null);
    } else if (mode === 'clear') {
      // postStopNextLevel will be set by clearLevel()
      // armPostStop called there
    } else {
      clearPostStop();
      syncControls();
    }
  }

  function clearLevel() {
    const cfg = getLevelConfig(level);

    if (level < 5) {
      const next = level + 1;
      highestUnlockedLevel = Math.max(highestUnlockedLevel, next);
      lockLevelsUI();
      levelSelect.value = String(next);

      // Stop the game, show message, then arm L/R to advance after short lock
      endGame(`Level ${level} cleared! (Target ${cfg.targetScore})`, 'clear');
      banner(`Level ${level} cleared! Next: Level ${next} (tap Left/Right after a moment).`);
      armPostStop('clear', CLEAR_LOCK_MS, next);
    } else {
      // Final level cleared
      endGame(`Level 5 cleared! You beat the game.`, 'clear');
      banner('Level 5 cleared! You beat the game.');
      // No "next level" to advance to; keep L/R disabled.
      armPostStop('clear', CLEAR_LOCK_MS, null);
    }
  }

  // --- Turning logic (running only)
  function turnLeft() {
    // Facing right
    if (snake.dx === GRID && snake.dy === 0) {
      snake.dx = 0;
      snake.dy = -GRID;
      return;
    }
    // Facing left
    if (snake.dx === -GRID && snake.dy === 0) {
      snake.dx = 0;
      snake.dy = GRID;
      return;
    }
    // Facing down
    if (snake.dx === 0 && snake.dy === GRID) {
      snake.dx = GRID;
      snake.dy = 0;
      return;
    }
    // Facing up
    if (snake.dx === 0 && snake.dy === -GRID) {
      snake.dx = -GRID;
      snake.dy = 0;
    }
  }

  function turnRight() {
    // Facing right
    if (snake.dx === GRID && snake.dy === 0) {
      snake.dx = 0;
      snake.dy = GRID;
      return;
    }
    // Facing left
    if (snake.dx === -GRID && snake.dy === 0) {
      snake.dx = 0;
      snake.dy = -GRID;
      return;
    }
    // Facing down
    if (snake.dx === 0 && snake.dy === GRID) {
      snake.dx = -GRID;
      snake.dy = 0;
      return;
    }
    // Facing up
    if (snake.dx === 0 && snake.dy === -GRID) {
      snake.dx = GRID;
      snake.dy = 0;
    }
  }

  // --- Input handlers (buttons + keyboard)
  function handleLeftInput() {
    // If paused, unpause only (no turn on this input)
    if (paused) {
      togglePause();
      return;
    }

    // If game over, handle restart/advance actions (after lock)
    if (gameOver) {
      if (isPostStopLocked()) return;
      if (postStopMode === 'death') {
        restartCurrentLevel();
        return;
      }
      if (postStopMode === 'clear' && typeof postStopNextLevel === 'number') {
        startLevelDirect(postStopNextLevel);
        return;
      }
      return;
    }

    // Normal running turn
    if (!running) return;
    turnLeft();
  }

  function handleRightInput() {
    if (paused) {
      togglePause();
      return;
    }

    if (gameOver) {
      if (isPostStopLocked()) return;
      if (postStopMode === 'death') {
        restartCurrentLevel();
        return;
      }
      if (postStopMode === 'clear' && typeof postStopNextLevel === 'number') {
        startLevelDirect(postStopNextLevel);
        return;
      }
      return;
    }

    if (!running) return;
    turnRight();
  }

  // --- Main update/draw
  function stepOnce() {
    // Move snake
    snake.x += snake.dx;
    snake.y += snake.dy;

    // Wrap-around edges (original behavior)
    if (snake.x < 0) snake.x = canvas.width - GRID;
    else if (snake.x >= canvas.width) snake.x = 0;
    if (snake.y < 0) snake.y = canvas.height - GRID;
    else if (snake.y >= canvas.height) snake.y = 0;

    // Track body
    snake.cells.unshift({ x: snake.x, y: snake.y });
    if (snake.cells.length > snake.maxCells) snake.cells.pop();

    // Collisions: snake vs itself
    const head = snake.cells[0];
    for (let i = 1; i < snake.cells.length; i++) {
      if (samePos(head, snake.cells[i])) {
        endGame('Game Over (you hit yourself)', 'death');
        return;
      }
    }

    // Collisions: snake vs obstacles
    for (const o of obstacles) {
      if (samePos(head, o)) {
        endGame('Game Over (blue apple)', 'death');
        return;
      }
    }

    // Eat apple
    if (samePos(head, apple)) {
      snake.maxCells++;
      setScore(score + 1);

      const cfg = getLevelConfig(level);

      // Add random bad apples as you progress (per JSON cap)
      addRandomBadApple(cfg);

      placeApple();

      // Clear condition
      if (score >= cfg.targetScore) {
        clearLevel();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apple
    ctx.fillStyle = 'red';
    ctx.fillRect(apple.x, apple.y, GRID - 1, GRID - 1);

    // Obstacles
    ctx.fillStyle = 'blue';
    for (const o of obstacles) {
      ctx.fillRect(o.x, o.y, GRID - 1, GRID - 1);
    }

    // Snake
    ctx.fillStyle = 'green';
    for (const c of snake.cells) {
      ctx.fillRect(c.x, c.y, GRID - 1, GRID - 1);
    }

    // If paused/gameOver, overlay
    if (paused || gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (paused) {
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
      } else if (postStopMode === 'clear') {
        ctx.fillText('LEVEL CLEARED', canvas.width / 2, canvas.height / 2);
      } else {
        ctx.fillText('STOPPED', canvas.width / 2, canvas.height / 2);
      }
    }
  }

  function loop(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    if (paused || gameOver) {
      draw();
      return;
    }

    const cfg = getLevelConfig(level);
    if (!lastTime) lastTime = ts;
    const delta = ts - lastTime;
    lastTime = ts;
    accumulator += delta;

    // Allow catching up if tab is slow, but cap to avoid spiral of death.
    const maxSteps = 5;
    let steps = 0;
    while (accumulator >= cfg.moveMs && steps++ < maxSteps) {
      accumulator -= cfg.moveMs;
      stepOnce();
      if (gameOver) break;
    }

    draw();
  }

  // --- Events
  btnStart.addEventListener('click', start);
  btnReset.addEventListener('click', () => {
    highestUnlockedLevel = 1;
    levelSelect.value = '1';
    lockLevelsUI();
    banner('Progress reset for this session.');
    syncControls();
  });

  btnLeft.addEventListener('click', handleLeftInput);
  btnRight.addEventListener('click', handleRightInput);
  btnPause.addEventListener('click', togglePause);
  btnQuit.addEventListener('click', quitToLobby);

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      handleLeftInput();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      handleRightInput();
    } else if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
    }
  });

  // Initialize lobby UI
  lockLevelsUI();
  showLobby();
})();
