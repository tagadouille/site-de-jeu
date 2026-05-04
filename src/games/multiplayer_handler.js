export const activeGames = {};

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

        // Met à jour les stats des deux joueurs (gagnant ou non).
        await updatePlayerStats(pool, resolvedGameName, game.player1_id, winnerKey === 'player1');
        await updatePlayerStats(pool, resolvedGameName, game.player2_id, winnerKey === 'player2');
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
            if (username === game.player1) game.lastPingPlayer1 = Date.now();
            if (username === game.player2) game.lastPingPlayer2 = Date.now();
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
            player1: game.player1, player2: game.player2, forfeit: game.forfeit
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

    app.post('/api/game/:id/play', async (req, res) => {

        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false });
        }

        const game = activeGames[req.params.id];
        const index = req.body.index;
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
export async function match_making(req, res, activeGames, pool, game_name, routeBase) {

    if (!req.session || !req.session.user) {
        return res.redirect('/signin');
    }

    const username = req.session.user.username;
    const userId = req.session.user.id;
    let gameIdToJoin = null;

    for (const [id, game] of Object.entries(activeGames)) {

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

        const new_game = {
            game_name,
            board: ["", "", "", "", "", "", "", "", ""], // TODO : make it generic for other games
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
            const dbRes = await pool.query(insertQuery, [game_name, userId]);

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
            const isPlayer2Gone = game.lastPingPlayer2 && (now - game.lastPingPlayer2 > TIMEOUT);

            const player1Present = !!game.player1 && !isPlayer1Gone;
            const player2Present = !!game.player2 && !isPlayer2Gone;

            // Both players gone -> mark finished and remove from memory
            if (!player1Present && !player2Present) {
                if (game.dbId) {
                    try {
                        await pool.query(
                            `UPDATE live_matches SET status = 'finished', ended_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'ongoing'`,
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
                // Ensure the stale game is removed to avoid infinite loops
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