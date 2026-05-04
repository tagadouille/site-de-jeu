import { renderMatchStatus, renderPlayerLabels } from './game_ui.js';



const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartBtn');
const player1Display = document.getElementById('player1Display');
const player2Display = document.getElementById('player2Display');

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

/**
 * The function update the visuals of the board, the player labels 
 * and the match status based on the current game data.
 * @param {*} data the current game data, which includes the board state, 
 * player information, turn information, winner status, etc.
 */
function updateBoardVisuals(data) {

    cells.forEach((cell, index) => {
        const cellMark = getCellMark(data.board[index]);
        cell.textContent = cellMark;
        cell.style.color = cellMark === "X" ? "#20c997" : "#ffc107";
    });

    renderPlayerLabels(player1Display, player2Display, data, CURRENT_USER);

    renderMatchStatus(statusText, restartBtn, data, CURRENT_USER, {
        forfeitRedirectUrl: '/games/tictactoe',
        restartAction: async () => {
            await fetch(`/api/game/${GAME_ID}/restart`, { method: 'POST' });
        },
    });
}

let isFirstFetch = true;
let prevPlayer2 = null;

/**
 * The function fetches the current game status from the server and updates the board visuals,
 * player labels and match status accordingly. It also detects when a second player joins the game
 * and triggers a page reload to update the UI with the new player's information.
 * @param {*} reloadOnJoin a boolean flag that determines whether to trigger 
 * a page reload when a second player joins the game. 
 * This is typically set to true for regular status updates, but can be set to 
 * false for the initial fetch to avoid unnecessary reloads.
 */
async function fetchAndUpdate(reloadOnJoin = true) {
    try {
        const response = await fetch(`/api/game/${GAME_ID}/status`);
        if (response.ok) {
            const data = await response.json();

            // First fetch only: seed state without triggering reload
            if (isFirstFetch) {
                prevPlayer2 = data.player2 || null;
                updateBoardVisuals(data);
                isFirstFetch = false;
                return;
            }

            // Detect when player2 just joined (was null/absent, now present)
            if (!prevPlayer2 && data.player2 && reloadOnJoin) {
                window.location.reload();
                return;
            }

            prevPlayer2 = data.player2 || null;
            updateBoardVisuals(data);
        }
    } catch (err) {
        console.error("Error occurred while fetching game status:", err);
    }
}

// Initial fetch to seed state
fetchAndUpdate(true);
// Poll regularly and allow reload when an opponent joins
setInterval(() => fetchAndUpdate(true), 500);

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