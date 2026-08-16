/**
 * 雪花拖尾效果 - 叠加在视频上，透明背景，白色发光粒子拖尾
 */
class SnowflakeCursor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.getElementById('snowflakeCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

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

        this._onResize = () => this.resize();
        this.resize();
        this.initPosition();
        this.animate();

        window.addEventListener('resize', this._onResize);
    }

    resize() {
        if (!this.container || !this.canvas || !this.ctx) return;
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

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

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = (Math.random() * 0.5 + 0.5) * spread;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;

            const radius = (Math.random() * 0.5 + 0.5) * size;
            const opacity = intensity * (0.4 + Math.random() * 0.6);

            this.ctx.beginPath();
            this.ctx.arc(px, py, radius, 0, Math.PI * 2);

            const gradient = this.ctx.createRadialGradient(
                px, py, 0,
                px, py, radius * 2
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.4})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
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

    /** 判断某点是否在雪花（头部或拖尾）附近，用于点击检测 */
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
        // 透明清除，露出下层视频
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

        this.ctx.save();
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        this.ctx.shadowBlur = 20;
        this.drawParticleCluster(this.x, this.y, 1, 12, 3);
        this.ctx.restore();
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
    }
}
