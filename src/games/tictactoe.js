/**
 * Backend for the Tic Tac Toe game
 * @param {*} server
 */
const activeGames = {
    "partie_123": {
        board: ["", "", "", "", "", "", "", "", ""],
        turn: "X",
        winner: null
    }
};

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

export function runTicTacToe(server) {
    let app = server.app;

    app.get('/games/tictactoe', (req, res) => {
        res.render("games/tictactoe.ejs", { 
            is_connect: false, 
            is_display_buttons: true 
        }); 
    });

    app.get('/api/game/:id/status', (req, res) => {
        const game = activeGames[req.params.id];
        
        if (!game) {
            return res.status(404).json({ error: "Partie introuvable" });
        }
        
        res.json({ 
            board: game.board, 
            turn: game.turn, 
            winner: game.winner 
        });
    });

    app.post('/api/game/:id/play', (req, res) => {
        const game = activeGames[req.params.id];
        const index = req.body.index;

        if (game && game.board[index] === "" && game.winner === null) {
            game.board[index] = game.turn;
            game.winner = checkWin(game.board);
            
            if (!game.winner) {
                game.turn = (game.turn === "X") ? "O" : "X";
            }
            
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false });
        }
    });

    app.post('/api/game/:id/restart', (req, res) => {
        if (activeGames[req.params.id]) {
            activeGames[req.params.id] = { 
                board: ["", "", "", "", "", "", "", "", ""], 
                turn: "X", 
                winner: null 
            };
        }
        res.json({ success: true });
    });
}