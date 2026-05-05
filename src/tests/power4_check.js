const GRID_ROWS = 6;
const GRID_COLS = 7;
const GRID_SIZE = GRID_ROWS * GRID_COLS;

function getRowCol(index) {
    return { row: Math.floor(index / GRID_COLS), col: index % GRID_COLS };
}

function checkWinAt(board, index, player) {
    const { row, col } = getRowCol(index);
    const directions = [
        { dr: 0, dc: 1 },
        { dr: 1, dc: 0 },
        { dr: 1, dc: 1 },
        { dr: 1, dc: -1 }
    ];
    for (const { dr, dc } of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) break;
            const newIndex = newRow * GRID_COLS + newCol;
            if (board[newIndex] === player) count++; else break;
        }
        for (let i = 1; i < 4; i++) {
            const newRow = row - dr * i;
            const newCol = col - dc * i;
            if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) break;
            const newIndex = newRow * GRID_COLS + newCol;
            if (board[newIndex] === player) count++; else break;
        }
        if (count >= 4) return true;
    }
    return false;
}

function checkWin(board, lastMoveIndex) {
    if (Number.isInteger(lastMoveIndex) && lastMoveIndex >= 0 && lastMoveIndex < GRID_SIZE) {
        const player = board[lastMoveIndex];
        if (player && checkWinAt(board, lastMoveIndex, player)) return player;
    }
    if (board.every(cell => cell !== "")) return "Draw";
    return null;
}

function makeBoard() {
    return Array(GRID_SIZE).fill("");
}

function printResult(desc, board, lastIdx) {
    console.log(desc, '->', checkWin(board, lastIdx));
}

// Horizontal win test: bottom row, columns 0..6, place at indexes row5 * 7 + col
let b = makeBoard();
let baseRow = 5; // bottom
let player = 'player1';
let lastIdx = baseRow * GRID_COLS + 3; // drop at column 3
b[baseRow * GRID_COLS + 0] = player;
b[baseRow * GRID_COLS + 1] = player;
b[baseRow * GRID_COLS + 2] = player;
b[lastIdx] = player;
printResult('Horizontal 4', b, lastIdx);

// Vertical win test: same column, rows 5,4,3,2
b = makeBoard();
let col = 2;
b[5*GRID_COLS + col] = player;
b[4*GRID_COLS + col] = player;
b[3*GRID_COLS + col] = player;
lastIdx = 2*GRID_COLS + col;
b[lastIdx] = player;
printResult('Vertical 4', b, lastIdx);

// Diagonal \ test
b = makeBoard();
// positions: (row2,col0),(row3,col1),(row4,col2),(row5,col3)
b[2*GRID_COLS + 0] = player;
b[3*GRID_COLS + 1] = player;
b[4*GRID_COLS + 2] = player;
lastIdx = 5*GRID_COLS + 3;
b[lastIdx] = player;
printResult('Diagonal backslash', b, lastIdx);

// Diagonal / test
b = makeBoard();
// positions: (row5,col0),(row4,col1),(row3,col2),(row2,col3)
b[5*GRID_COLS + 0] = player;
b[4*GRID_COLS + 1] = player;
b[3*GRID_COLS + 2] = player;
lastIdx = 2*GRID_COLS + 3;
b[lastIdx] = player;
printResult('Diagonal /', b, lastIdx);

// Negative case: three in a row only
b = makeBoard();
b[5*GRID_COLS + 0] = player;
b[5*GRID_COLS + 1] = player;
b[5*GRID_COLS + 2] = player;
lastIdx = 5*GRID_COLS + 2;
printResult('Three only', b, lastIdx);
