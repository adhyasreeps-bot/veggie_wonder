/**
 * Fruit Duel - Core 60FPS Split-Screen Game Engine
 * Manages dual player zones, independent fruit spawning, multi-touch slicing,
 * combo streaks, poison detection, and victory conditions.
 */

import { FRUIT_TYPES, FRUIT_CONFIGS, drawFruit, drawFruitHalf } from './fruits.js';
import { ParticleSystem } from './particles.js';
import { sound } from './audio.js';
import { VeggieWonderTopHardware } from './verilog_hardware_core.js';

export class FruitDuelGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = Object.assign(
      {
        duration: 60, // seconds
        gameMode: 'classic', // 'classic', 'speed', 'suddendeath', 'bestof3'
        faceToFace: true, // rotate P1 180 deg for opposite seating
        poisonRate: 'normal', // 'low', 'normal', 'chaos'
        roundPoisonType: null, // designated poison fruit for round
        onScoreUpdate: () => {},
        onTimeUpdate: () => {},
        onGameOver: () => {},
        onPoisonWarning: () => {}
      },
      options
    );

    this.particles = new ParticleSystem();
    this.hw = new VeggieWonderTopHardware();

    // Round poison fruit
    this.roundPoisonType = this.options.roundPoisonType || FRUIT_TYPES.POISON;
    this.activeWaves = new Map();
    this.waveCounter = 0;
    this.lastWaveSpawn = 0;

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = this.options.duration;
    this.lastTime = 0;
    this.gameTimer = null;
    this.difficultyFactor = 1.0;

    // Player 1 state (Top half)
    this.p1 = {
      id: 1,
      name: 'Player 1',
      score: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      totalSlices: 0,
      fruits: [],
      halves: [],
      activeTouches: new Map(), // pointerId -> [{x,y,life}]
      color: '#ff2a55',
      glowColor: '#ff7597'
    };

    // Player 2 state (Bottom half)
    this.p2 = {
      id: 2,
      name: 'Player 2',
      score: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      totalSlices: 0,
      fruits: [],
      halves: [],
      activeTouches: new Map(), // pointerId -> [{x,y,life}]
      lastSpawn: 0,
      color: '#ff9100',
      glowColor: '#00e5ff'
    };

    this.screenShake = 0;
    this.toxicFlash = 0;
    this.dividerHeight = 36;

    this.setupEvents();
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.scale(dpr, dpr);

    // Compute player zone dimensions
    this.p1Zone = {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height / 2 - this.dividerHeight / 2
    };

    this.dividerZone = {
      x: 0,
      y: this.p1Zone.height,
      width: this.width,
      height: this.dividerHeight
    };

    this.p2Zone = {
      x: 0,
      y: this.dividerZone.y + this.dividerHeight,
      width: this.width,
      height: this.height - (this.dividerZone.y + this.dividerHeight)
    };
  }

  setupEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    // Touch & Pointer Listeners
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isRunning || this.isPaused) return;
      this.canvas.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      this.handlePointerStart(e.pointerId, pos.x, pos.y);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isRunning || this.isPaused) return;
      const pos = getPos(e);
      this.handlePointerMove(e.pointerId, pos.x, pos.y);
    });

    const endPointer = (e) => {
      this.handlePointerEnd(e.pointerId);
    };

    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);

    // Context menu disable for smooth mobile gaming
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  handlePointerStart(pointerId, x, y) {
    sound.init();
    // Determine player zone
    const isP1 = y <= this.p1Zone.height;
    const isP2 = y >= this.p2Zone.y;
    const player = isP1 ? this.p1 : isP2 ? this.p2 : null;

    if (!player) return;

    player.activeTouches.set(pointerId, [{ x, y, life: 1 }]);
    this.checkSlicePoint(player, x, y);
  }

  handlePointerMove(pointerId, x, y) {
    // Check both players for active pointer
    [this.p1, this.p2].forEach((player) => {
      if (player.activeTouches.has(pointerId)) {
        const trail = player.activeTouches.get(pointerId);
        const lastP = trail[trail.length - 1];

        // Only record if moved at least 4 pixels
        const dist = Math.hypot(x - lastP.x, y - lastP.y);
        if (dist > 4) {
          trail.push({ x, y, life: 1 });
          if (trail.length > 8) trail.shift();

          // Check line segment slice
          this.checkSliceSegment(player, lastP, { x, y });
        }
      }
    });
  }

  handlePointerEnd(pointerId) {
    this.p1.activeTouches.delete(pointerId);
    this.p2.activeTouches.delete(pointerId);
  }

  checkSlicePoint(player, px, py) {
    for (let i = player.fruits.length - 1; i >= 0; i--) {
      const fruit = player.fruits[i];
      const dist = Math.hypot(px - fruit.x, py - fruit.y);
      if (dist <= fruit.radius * 1.35) {
        this.sliceFruit(player, fruit, i, 0); // vertical slice angle
        break;
      }
    }
  }

  checkSliceSegment(player, p1, p2) {
    for (let i = player.fruits.length - 1; i >= 0; i--) {
      const fruit = player.fruits[i];
      if (this.lineIntersectsCircle(p1, p2, fruit, fruit.radius * 1.35)) {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        this.sliceFruit(player, fruit, i, angle);
        break;
      }
    }
  }

  lineIntersectsCircle(p1, p2, c, r) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p1.x - c.x, p1.y - c.y) <= r;

    const u = ((c.x - p1.x) * dx + (c.y - p1.y) * dy) / (len * len);
    const clampedU = Math.max(0, Math.min(1, u));
    const nearestX = p1.x + clampedU * dx;
    const nearestY = p1.y + clampedU * dy;

    return Math.hypot(c.x - nearestX, c.y - nearestY) <= r;
  }

  sliceFruit(player, fruit, index, cutAngle = 0) {
    // Remove fruit
    player.fruits.splice(index, 1);
    player.totalSlices++;

    // Clock slice event into the Verilog Hardware Core (Gate-Level RTL)
    const reactionTime = Math.max(0.04, (performance.now() - fruit.spawnTime) / 1000);
    const hwResult = this.hw.clockSlice(player.id, reactionTime);

    // 1. Hardware Gate-Level Poison Trip Knockout
    if (hwResult.isPoison) {
      this.handlePoisonHit(player, fruit);
      return;
    }

    const cfg = FRUIT_CONFIGS[fruit.type];

    // Normal fruit sliced!
    sound.playSlice();
    sound.playSplat();

    const isFaster = hwResult.isFaster;
    const reactionTimeFormatted = hwResult.reactionTimeFormatted;

    // Read updated combo from hardware combo register
    player.combo = hwResult.combo;
    player.comboTimer = 1.6; // seconds before combo resets
    if (player.combo > player.maxCombo) {
      player.maxCombo = player.combo;
    }

    if (player.combo > 1) {
      sound.playCombo(player.combo);
    }

    // Read score and points calculated by hardware ALU
    const pointsEarned = hwResult.pointsEarned;
    player.score = hwResult.score;

    // Haptics if supported
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    // Spawn 2 split halves flying apart perpendicular to cutAngle
    const perpAngle = cutAngle + Math.PI / 2;
    const splitSpeed = 4.5 + Math.random() * 2;

    // Half 1
    player.halves.push({
      ...fruit,
      x: fruit.x - Math.cos(perpAngle) * 8,
      y: fruit.y - Math.sin(perpAngle) * 8,
      vx: fruit.vx - Math.cos(perpAngle) * splitSpeed,
      vy: fruit.vy - Math.sin(perpAngle) * splitSpeed - 1.5,
      rotation: fruit.rotation,
      vRot: -0.15 - Math.random() * 0.1,
      isLeftHalf: true
    });

    // Half 2
    player.halves.push({
      ...fruit,
      x: fruit.x + Math.cos(perpAngle) * 8,
      y: fruit.y + Math.sin(perpAngle) * 8,
      vx: fruit.vx + Math.cos(perpAngle) * splitSpeed,
      vy: fruit.vy + Math.sin(perpAngle) * splitSpeed - 1.5,
      rotation: fruit.rotation,
      vRot: 0.15 + Math.random() * 0.1,
      isLeftHalf: false
    });

    // Particles & Splats
    this.particles.createJuiceExplosion(fruit.x, fruit.y, cfg.juiceColors, 18, false);

    // Floating reflex score popup
    let text = `+${pointsEarned}`;
    let textColor = '#ffffff';
    if (isFaster) {
      text = `⚡ ${reactionTimeFormatted}s FASTER! +${pointsEarned}`;
      textColor = '#ffeb3b';
    } else {
      text = `${reactionTimeFormatted}s SLOWER +${pointsEarned}`;
      textColor = '#cfd8dc';
    }
    this.particles.addFloatingText(fruit.x, fruit.y - 10, text, textColor, isFaster ? 25 : 21, '#1b1b1b');

    // Notify UI with live hardware telemetry
    this.options.onScoreUpdate({
      p1Score: this.p1.score,
      p2Score: this.p2.score,
      p1Combo: this.p1.combo,
      p2Combo: this.p2.combo,
      hwTelemetry: this.hw.getHardwareTelemetry()
    });

    // Sudden death hardware check
    if (hwResult.gameOver) {
      this.endGame(hwResult.reason);
    }
  }

  handlePoisonHit(loserPlayer, fruit) {
    this.screenShake = 25;
    this.toxicFlash = 1.0;
    sound.playPoisonExplosion();

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200, 50, 300]);
    }

    // Big toxic burst
    const cfg = FRUIT_CONFIGS[fruit.type];
    this.particles.createJuiceExplosion(fruit.x, fruit.y, cfg.juiceColors, 40, true);
    this.particles.addFloatingText(fruit.x, fruit.y - 15, '☠️ TOXIC HIT!', '#e040fb', 34, '#1a0033');

    // Winner evaluated by Verilog Hardware FSM
    const winnerId = this.hw.fsm.winnerId || (loserPlayer.id === 1 ? 2 : 1);
    const winnerName = winnerId === 1 ? this.p1.name : this.p2.name;
    const loser = loserPlayer;

    // Immediate loss!
    this.isRunning = false;
    setTimeout(() => {
      this.options.onGameOver({
        winner: winnerName,
        winnerId: winnerId,
        loser: loser.name,
        loserId: loser.id,
        reason: 'poison',
        p1Score: this.p1.score,
        p2Score: this.p2.score,
        p1Slices: this.p1.totalSlices,
        p2Slices: this.p2.totalSlices,
        hwTelemetry: this.hw.getHardwareTelemetry()
      });
    }, 900);
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.isPaused = false;
    this.timeRemaining = this.options.duration;
    this.lastTime = performance.now();

    // Reset player scores
    [this.p1, this.p2].forEach((p) => {
      p.score = 0;
      p.combo = 0;
      p.maxCombo = 0;
      p.comboTimer = 0;
      p.totalSlices = 0;
      p.fruits = [];
      p.halves = [];
      p.activeTouches.clear();
    });

    this.roundPoisonType = this.options.roundPoisonType || FRUIT_TYPES.POISON;

    // Configure and reset Verilog Hardware Core
    this.hw.configureMatch({
      mode: this.options.gameMode,
      duration: this.options.duration,
      poisonType: this.roundPoisonType
    });
    this.hw.cmdPoisonReady();
    this.hw.cmdCountdownDone();

    this.activeWaves = new Map();
    this.waveCounter = 0;
    this.lastWaveSpawn = performance.now() - 500; // immediate launch

    this.particles.clear();
    this.difficultyFactor = 1.0;

    // Start 1-second hardware timer clock ticker
    if (this.gameTimer) clearInterval(this.gameTimer);
    this.gameTimer = setInterval(() => {
      if (!this.isRunning || this.isPaused) return;

      // Clock 1-second tick into Verilog Hardware Core
      const tick = this.hw.clockSecondTick();
      this.timeRemaining = tick.timeRemaining;
      this.difficultyFactor += 0.015; // difficulty increases steadily

      this.options.onTimeUpdate(this.timeRemaining, this.hw.getHardwareTelemetry());

      if (tick.gameOver) {
        this.endGame(tick.reason === 2 ? 'score_cap' : 'timeout');
      }
    }, 1000);

    requestAnimationFrame(this.loop.bind(this));
  }

  pause() {
    this.isPaused = true;
    this.hw.cmdPauseToggle();
  }

  resume() {
    this.isPaused = false;
    this.hw.cmdPauseToggle();
    this.lastTime = performance.now();
  }

  endGame(reason = 'timeout') {
    this.isRunning = false;
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    sound.playVictory();

    // Winner determined directly from Verilog Hardware Core FSM
    let winnerId = this.hw.fsm.winnerId;
    if (winnerId === 0) {
      if (this.p1.score > this.p2.score) winnerId = 1;
      else if (this.p2.score > this.p1.score) winnerId = 2;
    }

    let winner = null;
    let loser = null;
    let loserId = 0;

    if (winnerId === 1) {
      winner = this.p1.name;
      winnerId = 1;
      loser = this.p2.name;
      loserId = 2;
    } else if (winnerId === 2) {
      winner = this.p2.name;
      winnerId = 2;
      loser = this.p1.name;
      loserId = 1;
    } else {
      winner = 'Tie Game!';
      winnerId = 0;
    }

    this.options.onGameOver({
      winner,
      winnerId,
      loser,
      loserId,
      reason,
      p1Score: this.p1.score,
      p2Score: this.p2.score,
      p1Slices: this.p1.totalSlices,
      p2Slices: this.p2.totalSlices,
      hwTelemetry: this.hw.getHardwareTelemetry()
    });
  }

  spawnSynchronizedWave() {
    const normalTypes = [
      FRUIT_TYPES.WATERMELON,
      FRUIT_TYPES.APPLE,
      FRUIT_TYPES.BANANA,
      FRUIT_TYPES.ORANGE,
      FRUIT_TYPES.STRAWBERRY,
      FRUIT_TYPES.PINEAPPLE
    ];

    let poisonProb = 0.20;
    if (this.options.poisonRate === 'low') poisonProb = 0.12;
    if (this.options.poisonRate === 'chaos') poisonProb = 0.32;

    const forcePoison = Math.random() < poisonProb;
    let chosenType = normalTypes[Math.floor(Math.random() * normalTypes.length)];

    if (forcePoison) {
      chosenType = this.roundPoisonType || FRUIT_TYPES.POISON;
    }

    const waveId = ++this.waveCounter;

    // Evaluate hardware gate-level poison detector circuit for this wave
    const hwWave = this.hw.spawnWave(waveId, chosenType);
    const isPoisonWave = hwWave.isPoison;

    if (isPoisonWave) {
      sound.playPoisonWarn();
    }

    const cfg = FRUIT_CONFIGS[chosenType] || FRUIT_CONFIGS[FRUIT_TYPES.WATERMELON];
    const margin = cfg.radius + 30;
    const x = margin + Math.random() * (this.width - margin * 2);
    const hSpeed = (Math.random() * 2.2 - 1.1);
    const launchSpeed = (8.8 + Math.random() * 1.8) * Math.sqrt(this.p1Zone.height / 360);
    const rotation = Math.random() * Math.PI;
    const vRot = (Math.random() * 0.05 - 0.025);
    const now = performance.now();

    // Register active wave for reflex duel
    this.activeWaves.set(waveId, {
      id: waveId,
      fruitType: chosenType,
      isPoison: isPoisonWave,
      spawnTime: now,
      claimedBy: null
    });

    // Player 1 Fruit
    const isP1Opposite = this.options.faceToFace;
    let p1StartY = this.p1Zone.y + this.p1Zone.height + cfg.radius;
    let p1Vy = -launchSpeed;
    let p1Gravity = 0.22;

    if (isP1Opposite) {
      p1StartY = this.p1Zone.y - cfg.radius;
      p1Vy = launchSpeed;
      p1Gravity = -0.22;
    }

    this.p1.fruits.push({
      waveId,
      type: chosenType,
      isPoison: isPoisonWave,
      x,
      y: p1StartY,
      vx: hSpeed,
      vy: p1Vy,
      gravity: p1Gravity,
      rotation,
      vRot,
      radius: cfg.radius,
      spawnTime: now
    });

    // Player 2 Fruit (EXACT SAME fruit, horizontal position, velocity, and timing!)
    const p2StartY = this.p2Zone.y + this.p2Zone.height + cfg.radius;
    this.p2.fruits.push({
      waveId,
      type: chosenType,
      isPoison: isPoisonWave,
      x,
      y: p2StartY,
      vx: hSpeed,
      vy: -launchSpeed,
      gravity: 0.22,
      rotation,
      vRot,
      radius: cfg.radius,
      spawnTime: now
    });
  }

  updatePlayerFruits(player, zone, dt) {
    const isP1 = player.id === 1;
    const isOpposite = isP1 && this.options.faceToFace;
    const now = performance.now();

    // Combo timer cooldown
    if (player.comboTimer > 0) {
      player.comboTimer -= dt;
      if (player.comboTimer <= 0) {
        player.combo = 0;
        this.hw.clockComboTimeout(player.id);
        this.options.onScoreUpdate({
          p1Score: this.p1.score,
          p2Score: this.p2.score,
          p1Combo: this.p1.combo,
          p2Combo: this.p2.combo,
          hwTelemetry: this.hw.getHardwareTelemetry()
        });
      }
    }

    // Update active fruits
    for (let i = player.fruits.length - 1; i >= 0; i--) {
      const f = player.fruits[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += f.gravity;
      f.rotation += f.vRot;

      // Bounce off side walls
      if (f.x - f.radius < 0) {
        f.x = f.radius;
        f.vx = Math.abs(f.vx) * 0.9;
      } else if (f.x + f.radius > zone.width) {
        f.x = zone.width - f.radius;
        f.vx = -Math.abs(f.vx) * 0.9;
      }

      // Check if dropped out of play area or lifetime exceeded (resilient fail-safe)
      const isOut = isOpposite
        ? ((f.y < zone.y - 60 && f.vy < 0) || f.y > zone.y + zone.height + 70)
        : ((f.y > zone.y + zone.height + 60 && f.vy > 0) || f.y < zone.y - 70);

      if (isOut || (now - f.spawnTime > 4000)) {
        player.fruits.splice(i, 1);
      }
    }

    // Update halves
    for (let i = player.halves.length - 1; i >= 0; i--) {
      const h = player.halves[i];
      h.x += h.vx;
      h.y += h.vy;
      h.vy += h.gravity;
      h.rotation += h.vRot;

      if (h.y > zone.y + zone.height + 80 || h.y < zone.y - 80) {
        player.halves.splice(i, 1);
      }
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      // Synchronized wave spawning for both players!
      const spawnInterval = Math.max(1150, (1650 / this.difficultyFactor) * (this.options.gameMode === 'speed' ? 0.75 : 1.0));
      const now = performance.now();
      if (now - this.lastWaveSpawn > spawnInterval && this.p1.fruits.length < 3) {
        this.spawnSynchronizedWave();
        this.lastWaveSpawn = now;
      }

      // Clean up old active waves
      this.activeWaves.forEach((w, id) => {
        if (now - w.spawnTime > 4000) {
          this.activeWaves.delete(id);
        }
      });

      // Update logic
      this.updatePlayerFruits(this.p1, this.p1Zone, dt);
      this.updatePlayerFruits(this.p2, this.p2Zone, dt);
      this.particles.update();

      // Decay blade trail points smoothly
      [this.p1, this.p2].forEach((player) => {
        player.activeTouches.forEach((trail, id) => {
          for (let i = trail.length - 1; i >= 0; i--) {
            trail[i].life -= 0.08;
            if (trail[i].life <= 0) trail.splice(i, 1);
          }
          if (trail.length === 0) player.activeTouches.delete(id);
        });
      });

      // Screen shake decay
      if (this.screenShake > 0) {
        this.screenShake *= 0.88;
        if (this.screenShake < 0.2) this.screenShake = 0;
      }

      // Toxic flash decay
      if (this.toxicFlash > 0) {
        this.toxicFlash *= 0.85;
      }
    }

    // Render
    this.render(currentTime / 1000);

    requestAnimationFrame(this.loop.bind(this));
  }

  render(time) {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
      const shakeX = (Math.random() * 2 - 1) * this.screenShake;
      const shakeY = (Math.random() * 2 - 1) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Clear canvas
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Splat Decals on floor
    this.particles.drawSplats(ctx);

    // 2. Draw Player 1 Arena (Top Half)
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.p1Zone.x, this.p1Zone.y, this.p1Zone.width, this.p1Zone.height);
    ctx.clip();

    // Subtle player 1 zone glow gradient
    const p1BgGrad = ctx.createLinearGradient(0, 0, 0, this.p1Zone.height);
    p1BgGrad.addColorStop(0, 'rgba(255, 42, 85, 0.08)');
    p1BgGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = p1BgGrad;
    ctx.fillRect(0, 0, this.p1Zone.width, this.p1Zone.height);

    // Draw P1 fruits and halves
    this.p1.fruits.forEach((f) => drawFruit(ctx, f, time));
    this.p1.halves.forEach((h) => drawFruitHalf(ctx, h, time));

    // Draw P1 blade trails
    this.p1.activeTouches.forEach((trail) => {
      ParticleSystem.drawBladeTrail(ctx, trail, '#ffffff', this.p1.glowColor);
    });

    ctx.restore();

    // 3. Draw Player 2 Arena (Bottom Half)
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.p2Zone.x, this.p2Zone.y, this.p2Zone.width, this.p2Zone.height);
    ctx.clip();

    // Subtle player 2 zone glow gradient
    const p2BgGrad = ctx.createLinearGradient(0, this.p2Zone.y, 0, this.height);
    p2BgGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    p2BgGrad.addColorStop(1, 'rgba(0, 229, 255, 0.08)');
    ctx.fillStyle = p2BgGrad;
    ctx.fillRect(0, this.p2Zone.y, this.p2Zone.width, this.p2Zone.height);

    // Draw P2 fruits and halves
    this.p2.fruits.forEach((f) => drawFruit(ctx, f, time));
    this.p2.halves.forEach((h) => drawFruitHalf(ctx, h, time));

    // Draw P2 blade trails
    this.p2.activeTouches.forEach((trail) => {
      ParticleSystem.drawBladeTrail(ctx, trail, '#ffffff', this.p2.glowColor);
    });

    ctx.restore();

    // 4. Draw Center Divider Bar (Wooden Fence & Vine styling)
    this.drawDivider(ctx);

    // 5. Draw Particles and Floating Texts over arena
    this.particles.drawParticles(ctx);

    // 6. Toxic Flash overlay
    if (this.toxicFlash > 0.01) {
      ctx.fillStyle = `rgba(156, 39, 176, ${this.toxicFlash * 0.45})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  drawDivider(ctx) {
    const y = this.dividerZone.y;
    const h = this.dividerZone.height;
    const w = this.width;

    ctx.save();

    // 3D Wooden beam
    const woodGrad = ctx.createLinearGradient(0, y, 0, y + h);
    woodGrad.addColorStop(0, '#a06535');
    woodGrad.addColorStop(0.5, '#794821');
    woodGrad.addColorStop(1, '#533116');

    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, y, w, h);

    // Top highlight & bottom shadow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(0, y, w, 2.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, y + h - 2.5, w, 2.5);

    // Wooden nails / rivets
    ctx.fillStyle = '#ffecb3';
    for (let nx = 30; nx < w; nx += 90) {
      ctx.beginPath();
      ctx.arc(nx, y + h / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#3e2723';
      ctx.stroke();
    }

    // Tug-of-war score indicator line in center
    const totalScore = Math.max(1, this.p1.score + this.p2.score);
    const p1Ratio = this.p1.score / totalScore;
    const midX = w * 0.5;
    const tugOffset = (p1Ratio - 0.5) * (w * 0.35);

    // Tiny duel flag marker
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(midX + tugOffset, y + h / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e65100';
    ctx.stroke();

    ctx.restore();
  }
}
