(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const wrap = document.getElementById("canvasWrap");
  const ui = {
    start: document.getElementById("startCard"), result: document.getElementById("resultCard"),
    startButton: document.getElementById("startButton"), retry: document.getElementById("retryButton"),
    pause: document.getElementById("pauseButton"), toast: document.getElementById("toast"),
    buildCount: document.getElementById("buildCount"), buildFill: document.getElementById("buildFill"),
    stageLabel: document.getElementById("stageLabel"),
    playerEnergyFill: document.getElementById("playerEnergyFill"), playerEnergyValue: document.getElementById("playerEnergyValue"),
    integrityFill: document.getElementById("integrityFill"), integrityValue: document.getElementById("integrityValue"),
    tiltDot: document.getElementById("tiltDot"), resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"), resultEyebrow: document.getElementById("resultEyebrow"),
    resultIcon: document.getElementById("resultIcon"), finalScore: document.getElementById("finalScore")
  };
  ui.tutorial = document.getElementById("tutorialOverlay");
  ui.tutorialStart = document.getElementById("tutorialStartButton");

  const TUTORIAL_KEY = "ice-breaking-tutorial-seen-v1";

  const spriteSheet = new Image();
  let spriteSheetReady = false;
  spriteSheet.decoding = "async";
  spriteSheet.src = "./assets/ice-breaking-resource-sheet.png?v=20260813";
  spriteSheet.addEventListener("load", () => { spriteSheetReady = true; });
  const SPRITES = {
    worker: { sx: 35, sy: 63, sw: 418, sh: 449 },
    penguin: { sx: 579, sy: 141, sw: 386, sh: 344 },
    ice: { sx: 1068, sy: 129, sw: 370, sh: 377 },
    fire: { sx: 133, sy: 560, sw: 303, sh: 384 },
    hole: { sx: 522, sy: 613, sw: 434, sh: 328 },
    igloo: { sx: 1037, sy: 601, sw: 387, sh: 342 }
  };

  const VIEW_W = 390;
  const MAX_STAGES = 10;
  const STAGE_HEIGHT = 1848;
  const TILE_SIZE = 44;
  const GRID_X = 70;
  const ISLAND_LEFT = 54;
  const ISLAND_RIGHT = 336;
  const HOUSE_OFFSET_Y = 1726;
  const IGLOO_DESIGN_W = 132;
  const IGLOO_DESIGN_H = 110;
  const IGLOO_W = TILE_SIZE * 2;
  const IGLOO_H = TILE_SIZE * 2;
  const goal = { x: 129, y: HOUSE_OFFSET_Y, w: IGLOO_W, h: IGLOO_H };
  const state = {
    phase: "intro", cameraY: 0, targetCameraY: 0, built: 0, score: 0,
    integrity: 100, tiltX: 0, tiltY: 0, keyTilt: 0, paused: false,
    baseBeta: null, lastTime: 0, roundDelay: 0, flash: 0, particles: [],
    block: null, drag: false, dragX: 0, combo: 0,
    coast: { left: [], right: [] }, houseX: 129, houseLane: 1,
    celebration: 0, stage: 0, stageBase: 0, completedIgloos: 0,
    energy: 100, generatedCoastStage: -1, pastHouses: []
  };

  function currentHouseY() { return state.stageBase + HOUSE_OFFSET_Y; }
  function currentWorldBottom() { return state.stageBase + STAGE_HEIGHT; }
  function cameraLimit() { return Math.max(0, currentWorldBottom() - viewHeight()); }

  function tileObjectX(column, width) {
    return GRID_X + column * TILE_SIZE + (TILE_SIZE - width) * .5;
  }

  function tileObjectY(row, height) {
    return row * TILE_SIZE + (TILE_SIZE - height) * .5;
  }

  const obstacles = [
    { type: "fire", minStage: 1, col: 4, row: 16, x: tileObjectX(4, 54), y: tileObjectY(16, 44), w: 54, h: 44 },
    { type: "penguin", minStage: 2, col: 1, startCol: 1, fromCol: 1, targetCol: 2, row: 11, x: tileObjectX(1, 38), y: tileObjectY(11, 49), w: 38, h: 49, minCol: 1, maxCol: 4, step: 0, stepDuration: .66, pause: .1, dir: 1, startDir: 1 },
    { type: "hole", minStage: 3, col: 1, row: 20, x: tileObjectX(1, TILE_SIZE), y: tileObjectY(20, TILE_SIZE), w: TILE_SIZE, h: TILE_SIZE },
    { type: "fire", minStage: 4, col: 1, row: 28, x: tileObjectX(1, 54), y: tileObjectY(28, 44), w: 54, h: 44 },
    { type: "penguin", minStage: 5, col: 4, startCol: 4, fromCol: 4, targetCol: 3, row: 24, x: tileObjectX(4, 38), y: tileObjectY(24, 49), w: 38, h: 49, minCol: 1, maxCol: 4, step: 0, stepDuration: .58, pause: .18, dir: -1, startDir: -1 },
    { type: "hole", minStage: 6, col: 3, row: 30, x: tileObjectX(3, TILE_SIZE), y: tileObjectY(30, TILE_SIZE), w: TILE_SIZE, h: TILE_SIZE },
    { type: "fire", minStage: 7, col: 2, row: 8, x: tileObjectX(2, 54), y: tileObjectY(8, 44), w: 54, h: 44 },
    { type: "penguin", minStage: 8, col: 2, startCol: 2, fromCol: 2, targetCol: 3, row: 33, x: tileObjectX(2, 38), y: tileObjectY(33, 49), w: 38, h: 49, minCol: 1, maxCol: 4, step: 0, stepDuration: .5, pause: .12, dir: 1, startDir: 1 },
    { type: "hole", minStage: 9, col: 4, row: 14, x: tileObjectX(4, TILE_SIZE), y: tileObjectY(14, TILE_SIZE), w: TILE_SIZE, h: TILE_SIZE },
    { type: "fire", minStage: 10, col: 4, row: 35, x: tileObjectX(4, 54), y: tileObjectY(35, 44), w: 54, h: 44 },
    { type: "penguin", minStage: 10, col: 3, startCol: 3, fromCol: 3, targetCol: 2, row: 18, x: tileObjectX(3, 38), y: tileObjectY(18, 49), w: 38, h: 49, minCol: 1, maxCol: 4, step: 0, stepDuration: .48, pause: .1, dir: -1, startDir: -1 }
  ];

  function obstacleActive(obstacle) { return state.stage + 1 >= obstacle.minStage; }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform((rect.width / VIEW_W) * dpr, 0, 0, (rect.width / VIEW_W) * dpr, 0, 0);
  }

  function viewHeight() {
    const rect = wrap.getBoundingClientRect();
    return VIEW_W * rect.height / rect.width;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function drawSprite(name, x, y, width, height, options = {}) {
    if (!spriteSheetReady) return false;
    const sprite = SPRITES[name];
    const { flip = false, alpha = 1, rotation = 0 } = options;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.translate(x + width * .5, y + height * .5);
    ctx.rotate(rotation);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(
      spriteSheet,
      sprite.sx, sprite.sy, sprite.sw, sprite.sh,
      -width * .5, -height * .5, width, height
    );
    ctx.restore();
    return true;
  }
  function rects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function hash(n) { const x = Math.sin(n * 91.73) * 43758.545; return x - Math.floor(x); }

  function makeBay(center, radius, depth) { return { center, radius, depth }; }

  function generateStageCoast(stageIndex) {
    const offset = stageIndex * STAGE_HEIGHT;
    const leftBands = [[330, 500], [650, 830], [1030, 1210], [1330, 1510]];
    const rightBands = [[410, 590], [760, 950], [1120, 1300], [1380, 1540]];
    const pick = bands => bands
      .map(([min, max]) => makeBay(
        offset + min + Math.random() * (max - min),
        70 + Math.random() * 48,
        22 + Math.random() * 24
      ))
      .sort(() => Math.random() - .5)
      .slice(0, 2 + Math.floor(Math.random() * 2))
      .sort((a, b) => a.center - b.center);

    state.coast.left.push(...pick(leftBands));
    state.coast.right.push(...pick(rightBands));
    state.generatedCoastStage = stageIndex;
  }

  function ensureCoastThrough(stageIndex) {
    while (state.generatedCoastStage < stageIndex) generateStageCoast(state.generatedCoastStage + 1);
  }

  function generateCoast() {
    state.coast.left = [];
    state.coast.right = [];
    state.generatedCoastStage = -1;
    ensureCoastThrough(2);
  }

  function bayInset(y, bays) {
    return bays.reduce((total, bay) => {
      const distance = Math.abs(y - bay.center) / bay.radius;
      if (distance >= 1) return total;
      const curve = (Math.cos(distance * Math.PI) + 1) * .5;
      return total + bay.depth * Math.pow(curve, .72);
    }, 0);
  }

  function leftCoast(y) {
    return ISLAND_LEFT + Math.sin(y * .021) * 5 + Math.sin(y * .047) * 2 + bayInset(y, state.coast.left);
  }

  function rightCoast(y) {
    return ISLAND_RIGHT + Math.sin((y + 50) * .021) * 5 + Math.sin((y + 50) * .047) * 2 - bayInset(y, state.coast.right);
  }

  function randomizeHouse() {
    const houseY = currentHouseY();
    const sampleY = houseY + IGLOO_H * .55;
    const minX = Math.ceil(leftCoast(sampleY) + 10);
    const maxX = Math.floor(rightCoast(sampleY) - IGLOO_W - 10);
    const positions = [minX, Math.round((minX + maxX) * .5), maxX];
    state.houseLane = Math.floor(Math.random() * positions.length);
    state.houseX = positions[state.houseLane];
    goal.x = state.houseX;
    goal.y = houseY;
    goal.w = IGLOO_W;
    goal.h = IGLOO_H;
  }

  function showToast(text, ms = 1200) {
    ui.toast.textContent = text;
    ui.toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.remove("is-visible"), ms);
  }

  function availableObstacleColumns(obstacle, row) {
    const y = state.stageBase + tileObjectY(row, obstacle.h);
    const sampleY = y + obstacle.h * .5;
    return [1, 2, 3, 4].filter(column => {
      const x = tileObjectX(column, obstacle.w);
      return x >= leftCoast(sampleY) + 7 && x + obstacle.w <= rightCoast(sampleY) - 7;
    });
  }

  function positionStageObstacles() {
    const usedRows = [];
    for (const o of obstacles) {
      if (!obstacleActive(o)) continue;

      const shuffledRows = Array.from({ length: 29 }, (_, index) => index + 7)
        .sort(() => Math.random() - .5);
      const minimumColumns = o.type === "penguin" ? 2 : 1;
      let row = shuffledRows.find(candidate =>
        usedRows.every(used => Math.abs(used - candidate) >= 2)
        && availableObstacleColumns(o, candidate).length >= minimumColumns
      );
      if (row === undefined) {
        row = shuffledRows.find(candidate => availableObstacleColumns(o, candidate).length >= minimumColumns) ?? 20;
      }

      const validColumns = availableObstacleColumns(o, row);
      const column = validColumns[Math.floor(Math.random() * validColumns.length)] ?? 2;
      usedRows.push(row);
      o.row = row;
      o.col = column;
      o.x = tileObjectX(column, o.w);
      o.y = state.stageBase + tileObjectY(row, o.h);

      if (o.type !== "penguin") continue;
      o.minCol = Math.min(...validColumns);
      o.maxCol = Math.max(...validColumns);
      o.dir = column >= o.maxCol ? -1 : column <= o.minCol ? 1 : (Math.random() < .5 ? -1 : 1);
      o.fromCol = column;
      o.targetCol = column + o.dir;
      o.step = 0;
      o.pause = .12;
      o.walkLift = 0;
    }
  }

  function updateHud() {
    ui.stageLabel.textContent = `STAGE ${state.stage + 1} / ${MAX_STAGES}`;
    ui.buildCount.textContent = `${state.built} / 3`;
    ui.buildFill.style.width = `${state.built / 3 * 100}%`;
    ui.playerEnergyValue.textContent = `${Math.ceil(state.energy)}%`;
    ui.playerEnergyFill.style.width = `${state.energy}%`;
    ui.playerEnergyFill.style.background = state.energy < 25
      ? "repeating-linear-gradient(90deg, #ff755e 0 14px, #bf3f45 14px 17px)"
      : state.energy < 55
        ? "repeating-linear-gradient(90deg, #ffd65c 0 14px, #d88a39 14px 17px)"
        : "repeating-linear-gradient(90deg, #70e4f7 0 14px, #38a7ce 14px 17px)";
    ui.integrityValue.textContent = `${Math.ceil(state.integrity)}%`;
    ui.integrityFill.style.width = `${state.integrity}%`;
    ui.integrityFill.style.background = state.integrity < 35 ? "#ff755e" : state.integrity < 65 ? "#ffd65c" : "#81e7ff";
    const tiltPercent = 50 + clamp(state.tiltX + state.keyTilt, -1, 1) * 50;
    ui.tiltDot.style.left = `clamp(6.5px, ${tiltPercent}%, calc(100% - 6.5px))`;
  }

  async function enableMotion() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const answer = await DeviceOrientationEvent.requestPermission();
        if (answer !== "granted") showToast("센서 권한 없이 터치 모드로 시작합니다", 1800);
      }
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    } catch (_) {
      showToast("화면 드래그로 조작할 수 있어요", 1700);
    }
  }

  function onOrientation(event) {
    const gamma = typeof event.gamma === "number" ? event.gamma : 0;
    const beta = typeof event.beta === "number" ? event.beta : 0;
    if (state.baseBeta === null) state.baseBeta = beta;
    state.tiltX += (clamp(gamma / 24, -1, 1) - state.tiltX) * .25;
    state.tiltY += (clamp((beta - state.baseBeta) / 28, -.7, .7) - state.tiltY) * .18;
  }

  function resetGame() {
    state.stage = 0; state.stageBase = 0; state.completedIgloos = 0; state.energy = 100;
    state.pastHouses.length = 0;
    generateCoast();
    positionStageObstacles();
    randomizeHouse();
    state.phase = "making";
    state.cameraY = 0; state.targetCameraY = 0; state.built = 0; state.score = 0;
    state.integrity = 100; state.roundDelay = 1.15; state.block = null; state.paused = false;
    state.particles.length = 0; state.baseBeta = null; state.combo = 0; state.celebration = 0;
    ui.result.hidden = true; ui.start.style.display = "none"; ui.pause.textContent = "Ⅱ";
    updateHud();
    showToast("망치질 중… 얼음 조각 준비!", 1000);
  }

  function spawnBlock() {
    state.block = { x: 178, y: state.stageBase + 168, w: 34, h: 34, vx: 0, vy: 44, angle: 0, spin: 0, hit: 0 };
    state.integrity = 100;
    state.phase = "falling";
    burst(195, state.stageBase + 164, "ice", 12);
    showToast("기울여서 집까지 보내세요!", 1250);
  }

  function burst(x, y, kind, count) {
    const colors = kind === "fire" ? ["#ffdc62", "#ff765d", "#ff9b43"]
      : kind === "snow" ? ["#fff", "#bceeff"]
      : kind === "water" ? ["#d9fbff", "#70ddf2", "#1688bc"]
      : ["#e8fcff", "#86e5ff", "#409dcc"];
    for (let i = 0; i < count; i++) {
      state.particles.push({ x, y, vx: (Math.random() - .5) * 150, vy: (Math.random() - .8) * 130, life: .5 + Math.random() * .55, size: 2 + Math.random() * 5, color: colors[i % colors.length] });
    }
  }

  function hitBlock(amount, pushX, label) {
    const b = state.block;
    if (!b || b.hit > 0) return;
    state.integrity = clamp(state.integrity - amount, 0, 100);
    b.vx += pushX; b.vy *= .64; b.spin += pushX * .018; b.hit = .45;
    state.flash = .12;
    burst(b.x + b.w / 2, b.y + b.h / 2, "ice", 7);
    showToast(label, 850);
  }

  function loseBlock(reason) {
    if (!state.block) return;
    burst(state.block.x + 17, state.block.y + 17, "ice", 22);
    state.block = null;
    state.phase = "making";
    state.roundDelay = 1.5;
    state.cameraY = state.stageBase;
    state.targetCameraY = state.stageBase;
    state.combo = 0;
    state.energy = clamp(state.energy - (7 + state.stage * .7), 0, 100);
    showToast(`${reason} — 새 조각을 만들어요`, 1500);
  }

  function dropIntoSea() {
    const b = state.block;
    if (!b || state.phase === "sinking") return;
    burst(b.x + b.w * .5, b.y + b.h * .5, "water", 24);
    state.phase = "sinking";
    b.sink = 0;
    b.fallType = "sea";
    b.vx *= .72;
    b.vy = 58;
    b.spin += (b.vx < 0 ? -1 : 1) * 2.4;
    state.combo = 0;
    state.energy = clamp(state.energy - (5 + state.stage * .55), 0, 100);
    showToast("첨벙! 얼음 조각이 가라앉아요", 1100);
  }

  function dropIntoHole() {
    const b = state.block;
    if (!b || state.phase === "sinking") return;
    burst(b.x + b.w * .5, b.y + b.h * .5, "ice", 14);
    state.phase = "sinking";
    b.sink = 0;
    b.fallType = "hole";
    b.vx *= .18;
    b.vy = 28;
    b.spin += (b.vx < 0 ? -1 : 1) * 2.8;
    state.combo = 0;
    state.energy = clamp(state.energy - (5 + state.stage * .55), 0, 100);
    showToast("앗! 얼음 조각이 틈새로 빠져요", 1100);
  }

  function finishDrop() {
    state.block = null;
    state.phase = "making";
    state.roundDelay = 1.15;
    state.targetCameraY = state.stageBase;
    showToast("새 얼음 조각을 만들어요", 1000);
  }

  function landBlock() {
    const b = state.block;
    const stageMultiplier = 1 + state.stage * .16;
    state.score += Math.round((state.integrity * 12 + 500 + state.combo * 150) * stageMultiplier);
    state.combo++;
    state.built++;
    burst(b.x + 17, b.y + 17, "snow", 25);
    state.block = null;
    updateHud();
    if (state.built >= 3) {
      state.completedIgloos++;
      state.energy = clamp(state.energy + Math.max(9, 14 - state.stage * .55), 0, 100);
      state.phase = "celebrating";
      state.celebration = 0;
      state.targetCameraY = clamp(currentHouseY() - viewHeight() * .58, 0, cameraLimit());
      showToast("이글루 완성! 다음 구간으로 내려가요!", 1700);
    } else {
      state.phase = "making";
      state.roundDelay = 1.65;
      showToast(`착! ${state.built}번째 얼음 안착`, 1250);
      setTimeout(() => { if (state.phase === "making") state.targetCameraY = state.stageBase; }, 500);
    }
  }

  function advanceStage() {
    state.pastHouses.push({ x: state.houseX, y: currentHouseY() });
    state.stage++;
    state.stageBase = state.stage * STAGE_HEIGHT;
    state.built = 0;
    state.integrity = 100;
    state.block = null;
    state.combo = 0;
    state.celebration = 0;
    state.roundDelay = 1.35;
    state.phase = "making";
    ensureCoastThrough(state.stage + 2);
    positionStageObstacles();
    randomizeHouse();
    state.targetCameraY = state.stageBase;
    updateHud();
    showToast(`${state.stage + 1}번째 깨진 이글루를 수리하세요!`, 1800);
  }

  function showGameOver() {
    if (state.phase === "gameover") return;
    state.phase = "gameover";
    state.block = null;
    ui.resultEyebrow.textContent = "EXPEDITION OVER";
    ui.resultTitle.textContent = "게임 오버";
    ui.resultCopy.textContent = `완성한 이글루 ${state.completedIgloos}채 · 캐릭터의 체력이 모두 소진됐어요.`;
    ui.resultIcon.textContent = "❄";
    ui.finalScore.textContent = String(state.score).padStart(4, "0");
    ui.result.hidden = false;
  }

  function showVictory() {
    state.phase = "victory";
    state.block = null;
    ui.resultEyebrow.textContent = "ALL STAGES COMPLETE";
    ui.resultTitle.textContent = "10 STAGE CLEAR!";
    ui.resultCopy.textContent = `깨진 이글루 ${MAX_STAGES}채를 모두 수리했어요!`;
    ui.resultIcon.textContent = "⌂";
    ui.finalScore.textContent = String(state.score).padStart(4, "0");
    ui.result.hidden = false;
  }

  function update(dt) {
    if (state.paused || state.phase === "intro") return;
    if (state.phase === "gameover" || state.phase === "victory") return;
    const stageDrain = .55 + state.stage * .055;
    state.energy = clamp(state.energy - dt * stageDrain, 0, 100);
    if (state.energy <= 0) {
      updateHud();
      showGameOver();
      return;
    }
    if (state.flash > 0) state.flash -= dt;
    for (const o of obstacles) {
      if (!obstacleActive(o)) continue;
      if (o.type === "penguin") {
        o.y = state.stageBase + tileObjectY(o.row, o.h);
        if (o.pause > 0) {
          o.pause -= dt;
          o.walkLift = 0;
          continue;
        }

        const speedScale = Math.max(.62, 1 - state.stage * .045);
        o.step = clamp(o.step + dt / (o.stepDuration * speedScale), 0, 1);
        const easedStep = o.step * o.step * (3 - 2 * o.step);
        const movingColumn = o.fromCol + (o.targetCol - o.fromCol) * easedStep;
        o.x = tileObjectX(movingColumn, o.w);
        o.walkLift = Math.sin(o.step * Math.PI) * 5;

        if (o.step >= 1) {
          o.col = o.targetCol;
          o.fromCol = o.col;
          let nextColumn = o.col + o.dir;
          if (nextColumn < o.minCol || nextColumn > o.maxCol) {
            o.dir *= -1;
            nextColumn = o.col + o.dir;
          }
          o.targetCol = nextColumn;
          o.step = 0;
          o.pause = .14;
          o.walkLift = 0;
          o.x = tileObjectX(o.col, o.w);
        }
      }
    }
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);

    if (state.phase === "celebrating") {
      state.celebration += dt;
      state.targetCameraY = clamp(currentHouseY() - viewHeight() * .58, 0, cameraLimit());
      if (Math.random() < dt * 14) {
        burst(state.houseX + IGLOO_W * Math.random(), currentHouseY() + 12 + Math.random() * 85, "snow", 1);
      }
      if (state.celebration >= 2.35) {
        if (state.stage + 1 >= MAX_STAGES) showVictory();
        else advanceStage();
      }
    }

    if (state.phase === "making") {
      state.roundDelay -= dt;
      if (state.roundDelay <= 0) spawnBlock();
    }

    const b = state.block;
    if (state.phase === "sinking" && b) {
      b.sink += dt;
      b.x += b.vx * dt;
      b.y += (b.vy + b.sink * 75) * dt;
      b.angle += (b.spin + b.vx * .004) * dt;
      b.vx *= Math.pow(.976, dt * 60);
      if (b.fallType === "sea" && Math.random() < dt * 18) {
        burst(b.x + b.w * (.25 + Math.random() * .5), b.y + b.h * .5, "water", 1);
      }
      state.targetCameraY = clamp(b.y - viewHeight() * .38, 0, cameraLimit());
      if (b.sink >= .82) finishDrop();
    }

    if (state.phase === "falling" && b) {
      if (b.hit > 0) b.hit -= dt;
      const steer = clamp(state.tiltX + state.keyTilt, -1, 1);
      const accelY = 116 + state.tiltY * 42;
      b.vx += steer * 245 * dt;
      b.vx *= Math.pow(.965, dt * 60);
      b.vy = clamp(b.vy + accelY * dt, 42, 220);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += (b.spin + b.vx * .006) * dt;
      const left = leftCoast(b.y + b.h * .5);
      const right = rightCoast(b.y + b.h * .5);
      const blockCenterX = b.x + b.w * .5;
      if (blockCenterX < left || blockCenterX > right) {
        dropIntoSea();
        updateHud();
        return;
      }

      for (const o of obstacles) {
        if (!obstacleActive(o) || b.hit > 0 || !rects(b, o)) continue;
        if (o.type === "penguin") {
          hitBlock(14 + state.stage * 1.5, o.dir * (112 + state.stage * 8), "펭귄이 툭! 밀었어요");
        }
        if (o.type === "hole") {
          const centerX = b.x + b.w * .5;
          const centerY = b.y + b.h * .5;
          if (centerX > o.x + 5 && centerX < o.x + o.w - 5 && centerY > o.y + 5 && centerY < o.y + o.h - 5) {
            dropIntoHole();
            updateHud();
            return;
          }
        }
      }
      for (const o of obstacles) {
        if (!obstacleActive(o) || o.type !== "fire") continue;
        const hot = { x: o.x - 18, y: o.y - 18, w: o.w + 36, h: o.h + 36 };
        if (rects(b, hot)) {
          state.integrity = clamp(state.integrity - dt * (21.5 + state.stage * 1.5), 0, 100);
          if (Math.random() < dt * 8) burst(b.x + 17, b.y + 17, "fire", 1);
        }
      }
      if (state.integrity <= 0) loseBlock("얼음이 녹아버렸어요");
      if (b && rects(b, goal)) landBlock();
      if (state.block && state.block.y > currentWorldBottom() + 30) loseBlock("바다로 빠졌어요");
      if (state.block) state.targetCameraY = clamp(state.block.y - viewHeight() * .38, 0, cameraLimit());
    }
    state.cameraY += (state.targetCameraY - state.cameraY) * Math.min(1, dt * 5.5);
    updateHud();
  }

  function pxRect(x, y, w, h, fill, outline) {
    ctx.fillStyle = outline || fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (outline) { ctx.fillStyle = fill; ctx.fillRect(Math.round(x + 3), Math.round(y + 3), Math.round(w - 6), Math.round(h - 6)); }
  }

  function drawSea(vh) {
    ctx.fillStyle = "#087aa4"; ctx.fillRect(0, 0, VIEW_W, vh);
    const start = Math.floor(state.cameraY / 34) * 34;
    for (let y = start; y < state.cameraY + vh + 40; y += 34) {
      const sy = y - state.cameraY;
      for (let x = 7; x < VIEW_W; x += 54) {
        const shift = (Math.floor(y / 34) % 2) * 23;
        ctx.fillStyle = hash(x + y) > .45 ? "rgba(119,231,244,.42)" : "rgba(3,78,130,.44)";
        ctx.fillRect((x + shift) % VIEW_W, sy + hash(x * y) * 9, 20 + hash(x + 2) * 18, 4);
        ctx.fillStyle = "rgba(3,57,105,.32)"; ctx.fillRect((x + shift + 9) % VIEW_W, sy + 10, 27, 3);
      }
    }
  }

  function drawIsland(vh) {
    const viewTop = Math.max(0, Math.floor((state.cameraY - 70) / 14) * 14);
    const viewBottom = state.cameraY + vh + 70;
    ctx.save(); ctx.translate(0, -state.cameraY);
    ctx.beginPath(); ctx.moveTo(leftCoast(viewTop), viewTop);
    for (let y = viewTop; y <= viewBottom; y += 14) ctx.lineTo(leftCoast(y), y);
    for (let y = viewBottom; y >= viewTop; y -= 14) ctx.lineTo(rightCoast(y), y);
    ctx.closePath(); ctx.fillStyle = "#77cbe0"; ctx.fill();
    ctx.strokeStyle = "#d8f8fb"; ctx.lineWidth = 7; ctx.stroke();

    ctx.save(); ctx.clip();
    ctx.fillStyle = "#a9e7ee"; ctx.fillRect(ISLAND_LEFT + 8, viewTop, ISLAND_RIGHT - ISLAND_LEFT - 16, viewBottom - viewTop);
    ctx.fillStyle = "rgba(239,253,251,.28)";
    const firstTileY = Math.floor(viewTop / TILE_SIZE) * TILE_SIZE;
    for (let y = firstTileY; y < viewBottom; y += TILE_SIZE) {
      for (let x = GRID_X; x < 330; x += TILE_SIZE) {
        ctx.strokeStyle = "rgba(39,145,179,.12)"; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        if (hash(x * 3 + y) > .84) ctx.fillRect(x + 8, y + 8, 14, 3);
      }
    }
    ctx.restore();

    ctx.fillStyle = "#4ca8c5";
    const firstEdgeY = Math.floor(viewTop / 92) * 92 + 55;
    for (let y = firstEdgeY; y < viewBottom; y += 92) {
      ctx.fillRect(leftCoast(y) + 2, y, 8 + hash(y) * 13, 6);
      ctx.fillRect(rightCoast(y + 39) - 15, y + 39, 12, 5);
    }
    drawBayMarkers(viewTop, viewBottom);
    drawTopWorkshop();
    for (const o of obstacles) if (obstacleActive(o)) drawObstacle(o);
    for (const house of state.pastHouses) {
      if (house.y + IGLOO_H < viewTop || house.y > viewBottom) continue;
      drawHouse(house.x, house.y, 3, false);
    }
    drawHouse();
    if (state.block) drawBlock(state.block);
    for (const p of state.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); pxRect(p.x, p.y, p.size, p.size, p.color); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBayMarkers(viewTop, viewBottom) {
    ctx.save();
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    for (const [side, bays] of [["left", state.coast.left], ["right", state.coast.right]]) {
      for (const bay of bays) {
        if (bay.center < viewTop - 30 || bay.center > viewBottom + 30) continue;
        const x = side === "left" ? leftCoast(bay.center) + 14 : rightCoast(bay.center) - 14;
        ctx.fillStyle = "rgba(20,105,145,.42)";
        ctx.fillRect(x - 8, bay.center - 16, 16, 4);
        ctx.fillRect(x - 12, bay.center - 7, 12, 3);
        ctx.fillStyle = "rgba(235,253,255,.72)";
        ctx.fillRect(x - 4, bay.center + 7, 9, 3);
      }
    }
    ctx.restore();
  }

  function drawTopWorkshop() {
    const base = state.stageBase;
    ctx.fillStyle = "#5cb6ce"; ctx.fillRect(71, base + 54, 248, 99);
    ctx.fillStyle = "#dffcff"; ctx.fillRect(80, base + 48, 230, 9);
    ctx.fillStyle = "#337fa9"; ctx.fillRect(112, base + 95, 166, 17);
    ctx.fillStyle = "#1d5b87"; ctx.fillRect(132, base + 112, 126, 8);
    if (state.phase !== "celebrating" && state.phase !== "gameover" && state.phase !== "victory") drawWorker(178, base + 82);
    ctx.fillStyle = "#e9fbff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(state.phase === "making" ? "쾅!  쾅!" : "조심히 보내!", 195, base + 151);
  }

  function drawWorker(x, y) {
    const hammering = state.phase === "making";
    const hammerBounce = hammering ? Math.abs(Math.sin(performance.now() * .018)) * 3 : 0;
    if (drawSprite("worker", x - 13, y - 4 - hammerBounce, 61, 65, {
      rotation: hammering ? Math.sin(performance.now() * .018) * .045 : 0
    })) return;
    ctx.save(); ctx.translate(x - 4, y - 5);

    // Chunky 8-bit polar explorer: fur hood, parka, mittens and snow boots.
    pxRect(8, 1, 32, 31, "#288dc1", "#071f40");
    pxRect(11, 4, 26, 25, "#eafcff", "#071f40");
    pxRect(14, 7, 20, 20, "#f2ad72", "#0a294b");
    ctx.fillStyle = "#663c31"; ctx.fillRect(14, 9, 20, 4);
    ctx.fillStyle = "#071f40"; ctx.fillRect(17, 15, 3, 4); ctx.fillRect(28, 15, 3, 4);
    ctx.fillStyle = "#fff"; ctx.fillRect(21, 22, 7, 2);

    pxRect(5, 29, 38, 29, "#2384bd", "#071f40");
    ctx.fillStyle = "#74d7ec"; ctx.fillRect(10, 34, 28, 5);
    ctx.fillStyle = "#0b5889"; ctx.fillRect(20, 39, 4, 16);
    ctx.fillStyle = "#ffd65c"; ctx.fillRect(12, 43, 5, 5); ctx.fillRect(31, 43, 5, 5);
    pxRect(2, 33, 10, 21, "#1b75ad", "#071f40");
    pxRect(0, 48, 11, 10, "#f2ad72", "#071f40");
    pxRect(10, 55, 13, 9, "#173b60", "#061a34");
    pxRect(28, 55, 13, 9, "#173b60", "#061a34");

    ctx.save();
    ctx.translate(41, hammering ? 31 : 23);
    ctx.rotate(hammering ? -.78 : -.2);
    pxRect(-3, 0, 11, 18, "#1b75ad", "#071f40");
    pxRect(-4, 13, 12, 10, "#f2ad72", "#071f40");
    pxRect(3, 12, 7, 34, "#9a633b", "#071f40");
    pxRect(-8, 38, 27, 12, "#dceaf0", "#071f40");
    ctx.fillStyle = "#fff"; ctx.fillRect(-3, 41, 14, 3);
    ctx.restore();
    ctx.restore();
  }

  function drawCelebratingWorker(x, y) {
    const bounce = Math.abs(Math.sin(state.celebration * 8.5)) * 6;
    const wave = Math.sin(state.celebration * 13) * .18;
    if (spriteSheetReady) {
      drawSprite("worker", x - 12, y - 10 - bounce, 72, 77, { rotation: wave * .25 });
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 5, y - 8 - bounce, 5, 5); ctx.fillRect(x + 52, y - 1 - bounce, 5, 5);
      ctx.fillStyle = "#ffd65c";
      ctx.fillRect(x - 2, y - 11 - bounce, 3, 11); ctx.fillRect(x - 6, y - 7 - bounce, 11, 3);
      ctx.fillRect(x + 54, y - 4 - bounce, 3, 11); ctx.fillRect(x + 50, y - bounce, 11, 3);
      return;
    }
    ctx.save(); ctx.translate(x, y - bounce);

    ctx.save(); ctx.translate(10, 34); ctx.rotate(-2.35 - wave);
    pxRect(0, -4, 10, 29, "#2384bd", "#071f40");
    pxRect(0, 19, 11, 10, "#f2ad72", "#071f40"); ctx.restore();
    ctx.save(); ctx.translate(35, 34); ctx.rotate(-.78 + wave);
    pxRect(0, -4, 10, 29, "#2384bd", "#071f40");
    pxRect(0, 19, 11, 10, "#f2ad72", "#071f40"); ctx.restore();

    pxRect(8, 25, 32, 34, "#2384bd", "#071f40");
    ctx.fillStyle = "#74d7ec"; ctx.fillRect(13, 31, 22, 5);
    ctx.fillStyle = "#0b5889"; ctx.fillRect(22, 36, 4, 19);
    pxRect(8, 0, 32, 29, "#288dc1", "#071f40");
    pxRect(11, 3, 26, 24, "#eafcff", "#071f40");
    pxRect(14, 6, 20, 19, "#f2ad72", "#0a294b");
    ctx.fillStyle = "#663c31"; ctx.fillRect(14, 8, 20, 4);
    ctx.fillStyle = "#071f40"; ctx.fillRect(17, 14, 3, 4); ctx.fillRect(29, 14, 3, 4);
    ctx.fillStyle = "#fff"; ctx.fillRect(20, 20, 10, 4);
    ctx.fillStyle = "#071f40"; ctx.fillRect(22, 21, 6, 3);
    pxRect(10, 54, 10, 8, "#173b60", "#082544"); pxRect(28, 54, 10, 8, "#173b60", "#082544");

    ctx.fillStyle = "#fff";
    ctx.fillRect(-5, -5, 5, 5); ctx.fillRect(45, 2, 5, 5);
    ctx.fillStyle = "#ffd65c";
    ctx.fillRect(-2, -8, 3, 11); ctx.fillRect(-6, -4, 11, 3);
    ctx.fillRect(47, -1, 3, 11); ctx.fillRect(43, 3, 11, 3);
    ctx.restore();
  }

  function drawObstacle(o) {
    if (o.type === "penguin") {
      if (drawSprite("penguin", o.x - 2, o.y - (o.walkLift || 0), 42, 47, { flip: o.dir < 0 })) return;
      ctx.save(); ctx.translate(o.x + (o.dir < 0 ? o.w : 0), o.y - (o.walkLift || 0)); ctx.scale(o.dir < 0 ? -1 : 1, 1);
      pxRect(5, 5, 29, 39, "#0b2448", "#06203e");
      pxRect(11, 15, 20, 26, "#eafcff");
      pxRect(13, 0, 17, 10, "#0b2448");
      pxRect(26, 10, 12, 8, "#ffd75c", "#873f32");
      pxRect(10, 10, 4, 4, "#fff"); pxRect(11, 11, 2, 2, "#071832");
      pxRect(1, 42, 15, 5, "#ffbf43"); pxRect(24, 42, 15, 5, "#ffbf43");
      ctx.restore();
    } else if (o.type === "fire") {
      const flicker = Math.sin(performance.now() * .012) * 2;
      ctx.fillStyle = "rgba(255,118,74,.13)"; ctx.beginPath(); ctx.arc(o.x + 27, o.y + 17, 48, 0, Math.PI * 2); ctx.fill();
      if (drawSprite("fire", o.x + 6, o.y - 10 - flicker, 42, 54 + flicker)) return;
      ctx.fillStyle = "rgba(255,118,74,.13)"; ctx.beginPath(); ctx.arc(o.x + 27, o.y + 17, 48, 0, Math.PI * 2); ctx.fill();
      pxRect(o.x + 1, o.y + 33, 53, 8, "#613d32", "#17314c");
      pxRect(o.x + 10, o.y + 28, 34, 8, "#9b5633");
      const flickerFallback = Math.sin(performance.now() * .012) * 4;
      ctx.fillStyle = "#ff765d"; ctx.beginPath(); ctx.moveTo(o.x + 13, o.y + 29); ctx.lineTo(o.x + 27, o.y - 4 + flickerFallback); ctx.lineTo(o.x + 44, o.y + 29); ctx.fill();
      ctx.fillStyle = "#ffd65c"; ctx.beginPath(); ctx.moveTo(o.x + 21, o.y + 29); ctx.lineTo(o.x + 30, o.y + 8 - flickerFallback * .3); ctx.lineTo(o.x + 37, o.y + 29); ctx.fill();
    } else if (o.type === "hole") {
      if (drawSprite("hole", o.x, o.y + 5, o.w, o.h - 10)) return;
      ctx.fillStyle = "rgba(31, 103, 137, .28)"; ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "#0a3155";
      ctx.beginPath();
      ctx.moveTo(o.x + 4, o.y + 18); ctx.lineTo(o.x + 13, o.y + 7); ctx.lineTo(o.x + 25, o.y + 10);
      ctx.lineTo(o.x + 39, o.y + 5); ctx.lineTo(o.x + 36, o.y + 19); ctx.lineTo(o.x + 42, o.y + 29);
      ctx.lineTo(o.x + 29, o.y + 38); ctx.lineTo(o.x + 17, o.y + 35); ctx.lineTo(o.x + 6, o.y + 40);
      ctx.lineTo(o.x + 10, o.y + 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#031c3a";
      ctx.beginPath();
      ctx.moveTo(o.x + 11, o.y + 19); ctx.lineTo(o.x + 18, o.y + 12); ctx.lineTo(o.x + 27, o.y + 15);
      ctx.lineTo(o.x + 35, o.y + 11); ctx.lineTo(o.x + 31, o.y + 23); ctx.lineTo(o.x + 36, o.y + 29);
      ctx.lineTo(o.x + 26, o.y + 34); ctx.lineTo(o.x + 18, o.y + 29); ctx.lineTo(o.x + 10, o.y + 34);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4ca7c2"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(o.x + 13, o.y + 8); ctx.lineTo(o.x + 7, o.y + 1); ctx.moveTo(o.x + 38, o.y + 8); ctx.lineTo(o.x + 43, o.y + 1);
      ctx.moveTo(o.x + 8, o.y + 37); ctx.lineTo(o.x + 2, o.y + 43); ctx.stroke();
    }
  }

  function drawHouse(houseX = state.houseX, houseY = currentHouseY(), built = state.built, active = true) {
    if (drawSprite("igloo", houseX, houseY + 4, IGLOO_W, IGLOO_H - 4)) {
      const missingPatches = [
        { x: houseX + 20, y: houseY + 25 },
        { x: houseX + 37, y: houseY + 12 },
        { x: houseX + 55, y: houseY + 24 }
      ];
      for (let i = built; i < 3; i++) {
        const patch = missingPatches[i];
        ctx.fillStyle = "#0b426d";
        ctx.beginPath();
        ctx.moveTo(patch.x, patch.y + 4); ctx.lineTo(patch.x + 5, patch.y);
        ctx.lineTo(patch.x + 16, patch.y + 2); ctx.lineTo(patch.x + 18, patch.y + 11);
        ctx.lineTo(patch.x + 10, patch.y + 16); ctx.lineTo(patch.x + 1, patch.y + 12);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#67c7e2"; ctx.lineWidth = 1.5; ctx.stroke();
      }

      if (active && built < 3) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = "#ffe072"; ctx.lineWidth = 2;
        ctx.strokeRect(goal.x, goal.y, goal.w, goal.h); ctx.setLineDash([]);
        ctx.fillStyle = "#ffdf72"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("이글루 전체에 안착!", houseX + IGLOO_W * .5, houseY - 10);
      }

      if (active && state.phase === "celebrating") {
        const workerY = houseY + IGLOO_H * .45;
        const islandMiddle = (leftCoast(workerY) + rightCoast(workerY)) * .5;
        const workerX = houseX + IGLOO_W * .5 < islandMiddle ? houseX + IGLOO_W + 8 : houseX - 52;
        drawCelebratingWorker(workerX, workerY);
      }
      return;
    }
    ctx.save();
    ctx.translate(houseX, houseY);
    ctx.scale(IGLOO_W / IGLOO_DESIGN_W, IGLOO_H / IGLOO_DESIGN_H);
    const x = 0;
    const y = 0;

    ctx.fillStyle = "rgba(24, 92, 125, .38)";
    ctx.fillRect(x - 7, y + IGLOO_DESIGN_H - 1, IGLOO_DESIGN_W + 14, 9);
    ctx.fillStyle = "#e8fcff";
    ctx.fillRect(x - 5, y + IGLOO_DESIGN_H - 6, IGLOO_DESIGN_W + 10, 7);

    ctx.fillStyle = "#2f85a4";
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 106); ctx.lineTo(x + 3, y + 58); ctx.lineTo(x + 10, y + 36);
    ctx.lineTo(x + 23, y + 19); ctx.lineTo(x + 40, y + 8); ctx.lineTo(x + 57, y + 2);
    ctx.lineTo(x + 76, y + 2); ctx.lineTo(x + 95, y + 9); ctx.lineTo(x + 112, y + 22);
    ctx.lineTo(x + 123, y + 40); ctx.lineTo(x + 129, y + 61); ctx.lineTo(x + 129, y + 106);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#c9f3f6";
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 101); ctx.lineTo(x + 9, y + 59); ctx.lineTo(x + 16, y + 38);
    ctx.lineTo(x + 29, y + 24); ctx.lineTo(x + 44, y + 14); ctx.lineTo(x + 59, y + 8);
    ctx.lineTo(x + 75, y + 8); ctx.lineTo(x + 92, y + 15); ctx.lineTo(x + 106, y + 27);
    ctx.lineTo(x + 116, y + 44); ctx.lineTo(x + 123, y + 63); ctx.lineTo(x + 123, y + 101);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = "#65b9ce"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 58); ctx.lineTo(x + 123, y + 58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 17, y + 37); ctx.lineTo(x + 116, y + 37); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 31, y + 21); ctx.lineTo(x + 102, y + 21); ctx.stroke();
    for (const seamX of [31, 62, 94]) {
      ctx.beginPath(); ctx.moveTo(x + seamX, y + 59); ctx.lineTo(x + seamX, y + 99); ctx.stroke();
    }

    ctx.fillStyle = "#082e53";
    ctx.beginPath();
    ctx.moveTo(x + 40, y + 34); ctx.lineTo(x + 45, y + 20); ctx.lineTo(x + 57, y + 10);
    ctx.lineTo(x + 75, y + 8); ctx.lineTo(x + 91, y + 17); ctx.lineTo(x + 98, y + 34);
    ctx.closePath(); ctx.fill();

    const patches = [
      { x: x + 40, y: y + 19 },
      { x: x + 57, y: y + 6 },
      { x: x + 78, y: y + 19 }
    ];
    for (let i = 0; i < built; i++) {
      const patch = patches[i];
      pxRect(patch.x, patch.y, 28, 25, "#d9f9fa", "#479bb8");
      ctx.fillStyle = "#fff"; ctx.fillRect(patch.x + 6, patch.y + 6, 11, 3);
    }

    ctx.fillStyle = "#277b9e";
    ctx.beginPath(); ctx.moveTo(x + 45, y + 105); ctx.lineTo(x + 45, y + 82);
    ctx.quadraticCurveTo(x + 66, y + 58, x + 87, y + 82); ctx.lineTo(x + 87, y + 105); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#071f40";
    ctx.beginPath(); ctx.moveTo(x + 52, y + 105); ctx.lineTo(x + 52, y + 84);
    ctx.quadraticCurveTo(x + 66, y + 68, x + 80, y + 84); ctx.lineTo(x + 80, y + 105); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd35d"; ctx.fillRect(x + 61, y + 91, 10, 14);
    ctx.fillStyle = "#ff745d"; ctx.fillRect(x + 64, y + 96, 5, 9);
    ctx.restore();

    if (active && built < 3) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "#ffe072"; ctx.lineWidth = 2;
      ctx.strokeRect(goal.x, goal.y, goal.w, goal.h); ctx.setLineDash([]);
      ctx.fillStyle = "#ffdf72"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("이글루 전체에 안착!", houseX + IGLOO_W * .5, houseY - 10);
    }

    if (active && state.phase === "celebrating") {
      const workerY = houseY + IGLOO_H * .45;
      const islandMiddle = (leftCoast(workerY) + rightCoast(workerY)) * .5;
      const workerX = houseX + IGLOO_W * .5 < islandMiddle ? houseX + IGLOO_W + 8 : houseX - 52;
      drawCelebratingWorker(workerX, workerY);
    }
  }

  function drawBlock(b) {
    const sink = b.sink || 0;
    const submerge = clamp(sink / .82, 0, 1);
    ctx.save();
    ctx.globalAlpha = 1 - submerge * .68;
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.rotate(b.angle);
    const s = (.82 + state.integrity / 100 * .18) * (1 - submerge * .3); ctx.scale(s, s);
    if (spriteSheetReady) {
      const sprite = SPRITES.ice;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spriteSheet, sprite.sx, sprite.sy, sprite.sw, sprite.sh, -19, -19, 38, 38);
    } else {
      pxRect(-17, -17, 34, 34, "#bff5fb", "#287da8");
      ctx.fillStyle = "#efffff"; ctx.fillRect(-10, -10, 14, 5);
      ctx.fillStyle = "#73d5e8"; ctx.fillRect(7, 1, 5, 10);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(-10, 8, 6, 4);
    }
    ctx.restore();

    if (sink > 0 && b.fallType === "sea") {
      const waterY = b.y + b.h * (1 - submerge * .78);
      ctx.globalAlpha = .9 - submerge * .35;
      ctx.fillStyle = "#bff8ff"; ctx.fillRect(b.x - 7, waterY, b.w + 14, 3);
      ctx.fillStyle = "#3ab8db"; ctx.fillRect(b.x - 12, waterY + 4, 18, 3);
      ctx.fillRect(b.x + b.w - 4, waterY + 4, 20, 3);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    const vh = viewHeight();
    ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.width / VIEW_W, 0, 0);
    drawSea(vh); drawIsland(vh);
    if (state.flash > 0) { ctx.fillStyle = "rgba(255,117,94,.22)"; ctx.fillRect(0, 0, VIEW_W, vh); }
    if (state.paused && state.phase !== "intro") {
      ctx.fillStyle = "rgba(3,15,35,.67)"; ctx.fillRect(0, 0, VIEW_W, vh);
      ctx.fillStyle = "#fff"; ctx.font = "bold 25px sans-serif"; ctx.textAlign = "center"; ctx.fillText("잠시 쉬는 중", 195, vh / 2);
      ctx.fillStyle = "#9bdff0"; ctx.font = "12px sans-serif"; ctx.fillText("Ⅱ 버튼을 눌러 계속하기", 195, vh / 2 + 28);
    }
  }

  function frame(time) {
    const dt = Math.min(.034, (time - (state.lastTime || time)) / 1000);
    state.lastTime = time; update(dt); draw(); requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) e.preventDefault();
    if (e.code === "ArrowLeft" || e.code === "KeyA") state.keyTilt = -1;
    if (e.code === "ArrowRight" || e.code === "KeyD") state.keyTilt = 1;
    if (e.code === "Space") { state.paused = !state.paused; ui.pause.textContent = state.paused ? "▶" : "Ⅱ"; }
  });
  document.addEventListener("keyup", e => {
    if ((e.code === "ArrowLeft" || e.code === "KeyA") && state.keyTilt < 0) state.keyTilt = 0;
    if ((e.code === "ArrowRight" || e.code === "KeyD") && state.keyTilt > 0) state.keyTilt = 0;
  });
  wrap.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; state.drag = true; state.dragX = e.clientX; wrap.setPointerCapture?.(e.pointerId); });
  wrap.addEventListener("pointermove", e => { if (!state.drag) return; const rect = wrap.getBoundingClientRect(); state.keyTilt = clamp((e.clientX - state.dragX) / (rect.width * .22), -1, 1); });
  wrap.addEventListener("pointerup", () => { state.drag = false; state.keyTilt = 0; });
  wrap.addEventListener("pointercancel", () => { state.drag = false; state.keyTilt = 0; });

  ui.startButton.addEventListener("click", async () => {
    await enableMotion();
    let tutorialSeen = false;
    try { tutorialSeen = localStorage.getItem(TUTORIAL_KEY) === "yes"; } catch (_) {}
    ui.start.style.display = "none";
    if (tutorialSeen) {
      resetGame();
    } else {
      ui.tutorial.hidden = false;
      ui.tutorialStart.focus();
    }
  });
  ui.tutorialStart.addEventListener("click", () => {
    try { localStorage.setItem(TUTORIAL_KEY, "yes"); } catch (_) {}
    ui.tutorial.hidden = true;
    resetGame();
  });
  ui.retry.addEventListener("click", resetGame);
  ui.pause.addEventListener("click", () => {
    if (state.phase === "intro" || state.phase === "gameover" || state.phase === "victory") return;
    state.paused = !state.paused; ui.pause.textContent = state.paused ? "▶" : "Ⅱ";
    showToast(state.paused ? "게임 일시정지" : "다시 출발!", 700);
  });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.phase === "falling") { state.paused = true; ui.pause.textContent = "▶"; } });

  generateCoast(); positionStageObstacles(); randomizeHouse(); resize(); updateHud(); requestAnimationFrame(frame);
})();
