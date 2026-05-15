import { activeGames, match_making, cleanup, refresh_game_state, manage_move, restartGame } from "./multiplayer_handler.js";

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

/**
 * Determine the current state of the grid
 *
 * @param {string[]} board - Board of 9 cells containing "", "player1" or "player2".
 * @returns {"player1"|"player2"|"Draw"|null} The winner, a draw or `null` 
 * if the game is still ongoing.
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
    app.get('/games/tictactoe', async (req, res, next) => {
        try {
            await match_making(req, res, activeGames, pool, 'Tic Tac Toe', 'tictactoe');
        } catch (err) {
            console.error('Error in GET /games/tictactoe:', err);
            return next(err);
        }
    });

    // Game page : transmit useful information to the front and the chat :
    app.get('/games/tictactoe/:id', (req, res, next) => {
        try {
            if (!req.session || !req.session.user) {
                return res.redirect('/signin');
            }

            const game = activeGames[req.params.id];

            if (!game) {
                return res.redirect('/games/tictactoe');
            }

            // Get the opponent's user id for chat purposes :
            const receiver_id = req.session.user.username === game.player1
                ? game.player2_id
                : game.player1_id;

            res.render("games/tictactoe.ejs", { 
                is_connect: true, 
                is_display_buttons: true,
                gameId: req.params.id,              
                username: req.session.user.username,
                user_id : req.session.user.id,
                receiver_id : receiver_id,
            });
        } catch (err) {
            console.error('Error in GET /games/tictactoe/:id:', err);
            return next(err);
        }
    });

    // Syncronization point use by the front for refresh the game state :
    refresh_game_state(app, 'Tic Tac Toe', activeGames, pool);

    // Save if a move is the move of the connected player :
    manage_move(app, 'Tic Tac Toe', activeGames, pool, checkWin);

    // Reinitialize the grid without deleting the game if the two players are always presents :
    app.post('/api/game/:id/restart', async (req, res, next) => {
        const game = activeGames[req.params.id];

        if (!game || game.game_name !== 'Tic Tac Toe') {
            return next();
        }

        await restartGame(req, res, activeGames, pool, 'Tic Tac Toe');
    });

    // Periodic cleanup of old games :
    cleanup(activeGames, pool);
}