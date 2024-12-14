class GoInterface {
    constructor() {
        this.canvas = document.getElementById('goBoard');
        this.ctx = this.canvas.getContext('2d');
        this.game = null;
        this.ai = null;
        this.cellSize = 40;
        this.padding = 20;
        this.moveIndex = -1;
        this.replayMode = false;
        this.animations = new Map(); // Store active animations
        this.lastMove = null; // Track the last move for highlighting
        
        this.rulesUI = new RulesUI();
        
        this.setupEventListeners();
        this.startNewGame();
        this.setupReplayControls();
        
        // Add animation frame request
        requestAnimationFrame(this.animate.bind(this));
        this.updateStatus();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        document.getElementById('newGame').addEventListener('click', () => this.startNewGame());
        document.getElementById('boardSize').addEventListener('change', () => this.startNewGame());
        document.getElementById('difficulty').addEventListener('change', () => this.startNewGame());
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseout', () => {
            this.hoverPos = null;
        });
        
        document.getElementById('rulesBtn').addEventListener('click', () => {
            this.rulesUI.openModal();
        });
    }

    setupReplayControls() {
        const controls = document.createElement('div');
        controls.className = 'replay-controls';
        controls.innerHTML = `
            <button id="prevMove" disabled>←</button>
            <button id="nextMove" disabled>→</button>
            <button id="toggleReplay">View History</button>
        `;
        
        document.querySelector('.controls').appendChild(controls);
        
        document.getElementById('passMove').addEventListener('click', () => this.handlePass());
        document.getElementById('prevMove').addEventListener('click', () => this.prevMove());
        document.getElementById('nextMove').addEventListener('click', () => this.nextMove());
        document.getElementById('toggleReplay').addEventListener('click', () => this.toggleReplay());
    }

    startNewGame() {
        const size = parseInt(document.getElementById('boardSize').value);
        const difficulty = document.getElementById('difficulty').value;
        
        this.game = new GoGame(size);
        this.ai = new GoAI(difficulty);
        
        // Adjust canvas size
        this.canvas.width = size * this.cellSize + 2 * this.padding;
        this.canvas.height = size * this.cellSize + 2 * this.padding;
        
        this.draw();
        this.updateScore();
    }

    handleClick(event) {
        if (this.game.gameEnded) return;
        if (this.game.currentPlayer === 'white') return; // Wait for AI move

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left - this.padding;
        const y = event.clientY - rect.top - this.padding;
        
        const col = Math.round(x / this.cellSize);
        const row = Math.round(y / this.cellSize);
        
        if (row >= 0 && row < this.game.size && col >= 0 && col < this.game.size) {
            if (this.game.makeMove(row, col)) {
                this.draw();
                this.updateScore();
                
                // AI's turn
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
        this.updateStatus();
    }

    makeAIMove() {
        const move = this.ai.makeMove(this.game);
        if (move) {
            this.game.makeMove(move.row, move.col);
            this.draw();
            this.updateScore();
        } else {
            // AI decides to pass
            if (this.game.pass()) {
                this.updateStatus();
                this.showGameEnd();
            }
        }
    }

    animate(timestamp) {
        this.draw(timestamp);
        requestAnimationFrame(this.animate.bind(this));
    }

    draw(timestamp = 0) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board grid
        this.drawGrid();
        
        // Draw stones with animations
        for (let row = 0; row < this.game.size; row++) {
            for (let col = 0; col < this.game.size; col++) {
                const stone = this.game.board[row][col];
                if (stone) {
                    const key = `${row},${col}`;
                    const animation = this.animations.get(key);
                    
                    if (animation) {
                        // Draw animated stone
                        const progress = Math.min(1, (timestamp - animation.start) / 300);
                        const scale = this.easeOutBack(progress);
                        this.drawStone(row, col, stone, scale, animation.alpha);
                        
                        if (progress >= 1) {
                            this.animations.delete(key);
                        }
                    } else {
                        // Draw regular stone
                        this.drawStone(row, col, stone, 1, 1);
                    }
                }
            }
        }

        // Highlight last move
        if (this.lastMove && !this.replayMode) {
            this.drawLastMoveMarker(this.lastMove.row, this.lastMove.col);
        }

        // Draw hover effect
        if (this.hoverPos && !this.replayMode) {
            this.drawHoverStone(this.hoverPos.row, this.hoverPos.col);
        }
    }

    drawGrid() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.game.size; i++) {
            // Vertical lines
            const x = this.padding + i * this.cellSize;
            this.ctx.moveTo(x, this.padding);
            this.ctx.lineTo(x, this.padding + (this.game.size - 1) * this.cellSize);
            
            // Horizontal lines
            const y = this.padding + i * this.cellSize;
            this.ctx.moveTo(this.padding, y);
            this.ctx.lineTo(this.padding + (this.game.size - 1) * this.cellSize, y);
        }
        this.ctx.stroke();

        // Draw star points (hoshi)
        this.drawStarPoints();
    }

    drawStarPoints() {
        const starPoints = this.getStarPoints();
        this.ctx.fillStyle = '#000';
        
        starPoints.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(
                this.padding + point.col * this.cellSize,
                this.padding + point.row * this.cellSize,
                3,
                0,
                2 * Math.PI
            );
            this.ctx.fill();
        });
    }

    drawStone(row, col, color, scale = 1, alpha = 1) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        const radius = this.cellSize * 0.4 * scale;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Enhanced shadow
        this.ctx.beginPath();
        this.ctx.arc(x + 3, y + 3, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();

        // Stone with enhanced gradient
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (color === 'white') {
            const gradient = this.ctx.createRadialGradient(
                x - radius/2, y - radius/2, radius/10,
                x, y, radius
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, '#f0f0f0');
            gradient.addColorStop(1, '#ddd');
            this.ctx.fillStyle = gradient;
            
            // Add subtle inner shadow
            this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
            this.ctx.shadowBlur = 3;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;
        } else {
            const gradient = this.ctx.createRadialGradient(
                x - radius/2, y - radius/2, radius/10,
                x, y, radius
            );
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(0.5, '#333');
            gradient.addColorStop(1, '#000');
            this.ctx.fillStyle = gradient;
            
            // Add subtle highlight
            this.ctx.shadowColor = 'rgba(255,255,255,0.1)';
            this.ctx.shadowBlur = 3;
            this.ctx.shadowOffsetX = -1;
            this.ctx.shadowOffsetY = -1;
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = color === 'white' ? '#ccc' : '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawLastMoveMarker(row, col) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.game.board[row][col] === 'black' ? '#fff' : '#000';
        this.ctx.fill();
    }

    drawHoverStone(row, col) {
        if (this.game.isValidMove(row, col)) {
            const x = this.padding + col * this.cellSize;
            const y = this.padding + row * this.cellSize;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize * 0.4, 0, 2 * Math.PI);
            this.ctx.fillStyle = this.game.currentPlayer === 'black' 
                ? 'rgba(0, 0, 0, 0.3)' 
                : 'rgba(255, 255, 255, 0.3)';
            this.ctx.fill();
        }
    }

    // Animation easing function
    easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }

    updateScore() {
        const score = this.game.getScore();
        document.getElementById('blackScore').textContent = score.black;
        document.getElementById('whiteScore').textContent = score.white;
        
        const status = document.getElementById('gameStatus');
        status.textContent = `Current player: ${this.game.currentPlayer}`;
    }

    handlePass() {
        if (this.game.currentPlayer === 'white') return;
        
        if (this.game.pass()) {
            // Game ended by passing
            this.updateStatus();
            this.showGameEnd();
        } else {
            this.updateScore();
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    showGameEnd() {
        const score = this.game.finalScore;
        const margin = Math.abs(score.black - score.white);
        const status = document.getElementById('gameStatus');
        
        status.textContent = `Game Over! ${this.game.winner.charAt(0).toUpperCase() + 
            this.game.winner.slice(1)} wins by ${margin.toFixed(1)} points! ` +
            `(Black: ${score.black.toFixed(1)}, White: ${score.white.toFixed(1)})`;
        status.classList.add('game-over');

        // Add victory animation to the winner's score display
        document.querySelector(`.score div:contains('${this.game.winner}')`).classList.add('victory');
        
        // Enable replay controls
        document.getElementById('prevMove').disabled = false;
        document.getElementById('nextMove').disabled = false;
    }

    toggleReplay() {
        this.replayMode = !this.replayMode;
        if (this.replayMode) {
            this.moveIndex = this.game.history.length - 1;
            document.getElementById('toggleReplay').textContent = 'Exit History';
        } else {
            this.moveIndex = -1;
            document.getElementById('toggleReplay').textContent = 'View History';
        }
        this.updateReplayControls();
    }

    prevMove() {
        if (this.moveIndex > 0) {
            this.moveIndex--;
            this.replayBoard();
        }
    }

    nextMove() {
        if (this.moveIndex < this.game.history.length - 1) {
            this.moveIndex++;
            this.replayBoard();
        }
    }

    replayBoard() {
        // Create temporary game state
        const tempGame = new GoGame(this.game.size);
        
        // Replay moves up to current index
        for (let i = 0; i <= this.moveIndex; i++) {
            const move = this.game.history[i];
            if (move.pass) {
                tempGame.pass();
            } else {
                tempGame.makeMove(move.row, move.col);
            }
        }
        
        // Update display
        this.board = tempGame.board;
        this.draw();
        this.updateReplayControls();
    }

    updateReplayControls() {
        const prevBtn = document.getElementById('prevMove');
        const nextBtn = document.getElementById('nextMove');
        
        prevBtn.disabled = !this.replayMode || this.moveIndex <= 0;
        nextBtn.disabled = !this.replayMode || this.moveIndex >= this.game.history.length - 1;
    }

    handleMouseMove(event) {
        if (this.replayMode || this.game.gameEnded) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left - this.padding;
        const y = event.clientY - rect.top - this.padding;
        
        const col = Math.round(x / this.cellSize);
        const row = Math.round(y / this.cellSize);
        
        if (row >= 0 && row < this.game.size && col >= 0 && col < this.game.size) {
            this.hoverPos = { row, col };
        } else {
            this.hoverPos = null;
        }
    }

    makeMove(row, col) {
        if (this.game.makeMove(row, col)) {
            // Add placement animation
            this.animations.set(`${row},${col}`, {
                start: performance.now(),
                alpha: 1
            });
            
            this.lastMove = { row, col };
            return true;
        }
        return false;
    }

    getStarPoints() {
        const points = [];
        if (this.game.size === 19) {
            [3, 9, 15].forEach(row => {
                [3, 9, 15].forEach(col => {
                    points.push({ row, col });
                });
            });
        } else if (this.game.size === 13) {
            [3, 6, 9].forEach(row => {
                [3, 6, 9].forEach(col => {
                    points.push({ row, col });
                });
            });
        } else if (this.game.size === 9) {
            [2, 4, 6].forEach(row => {
                [2, 4, 6].forEach(col => {
                    points.push({ row, col });
                });
            });
        }
        return points;
    }

    updateStatus() {
        const status = document.getElementById('gameStatus');
        if (this.game.gameEnded) {
            this.showGameEnd();
        } else {
            status.textContent = `Current player: ${this.game.currentPlayer}`;
            status.classList.remove('game-over');
        }
    }

    pass() {
        if (this.game.pass()) {
            this.updateStatus();
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new GoInterface();
}); 