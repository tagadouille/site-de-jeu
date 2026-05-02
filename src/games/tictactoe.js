import { match_making, handleDisconnect, updatePlayerStats, cleanup } from "./multiplayer_handler.js";

const activeGames = {};

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

/**
 * Détermine l'état courant de la grille.
 *
 * @param {string[]} board - Tableau de 9 cases contenant "", "X" ou "O".
 * @returns {"X"|"O"|"Draw"|null} Le gagnant, un match nul ou `null` si la partie continue.
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
 * Backend du jeu Tic Tac Toe.
 *
 * Ce module gère :
 * - la création et la jonction des parties en mémoire,
 * - la synchronisation minimale avec la base de données,
 * - le suivi des pings pour détecter les déconnexions,
 * - l'enregistrement des victoires / matchs joués.
 *
 * @param {object} server - Objet serveur contenant `app` et `pool`.
 */
export function runTicTacToe(server) {

    let app = server.app;
    let pool = server.pool;

    // Mapping générique entre les noms utilisés par TicTacToe et les clés attendues
    const mapping = {
        player1Key: 'playerX',
        player1IdKey: 'playerX_id',
        player2Key: 'playerO',
        player2IdKey: 'playerO_id',
        lastPing1Key: 'lastPingX',
        lastPing2Key: 'lastPingO',
        dbPlayer1Field: 'player_x_id',
        dbPlayer2Field: 'player_o_id'
    };

    // Accueil du jeu : on rejoint une partie existante si possible, sinon on en crée une.
    app.get('/games/tictactoe', async (req, res) => {
        // Utilise le gestionnaire générique en passant le pool, le nom en BDD et la route de redirection
        await match_making(req, res, activeGames, pool, 'Tic Tac Toe', 'tictactoe', mapping);
    });

    // Page de la partie : on transmet les informations utiles au front et au chat.
    app.get('/games/tictactoe/:id', (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');
        
        const game = activeGames[req.params.id];
        if (!game) return res.redirect('/games/tictactoe');

        // Get the opponent's user id for chat purposes :
        const receiver_id = req.session.user.username === game.playerX
            ? game.playerO_id
            : game.playerX_id;

        console.log(receiver_id === null);

        res.render("games/tictactoe.ejs", { 
            is_connect: true, 
            is_display_buttons: true,
            gameId: req.params.id,              
            username: req.session.user.username,
            user_id : req.session.user.id,
            receiver_id : receiver_id,
        }); 
    });

    // Point de synchronisation utilisé par le front pour rafraîchir l'état de la partie.
    app.get('/api/game/:id/status', async(req, res) => {
        const game = activeGames[req.params.id];
        if (!game) return res.status(404).json({ error: "Partie introuvable" });

        if (req.session && req.session.user) {
            const username = req.session.user.username;
            if (username === game.playerX) game.lastPingX = Date.now();
            if (username === game.playerO) game.lastPingO = Date.now();
        }
        if (game.playerO !== null && game.winner === null) {
            const now = Date.now();
            const TIMEOUT = 6000;

            // Si un joueur ne ping plus, on le considère comme déconnecté.
            if (game.lastPingX && (now - game.lastPingX > TIMEOUT)) {
                // X n'a pas pingé : O remporte par forfait
                await handleDisconnect(pool, game, 'player2', mapping, 'Tic Tac Toe', 'O'); 
            } else if (game.lastPingO && (now - game.lastPingO > TIMEOUT)) {
                // O n'a pas pingé : X remporte par forfait
                await handleDisconnect(pool, game, 'player1', mapping, 'Tic Tac Toe', 'X'); 
            }
        }
        
        res.json({ 
            board: game.board, turn: game.turn, winner: game.winner,
            playerX: game.playerX, playerO: game.playerO, forfeit: game.forfeit
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

        const expectedPlayer = (game.turn === "X") ? game.playerX : game.playerO;

        if (expectedPlayer !== username) {
            return res.status(403).json({ success: false });
        }

        if (game.playerO === null) {
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
                        winnerId = game.winner === "X" ? game.playerX_id : game.playerO_id;
                    }

                    await pool.query(
                        `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
                        [winnerId, game.dbId]
                    );

                    const isXWinner = game.winner === "X";
                    const isOWinner = game.winner === "O";
                    
                    await updatePlayerStats(pool, 'Tic Tac Toe', game.playerX_id, isXWinner);
                    await updatePlayerStats(pool, 'Tic Tac Toe', game.playerO_id, isOWinner);

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

    // Réinitialise la grille sans supprimer la partie si les deux joueurs sont encore présents.
    app.post('/api/game/:id/restart', async(req, res) => {
        const game = activeGames[req.params.id];
        if (!game || game.forfeit || game.playerO === null) {
            return res.status(400).json({ success: false, message: "Impossible de relancer." });
        }
        if (game) {
            game.board = ["", "", "", "", "", "", "", "", ""];
            game.turn = "X"; 
            game.winner = null;
            game.forfeit = false;
            game.lastPingX = Date.now(); 
            game.lastPingO = Date.now();

            try {
                const insertQuery = `
                    INSERT INTO live_matches (game_name, player_x_id, player_o_id, status) 
                    VALUES ('Tic Tac Toe', $1, $2, 'ongoing') RETURNING id
                `;
                const dbRes = await pool.query(insertQuery, [game.playerX_id, game.playerO_id]);
                game.dbId = dbRes.rows[0].id;
            } catch (err) { console.error("Erreur DB restart:", err); }
        }
        res.json({ success: true });
    });

    // Nettoyage périodique des parties orphelines en mémoire et en base.
    cleanup(activeGames, pool, mapping);
}