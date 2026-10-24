# 🥕 Veggie Wonder — Verilog Hardware Core (EDA Playground)

This directory contains the complete digital logic design and gate-level RTL implementation of the **Veggie Wonder** game logic, written in Verilog HDL and verified for simulation in [EDA Playground](https://www.edaplayground.com/).

---

## 📁 Files

- **`design.sv`**: The hardware description of the Veggie Wonder logic:
  - `poison_detector_gates`: Structural logic gate implementation of 3-bit XNOR equality comparators and AND/OR poison detector.
  - `reflex_arbiter`: Synchronized wave reflex speed priority arbiter and latch.
  - `fruit_points_decoder`: Combinational look-up table decoding fruit types to base points.
  - `scoring_alu`: Magnitude comparator for reflex reaction speed bonus (+25, +20, +15, +10, +5) and combo multiplier arithmetic scaling (1.5x, 2.0x).
  - `combo_tracker`: Up to 4-bit synchronous streak counter with auto-clear on timeout or poison hit.
  - `score_accumulator`: 12-bit registers with adder and saturation protection (up to 4095).
  - `game_controller_fsm`: 6-state Moore/Mealy Finite State Machine (`IDLE`, `POISON_REVEAL`, `COUNTDOWN`, `PLAYING`, `PAUSED`, `GAME_OVER`).
  - `best_of_3_arbiter`: Round-win tracker and series championship detector.
  - `veggie_wonder_top`: Top-level chip integration.

- **`testbench.sv`**: Comprehensive testbench simulating:
  - System reset and FSM state progression.
  - Synchronized wave spawning and reflex duel arbitration.
  - Reaction time speed bonuses and combo multiplier streaks.
  - Poison fruit detection and instant knockout game over.
  - Full VCD waveform generation for viewing in **EPWave**.

---

## 🚀 How to Run on EDA Playground (Step-by-Step)

1. Open [**EDA Playground**](https://www.edaplayground.com/) in your browser.
2. In the left panel under **Languages & Tools**:
   - **Testbench + Design**: Choose `SystemVerilog/Verilog`.
   - **Simulator**: Choose `Icarus Verilog 0.10.0` (or `Aldec Riviera Pro`, `Synopsys VCS`).
   - Check the box **"Open EPWave after run"** (to see the visual waveform timeline).
3. Copy the contents of [`verilog/design.sv`](./design.sv) and paste them into the left editor pane (**design.sv**).
4. Copy the contents of [`verilog/testbench.sv`](./testbench.sv) and paste them into the right editor pane (**testbench.sv**).
5. Click the green **"Run"** button at the top.
6. **Results**:
   - The log console at the bottom will display the simulation timeline, point updates, and test assertions (`✅ ALL HARDWARE LOGIC TESTS PASSED WITH 100% SUCCESS!`).
   - The EPWave waveform viewer will open, displaying the clock pulses, FSM state bus, score accumulators, and poison trip wires!
