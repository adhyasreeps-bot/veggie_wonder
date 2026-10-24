# 🥕 Veggie Wonder ⚔️

A vibrant, 2-player split-screen arcade reflex battle game inspired by the 3D animated style of **Veggie Wonder Stories**. Two players duel on a single device, tapping and swiping synchronized fruits/veggies to rack up reflex speed combos while avoiding the designated **Round Poison Fruit**!

---

## 🎮 Core Features

- **Split-Screen Dual Arena with Centered Separation Boards**:
  - **Player 1 Board**: Placed directly on the top edge of the central wooden separation bar.
  - **Player 2 Board**: Placed directly on the bottom edge of the central wooden separation bar.
  - **Face-to-Face Mode**: Rotate Player 1's perspective and board 180° so two players sitting across a table or holding a phone can duel upright simultaneously!
  - **Multi-Touch Support**: Both players can tap, swipe, and slice fruits at the exact same moment without input interference.

- **Synchronized Fruit Waves & Reflex Duel**:
  - Both players receive the **exact same fruit at the exact same time**.
  - The player who taps/slices the fruit with less reaction time wins the fruit duel and scores a **Reflex Speed Bonus**!
  - Floaty, balanced, and pleasant fruit arcs that hang gracefully in the air for satisfying slicing.
  - Fruits spawn continuously throughout the entire match.

- **Pre-Round Single Poison Target Reveal**:
  - Before each round begins, a single fruit from the roster is designated as the **Poison Fruit for that round**!
  - Animated reveal card showcases the chosen fruit with toxic purple aura, orbiting mini skulls, and audio warning.
  - Slicing the designated poison fruit triggers an **instant knockout**!

- **Web Audio API Synthesizer**:
  - Crisp blade slices, juicy splats, ascending combo chimes, toxic warning hums, defeat buzzers, and a cheerful pastoral arcade BGM synthesizer.

- **⚡ Verilog Digital Logic Core (EDA Playground)**:
  - Game logic (reflex arbitration, speed bonus ALU, combo multiplier shifts, 12-bit score accumulators, and poison gate detection) is modeled in **synthesizable Verilog HDL** in [`verilog/design.sv`](./verilog/design.sv) with testbench [`verilog/testbench.sv`](./verilog/testbench.sv).
  - The web application executes a cycle-accurate gate-level digital hardware core ([`src/verilog_hardware_core.js`](./src/verilog_hardware_core.js)) directly driving the game logic.
  - Interactive **Hardware RTL Monitor** in the UI displays live clock cycles, gate wires, and binary register buses during gameplay!

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

---

## 💻 Running the Verilog Logic in EDA Playground

1. Go to [**EDA Playground**](https://www.edaplayground.com/).
2. Select **SystemVerilog/Verilog** and choose **Icarus Verilog 0.10.0** (or Aldec Riviera Pro / VCS).
3. Check the **"Open EPWave after run"** checkbox.
4. Copy [`verilog/design.sv`](./verilog/design.sv) into the left pane.
5. Copy [`verilog/testbench.sv`](./verilog/testbench.sv) into the right pane.
6. Click **Run** to simulate and view the waveform VCD!
