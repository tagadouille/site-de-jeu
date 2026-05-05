import { activeGames, handleDisconnect, updatePlayerStats, cleanup, refresh_game_state } from "./multiplayer_handler.js";

const GRID_ROWS = 6; // 6 rows
const GRID_COLS = 7; // 7 columns
const GRID_SIZE = GRID_ROWS * GRID_COLS;


/**
 * Helper: Convert index to (row, col)
 * @param {number} index - Linear index in the board array
 * @returns {object} Object with row and col properties
 */
function getRowCol(index) {
    return {
        row: Math.floor(index / GRID_COLS),
        col: index % GRID_COLS
    };
}

/**
 * Find the valid row position to place a piece in the given column.
 * Returns the index where the piece should be placed, or -1 if column is full.
 *
 * @param {string[]} board - Current board state
 * @param {number} col - Column index (0-6)
 * @returns {number} Index where the piece should be placed, or -1 if invalid
 */
function getValidPlacement(board, col) {

    if (!Number.isInteger(col) || col < 0 || col >= GRID_COLS) {
        return -1;
    }

    // Start from the bottom (row 5) and move up
    for (let row = GRID_ROWS - 1; row >= 0; row--) {

        const index = row * GRID_COLS + col;

        if (board[index] === "") {
            return index;
        }
    }
    return -1; // Column is full
}

/**
 * Check if a player has won at the given position.
 * Checks all 4 directions: horizontal, vertical, and both diagonals.
 *
 * @param {string[]} board - Current board state
 * @param {number} index - Index of the last move
 * @param {string} player - "player1" or "player2"
 * @returns {boolean} True if this move creates a winning line
 */
function checkWinAt(board, index, player) {

    const { row, col } = getRowCol(index);

    const directions = [
        { dr: 0, dc: 1 },  // Horizontal
        { dr: 1, dc: 0 },  // Vertical
        { dr: 1, dc: 1 },  // Diagonal \
        { dr: 1, dc: -1 }  // Diagonal /
    ];

    for (const { dr, dc } of directions) {
        let count = 1; // Count the current piece

        // Check positive direction
        for (let i = 1; i < 4; i++) {

            const newRow = row + dr * i;
            const newCol = col + dc * i;

            if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) {
                break;
            }

            const newIndex = newRow * GRID_COLS + newCol;

            if (board[newIndex] === player) {
                count++;
            } else {
                break;
            }
        }

        // Check negative direction
        for (let i = 1; i < 4; i++) {

            const newRow = row - dr * i;
            const newCol = col - dc * i;

            if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) {
                break;
            }
            const newIndex = newRow * GRID_COLS + newCol;

            if (board[newIndex] === player) {
                count++;
            } else {
                break;
            }
        }

        if (count >= 4) {
            return true;
        }
    }
    return false;
}

/**
 * Determine the current state of the grid from the last move.
 *
 * @param {string[]} board - Board of GRID_COLS * GRIDROWS cells containing "", "player1" or "player2".
 * @param {number} lastMoveIndex - Index of the last placed piece.
 * @returns {"player1"|"player2"|"Draw"|null} The winner, a draw or `null` if the game is still ongoing.
 */
function checkWin(board, lastMoveIndex) {

    if (Number.isInteger(lastMoveIndex) && lastMoveIndex >= 0 && lastMoveIndex < GRID_SIZE) {
        const player = board[lastMoveIndex];

        if (player && checkWinAt(board, lastMoveIndex, player)) {
            return player;
        }
    }

    // Check if the board is full (Draw)
    if (board.every(cell => cell !== "")) {
        return "Draw";
    }

    return null;
}

/**
 * Ensure the board is a dense array of length GRID_SIZE with no undefined slots.
 * Preserves existing non-undefined values.
 */
function normalizeBoard(board) {
    const normalized = Array(GRID_SIZE).fill("");
    if (!board) return normalized;
    for (let i = 0; i < Math.min(board.length, GRID_SIZE); i++) {
        if (board[i] !== undefined) normalized[i] = board[i];
    }
    return normalized;
}

/**
 * Backend of the Power 4 game
 *
 * This module handles:
 * - The creation and joining of games in memory,
 * - The minimal synchronization with the database (match creation, match end),
 * - The tracking of pings to detect disconnections,
 * - The game logic itself is entirely handled in memory for responsiveness,
 *  with periodic sync to the database.
 *
 * @param {object} server - Server object containing `app` and `pool`.
 */
async function matchmaking_power4(req, res, activeGames, pool) {
    if (!req.session || !req.session.user) {
        return res.redirect('/signin');
    }

    const username = req.session.user.username;
    const userId = req.session.user.id;
    let gameIdToJoin = null;

    // Try to join an existing game waiting for a second player
    for (const [id, game] of Object.entries(activeGames)) {
        if (game.player2 === null && game.player1 !== username) {
            gameIdToJoin = id;
            game.player2 = username;
            game.player2_id = userId;
            game.lastPingPlayer2 = Date.now();

            try {
                const updateQuery = `UPDATE live_matches SET player2_id = $1 WHERE id = $2`;
                await pool.query(updateQuery, [userId, game.dbId]);
            } catch (err) {
                console.error("Erreur DB update match:", err);
            }
            break;
        }
        // If player already created a game and is waiting
        else if (game.player1 === username && game.player2 === null) {
            gameIdToJoin = id;
            break;
        }
    }

    // Create a new game if none available
    if (!gameIdToJoin) {
        const new_game = {
            game_name: 'Power 4',
            board: Array(GRID_SIZE).fill(""), // Initialize with correct size (42 cells)
            turn: "player1",
            winner: null,
            forfeit: false,
            player1: username,
            player1_id: userId,
            player2: null,
            player2_id: null,
            lastPingPlayer1: Date.now(),
            lastPingPlayer2: null,
            dbId: null,
        };

        try {
            const insertQuery = `
                INSERT INTO live_matches (game_name, player1_id, status) 
                VALUES ($1, $2, 'ongoing') RETURNING id
            `;
            const dbRes = await pool.query(insertQuery, ['Power 4', userId]);
            new_game.dbId = dbRes.rows[0].id;
            gameIdToJoin = (new_game.dbId).toString();
        } catch (err) {
            console.error("Erreur DB insert match:", err);
            return res.status(500).json({ error: "Erreur de base de données" });
        }

        activeGames[gameIdToJoin] = new_game;
    }

    res.redirect(`/games/power4/${gameIdToJoin}`);
}

export function runPower4(server) {

    let app = server.app;
    let pool = server.pool;

    // Game main menu : join an existant game if possible, else create a new :
    app.get('/games/power4', async (req, res) => {
        await matchmaking_power4(req, res, activeGames, pool);
    });

    // Game page : transmit useful information to the front and the chat :
    app.get('/games/power4/:id', (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');

        const game = activeGames[req.params.id];

        // Defensive: ensure board is normalized (no sparse arrays/undefined entries)
        if (game) {
            game.board = normalizeBoard(game.board);
        }

        if (!game) {
            return res.redirect('/games/power4');
        }

        // Get the opponent's user id for chat purposes :
        const receiver_id = req.session.user.username === game.player1
            ? game.player2_id
            : game.player1_id;

        //TODO Cas intrus

        res.render("games/power4.ejs", {
            is_connect: true,
            is_display_buttons: true,
            gridSize: GRID_SIZE,
            gridCols: GRID_COLS,
            gridRows: GRID_ROWS,
            gameId: req.params.id,
            username: req.session.user.username,
            user_id: req.session.user.id,
            receiver_id: receiver_id,
        });
    });

    // Syncronization point use by the front for refresh the game state :
    refresh_game_state(app, 'Power 4', activeGames, pool);

    // Custom Power 4 move handler with gravity and board validation
    app.post('/api/game/:id/play', async (req, res) => {

        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false });
        }

        const game = activeGames[req.params.id];
        const clickedIndex = Number(req.body.index);
        const username = req.session.user.username;

        // Validate basic game state
        if (!game || game.winner !== null || game.player2 === null) {
            return res.status(400).json({ success: false });
        }

        const expectedPlayer = (game.turn === "player1") ? game.player1 : game.player2;
        if (expectedPlayer !== username) {
            return res.status(403).json({ success: false });
        }

        // Extract column from clicked index
        const { col } = getRowCol(clickedIndex);

        // Find valid placement position (with gravity)
        const validIndex = getValidPlacement(game.board, col);

        // Check if column is full (invalid move)
        if (validIndex === -1) {
            return res.status(400).json({ success: false, message: "Colonne pleine" });
        }

        // Place the piece at the valid position
        game.board[validIndex] = game.turn;

        game.winner = checkWin(game.board, validIndex);

        if (game.winner) {
            // Game end: persist result and update statistics
            try {
                let winnerId = null;

                if (game.winner !== "Draw") {
                    winnerId = game.winner === "player1" ? game.player1_id : game.player2_id;
                }

                await pool.query(
                    `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
                    [winnerId, game.dbId]
                );

                const isPlayer1Winner = game.winner === "player1";
                const isPlayer2Winner = game.winner === "player2";

                await updatePlayerStats(pool, 'Power 4', game.player1_id, isPlayer1Winner);
                await updatePlayerStats(pool, 'Power 4', game.player2_id, isPlayer2Winner);

            } catch (err) {
                console.error("Erreur BDD fin de partie:", err);
            }
        } else {
            // Switch turn
            game.turn = (game.turn === "player1") ? "player2" : "player1";
        }

        res.json({ success: true });
    });

    // Reinitialize the grid without deleting the game if the two players are always present :
    app.post('/api/game/:id/restart', async (req, res) => {

        const game = activeGames[req.params.id];

        if (!game || game.forfeit || game.player2 === null) {
            return res.status(400).json({ success: false, message: "Impossible de relancer." });
        }
        if (game) {
            // Initialize board with 42 empty cells (6 rows x 7 columns)
            game.board = Array(GRID_SIZE).fill("");
            // Normalize to ensure dense array and avoid undefined entries from prior state
            game.board = normalizeBoard(game.board);
            game.turn = "player1";
            game.winner = null;
            game.forfeit = false;
            game.lastPingPlayer1 = Date.now();
            game.lastPingPlayer2 = Date.now();

            try {
                const insertQuery = `
                    INSERT INTO live_matches (game_name, player1_id, player2_id, status) 
                    VALUES ('Power 4', $1, $2, 'ongoing') RETURNING id
                `;
                const dbRes = await pool.query(insertQuery, [game.player1_id, game.player2_id]);
                game.dbId = dbRes.rows[0].id;
            } catch (err) { console.error("Erreur DB restart:", err); }
        }
        res.json({ success: true });
    });

    // Periodic cleanup of old games :
    cleanup(activeGames, pool);
}