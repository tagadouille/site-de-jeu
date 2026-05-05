import { initGamePage } from './game_ui.js';

/**
 * The function returns the symbol to display in a cell based on the mark value.
 * @param {*} mark the mark returned by the backend
 * @returns the symbol to display in the cell 
 */
function getCellMark(mark) {
    return mark === "player1" ? "X" : mark === "player2" ? "O" : "";
}

initGamePage({
    gameName: "power4",
    cellMark: "O",
    getCellMark,
    onCellClick: async (cell) => {
        const gameId = window.GAME_ID;
        const cellIndex = parseInt(cell.getAttribute('data-index'));

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
    },
});

