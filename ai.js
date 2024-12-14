class GoAI {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        // Limit depth based on difficulty
        this.maxDepth = {
            'easy': 1,
            'medium': 2,
            'hard': 3
        }[difficulty];
        
        // Evaluation weights
        this.weights = {
            territory: 1.0,
            captures: 2.0,
            liberties: 0.3,
            influence: 0.5
        };
    }

    makeMove(game) {
        const moves = this.getPossibleMoves(game);
        if (moves.length === 0) {
            game.pass();
            return null;
        }

        // For easy difficulty, just pick a random valid move
        if (this.difficulty === 'easy') {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        let bestScore = -Infinity;
        let bestMove = null;
        
        // Use alpha-beta pruning
        const alpha = -Infinity;
        const beta = Infinity;

        // Sort moves to improve pruning efficiency
        this.orderMoves(moves, game);

        for (const move of moves) {
            const newGame = this.cloneGame(game);
            newGame.makeMove(move.row, move.col);
            
            const score = -this.minimax(newGame, this.maxDepth - 1, -beta, -alpha, false);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            alpha = Math.max(alpha, score);
            if (alpha >= beta) break;
        }

        return bestMove;
    }

    minimax(game, depth, alpha, beta, maximizing) {
        // Early termination conditions
        if (depth === 0 || game.gameEnded) {
            return this.evaluatePosition(game);
        }

        const moves = this.getPossibleMoves(game);
        if (moves.length === 0) return this.evaluatePosition(game);

        let bestScore = maximizing ? -Infinity : Infinity;

        for (const move of moves) {
            const newGame = this.cloneGame(game);
            newGame.makeMove(move.row, move.col);
            
            const score = this.minimax(newGame, depth - 1, -beta, -alpha, !maximizing);
            
            if (maximizing) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }
            
            if (alpha >= beta) break;
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

    quickEvaluateMove(move, game) {
        let score = 0;
        
        // Prefer moves that capture
        const captures = game.findCaptures(move.row, move.col, game.board);
        score += captures.length * 10;
        
        // Prefer moves near the center
        const centerDist = Math.abs(move.row - game.size/2) + Math.abs(move.col - game.size/2);
        score -= centerDist;
        
        // Prefer moves near existing stones
        const adjacentStones = this.countAdjacentStones(move, game);
        score += adjacentStones;
        
        return score;
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

    evaluatePosition(game) {
        const territory = game.calculateTerritory();
        const score = 
            (territory.white - territory.black) * this.weights.territory +
            (game.captures.white - game.captures.black) * this.weights.captures;
            
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
} 