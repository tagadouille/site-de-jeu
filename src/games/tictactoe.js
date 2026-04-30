/**
 * Backend for the Tic Tac Toe game
 * @param {*} server
 */
const activeGames = {};

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

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

async function updatePlayerStats(pool, userId, isWinner) {
    const winsToAdd = isWinner ? 1 : 0;
    const query = `
        INSERT INTO played_games (user_id, game_name, number_of_wins, number_of_matches)
        VALUES ($1, 'Tic Tac Toe', $2, 1)
        ON CONFLICT (user_id, game_name) 
        DO UPDATE SET 
            number_of_matches = played_games.number_of_matches + 1,
            number_of_wins = played_games.number_of_wins + $2
    `;
    await pool.query(query, [userId, winsToAdd]);
}

async function handleDisconnect(pool, game, winnerMark) {
    game.winner = winnerMark;
    game.forfeit = true;

    try {
        const winnerId = winnerMark === "X" ? game.playerX_id : game.playerO_id;
        await pool.query(
            `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [winnerId, game.dbId]
        );
        await updatePlayerStats(pool, game.playerX_id, winnerMark === "X");
        await updatePlayerStats(pool, game.playerO_id, winnerMark === "O");
    } catch (err) {
        console.error("Erreur BDD Forfait:", err);
    }
}

export function runTicTacToe(server) {
    let app = server.app;
    let pool = server.pool;

    app.get('/games/tictactoe', async(req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');
        
        const username = req.session.user.username;
        const userId = req.session.user.id;
        let gameIdToJoin = null;

        for (const [id, game] of Object.entries(activeGames)) {
            if (game.playerO === null && game.playerX !== username) {
                gameIdToJoin = id;
                game.playerO = username;
                game.playerO_id = userId;
                game.lastPingO = Date.now();
                try {
                    await pool.query(
                        `UPDATE live_matches SET player_o_id = $1 WHERE id = $2`, 
                        [userId, game.dbId]
                    );
                } catch (err) { console.error("Erreur DB update match:", err); }
                break;
            } else if (game.playerX === username && game.playerO === null) {
                gameIdToJoin = id;
                game.lastPingX = Date.now();
                break;
            }
        }
        if (!gameIdToJoin) {
            gameIdToJoin = "partie_" + Date.now();
            activeGames[gameIdToJoin] = {
                board: ["", "", "", "", "", "", "", "", ""],
                turn: "X",
                winner: null,
                forfeit: false,
                playerX: username, 
                playerX_id: userId,
                playerO: null,
                playerO_id: null,
                dbId: null,
                lastPingX: Date.now(),
                lastPingO: null
            };
            try {
                const insertQuery = `
                    INSERT INTO live_matches (game_name, player_x_id, status) 
                    VALUES ('Tic Tac Toe', $1, 'ongoing') RETURNING id
                `;
                const dbRes = await pool.query(insertQuery, [userId]);
                activeGames[gameIdToJoin].dbId = dbRes.rows[0].id;
            } catch (err) { console.error("Erreur DB insert match:", err); }
        }

        res.redirect(`/games/tictactoe/${gameIdToJoin}`);
    });

    app.get('/games/tictactoe/:id', (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');
        
        const game = activeGames[req.params.id];
        if (!game) return res.redirect('/games/tictactoe');

        res.render("games/tictactoe.ejs", { 
            is_connect: true, 
            is_display_buttons: true,
            gameId: req.params.id,              
            username: req.session.user.username 
        }); 
    });

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

            if (game.lastPingX && (now - game.lastPingX > TIMEOUT)) {
                await handleDisconnect(pool, game, "O"); 
            } else if (game.lastPingO && (now - game.lastPingO > TIMEOUT)) {
                await handleDisconnect(pool, game, "X"); 
            }
        }
        
        res.json({ 
            board: game.board, turn: game.turn, winner: game.winner,
            playerX: game.playerX, playerO: game.playerO, forfeit: game.forfeit
        });
    });

    app.post('/api/game/:id/play', async (req, res) => {
        if (!req.session || !req.session.user) return res.status(401).json({ success: false });

        const game = activeGames[req.params.id];
        const index = req.body.index;
        const username = req.session.user.username;

        const expectedPlayer = (game.turn === "X") ? game.playerX : game.playerO;
        if (expectedPlayer !== username) return res.status(403).json({ success: false });
        if (game.playerO === null) return res.status(400).json({ success: false });

        if (game && game.board[index] === "" && game.winner === null) {
            game.board[index] = game.turn;
            game.winner = checkWin(game.board);
            
            if (game.winner) {
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
                    
                    await updatePlayerStats(pool, game.playerX_id, isXWinner);
                    await updatePlayerStats(pool, game.playerO_id, isOWinner);

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
    setInterval(async () => {
        const now = Date.now();
        const TIMEOUT = 10000; 

        for (const [id, game] of Object.entries(activeGames)) {
            const isXGone = game.lastPingX && (now - game.lastPingX > TIMEOUT);
            const isOGone = game.playerO === null || (game.lastPingO && (now - game.lastPingO > TIMEOUT));
            if (isXGone && isOGone) {
                
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