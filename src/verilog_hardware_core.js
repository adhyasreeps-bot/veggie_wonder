/**
 * ============================================================================
 * VEGGIE WONDER - VERILOG GATE-LEVEL HARDWARE EMULATION CORE
 * 1-to-1 Cycle-Accurate Gate & RTL Logic Engine matching verilog/design.sv
 *
 * Replaces procedural JavaScript math with structural digital logic gates:
 * - Fundamental Logic Gates: AND, OR, XOR, XNOR, NOT, MUX
 * - Structural Gate-Level Poison Detector (XNOR equality + 3-input AND)
 * - Hardware Magnitude Comparators & Priority Reflex Arbiter
 * - Combinational ROM Fruit Points Decoder
 * - Arithmetic Scoring ALU with bitwise shift combo scaling (1.5x, 2.0x)
 * - 4-bit Synchronous Combo Registers
 * - 12-bit Score Accumulators with saturation logic
 * - 6-State Hardware Finite State Machine (FSM)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. FUNDAMENTAL DIGITAL LOGIC GATES (Primitive Hardware Gates)
// ----------------------------------------------------------------------------
export const Gate = {
  NOT: (a) => (~a) & 1,
  AND: (a, b) => (a & b) & 1,
  OR:  (a, b) => (a | b) & 1,
  XOR: (a, b) => (a ^ b) & 1,
  XNOR: (a, b) => (~(a ^ b)) & 1,
  NAND: (a, b) => (~(a & b)) & 1,
  NOR:  (a, b) => (~(a | b)) & 1,
  MUX2: (sel, a, b) => (sel ? b : a) & 1,

  // 3-bit equality comparator using XNOR gates and 3-input AND tree
  COMP_EQ3: (a3, b3) => {
    const bit0_eq = (~((a3 & 1) ^ (b3 & 1))) & 1;
    const bit1_eq = (~(((a3 >> 1) & 1) ^ ((b3 >> 1) & 1))) & 1;
    const bit2_eq = (~(((a3 >> 2) & 1) ^ ((b3 >> 2) & 1))) & 1;
    return (bit0_eq & bit1_eq & bit2_eq) & 1;
  }
};

// Fruit Name <-> 3-bit Hardware Wire Encoding
export const FRUIT_TYPE_ENCODING = {
  watermelon: 0,   // 3'b000 (20 pts)
  apple: 1,        // 3'b001 (10 pts)
  banana: 2,       // 3'b010 (15 pts)
  orange: 3,       // 3'b011 (12 pts)
  strawberry: 4,   // 3'b100 (15 pts)
  pineapple: 5,    // 3'b101 (25 pts)
  poison_berry: 6  // 3'b110 (0 pts, Inherent Toxic)
};

export const REVERSE_FRUIT_ENCODING = {
  0: 'watermelon',
  1: 'apple',
  2: 'banana',
  3: 'orange',
  4: 'strawberry',
  5: 'pineapple',
  6: 'poison_berry'
};

// FSM State Encodings (3'bXXX)
export const HW_STATE = {
  IDLE: 0,          // 3'b000
  POISON_REVEAL: 1, // 3'b001
  COUNTDOWN: 2,     // 3'b010
  PLAYING: 3,       // 3'b011
  PAUSED: 4,        // 3'b100
  GAME_OVER: 5      // 3'b101
};

export const HW_GAME_OVER_REASON = {
  TIMEOUT: 0,       // 2'b00
  POISON: 1,        // 2'b01
  SCORE_CAP: 2      // 2'b10
};

// ----------------------------------------------------------------------------
// 2. GATE-LEVEL POISON DETECTOR MODULE (poison_detector_gates)
// ----------------------------------------------------------------------------
export class PoisonDetectorGates {
  evaluate(fruitType3Bit, roundPoisonType3Bit, isValid) {
    // 3-bit equality comparator using XNOR and 3-input AND gate
    const xnor0 = Gate.XNOR(fruitType3Bit & 1, roundPoisonType3Bit & 1);
    const xnor1 = Gate.XNOR((fruitType3Bit >> 1) & 1, (roundPoisonType3Bit >> 1) & 1);
    const xnor2 = Gate.XNOR((fruitType3Bit >> 2) & 1, (roundPoisonType3Bit >> 2) & 1);
    const type_match = Gate.AND(Gate.AND(xnor0, xnor1), xnor2);

    // Inherent poison is type 3'b110 (6)
    // Gate logic: bit[2] AND bit[1] AND NOT(bit[0])
    const is_inherent_poison = Gate.AND(
      Gate.AND((fruitType3Bit >> 2) & 1, (fruitType3Bit >> 1) & 1),
      Gate.NOT(fruitType3Bit & 1)
    );

    // 2-input OR gate
    const poison_combined = Gate.OR(type_match, is_inherent_poison);

    // Output qualified with valid signal
    return Gate.AND(poison_combined, isValid ? 1 : 0) === 1;
  }
}

// ----------------------------------------------------------------------------
// 3. COMBINATIONAL FRUIT POINTS DECODER (fruit_points_decoder)
// ----------------------------------------------------------------------------
export class FruitPointsDecoder {
  decode(fruitType3Bit) {
    switch (fruitType3Bit & 7) {
      case 0: return 20; // Watermelon
      case 1: return 10; // Apple
      case 2: return 15; // Banana
      case 3: return 12; // Orange
      case 4: return 15; // Strawberry
      case 5: return 25; // Pineapple
      case 6: return 0;  // Poison Berry
      default: return 0;
    }
  }
}

// ----------------------------------------------------------------------------
// 4. REFLEX COMPARATOR & PRIORITY ARBITER (reflex_arbiter)
// ----------------------------------------------------------------------------
export class ReflexArbiterHardware {
  constructor() {
    this.currentWaveIdReg = 0;
    this.waveClaimedReg = false;
    this.claimedByReg = 0; // 0: None, 1: P1, 2: P2
  }

  reset() {
    this.currentWaveIdReg = 0;
    this.waveClaimedReg = false;
    this.claimedByReg = 0;
  }

  setWave(waveId) {
    if (waveId !== this.currentWaveIdReg) {
      this.currentWaveIdReg = waveId & 0xff;
      this.waveClaimedReg = false;
      this.claimedByReg = 0;
    }
  }

  evaluateSlice(p1Strobe, p2Strobe, p1ReactionTicks, p2ReactionTicks) {
    let p1IsFaster = false;
    let p2IsFaster = false;

    if (!this.waveClaimedReg) {
      if (p1Strobe && p2Strobe) {
        // Both strobed same cycle: magnitude comparator
        if (p1ReactionTicks <= p2ReactionTicks) {
          this.waveClaimedReg = true;
          this.claimedByReg = 1;
          p1IsFaster = true;
        } else {
          this.waveClaimedReg = true;
          this.claimedByReg = 2;
          p2IsFaster = true;
        }
      } else if (p1Strobe) {
        this.waveClaimedReg = true;
        this.claimedByReg = 1;
        p1IsFaster = true;
      } else if (p2Strobe) {
        this.waveClaimedReg = true;
        this.claimedByReg = 2;
        p2IsFaster = true;
      }
    } else {
      if (p1Strobe) p1IsFaster = (this.claimedByReg === 1);
      if (p2Strobe) p2IsFaster = (this.claimedByReg === 2);
    }

    return {
      p1IsFaster,
      p2IsFaster,
      claimed: this.waveClaimedReg,
      claimedBy: this.claimedByReg
    };
  }
}

// ----------------------------------------------------------------------------
// 5. SPEED BONUS & COMBO SCORING ALU (scoring_alu)
// ----------------------------------------------------------------------------
export class ScoringALU {
  calculate(basePoints, reactionTicks, isFaster, comboCount) {
    let speedBonus = 0;
    let unscaledPoints = 0;

    if (isFaster) {
      // Hardware magnitude comparator for reaction speed bonus
      if (reactionTicks <= 20)       speedBonus = 25; // <= 0.20s
      else if (reactionTicks <= 40)  speedBonus = 20; // <= 0.40s
      else if (reactionTicks <= 60)  speedBonus = 15; // <= 0.60s
      else if (reactionTicks <= 80)  speedBonus = 10; // <= 0.80s
      else                           speedBonus = 5;  // > 0.80s

      unscaledPoints = (basePoints + speedBonus) & 0x3ff;
    } else {
      speedBonus = 0;
      // Slower player gets partial reflex points (40%): (basePoints * 4) / 10
      unscaledPoints = basePoints >= 5 ? Math.floor((basePoints * 4) / 10) : 2;
    }

    // Hardware Combo Multiplier Logic:
    // Combo >= 4: Shift left 1 (2.0x)
    // Combo >= 2: Value + (Value >> 1) (1.5x)
    // Combo < 2 : 1.0x
    let pointsEarned = 0;
    if (comboCount >= 4) {
      pointsEarned = (unscaledPoints << 1) & 0x3ff;
    } else if (comboCount >= 2) {
      pointsEarned = (unscaledPoints + (unscaledPoints >> 1)) & 0x3ff;
    } else {
      pointsEarned = unscaledPoints & 0x3ff;
    }

    return {
      speedBonus,
      unscaledPoints,
      pointsEarned
    };
  }
}

// ----------------------------------------------------------------------------
// 6. SYNCHRONOUS COMBO TRACKER REGISTER (combo_tracker)
// ----------------------------------------------------------------------------
export class ComboTrackerRegister {
  constructor() {
    this.comboCount = 0; // 4-bit (0..15)
    this.maxCombo = 0;
  }

  reset() {
    this.comboCount = 0;
  }

  fullReset() {
    this.comboCount = 0;
    this.maxCombo = 0;
  }

  clockValidSlice() {
    if (this.comboCount < 15) {
      this.comboCount++;
      if (this.comboCount > this.maxCombo) {
        this.maxCombo = this.comboCount;
      }
    }
    return this.comboCount;
  }
}

// ----------------------------------------------------------------------------
// 7. 12-BIT SCORE ACCUMULATOR REGISTER (score_accumulator)
// ----------------------------------------------------------------------------
export class ScoreAccumulatorRegister {
  constructor() {
    this.totalScore = 0; // 12-bit (0..4095)
  }

  reset() {
    this.totalScore = 0;
  }

  add(points) {
    const next = this.totalScore + points;
    // Saturation protection at 12'hFFF (4095)
    this.totalScore = next > 4095 ? 4095 : next;
    return this.totalScore;
  }
}

// ----------------------------------------------------------------------------
// 8. GAME CONTROLLER FSM (game_controller_fsm)
// ----------------------------------------------------------------------------
export class GameControllerFSM {
  constructor() {
    this.state = HW_STATE.IDLE;
    this.timeRemaining = 60;
    this.gameActive = false;
    this.gameOver = false;
    this.winnerId = 0; // 0: None/Tie, 1: P1, 2: P2
    this.gameOverReason = HW_GAME_OVER_REASON.TIMEOUT;
  }

  reset() {
    this.state = HW_STATE.IDLE;
    this.timeRemaining = 60;
    this.gameActive = false;
    this.gameOver = false;
    this.winnerId = 0;
    this.gameOverReason = HW_GAME_OVER_REASON.TIMEOUT;
  }

  cmdStartMatch(duration = 60) {
    this.timeRemaining = duration & 0xff;
    this.gameOver = false;
    this.winnerId = 0;
    this.state = HW_STATE.POISON_REVEAL;
    this.gameActive = false;
  }

  cmdPoisonReady() {
    if (this.state === HW_STATE.POISON_REVEAL) {
      this.state = HW_STATE.COUNTDOWN;
    }
  }

  cmdCountdownDone() {
    if (this.state === HW_STATE.COUNTDOWN) {
      this.state = HW_STATE.PLAYING;
      this.gameActive = true;
    }
  }

  cmdPauseToggle() {
    if (this.state === HW_STATE.PLAYING) {
      this.state = HW_STATE.PAUSED;
      this.gameActive = false;
    } else if (this.state === HW_STATE.PAUSED) {
      this.state = HW_STATE.PLAYING;
      this.gameActive = true;
    }
  }

  timerTick(gameMode, p1Score, p2Score) {
    if (this.state === HW_STATE.PLAYING && this.timeRemaining > 0) {
      this.timeRemaining--;
      if (this.timeRemaining === 0) {
        this.triggerGameOver(HW_GAME_OVER_REASON.TIMEOUT, p1Score, p2Score);
      }
    }
  }

  triggerPoisonLoss(loserId, p1Score, p2Score) {
    const winnerId = loserId === 1 ? 2 : 1;
    this.winnerId = winnerId;
    this.gameOverReason = HW_GAME_OVER_REASON.POISON;
    this.state = HW_STATE.GAME_OVER;
    this.gameActive = false;
    this.gameOver = true;
  }

  triggerSuddenDeath(p1Score, p2Score) {
    this.triggerGameOver(HW_GAME_OVER_REASON.SCORE_CAP, p1Score, p2Score);
  }

  triggerGameOver(reason, p1Score, p2Score) {
    this.state = HW_STATE.GAME_OVER;
    this.gameActive = false;
    this.gameOver = true;
    this.gameOverReason = reason;

    if (p1Score > p2Score) {
      this.winnerId = 1;
    } else if (p2Score > p1Score) {
      this.winnerId = 2;
    } else {
      this.winnerId = 0; // Tie
    }
  }
}

// ============================================================================
// 9. UNIFIED HARDWARE CHIP: VeggieWonderTopHardware
// Complete virtual hardware chip combining all modules and exposed to JS
// ============================================================================
export class VeggieWonderTopHardware {
  constructor() {
    // Instantiated gate circuits and hardware modules
    this.poisonDetector = new PoisonDetectorGates();
    this.pointsDecoder = new FruitPointsDecoder();
    this.arbiter = new ReflexArbiterHardware();
    this.alu = new ScoringALU();

    // Player 1 Hardware Registers
    this.p1Combo = new ComboTrackerRegister();
    this.p1Score = new ScoreAccumulatorRegister();

    // Player 2 Hardware Registers
    this.p2Combo = new ComboTrackerRegister();
    this.p2Score = new ScoreAccumulatorRegister();

    // Master FSM
    this.fsm = new GameControllerFSM();

    // Hardware Configuration Wires
    this.roundPoisonType = 1; // 3-bit: Apple by default
    this.gameMode = 0;        // 2-bit: 0: Classic, 1: Speed, 2: SuddenDeath, 3: BestOf3
    this.currentWaveId = 0;
    this.currentFruitType = 0;
    this.isWavePoison = false;

    // Last cycle probe telemetry for Hardware Monitor UI
    this.probe = {
      clockCount: 0,
      lastEvent: 'RESET',
      p1LastPoints: 0,
      p2LastPoints: 0,
      p1LastReactionTicks: 0,
      p2LastReactionTicks: 0,
      p1IsFasterWire: false,
      p2IsFasterWire: false,
      isPoisonWire: false,
      p1PoisonTripWire: false,
      p2PoisonTripWire: false
    };
  }

  resetAll() {
    this.probe.clockCount = 0;
    this.arbiter.reset();
    this.p1Combo.fullReset();
    this.p1Score.reset();
    this.p2Combo.fullReset();
    this.p2Score.reset();
    this.fsm.reset();
    this.probe.lastEvent = 'HARDWARE_RESET';
  }

  configureMatch({ mode = 'classic', duration = 60, poisonType = 'apple' }) {
    // Encode game mode to 2-bit
    let modeCode = 0;
    if (mode === 'speed') modeCode = 1;
    else if (mode === 'suddendeath') modeCode = 2;
    else if (mode === 'bestof3') modeCode = 3;
    this.gameMode = modeCode;

    // Encode poison type to 3-bit
    this.roundPoisonType = FRUIT_TYPE_ENCODING[poisonType] ?? 1;

    // Clear hardware accumulators
    this.p1Score.reset();
    this.p2Score.reset();
    this.p1Combo.reset();
    this.p2Combo.reset();
    this.arbiter.reset();

    // Trigger FSM to POISON_REVEAL
    this.fsm.cmdStartMatch(duration);
    this.probe.lastEvent = 'FSM_POISON_REVEAL';
  }

  cmdPoisonReady() {
    this.fsm.cmdPoisonReady();
    this.probe.lastEvent = 'FSM_COUNTDOWN';
  }

  cmdCountdownDone() {
    this.fsm.cmdCountdownDone();
    this.probe.lastEvent = 'FSM_PLAYING';
  }

  cmdPauseToggle() {
    this.fsm.cmdPauseToggle();
    this.probe.lastEvent = this.fsm.gameActive ? 'FSM_RESUMED' : 'FSM_PAUSED';
  }

  clockSecondTick() {
    this.probe.clockCount++;
    this.fsm.timerTick(this.gameMode, this.p1Score.totalScore, this.p2Score.totalScore);
    return {
      timeRemaining: this.fsm.timeRemaining,
      gameOver: this.fsm.gameOver,
      winnerId: this.fsm.winnerId,
      reason: this.fsm.gameOverReason
    };
  }

  // Set synchronized wave parameters on hardware input bus
  spawnWave(waveId, fruitTypeStr) {
    this.probe.clockCount++;
    this.currentWaveId = waveId & 0xff;
    this.currentFruitType = FRUIT_TYPE_ENCODING[fruitTypeStr] ?? 0;

    // Evaluate gate-level poison detector circuit
    this.isWavePoison = this.poisonDetector.evaluate(
      this.currentFruitType,
      this.roundPoisonType,
      true
    );

    this.probe.isPoisonWire = this.isWavePoison;
    this.probe.lastEvent = `WAVE_SPAWN (id: ${waveId}, type: ${this.currentFruitType}, isPoison: ${this.isWavePoison})`;

    // Reset arbiter for new wave
    this.arbiter.setWave(this.currentWaveId);

    return {
      isPoison: this.isWavePoison,
      fruitTypeIndex: this.currentFruitType
    };
  }

  // Clock a slice pulse from Player 1 or Player 2 into the hardware netlist
  clockSlice(playerId, reactionSeconds) {
    this.probe.clockCount++;
    if (!this.fsm.gameActive) {
      return { ignored: true };
    }

    // Convert reaction time in seconds to 10ms hardware ticks (0.24s -> 24 ticks)
    const reactionTicks = Math.max(1, Math.min(255, Math.round(reactionSeconds * 100)));

    const isP1 = (playerId === 1);
    const p1Strobe = isP1;
    const p2Strobe = !isP1;

    // 1. Poison Trip Circuit Check
    if (this.isWavePoison) {
      if (isP1) {
        this.probe.p1PoisonTripWire = true;
        this.fsm.triggerPoisonLoss(1, this.p1Score.totalScore, this.p2Score.totalScore);
      } else {
        this.probe.p2PoisonTripWire = true;
        this.fsm.triggerPoisonLoss(2, this.p1Score.totalScore, this.p2Score.totalScore);
      }
      this.probe.lastEvent = `POISON_HIT_KNOCKOUT (Player ${playerId})`;
      return {
        isPoison: true,
        gameOver: true,
        loserId: playerId,
        winnerId: isP1 ? 2 : 1,
        reason: 'poison'
      };
    }

    // 2. Reflex Arbiter Evaluation
    const arbResult = this.arbiter.evaluateSlice(
      p1Strobe,
      p2Strobe,
      isP1 ? reactionTicks : 999,
      !isP1 ? reactionTicks : 999
    );

    const isFaster = isP1 ? arbResult.p1IsFaster : arbResult.p2IsFaster;
    if (isP1) {
      this.probe.p1IsFasterWire = isFaster;
      this.probe.p1LastReactionTicks = reactionTicks;
    } else {
      this.probe.p2IsFasterWire = isFaster;
      this.probe.p2LastReactionTicks = reactionTicks;
    }

    // 3. Decode Fruit Base Points via Hardware LUT
    const basePoints = this.pointsDecoder.decode(this.currentFruitType);

    // 4. Update Combo Tracker Register
    const playerComboReg = isP1 ? this.p1Combo : this.p2Combo;
    const newCombo = playerComboReg.clockValidSlice();

    // 5. Execute Hardware Scoring ALU
    const aluResult = this.alu.calculate(basePoints, reactionTicks, isFaster, newCombo);
    const pointsEarned = aluResult.pointsEarned;

    // 6. Accumulate into 12-bit Score Register
    const playerScoreReg = isP1 ? this.p1Score : this.p2Score;
    const newScore = playerScoreReg.add(pointsEarned);

    if (isP1) this.probe.p1LastPoints = pointsEarned;
    else      this.probe.p2LastPoints = pointsEarned;

    // 7. Check Sudden Death Mode Cap (50 pts threshold)
    if (this.gameMode === 2 && (this.p1Score.totalScore >= 50 || this.p2Score.totalScore >= 50)) {
      this.fsm.triggerSuddenDeath(this.p1Score.totalScore, this.p2Score.totalScore);
    }

    this.probe.lastEvent = `SLICE_P${playerId} (pts: +${pointsEarned}, fast: ${isFaster}, combo: ${newCombo}, score: ${newScore})`;

    return {
      isPoison: false,
      isFaster,
      reactionTimeFormatted: (reactionTicks / 100).toFixed(2),
      pointsEarned,
      speedBonus: aluResult.speedBonus,
      combo: newCombo,
      score: newScore,
      p1Score: this.p1Score.totalScore,
      p2Score: this.p2Score.totalScore,
      p1Combo: this.p1Combo.comboCount,
      p2Combo: this.p2Combo.comboCount,
      gameOver: this.fsm.gameOver,
      winnerId: this.fsm.winnerId,
      reason: this.fsm.gameOverReason === HW_GAME_OVER_REASON.SCORE_CAP ? 'score_cap' : 'timeout'
    };
  }

  // Clear combo register on timeout cooldown
  clockComboTimeout(playerId) {
    if (playerId === 1) this.p1Combo.reset();
    if (playerId === 2) this.p2Combo.reset();
  }

  // Probe telemetry snapshot for the HUD monitor
  getHardwareTelemetry() {
    return {
      state: this.fsm.state,
      stateName: Object.keys(HW_STATE).find(k => HW_STATE[k] === this.fsm.state) || 'UNKNOWN',
      timeRemaining: this.fsm.timeRemaining,
      p1Score: this.p1Score.totalScore,
      p2Score: this.p2Score.totalScore,
      p1Combo: this.p1Combo.comboCount,
      p2Combo: this.p2Combo.comboCount,
      roundPoisonType: this.roundPoisonType,
      currentFruitType: this.currentFruitType,
      isWavePoison: this.isWavePoison,
      probe: this.probe
    };
  }
}
