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

    try {
        const winnerId = winnerKey === 'player1' ? game.player1_id : game.player2_id;

        await pool.query(
            `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [winnerId, game.dbId]
        );

        // Met à jour les stats des deux joueurs (gagnant ou non).
        await updatePlayerStats(pool, game_name, game.player1_id, winnerKey === 'player1');
        await updatePlayerStats(pool, game_name, game.player2_id, winnerKey === 'player2');
    } catch (err) {
        console.error("Erreur BDD Forfait:", err);
    }
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
                const updateQuery = `UPDATE live_matches SET player_o_id = $1 WHERE id = $2`;
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
            board: ["", "", "", "", "", "", "", "", ""],
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
                INSERT INTO live_matches (game_name, player_x_id, status) 
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

        const now = Date.now();
        const TIMEOUT = 10000; 

        for (const [id, game] of Object.entries(activeGames)) {

            const isPlayer1Gone = game.lastPingPlayer1 && (now - game.lastPingPlayer1 > TIMEOUT);
            const isPlayer2Gone = game.player2 === null || (game.lastPingPlayer2 && (now - game.lastPingPlayer2 > TIMEOUT));

            if (isPlayer1Gone && isPlayer2Gone) {
                
                if (game.winner === null && game.dbId) {
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
            }
        }
    }, 15000);
}
