/**
 * 雪花拖尾：光斑预烘焙到高分辨率贴图，避免每帧 createRadialGradient / shadowBlur
 * 画布按设备像素比绘制，保持清晰
 */
class SnowflakeCursor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.getElementById('snowflakeCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.dpr = 1;

        this.x = 0;
        this.y = 0;
        this.vx = 1.35;
        this.vy = 1.0;
        this.frameCount = 0;

        this.trail = [];
        this.trailLength = 120;
        this.trailInterval = 1;
        this.particlesPerPoint = 12;
        this.margin = 30;
        this.sprite = this.makeSprite();

        this._onResize = () => this.resize();
        this.resize();
        this.initPosition();
        this.animate();

        window.addEventListener('resize', this._onResize);
    }

    makeSprite() {
        const size = 256;
        const s = document.createElement('canvas');
        s.width = size;
        s.height = size;
        const c = s.getContext('2d');
        const cx = size / 2;
        const g = c.createRadialGradient(cx, cx, 0, cx, cx, cx);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(0.28, 'rgba(255, 255, 255, 0.55)');
        g.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        c.fillStyle = g;
        c.fillRect(0, 0, size, size);
        return s;
    }

    resize() {
        if (!this.container || !this.canvas || !this.ctx) return;
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
        this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        this.minX = this.margin;
        this.maxX = this.width - this.margin;
        this.minY = this.margin;
        this.maxY = this.height - this.margin;

        this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
        this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
    }

    initPosition() {
        this.x = this.width * 0.25;
        this.y = this.height * 0.7;
    }

    drawParticleCluster(x, y, intensity, spread, size) {
        const count = Math.floor(this.particlesPerPoint * intensity) + 2;
        const ctx = this.ctx;
        const sprite = this.sprite;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = (Math.random() * 0.5 + 0.5) * spread;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            const dim = (Math.random() * 0.5 + 0.5) * size * 4.2;
            ctx.globalAlpha = intensity * (0.4 + Math.random() * 0.6);
            ctx.drawImage(sprite, px - dim / 2, py - dim / 2, dim, dim);
        }
        ctx.globalAlpha = 1;
    }

    update() {
        this.frameCount++;

        const wave = Math.sin(this.frameCount * 0.025) * 0.5;
        this.x += this.vx + wave;
        this.y += this.vy;

        if (this.x <= this.minX) {
            this.x = this.minX;
            this.vx = Math.abs(this.vx) * (0.85 + Math.random() * 0.3);
        }
        if (this.x >= this.maxX) {
            this.x = this.maxX;
            this.vx = -Math.abs(this.vx) * (0.85 + Math.random() * 0.3);
        }
        if (this.y <= this.minY) {
            this.y = this.minY;
            this.vy = Math.abs(this.vy) * (0.85 + Math.random() * 0.3);
        }
        if (this.y >= this.maxY) {
            this.y = this.maxY;
            this.vy = -Math.abs(this.vy) * (0.85 + Math.random() * 0.3);
        }

        if (this.frameCount % this.trailInterval === 0) {
            this.trail.unshift({
                x: this.x,
                y: this.y,
                vx: this.vx,
                vy: this.vy
            });
            if (this.trail.length > this.trailLength) {
                this.trail.pop();
            }
        }
    }

    isPointNearSnowflake(px, py) {
        const hitRadius = 50;
        const r2 = hitRadius * hitRadius;
        const dx = px - this.x, dy = py - this.y;
        if (dx * dx + dy * dy <= r2) return true;
        for (const p of this.trail) {
            const ddx = px - p.x, ddy = py - p.y;
            if (ddx * ddx + ddy * ddy <= r2) return true;
        }
        return false;
    }

    draw() {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);

        const len = this.trail.length;
        if (len === 0) return;

        for (let i = len - 1; i >= 0; i--) {
            const t = this.trail[i];
            const progress = 1 - i / len;
            const intensity = 0.15 + progress * 0.85;
            const spread = 10 + (1 - progress) * 28;
            const size = 1.2 + progress * 2.2;
            this.drawParticleCluster(t.x, t.y, intensity, spread, size);
        }

        this.ctx.globalAlpha = 0.55;
        this.ctx.drawImage(this.sprite, this.x - 22, this.y - 22, 44, 44);
        this.ctx.globalAlpha = 1;
        this.drawParticleCluster(this.x, this.y, 1, 12, 3);
    }

    animate() {
        if (!this.container || !this.ctx) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.ctx = null;
        this.canvas = null;
        this.container = null;
        this.sprite = null;
    }
}
