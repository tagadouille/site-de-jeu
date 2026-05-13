export const activeGames = {};

/**
 * Function to create a new game board initialized with empty values.
 * @param {*} boardSize the size of the board (e.g., 9 for tic-tac-toe, 42 for power4)
 * @returns an array representing the game board, initialized with empty strings
 */
function createBoard(boardSize) {
    return Array(boardSize).fill("");
}

/**
 * The function to insert a new match in the database. 
 * It can handle both single-player and two-player matches by 
 * checking if player2_id is provided.
 * @param {*} pool the PostgreSQL pool to perform the database query
 * @param {*} game_name the name of the game to store in the database (e.g., "Tic Tac Toe")
 * @param {*} player1_id the ID of the first player (the one who creates the match)
 * @param {*} player2_id the ID of the second player (optional, can be 
 * null if waiting for an opponent)
 * @returns the result of the database query, which includes 
 * the ID of the newly created match for further reference in memory and future updates
 */
async function insertLiveMatch(pool, game_name, player1_id, player2_id = null) {

    if (player2_id == null) {
        const insertQuery = `
            INSERT INTO live_matches (game_name, player1_id, status)
            VALUES ($1, $2, 'ongoing') RETURNING id
        `;
        return pool.query(insertQuery, [game_name, player1_id]);
    }

    const insertQuery = `
        INSERT INTO live_matches (game_name, player1_id, player2_id, status)
        VALUES ($1, $2, $3, 'ongoing') RETURNING id
    `;
    return pool.query(insertQuery, [game_name, player1_id, player2_id]);
}

/**
 * Create a fresh database match entry for the given game.
 *
 * @param {object} pool - Pool PostgreSQL.
 * @param {string} game_name - Name of the game stored in DB.
 * @param {number} player1_id - First player id.
 * @param {?number} player2_id - Second player id when restarting a two-player match.
 * @returns {Promise<object>} PostgreSQL query result.
 */
export async function createLiveMatch(pool, game_name, player1_id, player2_id = null) {
    return insertLiveMatch(pool, game_name, player1_id, player2_id);
}

/**
 * Create a new game state object with the provided parameters.
 * @param {object} params - Parameters for creating the game state.
 * @param {string} params.game_name - Name of the game (e.g., "Tic Tac Toe").
 * @param {number} params.boardSize - Size of the game board (e.g., 9 for tic-tac-toe).
 * @param {string} params.username - Username of the player creating the game.
 * @param {number} params.userId - User ID of the player creating the game.
 * @param {object} [params.extraFields={}] - Additional fields to include in the game state.
 * @returns {object} The initialized game state object.
 */
export function createGameState({ game_name, boardSize, username, userId, extraFields = {} }) {
    return {
        game_name,
        board: createBoard(boardSize),
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
        createdAt: Date.now(),
        invite_rejected: false,
        invite_expired: false,
        ...extraFields,
    };
}

/**
 * Update the statistics of a player for a game.
 * Generic API usable by multiple games.
 *
 * @param {object} pool - Pool PostgreSQL.
 * @param {string} game_name - Name of the game (stored in DB).
 * @param {number} userId - Player id in the database.
 * @param {boolean} isWinner - If the player win the game
 */
export async function updatePlayerStats(pool, game_name, userId, isWinner) {

    const winsToAdd = isWinner ? 1 : 0;

    // Defensive: if userId is null/undefined, skip updating stats to avoid DB NOT NULL violations
    if (userId == null) {
        console.warn("Skipping updatePlayerStats: missing userId", { game_name, userId, isWinner });
        return;
    }

    const query = `
        INSERT INTO played_games (user_id, game_name, number_of_wins, number_of_matches)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, game_name) 
        DO UPDATE SET 
            number_of_matches = played_games.number_of_matches + 1,
            number_of_wins = played_games.number_of_wins + $3
    `;
    await pool.query(query, [userId, game_name, winsToAdd]);
}

/**
 * Handle a forfeit when a player is unresponsive (generic).
 *
 * @param {object} pool - Pool PostgreSQL.
 * @param {object} game - Game object in memory.
 * @param {"player1"|"player2"} winnerKey - Logical key representing the winner.
 * @param {string} game_name - Name of the game for database stats.
 */
export async function handleDisconnect(pool, game, winnerKey, game_name) {

    game.winner = winnerKey;
    game.forfeit = true;

    const resolvedGameName = game_name ?? game.game_name;

    try {
        const winnerId = winnerKey === 'player1' ? game.player1_id : game.player2_id;

        await pool.query(
            `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [winnerId, game.dbId]
        );

        // Met à jour les stats des deux joueurs (gagnant ou non) uniquement si leur ID est présent.
        if (game.player1_id != null) {
            await updatePlayerStats(
                pool,
                resolvedGameName,
                game.player1_id,
                winnerKey === 'player1'
            );
        } else {
            console.warn(
                'handleDisconnect: player1_id missing, skip stats update',
                { dbId: game.dbId }
            );
        }

        if (game.player2_id != null) {
            await updatePlayerStats(
                pool,
                resolvedGameName,
                game.player2_id,
                winnerKey === 'player2'
            );
        } else {
            console.warn(
                'handleDisconnect: player2_id missing, skip stats update',
                { dbId: game.dbId }
            );
        }
    } catch (err) {
        console.error("Erreur BDD Forfait:", err);
    }
}

/**
 * The API endpoint to fetch the current game state, used by the frontend to update the visuals.
 * It also handles the ping mechanism to detect disconnections.
 * @param {*} app the Express app to define the route on
 * @param {*} game_name the name of the game for database stats (e.g., "Tic Tac Toe")
 * @param {*} activeGames the in-memory object that contains the active games
 * @param {*} pool the PostgreSQL pool to perform database operations
 */
export function refresh_game_state(app, game_name, activeGames, pool) {

    app.get('/api/game/:id/status', async (req, res) => {

        const game = activeGames[req.params.id];
        if (!game) {
            return res.status(404).json({ error: "Partie introuvable" });
        }

        // Save the last ping :
        if (req.session && req.session.user) {

            const username = req.session.user.username;

            if (username === game.player1) {
                game.lastPingPlayer1 = Date.now();
            }
            if (username === game.player2) {
                game.lastPingPlayer2 = Date.now();
            }
        }

        if (game.player2 !== null && game.winner === null) {

            const now = Date.now();
            const TIMEOUT = 6000;

            // If a player don't ping, considere it as deconnected :
            if (game.lastPingPlayer1 && (now - game.lastPingPlayer1 > TIMEOUT)) {

                // player1 don't ping : player2 win by forfait :
                await handleDisconnect(pool, game, 'player2', game_name);
            } else if (game.lastPingPlayer2 && (now - game.lastPingPlayer2 > TIMEOUT)) {

                // player2 don't ping : player1 win by forfait :
                await handleDisconnect(pool, game, 'player1', game_name);
            }
        }

        res.json({
            board: game.board, turn: game.turn, winner: game.winner,
            player1: game.player1, player2: game.player2, forfeit: game.forfeit,
            invite_rejected: game.invite_rejected, invite_expired: game.invite_expired
        });
    });
}

/**
 * The API endpoint to handle a move played by a player. 
 * It checks if the move is valid, updates the game state,
 * @param {*} app the Express app to define the route on
 * @param {*} game_name the name of the game for database stats (e.g., "Tic Tac Toe")
 * @param {*} activeGames the in-memory object that contains the active games
 * @param {*} pool the PostgreSQL pool to perform database operations
 */
export function manage_move(app, game_name, activeGames, pool, checkWin) {

    app.post('/api/game/:id/play', async (req, res, next) => {

        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false });
        }

        const game = activeGames[req.params.id];

        // If the game does not exist or belongs to a different game type,
        // delegate to the next handler so specific game modules (e.g., Power 4)
        // can implement custom move logic.
        if (!game || game.game_name !== game_name || !Array.isArray(game.board) || game.board.length !== 9) {
            return next();
        }

        const index = Number(req.body.index);

        // Validate index for board bounds :
        if (!Number.isInteger(index) || index < 0 || index >= game.board.length) {
            return res.status(400).json({ success: false });
        }
        const username = req.session.user.username;

        const expectedPlayer = (game.turn === "player1") ? game.player1 : game.player2;

        if (expectedPlayer !== username) {
            return res.status(403).json({ success: false });
        }

        if (game.player2 === null) {
            return res.status(400).json({ success: false });
        }

        if (game && game.board[index] === "" && game.winner === null) {
            game.board[index] = game.turn;
            game.winner = checkWin(game.board);

            if (game.winner) {

                // End of the game, we persist the result and the statistics of both players :
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

                    await updatePlayerStats(pool, game_name, game.player1_id, isPlayer1Winner);
                    await updatePlayerStats(pool, game_name, game.player2_id, isPlayer2Winner);

                } catch (err) {
                    console.error("Erreur BDD fin de partie:", err);
                }
            } else {
                game.turn = (game.turn === "player1") ? "player2" : "player1";
            }

            res.json({ success: true });
        } else {
            res.status(400).json({ success: false });
        }
    });
}

/**
 * Matchmaking : Join an existing game or create a new one if none is available.
 * @param {*} req
 * @param {*} res
 * @param {object} activeGames - Object that contains the games in memory.
 * @param {object} pool - Pool PostgreSQL.
 * @param {string} game_name - Name of the game for the database (e.g., "Tic Tac Toe").
 * @param {string} routeBase - Final route : `/games/${routeBase}/${gameIdToJoin}`.
 */
export async function match_making(req, res, activeGames, pool, game_name, routeBase, options = {}) {

    const boardSize = options.boardSize ?? 9;

    if (!req.session || !req.session.user) {
        return res.redirect('/signin');
    }

    const username = req.session.user.username;
    const userId = req.session.user.id;
    let gameIdToJoin = null;

    for (const [id, game] of Object.entries(activeGames)) {

        if (game.invite_rejected || game.invite_expired) {
            continue;
        }
        if (game.game_name !== game_name) {
            continue;
        }

        // If a game is waiting for a second player and it's not the same user, join it :
        if (game.player2 === null && game.player1 !== username) {
            gameIdToJoin = id;
            game.player2 = username;
            game.player2_id = userId;
            game.lastPingPlayer2 = Date.now();

            try {
                const updateQuery = `UPDATE live_matches SET player2_id = $1 WHERE id = $2`;
                await pool.query(updateQuery, [userId, game.dbId]);
            }
            catch (err) {
                console.error("Erreur DB update match:", err);
            }
            break;
        }
        // If the playe has already create the game and wait for the second player :
        else if (game.player1 === username && game.player2 === null) {
            gameIdToJoin = id;
            game.lastPingPlayer2 = Date.now();
            break;
        }
    }

    // No game open : initialize a new memory and DB entry :
    if (!gameIdToJoin) {
        const new_game = createGameState({ game_name, boardSize, username, userId });

        try {
            const dbRes = await createLiveMatch(pool, game_name, userId);

            // The DB id will also serve as a memory key :
            new_game.dbId = dbRes.rows[0].id;
            gameIdToJoin = (new_game.dbId).toString();
        }
        catch (err) {
            console.error("Erreur DB insert match:", err);
        }

        activeGames[gameIdToJoin] = new_game;
    }

    res.redirect(`/games/${routeBase}/${gameIdToJoin}`);
}

/**
 * Reset a game board and persist a new ongoing match in the database.
 *
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {object} activeGames - In-memory game registry.
 * @param {object} pool - PostgreSQL pool.
 * @param {string} game_name - Name of the game stored in DB.
 * @param {object} options - Game-specific options.
 * @param {number} options.boardSize - Board size to recreate.
 */
export async function restartGame(req, res, activeGames, pool, game_name, options = {}) {

    const boardSize = options.boardSize ?? 9; // Default to 9 for tic-tac-toe if not specified
    const game = activeGames[req.params.id];

    if (!game || game.forfeit || game.player2 === null) {
        return res.status(400).json({ success: false, message: "Impossible de relancer." });
    }

    game.board = createBoard(boardSize);
    game.turn = "player1";
    game.winner = null;
    game.forfeit = false;
    game.lastPingPlayer1 = Date.now();
    game.lastPingPlayer2 = Date.now();

    try {
        const dbRes = await createLiveMatch(pool, game_name, game.player1_id, game.player2_id);
        game.dbId = dbRes.rows[0].id;
    } catch (err) {
        console.error("Erreur DB restart:", err);
    }

    res.json({ success: true });
}


/**
 * Periodically clean up orphaned games :
 *
 * @param {object} activeGames - Object that contains the games in memory.
 * @param {object} pool - Pool PostgreSQL.
 */
export function cleanup(activeGames, pool) {

    setInterval(async () => {

        deleteMatchFromDB(pool).catch(err => console.error("Erreur nettoyage DB:", err));

        const now = Date.now();
        const TIMEOUT = 10000;

        for (const [id, game] of Object.entries(activeGames)) {

            const isPlayer1Gone = game.lastPingPlayer1 && (now - game.lastPingPlayer1 > TIMEOUT);
            if (game.player2 === null) {
                
                const INVITE_TIMEOUT = 45000; 
                if (!game.invite_rejected && !game.invite_expired && (now - game.createdAt > INVITE_TIMEOUT)) {
                    game.invite_expired = true;
                    pool.query(`UPDATE invitations SET status = 'expired' WHERE game_id = $1`, [id]).catch(()=>{});
                }
                if (isPlayer1Gone) {
                    if (game.dbId) {
                        try {
                            await pool.query(
                                `UPDATE live_matches SET status = 'finished', ended_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'ongoing'`,
                                [game.dbId]
                            );
                        } catch (err) {}
                    }
                    delete activeGames[id];
                }
                continue; 
            }
            const isPlayer2Gone = game.lastPingPlayer2 && (now - game.lastPingPlayer2 > TIMEOUT);

            const player1Present = !!game.player1 && !isPlayer1Gone;
            const player2Present = !!game.player2 && !isPlayer2Gone;

            // Both players gone -> mark finished and remove from memory
            if (!player1Present && !player2Present) {
                if (game.dbId) {
                    try {
                        await pool.query(
                            `UPDATE live_matches SET status = 'finished', ` + 
                            `ended_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'ongoing'`,
                            [game.dbId]
                        );
                    } catch (err) {
                        console.error("Erreur nettoyage fantôme:", err);
                    }
                }
                delete activeGames[id];
                continue;
            }

            // One player gone, other still present -> treat as forfeit
            try {
                if (!player1Present && player2Present) {
                    // player2 wins by forfeit
                    if (!game.forfeit) await handleDisconnect(pool, game, 'player2', game.game_name);
                    delete activeGames[id];
                    continue;
                }

                if (!player2Present && player1Present) {
                    // player1 wins by forfeit
                    if (!game.forfeit) await handleDisconnect(pool, game, 'player1', game.game_name);
                    delete activeGames[id];
                    continue;
                }
            } catch (err) {
                console.error('Erreur lors du traitement du forfait:', err);
                delete activeGames[id];
            }
        }
    }, 15000);
}

/**
 * Delete the matches in the database if there are
 * mark as finished and ended since 30min
 * @param {*} pool 
 * @returns 
 */
function deleteMatchFromDB(pool) {

    return pool.query(
        `DELETE FROM live_matches
         WHERE status = 'finished'
           AND ended_at IS NOT NULL
           AND ended_at <= CURRENT_TIMESTAMP - INTERVAL '30 minutes'`
    );
}