// Abstract Game Class
class MiniGame {
    constructor(modalId, canvasId) {
        this.modal = document.getElementById(modalId);
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isActive = false;
        this.onComplete = null;
        this.loop = this.loop.bind(this);
    }

    init() { /* Override me */ }
    start(callback) {
        this.onComplete = callback;
        this.isActive = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }
    stop() { this.isActive = false; }
    update(dt) { /* Override me */ }
    draw() { /* Override me */ }

    loop(timestamp) {
        if (!this.isActive) return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        requestAnimationFrame(this.loop);
    }

    win() {
        this.isActive = false;
        if (this.onComplete) this.onComplete();
    }
}

// ---------------- Bug Hunter Game ----------------
class BugHunterGame extends MiniGame {
    constructor(modalId, canvasId) {
        super(modalId, canvasId);
        this.bugs = [];
        this.score = 0;
        this.targetScore = 5;
        this.handleInput = this.handleInput.bind(this);
    }

    start(callback) {
        super.start(callback);
        this.score = 0;
        this.bugs = [];
        this.canvas.onmousedown = this.handleInput;
        this.updateUI();
        for (let i = 0; i < 3; i++) this.spawnBug();
    }

    stop() {
        super.stop();
        this.canvas.onmousedown = null;
    }

    spawnBug() {
        const size = 30 + Math.random() * 20;
        this.bugs.push({
            x: Math.random() * (this.canvas.width - size),
            y: Math.random() * (this.canvas.height - size),
            size: size,
            speedX: (Math.random() - 0.5) * 4,
            speedY: (Math.random() - 0.5) * 4,
            color: '#ef4444'
        });
    }

    handleInput(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const mouseY = (event.clientY - rect.top) * (this.canvas.height / rect.height);

        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.beginPath();
        this.ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
        this.ctx.fill();

        for (let i = this.bugs.length - 1; i >= 0; i--) {
            const bug = this.bugs[i];
            const dx = mouseX - (bug.x + bug.size / 2);
            const dy = mouseY - (bug.y + bug.size / 2);
            if (Math.sqrt(dx * dx + dy * dy) < bug.size / 2 + 10) {
                this.bugs.splice(i, 1);
                this.score++;
                this.updateUI();
                if (this.score >= this.targetScore) this.win();
                else {
                    if (this.bugs.length < 2) this.spawnBug();
                    setTimeout(() => this.spawnBug(), 200);
                }
                return;
            }
        }
    }

    update(dt) {
        this.bugs.forEach(bug => {
            bug.x += bug.speedX;
            bug.y += bug.speedY;
            if (bug.x <= 0 || bug.x + bug.size >= this.canvas.width) bug.speedX *= -1;
            if (bug.y <= 0 || bug.y + bug.size >= this.canvas.height) bug.speedY *= -1;
        });
    }

    draw() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 40) { this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke(); }
        for (let i = 0; i < this.canvas.height; i += 40) { this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke(); }

        this.bugs.forEach(bug => {
            this.ctx.fillStyle = bug.color;
            this.ctx.fillRect(bug.x, bug.y, bug.size, bug.size);
            this.ctx.strokeStyle = '#7f1d1d';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(bug.x, bug.y, bug.size, bug.size);
        });
    }

    updateUI() {
        const uiTitle = document.querySelector('.game-header h3');
        const uiInstruct = document.querySelector('.game-header p');
        const uiScore = document.querySelector('.score');

        uiTitle.innerHTML = 'SYSTEM LOCKED 🔒';
        uiInstruct.innerHTML = 'Debug the code! Destroy bugs.';
        uiScore.innerHTML = `Bugs Fixed: ${this.score}/${this.targetScore}`;
    }
}

// ---------------- Wire Fix Game (Polished) ----------------
class WireFixGame extends MiniGame {
    constructor(modalId, canvasId) {
        super(modalId, canvasId);
        this.wires = [];
        this.draggingWire = null;
        this.colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
        this.handleDown = this.handleDown.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleUp = this.handleUp.bind(this);
        this.particles = [];
    }

    start(callback) {
        super.start(callback);
        this.wires = [];
        this.particles = [];
        this.setupWires();

        this.canvas.onmousedown = this.handleDown;
        this.canvas.onmousemove = this.handleMove;
        this.canvas.onmouseup = this.handleUp;
        this.canvas.addEventListener('touchstart', (e) => this.handleDown(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e.touches[0]));
        this.canvas.addEventListener('touchend', this.handleUp);

        this.updateUI();
    }

    stop() {
        super.stop();
        this.canvas.onmousedown = null;
        this.canvas.onmousemove = null;
        this.canvas.onmouseup = null;
    }

    setupWires() {
        const leftY = [80, 160, 240, 320];
        const rightY = [80, 160, 240, 320].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 4; i++) {
            this.wires.push({
                color: this.colors[i],
                left: { x: 80, y: leftY[i] },
                right: { x: 520, y: rightY[i] },
                current: { x: 80, y: leftY[i] },
                connected: false
            });
        }
    }

    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    handleDown(event) {
        const pos = this.getMousePos(event);
        this.draggingWire = this.wires.find(w =>
            !w.connected && Math.hypot(pos.x - w.left.x, pos.y - w.left.y) < 30
        );
    }

    handleMove(event) {
        if (this.draggingWire) {
            const pos = this.getMousePos(event);
            this.draggingWire.current = pos;

            const dx = pos.x - this.draggingWire.right.x;
            const dy = pos.y - this.draggingWire.right.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                this.draggingWire.current = { x: this.draggingWire.right.x, y: this.draggingWire.right.y };
            }
        }
    }

    handleUp(event) {
        if (this.draggingWire) {
            const w = this.draggingWire;
            if (Math.hypot(w.current.x - w.right.x, w.current.y - w.right.y) < 30) {
                w.connected = true;
                w.current = { x: w.right.x, y: w.right.y };
                this.spawnParticles(w.right.x, w.right.y, w.color);
                if (this.wires.every(wire => wire.connected)) setTimeout(() => this.win(), 500);
            } else {
                w.current = { x: w.left.x, y: w.left.y };
            }
            this.draggingWire = null;
        }
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: color,
                life: 1.0
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.05;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < this.canvas.width; i += 20) { this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); }
        this.ctx.stroke();

        this.wires.forEach(w => {
            this.ctx.beginPath();
            this.ctx.moveTo(w.left.x, w.left.y);
            this.ctx.lineTo(w.current.x, w.current.y);
            this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            this.ctx.lineWidth = 14;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(w.left.x, w.left.y);
            this.ctx.lineTo(w.current.x, w.current.y);
            this.ctx.strokeStyle = w.color;
            this.ctx.lineWidth = 8;
            this.ctx.lineCap = 'round';
            this.ctx.shadowBlur = w.connected ? 15 : 5;
            this.ctx.shadowColor = w.color;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.drawPin(w.left.x, w.left.y, w.color);
            this.drawPin(w.right.x, w.right.y, w.color);
        });

        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }

    drawPin(x, y, color) {
        this.ctx.fillStyle = '#1e293b';
        this.ctx.beginPath(); this.ctx.arc(x, y, 15, 0, Math.PI * 2); this.ctx.fill();

        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        this.ctx.beginPath(); this.ctx.arc(x, y, 8, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    updateUI() {
        const uiTitle = document.querySelector('.game-header h3');
        const uiInstruct = document.querySelector('.game-header p');
        const uiScore = document.querySelector('.score');

        uiTitle.innerHTML = 'CIRCUIT BREAKER ⚡';
        uiTitle.style.color = '#eab308';
        uiInstruct.innerHTML = 'Connect matching terminals to restore power.';
        uiScore.innerHTML = '';
    }
}

// ---------------- Basket Game ----------------
class BasketGame extends MiniGame {
    constructor(modalId, canvasId) {
        super(modalId, canvasId);
        this.ball = { x: 100, y: 300, radius: 15, vx: 0, vy: 0 };
        this.hoop = { x: 500, y: 150, radius: 25 };
        this.power = 0;
        this.charging = false;
        this.flying = false;
        this.shots = 0;
        this.gravity = 0.5;
        this.powerSpeed = 2;
        this.powerDirection = 1;

        this.handleDown = this.handleDown.bind(this);
        this.handleUp = this.handleUp.bind(this);
    }

    start(callback) {
        super.start(callback);
        this.resetBall();
        this.shots = 0;

        this.canvas.onmousedown = this.handleDown;
        this.canvas.onmouseup = this.handleUp;
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleDown(); });
        this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.handleUp(); });

        this.updateUI();
    }

    stop() {
        super.stop();
        this.canvas.onmousedown = null;
        this.canvas.onmouseup = null;
    }

    resetBall() {
        this.ball.x = 100;
        this.ball.y = 300;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.flying = false;
        this.charging = false;
        this.power = 0;
    }

    handleDown() {
        if (!this.flying) {
            this.charging = true;
            this.power = 0;
        }
    }

    handleUp() {
        if (this.charging) {
            this.charging = false;
            this.shoot();
        }
    }

    shoot() {
        this.flying = true;
        this.shots++;
        const angle = -60 * (Math.PI / 180);
        const speed = 10 + (this.power / 5);
        this.ball.vx = Math.cos(angle) * speed;
        this.ball.vy = Math.sin(angle) * speed;
    }

    update(dt) {
        if (this.charging) {
            this.power += this.powerSpeed * this.powerDirection;
            if (this.power >= 100 || this.power <= 0) this.powerDirection *= -1;
        }

        if (this.flying) {
            this.ball.vy += this.gravity;
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;

            if (this.ball.y > this.canvas.height) this.resetBall();
            if (this.ball.x > this.canvas.width) this.resetBall();

            const dx = this.ball.x - this.hoop.x;
            const dy = this.ball.y - this.hoop.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20 && this.ball.vy > 0) this.win();
        }
    }

    draw() {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(0, 350, 600, 50);
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.fillRect(550, 150, 10, 200);
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(this.hoop.x - 25, this.hoop.y, 50, 5);
        this.ctx.beginPath();
        this.ctx.moveTo(this.hoop.x - 25, this.hoop.y + 5);
        this.ctx.lineTo(this.hoop.x, this.hoop.y + 40);
        this.ctx.lineTo(this.hoop.x + 25, this.hoop.y + 5);
        this.ctx.strokeStyle = '#fff';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f97316';
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();

        if (this.charging || !this.flying) {
            this.ctx.fillStyle = '#334155';
            this.ctx.fillRect(50, 50, 20, 100);
            const height = this.power;
            const color = this.power > 80 ? '#ef4444' : (this.power > 50 ? '#f59e0b' : '#10b981');
            this.ctx.fillStyle = color;
            this.ctx.fillRect(50, 150 - height, 20, height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText("POWER", 40, 165);
        }

        if (!this.flying) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.ball.x, this.ball.y);
            this.ctx.lineTo(this.ball.x + 30, this.ball.y - 50);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    updateUI() {
        const uiTitle = document.querySelector('.game-header h3');
        const uiInstruct = document.querySelector('.game-header p');
        const uiScore = document.querySelector('.score');

        uiTitle.innerHTML = 'PROJECT LAUNCH 🏀';
        uiTitle.style.color = '#f97316';
        uiInstruct.innerHTML = 'Hold mouse to charge. Release to shoot!';
        uiScore.innerHTML = `Shots: ${this.shots}`;
    }
}

// ---------------- Mario Game ----------------
class MarioGame extends MiniGame {
    constructor(modalId, canvasId) {
        super(modalId, canvasId);
        this.player = { x: 50, y: 300, width: 30, height: 30, vy: 0, jumping: false, onGround: true };
        this.gravity = 0.6;
        this.jumpForce = -12;
        this.speed = 4;
        this.distance = 0;
        this.targetDistance = 2000;
        this.obstacles = [];
        this.bgOffset = 0;
        this.lastSpawnAt = -1000;

        this.handleInput = this.handleInput.bind(this);

        // Load Assets
        this.sprites = {
            mario: new Image(),
            goomba: new Image(),
            pipe: new Image()
        };
        this.sprites.mario.src = 'assets/images/mario.png';
        this.sprites.goomba.src = 'assets/images/goomba.png';
        this.sprites.pipe.src = 'assets/images/pipe.png';
    }

    start(callback) {
        super.start(callback);
        this.distance = 0;
        this.obstacles = [];
        this.player.y = 300;
        this.player.vy = 0;
        this.lastSpawnAt = -1000;

        document.addEventListener('keydown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput);
        this.canvas.addEventListener('mousedown', this.handleInput);

        this.updateUI();
    }

    stop() {
        super.stop();
        document.removeEventListener('keydown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
        this.canvas.removeEventListener('mousedown', this.handleInput);
    }

    handleInput(e) {
        if (e.type === 'keydown' && e.code === 'Space') {
            e.preventDefault();
        }

        if ((e.type === 'keydown' && e.code === 'Space') || e.type === 'touchstart' || e.type === 'mousedown') {
            if (this.player.onGround) {
                this.player.vy = this.jumpForce;
                this.player.onGround = false;
                this.player.jumping = true;
            }
        }
    }

    spawnObstacle() {
        if (this.distance - this.lastSpawnAt < 400) return;

        if (Math.random() < 0.02) {
            this.lastSpawnAt = this.distance;
            const type = Math.random() > 0.6 ? 'pipe' : 'goomba';

            if (type === 'pipe') {
                this.obstacles.push({
                    x: 600,
                    y: 280,
                    width: 40,
                    height: 50,
                    type: 'pipe'
                });
            } else {
                this.obstacles.push({
                    x: 600,
                    y: 300,
                    width: 30,
                    height: 30,
                    type: 'goomba'
                });
            }
        }
    }

    update(dt) {
        // Player Physics
        this.player.vy += this.gravity;
        this.player.y += this.player.vy;

        if (this.player.y >= 300) {
            this.player.y = 300;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.jumping = false;
        }

        // Move World
        this.distance += this.speed;
        this.bgOffset += this.speed * 0.5;

        // Spawn/Move Obstacles
        this.spawnObstacle();
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.x -= this.speed;

            // Collision
            let hitX = this.player.x + 8;
            let hitY = this.player.y + 5;
            let hitW = this.player.width - 16;
            let hitH = this.player.height - 5;

            if (this.rectIntersect(hitX, hitY, hitW, hitH, obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 5)) {
                this.distance = 0;
                this.obstacles = [];
                this.lastSpawnAt = -1000;
            }

            if (obs.x < -50) this.obstacles.splice(i, 1);
        }

        // Win Condition
        // Wait until flag (drawn at targetDist - distance + 300) reaches player (x=50)
        // (target - dist) + 300 <= 50  =>  target - dist <= -250  =>  dist >= target + 250
        if (this.distance >= this.targetDistance + 250) {
            this.win();
        }

        this.updateUI();
    }

    rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
    }

    draw() {
        // Sky
        this.ctx.fillStyle = '#5c94fc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Clouds
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = 0.8;
        this.ctx.beginPath(); this.ctx.arc(100 - (this.bgOffset % 700), 100, 30, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(400 - (this.bgOffset % 700), 150, 40, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 1.0;

        // Ground
        this.ctx.fillStyle = '#c84c0c'; // Brick Blocks
        this.ctx.fillRect(0, 330, 600, 70);
        this.ctx.fillStyle = '#d06020';
        for (let i = 0; i < 600; i += 20) {
            this.ctx.fillRect(i - (this.distance % 20), 330, 18, 18);
        }

        // Player (Sprite)
        if (this.sprites.mario.complete && this.sprites.mario.naturalWidth !== 0) {
            this.ctx.drawImage(this.sprites.mario, this.player.x, this.player.y, this.player.width, this.player.height);
        } else {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }

        // Obstacles
        this.obstacles.forEach(obs => {
            if (obs.type === 'goomba' && this.sprites.goomba.complete && this.sprites.goomba.naturalWidth !== 0) {
                this.ctx.drawImage(this.sprites.goomba, obs.x, obs.y, 30, 30);
            } else if (obs.type === 'pipe' && this.sprites.pipe.complete && this.sprites.pipe.naturalWidth !== 0) {
                this.ctx.drawImage(this.sprites.pipe, obs.x, obs.y, 40, 50);
            } else {
                this.ctx.fillStyle = obs.type === 'pipe' ? '#00bb00' : '#a04000';
                this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            }
        });

        // Flag at end
        if (this.targetDistance - this.distance < 600) {
            let flagX = (this.targetDistance - this.distance) + 300;
            this.ctx.fillStyle = '#0f0';
            this.ctx.fillRect(flagX, 150, 5, 180);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath(); this.ctx.moveTo(flagX + 5, 150); this.ctx.lineTo(flagX + 40, 170); this.ctx.lineTo(flagX + 5, 190); this.ctx.fill();
            this.ctx.fillStyle = '#a04000';
            this.ctx.fillRect(flagX + 50, 250, 80, 80);
        }
    }

    updateUI() {
        const uiTitle = document.querySelector('.game-header h3');
        const uiInstruct = document.querySelector('.game-header p');
        const uiScore = document.querySelector('.score');

        uiTitle.innerHTML = 'SUPER MARIO RUN 🍄';
        uiTitle.style.color = '#ff0000';
        uiInstruct.innerHTML = 'Jump over obstacles! Reach the castle.';
        let progress = Math.floor((this.distance / this.targetDistance) * 100);
        if (progress > 100) progress = 100;
        uiScore.innerHTML = `Progress: ${progress}%`;
    }
}

// ---------------- Game Manager ----------------
class GameManager {
    constructor() {
        this.modal = null;
        this.currentGame = null;
        this.init();
    }

    init() {
        if (!document.getElementById('game-modal')) {
            const modal = document.createElement('div');
            modal.id = 'game-modal';
            modal.className = 'game-modal';
            modal.innerHTML = `
                <div class="game-container">
                    <div class="game-header">
                        <h3>SYSTEM LOCKED 🔒</h3>
                        <p>Default instruction</p>
                    </div>
                    <canvas id="game-canvas"></canvas>
                    <div class="game-ui">
                        <div class="score"></div>
                        <button id="close-game" class="close-btn">ABORT</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('close-game').addEventListener('click', () => {
            if (this.currentGame) this.currentGame.stop();
            document.getElementById('game-modal').style.display = 'none';
        });

        this.setupTriggers();
    }

    resizeCanvas() {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.width = 600;
            canvas.height = 400;
        }
    }

    setupTriggers() {
        // First, check for already unlocked content
        this.checkSavedProgress();

        const triggers = document.querySelectorAll('.locked-content-trigger');
        triggers.forEach(btn => {
            const type = btn.getAttribute('data-game-type') || 'bug';

            // If already unlocked via sessionStorage, prevent game launch for links
            // or just ensure they work directly
            if (sessionStorage.getItem('unlocked_' + type)) {
                if (btn.tagName === 'A') {
                    btn.classList.remove('locked-content-trigger');
                    return; // Don't attach click listener for game
                }
            }

            btn.addEventListener('click', (e) => {
                const currentType = btn.getAttribute('data-game-type') || 'bug';
                if (sessionStorage.getItem('unlocked_' + currentType)) {
                    return; // Let default action happen
                }

                e.preventDefault();
                btn.blur(); // Prevent focus lingering
                this.launchGame(currentType, btn);
            });
        });
    }

    checkSavedProgress() {
        const types = ['basket', 'mario', 'wire', 'bug'];
        types.forEach(type => {
            if (sessionStorage.getItem('unlocked_' + type)) {
                // Handle Links (like Projects)
                const links = document.querySelectorAll(`a[data-game-type="${type}"]`);
                links.forEach(link => link.classList.remove('locked-content-trigger'));

                // Handle Sections (like Wire/Mario)
                // We need to find the specific buttons to find their sections
                const buttons = document.querySelectorAll(`button[data-game-type="${type}"]`);
                buttons.forEach(btn => {
                    const section = btn.closest('.locked-section');
                    if (section) {
                        const overlay = section.querySelector('.locked-overlay');
                        const content = section.querySelector('.hidden-content');
                        if (overlay) overlay.style.display = 'none';
                        if (content) {
                            content.classList.remove('hidden-content');
                            content.style.display = 'block';
                            content.style.opacity = '1';
                            content.style.pointerEvents = 'auto';
                            content.style.filter = 'none';
                        }
                        btn.style.display = 'none';
                    }
                });
            }
        });
    }

    launchGame(type, triggerBtn) {
        document.getElementById('game-modal').style.display = 'flex';

        if (type === 'wire') {
            this.currentGame = new WireFixGame('game-modal', 'game-canvas');
        } else if (type === 'basket') {
            this.currentGame = new BasketGame('game-modal', 'game-canvas');
        } else if (type === 'mario') {
            this.currentGame = new MarioGame('game-modal', 'game-canvas');
        } else {
            this.currentGame = new BugHunterGame('game-modal', 'game-canvas');
        }

        this.currentGame.start(() => {
            this.handleSuccess(triggerBtn);
        });
    }

    handleSuccess(btn) {
        const parent = btn.closest('.blog-post') || btn.closest('.project-card') || btn.closest('.locked-section') || btn.closest('.dropdown');
        const targetUrl = btn.getAttribute('href');

        document.getElementById('game-modal').style.display = 'none';

        btn.classList.add('unlocked-btn');

        // SAVE PROGRESS
        // Default to 'bug' if no type specified (handling the blog link case robustly)
        const type = btn.getAttribute('data-game-type') || 'bug';
        if (type) {
            sessionStorage.setItem('unlocked_' + type, 'true');
        }

        const toast = document.createElement('div');
        toast.className = 'unlock-toast';
        toast.innerHTML = '🔓 ACCESS GRANTED';
        document.body.appendChild(toast);

        if (targetUrl && targetUrl !== '#' && !targetUrl.startsWith('#')) {
            setTimeout(() => window.location.href = targetUrl, 1000);
        } else if (parent && parent.classList.contains('locked-section')) {
            parent.querySelector('.locked-overlay').style.display = 'none';
            const content = parent.querySelector('.hidden-content');
            if (content) {
                content.classList.remove('hidden-content');
                content.style.filter = 'none';
                content.style.opacity = '1';
                content.style.pointerEvents = 'auto';
                content.style.display = 'block';
            }
        }

        setTimeout(() => toast.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GameManager();
});
