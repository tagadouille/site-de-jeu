import { activeGames, match_making, handleDisconnect, updatePlayerStats, cleanup, refresh_game_state, manage_move } from "./multiplayer_handler.js";

const GRID_SIZE = 6; // 6 rows and columns


/**
 * Determine the current state of the grid
 *
 * @param {string[]} board - Board of 9 cells containing "", "player1" or "player2".
 * @returns {"player1"|"player2"|"Draw"|null} The winner, a draw or `null` if the game is still ongoing.
 */
function checkWin(board) {
    
    //TODO
}

/**
 * Backend of the Power 4 game
 *
 * This module handles:
 * - The creation and joining of games in memory,
 * - The minimal synchronization with the database (match creation, match end),
 * - The tracking of pings to detect disconnections,
 * - The game logic itself is entirely handled in memory for responsiveness, with periodic sync to the database.
 *
 * @param {object} server - Server object containing `app` and `pool`.
 */
export function runPower4(server) {

    let app = server.app;
    let pool = server.pool;

    // Game main menu : join an existant game if possible, else create a new :
    app.get('/games/power4', async (req, res) => {
        await match_making(req, res, activeGames, pool, 'Power 4', 'power4');
    });

    // Game page : transmit useful information to the front and the chat :
    app.get('/games/power4/:id', (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');
        
        const game = activeGames[req.params.id];

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
            gridSize : GRID_SIZE,
            gameId: req.params.id,              
            username: req.session.user.username,
            user_id : req.session.user.id,
            receiver_id : receiver_id,
        }); 
    });

    // Syncronization point use by the front for refresh the game state :
    refresh_game_state(app, 'Power 4', activeGames, pool);

    // Save if a move is the move of the connected player :
    manage_move(app, 'Power 4', activeGames, pool, checkWin);

    // Reinitialize the grid without deleting the game if the two players are always presents :
    app.post('/api/game/:id/restart', async(req, res) => {
        const game = activeGames[req.params.id];
        if (!game || game.forfeit || game.player2 === null) {
            return res.status(400).json({ success: false, message: "Impossible de relancer." });
        }
        if (game) {
            game.board = ["", "", "", "", "", "", "", "", ""]; // TODO adapter pour 6x6
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