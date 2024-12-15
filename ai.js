class GoAI {
    constructor(difficulty = 'hard') {
        this.difficulty = difficulty;
        // Adjust depth based on difficulty
        this.maxDepth = {
            'easy': 1,
            'medium': 3,
            'hard': 4
        }[difficulty];
        
        // Refined evaluation weights
        this.weights = {
            territory: 2.0,    // Territory is important
            captures: 1.5,     // Captures matter but not as much as territory
            liberties: 1.0,    // Having breathing room is important
            influence: 1.2,    // Connection and influence
            center: 0.8,      // Center control
            edge: -0.3        // Slight penalty for edge moves
        };
    }

    makeMove(game) {
        if (game.history.length < 5) {
            return this.makeOpeningMove(game);
        }

        // Use minimax with alpha-beta pruning
        let bestMove = null;
        let bestScore = -Infinity;
        let alpha = -Infinity;
        let beta = Infinity;
        const moves = this.getPossibleMoves(game);

        if (moves.length === 0 || this.shouldPass(game)) {
            return null;
        }

        // Sort moves for better pruning
        moves.sort((a, b) => this.quickEvaluate(b, game) - this.quickEvaluate(a, game));

        for (const move of moves) {
            const gameClone = this.cloneGame(game);
            if (gameClone.makeMove(move.row, move.col)) {
                const score = -this.minimax(gameClone, this.maxDepth - 1, -beta, -alpha, false);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, score);
                if (alpha >= beta) break;
            }
        }

        return bestMove;
    }

    quickEvaluate(move, game) {
        let score = 0;
        
        // Prefer moves that capture
        const captures = game.findCaptures(move.row, move.col, game.board);
        score += captures.length * 5;
        
        // Prefer moves that defend against captures
        const group = game.findGroup(move.row, move.col, game.board);
        if (game.hasLiberties(group, game.board)) {
            score += 3;
        }
        
        // Prefer moves near center
        const centerDist = Math.abs(move.row - game.size/2) + Math.abs(move.col - game.size/2);
        score -= centerDist * 0.5;
        
        return score;
    }

    minimax(game, depth, alpha, beta, maximizing) {
        if (depth === 0 || game.gameEnded) {
            return this.evaluatePosition(game);
        }

        const moves = this.getPossibleMoves(game);
        if (moves.length === 0) return this.evaluatePosition(game);

        let bestScore = maximizing ? -Infinity : Infinity;
        
        for (const move of moves) {
            const gameClone = this.cloneGame(game);
            if (gameClone.makeMove(move.row, move.col)) {
                const score = this.minimax(gameClone, depth - 1, -beta, -alpha, !maximizing);
                bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
                if (maximizing) {
                    alpha = Math.max(alpha, score);
                } else {
                    beta = Math.min(beta, score);
                }
                if (alpha >= beta) break;
            }
        }

        return bestScore;
    }

    orderMoves(moves, game) {
        // Score moves for ordering
        moves.forEach(move => {
            move.score = this.quickEvaluateMove(move, game);
        });
        
        // Sort moves by score
        moves.sort((a, b) => b.score - a.score);
    }

    countAdjacentStones(move, game) {
        let count = 0;
        const directions = [{r:-1,c:0}, {r:1,c:0}, {r:0,c:-1}, {r:0,c:1}];
        
        for (const dir of directions) {
            const r = move.row + dir.r;
            const c = move.col + dir.c;
            if (r >= 0 && r < game.size && c >= 0 && c < game.size && game.board[r][c] !== null) {
                count++;
            }
        }
        return count;
    }

    getPossibleMoves(game) {
        const moves = [];
        // Only check reasonable moves (near existing stones)
        const checked = new Set();
        
        // Add all positions adjacent to existing stones
        for (let row = 0; row < game.size; row++) {
            for (let col = 0; col < game.size; col++) {
                if (game.board[row][col] !== null) {
                    this.addAdjacentMoves(row, col, game, moves, checked);
                }
            }
        }
        
        // If no moves found, add center and corner moves
        if (moves.length === 0) {
            const center = Math.floor(game.size / 2);
            if (game.isValidMove(center, center)) {
                moves.push({row: center, col: center});
            }
            // Add corner moves
            const corners = [[0,0], [0,game.size-1], [game.size-1,0], [game.size-1,game.size-1]];
            for (const [row, col] of corners) {
                if (game.isValidMove(row, col)) {
                    moves.push({row, col});
                }
            }
        }
        
        return moves;
    }

    addAdjacentMoves(row, col, game, moves, checked) {
        const directions = [{r:-1,c:0}, {r:1,c:0}, {r:0,c:-1}, {r:0,c:1}];
        
        for (const dir of directions) {
            const r = row + dir.r;
            const c = col + dir.c;
            const key = `${r},${c}`;
            
            if (r >= 0 && r < game.size && c >= 0 && c < game.size && 
                !checked.has(key) && game.isValidMove(r, c)) {
                moves.push({row: r, col: c});
                checked.add(key);
            }
        }
    }

    evaluatePosition(game, move) {
        let score = 0;
        const isBlack = game.currentPlayer === 'black';
        
        // Territory control
        const territory = game.calculateTerritory();
        score += (territory.black - territory.white) * (isBlack ? 1 : -1) * this.weights.territory;
        
        // Captures
        score += (game.captures.black - game.captures.white) * (isBlack ? 1 : -1) * this.weights.captures;
        
        // Position evaluation
        if (move) {
            const centerDist = Math.abs(move.row - game.size/2) + Math.abs(move.col - game.size/2);
            score -= centerDist * 0.5; // Prefer moves closer to center
            
            // Group strength
            const group = game.findGroup(move.row, move.col, game.board);
            const liberties = game.hasLiberties(group, game.board);
            score += liberties * this.weights.liberties;
            
            // Connection to friendly stones
            const adjacentFriendly = this.countAdjacentStones(move, game);
            score += adjacentFriendly * this.weights.influence;
        }
        
        return score;
    }

    cloneGame(game) {
        const newGame = new GoGame(game.size);
        newGame.board = game.board.map(row => [...row]);
        newGame.currentPlayer = game.currentPlayer;
        newGame.captures = {...game.captures};
        newGame.ko = game.ko ? {...game.ko} : null;
        return newGame;
    }

    shouldPass(game) {
        // Pass if no good moves are available
        const moves = this.getPossibleMoves(game);
        if (moves.length === 0) return true;
        
        // Count empty spaces
        let emptySpaces = 0;
        for (let row = 0; row < game.size; row++) {
            for (let col = 0; col < game.size; col++) {
                if (game.board[row][col] === null) {
                    emptySpaces++;
                }
            }
        }
        
        // Pass if board is nearly full (less than 10% empty)
        if (emptySpaces < game.size * game.size * 0.1) {
            return true;
        }
        
        // Pass if opponent just passed and we're ahead in score
        if (game.history.length > 0 && game.history[game.history.length - 1].isPass) {
            const score = game.getScore();
            const isBlack = game.currentPlayer === 'black';
            // Account for komi when deciding to pass
            const adjustedScore = score.black - (score.white + 6.5);
            return (isBlack && adjustedScore > 0) || (!isBlack && adjustedScore < 0);
        }
        
        return false;
    }

    makeOpeningMove(game) {
        const center = Math.floor(game.size / 2);
        const near = Math.floor(game.size / 3);
        const far = game.size - near - 1;
        
        // Common opening moves
        const openingMoves = [
            {row: center, col: center},  // tengen
            {row: near, col: near},      // hoshi points
            {row: near, col: far},
            {row: far, col: near},
            {row: far, col: far}
        ];
        
        // Filter to valid moves and pick randomly
        const validMoves = openingMoves.filter(move => game.isValidMove(move.row, move.col));
        if (validMoves.length > 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        
        return null;
    }
} 