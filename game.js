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
    tiltDot: document.getElementById("tiltDot"), resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"), resultEyebrow: document.getElementById("resultEyebrow"),
    resultIcon: document.getElementById("resultIcon"), finalScore: document.getElementById("finalScore"),
    retryLabel: document.querySelector("#retryButton span"), retryHint: document.querySelector("#retryButton small")
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

  const iglooStageImages = [1, 2, 3].map((stage) => {
    const image = new Image();
    image.decoding = "async";
    image.src = `./assets/previews/igloo-stages/igloo-stage-${stage}.png?v=20260820-body-width-match`;
    return image;
  });
  const iglooStageImagesReady = iglooStageImages.map(() => false);
  iglooStageImages.forEach((image, index) => {
    image.addEventListener("load", () => { iglooStageImagesReady[index] = true; });
  });

  const penguinImage = new Image();
  let penguinImageReady = false;
  penguinImage.decoding = "async";
  penguinImage.src = "./assets/penguin-build.png?v=20260814-new-character";
  penguinImage.addEventListener("load", () => { penguinImageReady = true; });

  const workerHammerSheet = new Image();
  let workerHammerSheetReady = false;
  workerHammerSheet.decoding = "async";
  workerHammerSheet.src = "./assets/worker-hammer-motion-sprite-sheet.png?v=20260814-order-1243";
  workerHammerSheet.addEventListener("load", () => { workerHammerSheetReady = true; });
  const WORKER_HAMMER_FRAME_SIZE = 512;
  const WORKER_HAMMER_FRAME_COUNT = 4;

  const baseIceImage = new Image();
  let baseIceImageReady = false;
  baseIceImage.decoding = "async";
  baseIceImage.src = "./assets/ice-block-base.png?v=20260819-normalized-370x377";
  baseIceImage.addEventListener("load", () => { baseIceImageReady = true; });

  const meltingIceImage = new Image();
  let meltingIceImageReady = false;
  meltingIceImage.decoding = "async";
  meltingIceImage.src = "./assets/ice-block-melting.png?v=20260819-normalized-370x377";
  meltingIceImage.addEventListener("load", () => { meltingIceImageReady = true; });

  const meltingIceStage2Image = new Image();
  let meltingIceStage2ImageReady = false;
  meltingIceStage2Image.decoding = "async";
  meltingIceStage2Image.src = "./assets/ice-block-melting-stage-2.png?v=20260819-stage3-top-down-10px";
  meltingIceStage2Image.addEventListener("load", () => { meltingIceStage2ImageReady = true; });

  const iceBlockShadowImage = new Image();
  let iceBlockShadowImageReady = false;
  iceBlockShadowImage.decoding = "async";
  iceBlockShadowImage.src = "./assets/ice-block-shadow.png?v=20260814-blur6-size44x23";
  iceBlockShadowImage.addEventListener("load", () => { iceBlockShadowImageReady = true; });

  const fireWoodImage = new Image();
  let fireWoodImageReady = false;
  fireWoodImage.decoding = "async";
  fireWoodImage.src = "./assets/fire-wood.png?v=20260814";
  fireWoodImage.addEventListener("load", () => { fireWoodImageReady = true; });

  const fireFlameSheet = new Image();
  let fireFlameSheetReady = false;
  fireFlameSheet.decoding = "async";
  fireFlameSheet.src = "./assets/fire-flame-sprite-sheet.png?v=20260819-smooth-loop";
  fireFlameSheet.addEventListener("load", () => { fireFlameSheetReady = true; });
  const FIRE_FLAME_FRAME_SIZE = 512;
  const FIRE_FLAME_FRAME_COUNT = 5;
  const FIRE_FLAME_FRAME_DURATION = 110;
  const FIRE_GLOW_MAX_ALPHA = .13;
  const PENGUIN_COLLISION_SPEED_SCALE = .7;
  const WET_TRAIL_BLOCK_CLEAR_RADIUS = 12;
  const ENERGY_DRAIN_BASE = .32;
  const ENERGY_DRAIN_STAGE_STEP = .02;
  const STAGE_CLEAR_RECOVERY_BASE = 13;
  const STAGE_CLEAR_RECOVERY_STEP = .3;
  const STAGE_CLEAR_RECOVERY_MIN = 10;
  const DROP_ENERGY_PENALTY_BASE = 3.5;
  const DROP_ENERGY_PENALTY_STEP = .25;
  const DESTROYED_ENERGY_PENALTY_BASE = 5;
  const DESTROYED_ENERGY_PENALTY_STEP = .35;

  const VIEW_W = 390;
  const MAX_STAGES = 10;
  const STAGE_HEIGHT = 1848;
  const TILE_SIZE = 44;
  const GRID_X = 70;
  const CHECKER_MIN_VISIBILITY = .22;
  const CLOUD_OVERLAY_STRENGTH = .20;
  const SEA_CLOUD_SHADOW_STRENGTH = .10;
  const CHECKER_CLOUD_SEED = Math.random() * 997;
  const ISLAND_LEFT = 54;
  const ISLAND_RIGHT = 336;
  const HOUSE_OFFSET_Y = 1726;
  const IGLOO_DESIGN_W = 132;
  const IGLOO_DESIGN_H = 110;
  const IGLOO_W = TILE_SIZE * 2;
  const IGLOO_H = TILE_SIZE * 2;
  const TOP_WORKER_SHIFT_Y = 15;
  const goal = { x: 129, y: HOUSE_OFFSET_Y, w: IGLOO_W, h: IGLOO_H };
  const state = {
    phase: "intro", cameraY: 0, targetCameraY: 0, built: 0, score: 0,
    integrity: 100, tiltX: 0, tiltY: 0, keyTilt: 0, paused: false,
    baseBeta: null, lastTime: 0, roundDelay: 0, hammerDuration: 0, flash: 0, particles: [], wetMarks: [],
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

  // The checker floor is rendered into a transparent WebGL canvas, then
  // composited inside the island's existing Canvas 2D clip. This keeps the
  // game renderer unchanged while allowing the floor to breathe like light
  // is washing over the ice.
  const checkerShader = {
    canvas: document.createElement("canvas"),
    gl: null,
    program: null,
    buffer: null,
    locations: null,
    failed: false
  };

  function compileCheckerShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "unknown shader error";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function initCheckerShader() {
    if (checkerShader.program) return true;
    if (checkerShader.failed) return false;

    try {
      const gl = checkerShader.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true
      });
      if (!gl) throw new Error("WebGL is unavailable");

      const vertexShader = compileCheckerShader(gl, gl.VERTEX_SHADER, `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `);
      const fragmentShader = compileCheckerShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_cameraY;
        uniform float u_time;
        uniform float u_tileSize;
        uniform float u_gridX;
        uniform float u_cloudSeed;
        uniform float u_surfaceMode;

        float cloudHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7)) + u_cloudSeed) * 43758.5453);
        }

        float cloudNoise(vec2 p) {
          vec2 cell = floor(p);
          vec2 local = fract(p);
          local = local * local * (3.0 - 2.0 * local);
          float a = cloudHash(cell);
          float b = cloudHash(cell + vec2(1.0, 0.0));
          float c = cloudHash(cell + vec2(0.0, 1.0));
          float d = cloudHash(cell + vec2(1.0, 1.0));
          return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
        }

        float cloudFbm(vec2 p) {
          float value = 0.0;
          value += cloudNoise(p) * 0.54;
          p = p * 2.03 + vec2(11.7, 4.9);
          value += cloudNoise(p) * 0.27;
          p = p * 2.07 + vec2(3.1, 13.6);
          value += cloudNoise(p) * 0.13;
          p = p * 2.01 + vec2(17.2, 2.4);
          value += cloudNoise(p) * 0.06;
          return value;
        }

        void main() {
          float screenY = u_resolution.y - gl_FragCoord.y;
          float worldY = u_cameraY + screenY;
          float column = floor((gl_FragCoord.x - u_gridX) / u_tileSize);
          float row = floor(worldY / u_tileSize);
          float odd = mod(column + row, 2.0);

          // Several soft noise scales create irregular cloud groups. The seed
          // changes on every launch, while time moves the groups continuously.
          // Sample clouds in world space so their pattern stays attached to
          // the ice floor instead of following the scrolling camera.
          vec2 cloudPosition = vec2(gl_FragCoord.x, worldY) / vec2(155.0, 185.0);
          cloudPosition += vec2(u_time * 0.088, -u_time * 0.026);
          float broadCloud = cloudFbm(cloudPosition + vec2(u_cloudSeed * 0.013));
          float brokenCloud = cloudFbm(cloudPosition * 1.37 + vec2(7.4, -3.8));
          float cloudField = broadCloud * 0.76 + brokenCloud * 0.24;

          // Slowly changing random density makes cloud groups arrive at
          // irregular intervals instead of repeating on an obvious cycle.
          float cloudEvent = cloudNoise(vec2(u_time * 0.085, u_cloudSeed * 0.071));
          float cloudThreshold = mix(0.60, 0.43, cloudEvent);
          float cloudCover = smoothstep(cloudThreshold - 0.13, cloudThreshold + 0.14, cloudField);

          // The sea receives the same world-locked cloud movement, but its
          // mask only adds a soft cloud shadow. The bright Overlay pass is
          // deliberately filtered out for this surface.
          if (u_surfaceMode > 0.5) {
            vec3 seaCloudTint = vec3(0.018, 0.155, 0.255);
            gl_FragColor = vec4(seaCloudTint, cloudCover * ${SEA_CLOUD_SHADOW_STRENGTH.toFixed(2)});
            return;
          }

          float visibility = mix(1.0, ${CHECKER_MIN_VISIBILITY.toFixed(2)}, cloudCover);

          vec3 whiteTile = vec3(1.0);
          vec3 blueTile = vec3(0.800, 0.871, 0.925);
          vec3 color = mix(whiteTile, blueTile, odd);

          // Preserve the existing aurora tint (#6FFFD2, #4CA7FF, #FF75D8)
          // very softly inside the colored squares.
          float auroraPhase = fract((gl_FragCoord.x + worldY) / (u_tileSize * 3.0));
          vec3 mint = vec3(0.435, 1.0, 0.824);
          vec3 sky = vec3(0.298, 0.655, 1.0);
          vec3 pink = vec3(1.0, 0.459, 0.847);
          vec3 aurora = auroraPhase < 0.5
            ? mix(mint, sky, auroraPhase * 2.0)
            : mix(sky, pink, (auroraPhase - 0.5) * 2.0);
          color = mix(color, aurora, odd * 0.055);

          // Overlay-blend white into the areas where the cloud cover opens.
          // The blend amount never exceeds the requested 20%.
          vec3 overlayWhite = vec3(1.0);
          vec3 overlayColor = mix(
            2.0 * color * overlayWhite,
            1.0 - 2.0 * (1.0 - color) * (1.0 - overlayWhite),
            step(vec3(0.5), color)
          );
          float overlayMask = (1.0 - cloudCover) * ${CLOUD_OVERLAY_STRENGTH.toFixed(2)};
          color = mix(color, overlayColor, overlayMask);

          float baseAlpha = mix(0.72, 0.58, odd);
          gl_FragColor = vec4(color, baseAlpha * visibility);
        }
      `);
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "checker shader link failed");
      }

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
      ]), gl.STATIC_DRAW);

      checkerShader.gl = gl;
      checkerShader.program = program;
      checkerShader.buffer = buffer;
      checkerShader.locations = {
        position: gl.getAttribLocation(program, "a_position"),
        resolution: gl.getUniformLocation(program, "u_resolution"),
        cameraY: gl.getUniformLocation(program, "u_cameraY"),
        time: gl.getUniformLocation(program, "u_time"),
        tileSize: gl.getUniformLocation(program, "u_tileSize"),
        gridX: gl.getUniformLocation(program, "u_gridX"),
        cloudSeed: gl.getUniformLocation(program, "u_cloudSeed"),
        surfaceMode: gl.getUniformLocation(program, "u_surfaceMode")
      };
      return true;
    } catch (error) {
      checkerShader.failed = true;
      console.warn("Checker floor shader fallback enabled:", error);
      return false;
    }
  }

  function renderCheckerShader(vh, timeSeconds, surfaceMode = 0) {
    if (!initCheckerShader()) return false;
    const gl = checkerShader.gl;
    const width = VIEW_W;
    const height = Math.max(1, Math.ceil(vh));
    if (checkerShader.canvas.width !== width || checkerShader.canvas.height !== height) {
      checkerShader.canvas.width = width;
      checkerShader.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(checkerShader.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, checkerShader.buffer);
    gl.enableVertexAttribArray(checkerShader.locations.position);
    gl.vertexAttribPointer(checkerShader.locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(checkerShader.locations.resolution, width, height);
    gl.uniform1f(checkerShader.locations.cameraY, state.cameraY);
    gl.uniform1f(checkerShader.locations.time, timeSeconds);
    gl.uniform1f(checkerShader.locations.tileSize, TILE_SIZE);
    gl.uniform1f(checkerShader.locations.gridX, GRID_X);
    gl.uniform1f(checkerShader.locations.cloudSeed, CHECKER_CLOUD_SEED);
    gl.uniform1f(checkerShader.locations.surfaceMode, surfaceMode);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  function fallbackCloudVisibility(x, y, timeSeconds) {
    const seed = CHECKER_CLOUD_SEED;
    const broad = .5 + .5 * Math.sin(x * .014 + y * .006 + timeSeconds * .4 + seed);
    const broken = .5 + .5 * Math.sin(x * .027 - y * .011 + timeSeconds * .25 + seed * 1.7);
    const event = .5 + .5 * Math.sin(timeSeconds * .2 + seed * .31);
    const cloud = clamp((broad * .72 + broken * .28 - (.66 - event * .18)) / .28, 0, 1);
    const softened = cloud * cloud * (3 - 2 * cloud);
    return 1 - softened * (1 - CHECKER_MIN_VISIBILITY);
  }

  function drawCheckerFallback(viewTop, viewBottom, timeSeconds) {
    const firstTileY = Math.floor(viewTop / TILE_SIZE) * TILE_SIZE;
    const firstTileX = GRID_X - TILE_SIZE * 2;
    ctx.save();
    for (let y = firstTileY; y < viewBottom; y += TILE_SIZE) {
      for (let x = firstTileX; x < ISLAND_RIGHT + TILE_SIZE; x += TILE_SIZE) {
        const column = Math.floor((x - GRID_X) / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);
        ctx.globalAlpha = fallbackCloudVisibility(x + TILE_SIZE * .5, y + TILE_SIZE * .5, timeSeconds);
        ctx.fillStyle = (column + row) % 2 === 0 ? "rgba(255,255,255,.72)" : "rgba(204,222,236,.58)";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    for (let y = firstTileY; y < viewBottom; y += TILE_SIZE) {
      for (let x = firstTileX; x < ISLAND_RIGHT + TILE_SIZE; x += TILE_SIZE) {
        const column = Math.floor((x - GRID_X) / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);
        if ((column + row) % 2 !== 0) {
          ctx.globalAlpha = fallbackCloudVisibility(x + TILE_SIZE * .5, y + TILE_SIZE * .5, timeSeconds) * .3;
          const aurora = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
          aurora.addColorStop(0, "rgba(111,255,210,.22)");
          aurora.addColorStop(.52, "rgba(76,167,255,.2)");
          aurora.addColorStop(1, "rgba(255,117,216,.14)");
          ctx.fillStyle = aurora;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Canvas fallback for the island-only 20% Overlay highlight.
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "#ffffff";
    for (let y = firstTileY; y < viewBottom; y += TILE_SIZE) {
      for (let x = firstTileX; x < ISLAND_RIGHT + TILE_SIZE; x += TILE_SIZE) {
        const visibility = fallbackCloudVisibility(x + TILE_SIZE * .5, y + TILE_SIZE * .5, timeSeconds);
        const cloudCover = clamp((1 - visibility) / (1 - CHECKER_MIN_VISIBILITY), 0, 1);
        ctx.globalAlpha = (1 - cloudCover) * CLOUD_OVERLAY_STRENGTH;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
    ctx.restore();
  }

  function drawSeaCloudFallback(vh, timeSeconds) {
    const cellSize = 52;
    ctx.save();
    ctx.fillStyle = "rgb(5, 40, 65)";
    for (let sy = -cellSize; sy < vh + cellSize; sy += cellSize) {
      const worldY = state.cameraY + sy;
      for (let x = -cellSize; x < VIEW_W + cellSize; x += cellSize) {
        const visibility = fallbackCloudVisibility(x + cellSize * .5, worldY + cellSize * .5, timeSeconds);
        const cloudCover = clamp((1 - visibility) / (1 - CHECKER_MIN_VISIBILITY), 0, 1);
        ctx.globalAlpha = cloudCover * SEA_CLOUD_SHADOW_STRENGTH;
        ctx.fillRect(x, sy, cellSize + 1, cellSize + 1);
      }
    }
    ctx.restore();
  }

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

  function drawAnimatedPenguin(o) {
    if (!penguinImageReady) return false;
    const isWalking = o.pause <= 0 && o.step > 0;
    const stride = isWalking ? Math.sin(o.step * Math.PI * 2) : 0;
    const lift = o.walkLift || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.translate(o.x + o.w * .5, o.y + o.h - lift - Math.abs(stride) * .7);
    ctx.scale(o.dir < 0 ? -1 : 1, 1);
    ctx.rotate(stride * .025);
    ctx.drawImage(
      penguinImage,
      44, 23, 159, 197,
      -20, -49, 40, 49
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

  function beginMaking(delay) {
    state.phase = "making";
    state.roundDelay = delay;
    state.hammerDuration = delay;
  }

  function resetGame() {
    state.stage = 0; state.stageBase = 0; state.completedIgloos = 0; state.energy = 100;
    state.pastHouses.length = 0;
    generateCoast();
    positionStageObstacles();
    randomizeHouse();
    state.cameraY = 0; state.targetCameraY = 0; state.built = 0; state.score = 0;
    state.integrity = 100; state.block = null; state.paused = false;
    beginMaking(1.15);
    state.particles.length = 0; state.wetMarks.length = 0; state.baseBeta = null; state.combo = 0; state.celebration = 0;
    ui.result.hidden = true; ui.start.style.display = "none"; ui.pause.textContent = "Ⅱ";
    updateHud();
    showToast("망치질 중… 얼음 조각 준비!", 1000);
  }

  function spawnBlock() {
    state.block = { x: 178, y: state.stageBase + 168 + TOP_WORKER_SHIFT_Y, w: 34, h: 34, vx: 0, vy: 44, hit: 0, meltStage: 0, fireContacts: 0, touchingFire: false, trailX: null, trailY: null, wetTrail: null };
    state.integrity = 100;
    state.phase = "falling";
    burst(195, state.stageBase + 164 + TOP_WORKER_SHIFT_Y, "ice", 12);
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

  function leaveWetMark(block) {
    const x = block.x + block.w * .5;
    const y = block.y + block.h * .78;
    if (block.trailX === null) {
      block.trailX = x;
      block.trailY = y;
      const life = .85 + Math.random() * .2;
      block.wetTrail = {
        width: block.w,
        shine: Math.random() > .45,
        points: [{ x, y, life, maxLife: life }]
      };
      state.wetMarks.push(block.wetTrail);
      return;
    }
    const dx = x - block.trailX;
    const dy = y - block.trailY;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) return;
    block.trailX = x;
    block.trailY = y;
    const life = .85 + Math.random() * .2;
    if (!block.wetTrail || !state.wetMarks.includes(block.wetTrail)) {
      block.wetTrail = { width: block.w, shine: Math.random() > .45, points: [] };
      state.wetMarks.push(block.wetTrail);
    }
    block.wetTrail.points.push({ x, y, life, maxLife: life });
    if (block.wetTrail.points.length > 72) block.wetTrail.points.shift();
    if (state.wetMarks.length > 16) state.wetMarks.splice(0, state.wetMarks.length - 16);
  }

  function hitBlock(amount, pushX, label) {
    const b = state.block;
    if (!b || b.hit > 0) return;
    state.integrity = clamp(state.integrity - amount, 0, 100);
    b.vx = b.vx * PENGUIN_COLLISION_SPEED_SCALE + pushX;
    b.vy *= PENGUIN_COLLISION_SPEED_SCALE;
    b.hit = .45;
    state.flash = .12;
    burst(b.x + b.w / 2, b.y + b.h / 2, "ice", 7);
    showToast(label, 850);
  }

  function loseBlock(reason) {
    if (!state.block) return;
    burst(state.block.x + 17, state.block.y + 17, "ice", 22);
    state.block = null;
    beginMaking(1.5);
    state.cameraY = state.stageBase;
    state.targetCameraY = state.stageBase;
    state.combo = 0;
    state.energy = clamp(state.energy - (DESTROYED_ENERGY_PENALTY_BASE + state.stage * DESTROYED_ENERGY_PENALTY_STEP), 0, 100);
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
    state.combo = 0;
    state.energy = clamp(state.energy - (DROP_ENERGY_PENALTY_BASE + state.stage * DROP_ENERGY_PENALTY_STEP), 0, 100);
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
    state.combo = 0;
    state.energy = clamp(state.energy - (DROP_ENERGY_PENALTY_BASE + state.stage * DROP_ENERGY_PENALTY_STEP), 0, 100);
    showToast("앗! 얼음 조각이 틈새로 빠져요", 1100);
  }

  function finishDrop() {
    state.block = null;
    beginMaking(1.15);
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
      state.energy = clamp(state.energy + Math.max(STAGE_CLEAR_RECOVERY_MIN, STAGE_CLEAR_RECOVERY_BASE - state.stage * STAGE_CLEAR_RECOVERY_STEP), 0, 100);
      state.phase = "celebrating";
      state.celebration = 0;
      state.targetCameraY = clamp(currentHouseY() - viewHeight() * .58, 0, cameraLimit());
      showToast("이글루 완성! 다음 구간으로 내려가요!", 1700);
    } else {
      beginMaking(1.65);
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
    beginMaking(1.35);
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
    ui.retryLabel.textContent = "다시 만들기";
    ui.retryHint.textContent = "새 얼음집 시작";
    ui.result.hidden = false;
  }

  function showVictory() {
    state.phase = "victory";
    state.block = null;
    ui.resultEyebrow.textContent = "ALL STAGES COMPLETE";
    ui.resultTitle.textContent = "축하합니다!";
    ui.resultCopy.textContent = "얼음 마을을 복구했어요!";
    ui.resultIcon.textContent = "⌂";
    ui.finalScore.textContent = String(state.score).padStart(4, "0");
    ui.retryLabel.textContent = "메인화면으로";
    ui.retryHint.textContent = "처음으로 돌아가기";
    ui.result.hidden = false;
  }

  function returnToMainScreen() {
    state.stage = 0; state.stageBase = 0; state.completedIgloos = 0; state.energy = 100;
    state.pastHouses.length = 0;
    generateCoast();
    positionStageObstacles();
    randomizeHouse();
    state.phase = "intro"; state.cameraY = 0; state.targetCameraY = 0; state.built = 0; state.score = 0;
    state.integrity = 100; state.block = null; state.paused = false; state.roundDelay = 0; state.hammerDuration = 0;
    state.particles.length = 0; state.wetMarks.length = 0; state.baseBeta = null; state.combo = 0; state.celebration = 0;
    ui.result.hidden = true;
    ui.start.style.display = "";
    ui.pause.textContent = "Ⅱ";
    ui.toast.classList.remove("is-visible");
    updateHud();
  }

  function update(dt) {
    if (state.paused || state.phase === "intro") return;
    if (state.phase === "gameover" || state.phase === "victory") return;
    const stageDrain = ENERGY_DRAIN_BASE + state.stage * ENERGY_DRAIN_STAGE_STEP;
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
    for (const trail of state.wetMarks) {
      for (const point of trail.points) point.life -= dt;
      trail.points = trail.points.filter(point => point.life > 0);
    }
    state.wetMarks = state.wetMarks.filter(trail => trail.points.length > 0);

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
      const left = leftCoast(b.y + b.h * .5);
      const right = rightCoast(b.y + b.h * .5);
      const blockCenterX = b.x + b.w * .5;
      if (blockCenterX < left || blockCenterX > right) {
        dropIntoSea();
        updateHud();
        return;
      }
      leaveWetMark(b);

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
      let touchingFire = false;
      for (const o of obstacles) {
        if (!obstacleActive(o) || o.type !== "fire") continue;
        const hot = { x: o.x - 18, y: o.y - 18, w: o.w + 36, h: o.h + 36 };
        if (rects(b, hot)) {
          touchingFire = true;
          state.integrity = clamp(state.integrity - dt * (21.5 + state.stage * 1.5), 0, 100);
          if (Math.random() < dt * 8) burst(b.x + 17, b.y + 17, "fire", 1);
        }
      }
      if (touchingFire && !b.touchingFire) {
        b.fireContacts += 1;
        b.meltStage = Math.min(2, b.fireContacts);
      }
      b.touchingFire = touchingFire;
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

  const CLIFF_EDGE_STEP = 30;

  function cliffEdgeX(side, y, inset = 0) {
    const segment = Math.round(y / CLIFF_EDGE_STEP);
    const sampleY = segment * CLIFF_EDGE_STEP;
    const baseX = side === "left" ? leftCoast(sampleY) + inset : rightCoast(sampleY) - inset;
    // A small deterministic offset makes each segment read as cut ice, without
    // moving the actual coast/collision boundary used by gameplay.
    const cut = (hash(segment * 173 + (side === "left" ? 41 : 89)) - .5) * 8;
    return baseX + cut;
  }

  function coastEdgePoints(side, viewTop, viewBottom, inset = 0) {
    const points = [{ x: cliffEdgeX(side, viewTop, inset), y: viewTop }];
    const firstSegment = Math.floor(viewTop / CLIFF_EDGE_STEP) + 1;
    for (let segment = firstSegment; segment * CLIFF_EDGE_STEP < viewBottom; segment++) {
      const y = segment * CLIFF_EDGE_STEP;
      points.push({ x: cliffEdgeX(side, y, inset), y });
    }
    points.push({ x: cliffEdgeX(side, viewBottom, inset), y: viewBottom });
    return points;
  }

  function traceIslandPath(viewTop, viewBottom, inset = 0) {
    const leftPoints = coastEdgePoints("left", viewTop, viewBottom, inset);
    const rightPoints = coastEdgePoints("right", viewTop, viewBottom, inset);
    ctx.beginPath();
    ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
    for (let i = 1; i < leftPoints.length; i++) ctx.lineTo(leftPoints[i].x, leftPoints[i].y);
    for (let i = rightPoints.length - 1; i >= 0; i--) ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
    ctx.closePath();
  }

  function traceCoast(side, viewTop, viewBottom, inset = 0) {
    const points = coastEdgePoints(side, viewTop, viewBottom, inset);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  }

  function drawSea(vh, timeSeconds) {
    const seaGradient = ctx.createLinearGradient(0, 0, VIEW_W, vh);
    seaGradient.addColorStop(0, "#08a9c7");
    seaGradient.addColorStop(.48, "#0795bd");
    seaGradient.addColorStop(1, "#087eae");
    ctx.fillStyle = seaGradient;
    ctx.fillRect(0, 0, VIEW_W, vh);

    const viewTop = state.cameraY;
    const time = timeSeconds;
    ctx.save();
    // Broad, low-detail blue currents match the flat mobile-game reference.
    const currentSpacing = 150;
    const currentTravel = time * 8;
    const firstCurrentRow = Math.floor((viewTop - currentTravel) / currentSpacing);
    for (let row = firstCurrentRow; ; row++) {
      const y = row * currentSpacing + currentTravel;
      if (y >= viewTop + vh + 170) break;
      const sy = y - viewTop;
      const drift = Math.sin(time * .5 + y * .004) * 18;
      ctx.fillStyle = "rgba(0, 86, 177, .16)";
      ctx.beginPath();
      ctx.moveTo(-30, sy + 24);
      ctx.bezierCurveTo(65 + drift, sy - 7, 132 + drift, sy + 38, 214, sy + 13);
      ctx.bezierCurveTo(285 - drift, sy - 10, 345 - drift, sy + 31, VIEW_W + 30, sy + 3);
      ctx.lineTo(VIEW_W + 30, sy + 51);
      ctx.bezierCurveTo(302, sy + 76, 226, sy + 38, 146, sy + 66);
      ctx.bezierCurveTo(76, sy + 89, 18, sy + 52, -30, sy + 73);
      ctx.closePath();
      ctx.fill();
    }

    // Deterministic per-row variation keeps the moving oval shadows irregular
    // without changing their shape on every frame.
    const rippleSpacing = 116;
    const rippleTravel = time * 5;
    const firstRippleRow = Math.floor((viewTop - rippleTravel - 56) / rippleSpacing);
    for (let row = firstRippleRow; ; row++) {
      const y = row * rippleSpacing + rippleTravel;
      if (y >= viewTop + vh + rippleSpacing + 56) break;
      const sy = y - viewTop;
      const sway = Math.sin(time * .85 + row * 1.7) * 11;
      const bob = Math.sin(time * 1.15 + row * .9) * 2.5;
      const pulse = 1 + Math.sin(time * 1.35 + row * 1.2) * .08;
      const leftX = 13 + hash(row * 137 + 11) * 22;
      const rightX = 13 + hash(row * 149 + 29) * 22;
      const leftY = (hash(row * 173 + 47) - .5) * 54;
      const rightY = (hash(row * 181 + 83) - .5) * 54;
      const leftRadiusX = 4.5 + hash(row * 191 + 101) * 7.5;
      const rightRadiusX = 4.5 + hash(row * 199 + 131) * 7.5;
      const leftRadiusY = 1.35 + hash(row * 211 + 151) * 1.9;
      const rightRadiusY = 1.35 + hash(row * 223 + 167) * 1.9;
      const leftAlpha = .24 + hash(row * 227 + 181) * .14;
      const rightAlpha = .24 + hash(row * 233 + 197) * .14;

      ctx.fillStyle = `rgba(0, 76, 164, ${leftAlpha})`;
      ctx.beginPath();
      ctx.ellipse(leftX + sway, sy + leftY + bob, leftRadiusX * pulse, leftRadiusY * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(0, 76, 164, ${rightAlpha})`;
      ctx.beginPath();
      ctx.ellipse(VIEW_W - rightX - sway, sy + rightY - bob, rightRadiusX * pulse, rightRadiusY * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Reuse the floor's world-locked cloud field over the sea. Surface mode 1
    // filters out the bright Overlay branch and keeps only the cloud shadow.
    if (renderCheckerShader(vh, timeSeconds, 1)) {
      ctx.drawImage(checkerShader.canvas, 0, 0, VIEW_W, vh);
    } else {
      drawSeaCloudFallback(vh, timeSeconds);
    }
  }

  function drawIsland(vh, timeSeconds) {
    const viewTop = Math.max(0, Math.floor((state.cameraY - 70) / 14) * 14);
    const viewBottom = state.cameraY + vh + 70;
    ctx.save();
    ctx.translate(0, -state.cameraY);
    ctx.lineCap = "butt";
    ctx.lineJoin = "bevel";

    // Flat blue cliff layers and a bright white top rim follow the references.
    traceIslandPath(viewTop, viewBottom);
    // Keep the narrow area between the checker floor and the outer cliff white,
    // so no teal seam shows beside the white top rim.
    ctx.fillStyle = "#f8ffff";
    ctx.fill();
    ctx.strokeStyle = "#0067a5";
    ctx.lineWidth = 26;
    ctx.stroke();
    ctx.strokeStyle = "#08a7bf";
    ctx.lineWidth = 17;
    ctx.stroke();
    ctx.strokeStyle = "#f8ffff";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#f8ffff";
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.save();
    traceIslandPath(viewTop, viewBottom, 5);
    ctx.clip();
    const iceGradient = ctx.createLinearGradient(ISLAND_LEFT, 0, ISLAND_RIGHT, 0);
    iceGradient.addColorStop(0, "#f5fcfc");
    iceGradient.addColorStop(.5, "#eaf5f8");
    iceGradient.addColorStop(1, "#dcecf3");
    ctx.fillStyle = iceGradient;
    ctx.fillRect(0, viewTop, VIEW_W, viewBottom - viewTop);

    // Composite the animated WebGL floor in world space so the checker grid
    // remains locked to obstacles while the camera scrolls.
    if (renderCheckerShader(vh, timeSeconds, 0)) {
      ctx.drawImage(checkerShader.canvas, 0, state.cameraY, VIEW_W, vh);
    } else {
      drawCheckerFallback(viewTop, viewBottom, timeSeconds);
    }

    // Soft white frost is concentrated near the coast like the references.
    for (let y = Math.floor(viewTop / 132) * 132; y < viewBottom + 132; y += 132) {
      for (const side of ["left", "right"]) {
        const edgeX = cliffEdgeX(side, y, 10);
        const centerX = edgeX + (side === "left" ? 17 : -17);
        const frost = ctx.createRadialGradient(centerX, y, 2, centerX, y, 31);
        frost.addColorStop(0, "rgba(255,255,255,.2)");
        frost.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = frost;
        ctx.fillRect(centerX - 31, y - 31, 62, 62);
      }
    }
    drawWetMarks(viewTop, viewBottom);
    ctx.restore();

    // Cover only the inner teal seam beside the checker floor. The outer
    // cyan cliff layer remains visible, matching the user's edited reference.
    ctx.strokeStyle = "#f8ffff";
    ctx.lineWidth = 4;
    ctx.lineCap = "butt";
    ctx.lineJoin = "bevel";
    traceCoast("left", viewTop, viewBottom, 4); ctx.stroke();
    traceCoast("right", viewTop, viewBottom, 4); ctx.stroke();
    drawTopWorker();
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

  function drawWetMarks(viewTop, viewBottom) {
    const strokeSmoothPath = (points, yOffset = 0) => {
      if (points.length < 2) return false;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y + yOffset);
      if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y + yOffset);
      } else {
        for (let i = 1; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          ctx.quadraticCurveTo(
            current.x,
            current.y + yOffset,
            (current.x + next.x) * .5,
            (current.y + next.y) * .5 + yOffset
          );
        }
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y + yOffset);
      }
      ctx.stroke();
      return true;
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const trail of state.wetMarks) {
      let points = trail.points;
      if (state.phase === "falling" && state.block?.wetTrail === trail) {
        const blockCenterX = state.block.x + state.block.w * .5;
        const blockTrailY = state.block.y + state.block.h * .78;
        const clearRadius = WET_TRAIL_BLOCK_CLEAR_RADIUS;
        let visibleEnd = points.length;
        while (
          visibleEnd > 1
          && Math.hypot(points[visibleEnd - 1].x - blockCenterX, points[visibleEnd - 1].y - blockTrailY) < clearRadius
        ) visibleEnd--;
        points = points.slice(0, visibleEnd);
      }
      if (points.length < 2 || !points.some(point => point.y > viewTop - 30 && point.y < viewBottom + 30)) continue;
      const first = points[0];
      const last = points[points.length - 1];
      const firstFade = clamp(first.life / first.maxLife, 0, 1);
      const lastFade = clamp(last.life / last.maxLife, 0, 1);
      const averageFade = (firstFade + lastFade) * .5;

      const wetGradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      wetGradient.addColorStop(0, `rgba(39,143,181,${firstFade * .2})`);
      wetGradient.addColorStop(.45, `rgba(39,143,181,${averageFade * .2})`);
      wetGradient.addColorStop(1, `rgba(39,143,181,${lastFade * .2})`);
      ctx.strokeStyle = wetGradient;
      ctx.lineWidth = trail.width * (1 + (1 - averageFade) * .12);
      strokeSmoothPath(points);

      const highlightGradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      highlightGradient.addColorStop(0, `rgba(217,251,255,${firstFade * .2})`);
      highlightGradient.addColorStop(.45, `rgba(217,251,255,${averageFade * .2})`);
      highlightGradient.addColorStop(1, `rgba(217,251,255,${lastFade * .2})`);
      ctx.strokeStyle = highlightGradient;
      ctx.lineWidth = Math.max(1, trail.width * .42);
      strokeSmoothPath(points, -.7);

      if (trail.shine && points.length >= 4) {
        const shinePoints = points.slice(Math.floor(points.length * .55));
        const shineFirst = shinePoints[0];
        const shineGradient = ctx.createLinearGradient(shineFirst.x, shineFirst.y, last.x, last.y);
        shineGradient.addColorStop(0, "rgba(242,255,255,0)");
        shineGradient.addColorStop(1, `rgba(242,255,255,${lastFade * .2})`);
        ctx.strokeStyle = shineGradient;
        ctx.lineWidth = 1;
        strokeSmoothPath(shinePoints, -1.2);
      }
    }
    ctx.restore();
  }

  function drawTopWorker() {
    const base = state.stageBase;
    if (state.phase === "celebrating" || state.phase === "gameover" || state.phase === "victory") return;
    const workerY = base + 82 + TOP_WORKER_SHIFT_Y;
    drawWorker(178, workerY);

    const bubbleX = 38;
    const bubbleY = workerY + 12;
    const bubbleW = 94;
    const bubbleH = 28;
    ctx.save();
    ctx.fillStyle = "#ffd65c";
    ctx.strokeStyle = "#8c5428";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleW - 3, bubbleY + 8);
    ctx.lineTo(bubbleX + bubbleW + 14, bubbleY + 15);
    ctx.lineTo(bubbleX + bubbleW - 3, bubbleY + 21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bubbleX + 7, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - 7, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + 7);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - 7);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - 7, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + 7, bubbleY + bubbleH);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - 7);
    ctx.lineTo(bubbleX, bubbleY + 7);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + 7, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, .38)";
    ctx.fillRect(bubbleX + 8, bubbleY + 4, bubbleW - 16, 2);
    ctx.fillStyle = "#183b59";
    ctx.font = "900 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.phase === "making" ? "쾅!  쾅!" : "조심히 보내!", bubbleX + bubbleW * .5, bubbleY + bubbleH * .55);
    ctx.restore();
  }

  function drawWorker(x, y) {
    const hammering = state.phase === "making";
    if (hammering && workerHammerSheetReady) {
      const motionDuration = Math.min(state.hammerDuration || .72, .72);
      const motionProgress = clamp(1 - state.roundDelay / motionDuration, 0, .999);
      const frameIndex = Math.min(
        WORKER_HAMMER_FRAME_COUNT - 1,
        Math.floor(motionProgress * WORKER_HAMMER_FRAME_COUNT)
      );
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        workerHammerSheet,
        frameIndex * WORKER_HAMMER_FRAME_SIZE, 0,
        WORKER_HAMMER_FRAME_SIZE, WORKER_HAMMER_FRAME_SIZE,
        x - 49, y - 48, 132, 132
      );
      ctx.restore();
      return;
    }
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
      if (drawAnimatedPenguin(o)) return;
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
      const glowAlpha = fireGlowAlpha(o, performance.now());
      ctx.fillStyle = `rgba(255,118,74,${glowAlpha})`; ctx.beginPath(); ctx.arc(o.x + 27, o.y + 17, 48, 0, Math.PI * 2); ctx.fill();
      if (fireWoodImageReady && fireFlameSheetReady) {
        const frameIndex = Math.floor(performance.now() / FIRE_FLAME_FRAME_DURATION) % FIRE_FLAME_FRAME_COUNT;
        const baselineY = o.y + 44;
        const flameBaselineY = o.y + 30;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(fireWoodImage, o.x + 2, baselineY - 30, 50, 30);
        ctx.drawImage(
          fireFlameSheet,
          frameIndex * FIRE_FLAME_FRAME_SIZE, 0,
          FIRE_FLAME_FRAME_SIZE, FIRE_FLAME_FRAME_SIZE,
          o.x + 3, flameBaselineY - 50, 48, 50
        );
        ctx.restore();
        return;
      }
      const flicker = Math.sin(performance.now() * .012) * 2;
      if (drawSprite("fire", o.x + 6, o.y - 10 - flicker, 42, 54 + flicker)) return;
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

  function fireGlowAlpha(obstacle, now) {
    let pulse = obstacle.glowPulse;
    if (!pulse) {
      pulse = obstacle.glowPulse = createFireGlowCycle(now);
    }

    const elapsed = now - pulse.start;
    if (elapsed < 0) return FIRE_GLOW_MAX_ALPHA;

    const fadeOutEnd = pulse.fadeOut;
    const lowHoldEnd = fadeOutEnd + pulse.lowHold;
    const fadeInEnd = lowHoldEnd + pulse.fadeIn;
    if (elapsed >= fadeInEnd) {
      obstacle.glowPulse = createFireGlowCycle(now);
      return FIRE_GLOW_MAX_ALPHA;
    }

    const minimumAlpha = FIRE_GLOW_MAX_ALPHA * pulse.minimumFactor;
    if (elapsed < fadeOutEnd) {
      const progress = smoothstep(elapsed / pulse.fadeOut);
      return FIRE_GLOW_MAX_ALPHA + (minimumAlpha - FIRE_GLOW_MAX_ALPHA) * progress;
    }
    if (elapsed < lowHoldEnd) return minimumAlpha;

    const progress = smoothstep((elapsed - lowHoldEnd) / pulse.fadeIn);
    return minimumAlpha + (FIRE_GLOW_MAX_ALPHA - minimumAlpha) * progress;
  }

  function createFireGlowCycle(now) {
    return {
      start: now + 500 + Math.random() * 2200,
      fadeOut: 260 + Math.random() * 420,
      lowHold: 90 + Math.random() * 360,
      fadeIn: 340 + Math.random() * 520,
      minimumFactor: .25 + Math.random() * .3
    };
  }

  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function drawHouse(houseX = state.houseX, houseY = currentHouseY(), built = state.built, active = true) {
    const stageIndex = Math.max(0, Math.min(2, built));
    const stageImageReady = built < 3 && iglooStageImagesReady[stageIndex];
    if (stageImageReady) {
      ctx.drawImage(iglooStageImages[stageIndex], houseX, houseY + 4, IGLOO_W, IGLOO_H - 4);
    }
    const completeSpriteDrawn = !stageImageReady && drawSprite("igloo", houseX, houseY + 4, IGLOO_W, IGLOO_H - 4);
    if (stageImageReady || completeSpriteDrawn) {
      const missingPatches = [
        { x: houseX + 20, y: houseY + 25 },
        { x: houseX + 37, y: houseY + 12 },
        { x: houseX + 55, y: houseY + 24 }
      ];
      if (!stageImageReady) {
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
    // Both ice sprites share the block's center-bottom as their anchor.
    ctx.translate(b.x + b.w / 2, b.y + b.h);
    const s = (.82 + state.integrity / 100 * .18) * (1 - submerge * .3); ctx.scale(s, s);
    if (iceBlockShadowImageReady && state.phase === "falling") {
      ctx.save();
      ctx.globalAlpha *= .82;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(iceBlockShadowImage, -22, -20, 44, 23);
      ctx.restore();
    }
    const visualStage = b.meltStage || 0;
    if (visualStage >= 2 && meltingIceStage2ImageReady) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(meltingIceStage2Image, -19, -38, 38, 38);
    } else if (visualStage >= 1 && meltingIceImageReady) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(meltingIceImage, -19, -38, 38, 38);
    } else if (baseIceImageReady) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(baseIceImage, -19, -38, 38, 38);
    } else if (spriteSheetReady) {
      const sprite = SPRITES.ice;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spriteSheet, sprite.sx, sprite.sy, sprite.sw, sprite.sh, -19, -38, 38, 38);
    } else {
      pxRect(-17, -34, 34, 34, "#bff5fb", "#287da8");
      ctx.fillStyle = "#efffff"; ctx.fillRect(-10, -27, 14, 5);
      ctx.fillStyle = "#73d5e8"; ctx.fillRect(7, -16, 5, 10);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(-10, -9, 6, 4);
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

  function draw(timeSeconds) {
    const vh = viewHeight();
    ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.width / VIEW_W, 0, 0);
    drawSea(vh, timeSeconds); drawIsland(vh, timeSeconds);
    if (state.flash > 0) { ctx.fillStyle = "rgba(255,117,94,.22)"; ctx.fillRect(0, 0, VIEW_W, vh); }
    if (state.paused && state.phase !== "intro") {
      ctx.fillStyle = "rgba(3,15,35,.67)"; ctx.fillRect(0, 0, VIEW_W, vh);
      ctx.fillStyle = "#fff"; ctx.font = "bold 25px sans-serif"; ctx.textAlign = "center"; ctx.fillText("잠시 쉬는 중", 195, vh / 2);
      ctx.fillStyle = "#9bdff0"; ctx.font = "12px sans-serif"; ctx.fillText("Ⅱ 버튼을 눌러 계속하기", 195, vh / 2 + 28);
    }
  }

  function frame(time) {
    const dt = Math.min(.034, (time - (state.lastTime || time)) / 1000);
    state.lastTime = time; update(dt); draw(time * .001); requestAnimationFrame(frame);
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
  ui.retry.addEventListener("click", () => {
    if (state.phase === "victory") returnToMainScreen();
    else resetGame();
  });
  ui.pause.addEventListener("click", () => {
    if (state.phase === "intro" || state.phase === "gameover" || state.phase === "victory") return;
    state.paused = !state.paused; ui.pause.textContent = state.paused ? "▶" : "Ⅱ";
    showToast(state.paused ? "게임 일시정지" : "다시 출발!", 700);
  });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.phase === "falling") { state.paused = true; ui.pause.textContent = "▶"; } });

  generateCoast(); positionStageObstacles(); randomizeHouse(); resize(); updateHud(); requestAnimationFrame(frame);
})();
