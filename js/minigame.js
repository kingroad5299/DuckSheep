/* ============================================
   DuckSheep - MiniGame: Catch the Stars
   ============================================ */

const MiniGame = {
    canvas: null,
    ctx: null,
    running: false,
    score: 0,
    coins: 0,
    stars: [],
    bombs: [],
    spawnTimer: 0,
    gameTime: 0,
    duration: 20000, // 20 seconds
    speed: 1,
    combo: 0,
    comboTimer: 0,
    particles: [],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 320;
        this.canvas.height = 400;
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick(e.touches[0]);
        }, { passive: false });
    },

    start() {
        this.running = true;
        this.score = 0;
        this.coins = 0;
        this.stars = [];
        this.bombs = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.gameTime = 0;
        this.speed = 1;
        this.combo = 0;
        this.comboTimer = 0;
    },

    stop() {
        this.running = false;
        const earned = Math.floor(this.score / 10) + this.coins;
        return { score: this.score, coins: earned };
    },

    handleClick(e) {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        for (let i = this.stars.length - 1; i >= 0; i--) {
            const s = this.stars[i];
            const dx = mx - s.x;
            const dy = my - s.y;
            if (Math.sqrt(dx * dx + dy * dy) < s.radius + 10) {
                this.combo++;
                this.comboTimer = 60;
                const bonus = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
                this.score += 10 * bonus;
                this.spawnParticles(s.x, s.y, s.color);
                this.stars.splice(i, 1);
                return;
            }
        }

        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const b = this.bombs[i];
            const dx = mx - b.x;
            const dy = my - b.y;
            if (Math.sqrt(dx * dx + dy * dy) < b.radius + 10) {
                this.combo = 0;
                this.score = Math.max(0, this.score - 20);
                this.spawnParticles(b.x, b.y, '#ff4444');
                this.bombs.splice(i, 1);
                return;
            }
        }
    },

    spawnParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                life: 30,
                color,
                size: 2 + Math.random() * 3
            });
        }
    },

    update() {
        if (!this.running) return;

        this.gameTime += 16.67;
        this.speed = 1 + this.gameTime / this.duration * 2;

        // Spawn
        this.spawnTimer += 16.67;
        const spawnRate = Math.max(300, 800 - this.gameTime * 0.5);
        if (this.spawnTimer > spawnRate) {
            this.spawnTimer = 0;
            if (Math.random() < 0.15) {
                // Bomb
                this.bombs.push({
                    x: 20 + Math.random() * (this.canvas.width - 40),
                    y: -30,
                    vy: 1.5 + Math.random() * this.speed,
                    radius: 18,
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.1
                });
            } else {
                this.stars.push({
                    x: 20 + Math.random() * (this.canvas.width - 40),
                    y: -30,
                    vy: 1 + Math.random() * this.speed * 1.5,
                    radius: 14 + Math.random() * 6,
                    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.08,
                    sparkle: 0
                });
            }
        }

        // Update stars
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const s = this.stars[i];
            s.y += s.vy;
            s.rotation += s.rotSpeed;
            s.sparkle += 0.1;
            if (s.y > this.canvas.height + 30) {
                this.stars.splice(i, 1);
                this.combo = 0;
            }
        }

        // Update bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const b = this.bombs[i];
            b.y += b.vy;
            b.rotation += b.rotSpeed;
            if (b.y > this.canvas.height + 30) {
                this.bombs.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.combo = 0;
        }

        // End game
        if (this.gameTime >= this.duration) {
            return this.stop();
        }
    },

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#1a1a2e');
        bgGrad.addColorStop(1, '#16213e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Stars in background
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 20; i++) {
            const sx = (i * 73 + this.gameTime * 0.01) % w;
            const sy = (i * 47) % h;
            ctx.fillRect(sx, sy, 2, 2);
        }

        // Draw stars
        for (const s of this.stars) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            this.drawStar(ctx, 0, 0, s.radius, s.color);
            ctx.restore();
        }

        // Draw bombs
        for (const b of this.bombs) {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rotation);
            this.drawBomb(ctx, 0, 0, b.radius);
            ctx.restore();
        }

        // Draw particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Segoe UI", "Microsoft YaHei", sans-serif';
        ctx.fillText('⭐ ' + this.score, 10, 28);

        const timeLeft = Math.max(0, Math.ceil((this.duration - this.gameTime) / 1000));
        ctx.fillText('⏱ ' + timeLeft + 's', w - 70, 28);

        if (this.combo >= 5) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px "Segoe UI", "Microsoft YaHei", sans-serif';
            ctx.fillText('🔥 ' + this.combo + ' COMBO!', w / 2 - 40, 55);
        }

        if (!this.running && this.gameTime >= this.duration) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 24px "Segoe UI", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束!', w / 2, h / 2 - 20);
            ctx.fillStyle = '#fff';
            ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
            ctx.fillText('得分: ' + this.score + ' | 金币: +' + Math.floor(this.score / 10), w / 2, h / 2 + 20);
            ctx.textAlign = 'start';
        }
    },

    drawStar(ctx, x, y, r, color) {
        const spikes = 5;
        const outerR = r;
        const innerR = r * 0.45;

        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
    },

    drawBomb(ctx, x, y, r) {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Fuse
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + r * 0.5, y - r * 0.7);
        ctx.quadraticCurveTo(x + r * 0.8, y - r * 1.3, x + r * 0.3, y - r * 1.5);
        ctx.stroke();

        // Spark
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(x + r * 0.3, y - r * 1.5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Skull
        ctx.fillStyle = '#fff';
        ctx.font = ${r * 0.8}px sans-serif;
        ctx.textAlign = 'center';
        ctx.fillText('💣', x, y + r * 0.3);
        ctx.textAlign = 'start';
    }
};
