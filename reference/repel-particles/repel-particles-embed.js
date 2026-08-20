/**
 * 排斥粒子球：外观与 app/preview/click-hint-gallery.html 英雄球同一套画法
 * （随机球面点、1.2px、远近透明度、慢速绕 Y 转），
 * 并保留原 p5 版的鼠标圆形排斥 / 回弹 / 点击萎缩。
 *
 * opts: { container, onMouseMove?, particleCount? }
 * 返回: { dispose, collapse }
 */
window.mountRepelParticles = function (opts) {
    'use strict';
    opts = opts || {};
    if (!opts.container) {
        console.error('mountRepelParticles: opts.container required');
        return { dispose: function () {} };
    }

    var container = opts.container;
    var onMouseMoveParent = opts.onMouseMove;
    var PARTICLES = opts.particleCount || 1000;
    var SPHERE_RATIO = 0.16;
    var ROTATE_SPEED = 0.22;
    var ATTRACTION = 0.10;
    var DAMPING = 0.9;
    var REPEL_STRENGTH = 28;
    var COLLAPSE_MS = 650;

    container.style.overflow = container.style.overflow || 'hidden';
    container.style.position = container.style.position || 'relative';
    container.style.background = 'transparent';

    var canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.background = 'transparent';
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var w = 0;
    var h = 0;
    var radius_ = 0;
    var repelRadius = 0;
    var points = [];
    var angle = 0;
    var mouseActive = false;
    var mouseX = -1e6;
    var mouseY = -1e6;
    var collapsing = false;
    var collapseStart = 0;
    var collapseResolve = null;
    var rafId = 0;
    var lastTs = 0;
    var disposed = false;

    function easeInCubic(t) {
        return t * t * t;
    }

    function initPoints() {
        points = [];
        for (var i = 0; i < PARTICLES; i++) {
            var u = Math.random();
            var v = Math.random();
            var theta = u * Math.PI * 2;
            var phi = Math.acos(2 * v - 1);
            var x = Math.sin(phi) * Math.cos(theta) * radius_;
            var y = Math.cos(phi) * radius_;
            points.push({
                theta: theta,
                phi: phi,
                posX: x,
                posY: y,
                velX: 0,
                velY: 0,
                z: Math.sin(phi) * Math.sin(theta)
            });
        }
    }

    function resize() {
        w = container.clientWidth || window.innerWidth;
        h = container.clientHeight || window.innerHeight;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        radius_ = Math.min(w, h) * SPHERE_RATIO;
        repelRadius = radius_ * 0.18;
        if (!points.length) {
            initPoints();
        } else {
            for (var i = 0; i < points.length; i++) {
                var pt = points[i];
                pt.posX = Math.sin(pt.phi) * Math.cos(pt.theta + angle) * radius_;
                pt.posY = Math.cos(pt.phi) * radius_;
                pt.velX = 0;
                pt.velY = 0;
            }
        }
    }

    function beginCollapse() {
        if (collapsing) {
            return new Promise(function (resolve) {
                var check = setInterval(function () {
                    if (!collapsing) {
                        clearInterval(check);
                        resolve();
                    }
                }, 16);
            });
        }
        return new Promise(function (resolve) {
            collapsing = true;
            collapseStart = performance.now();
            mouseActive = false;
            collapseResolve = resolve;
        });
    }

    function onPointerMove(e) {
        var rect = canvas.getBoundingClientRect();
        mouseActive = true;
        mouseX = e.clientX - rect.left - w / 2;
        mouseY = e.clientY - rect.top - h / 2;
        if (onMouseMoveParent) {
            try { onMouseMoveParent(e.clientX, e.clientY); } catch (err) {}
        }
    }

    function frame(ts) {
        if (disposed) return;
        rafId = requestAnimationFrame(frame);
        var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
        lastTs = ts;

        var collapseScale = 1;
        if (collapsing) {
            var t = (ts - collapseStart) / COLLAPSE_MS;
            if (t >= 1) {
                collapseScale = 0;
                collapsing = false;
                if (collapseResolve) {
                    collapseResolve();
                    collapseResolve = null;
                }
            } else {
                collapseScale = 1 - easeInCubic(t);
            }
        }

        if (!collapsing) {
            angle += ROTATE_SPEED * dt;
        } else if (collapseScale > 0.05) {
            angle += ROTATE_SPEED * 2.4 * dt;
        }

        var radius = radius_ * collapseScale;
        var attraction = collapsing ? 0.42 : ATTRACTION;
        var damping = collapsing ? 0.82 : DAMPING;
        var cx = w / 2;
        var cy = h / 2;

        ctx.clearRect(0, 0, w, h);
        if (collapseScale <= 0.001) return;

        for (var i = 0; i < points.length; i++) {
            var pt = points[i];
            var x = Math.sin(pt.phi) * Math.cos(pt.theta + angle);
            var y = Math.cos(pt.phi);
            var z = Math.sin(pt.phi) * Math.sin(pt.theta + angle);
            pt.z = z;
            var homeX = x * radius;
            var homeY = y * radius;

            pt.velX += (homeX - pt.posX) * attraction;
            pt.velY += (homeY - pt.posY) * attraction;

            if (mouseActive && !collapsing) {
                var dx = pt.posX - mouseX;
                var dy = pt.posY - mouseY;
                var distSq = dx * dx + dy * dy;
                if (distSq > 0.1 && distSq < repelRadius * repelRadius) {
                    var distance = Math.sqrt(distSq);
                    var repel = REPEL_STRENGTH * (1 - distance / repelRadius);
                    pt.velX += (dx / distance) * repel;
                    pt.velY += (dy / distance) * repel;
                }
            }

            pt.velX *= damping;
            pt.velY *= damping;
            pt.posX += pt.velX;
            pt.posY += pt.velY;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + pt.posX, cy + pt.posY, 1.8, 1.8);
        }
    }

    function onResize() {
        resize();
    }

    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointermove', onPointerMove);
    resize();
    rafId = requestAnimationFrame(frame);

    return {
        dispose: function () {
            disposed = true;
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('resize', onResize);
            canvas.removeEventListener('pointermove', onPointerMove);
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        },
        containsPoint: function (clientX, clientY) {
            if (disposed || collapsing || radius_ <= 0) return false;
            var rect = canvas.getBoundingClientRect();
            var x = clientX - rect.left - w / 2;
            var y = clientY - rect.top - h / 2;
            var r = radius_ + 6;
            return x * x + y * y <= r * r;
        },
        collapse: function () {
            return beginCollapse();
        },
    };
};
