import { renderMatchStatus, renderPlayerLabels } from './game_ui.js';



const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');
const player1Display = document.getElementById('player1Display');
const player2Display = document.getElementById('player2Display');

/**
 * The function returns the symbol to display in a cell based on the mark value.
 * @returns the symbol to display in the cell 
 */
function getCellMark() {
    return "O";
}

let isFirstFetch = true;
let prevPlayer2 = null;

// Initial fetch to seed state
fetchAndUpdate(true, "power4", "O");

// Poll regularly and allow reload when an opponent joins
setInterval(() => fetchAndUpdate(true, "power4", "O"), 500);

// Handle cell clicks to make a move :
cells.forEach(cell => {
    cell.addEventListener('click', async function () {
        if (this.textContent !== "") return;

        await fetch(`/api/game/${GAME_ID}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: this.getAttribute('data-index') })
        });
    });
});

// Handle restart button click to restart the game :
restartBtn.addEventListener('click', async () => {
    await fetch(`/api/game/${GAME_ID}/restart`, {
        method: 'POST'
    });
});