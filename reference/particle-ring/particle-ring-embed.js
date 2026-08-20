/**
 * 环形粒子扩散效果（p5.js）：一圈粒子从圆环上出发向四周扩散消散，
 * 叠加一个持续累积的离屏缓冲区（pg）形成运动拖尾，背景有轻微的圆环描边闪烁。
 *
 * 原始版本（D:\参考\sketch1460968）是固定 640x640 画布，不铺满屏幕。
 * 本版本改造为：
 *   1. 16:9 全屏（cover 模式：画布始终 16:9，等比放大铺满视口，必要时裁切边缘；
 *      windowResized 时重算尺寸），圆环半径按画布较短边等比缩放；
 *      粒子扩散边界为完整 16:9 矩形（width/2 × height/2），横向也会充分展开；
 *   2. 用 p5 的实例模式（instance mode）封装，不污染全局 setup/draw/Particle 等命名，
 *      挂载到父页同一文档内（约定与 js/model-morph-32s-embed.js 一致），不使用 iframe。
 *
 * opts: {
 *   container: HTMLElement   必填，承载 canvas 的容器（建议全屏定位）
 *   lineRgb: [r, g, b]       可选，粒子与圆环描边颜色；默认 [255, 255, 255]（白）。
 *                            正式饿鬼道由 EffectRegistry 传入房屋点云色 #3A6D75；
 *                            不传则保持白线（预览白线 tab 用）。
 * }
 * 返回: { dispose: function }
 *
 * 保留了原版的两个键盘快捷键（没有可见按钮/文字，纯键盘触发，不违反"无交互按钮"的要求）：
 *   按 s 保存当前画面为图片；按 r 让所有粒子回到圆环上重新开始扩散。
 */
window.mountParticleRing = function (opts) {
    'use strict';
    opts = opts || {};
    if (!opts.container) {
        console.error('mountParticleRing: opts.container required');
        return { dispose: function () {} };
    }
    if (typeof p5 === 'undefined') {
        console.error('mountParticleRing: p5.js not loaded');
        return { dispose: function () {} };
    }

    opts.container.style.overflow = opts.container.style.overflow || 'hidden';
    opts.container.style.position = opts.container.style.position || 'relative';
    opts.container.style.display = opts.container.style.display || 'flex';
    opts.container.style.alignItems = opts.container.style.alignItems || 'center';
    opts.container.style.justifyContent = opts.container.style.justifyContent || 'center';

    var lineRgb = opts.lineRgb || [255, 255, 255];
    var lr = lineRgb[0];
    var lg = lineRgb[1];
    var lb = lineRgb[2];

    var ASPECT = 16 / 9;

    var instance = new p5(function (p) {
        var particles = [];
        var particleNum = 720;
        var r;
        var boundX;
        var boundY;
        var pg;
        var saveFlag = false;
        var resetFlag = false;

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

        function Particle(tempX, tempY) {
            this.x = tempX;
            this.y = tempY;
            this.originX = tempX;
            this.originY = tempY;
            this.color = p.color(lr, lg, lb);
            var d = p.dist(tempX, tempY, 0, 0);
            this.dir = [tempX / d, tempY / d];
            this.life = true;
            this.r = p.random(2);
        }

        Particle.prototype.move = function () {
            if (this.life) {
                this.x += this.dir[0] + p.random(-1, 1);
                this.y += this.dir[1] + p.random(-1, 1);
                if (Math.abs(this.x) > boundX || Math.abs(this.y) > boundY) {
                    this.life = false;
                }
            }
        };

        Particle.prototype.reset = function () {
            this.x = this.originX;
            this.y = this.originY;
            var d = p.dist(this.originX, this.originY, 0, 0);
            this.dir = [this.originX / d, this.originY / d];
            this.life = true;
        };

        Particle.prototype.display = function () {
            pg.push();
            pg.noStroke();
            pg.fill(this.color);
            pg.ellipse(this.x, this.y, this.r, this.r);
            pg.pop();
        };

        function initParticles() {
            r = Math.min(p.width, p.height) * 0.08;
            boundX = p.width / 2;
            boundY = p.height / 2;
            particles = [];
            for (var i = 0; i < particleNum; i++) {
                var angle = p.map(i, 0, particleNum - 1, 0, p.TWO_PI);
                var x = Math.cos(angle) * (r - 1);
                var y = Math.sin(angle) * (r - 1);
                particles[i] = new Particle(x, y);
            }
        }

        function resizeTo16x9() {
            var size = computeCanvasSize();
            p.resizeCanvas(size.w, size.h);
            pg = p.createGraphics(size.w, size.h);
            p.background(0);
            initParticles();
        }

        p.setup = function () {
            var size = computeCanvasSize();
            p.createCanvas(size.w, size.h);
            p.background(0);
            pg = p.createGraphics(size.w, size.h);
            initParticles();
        };

        p.windowResized = function () {
            resizeTo16x9();
        };

        p.draw = function () {
            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.background(0);
            p.push();
            p.noFill();
            for (var i = 0; i <= 30; i++) {
                p.stroke(lr, lg, lb, p.map(i, 0, 30, 0, 100));
                p.strokeWeight(3);
                p.ellipse(p.random(-5, 5), p.random(-5, 5), r * 2, r * 2);
            }
            p.pop();
            p.pop();

            pg.push();
            pg.translate(p.width / 2, p.height / 2);
            for (var i = 0; i < particleNum; i++) {
                particles[i].move();
                particles[i].display();
            }
            p.image(pg, 0, 0);
            pg.pop();

            if (saveFlag) {
                p.save('image.jpg');
                saveFlag = false;
            }

            if (resetFlag) {
                for (var j = 0; j < particleNum; j++) {
                    particles[j].reset();
                }
                resetFlag = false;
                p.background(0);
            }
        };

        p.keyPressed = function () {
            if (p.key === 's') {
                saveFlag = true;
            } else if (p.key === 'r') {
                resetFlag = true;
            }
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
