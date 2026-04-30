const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');
const playerXDisplay = document.getElementById('playerXDisplay');
const playerODisplay = document.getElementById('playerODisplay');


function updateBoardVisuals(data) {
    
    cells.forEach((cell, index) => {
        cell.textContent = data.board[index];
        cell.style.color = data.board[index] === "X" ? "#20c997" : "#ffc107";
    });

    
    playerXDisplay.textContent = `X : ${data.playerX} ${data.playerX === CURRENT_USER ? '(You)' : ''}`;
    if (data.playerO) {
        playerODisplay.textContent = `O : ${data.playerO} ${data.playerO === CURRENT_USER ? '(You)' : ''}`;
    } else {
        playerODisplay.textContent = `O : ⏳ Waiting for an opponent...`;
    }

    
    const isMyTurn = (data.turn === "X" && data.playerX === CURRENT_USER) || 
                     (data.turn === "O" && data.playerO === CURRENT_USER);

    if (!data.playerO) {
        statusText.textContent = "⏳ Waiting for an opponent...";
        restartBtn.style.display = "none";
    } else if (data.winner === "Draw") {
        statusText.textContent = "Draw ! 🤝";
        restartBtn.style.display = "inline-block";
    } else if (data.winner) {
        const winnerName = data.winner === "X" ? data.playerX : data.playerO;

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