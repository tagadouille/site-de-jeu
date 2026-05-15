import { initGamePage } from './game_ui.js';

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

initGamePage({
    gameName: "tictactoe",
    cellMark: "X",
    getCellMark,
    onCellClick: async (cell) => {
        if (cell.textContent !== "") return;

        const gameId = window.GAME_ID;

        await fetch(`/api/game/${gameId}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: cell.getAttribute('data-index') })
        });
    },
});

