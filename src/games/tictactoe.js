import { activeGames, match_making, handleDisconnect, updatePlayerStats, cleanup } from "./multiplayer_handler.js";

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

/**
 * Determine the current state of the grid
 *
 * @param {string[]} board - Board of 9 cells containing "", "X" or "O".
 * @returns {"X"|"O"|"Draw"|null} The winner, a draw or `null` if the game is still ongoing.
 */
function checkWin(board) {
    for (let i = 0; i < winConditions.length; i++) {
        const [a, b, c] = winConditions[i];
        if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (!board.includes("")) return "Draw";
    return null;
}

/**
 * Backend of the Tic Tac Toe game
 *
 * This module handles:
 * - The creation and joining of games in memory,
 * - The minimal synchronization with the database (match creation, match end),
 * - The tracking of pings to detect disconnections,
 * - The game logic itself is entirely handled in memory for responsiveness, with periodic sync to the database.
 *
 * @param {object} server - Server object containing `app` and `pool`.
 */
export function runTicTacToe(server) {

    let app = server.app;
    let pool = server.pool;

    // Game main menu : join an existant game if possible, else create a new :
    app.get('/games/tictactoe', async (req, res) => {
        await match_making(req, res, activeGames, pool, 'Tic Tac Toe', 'tictactoe');
    });

    // Game page : transmit useful information to the front and the chat :
    app.get('/games/tictactoe/:id', (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');
        
        const game = activeGames[req.params.id];
        if (!game) return res.redirect('/games/tictactoe');

        // Get the opponent's user id for chat purposes :
        const receiver_id = req.session.user.username === game.player1
            ? game.player2_id
            : game.player1_id;

        //TODO Cas intrus

        res.render("games/tictactoe.ejs", { 
            is_connect: true, 
            is_display_buttons: true,
            gameId: req.params.id,              
            username: req.session.user.username,
            user_id : req.session.user.id,
            receiver_id : receiver_id,
        }); 
    });

    // Syncronization point use by the front for refresh the game state :
    app.get('/api/game/:id/status', async(req, res) => {

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

                // X don't ping : 0 win by forfait :
                await handleDisconnect(pool, game, 'player2', 'Tic Tac Toe', 'O'); 
            } else if (game.lastPingPlayer2 && (now - game.lastPingPlayer2 > TIMEOUT)) {

                // 0 don't ping : X win by forfait :
                await handleDisconnect(pool, game, 'player1', 'Tic Tac Toe', 'X'); 
            }
        }
        
        res.json({ 
            board: game.board, turn: game.turn, winner: game.winner,
            player1: game.player1, player2: game.player2, forfeit: game.forfeit
        });
    });

    // Enregistre un coup si c'est bien le tour du joueur connecté.
    app.post('/api/game/:id/play', async (req, res) => {

        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false });
        }

        const game = activeGames[req.params.id];
        const index = req.body.index;
        const username = req.session.user.username;

        const expectedPlayer = (game.turn === "X") ? game.player1 : game.player2;

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
                // Fin de partie : on persiste le résultat et les statistiques des deux joueurs.
                try {
                    let winnerId = null;
                    
                    if (game.winner !== "Draw") {
                        winnerId = game.winner === "X" ? game.player1_id : game.player2_id;
                    }

                    await pool.query(
                        `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
                        [winnerId, game.dbId]
                    );

                    const isXWinner = game.winner === "X";
                    const isOWinner = game.winner === "O";
                    
                    await updatePlayerStats(pool, 'Tic Tac Toe', game.player1_id, isXWinner);
                    await updatePlayerStats(pool, 'Tic Tac Toe', game.player2_id, isOWinner);

                } catch (err) {
                    console.error("Erreur BDD fin de partie:", err);
                }
            } else {
                game.turn = (game.turn === "X") ? "O" : "X";
            }
            
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false });
        }
    });

    // Reinitialize the grid without deleting the game if the two players are always presents :
    app.post('/api/game/:id/restart', async(req, res) => {
        const game = activeGames[req.params.id];
        if (!game || game.forfeit || game.player2 === null) {
            return res.status(400).json({ success: false, message: "Impossible de relancer." });
        }
        if (game) {
            game.board = ["", "", "", "", "", "", "", "", ""];
            game.turn = "X"; 
            game.winner = null;
            game.forfeit = false;
            game.lastPingPlayer1 = Date.now(); 
            game.lastPingPlayer2 = Date.now();

            try {
                const insertQuery = `
                    INSERT INTO live_matches (game_name, player_x_id, player_o_id, status) 
                    VALUES ('Tic Tac Toe', $1, $2, 'ongoing') RETURNING id
                `;
                const dbRes = await pool.query(insertQuery, [game.player1_id, game.player2_id]);
                game.dbId = dbRes.rows[0].id;
            } catch (err) { console.error("Erreur DB restart:", err); }
        }
        res.json({ success: true });
    });

    // Nettoyage périodique des parties orphelines en mémoire et en base.
    cleanup(activeGames, pool);
}