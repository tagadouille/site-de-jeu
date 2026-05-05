const GRID_ROWS = 6;
const GRID_COLS = 7;
const GRID_SIZE = GRID_ROWS * GRID_COLS;

function getRowCol(index) { return { row: Math.floor(index / GRID_COLS), col: index % GRID_COLS }; }

function getValidPlacement(board, col) {
    if (!Number.isInteger(col) || col < 0 || col >= GRID_COLS) return -1;
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
        const index = row * GRID_COLS + col;
        if (board[index] === "") return index;
    }
    return -1;
}

function checkWinAt(board, index, player) {
    const { row, col } = getRowCol(index);
    const directions = [ {dr:0,dc:1},{dr:1,dc:0},{dr:1,dc:1},{dr:1,dc:-1} ];
    for (const {dr,dc} of directions) {
        let count = 1;
        for (let i=1;i<4;i++){
            const newRow = row + dr*i; const newCol = col + dc*i;
            if (newRow<0||newRow>=GRID_ROWS||newCol<0||newCol>=GRID_COLS) break;
            const newIndex = newRow*GRID_COLS+newCol;
            if (board[newIndex]===player) count++; else break;
        }
        for (let i=1;i<4;i++){
            const newRow = row - dr*i; const newCol = col - dc*i;
            if (newRow<0||newRow>=GRID_ROWS||newCol<0||newCol>=GRID_COLS) break;
            const newIndex = newRow*GRID_COLS+newCol;
            if (board[newIndex]===player) count++; else break;
        }
        if (count>=4) return true;
    }
    return false;
}
function checkWin(board,lastIdx){ if (Number.isInteger(lastIdx)&& lastIdx>=0) { const p=board[lastIdx]; if (p && checkWinAt(board,lastIdx,p)) return p;} if (board.every(c=>c!=="")) return 'Draw'; return null; }

function makeBoard(){ return Array(GRID_SIZE).fill(""); }

// Simulate real game drops to produce horizontal win in column order 0..3 for player1
let board = makeBoard();
let moves = [0,0,1,1,2,2,3]; // last move should be player1 at col 3
let current = 'player1';
let lastIdx = -1;
for (const col of moves) {
    const idx = getValidPlacement(board,col);
    if (idx===-1) { console.error('Invalid placement',col); break; }
    board[idx]=current;
    lastIdx=idx;
    // switch
    current = current === 'player1' ? 'player2' : 'player1';
}
console.log('Last placed index:', lastIdx, 'row/col', getRowCol(lastIdx));
console.log('Winner:', checkWin(board,lastIdx));

// Output board bottom row for visual
for (let r=0;r<GRID_ROWS;r++){
    let rowStr='';
    for (let c=0;c<GRID_COLS;c++) rowStr += (board[r*GRID_COLS+c] ? (board[r*GRID_COLS+c]==='player1'?'X':'O') : '.') + ' ';
    console.log(rowStr);
}
