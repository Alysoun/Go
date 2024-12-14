class RulesUI {
    constructor() {
        this.modal = document.getElementById('rulesModal');
        this.diagrams = {};
        this.activeSection = 'basics'; // Add default active section
        
        this.init();
    }

    init() {
        // Close button
        const closeBtn = this.modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Tab switching
        this.modal.querySelectorAll('.rule-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.section);
            });
        });

        // Create diagrams only once during initialization
        this.createDiagrams();
        
        // Render initial diagram for the default active section
        this.renderDiagram(this.activeSection);
    }

    createDiagrams() {
        ['basics', 'capturing', 'territory', 'scoring', 'special'].forEach(section => {
            const container = document.getElementById(`${section}Diagram`);
            // Only create canvas if container exists and doesn't already have one
            if (container && !container.querySelector('canvas')) {
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                container.appendChild(canvas);
                this.diagrams[section] = new RuleDiagram(canvas, section);
            }
        });
    }

    openModal() {
        this.modal.classList.add('show');
        // Always render the current active section's diagram
        this.renderDiagram(this.activeSection);
    }

    switchTab(section) {
        this.activeSection = section; // Update active section
        
        // Update active tab
        this.modal.querySelectorAll('.rule-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });

        // Update active section
        this.modal.querySelectorAll('.rule-section').forEach(sect => {
            sect.classList.toggle('active', sect.id === section);
        });

        // Render diagram for active section
        this.renderDiagram(section);
    }

    renderDiagram(section) {
        if (this.diagrams[section]) {
            this.diagrams[section].render();
        }
    }

    closeModal() {
        this.modal.classList.remove('show');
    }
}

class RuleDiagram {
    constructor(canvas, type) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type;
        this.cellSize = 20;
        this.padding = 20;
        this.gridSize = 7; // Small grid for examples
    }

    drawGrid() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.gridSize; i++) {
            // Vertical lines
            this.ctx.moveTo(this.padding + i * this.cellSize, this.padding);
            this.ctx.lineTo(this.padding + i * this.cellSize, this.padding + (this.gridSize - 1) * this.cellSize);
            
            // Horizontal lines
            this.ctx.moveTo(this.padding, this.padding + i * this.cellSize);
            this.ctx.lineTo(this.padding + (this.gridSize - 1) * this.cellSize, this.padding + i * this.cellSize);
        }
        this.ctx.stroke();
    }

    drawStone(row, col, color) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        const radius = this.cellSize * 0.4;

        // Stone shadow
        this.ctx.beginPath();
        this.ctx.arc(x + 1, y + 1, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();

        // Stone
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (color === 'white') {
            const gradient = this.ctx.createRadialGradient(
                x - radius/3, y - radius/3, radius/10,
                x, y, radius
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            this.ctx.fillStyle = gradient;
        } else {
            const gradient = this.ctx.createRadialGradient(
                x - radius/3, y - radius/3, radius/10,
                x, y, radius
            );
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
            this.ctx.fillStyle = gradient;
        }
        
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawBasicExample() {
        // Show basic stone placement
        this.drawStone(2, 2, 'black');
        this.drawStone(3, 3, 'white');
        this.drawStone(4, 2, 'black');
    }

    drawCaptureExample() {
        // Show a capture situation with replay possibility
        this.drawStone(2, 2, 'black');
        this.drawStone(2, 3, 'black');
        this.drawStone(2, 4, 'black');
        this.drawStone(3, 3, 'white');
        
        // Draw semi-transparent stone to show potential capture
        this.ctx.globalAlpha = 0.5;
        this.drawStone(4, 3, 'black');
        this.ctx.globalAlpha = 0.3;
        // Show that the captured position can be played again
        this.drawStone(3, 3, 'white');
        this.ctx.globalAlpha = 1.0;

        // Add explanatory text
        this.ctx.fillStyle = '#000';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('Captured stones are removed', this.padding, this.canvas.height - 30);
        this.ctx.fillText('Position becomes playable again', this.padding, this.canvas.height - 15);
    }

    drawTerritoryExample() {
        // Show territory example
        this.drawStone(1, 1, 'black');
        this.drawStone(1, 2, 'black');
        this.drawStone(2, 1, 'black');
        this.drawStone(2, 3, 'black');
        this.drawStone(3, 2, 'black');
        
        // Mark territory
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(
            this.padding + 1.5 * this.cellSize,
            this.padding + 1.5 * this.cellSize,
            this.cellSize,
            this.cellSize
        );
    }

    drawScoringExample() {
        // Show scoring example with territory and captures
        this.drawStone(1, 1, 'black');
        this.drawStone(1, 2, 'black');
        this.drawStone(2, 1, 'black');
        this.drawStone(5, 5, 'white');
        this.drawStone(5, 4, 'white');
        
        // Mark territories
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(
            this.padding + 1.5 * this.cellSize,
            this.padding + 1.5 * this.cellSize,
            this.cellSize,
            this.cellSize
        );
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(
            this.padding + 4.5 * this.cellSize,
            this.padding + 4.5 * this.cellSize,
            this.cellSize,
            this.cellSize
        );
    }

    drawSpecialExample() {
        // Show ko situation
        this.drawStone(2, 2, 'black');
        this.drawStone(3, 1, 'black');
        this.drawStone(4, 2, 'black');
        this.drawStone(3, 3, 'black');
        this.drawStone(3, 2, 'white');
        
        // Mark ko point
        this.ctx.beginPath();
        this.ctx.arc(
            this.padding + 2 * this.cellSize,
            this.padding + 3 * this.cellSize,
            3,
            0,
            2 * Math.PI
        );
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        
        switch(this.type) {
            case 'basics':
                this.drawBasicExample();
                break;
            case 'capturing':
                this.drawCaptureExample();
                break;
            case 'territory':
                this.drawTerritoryExample();
                break;
            case 'scoring':
                this.drawScoringExample();
                break;
            case 'special':
                this.drawSpecialExample();
                break;
        }
    }
}

// Initialize rules UI
const rulesUI = new RulesUI(); 