class GoGame {
    constructor(size = 19) {
        this.size = size;
        this.board = Array(size).fill().map(() => Array(size).fill(null));
        this.currentPlayer = 'black';
        this.captures = { black: 0, white: 0 };
        this.history = [];
        this.ko = null;
        this.consecutivePasses = 0;
        this.gameEnded = false;
        this.winner = null;
    }

    isValidMove(row, col) {
        // Check if position is empty
        if (this.board[row][col] !== null) return false;

        // Check for ko rule
        if (this.ko && this.ko.row === row && this.ko.col === col) return false;

        // Create temporary board to test move
        const tempBoard = this.board.map(row => [...row]);
        tempBoard[row][col] = this.currentPlayer;

        // Check if move would result in a capture or if the group has liberties
        const group = this.findGroup(row, col, tempBoard);
        if (this.hasLiberties(group, tempBoard)) return true;

        // Check if move captures opponent stones
        const captures = this.findCaptures(row, col, tempBoard);
        return captures.length > 0;
    }

    makeMove(row, col) {
        if (this.gameEnded || !this.isValidMove(row, col)) return false;
        
        // Reset consecutive passes when a move is made
        this.consecutivePasses = 0;
        
        this.board[row][col] = this.currentPlayer;
        const captures = this.findCaptures(row, col, this.board);
        
        // Remove captured stones
        captures.forEach(({row, col}) => {
            this.board[row][col] = null;
            this.captures[this.currentPlayer]++;
        });

        // Update ko point
        this.ko = captures.length === 1 ? {row, col} : null;

        // Save move to history
        this.history.push({row, col, player: this.currentPlayer});

        // Switch players
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';

        return true;
    }

    findGroup(row, col, board) {
        const color = board[row][col];
        const group = new Set();
        const stack = [{row, col}];

        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.row},${current.col}`;

            if (group.has(key)) continue;
            group.add(key);

            // Check adjacent positions
            const adjacent = this.getAdjacent(current.row, current.col);
            for (const pos of adjacent) {
                if (board[pos.row][pos.col] === color) {
                    stack.push(pos);
                }
            }
        }

        return group;
    }

    hasLiberties(group, board) {
        for (const pos of group) {
            const [row, col] = pos.split(',').map(Number);
            const adjacent = this.getAdjacent(row, col);
            
            for (const adj of adjacent) {
                if (board[adj.row][adj.col] === null) return true;
            }
        }
        return false;
    }

    findCaptures(row, col, board) {
        const captures = [];
        const adjacent = this.getAdjacent(row, col);
        const oppositeColor = board[row][col] === 'black' ? 'white' : 'black';

        for (const pos of adjacent) {
            if (board[pos.row][pos.col] === oppositeColor) {
                const group = this.findGroup(pos.row, pos.col, board);
                if (!this.hasLiberties(group, board)) {
                    for (const capturedPos of group) {
                        const [r, c] = capturedPos.split(',').map(Number);
                        captures.push({row: r, col: c});
                    }
                }
            }
        }

        return captures;
    }

    getAdjacent(row, col) {
        const adjacent = [];
        const directions = [{r:-1,c:0}, {r:1,c:0}, {r:0,c:-1}, {r:0,c:1}];

        for (const dir of directions) {
            const newRow = row + dir.r;
            const newCol = col + dir.c;
            if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
                adjacent.push({row: newRow, col: newCol});
            }
        }

        return adjacent;
    }

    getScore() {
        // Simple territory counting
        const territory = { black: 0, white: 0 };
        const visited = new Set();

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === null && !visited.has(`${row},${col}`)) {
                    const territory = this.checkTerritory(row, col, visited);
                    if (territory.owner) {
                        territory[territory.owner] += territory.count;
                    }
                }
            }
        }

        return {
            black: territory.black + this.captures.black,
            white: territory.white + this.captures.white
        };
    }

    checkTerritory(row, col, visited) {
        const empty = new Set();
        const borders = new Set();
        const stack = [{row, col}];

        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.row},${current.col}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (this.board[current.row][current.col] === null) {
                empty.add(key);
                const adjacent = this.getAdjacent(current.row, current.col);
                for (const pos of adjacent) {
                    if (!visited.has(`${pos.row},${pos.col}`)) {
                        stack.push(pos);
                    }
                }
            } else {
                borders.add(this.board[current.row][current.col]);
            }
        }

        if (borders.size === 1) {
            return {
                owner: borders.values().next().value,
                count: empty.size
            };
        }

        return { owner: null, count: 0 };
    }

    pass() {
        this.consecutivePasses++;
        this.history.push({ isPass: true, player: this.currentPlayer });
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // Check for game end after pass
        if (this.consecutivePasses >= 2) {
            this.endGame();
            return true;
        }
        return false;
    }

    endGame() {
        this.gameEnded = true;
        // Calculate final score including territory and captures
        const territory = this.calculateTerritory();
        const finalScore = {
            black: territory.black + this.captures.black,
            white: territory.white + this.captures.white + 6.5 // komi
        };
        
        this.winner = finalScore.black > finalScore.white ? 'black' : 'white';
        this.finalScore = finalScore;
        return finalScore;
    }

    calculateTerritory() {
        const territory = { black: 0, white: 0 };
        const visited = Array(this.size).fill().map(() => Array(this.size).fill(false));
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (visited[row][col] || this.board[row][col] !== null) continue;
                
                const region = this.floodFillTerritory(row, col, visited);
                if (region.owner) {
                    territory[region.owner] += region.points;
                }
            }
        }
        
        return territory;
    }

    floodFillTerritory(row, col, visited) {
        const queue = [{row, col}];
        const points = [];
        let blackBorder = false;
        let whiteBorder = false;
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited[current.row][current.col]) continue;
            
            visited[current.row][current.col] = true;
            points.push(current);
            
            const neighbors = this.getAdjacentPositions(current.row, current.col);
            for (const next of neighbors) {
                const stone = this.board[next.row][next.col];
                if (stone === 'black') blackBorder = true;
                else if (stone === 'white') whiteBorder = true;
                else if (!visited[next.row][next.col]) {
                    queue.push(next);
                }
            }
        }
        
        let owner = null;
        if (blackBorder && !whiteBorder) owner = 'black';
        if (whiteBorder && !blackBorder) owner = 'white';
        
        return { owner, points: points.length };
    }
} 