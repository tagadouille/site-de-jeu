const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');

const gameId = "partie_123";

function updateBoardVisuals(data) {
    cells.forEach((cell, index) => {
        cell.textContent = data.board[index];
        cell.style.color = data.board[index] === "X" ? "#20c997" : "#ffc107";
    });

    if (data.winner === "Draw") {
        statusText.textContent = "Draw ! 🤝";
    } else if (data.winner) {
        statusText.textContent = `${data.winner} won ! 🎉`;
    } else {
        statusText.textContent = `Turn of ${data.turn}`;
    }
}

setInterval(async () => {
    try {
        const response = await fetch(`/api/game/${gameId}/status`);
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
        const cellIndex = this.getAttribute('data-index');
        
        await fetch(`/api/game/${gameId}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: cellIndex })
        });
    });
});

restartBtn.addEventListener('click', async () => {
    await fetch(`/api/game/${gameId}/restart`, { 
        method: 'POST' 
    });
});