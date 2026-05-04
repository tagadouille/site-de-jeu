/**
 * The function inform if the given player name corresponds to the current user.
 * @param {*} playerName the name of the player to check
 * @param {*} currentUser the name of the current user
 * @returns 
 */
export function isCurrentUser(playerName, currentUser) {
    return playerName !== null && playerName !== undefined && 
    String(playerName) === String(currentUser);
}

/**
 * The formatting of the player label, showing the role, the player name 
 * and if it's the current user.
 * @param {*} role the role of the player (e.g., "player1", "player2")
 * @param {*} playerName the name of the player to display
 * @param {*} currentUser the name of the current user, used to determine if "(You)" should be appended
 * @param {*} waitingText the text to display when the player name is not yet available (e.g., "Waiting for an opponent...")
 * @returns 
 */
export function formatPlayerLabel(role, playerName, currentUser, waitingText = "Waiting for an opponent...") {
    if (!playerName) {
        return `${role} : ${waitingText}`;
    }

    return `${role} : ${playerName} ${isCurrentUser(playerName, currentUser) ? '(You)' : ''}`;
}

/**
 * The function update the visuals of the board, the player labels 
 * and the match status based on the current game data.
 * @param {*} data the current game data, which includes the board state, 
 * player information, turn information, winner status, etc.
 * @param {*} game_name the name of the game, used for constructing redirect URLs
 * @param {*} cell_mark the mark used by the current player (e.g., "X" or "O"),
 * used to determine cell colors
 */
function updateBoardVisuals(data, game_name, cell_mark) {

    cells.forEach((cell, index) => {
        const cellMark = getCellMark(data.board[index]);
        cell.textContent = cellMark;
        cell.style.color = cellMark === cell_mark ? "#20c997" : "#ffc107";
    });

    renderPlayerLabels(player1Display, player2Display, data, CURRENT_USER);

    renderMatchStatus(statusText, restartBtn, data, CURRENT_USER, {
        forfeitRedirectUrl: '/games/' + game_name,
        restartAction: async () => {
            await fetch(`/api/game/${GAME_ID}/restart`, { method: 'POST' });
        },
    });
}

/**
 * The function fetches the current game status from the server and updates the board visuals,
 * player labels and match status accordingly. It also detects when a second player joins the game
 * and triggers a page reload to update the UI with the new player's information.
 * @param {*} reloadOnJoin a boolean flag that determines whether to trigger 
 * a page reload when a second player joins the game. 
 * This is typically set to true for regular status updates, but can be set to 
 * false for the initial fetch to avoid unnecessary reloads.
 * 
 * @param {*} game_name the name of the game, used for constructing redirect URLs
 * @param {*} cell_mark the mark used by the current player (e.g., "X" or "O"),
 * used to determine cell colors
 */
export async function fetchAndUpdate(reloadOnJoin = true, game_name, cell_mark) {
    try {
        const response = await fetch(`/api/game/${GAME_ID}/status`);
        if (response.ok) {
            const data = await response.json();

            // First fetch only: seed state without triggering reload
            if (isFirstFetch) {
                prevPlayer2 = data.player2 || null;
                updateBoardVisuals(data, game_name, cell_mark);
                isFirstFetch = false;
                return;
            }

            // Detect when player2 just joined (was null/absent, now present)
            if (!prevPlayer2 && data.player2 && reloadOnJoin) {
                window.location.reload();
                return;
            }

            prevPlayer2 = data.player2 || null;
            updateBoardVisuals(data, game_name, cell_mark);
        }
    } catch (err) {
        console.error("Error occurred while fetching game status:", err);
    }
}

/**
 * the function updates the player labels and the match status
 *  text based on the current game data.
 * @param {*} player1Display the DOM element for displaying player 1's information
 * @param {*} player2Display the DOM element for displaying player 2's information
 * @param {*} data the current game data, which includes player names, turn information, 
 * winner status, etc.
 * @param {*} currentUser the name of the current user, used to determine how to 
 * format the player labels and status text
 * @param {*} waitingText the text to display when a player slot is not yet filled 
 * (e.g., "Waiting for an opponent...")
 */
export function renderPlayerLabels(player1Display, player2Display, data, currentUser, waitingText = "Waiting for an opponent...") {
    
    if (player1Display) {
        player1Display.textContent = formatPlayerLabel('player1', data.player1, currentUser, waitingText);
    }

    if (player2Display) {
        player2Display.textContent = formatPlayerLabel('player2', data.player2, currentUser, waitingText);
    }
}

/**
 * The function updates the match status text and the visibility/functionality 
 * of the restart button based on the current game data.
 * @param {*} statusText the DOM element for displaying the match status text
 * @param {*} restartBtn the DOM element for the restart button, which 
 * may be shown or hidden and have its click handler set based on the game state
 * @param {*} data the current game data, which includes information about the players, 
 * whose turn it is,
 * @param {*} currentUser the name of the current user, used to determine how to format 
 * the status text and
 * @param {*} options the various text options for different game states 
 * (e.g., waiting for opponent, draw, win/lose messages)
 * @returns 
 */
export function renderMatchStatus(statusText, restartBtn, data, currentUser, options = {}) {

    // Destructure options with defaults :
    const {
        waitingText = "⏳ Waiting for an opponent...",
        drawText = "Draw ! 🤝",
        yourTurnText = "👉 It's your turn!",
        opponentTurnText = "⏳ It's the opponent's turn...",
        winText = "🎉 You won!",
        loseText = (winnerName) => `💀 ${winnerName} won...`,
        forfeitWinText = "Opponent forfeited! You win 🏆",
        forfeitLoseText = (winnerName) => `${winnerName} won by forfeit...`,
        restartText = "Restart",
        searchOpponentText = "Search for another opponent",
        forfeitRedirectUrl = null,
        restartAction = null,
    } = options;

    // Helper to set restart button state :
    const setRestartButton = (text, visible, onClick = null) => {
        if (!restartBtn) {
            return;
        }

        restartBtn.textContent = text;
        restartBtn.style.display = visible ? "inline-block" : "none";
        restartBtn.onclick = onClick;
    };

    // Game is waiting for opponent :
    const isMyTurn = (data.turn === "player1" && isCurrentUser(data.player1, currentUser)) ||
        (data.turn === "player2" && isCurrentUser(data.player2, currentUser));

    if (!data.player2) {
        if (statusText) {
            statusText.textContent = waitingText;
        }
        setRestartButton(restartText, false);
        return;
    }

    // Game ended in a draw :
    if (data.winner === "Draw") {
        if (statusText) {
            statusText.textContent = drawText;
        }
        setRestartButton(restartText, true, restartAction);
        return;
    }

    // Game has a winner (not a draw) :
    if (data.winner) {
        const winnerName = data.winner === "player1" ? data.player1 : data.player2;
        const didCurrentUserWin = isCurrentUser(winnerName, currentUser);

        if (statusText) {
            statusText.textContent = data.forfeit
                ? (didCurrentUserWin ? forfeitWinText : forfeitLoseText(winnerName))
                : (didCurrentUserWin ? winText : loseText(winnerName));
        }

        if (data.forfeit) {
            setRestartButton(searchOpponentText, true, () => {
                if (forfeitRedirectUrl) {
                    window.location.href = forfeitRedirectUrl;
                }
            });
            return;
        }

        setRestartButton(restartText, true, restartAction);
        return;
    }

    // Game is ongoing :
    if (statusText) {
        statusText.textContent = isMyTurn ? yourTurnText : opponentTurnText;
    }
    setRestartButton(restartText, false);
}