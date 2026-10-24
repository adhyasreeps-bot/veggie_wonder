// ============================================================================
// VEGGIE WONDER - HARDWARE GAME LOGIC CORE (VERILOG HDL / GATE-LEVEL RTL)
// Compatible with EDA Playground (Icarus Verilog, Riviera Pro, VCS, Verilator)
//
// Features:
// 1. Gate-level poison fruit detection using XNOR, AND, and OR logic
// 2. Synchronized wave reflex comparator & priority arbiter
// 3. Fruit points decoder & speed bonus ALU
// 4. Combo streak tracking with 1.5x and 2.0x arithmetic scaling
// 5. 12-bit score accumulators for Player 1 and Player 2
// 6. Complete Game Controller FSM (IDLE, REVEAL, COUNTDOWN, PLAYING, PAUSED, GAME_OVER)
// 7. Best-of-3 series arbiter & Sudden Death score-cap monitor
// ============================================================================

`timescale 1ns / 1ps

// ----------------------------------------------------------------------------
// 1. POISON FRUIT DETECTOR (Gate-Level Implementation)
// Compares fruit type against round-designated poison target or inherent poison
// ----------------------------------------------------------------------------
module poison_detector_gates (
    input  wire [2:0] fruit_type,
    input  wire [2:0] round_poison_type,
    input  wire       valid,
    output wire       is_poison
);
    // Bitwise XNOR equality checking using fundamental gates
    wire xnor0, xnor1, xnor2;
    wire type_match;
    wire is_inherent_poison;
    wire poison_combined;

    // XNOR gate is 1 when both bits are equal
    assign xnor0 = ~(fruit_type[0] ^ round_poison_type[0]);
    assign xnor1 = ~(fruit_type[1] ^ round_poison_type[1]);
    assign xnor2 = ~(fruit_type[2] ^ round_poison_type[2]);

    // 3-input AND gate: true if all 3 bits match the designated round poison
    assign type_match = xnor0 & xnor1 & xnor2;

    // Inherent poison is type 3'b110 (value 6 = Poison Skull Berry)
    // Gate logic: fruit_type[2] AND fruit_type[1] AND NOT(fruit_type[0])
    assign is_inherent_poison = fruit_type[2] & fruit_type[1] & (~fruit_type[0]);

    // 2-input OR gate: poison if matches round target OR inherent toxic fruit
    assign poison_combined = type_match | is_inherent_poison;

    // Output gate: qualified with valid signal
    assign is_poison = poison_combined & valid;
endmodule


// ----------------------------------------------------------------------------
// 2. FRUIT BASE POINTS DECODER (Combinational LUT)
// Decodes 3-bit fruit type to 8-bit base point score
// ----------------------------------------------------------------------------
module fruit_points_decoder (
    input  wire [2:0] fruit_type,
    output reg  [7:0] base_points
);
    always @(*) begin
        case (fruit_type)
            3'd0: base_points = 8'd20; // Watermelon
            3'd1: base_points = 8'd10; // Apple
            3'd2: base_points = 8'd15; // Banana
            3'd3: base_points = 8'd12; // Orange
            3'd4: base_points = 8'd15; // Strawberry
            3'd5: base_points = 8'd25; // Pineapple
            3'd6: base_points = 8'd0;  // Poison Berry (0 points)
            default: base_points = 8'd0;
        endcase
    end
endmodule


// ----------------------------------------------------------------------------
// 3. REFLEX COMPARATOR & PRIORITY ARBITER
// Determines which player sliced first on a synchronized wave
// ----------------------------------------------------------------------------
module reflex_arbiter (
    input  wire        clk,
    input  wire        rst_n,
    input  wire [7:0]  wave_id,
    input  wire        wave_active,
    input  wire        p1_slice_strobe,
    input  wire        p2_slice_strobe,
    input  wire [7:0]  p1_reaction_time, // In units of 10ms (e.g. 25 = 0.25s)
    input  wire [7:0]  p2_reaction_time,
    output reg         p1_is_faster,
    output reg         p2_is_faster,
    output reg         wave_claimed
);
    reg [7:0] current_wave_id_reg;
    reg       wave_claimed_reg;
    reg [1:0] claimed_by_reg; // 1: P1, 2: P2

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            current_wave_id_reg <= 8'd0;
            wave_claimed_reg    <= 1'b0;
            claimed_by_reg      <= 2'd0;
            p1_is_faster        <= 1'b0;
            p2_is_faster        <= 1'b0;
            wave_claimed        <= 1'b0;
        end else begin
            // Reset claim on new wave arrival
            if (wave_active && (wave_id != current_wave_id_reg)) begin
                current_wave_id_reg <= wave_id;
                wave_claimed_reg    <= 1'b0;
                claimed_by_reg      <= 2'd0;
                p1_is_faster        <= 1'b0;
                p2_is_faster        <= 1'b0;
                wave_claimed        <= 1'b0;
            end else if (wave_active && !wave_claimed_reg) begin
                // Priority Arbitration
                if (p1_slice_strobe && p2_slice_strobe) begin
                    // Both sliced in same clock cycle - evaluate reaction time magnitude
                    if (p1_reaction_time <= p2_reaction_time) begin
                        wave_claimed_reg <= 1'b1;
                        claimed_by_reg   <= 2'd1;
                        p1_is_faster     <= 1'b1;
                        p2_is_faster     <= 1'b0;
                        wave_claimed     <= 1'b1;
                    end else begin
                        wave_claimed_reg <= 1'b1;
                        claimed_by_reg   <= 2'd2;
                        p1_is_faster     <= 1'b0;
                        p2_is_faster     <= 1'b1;
                        wave_claimed     <= 1'b1;
                    end
                end else if (p1_slice_strobe) begin
                    wave_claimed_reg <= 1'b1;
                    claimed_by_reg   <= 2'd1;
                    p1_is_faster     <= 1'b1;
                    p2_is_faster     <= 1'b0;
                    wave_claimed     <= 1'b1;
                end else if (p2_slice_strobe) begin
                    wave_claimed_reg <= 1'b1;
                    claimed_by_reg   <= 2'd2;
                    p1_is_faster     <= 1'b0;
                    p2_is_faster     <= 1'b1;
                    wave_claimed     <= 1'b1;
                end
            end else begin
                // Wave was already claimed previously
                if (p1_slice_strobe) begin
                    p1_is_faster <= (claimed_by_reg == 2'd1);
                end
                if (p2_slice_strobe) begin
                    p2_is_faster <= (claimed_by_reg == 2'd2);
                end
            end
        end
    end
endmodule


// ----------------------------------------------------------------------------
// 4. SPEED BONUS & COMBO SCORING ALU
// Computes reaction time bonus and combo multiplier scaling
// ----------------------------------------------------------------------------
module scoring_alu (
    input  wire [7:0] base_points,
    input  wire [7:0] reaction_time, // 10ms ticks
    input  wire       is_faster,
    input  wire [3:0] combo_count,
    output reg  [9:0] points_earned
);
    reg [7:0] speed_bonus;
    reg [8:0] unscaled_points;

    // Magnitude comparator for speed bonus
    always @(*) begin
        if (is_faster) begin
            if (reaction_time <= 8'd20)       speed_bonus = 8'd25; // <= 0.20s
            else if (reaction_time <= 8'd40)  speed_bonus = 8'd20; // <= 0.40s
            else if (reaction_time <= 8'd60)  speed_bonus = 8'd15; // <= 0.60s
            else if (reaction_time <= 8'd80)  speed_bonus = 8'd10; // <= 0.80s
            else                              speed_bonus = 8'd5;  // > 0.80s
            
            unscaled_points = base_points + speed_bonus;
        end else begin
            speed_bonus = 8'd0;
            // Slower player gets partial score: 40% (approx: base_points * 2 / 5)
            unscaled_points = (base_points >= 8'd5) ? ((base_points * 8'd4) / 8'd10) : 9'd2;
        end
    end

    // Combo streak multiplier scaling
    // Combo >= 4: 2.0x (Shift left 1)
    // Combo >= 2: 1.5x (Value + Value >> 1)
    // Combo < 2 : 1.0x
    always @(*) begin
        if (combo_count >= 4'd4) begin
            points_earned = unscaled_points << 1;
        end else if (combo_count >= 4'd2) begin
            points_earned = unscaled_points + (unscaled_points >> 1);
        end else begin
            points_earned = {1'b0, unscaled_points};
        end
    end
endmodule


// ----------------------------------------------------------------------------
// 5. COMBO STREAK TRACKER
// Tracks active streak with auto-clear on timeout or poison
// ----------------------------------------------------------------------------
module combo_tracker (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       slice_valid,
    input  wire       combo_reset,
    output reg  [3:0] combo_count,
    output reg  [3:0] max_combo
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            combo_count <= 4'd0;
            max_combo   <= 4'd0;
        end else if (combo_reset) begin
            combo_count <= 4'd0;
        end else if (slice_valid) begin
            if (combo_count < 4'd15) begin
                combo_count <= combo_count + 1'b1;
                if ((combo_count + 1'b1) > max_combo) begin
                    max_combo <= combo_count + 1'b1;
                end
            end
        end
    end
endmodule


// ----------------------------------------------------------------------------
// 6. SCORE ACCUMULATOR
// 12-bit register with adder and saturation protection (max 4095)
// ----------------------------------------------------------------------------
module score_accumulator (
    input  wire        clk,
    input  wire        rst_n,
    input  wire        add_strobe,
    input  wire [9:0]  points_to_add,
    input  wire        clear_score,
    output reg  [11:0] total_score
);
    wire [12:0] next_score;
    assign next_score = total_score + points_to_add;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            total_score <= 12'd0;
        end else if (clear_score) begin
            total_score <= 12'd0;
        end else if (add_strobe) begin
            // Saturate at 12'hFFF (4095) if overflow
            if (next_score > 13'd4095) begin
                total_score <= 12'd4095;
            end else begin
                total_score <= next_score[11:0];
            end
        end
    end
endmodule


// ----------------------------------------------------------------------------
// 7. GAME CONTROLLER FSM & RULES ENGINE
// Manages states, match timers, poison trip knockouts, and game over
// ----------------------------------------------------------------------------
module game_controller_fsm (
    input  wire        clk,
    input  wire        rst_n,
    input  wire [1:0]  game_mode,          // 0: Classic, 1: Speed, 2: SuddenDeath, 3: BestOf3
    input  wire        cmd_start_match,
    input  wire        cmd_poison_ready,
    input  wire        cmd_countdown_done,
    input  wire        cmd_pause_toggle,
    input  wire        timer_tick_1s,      // 1-second clock pulse
    input  wire [7:0]  match_duration_cfg, // 30s, 60s, or 90s
    input  wire        p1_poison_trip,     // Sliced poison fruit!
    input  wire        p2_poison_trip,
    input  wire [11:0] p1_score,
    input  wire [11:0] p2_score,
    output reg  [2:0]  state,
    output reg  [7:0]  time_remaining,
    output reg         game_active,
    output reg         game_over,
    output reg  [1:0]  winner_id,          // 0: Tie/None, 1: P1, 2: P2
    output reg  [1:0]  game_over_reason    // 0: Timeout, 1: Poison, 2: ScoreCap
);
    // State definitions
    localparam S_IDLE          = 3'd0;
    localparam S_POISON_REVEAL = 3'd1;
    localparam S_COUNTDOWN     = 3'd2;
    localparam S_PLAYING       = 3'd3;
    localparam S_PAUSED        = 3'd4;
    localparam S_GAME_OVER     = 3'd5;

    // Reason definitions
    localparam R_TIMEOUT       = 2'd0;
    localparam R_POISON        = 2'd1;
    localparam R_SCORE_CAP     = 2'd2;

    reg [2:0] next_state;

    // FSM State Register
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state            <= S_IDLE;
            time_remaining   <= 8'd60;
            game_active      <= 1'b0;
            game_over        <= 1'b0;
            winner_id        <= 2'd0;
            game_over_reason <= 2'd0;
        end else begin
            state <= next_state;

            // Timer management
            if (next_state == S_COUNTDOWN && state != S_COUNTDOWN) begin
                time_remaining <= match_duration_cfg;
                game_over      <= 1'b0;
                winner_id      <= 2'd0;
            end else if (state == S_PLAYING && timer_tick_1s && time_remaining > 8'd0) begin
                time_remaining <= time_remaining - 1'b1;
            end

            // Game active flag
            game_active <= (next_state == S_PLAYING);

            // Winner evaluation logic
            if (next_state == S_GAME_OVER && state != S_GAME_OVER) begin
                game_over <= 1'b1;
                if (p1_poison_trip) begin
                    winner_id        <= 2'd2; // P2 wins because P1 sliced poison
                    game_over_reason <= R_POISON;
                end else if (p2_poison_trip) begin
                    winner_id        <= 2'd1; // P1 wins because P2 sliced poison
                    game_over_reason <= R_POISON;
                end else if (game_mode == 2'd2 && (p1_score >= 12'd50 || p2_score >= 12'd50)) begin
                    game_over_reason <= R_SCORE_CAP;
                    if (p1_score > p2_score)      winner_id <= 2'd1;
                    else if (p2_score > p1_score) winner_id <= 2'd2;
                    else                          winner_id <= 2'd0;
                end else begin
                    // Timeout
                    game_over_reason <= R_TIMEOUT;
                    if (p1_score > p2_score)      winner_id <= 2'd1;
                    else if (p2_score > p1_score) winner_id <= 2'd2;
                    else                          winner_id <= 2'd0; // Tie
                end
            end
        end
    end

    // Next State Logic
    always @(*) begin
        next_state = state;
        case (state)
            S_IDLE: begin
                if (cmd_start_match) next_state = S_POISON_REVEAL;
            end

            S_POISON_REVEAL: begin
                if (cmd_poison_ready) next_state = S_COUNTDOWN;
            end

            S_COUNTDOWN: begin
                if (cmd_countdown_done) next_state = S_PLAYING;
            end

            S_PLAYING: begin
                // Check poison trip knockout (Instant defeat)
                if (p1_poison_trip || p2_poison_trip) begin
                    next_state = S_GAME_OVER;
                end
                // Sudden death threshold
                else if (game_mode == 2'd2 && (p1_score >= 12'd50 || p2_score >= 12'd50)) begin
                    next_state = S_GAME_OVER;
                end
                // Timer expired
                else if (time_remaining == 8'd0) begin
                    next_state = S_GAME_OVER;
                end
                // Pause request
                else if (cmd_pause_toggle) begin
                    next_state = S_PAUSED;
                end
            end

            S_PAUSED: begin
                if (cmd_pause_toggle) next_state = S_PLAYING;
            end

            S_GAME_OVER: begin
                if (cmd_start_match) next_state = S_POISON_REVEAL;
            end

            default: next_state = S_IDLE;
        endcase
    end
endmodule


// ----------------------------------------------------------------------------
// 8. BEST OF 3 TOURNAMENT ARBITER
// Tracks series score (first to 2 round wins)
// ----------------------------------------------------------------------------
module best_of_3_arbiter (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       round_ended_strobe,
    input  wire [1:0] round_winner_id, // 1: P1, 2: P2
    input  wire       reset_series,
    output reg  [1:0] p1_round_wins,
    output reg  [1:0] p2_round_wins,
    output reg  [1:0] series_round_num,
    output reg        series_champion_valid,
    output reg  [1:0] series_champion_id
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            p1_round_wins         <= 2'd0;
            p2_round_wins         <= 2'd0;
            series_round_num      <= 2'd1;
            series_champion_valid <= 1'b0;
            series_champion_id    <= 2'd0;
        end else if (reset_series) begin
            p1_round_wins         <= 2'd0;
            p2_round_wins         <= 2'd0;
            series_round_num      <= 2'd1;
            series_champion_valid <= 1'b0;
            series_champion_id    <= 2'd0;
        end else if (round_ended_strobe && !series_champion_valid) begin
            if (round_winner_id == 2'd1) begin
                p1_round_wins <= p1_round_wins + 1'b1;
                if ((p1_round_wins + 1'b1) >= 2'd2) begin
                    series_champion_valid <= 1'b1;
                    series_champion_id    <= 2'd1;
                end else begin
                    series_round_num <= series_round_num + 1'b1;
                end
            end else if (round_winner_id == 2'd2) begin
                p2_round_wins <= p2_round_wins + 1'b1;
                if ((p2_round_wins + 1'b1) >= 2'd2) begin
                    series_champion_valid <= 1'b1;
                    series_champion_id    <= 2'd2;
                end else begin
                    series_round_num <= series_round_num + 1'b1;
                end
            end
        end
    end
endmodule


// ============================================================================
// 9. TOP-LEVEL MODULE: VEGGIE WONDER HARDWARE CORE
// Connects all submodules, registers, and gate circuits into unified hardware
// ============================================================================
module veggie_wonder_top (
    input  wire        clk,
    input  wire        rst_n,

    // Match control inputs
    input  wire [1:0]  game_mode,          // 0: Classic, 1: Speed, 2: SuddenDeath, 3: BestOf3
    input  wire [7:0]  match_duration_cfg, // 30, 60, or 90
    input  wire [2:0]  round_poison_type,  // 0:Watermelon, 1:Apple, 2:Banana, 3:Orange, 4:Strawberry, 5:Pineapple, 6:PoisonBerry
    input  wire        cmd_start_match,
    input  wire        cmd_poison_ready,
    input  wire        cmd_countdown_done,
    input  wire        cmd_pause_toggle,
    input  wire        timer_tick_1s,

    // Synchronized wave inputs
    input  wire [7:0]  wave_id,
    input  wire        wave_active,
    input  wire [2:0]  wave_fruit_type,

    // Player 1 inputs
    input  wire        p1_slice_strobe,
    input  wire [7:0]  p1_reaction_time,
    input  wire        p1_combo_timeout,

    // Player 2 inputs
    input  wire        p2_slice_strobe,
    input  wire [7:0]  p2_reaction_time,
    input  wire        p2_combo_timeout,

    // Hardware outputs to game interface
    output wire [2:0]  fsm_state,
    output wire [7:0]  time_remaining,
    output wire        game_active,
    output wire        game_over,
    output wire [1:0]  winner_id,
    output wire [1:0]  game_over_reason,

    // Live player stats
    output wire [11:0] p1_score,
    output wire [11:0] p2_score,
    output wire [3:0]  p1_combo,
    output wire [3:0]  p2_combo,
    output wire [9:0]  p1_last_points,
    output wire [9:0]  p2_last_points,
    output wire        p1_is_faster,
    output wire        p2_is_faster,
    output wire        p1_poison_hit,
    output wire        p2_poison_hit
);

    // --- Poison Detection ---
    wire is_wave_poison;
    poison_detector_gates u_poison_detector (
        .fruit_type(wave_fruit_type),
        .round_poison_type(round_poison_type),
        .valid(wave_active),
        .is_poison(is_wave_poison)
    );

    wire p1_poison_trip = p1_slice_strobe & is_wave_poison & game_active;
    wire p2_poison_trip = p2_slice_strobe & is_wave_poison & game_active;
    assign p1_poison_hit = p1_poison_trip;
    assign p2_poison_hit = p2_poison_trip;

    // --- Reflex Arbiter ---
    wire wave_claimed;
    reflex_arbiter u_arbiter (
        .clk(clk),
        .rst_n(rst_n),
        .wave_id(wave_id),
        .wave_active(wave_active & game_active),
        .p1_slice_strobe(p1_slice_strobe),
        .p2_slice_strobe(p2_slice_strobe),
        .p1_reaction_time(p1_reaction_time),
        .p2_reaction_time(p2_reaction_time),
        .p1_is_faster(p1_is_faster),
        .p2_is_faster(p2_is_faster),
        .wave_claimed(wave_claimed)
    );

    // --- Fruit Base Points Decoder ---
    wire [7:0] base_points;
    fruit_points_decoder u_points_lut (
        .fruit_type(wave_fruit_type),
        .base_points(base_points)
    );

    // --- Player 1 Scoring ALU & Combo ---
    wire [9:0] p1_calc_points;
    wire p1_valid_slice = p1_slice_strobe & (!is_wave_poison) & game_active;

    combo_tracker u_p1_combo (
        .clk(clk),
        .rst_n(rst_n),
        .slice_valid(p1_valid_slice),
        .combo_reset(p1_combo_timeout | p1_poison_trip | (!game_active)),
        .combo_count(p1_combo),
        .max_combo()
    );

    scoring_alu u_p1_alu (
        .base_points(base_points),
        .reaction_time(p1_reaction_time),
        .is_faster(p1_is_faster),
        .combo_count(p1_combo),
        .points_earned(p1_calc_points)
    );

    assign p1_last_points = p1_calc_points;

    score_accumulator u_p1_score (
        .clk(clk),
        .rst_n(rst_n),
        .add_strobe(p1_valid_slice),
        .points_to_add(p1_calc_points),
        .clear_score(cmd_start_match),
        .total_score(p1_score)
    );

    // --- Player 2 Scoring ALU & Combo ---
    wire [9:0] p2_calc_points;
    wire p2_valid_slice = p2_slice_strobe & (!is_wave_poison) & game_active;

    combo_tracker u_p2_combo (
        .clk(clk),
        .rst_n(rst_n),
        .slice_valid(p2_valid_slice),
        .combo_reset(p2_combo_timeout | p2_poison_trip | (!game_active)),
        .combo_count(p2_combo),
        .max_combo()
    );

    scoring_alu u_p2_alu (
        .base_points(base_points),
        .reaction_time(p2_reaction_time),
        .is_faster(p2_is_faster),
        .combo_count(p2_combo),
        .points_earned(p2_calc_points)
    );

    assign p2_last_points = p2_calc_points;

    score_accumulator u_p2_score (
        .clk(clk),
        .rst_n(rst_n),
        .add_strobe(p2_valid_slice),
        .points_to_add(p2_calc_points),
        .clear_score(cmd_start_match),
        .total_score(p2_score)
    );

    // --- Game Controller FSM ---
    game_controller_fsm u_fsm (
        .clk(clk),
        .rst_n(rst_n),
        .game_mode(game_mode),
        .cmd_start_match(cmd_start_match),
        .cmd_poison_ready(cmd_poison_ready),
        .cmd_countdown_done(cmd_countdown_done),
        .cmd_pause_toggle(cmd_pause_toggle),
        .timer_tick_1s(timer_tick_1s),
        .match_duration_cfg(match_duration_cfg),
        .p1_poison_trip(p1_poison_trip),
        .p2_poison_trip(p2_poison_trip),
        .p1_score(p1_score),
        .p2_score(p2_score),
        .state(fsm_state),
        .time_remaining(time_remaining),
        .game_active(game_active),
        .game_over(game_over),
        .winner_id(winner_id),
        .game_over_reason(game_over_reason)
    );

endmodule
