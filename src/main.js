/**
 * Fruit Duel - Main Application Controller
 * Manages UI screens, transitions, modal dialogs, audio bindings, and game lifecycle.
 */

import './style.css';
import confetti from 'canvas-confetti';
import { sound } from './audio.js';
import { FruitDuelGame } from './game.js';
import { FRUIT_TYPES, FRUIT_CONFIGS, drawFruit } from './fruits.js';

// Application State
const state = {
  activeScreen: 'intro', // 'intro', 'home', 'poison-reveal', 'countdown', 'game', 'result'
  gameMode: 'classic', // 'classic', 'speed', 'suddendeath', 'bestof3'
  faceToFace: true, // P1 rotated 180°
  soundEnabled: true,
  musicEnabled: false,
  duration: 60,
  poisonRate: 'normal',
  simulatorFrame: true,
  currentRoundPoison: FRUIT_TYPES.POISON,
  bestOf3Rounds: { p1: 0, p2: 0, currentRound: 1 }
};

// Load saved settings if any
try {
  const saved = localStorage.getItem('fruit_duel_settings');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.activeScreen = 'intro'; // always start on intro splash
  }
} catch (e) {
  console.warn('Could not load settings from localStorage', e);
}

// Global game instance
let game = null;

// Select round poison fruit
function selectRoundPoisonFruit() {
  const candidateTypes = [
    FRUIT_TYPES.WATERMELON,
    FRUIT_TYPES.APPLE,
    FRUIT_TYPES.BANANA,
    FRUIT_TYPES.ORANGE,
    FRUIT_TYPES.STRAWBERRY,
    FRUIT_TYPES.PINEAPPLE,
    FRUIT_TYPES.POISON
  ];
  state.currentRoundPoison = candidateTypes[Math.floor(Math.random() * candidateTypes.length)];
  return state.currentRoundPoison;
}

// Render Poison Preview on Canvas
function renderPoisonPreviewCanvas(fruitType) {
  const canvas = document.getElementById('poison-preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 130 * dpr;
  canvas.height = 130 * dpr;
  ctx.scale(dpr, dpr);

  let frame = 0;
  const drawAnim = () => {
    if (state.activeScreen !== 'poison-reveal') return;
    ctx.clearRect(0, 0, 130, 130);
    const mockFruit = {
      type: fruitType,
      isPoison: true,
      x: 65,
      y: 65,
      rotation: Math.sin(frame * 0.05) * 0.15,
      radius: 40
    };
    drawFruit(ctx, mockFruit, frame * 0.05);
    frame++;
    requestAnimationFrame(drawAnim);
  };

  drawAnim();
}

// Build DOM
function initApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="viewport" class="game-viewport ${state.simulatorFrame ? 'simulator-frame' : ''} ${state.faceToFace ? 'face-to-face' : ''}">
      <!-- Quick Header Bar -->
      <header class="quick-bar">
        <button id="quick-sound-btn" class="quick-btn" title="Toggle Sound">
          <span id="sound-icon">${state.soundEnabled ? '🔊' : '🔇'}</span>
        </button>
        <button id="quick-flip-btn" class="quick-btn" title="Toggle Face-to-Face Seating">
          <span>🔄</span>
          <span id="flip-label">${state.faceToFace ? 'Opposite' : 'Same'}</span>
        </button>
        <button id="quick-frame-btn" class="quick-btn" title="Toggle Mobile Frame Simulator">
          <span id="frame-icon">${state.simulatorFrame ? '📱' : '🖥️'}</span>
        </button>
        <button id="quick-hw-btn" class="quick-btn" title="Toggle Verilog Hardware Logic Monitor (EDA Playground)">
          <span>⚡</span>
          <span>RTL</span>
        </button>
      </header>

      <!-- SCREEN 0: INTRO / SPLASH SCREEN (User Reference Image) -->
      <section id="screen-intro" class="screen ${state.activeScreen === 'intro' ? 'active' : ''}">
        <div class="intro-content">
          <div class="intro-img-card">
            <img src="/veggie_wonder_intro.jpg" alt="Veggie Wonder Fruit Duel" class="intro-img" />
          </div>
          <button id="btn-intro-start" class="btn-3d btn-green btn-intro-start">
            <span>START</span>
          </button>
        </div>
      </section>

      <!-- SCREEN 1: HOME -->
      <section id="screen-home" class="screen ${state.activeScreen === 'home' ? 'active' : ''}">
        <div class="hero-banner">
          <div class="logo-art-container">
            <img src="/fruit_duel_cover.jpg" alt="Veggie Wonder Cover" class="logo-art-img" />
          </div>
          <h1 class="game-title">VEGGIE WONDER</h1>
          <div class="title-sub">2-Player Split-Screen Arcade Battle</div>
        </div>

        <!-- Mode Select (No Emojis) -->
        <div class="mode-section">
          <div class="section-label">Select Game Mode</div>
          <div class="mode-grid">
            <div class="mode-card ${state.gameMode === 'classic' ? 'selected' : ''}" data-mode="classic">
              <div class="title">Classic Duel</div>
              <div class="desc">60s reflex match & poison trap</div>
            </div>
            <div class="mode-card ${state.gameMode === 'speed' ? 'selected' : ''}" data-mode="speed">
              <div class="title">Speed Rush</div>
              <div class="desc">30s frantic blitz</div>
            </div>
            <div class="mode-card ${state.gameMode === 'suddendeath' ? 'selected' : ''}" data-mode="suddendeath">
              <div class="title">Sudden Death</div>
              <div class="desc">First mistake loses!</div>
            </div>
            <div class="mode-card ${state.gameMode === 'bestof3' ? 'selected' : ''}" data-mode="bestof3">
              <div class="title">Best of 3</div>
              <div class="desc">Win 2 rounds to reign!</div>
            </div>
          </div>
        </div>

        <!-- Home Action Buttons -->
        <div class="home-actions">
          <button id="btn-play-duel" class="btn-3d btn-green">
            <span>PLAY DUEL</span>
          </button>
          <div class="action-row">
            <button id="btn-how-to" class="btn-3d btn-wood">
              <span>RULES</span>
            </button>
            <button id="btn-settings" class="btn-3d btn-orange">
              <span>OPTIONS</span>
            </button>
          </div>
        </div>
      </section>

      <!-- SCREEN 2: PRE-ROUND POISON FRUIT REVEAL -->
      <section id="screen-poison-reveal" class="screen">
        <div class="poison-reveal-card">
          <div class="poison-reveal-tag">BEWARE FOR THIS ROUND</div>
          <h2 id="poison-fruit-name" class="poison-reveal-title">SWEET APPLE</h2>

          <div class="poison-preview-canvas-box">
            <canvas id="poison-preview-canvas" width="130" height="130"></canvas>
          </div>

          <div class="poison-warning-banner">DO NOT SLICE THIS FRUIT!</div>
          <div class="poison-reveal-sub">Same fruits appear in both panels fast! Tap normal fruits quicker to win points. Slicing poison results in instant defeat!</div>

          <button id="btn-poison-ready" class="btn-3d btn-green" style="width: 100%; font-size: 18px; padding: 12px;">READY!</button>
        </div>
      </section>

      <!-- SCREEN 3: COUNTDOWN -->
      <section id="screen-countdown" class="screen">
        <div class="countdown-box">
          <div class="countdown-ready" id="countdown-round-label">DUEL STARTING!</div>
          <div id="countdown-digit" class="countdown-num">3</div>
        </div>
      </section>

      <!-- SCREEN 4: GAME (Split-Screen) -->
      <section id="screen-game" class="screen">
        <canvas id="game-canvas"></canvas>

        <div class="game-hud">
          <!-- Player 1 Center Top Badge (Middle of the top of Player 1's section) -->
          <div class="player-badge-top-center p1">
            <span class="player-name">Player 1</span>
          </div>

          <!-- Player 1 HUD Corners -->
          <div class="hud-p1">
            <div id="p1-combo-display" class="combo-pill">COMBO x2!</div>
            <div class="score-badge">
              <div id="p1-score-display" class="score-val">0</div>
            </div>
          </div>

          <!-- Center Match Divider & Timer Bar -->
          <div class="center-hud-bar">
            <div style="display: flex; gap: 6px;">
              <button id="btn-pause-match" class="hud-icon-btn" title="Pause Match">⏸️</button>
              <button id="btn-hud-sound" class="hud-icon-btn" title="Toggle Sound">${state.soundEnabled ? '🔊' : '🔇'}</button>
            </div>
            <div id="match-timer-box" class="timer-box">
              <span>⏱️</span>
              <span id="match-timer-val" class="timer-text">60</span>
            </div>
            <button id="btn-hud-flip" class="hud-icon-btn" title="Toggle Orientation">🔄</button>
          </div>

          <!-- Player 2 Center Top Badge (Middle of the top of Player 2's section) -->
          <div class="player-badge-top-center p2">
            <span class="player-name">Player 2</span>
          </div>

          <!-- Player 2 HUD Corners -->
          <div class="hud-p2">
            <div id="p2-combo-display" class="combo-pill">COMBO x2!</div>
            <div class="score-badge">
              <div id="p2-score-display" class="score-val">0</div>
            </div>
          </div>
        </div>
      </section>

      <!-- SCREEN 5: RESULT -->
      <section id="screen-result" class="screen">
        <div class="result-card">
          <h2 id="result-winner-title" class="winner-title">PLAYER 1 WINS!</h2>
          <div id="result-reason-badge" class="win-reason-badge score">Higher Score Champion!</div>

          <!-- Comparative Stats Grid -->
          <div class="stats-table">
            <div id="p1-stat-card" class="player-stat-col">
              <div class="stat-header stat-p1">
                <span>Player 1</span>
              </div>
              <div id="p1-final-score" class="stat-score">140</div>
              <div id="p1-final-slices" class="stat-detail">12 Fruits Cut</div>
            </div>
            <div id="p2-stat-card" class="player-stat-col">
              <div class="stat-header stat-p2">
                <span>Player 2</span>
              </div>
              <div id="p2-final-score" class="stat-score">95</div>
              <div id="p2-final-slices" class="stat-detail">8 Fruits Cut</div>
            </div>
          </div>

          <!-- Result Actions -->
          <div class="result-actions">
            <button id="btn-rematch" class="btn-3d btn-green">
              <span>PLAY AGAIN</span>
            </button>
            <button id="btn-result-home" class="btn-3d btn-wood">
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </section>

      <!-- VERILOG HARDWARE LOGIC MONITOR (EDA Playground Netlist) -->
      <aside id="hw-logic-monitor" class="hw-monitor-panel">
        <div class="hw-monitor-header">
          <div class="hw-title"><span>⚡</span> VERILOG HARDWARE MONITOR</div>
          <button id="btn-close-hw-monitor" class="hw-close-btn" title="Close Hardware Monitor">✕</button>
        </div>
        <div class="hw-monitor-body">
          <div class="hw-chip-tag">CORE: veggie_wonder_top (Gate-Level RTL)</div>
          <div class="hw-row">
            <span class="hw-lbl">CLK CYCLES:</span>
            <span id="hw-val-clock" class="hw-val">00000</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">FSM STATE:</span>
            <span id="hw-val-state" class="hw-val highlight">S_IDLE (3'b000)</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">ROUND POISON:</span>
            <span id="hw-val-poison-type" class="hw-val toxic">001 (Apple)</span>
          </div>
          <div class="hw-divider">GATE-LEVEL SIGNALS & WIRES</div>
          <div class="hw-row">
            <span class="hw-lbl">wire is_wave_poison:</span>
            <span id="hw-wire-poison" class="hw-bit">0</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">wire reflex_claimed:</span>
            <span id="hw-wire-claimed" class="hw-bit">0</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">wire reflex_faster:</span>
            <span id="hw-wire-faster" class="hw-val">NONE</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">wire p1_poison_trip:</span>
            <span id="hw-wire-p1-poison" class="hw-bit">0</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">wire p2_poison_trip:</span>
            <span id="hw-wire-p2-poison" class="hw-bit">0</span>
          </div>
          <div class="hw-divider">HARDWARE REGISTERS</div>
          <div class="hw-row">
            <span class="hw-lbl">P1_SCORE[11:0]:</span>
            <span id="hw-reg-p1-score" class="hw-val">0 (0x000)</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">P2_SCORE[11:0]:</span>
            <span id="hw-reg-p2-score" class="hw-val">0 (0x000)</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">P1_COMBO[3:0]:</span>
            <span id="hw-reg-p1-combo" class="hw-val">0 (1.0x)</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">P2_COMBO[3:0]:</span>
            <span id="hw-reg-p2-combo" class="hw-val">0 (1.0x)</span>
          </div>
          <div class="hw-row">
            <span class="hw-lbl">LAST RTL EVENT:</span>
            <span id="hw-val-event" class="hw-val small">HARDWARE_INIT</span>
          </div>
        </div>
      </aside>

      <!-- MODAL: PAUSE -->
      <div id="modal-pause" class="modal-overlay">
        <div class="modal-content" style="max-width: 320px; text-align: center;">
          <h3 class="modal-title" style="margin-bottom: 20px;">MATCH PAUSED</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="btn-resume-match" class="btn-3d btn-green">RESUME</button>
            <button id="btn-restart-match" class="btn-3d btn-orange">RESTART</button>
            <button id="btn-quit-match" class="btn-3d btn-wood">QUIT TO MENU</button>
          </div>
        </div>
      </div>

      <!-- MODAL: HOW TO PLAY -->
      <div id="modal-how-to" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">RULES OF THE DUEL</h3>
            <button id="btn-close-how-to" class="modal-close-btn">✕</button>
          </div>

          <div class="how-to-card">
            <div class="how-to-icon">⚡</div>
            <div>
              <div class="how-to-title">1. Synchronized Fruit Panels</div>
              <div class="how-to-text">The exact same fruits appear in both player panels at high speed. The screen is split in half for fair, simultaneous dueling!</div>
            </div>
          </div>

          <div class="how-to-card">
            <div class="how-to-icon">⏱️</div>
            <div>
              <div class="how-to-title">2. Fastest Tap Scores</div>
              <div class="how-to-text">Same fruits appear in both panels fastly and the player who taps it with less time gets the score! Faster reaction times award higher speed bonus scores.</div>
            </div>
          </div>

          <div class="how-to-card poison-warning">
            <div class="how-to-icon">☠️</div>
            <div>
              <div class="how-to-title">3. Round Poison Fruit Target</div>
              <div class="how-to-text">Before each round starts, a single fruit will appear as the Poison Fruit! It glows with toxic aura and skulls. <b>If you slice it, you immediately lose and your opponent wins!</b></div>
            </div>
          </div>

          <div class="how-to-card">
            <div class="how-to-icon">🔄</div>
            <div>
              <div class="how-to-title">4. Face-to-Face Table Seating</div>
              <div class="how-to-text">Toggle Opposite Seating to rotate Player 1's section 180° so two players sitting across a table or holding a phone can play upright simultaneously!</div>
            </div>
          </div>

          <button id="btn-how-to-ok" class="btn-3d btn-green" style="margin-top: 10px;">GOT IT! LET'S DUEL</button>
        </div>
      </div>

      <!-- MODAL: SETTINGS -->
      <div id="modal-settings" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">GAME SETTINGS</h3>
            <button id="btn-close-settings" class="modal-close-btn">✕</button>
          </div>

          <div class="setting-item">
            <div>
              <div class="setting-label">Sound Effects</div>
              <div class="setting-desc">Blade swooshes, splats & combos</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="setting-sound" ${state.soundEnabled ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div>
              <div class="setting-label">Background Music</div>
              <div class="setting-desc">Bouncy pastoral arcade chiptune</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="setting-music" ${state.musicEnabled ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div>
              <div class="setting-label">Player 1 Orientation</div>
              <div class="setting-desc">Rotate top player 180° for table face-to-face</div>
            </div>
            <div class="segmented-control" id="control-seating">
              <button class="segmented-btn ${state.faceToFace ? 'active' : ''}" data-val="opposite">Opposite</button>
              <button class="segmented-btn ${!state.faceToFace ? 'active' : ''}" data-val="same">Same</button>
            </div>
          </div>

          <div class="setting-item">
            <div>
              <div class="setting-label">Match Duration</div>
              <div class="setting-desc">Length of standard duel</div>
            </div>
            <div class="segmented-control" id="control-duration">
              <button class="segmented-btn ${state.duration === 30 ? 'active' : ''}" data-val="30">30s</button>
              <button class="segmented-btn ${state.duration === 60 ? 'active' : ''}" data-val="60">60s</button>
              <button class="segmented-btn ${state.duration === 90 ? 'active' : ''}" data-val="90">90s</button>
            </div>
          </div>

          <div class="setting-item">
            <div>
              <div class="setting-label">Poison Berry Rate</div>
              <div class="setting-desc">Frequency of deadly traps</div>
            </div>
            <div class="segmented-control" id="control-poison">
              <button class="segmented-btn ${state.poisonRate === 'low' ? 'active' : ''}" data-val="low">Low</button>
              <button class="segmented-btn ${state.poisonRate === 'normal' ? 'active' : ''}" data-val="normal">Normal</button>
              <button class="segmented-btn ${state.poisonRate === 'chaos' ? 'active' : ''}" data-val="chaos">Chaos</button>
            </div>
          </div>

          <div class="setting-item">
            <div>
              <div class="setting-label">Simulator Frame</div>
              <div class="setting-desc">Sleek mobile device bezel on desktop</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="setting-frame" ${state.simulatorFrame ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <button id="btn-save-settings" class="btn-3d btn-green" style="margin-top: 14px;">SAVE & CLOSE</button>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

// Switch Active Screen
function showScreen(screenId) {
  state.activeScreen = screenId;
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
}

// Open / Close Modals
function openModal(modalId) {
  sound.playClick();
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  sound.playClick();
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// Save Settings to Storage
function persistSettings() {
  try {
    localStorage.setItem(
      'fruit_duel_settings',
      JSON.stringify({
        gameMode: state.gameMode,
        faceToFace: state.faceToFace,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        duration: state.duration,
        poisonRate: state.poisonRate,
        simulatorFrame: state.simulatorFrame
      })
    );
  } catch (e) {
    console.warn(e);
  }
}

// Poison Reveal Timer ID
let poisonRevealTimer = null;

// Start Match Workflow: Poison Reveal -> Countdown -> Arena
function startMatchWorkflow() {
  sound.playClick();

  // 1. Pick Poison Fruit for this round
  const chosenPoison = selectRoundPoisonFruit();
  showScreen('poison-reveal');

  const poisonNameEl = document.getElementById('poison-fruit-name');
  if (poisonNameEl) {
    const cfg = FRUIT_CONFIGS[chosenPoison] || FRUIT_CONFIGS[FRUIT_TYPES.POISON];
    poisonNameEl.textContent = cfg.name.toUpperCase();
  }

  sound.playPoisonWarn();
  renderPoisonPreviewCanvas(chosenPoison);

  // Auto-advance to countdown after 2.4s or when player clicks READY!
  if (poisonRevealTimer) clearTimeout(poisonRevealTimer);
  poisonRevealTimer = setTimeout(() => {
    if (state.activeScreen === 'poison-reveal') {
      beginCountdown();
    }
  }, 2400);
}

// Begin Countdown (3, 2, 1, GO)
function beginCountdown() {
  if (poisonRevealTimer) {
    clearTimeout(poisonRevealTimer);
    poisonRevealTimer = null;
  }

  showScreen('countdown');

  const digitEl = document.getElementById('countdown-digit');
  const labelEl = document.getElementById('countdown-round-label');

  if (state.gameMode === 'bestof3') {
    labelEl.textContent = `ROUND ${state.bestOf3Rounds.currentRound} OF 3! (P1: ${state.bestOf3Rounds.p1} - P2: ${state.bestOf3Rounds.p2})`;
  } else {
    labelEl.textContent = 'DUEL STARTING!';
  }

  let count = 3;
  digitEl.textContent = count;
  sound.playCountdown(count);

  const countdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      digitEl.textContent = count;
      digitEl.style.animation = 'none';
      digitEl.offsetHeight; // reflow
      digitEl.style.animation = 'countdownPop 0.85s cubic-bezier(0.1, 1.2, 0.2, 1) forwards';
      sound.playCountdown(count);
    } else if (count === 0) {
      digitEl.textContent = 'GO!';
      digitEl.style.color = '#76ff03';
      sound.playCountdown(0);
    } else {
      clearInterval(countdownTimer);
      launchGameArena();
    }
  }, 900);
}

// Render Verilog Hardware Telemetry to HUD Monitor
function renderHardwareTelemetry(hw) {
  if (!hw) return;
  const clockEl = document.getElementById('hw-val-clock');
  const stateEl = document.getElementById('hw-val-state');
  const poisonTypeEl = document.getElementById('hw-val-poison-type');
  const wirePoisonEl = document.getElementById('hw-wire-poison');
  const wireClaimedEl = document.getElementById('hw-wire-claimed');
  const wireFasterEl = document.getElementById('hw-wire-faster');
  const wireP1PoisonEl = document.getElementById('hw-wire-p1-poison');
  const wireP2PoisonEl = document.getElementById('hw-wire-p2-poison');
  const regP1ScoreEl = document.getElementById('hw-reg-p1-score');
  const regP2ScoreEl = document.getElementById('hw-reg-p2-score');
  const regP1ComboEl = document.getElementById('hw-reg-p1-combo');
  const regP2ComboEl = document.getElementById('hw-reg-p2-combo');
  const eventEl = document.getElementById('hw-val-event');

  if (clockEl) clockEl.textContent = String(hw.probe.clockCount).padStart(5, '0');
  if (stateEl) stateEl.textContent = `${hw.stateName} (3'b${hw.state.toString(2).padStart(3, '0')})`;
  if (poisonTypeEl) poisonTypeEl.textContent = `${hw.roundPoisonType.toString(2).padStart(3, '0')} (${state.currentRoundPoison})`;
  if (wirePoisonEl) {
    wirePoisonEl.textContent = hw.probe.isPoisonWire ? '1 (HIGH)' : '0 (LOW)';
    wirePoisonEl.className = hw.probe.isPoisonWire ? 'hw-bit high toxic' : 'hw-bit';
  }
  if (wireClaimedEl) wireClaimedEl.textContent = (hw.probe.p1IsFasterWire || hw.probe.p2IsFasterWire) ? '1 (HIGH)' : '0 (LOW)';
  if (wireFasterEl) wireFasterEl.textContent = hw.probe.p1IsFasterWire ? 'PLAYER 1' : hw.probe.p2IsFasterWire ? 'PLAYER 2' : 'NONE';
  if (wireP1PoisonEl) {
    wireP1PoisonEl.textContent = hw.probe.p1PoisonTripWire ? '1 (TRIP)' : '0';
    wireP1PoisonEl.className = hw.probe.p1PoisonTripWire ? 'hw-bit high toxic' : 'hw-bit';
  }
  if (wireP2PoisonEl) {
    wireP2PoisonEl.textContent = hw.probe.p2PoisonTripWire ? '1 (TRIP)' : '0';
    wireP2PoisonEl.className = hw.probe.p2PoisonTripWire ? 'hw-bit high toxic' : 'hw-bit';
  }
  if (regP1ScoreEl) regP1ScoreEl.textContent = `${hw.p1Score} (0x${hw.p1Score.toString(16).toUpperCase()})`;
  if (regP2ScoreEl) regP2ScoreEl.textContent = `${hw.p2Score} (0x${hw.p2Score.toString(16).toUpperCase()})`;
  if (regP1ComboEl) regP1ComboEl.textContent = `${hw.p1Combo} (${hw.p1Combo >= 4 ? '2.0x' : hw.p1Combo >= 2 ? '1.5x' : '1.0x'})`;
  if (regP2ComboEl) regP2ComboEl.textContent = `${hw.p2Combo} (${hw.p2Combo >= 4 ? '2.0x' : hw.p2Combo >= 2 ? '1.5x' : '1.0x'})`;
  if (eventEl) eventEl.textContent = hw.probe.lastEvent;
}

// Launch Game Engine
function launchGameArena() {
  showScreen('game');

  const canvas = document.getElementById('game-canvas');
  const timerBox = document.getElementById('match-timer-box');
  const timerVal = document.getElementById('match-timer-val');
  const p1ScoreEl = document.getElementById('p1-score-display');
  const p2ScoreEl = document.getElementById('p2-score-display');
  const p1ComboEl = document.getElementById('p1-combo-display');
  const p2ComboEl = document.getElementById('p2-combo-display');

  // Reset HUD
  p1ScoreEl.textContent = '0';
  p2ScoreEl.textContent = '0';
  p1ComboEl.classList.remove('visible');
  p2ComboEl.classList.remove('visible');
  timerBox.classList.remove('urgent');

  let matchDuration = state.duration;
  if (state.gameMode === 'speed') matchDuration = 30;

  timerVal.textContent = matchDuration;

  game = new FruitDuelGame(canvas, {
    duration: matchDuration,
    gameMode: state.gameMode,
    faceToFace: state.faceToFace,
    poisonRate: state.poisonRate,
    roundPoisonType: state.currentRoundPoison,
    onScoreUpdate: ({ p1Score, p2Score, p1Combo, p2Combo, hwTelemetry }) => {
      p1ScoreEl.textContent = p1Score;
      p2ScoreEl.textContent = p2Score;

      renderHardwareTelemetry(hwTelemetry);

      // Bump animation on change
      p1ScoreEl.classList.add('bump');
      p2ScoreEl.classList.add('bump');
      setTimeout(() => {
        p1ScoreEl.classList.remove('bump');
        p2ScoreEl.classList.remove('bump');
      }, 150);

      // Combos
      if (p1Combo >= 2) {
        p1ComboEl.textContent = `COMBO x${p1Combo}!`;
        p1ComboEl.classList.add('visible');
      } else {
        p1ComboEl.classList.remove('visible');
      }

      if (p2Combo >= 2) {
        p2ComboEl.textContent = `COMBO x${p2Combo}!`;
        p2ComboEl.classList.add('visible');
      } else {
        p2ComboEl.classList.remove('visible');
      }
    },
    onTimeUpdate: (timeLeft, hwTelemetry) => {
      timerVal.textContent = timeLeft;
      renderHardwareTelemetry(hwTelemetry);
      if (timeLeft <= 10) {
        timerBox.classList.add('urgent');
      } else {
        timerBox.classList.remove('urgent');
      }
    },
    onGameOver: (result) => {
      if (result.hwTelemetry) renderHardwareTelemetry(result.hwTelemetry);
      handleGameOver(result);
    }
  });

  game.start();
  renderHardwareTelemetry(game.hw.getHardwareTelemetry());
}

// Handle Game Over (No crown, no popper emoji)
function handleGameOver(result) {
  showScreen('result');

  const winnerTitle = document.getElementById('result-winner-title');
  const reasonBadge = document.getElementById('result-reason-badge');
  const p1ScoreEl = document.getElementById('p1-final-score');
  const p2ScoreEl = document.getElementById('p2-final-score');
  const p1SlicesEl = document.getElementById('p1-final-slices');
  const p2SlicesEl = document.getElementById('p2-final-slices');
  const p1Card = document.getElementById('p1-stat-card');
  const p2Card = document.getElementById('p2-stat-card');

  p1ScoreEl.textContent = result.p1Score;
  p2ScoreEl.textContent = result.p2Score;
  p1SlicesEl.textContent = `${result.p1Slices} Fruits Cut`;
  p2SlicesEl.textContent = `${result.p2Slices} Fruits Cut`;

  p1Card.classList.remove('winner');
  p2Card.classList.remove('winner');

  if (result.winnerId === 1) {
    p1Card.classList.add('winner');
    winnerTitle.textContent = 'PLAYER 1 WINS!';
    winnerTitle.style.color = '#ff2a55';
  } else if (result.winnerId === 2) {
    p2Card.classList.add('winner');
    winnerTitle.textContent = 'PLAYER 2 WINS!';
    winnerTitle.style.color = '#00b0ff';
  } else {
    winnerTitle.textContent = 'TIED DUEL!';
    winnerTitle.style.color = '#ff9800';
  }

  if (result.reason === 'poison') {
    reasonBadge.className = 'win-reason-badge poison';
    reasonBadge.textContent = `${result.loser} sliced the Poison Fruit!`;
  } else if (result.reason === 'score_cap') {
    reasonBadge.className = 'win-reason-badge score';
    reasonBadge.textContent = 'Sudden Death Score Champion!';
  } else {
    reasonBadge.className = 'win-reason-badge score';
    reasonBadge.textContent = 'Match Timer Expired — High Score Victory!';
  }

  // Best of 3 tracking
  if (state.gameMode === 'bestof3') {
    if (result.winnerId === 1) state.bestOf3Rounds.p1++;
    if (result.winnerId === 2) state.bestOf3Rounds.p2++;

    if (state.bestOf3Rounds.p1 >= 2) {
      winnerTitle.textContent = 'PLAYER 1 WINS THE SERIES (2-0)!';
      state.bestOf3Rounds = { p1: 0, p2: 0, currentRound: 1 };
    } else if (state.bestOf3Rounds.p2 >= 2) {
      winnerTitle.textContent = 'PLAYER 2 WINS THE SERIES (2-0)!';
      state.bestOf3Rounds = { p1: 0, p2: 0, currentRound: 1 };
    } else {
      state.bestOf3Rounds.currentRound++;
      reasonBadge.textContent += ` (Series: P1 ${state.bestOf3Rounds.p1} - ${state.bestOf3Rounds.p2} P2)`;
    }
  }

  // Confetti Blast
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#ff3b56', '#4caf50', '#ffeb3b', '#00e5ff', '#ff9800']
  });
}

// Event Bindings
function bindEvents() {
  const viewport = document.getElementById('viewport');

  // 1. Intro Start Button
  const introStartBtn = document.getElementById('btn-intro-start');
  if (introStartBtn) {
    introStartBtn.addEventListener('click', () => {
      sound.playClick();
      showScreen('home');
    });
  }

  // 2. Poison Reveal Ready Button
  const poisonReadyBtn = document.getElementById('btn-poison-ready');
  if (poisonReadyBtn) {
    poisonReadyBtn.addEventListener('click', () => {
      sound.playClick();
      beginCountdown();
    });
  }

  // 3. Unified Sound Toggle
  const updateSoundUI = () => {
    const icon = state.soundEnabled ? '🔊' : '🔇';
    const soundIcon = document.getElementById('sound-icon');
    const hudSoundBtn = document.getElementById('btn-hud-sound');
    const sBox = document.getElementById('setting-sound');

    if (soundIcon) soundIcon.textContent = icon;
    if (hudSoundBtn) hudSoundBtn.textContent = icon;
    if (sBox) sBox.checked = state.soundEnabled;
  };

  const soundBtn = document.getElementById('quick-sound-btn');
  soundBtn.addEventListener('click', () => {
    state.soundEnabled = sound.toggleSound();
    updateSoundUI();
    persistSettings();
    sound.playClick();
  });

  const hudSoundBtn = document.getElementById('btn-hud-sound');
  if (hudSoundBtn) {
    hudSoundBtn.addEventListener('click', () => {
      state.soundEnabled = sound.toggleSound();
      updateSoundUI();
      persistSettings();
      sound.playClick();
    });
  }

  // Seating Orientation Flip
  const flipBtn = document.getElementById('quick-flip-btn');
  const flipLabel = document.getElementById('flip-label');
  const toggleOrientation = () => {
    state.faceToFace = !state.faceToFace;
    flipLabel.textContent = state.faceToFace ? 'Opposite' : 'Same';
    viewport.classList.toggle('face-to-face', state.faceToFace);
    if (game) {
      game.options.faceToFace = state.faceToFace;
    }
    document.querySelectorAll('#control-seating .segmented-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.val === (state.faceToFace ? 'opposite' : 'same'));
    });
    persistSettings();
    sound.playClick();
  };
  flipBtn.addEventListener('click', toggleOrientation);

  // Frame Simulator Toggle
  const frameBtn = document.getElementById('quick-frame-btn');
  const frameIcon = document.getElementById('frame-icon');
  frameBtn.addEventListener('click', () => {
    state.simulatorFrame = !state.simulatorFrame;
    viewport.classList.toggle('simulator-frame', state.simulatorFrame);
    frameIcon.textContent = state.simulatorFrame ? '📱' : '🖥️';
    const fBox = document.getElementById('setting-frame');
    if (fBox) fBox.checked = state.simulatorFrame;
    persistSettings();
    if (game) game.resize();
    sound.playClick();
  });

  // Verilog Hardware Logic Monitor Toggle
  const hwBtn = document.getElementById('quick-hw-btn');
  const hwMonitor = document.getElementById('hw-logic-monitor');
  const closeHwBtn = document.getElementById('btn-close-hw-monitor');

  if (hwBtn && hwMonitor) {
    hwBtn.addEventListener('click', () => {
      sound.playClick();
      hwMonitor.classList.toggle('active');
      if (game && hwMonitor.classList.contains('active')) {
        renderHardwareTelemetry(game.hw.getHardwareTelemetry());
      }
    });
  }

  if (closeHwBtn && hwMonitor) {
    closeHwBtn.addEventListener('click', () => {
      sound.playClick();
      hwMonitor.classList.remove('active');
    });
  }

  // Game HUD buttons
  const pauseBtn = document.getElementById('btn-pause-match');
  pauseBtn.addEventListener('click', () => {
    if (game) game.pause();
    openModal('modal-pause');
  });

  const hudFlipBtn = document.getElementById('btn-hud-flip');
  hudFlipBtn.addEventListener('click', toggleOrientation);

  // Pause Modal actions
  document.getElementById('btn-resume-match').addEventListener('click', () => {
    closeModal('modal-pause');
    if (game) game.resume();
  });

  document.getElementById('btn-restart-match').addEventListener('click', () => {
    closeModal('modal-pause');
    startMatchWorkflow();
  });

  document.getElementById('btn-quit-match').addEventListener('click', () => {
    closeModal('modal-pause');
    if (game) game.isRunning = false;
    showScreen('home');
  });

  // Home Screen actions
  document.getElementById('btn-play-duel').addEventListener('click', () => {
    state.bestOf3Rounds = { p1: 0, p2: 0, currentRound: 1 };
    startMatchWorkflow();
  });

  document.getElementById('btn-how-to').addEventListener('click', () => {
    openModal('modal-how-to');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    openModal('modal-settings');
  });

  // Mode Selection Cards (No Emojis)
  document.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      sound.playClick();
      document.querySelectorAll('.mode-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.gameMode = card.dataset.mode;
      persistSettings();
    });
  });

  // How to Play Modal
  document.getElementById('btn-close-how-to').addEventListener('click', () => {
    closeModal('modal-how-to');
  });
  document.getElementById('btn-how-to-ok').addEventListener('click', () => {
    closeModal('modal-how-to');
    startMatchWorkflow();
  });

  // Settings Modal Controls
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    closeModal('modal-settings');
  });
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    closeModal('modal-settings');
  });

  const settingSound = document.getElementById('setting-sound');
  settingSound.addEventListener('change', (e) => {
    state.soundEnabled = sound.soundEnabled = e.target.checked;
    updateSoundUI();
    persistSettings();
  });

  const settingMusic = document.getElementById('setting-music');
  settingMusic.addEventListener('change', (e) => {
    state.musicEnabled = e.target.checked;
    if (state.musicEnabled) {
      sound.musicEnabled = true;
      sound.startBGM();
    } else {
      sound.stopBGM();
    }
    persistSettings();
  });

  const settingFrame = document.getElementById('setting-frame');
  settingFrame.addEventListener('change', (e) => {
    state.simulatorFrame = e.target.checked;
    viewport.classList.toggle('simulator-frame', state.simulatorFrame);
    frameIcon.textContent = state.simulatorFrame ? '📱' : '🖥️';
    persistSettings();
    if (game) game.resize();
  });

  // Seating segmented control
  document.querySelectorAll('#control-seating .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.playClick();
      document.querySelectorAll('#control-seating .segmented-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.faceToFace = btn.dataset.val === 'opposite';
      flipLabel.textContent = state.faceToFace ? 'Opposite' : 'Same';
      viewport.classList.toggle('face-to-face', state.faceToFace);
      if (game) game.options.faceToFace = state.faceToFace;
      persistSettings();
    });
  });

  // Duration segmented control
  document.querySelectorAll('#control-duration .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.playClick();
      document.querySelectorAll('#control-duration .segmented-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.duration = parseInt(btn.dataset.val, 10);
      persistSettings();
    });
  });

  // Poison rate segmented control
  document.querySelectorAll('#control-poison .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.playClick();
      document.querySelectorAll('#control-poison .segmented-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.poisonRate = btn.dataset.val;
      if (game) game.options.poisonRate = state.poisonRate;
      persistSettings();
    });
  });

  // Result Actions
  document.getElementById('btn-rematch').addEventListener('click', () => {
    sound.playClick();
    startMatchWorkflow();
  });

  document.getElementById('btn-result-home').addEventListener('click', () => {
    sound.playClick();
    showScreen('home');
  });

  // Resize listener
  window.addEventListener('resize', () => {
    if (game) game.resize();
  });
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', initApp);
