/**
 * 鼠标黑洞粒子（p5.js）：可见黑洞跟随鼠标，吸积盘吞噬粒子；质量足够后反馈爆发，点击释放。
 *
 * 来源：D:\参考\源码\sketch2968160.zip（原版 p5.js，900×700 / 360×360 固定画布）。
 *
 * 改造：
 *   1. 16:9 全屏 cover + windowResized；
 *   2. p5 实例模式 mount/dispose，挂载到父页同一文档内，不使用 iframe；
 *   3. 鼠标未移动前黑洞不激活（原版 p5 默认 mouse 在画布中心）。
 *
 * opts: {
 *   container: HTMLElement,
 *   onMouseMove?: function(x, y)
 * }
 * 返回: { dispose: function }
 */
window.mountMouseBlackHole = function (opts) {
    'use strict';
    opts = opts || {};
    if (!opts.container) {
        console.error('mountMouseBlackHole: opts.container required');
        return { dispose: function () {} };
    }
    if (typeof p5 === 'undefined') {
        console.error('mountMouseBlackHole: p5.js not loaded');
        return { dispose: function () {} };
    }

    opts.container.style.overflow = opts.container.style.overflow || 'hidden';
    opts.container.style.position = opts.container.style.position || 'relative';
    opts.container.style.display = opts.container.style.display || 'flex';
    opts.container.style.alignItems = opts.container.style.alignItems || 'center';
    opts.container.style.justifyContent = opts.container.style.justifyContent || 'center';

    var onMouseMoveParent = opts.onMouseMove;
    var ASPECT = 16 / 9;
    var PARTICLES = opts.particleCount || 10000;

    var instance = new p5(function (p) {
        var suction_radius;
        var radius_;
        var angle = 0;
        var points = [];
        var attraction = 0.01;
        var damping = 0.9;
        var suction_strength = 6;
        var ignition_fraction = 0.05;
        var capturedCount = 0;
        var baseHorizon;
        var mouseActive = false;
        var mouseLocal = { x: 0, y: 0 };

        function computeCanvasSize() {
            var vw = p.windowWidth;
            var vh = p.windowHeight;
            var viewRatio = vw / vh;
            var w;
            var h;
            if (viewRatio > ASPECT) {
                w = vw;
                h = Math.round(w / ASPECT);
            } else {
                h = vh;
                w = Math.round(h * ASPECT);
            }
            return { w: w, h: h };
        }

        function updateLayout() {
            var minDim = Math.min(p.width, p.height);
            radius_ = minDim * (250 / 700);
            suction_radius = minDim * (110 / 700);
            baseHorizon = minDim * (16 / 700);
        }

        function resetMouseOffscreen() {
            mouseLocal.x = -p.width;
            mouseLocal.y = -p.height;
        }

        function updateTargets() {
            for (var idx = 0; idx < points.length; idx++) {
                var pt = points[idx];
                var i = pt.index;
                var x = p.sin(i + angle) * p.sin(i * i) * radius_;
                var y = p.cos(i * i) * radius_;
                pt.pos.set(x, y);
            }
        }

        function initPoints() {
            points = [];
            for (var i = 0; i < PARTICLES; i++) {
                points.push({
                    index: i,
                    pos: p.createVector(0, 0),
                    vel: p.createVector(0, 0),
                    captured: false
                });
            }
            angle = 0;
            capturedCount = 0;
            updateTargets();
            for (var j = 0; j < points.length; j++) {
                points[j].vel.set(0, 0);
            }
        }

        function drawBlackHole(mouse, horizonRadius, mass, ignited) {
            p.push();
            p.noFill();

            var glow = 30 + 120 * mass + (ignited ? 40 : 0);
            for (var k = 5; k >= 1; k--) {
                p.stroke(255, glow / (k * 2));
                p.strokeWeight(k * 3);
                p.circle(mouse.x, mouse.y, horizonRadius * 2);
            }

            p.stroke(255, 160);
            p.strokeWeight(1.5);
            var a = angle * 8;
            p.arc(mouse.x, mouse.y, horizonRadius * 2.6, horizonRadius * 2.6, a, a + p.PI * 0.7);
            p.arc(mouse.x, mouse.y, horizonRadius * 2.6, horizonRadius * 2.6, a + p.PI, a + p.PI * 1.7);

            p.fill(0);
            p.stroke(255, ignited ? 220 : 120);
            p.strokeWeight(1.5);
            p.circle(mouse.x, mouse.y, horizonRadius * 2);
            p.pop();
        }

        p.setup = function () {
            var size = computeCanvasSize();
            p.createCanvas(size.w, size.h);
            p.pixelDensity(1);
            p.background(0);
            updateLayout();
            initPoints();
            resetMouseOffscreen();
        };

        p.windowResized = function () {
            var size = computeCanvasSize();
            p.resizeCanvas(size.w, size.h);
            p.background(0);
            updateLayout();
            initPoints();
            if (!mouseActive) resetMouseOffscreen();
        };

        p.draw = function () {
            p.background(0);
            p.translate(p.width / 2, p.height / 2);

            var mouse = p.createVector(mouseLocal.x, mouseLocal.y);
            var mass = capturedCount / PARTICLES;
            var horizonRadius = baseHorizon + 30 * mass;
            var ignited = capturedCount >= PARTICLES * ignition_fraction;
            var newRadius = ignited ? radius_ * p.sqrt(mass) : 0;
            var effectiveRadius = suction_radius + newRadius;

            p.stroke(255);
            p.strokeWeight(2);

            for (var idx = 0; idx < points.length; idx++) {
                var pt = points[idx];
                var i = pt.index;
                var home;

                if (pt.captured) {
                    var hx = p.sin(i + angle) * p.sin(i * i) * newRadius;
                    var hy = p.cos(i * i) * newRadius;
                    home = p.createVector(mouse.x + hx, mouse.y + hy);
                } else {
                    hx = p.sin(i + angle) * p.sin(i * i) * radius_;
                    hy = p.cos(i * i) * radius_;
                    home = p.createVector(hx, hy);
                }

                var spring = p5.Vector.sub(home, pt.pos).mult(attraction);
                pt.vel.add(spring);

                if (!pt.captured && mouseActive) {
                    var toMouse = p5.Vector.sub(mouse, pt.pos);
                    var d = toMouse.mag();
                    if (d > 0.1 && d < effectiveRadius) {
                        var pull = suction_strength * p.pow(1 - d / effectiveRadius, 2) + 0.15;
                        toMouse.normalize().mult(pull);
                        pt.vel.add(toMouse);

                        if (d < horizonRadius) {
                            pt.captured = true;
                            capturedCount++;
                        }
                    }
                }

                pt.vel.mult(damping);
                pt.pos.add(pt.vel);

                var dMouse = p.dist(pt.pos.x, pt.pos.y, mouse.x, mouse.y);
                if (!mouseActive || dMouse > horizonRadius) {
                    p.point(pt.pos.x, pt.pos.y);
                }
            }

            if (mouseActive) {
                drawBlackHole(mouse, horizonRadius, mass, ignited);
            }

            angle += 0.01;
        };

        p.mouseMoved = function () {
            mouseActive = true;
            mouseLocal.x = p.mouseX - p.width / 2;
            mouseLocal.y = p.mouseY - p.height / 2;
            if (onMouseMoveParent) {
                var rect = p.canvas.getBoundingClientRect();
                try {
                    onMouseMoveParent(rect.left + p.mouseX, rect.top + p.mouseY);
                } catch (err) {}
            }
        };

        p.mousePressed = function () {
            if (!mouseActive) return;
            for (var i = 0; i < points.length; i++) {
                points[i].captured = false;
            }
            capturedCount = 0;
        };
    }, opts.container);

    return {
        dispose: function () {
            try {
                instance.remove();
            } catch (e) {}
        }
    };
};
