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
 * @param {*} mark the mark in the cell ("player1", "player2" or "")
 * @returns the symbol to display in the cell ("X", "O" or "")
 */
function getCellMark(mark) {
    if (mark === "player1") {
        return "X";
    }

    if (mark === "player2") {
        return "O";
    }
    return mark;
}

let isFirstFetch = true;
let prevPlayer2 = null;

// Initial fetch to seed state
fetchAndUpdate(true, "tictactoe", "X", {
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
setInterval(() => fetchAndUpdate(true, "tictactoe", "X", {
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
        if (this.textContent !== "") return;

        await fetch(`/api/game/${gameId}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: this.getAttribute('data-index') })
        });
    });
});

// Handle restart button click to restart the game :
restartBtn.addEventListener('click', async () => {
    await fetch(`/api/game/${gameId}/restart`, {
        method: 'POST'
    });
});