const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');
const player1Display = document.getElementById('player1Display');
const player2Display = document.getElementById('player2Display');

function getCellMark(mark) {
    if (mark === "player1") return "X";
    if (mark === "player2") return "O";
    return mark;
}


function updateBoardVisuals(data) {
    
    cells.forEach((cell, index) => {
        const cellMark = getCellMark(data.board[index]);
        cell.textContent = cellMark;
        cell.style.color = cellMark === "X" ? "#20c997" : "#ffc107";
    });

    
    player1Display.textContent = `player1 : ${data.player1} ${data.player1 === CURRENT_USER ? '(You)' : ''}`;
    if (data.player2) {
        player2Display.textContent = `player2 : ${data.player2} ${data.player2 === CURRENT_USER ? '(You)' : ''}`;
    } else {
        player2Display.textContent = `player2 : ⏳ Waiting for an opponent...`;
    }

    
    const isMyTurn = (data.turn === "player1" && data.player1 === CURRENT_USER) || 
                     (data.turn === "player2" && data.player2 === CURRENT_USER);

    if (!data.player2) {
        statusText.textContent = "⏳ Waiting for an opponent...";
        restartBtn.style.display = "none";
    } else if (data.winner === "Draw") {
        statusText.textContent = "Draw ! 🤝";
        restartBtn.style.display = "inline-block";
    } else if (data.winner) {
        const winnerName = data.winner === "player1" ? data.player1 : data.player2;

        if (data.forfeit) {
            statusText.textContent = winnerName === CURRENT_USER ? "Opponent forfeited! You win 🏆" : `${winnerName} won by forfeit...`;
                restartBtn.textContent = "Search for another opponent";
                restartBtn.style.display = "inline-block";
                restartBtn.onclick = () => window.location.href = '/games/tictactoe';
        } else {
            statusText.textContent = winnerName === CURRENT_USER ? "🎉 You won!" : `💀 ${winnerName} won...`;
            restartBtn.textContent = "Restart";
            restartBtn.style.display = "inline-block";
            restartBtn.onclick = async () => {
                await fetch(`/api/game/${GAME_ID}/restart`, { method: 'POST' });
            };
        }
    } else {
        statusText.textContent = isMyTurn ? "👉 It's your turn!" : `⏳ It's the opponent's turn...`;
        restartBtn.style.display = "none";
    }
}

setInterval(async () => {
    try {
        const response = await fetch(`/api/game/${GAME_ID}/status`);
        if (response.ok) {
            const data = await response.json();
            updateBoardVisuals(data);
        }
    } catch (err) {
        console.error("Error occurred while fetching game status:", err);
    }
}, 500);

cells.forEach(cell => {
    cell.addEventListener('click', async function() {
        if (this.textContent !== "") return;

        await fetch(`/api/game/${GAME_ID}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: this.getAttribute('data-index') })
        });
    });
});

restartBtn.addEventListener('click', async () => {
    await fetch(`/api/game/${GAME_ID}/restart`, { 
        method: 'POST' 
    });
});