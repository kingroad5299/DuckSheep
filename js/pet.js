/* ============================================
   DuckSheep - Canvas Pet Renderer
   Draws a cute duck-sheep hybrid character
   ============================================ */

const PetRenderer = {
    canvas: null,
    ctx: null,
    width: 200,
    height: 200,
    animFrame: 0,
    animTimer: 0,
    blinkTimer: 0,
    isBlinking: false,
    accessory: null, // 'hat', 'bow', 'crown', 'glasses', null

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.animFrame = 0;
    },

    update(dt, state) {
        this.animTimer += dt;
        this.blinkTimer += dt;
        this.animFrame++;

        // Blink every 3-5 seconds
        if (this.blinkTimer > 3000 + Math.random() * 2000) {
            this.isBlinking = true;
            setTimeout(() => { this.isBlinking = false; }, 150);
            this.blinkTimer = 0;
        }
    },

    draw(state) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const cx = w / 2;
        const cy = h / 2 + 10;

        ctx.clearRect(0, 0, w, h);

        // Determine animation offsets
        let bounceY = 0;
        let bodyScale = 1;
        let earWiggle = 0;

        if (state === 'sleeping') {
            bounceY = Math.sin(this.animTimer * 0.002) * 3;
            bodyScale = 1 + Math.sin(this.animTimer * 0.003) * 0.02;
        } else if (state === 'happy') {
            bounceY = Math.sin(this.animTimer * 0.008) * 5;
            bodyScale = 1 + Math.abs(Math.sin(this.animTimer * 0.01)) * 0.03;
        } else if (state === 'eating') {
            bounceY = Math.sin(this.animTimer * 0.015) * 2;
        } else {
            bounceY = Math.sin(this.animTimer * 0.003) * 1.5;
            bodyScale = 1 + Math.sin(this.animTimer * 0.004) * 0.01;
        }

        ctx.save();
        ctx.translate(cx, cy + bounceY);
        ctx.scale(bodyScale, bodyScale);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.ellipse(0, 65, 45, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Feet
        this.drawFoot(ctx, -18, 58);
        this.drawFoot(ctx, 18, 58);

        // Body (fluffy sheep body)
        this.drawFluffyBody(ctx, 0, 0);

        // Wings (small duck wings)
        this.drawWing(ctx, -35, -5, -1, state);
        this.drawWing(ctx, 35, -5, 1, state);

        // Duck bill
        this.drawBill(ctx, 0, 15);

        // Eyes
        this.drawEye(ctx, -10, -12);
        this.drawEye(ctx, 10, -12);

        // Blush
        this.drawBlush(ctx, -22, 2);
        this.drawBlush(ctx, 22, 2);

        // Ears (sheep ears)
        this.drawEar(ctx, -25, -30, -1);
        this.drawEar(ctx, 25, -30, 1);

        // Accessory
        if (this.accessory === 'hat') this.drawHat(ctx, 0, -38);
        if (this.accessory === 'bow') this.drawBow(ctx, 18, -25);
        if (this.accessory === 'crown') this.drawCrown(ctx, 0, -40);
        if (this.accessory === 'glasses') this.drawGlasses(ctx, 0, -12);

        ctx.restore();

        // Sleeping Z's
        if (state === 'sleeping') {
            this.drawSleepZ(ctx, cx + 30, cy - 40, this.animTimer);
        }
    },

    drawFluffyBody(ctx, x, y) {
        // Main body
        const gradient = ctx.createRadialGradient(x, y - 5, 5, x, y, 40);
        gradient.addColorStop(0, '#FFFEF9');
        gradient.addColorStop(0.7, '#F5F0E0');
        gradient.addColorStop(1, '#E8E0C8');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, 38, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4C8A8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fluffy tufts around body
        const tufts = [
            { dx: -30, dy: -20 }, { dx: 30, dy: -20 },
            { dx: -35, dy: 0 }, { dx: 35, dy: 0 },
            { dx: -25, dy: 20 }, { dx: 25, dy: 20 },
            { dx: 0, dy: -32 }, { dx: 0, dy: 28 },
        ];

        ctx.fillStyle = '#FFFEF9';
        for (const t of tufts) {
            ctx.beginPath();
            ctx.arc(x + t.dx, y + t.dy, 6 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawFoot(ctx, x, y) {
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#E68900';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    },

    drawWing(ctx, x, y, dir, state) {
        let wingAngle = 0;
        if (state === 'happy') wingAngle = Math.sin(this.animTimer * 0.015) * 0.3;
        if (state === 'eating') wingAngle = Math.sin(this.animTimer * 0.02) * 0.15;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(dir * 0.3 + wingAngle * dir);

        ctx.fillStyle = '#F5F0E0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4C8A8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    },

    drawBill(ctx, x, y) {
        // Duck bill
        ctx.fillStyle = '#FF8F00';
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.quadraticCurveTo(x, y + 14, x + 10, y);
        ctx.quadraticCurveTo(x, y + 4, x - 10, y);
        ctx.fill();
        ctx.strokeStyle = '#E07000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Nostrils
        ctx.fillStyle = '#E07000';
        ctx.beginPath();
        ctx.arc(x - 4, y + 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    },

    drawEye(ctx, x, y) {
        // Eye white
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (this.isBlinking) {
            // Closed eye
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x + 6, y);
            ctx.stroke();
        } else {
            // Pupil
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(x - 2, y - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawBlush(ctx, x, y) {
        ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    drawEar(ctx, x, y, dir) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(dir * 0.4);

        ctx.fillStyle = '#F5F0E0';
        ctx.beginPath();
        ctx.ellipse(0, -8, 7, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4C8A8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = '#FFCDD2';
        ctx.beginPath();
        ctx.ellipse(0, -6, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    drawHat(ctx, x, y) {
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 14, y - 10, 28, 18);
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(x - 14, y - 2, 28, 4);
    },

    drawBow(ctx, x, y) {
        ctx.fillStyle = '#E91E63';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x - 10, y - 10, x - 15, y + 5, x, y);
        ctx.bezierCurveTo(x + 15, y + 5, x + 10, y - 10, x, y);
        ctx.fill();
        ctx.fillStyle = '#F06292';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    drawCrown(ctx, x, y) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(x - 15, y + 5);
        ctx.lineTo(x - 15, y - 5);
        ctx.lineTo(x - 8, y - 12);
        ctx.lineTo(x, y - 5);
        ctx.lineTo(x + 8, y - 12);
        ctx.lineTo(x + 15, y - 5);
        ctx.lineTo(x + 15, y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    },

    drawGlasses(ctx, x, y) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x - 10, y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 10, y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.lineTo(x + 2, y);
        ctx.stroke();
    },

    drawSleepZ(ctx, x, y, timer) {
        const zs = ['z', 'Z', 'Z'];
        ctx.fillStyle = 'rgba(100,100,200,0.6)';
        ctx.font = 'bold 14px sans-serif';
        for (let i = 0; i < 3; i++) {
            const offset = (timer * 0.001 + i * 0.6) % 3;
            const alpha = 1 - offset / 3;
            ctx.globalAlpha = alpha;
            ctx.fillText(zs[i], x + i * 10, y - offset * 25);
        }
        ctx.globalAlpha = 1;
    }
};
