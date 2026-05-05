import { renderMatchStatus, renderPlayerLabels, fetchAndUpdate } from './game_ui.js';



const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');
const player1Display = document.getElementById('player1Display');
const player2Display = document.getElementById('player2Display');
const gameId = window.GAME_ID;
const currentUser = window.CURRENT_USER;
const uiState = { isFirstFetch: true, prevPlayer2: null };

/**
 * The function returns the symbol to display in a cell based on the mark value.
 * @param {*} mark the mark returned by the backend
 * @returns the symbol to display in the cell 
 */
function getCellMark(mark) {
    return mark === "player1" ? "X" : mark === "player2" ? "O" : "";
}

let isFirstFetch = true;
let prevPlayer2 = null;

// Initial fetch to seed state
fetchAndUpdate(true, "power4", "O", {
    cells,
    statusText,
    restartBtn,
    player1Display,
    player2Display,
    currentUser,
    gameId,
    state: uiState,
    getCellMark,
});

// Poll regularly and allow reload when an opponent joins
setInterval(() => fetchAndUpdate(true, "power4", "O", {
    cells,
    statusText,
    restartBtn,
    player1Display,
    player2Display,
    currentUser,
    gameId,
    state: uiState,
    getCellMark,
}), 500);

// Handle cell clicks to make a move :
cells.forEach(cell => {
    cell.addEventListener('click', async function () {
        const cellIndex = parseInt(this.getAttribute('data-index'));

        const response = await fetch(`/api/game/${gameId}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: cellIndex })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            if (payload?.message) {
                console.warn(payload.message);
            }
        }
    });
});

