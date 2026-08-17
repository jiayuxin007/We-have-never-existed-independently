(function () {
    'use strict';

    var canvas = document.getElementById('labCanvas');
    var threeEl = document.getElementById('labThree');
    var particlesEl = document.getElementById('labParticles');
    var frameEl = document.getElementById('labFrame');
    var tabsEl = document.getElementById('labTabs');
    var noteEl = document.getElementById('labNote');
    var hintEl = document.getElementById('labHint');
    var ctx = canvas.getContext('2d', { alpha: false });
    var scriptCache = {};

    var dpr = 1;
    var W = 0;
    var H = 0;
    var pointer = { x: 0, y: 0, px: 0, py: 0, down: false, moved: false };
    var current = null;
    var currentId = null;
    var rafId = 0;
    var lastT = 0;
    var session = 0;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeInOut(t) { return t * t * (3 - 2 * t); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function hash(x, y) {
        var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
        return s - Math.floor(s);
    }
    function noise(x, y) {
        var xi = Math.floor(x);
        var yi = Math.floor(y);
        var xf = x - xi;
        var yf = y - yi;
        var u = xf * xf * (3 - 2 * xf);
        var v = yf * yf * (3 - 2 * yf);
        return lerp(
            lerp(hash(xi, yi), hash(xi + 1, yi), u),
            lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u),
            v
        );
    }
    function hsl(h, s, l, a) {
        return 'hsla(' + (h % 360) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')';
    }
    function fade(amount) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(2,2,8,' + amount + ')';
        ctx.fillRect(0, 0, W, H);
    }
    function clearBlack() {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, W, H);
    }
    function dot(x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function loadScript(src) {
        if (scriptCache[src]) return scriptCache[src];
        scriptCache[src] = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('script failed: ' + src)); };
            document.head.appendChild(s);
        });
        return scriptCache[src];
    }

    function ensureThree() {
        if (window.THREE) return Promise.resolve(window.THREE);
        return loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js').then(function () {
            return window.THREE;
        });
    }

    function ensureVanta(kind) {
        return ensureThree().then(function () {
            return loadScript('https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.' + kind + '.min.js');
        });
    }

    function ensureTsParticles() {
        if (window.tsParticles) return Promise.resolve();
        return loadScript('https://cdn.jsdelivr.net/npm/tsparticles@2.12.0/tsparticles.bundle.min.js');
    }

    function showLayer(name) {
        var map = [
            [canvas, 'canvas'],
            [threeEl, 'three'],
            [particlesEl, 'particles'],
            [frameEl, 'frame'],
        ];
        var i;
        for (i = 0; i < map.length; i++) {
            var on = map[i][1] === name;
            map[i][0].classList.toggle('is-on', on);
            map[i][0].hidden = !on;
            map[i][0].style.display = on ? 'block' : 'none';
            map[i][0].style.visibility = on ? 'visible' : 'hidden';
            map[i][0].style.pointerEvents = on ? 'auto' : 'none';
            map[i][0].style.zIndex = on ? '2' : '0';
        }
        if (name !== 'frame') {
            try { frameEl.src = 'about:blank'; } catch (e) { /* ignore */ }
        }
        if (name !== 'three') threeEl.innerHTML = '';
        if (name !== 'particles') {
            try {
                if (window.tsParticles && typeof window.tsParticles.dom === 'function') {
                    window.tsParticles.dom().slice().forEach(function (item) {
                        if (item && item.destroy) item.destroy();
                    });
                }
            } catch (e4) { /* ignore */ }
            particlesEl.innerHTML = '';
        }
    }

    function isAlive(s) {
        return s === session;
    }

    /* ——— 1 星座网络 ——— */
    function createNetwork() {
        var n = 90;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: rand(-0.35, 0.35),
                vy: rand(-0.35, 0.35),
            });
        }
        return {
            tick: function () {
                clearBlack();
                var mx = pointer.x;
                var my = pointer.y;
                var maxDist = 140;
                ctx.lineWidth = 0.8;
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0 || p.x > W) p.vx *= -1;
                    if (p.y < 0 || p.y > H) p.vy *= -1;
                    var dx = mx - p.x;
                    var dy = my - p.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 16000) {
                        p.vx += dx * 0.00004;
                        p.vy += dy * 0.00004;
                    }
                    p.vx *= 0.995;
                    p.vy *= 0.995;
                }
                for (i = 0; i < n; i++) {
                    var a = pts[i];
                    for (var j = i + 1; j < n; j++) {
                        var b = pts[j];
                        var ddx = a.x - b.x;
                        var ddy = a.y - b.y;
                        var dist = Math.sqrt(ddx * ddx + ddy * ddy);
                        if (dist < maxDist) {
                            ctx.strokeStyle = 'rgba(160,210,255,' + (1 - dist / maxDist) * 0.45 + ')';
                            ctx.beginPath();
                            ctx.moveTo(a.x, a.y);
                            ctx.lineTo(b.x, b.y);
                            ctx.stroke();
                        }
                    }
                    var md = Math.sqrt((a.x - mx) * (a.x - mx) + (a.y - my) * (a.y - my));
                    if (md < 180) {
                        ctx.strokeStyle = 'rgba(180,240,255,' + (1 - md / 180) * 0.7 + ')';
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(mx, my);
                        ctx.stroke();
                    }
                }
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    dot(pts[i].x, pts[i].y, 1.8, 'rgba(210,235,255,0.95)');
                }
                dot(mx, my, 3.2, 'rgba(255,255,255,0.9)');
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 2 螺旋星系 ——— */
    function createGalaxy() {
        var count = 4200;
        var stars = [];
        var i;
        for (i = 0; i < count; i++) {
            var arm = i % 4;
            var r = Math.pow(Math.random(), 0.65) * Math.min(W, H) * 0.42;
            var spin = r * 0.018;
            var ang = arm * (Math.PI / 2) + spin + rand(-0.18, 0.18);
            stars.push({
                r: r,
                a: ang,
                s: rand(0.6, 1.8),
                hue: lerp(200, 320, r / (Math.min(W, H) * 0.42)),
            });
        }
        var rot = 0;
        return {
            tick: function (dt) {
                fade(0.28);
                rot += dt * 0.12;
                var cx = W * 0.5;
                var cy = H * 0.52;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < count; i++) {
                    var st = stars[i];
                    var ang = st.a + rot;
                    var x = cx + Math.cos(ang) * st.r;
                    var y = cy + Math.sin(ang) * st.r * 0.42;
                    var dx = pointer.x - x;
                    var dy = pointer.y - y;
                    var pull = 18 / (dx * dx + dy * dy + 80);
                    x += dx * pull;
                    y += dy * pull;
                    ctx.fillStyle = hsl(st.hue, 80, 68, 0.55);
                    ctx.fillRect(x, y, st.s, st.s);
                }
                ctx.fillStyle = 'rgba(255,240,220,0.9)';
                ctx.beginPath();
                ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 3 焰尾 ——— */
    function createEmber() {
        var pool = [];
        var i;
        for (i = 0; i < 700; i++) {
            pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 1, hue: 20 });
        }
        var head = 0;
        function spawn(x, y, n) {
            var k;
            for (k = 0; k < n; k++) {
                var p = pool[head++ % pool.length];
                p.x = x + rand(-3, 3);
                p.y = y + rand(-3, 3);
                p.vx = rand(-1.2, 1.2);
                p.vy = rand(-2.8, -0.4);
                p.life = p.max = rand(28, 70);
                p.s = rand(1.2, 3.4);
                p.hue = rand(8, 48);
            }
        }
        return {
            tick: function () {
                fade(0.18);
                var spd = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
                spawn(pointer.x, pointer.y, pointer.moved ? clamp(spd * 0.6, 2, 18) : 1);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pool.length; i++) {
                    var p = pool[i];
                    if (p.life <= 0) continue;
                    p.life -= 1;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy -= 0.03;
                    p.vx *= 0.98;
                    var t = p.life / p.max;
                    ctx.fillStyle = hsl(p.hue, 100, 55 + t * 30, t * 0.85);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.s * t, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 4 烟墨（流体感） ——— */
    function createInk() {
        var pool = [];
        var i;
        for (i = 0; i < 1400; i++) {
            pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, hue: 180 });
        }
        var head = 0;
        var hue = 190;
        return {
            tick: function () {
                fade(0.08);
                hue += 0.4;
                var dx = pointer.x - pointer.px;
                var dy = pointer.y - pointer.py;
                var n = pointer.moved ? 22 : 3;
                var k;
                for (k = 0; k < n; k++) {
                    var p = pool[head++ % pool.length];
                    p.x = lerp(pointer.px, pointer.x, k / n) + rand(-4, 4);
                    p.y = lerp(pointer.py, pointer.y, k / n) + rand(-4, 4);
                    p.vx = dx * 0.35 + rand(-0.6, 0.6);
                    p.vy = dy * 0.35 + rand(-0.6, 0.6);
                    p.life = p.max = rand(50, 110);
                    p.hue = hue + rand(-18, 18);
                }
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pool.length; i++) {
                    var q = pool[i];
                    if (q.life <= 0) continue;
                    q.life -= 1;
                    var ang = noise(q.x * 0.004, q.y * 0.004) * Math.PI * 4;
                    q.vx += Math.cos(ang) * 0.05;
                    q.vy += Math.sin(ang) * 0.05;
                    q.x += q.vx;
                    q.y += q.vy;
                    q.vx *= 0.96;
                    q.vy *= 0.96;
                    var t = q.life / q.max;
                    ctx.fillStyle = hsl(q.hue, 90, 60, t * 0.22);
                    ctx.beginPath();
                    ctx.arc(q.x, q.y, 6 * t + 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 5 烟花 ——— */
    function createFireworks() {
        var sparks = [];
        var rockets = [];
        function burst(x, y, hue) {
            var n = 80 + Math.floor(Math.random() * 50);
            var i;
            for (i = 0; i < n; i++) {
                var a = Math.random() * Math.PI * 2;
                var sp = rand(1.4, 6.2);
                sparks.push({
                    x: x, y: y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    life: rand(40, 90),
                    max: 90,
                    hue: hue + rand(-12, 12),
                    s: rand(1.2, 2.4),
                });
            }
        }
        function launch() {
            rockets.push({
                x: rand(W * 0.15, W * 0.85),
                y: H + 8,
                vy: rand(-11, -7.5),
                hue: rand(0, 360),
            });
        }
        var idle = 0;
        return {
            onDown: function (x, y) {
                burst(x, y, rand(0, 360));
            },
            tick: function () {
                fade(0.16);
                idle += 1;
                if (idle > 50) {
                    idle = 0;
                    launch();
                }
                ctx.globalCompositeOperation = 'lighter';
                var r;
                for (r = rockets.length - 1; r >= 0; r--) {
                    var rk = rockets[r];
                    rk.y += rk.vy;
                    rk.vy += 0.12;
                    dot(rk.x, rk.y, 2, hsl(rk.hue, 100, 70, 0.9));
                    if (rk.vy > -1.5) {
                        burst(rk.x, rk.y, rk.hue);
                        rockets.splice(r, 1);
                    }
                }
                var i;
                for (i = sparks.length - 1; i >= 0; i--) {
                    var p = sparks[i];
                    p.life -= 1;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.04;
                    p.vx *= 0.985;
                    var t = p.life / p.max;
                    ctx.fillStyle = hsl(p.hue, 100, 62, t);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.s * t, 0, Math.PI * 2);
                    ctx.fill();
                    if (p.life <= 0) sparks.splice(i, 1);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 流场 ——— */
    function createFlow() {
        var n = 1600;
        var pts = [];
        var i;
        function reset(p) {
            p.x = Math.random() * W;
            p.y = Math.random() * H;
            p.life = rand(80, 220);
            p.hue = rand(160, 280);
        }
        for (i = 0; i < n; i++) {
            var p = {};
            reset(p);
            pts.push(p);
        }
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.07);
                t += dt * 0.15;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var q = pts[i];
                    var ang = noise(q.x * 0.0025, q.y * 0.0025 + t) * Math.PI * 4;
                    q.x += Math.cos(ang) * 1.35;
                    q.y += Math.sin(ang) * 1.35;
                    q.life -= 1;
                    if (q.life <= 0 || q.x < 0 || q.x > W || q.y < 0 || q.y > H) reset(q);
                    ctx.fillStyle = hsl(q.hue, 85, 62, 0.35);
                    ctx.fillRect(q.x, q.y, 1.6, 1.6);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 蜂群 ——— */
    function createSwarm() {
        var n = 420;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: W / 2 + rand(-80, 80),
                y: H / 2 + rand(-80, 80),
                vx: rand(-1, 1),
                vy: rand(-1, 1),
            });
        }
        return {
            tick: function () {
                fade(0.22);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var dx = pointer.x - p.x;
                    var dy = pointer.y - p.y;
                    p.vx += dx * 0.004;
                    p.vy += dy * 0.004;
                    var j = (i + 7) % n;
                    p.vx += (pts[j].vx - p.vx) * 0.02;
                    p.vy += (pts[j].vy - p.vy) * 0.02;
                    var sp = Math.hypot(p.vx, p.vy);
                    if (sp > 7) {
                        p.vx *= 7 / sp;
                        p.vy *= 7 / sp;
                    }
                    p.x += p.vx;
                    p.y += p.vy;
                    ctx.fillStyle = hsl(190 + i % 40, 90, 70, 0.55);
                    ctx.fillRect(p.x, p.y, 2.4, 2.4);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 10 漩涡 ——— */
    function createVortex() {
        var n = 2200;
        var pts = [];
        var i;
        function spawn(p) {
            var a = Math.random() * Math.PI * 2;
            var r = rand(80, Math.min(W, H) * 0.48);
            p.a = a;
            p.r = r;
            p.s = rand(0.8, 2.2);
            p.hue = rand(250, 320);
        }
        for (i = 0; i < n; i++) {
            var p = {};
            spawn(p);
            pts.push(p);
        }
        var cx = W / 2;
        var cy = H / 2;
        return {
            tick: function () {
                fade(0.2);
                cx += (pointer.x - cx) * 0.03;
                cy += (pointer.y - cy) * 0.03;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var q = pts[i];
                    q.a += 0.035 + 8 / (q.r + 20);
                    q.r -= 0.55;
                    if (q.r < 8) spawn(q);
                    var x = cx + Math.cos(q.a) * q.r;
                    var y = cy + Math.sin(q.a) * q.r * 0.86;
                    ctx.fillStyle = hsl(q.hue, 90, 64, 0.5);
                    ctx.fillRect(x, y, q.s, q.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 黑洞吸积盘 ——— */
    function createBlackhole() {
        var n = 2600;
        var pts = [];
        var i;
        function spawn(p) {
            p.a = Math.random() * Math.PI * 2;
            p.r = rand(30, Math.min(W, H) * 0.4);
            p.s = rand(0.7, 2);
            p.hue = p.r < 70 ? rand(20, 50) : rand(200, 260);
        }
        for (i = 0; i < n; i++) {
            var p = {};
            spawn(p);
            pts.push(p);
        }
        return {
            tick: function () {
                fade(0.28);
                var cx = W / 2;
                var cy = H / 2;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var q = pts[i];
                    q.a += 0.9 / (q.r + 8);
                    q.r -= 0.12;
                    if (q.r < 14) spawn(q);
                    var tilt = 0.38;
                    var x = cx + Math.cos(q.a) * q.r;
                    var y = cy + Math.sin(q.a) * q.r * tilt;
                    var dx = pointer.x - cx;
                    var dy = pointer.y - cy;
                    x += dx * 0.04;
                    y += dy * 0.04;
                    ctx.fillStyle = hsl(q.hue, 95, 62, 0.55);
                    ctx.fillRect(x, y, q.s, q.s);
                }
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(cx, cy, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,180,80,0.35)';
                ctx.lineWidth = 2;
                ctx.stroke();
            },
        };
    }

    function createFluid() {
        showLayer('frame');
        frameEl.src = 'https://paveldogreat.github.io/WebGL-Fluid-Simulation/';
        return {
            tick: function () {},
            destroy: function () {
                frameEl.src = 'about:blank';
            },
        };
    }

    function createVanta(kind, options) {
        var effect = null;
        var dead = false;
        var s = session;
        showLayer('three');
        threeEl.innerHTML = '';
        var handle = {
            tick: function () {},
            destroy: function () { dead = true; },
        };
        ensureVanta(kind).then(function () {
            if (dead || !isAlive(s)) return;
            var key = kind.toUpperCase();
            var opts = {
                el: threeEl,
                THREE: window.THREE,
                mouseControls: true,
                touchControls: true,
                minHeight: 200,
                minWidth: 200,
                backgroundColor: 0x020208,
            };
            var k;
            for (k in options) {
                if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k];
            }
            effect = window.VANTA[key](opts);
            handle.destroy = function () {
                dead = true;
                if (effect && effect.destroy) effect.destroy();
                threeEl.innerHTML = '';
            };
        }).catch(function (err) {
            console.warn('[ParticleLab] vanta', kind, err);
        });
        return handle;
    }

    function createThreeGalaxy() {
        var dead = false;
        var renderer = null;
        var geo = null;
        var mat = null;
        var s = session;
        showLayer('three');
        threeEl.innerHTML = '';
        var handle = { tick: function () {}, destroy: function () { dead = true; } };
        ensureThree().then(function (THREE) {
            if (dead || !isAlive(s)) return;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(55, W / Math.max(H, 1), 0.1, 80);
            camera.position.set(0, 1.4, 5.2);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(W, H);
            renderer.setClearColor(0x020208);
            threeEl.appendChild(renderer.domElement);

            var count = 18000;
            var positions = new Float32Array(count * 3);
            var colors = new Float32Array(count * 3);
            var inside = new THREE.Color('#9b7dff');
            var outside = new THREE.Color('#67e8f9');
            var i;
            for (i = 0; i < count; i++) {
                var r = Math.pow(Math.random(), 0.55) * 4.2;
                var branch = i % 4;
                var spin = r * 1.35;
                var a = branch * Math.PI * 0.5 + spin;
                var randX = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * 0.55;
                var randY = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * 0.28;
                var randZ = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * 0.55;
                positions[i * 3] = Math.cos(a) * r + randX;
                positions[i * 3 + 1] = randY;
                positions[i * 3 + 2] = Math.sin(a) * r + randZ;
                var mixed = inside.clone().lerp(outside, r / 4.2);
                colors[i * 3] = mixed.r;
                colors[i * 3 + 1] = mixed.g;
                colors[i * 3 + 2] = mixed.b;
            }
            geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            mat = new THREE.PointsMaterial({
                size: 0.022,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
                sizeAttenuation: true,
            });
            var points = new THREE.Points(geo, mat);
            scene.add(points);
            handle.tick = function () {
                points.rotation.y += 0.0018;
                points.rotation.x += ((pointer.y / Math.max(H, 1) - 0.5) * 0.45 - points.rotation.x) * 0.04;
                points.rotation.z += ((pointer.x / Math.max(W, 1) - 0.5) * 0.35 - points.rotation.z) * 0.04;
                renderer.render(scene, camera);
            };
            handle.onResize = function () {
                camera.aspect = W / Math.max(H, 1);
                camera.updateProjectionMatrix();
                renderer.setSize(W, H);
            };
            handle.destroy = function () {
                dead = true;
                geo.dispose();
                mat.dispose();
                renderer.dispose();
                threeEl.innerHTML = '';
            };
        });
        return handle;
    }

    function createThreeSphere() {
        var dead = false;
        var renderer = null;
        var geo = null;
        var mat = null;
        var s = session;
        showLayer('three');
        threeEl.innerHTML = '';
        var handle = { tick: function () {}, destroy: function () { dead = true; } };
        ensureThree().then(function (THREE) {
            if (dead || !isAlive(s)) return;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(50, W / Math.max(H, 1), 0.1, 40);
            camera.position.z = 4.2;
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(W, H);
            renderer.setClearColor(0x020208);
            threeEl.appendChild(renderer.domElement);

            var count = 7000;
            var base = new Float32Array(count * 3);
            var positions = new Float32Array(count * 3);
            var i;
            var golden = Math.PI * (3 - Math.sqrt(5));
            for (i = 0; i < count; i++) {
                var y = 1 - (i / (count - 1)) * 2;
                var radius = Math.sqrt(1 - y * y);
                var theta = golden * i;
                base[i * 3] = Math.cos(theta) * radius;
                base[i * 3 + 1] = y;
                base[i * 3 + 2] = Math.sin(theta) * radius;
            }
            positions.set(base);
            geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            mat = new THREE.PointsMaterial({
                size: 0.028,
                color: 0xb8d4ff,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });
            var points = new THREE.Points(geo, mat);
            scene.add(points);
            handle.tick = function () {
                var t = performance.now() * 0.001;
                var mx = (pointer.x / Math.max(W, 1) - 0.5) * 2.8;
                var my = -(pointer.y / Math.max(H, 1) - 0.5) * 2.8;
                var arr = geo.attributes.position.array;
                for (i = 0; i < count; i++) {
                    var bx = base[i * 3];
                    var by = base[i * 3 + 1];
                    var bz = base[i * 3 + 2];
                    var dx = bx - mx;
                    var dy = by - my;
                    var dist = Math.sqrt(dx * dx + dy * dy + bz * bz);
                    var push = 0.35 / (dist * dist + 0.18);
                    arr[i * 3] = bx + dx * push;
                    arr[i * 3 + 1] = by + dy * push;
                    arr[i * 3 + 2] = bz * (1.15 + Math.sin(t + i * 0.01) * 0.04);
                }
                geo.attributes.position.needsUpdate = true;
                points.rotation.y = t * 0.12;
                renderer.render(scene, camera);
            };
            handle.onResize = function () {
                camera.aspect = W / Math.max(H, 1);
                camera.updateProjectionMatrix();
                renderer.setSize(W, H);
            };
            handle.destroy = function () {
                dead = true;
                geo.dispose();
                mat.dispose();
                renderer.dispose();
                threeEl.innerHTML = '';
            };
        });
        return handle;
    }

    function createThreeWave() {
        var dead = false;
        var renderer = null;
        var geo = null;
        var mat = null;
        var s = session;
        showLayer('three');
        threeEl.innerHTML = '';
        var handle = { tick: function () {}, destroy: function () { dead = true; } };
        ensureThree().then(function (THREE) {
            if (dead || !isAlive(s)) return;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(55, W / Math.max(H, 1), 0.1, 80);
            camera.position.set(0, 6.5, 10);
            camera.lookAt(0, 0, 0);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(W, H);
            renderer.setClearColor(0x020208);
            threeEl.appendChild(renderer.domElement);

            var seg = 90;
            var count = seg * seg;
            var positions = new Float32Array(count * 3);
            var colors = new Float32Array(count * 3);
            var ix, iz, i = 0;
            for (iz = 0; iz < seg; iz++) {
                for (ix = 0; ix < seg; ix++) {
                    positions[i * 3] = (ix / (seg - 1) - 0.5) * 16;
                    positions[i * 3 + 1] = 0;
                    positions[i * 3 + 2] = (iz / (seg - 1) - 0.5) * 16;
                    i += 1;
                }
            }
            geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            mat = new THREE.PointsMaterial({
                size: 0.07,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });
            var points = new THREE.Points(geo, mat);
            scene.add(points);
            handle.tick = function () {
                var t = performance.now() * 0.001;
                var mx = (pointer.x / Math.max(W, 1) - 0.5) * 16;
                var mz = (pointer.y / Math.max(H, 1) - 0.5) * 16;
                var pos = geo.attributes.position.array;
                var col = geo.attributes.color.array;
                for (i = 0; i < count; i++) {
                    var x = pos[i * 3];
                    var z = pos[i * 3 + 2];
                    var d = Math.sqrt((x - mx) * (x - mx) + (z - mz) * (z - mz));
                    var y = Math.sin(x * 0.55 + t * 1.6) * 0.45 + Math.cos(z * 0.55 + t * 1.2) * 0.45;
                    y += Math.sin(d * 1.4 - t * 4) * 1.1 * Math.exp(-d * 0.18);
                    pos[i * 3 + 1] = y;
                    var c = 0.45 + y * 0.18;
                    col[i * 3] = 0.45 + c * 0.2;
                    col[i * 3 + 1] = 0.7 + c * 0.15;
                    col[i * 3 + 2] = 1;
                }
                geo.attributes.position.needsUpdate = true;
                geo.attributes.color.needsUpdate = true;
                renderer.render(scene, camera);
            };
            handle.onResize = function () {
                camera.aspect = W / Math.max(H, 1);
                camera.updateProjectionMatrix();
                renderer.setSize(W, H);
            };
            handle.destroy = function () {
                dead = true;
                geo.dispose();
                mat.dispose();
                renderer.dispose();
                threeEl.innerHTML = '';
            };
        });
        return handle;
    }

    function createTsLinks() {
        var dead = false;
        showLayer('particles');
        particlesEl.innerHTML = '';
        var s = session;
        var handle = { tick: function () {}, destroy: function () { dead = true; } };
        ensureTsParticles().then(function () {
            if (dead || !isAlive(s)) return;
            window.tsParticles.load('labParticles', {
                background: { color: '#020208' },
                fpsLimit: 60,
                particles: {
                    number: { value: 90, density: { enable: true, area: 800 } },
                    color: { value: ['#8b5cf6', '#67e8f9', '#ffffff'] },
                    links: { enable: true, color: '#8ecbff', distance: 150, opacity: 0.35, width: 1 },
                    move: { enable: true, speed: 1.1, outModes: { default: 'bounce' } },
                    opacity: { value: 0.7 },
                    size: { value: { min: 1, max: 3 } },
                },
                interactivity: {
                    events: {
                        onHover: { enable: true, mode: 'grab' },
                        onClick: { enable: true, mode: 'push' },
                    },
                    modes: {
                        grab: { distance: 180, links: { opacity: 0.85 } },
                        push: { quantity: 4 },
                    },
                },
                detectRetina: true,
            }).catch(function (err) {
                console.warn('[ParticleLab] tsparticles', err);
            }).then(function (inst) {
                if (!isAlive(s)) {
                    if (inst && inst.destroy) inst.destroy();
                    return;
                }
                handle.destroy = function () {
                    dead = true;
                    if (inst && inst.destroy) inst.destroy();
                    particlesEl.innerHTML = '';
                };
            });
        });
        return handle;
    }

    function makePool(n, init) {
        var arr = [];
        var i;
        for (i = 0; i < n; i++) arr.push(init());
        return arr;
    }

    function spawnFromPool(pool, head, fill) {
        var p = pool[head.i % pool.length];
        head.i += 1;
        fill(p);
        return p;
    }

    /* ——— 鼠标粒子喷泉 ——— */
    function createFollowSpark() {
        var pool = makePool(900, function () {
            return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 1, hue: 180 };
        });
        var head = { i: 0 };
        return {
            tick: function () {
                fade(0.2);
                var n = pointer.moved ? 18 : 4;
                var k;
                for (k = 0; k < n; k++) {
                    spawnFromPool(pool, head, function (p) {
                        p.x = pointer.x + rand(-4, 4);
                        p.y = pointer.y + rand(-4, 4);
                        p.vx = rand(-2.2, 2.2);
                        p.vy = rand(-2.2, 2.2);
                        p.life = p.max = rand(18, 46);
                        p.s = rand(1.2, 3.2);
                        p.hue = rand(170, 280);
                    });
                }
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pool.length; i++) {
                    var q = pool[i];
                    if (q.life <= 0) continue;
                    q.life -= 1;
                    q.x += q.vx;
                    q.y += q.vy;
                    q.vx *= 0.96;
                    q.vy *= 0.96;
                    var t = q.life / q.max;
                    ctx.fillStyle = hsl(q.hue, 90, 65, t);
                    ctx.beginPath();
                    ctx.arc(q.x, q.y, q.s * t, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 火焰粒子 ——— */
    function createFlame() {
        var pool = makePool(1100, function () {
            return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 1, hue: 20 };
        });
        var head = { i: 0 };
        return {
            tick: function () {
                fade(0.16);
                var i;
                for (i = 0; i < 22; i++) {
                    spawnFromPool(pool, head, function (p) {
                        p.x = pointer.x + rand(-28, 28);
                        p.y = pointer.y + rand(8, 24);
                        p.vx = rand(-0.6, 0.6);
                        p.vy = rand(-3.8, -1.4);
                        p.life = p.max = rand(28, 70);
                        p.s = rand(4, 11);
                        p.hue = rand(8, 42);
                    });
                }
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pool.length; i++) {
                    var q = pool[i];
                    if (q.life <= 0) continue;
                    q.life -= 1;
                    q.x += q.vx + Math.sin(q.y * 0.04) * 0.35;
                    q.y += q.vy;
                    q.vy *= 0.99;
                    var t = q.life / q.max;
                    ctx.fillStyle = hsl(q.hue, 100, 52 + t * 20, t * 0.38);
                    ctx.beginPath();
                    ctx.arc(q.x, q.y, q.s * t, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 雪 ——— */
    function createSnow() {
        var n = 420;
        var flakes = [];
        var i;
        for (i = 0; i < n; i++) {
            flakes.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vy: rand(0.4, 1.8),
                vx: rand(-0.4, 0.4),
                s: rand(1.2, 3.4),
                phase: Math.random() * 6,
            });
        }
        return {
            tick: function () {
                fade(0.35);
                ctx.globalCompositeOperation = 'lighter';
                var wind = (pointer.x / Math.max(W, 1) - 0.5) * 1.8;
                for (i = 0; i < n; i++) {
                    var f = flakes[i];
                    f.phase += 0.02;
                    f.x += f.vx + Math.sin(f.phase) * 0.35 + wind * 0.4;
                    f.y += f.vy;
                    if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
                    if (f.x < -8) f.x = W + 8;
                    if (f.x > W + 8) f.x = -8;
                    ctx.fillStyle = 'rgba(230,240,255,0.85)';
                    ctx.beginPath();
                    ctx.arc(f.x, f.y, f.s, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 喷泉 ——— */
    function createFountain() {
        var pool = makePool(1400, function () {
            return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, hue: 190 };
        });
        var head = { i: 0 };
        return {
            tick: function () {
                fade(0.14);
                var ox = W * 0.5;
                var oy = H * 0.82;
                var aimX = (pointer.x - ox) * 0.02;
                var i;
                for (i = 0; i < 16; i++) {
                    spawnFromPool(pool, head, function (p) {
                        p.x = ox + rand(-8, 8);
                        p.y = oy;
                        p.vx = rand(-1.2, 1.2) + aimX;
                        p.vy = rand(-11.5, -7.2);
                        p.life = p.max = rand(50, 90);
                        p.hue = rand(175, 250);
                    });
                }
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pool.length; i++) {
                    var q = pool[i];
                    if (q.life <= 0) continue;
                    q.life -= 1;
                    q.vy += 0.22;
                    q.x += q.vx;
                    q.y += q.vy;
                    var t = q.life / q.max;
                    ctx.fillStyle = hsl(q.hue, 90, 68, t * 0.8);
                    ctx.fillRect(q.x, q.y, 2.2, 2.2);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 引力粒子 ——— */
    function createMouseAttract() {
        var n = 650;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: 0,
                vy: 0,
                hue: rand(190, 300),
            });
        }
        return {
            tick: function () {
                fade(0.22);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var dx = pointer.x - p.x;
                    var dy = pointer.y - p.y;
                    var d2 = dx * dx + dy * dy + 40;
                    p.vx += dx / d2 * 28;
                    p.vy += dy / d2 * 28;
                    p.vx *= 0.94;
                    p.vy *= 0.94;
                    p.x += p.vx;
                    p.y += p.vy;
                    ctx.fillStyle = hsl(p.hue, 90, 68, 0.7);
                    ctx.fillRect(p.x, p.y, 2.1, 2.1);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    /* ——— 流星 ——— */
    function createMeteor() {
        var pool = makePool(80, function () {
            return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 1 };
        });
        var head = { i: 0 };
        var cooldown = 0;
        function birth() {
            spawnFromPool(pool, head, function (p) {
                p.x = rand(0, W * 1.1);
                p.y = rand(-40, H * 0.35);
                var sp = rand(8, 16);
                p.vx = -sp * 0.75;
                p.vy = sp * 0.55;
                p.life = p.max = rand(28, 55);
                p.s = rand(1.4, 2.8);
            });
        }
        return {
            tick: function () {
                fade(0.22);
                cooldown -= 1;
                if (cooldown <= 0) {
                    birth();
                    if (Math.random() > 0.6) birth();
                    cooldown = rand(4, 14);
                }
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pool.length; i++) {
                    var q = pool[i];
                    if (q.life <= 0) continue;
                    q.life -= 1;
                    ctx.strokeStyle = 'rgba(180,220,255,' + (q.life / q.max) + ')';
                    ctx.lineWidth = q.s;
                    ctx.beginPath();
                    ctx.moveTo(q.x, q.y);
                    q.x += q.vx;
                    q.y += q.vy;
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createTsPreset(options) {
        var dead = false;
        var s = session;
        showLayer('particles');
        particlesEl.innerHTML = '';
        var handle = { tick: function () {}, destroy: function () { dead = true; } };
        ensureTsParticles().then(function () {
            if (dead || !isAlive(s)) return;
            window.tsParticles.load('labParticles', options).catch(function (err) {
                console.warn('[ParticleLab] tsparticles', err);
            }).then(function (inst) {
                if (!isAlive(s)) {
                    if (inst && inst.destroy) inst.destroy();
                    return;
                }
                handle.destroy = function () {
                    dead = true;
                    if (inst && inst.destroy) inst.destroy();
                    particlesEl.innerHTML = '';
                };
            });
        });
        return handle;
    }

    function tsBase(extra) {
        var cfg = {
            background: { color: '#020208' },
            fpsLimit: 60,
            detectRetina: true,
            particles: extra.particles,
            emitters: extra.emitters,
            interactivity: extra.interactivity || {
                events: { onHover: { enable: true, mode: 'repulse' } },
                modes: { repulse: { distance: 80 } },
            },
        };
        return cfg;
    }

    function createTsFire() {
        return createTsPreset(tsBase({
            particles: {
                number: { value: 140 },
                color: { value: ['#ffdd55', '#ff7a1a', '#ff2a00'] },
                move: { enable: true, direction: 'top', speed: { min: 1, max: 3.5 }, outModes: { default: 'out' } },
                opacity: { value: { min: 0.2, max: 0.85 } },
                size: { value: { min: 1, max: 4 } },
            },
        }));
    }

    function createTsSnow() {
        return createTsPreset(tsBase({
            particles: {
                number: { value: 180 },
                color: { value: '#ffffff' },
                move: { enable: true, direction: 'bottom', speed: { min: 0.4, max: 1.6 }, straight: false, outModes: { default: 'out' } },
                opacity: { value: { min: 0.25, max: 0.9 } },
                size: { value: { min: 1, max: 4 } },
                wobble: { enable: true, distance: 8, speed: 4 },
            },
        }));
    }

    function createTsStars() {
        return createTsPreset(tsBase({
            particles: {
                number: { value: 220 },
                color: { value: '#ffffff' },
                move: { enable: true, speed: 0.15 },
                opacity: { value: { min: 0.15, max: 1 }, animation: { enable: true, speed: 1.4, minimumValue: 0.15 } },
                size: { value: { min: 0.6, max: 2.4 } },
                twinkle: { particles: { enable: true, opacity: 1 } },
            },
            interactivity: {
                events: { onHover: { enable: true, mode: 'bubble' } },
                modes: { bubble: { distance: 140, size: 5, opacity: 1 } },
            },
        }));
    }

    function createThreeFountain() {
        var dead = false;
        var s = session;
        showLayer('three');
        threeEl.innerHTML = '';
        var handle = { tick: function () {}, destroy: function () { dead = true; } };
        ensureThree().then(function (THREE) {
            if (dead || !isAlive(s)) return;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(55, W / Math.max(H, 1), 0.1, 60);
            camera.position.set(0, 1.2, 8);
            var renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(W, H);
            renderer.setClearColor(0x020208);
            threeEl.appendChild(renderer.domElement);
            var count = 4000;
            var positions = new Float32Array(count * 3);
            var colors = new Float32Array(count * 3);
            var vel = [];
            var i;
            for (i = 0; i < count; i++) {
                positions[i * 3 + 1] = -20;
                vel.push({ vx: 0, vy: 0, vz: 0, life: 0 });
                colors[i * 3] = 0.55;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 1;
            }
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            var mat = new THREE.PointsMaterial({
                size: 0.06,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });
            var points = new THREE.Points(geo, mat);
            scene.add(points);
            var cursor = 0;
            handle.tick = function () {
                var mx = (pointer.x / Math.max(W, 1) - 0.5) * 8;
                var my = -(pointer.y / Math.max(H, 1) - 0.5) * 4;
                var k;
                for (k = 0; k < 28; k++) {
                    var idx = cursor++ % count;
                    positions[idx * 3] = mx + rand(-0.08, 0.08);
                    positions[idx * 3 + 1] = my;
                    positions[idx * 3 + 2] = rand(-0.08, 0.08);
                    vel[idx].vx = rand(-0.06, 0.06);
                    vel[idx].vy = rand(0.08, 0.18);
                    vel[idx].vz = rand(-0.06, 0.06);
                    vel[idx].life = 1;
                    colors[idx * 3] = rand(0.4, 1);
                    colors[idx * 3 + 1] = rand(0.6, 1);
                    colors[idx * 3 + 2] = 1;
                }
                for (i = 0; i < count; i++) {
                    if (vel[i].life <= 0) continue;
                    vel[i].vy -= 0.004;
                    positions[i * 3] += vel[i].vx;
                    positions[i * 3 + 1] += vel[i].vy;
                    positions[i * 3 + 2] += vel[i].vz;
                    vel[i].life -= 0.012;
                }
                geo.attributes.position.needsUpdate = true;
                geo.attributes.color.needsUpdate = true;
                points.rotation.y += 0.002;
                renderer.render(scene, camera);
            };
            handle.onResize = function () {
                camera.aspect = W / Math.max(H, 1);
                camera.updateProjectionMatrix();
                renderer.setSize(W, H);
            };
            handle.destroy = function () {
                dead = true;
                geo.dispose();
                mat.dispose();
                renderer.dispose();
                threeEl.innerHTML = '';
            };
        });
        return handle;
    }

    function createOrbit() {
        var n = 280;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                a: Math.random() * Math.PI * 2,
                r: rand(18, 160),
                s: rand(0.03, 0.09),
                size: rand(1.2, 2.8),
                hue: rand(180, 280),
            });
        }
        var cx = W / 2;
        var cy = H / 2;
        return {
            tick: function () {
                fade(0.22);
                cx += (pointer.x - cx) * 0.12;
                cy += (pointer.y - cy) * 0.12;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    p.a += p.s;
                    var x = cx + Math.cos(p.a) * p.r;
                    var y = cy + Math.sin(p.a) * p.r * 0.72;
                    ctx.fillStyle = hsl(p.hue, 85, 68, 0.75);
                    ctx.fillRect(x, y, p.size, p.size);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createBurst() {
        var sparks = [];
        function explode(x, y) {
            var n = 90 + Math.floor(Math.random() * 40);
            var hue = rand(0, 360);
            var i;
            for (i = 0; i < n; i++) {
                var a = Math.random() * Math.PI * 2;
                var sp = rand(1.5, 8);
                sparks.push({
                    x: x, y: y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    life: rand(24, 70),
                    max: 70,
                    hue: hue + rand(-20, 20),
                    s: rand(1.4, 3.2),
                });
            }
        }
        var idle = 0;
        return {
            onDown: function (x, y) { explode(x, y); },
            tick: function () {
                fade(0.18);
                idle += 1;
                if (idle > 70) {
                    idle = 0;
                    explode(rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.7));
                }
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = sparks.length - 1; i >= 0; i--) {
                    var p = sparks[i];
                    p.life -= 1;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.06;
                    p.vx *= 0.985;
                    var t = p.life / p.max;
                    ctx.fillStyle = hsl(p.hue, 100, 62, t);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.s * t, 0, Math.PI * 2);
                    ctx.fill();
                    if (p.life <= 0) sparks.splice(i, 1);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createDust() {
        var n = 520;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: rand(-0.15, 0.15),
                vy: rand(-0.12, 0.12),
                s: rand(0.8, 2.2),
                hue: rand(200, 280),
            });
        }
        return {
            tick: function () {
                fade(0.08);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var dx = p.x - pointer.x;
                    var dy = p.y - pointer.y;
                    var d2 = dx * dx + dy * dy + 40;
                    p.vx += dx / d2 * 6;
                    p.vy += dy / d2 * 6;
                    p.vx += (Math.random() - 0.5) * 0.04;
                    p.vy += (Math.random() - 0.5) * 0.04;
                    p.vx *= 0.97;
                    p.vy *= 0.97;
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0) p.x = W;
                    if (p.x > W) p.x = 0;
                    if (p.y < 0) p.y = H;
                    if (p.y > H) p.y = 0;
                    ctx.fillStyle = hsl(p.hue, 70, 75, 0.45);
                    ctx.fillRect(p.x, p.y, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createHelix() {
        var n = 420;
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.28);
                t += dt;
                var cx = W * 0.5;
                var cy = H * 0.5;
                var mx = (pointer.x / Math.max(W, 1) - 0.5) * 80;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < n; i++) {
                    var z = (i / n - 0.5) * 2;
                    var a = z * 9 + t * 1.4;
                    var r = 70 + Math.sin(z * 3 + t) * 8;
                    var x1 = cx + Math.cos(a) * r + mx;
                    var y1 = cy + z * H * 0.38;
                    var x2 = cx + Math.cos(a + Math.PI) * r + mx;
                    var y2 = y1;
                    ctx.fillStyle = hsl(200 + z * 40, 90, 68, 0.7);
                    ctx.fillRect(x1, y1, 2.4, 2.4);
                    ctx.fillStyle = hsl(280 + z * 30, 90, 68, 0.7);
                    ctx.fillRect(x2, y2, 2.4, 2.4);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createConfetti() {
        var bits = [];
        function toss(x, y, n) {
            var i;
            for (i = 0; i < n; i++) {
                bits.push({
                    x: x + rand(-12, 12),
                    y: y + rand(-8, 8),
                    vx: rand(-6, 6),
                    vy: rand(-10, -2),
                    rot: rand(0, 6),
                    vr: rand(-0.3, 0.3),
                    w: rand(4, 9),
                    h: rand(2, 5),
                    hue: rand(0, 360),
                    life: rand(50, 110),
                    max: 110,
                });
            }
        }
        var idle = 0;
        return {
            onDown: function (x, y) { toss(x, y, 70); },
            tick: function () {
                fade(0.12);
                idle += 1;
                if (idle > 40) {
                    idle = 0;
                    toss(rand(W * 0.2, W * 0.8), rand(40, 120), 18);
                }
                ctx.globalCompositeOperation = 'source-over';
                var i;
                for (i = bits.length - 1; i >= 0; i--) {
                    var p = bits[i];
                    p.life -= 1;
                    p.vy += 0.18;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.99;
                    p.rot += p.vr;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = hsl(p.hue, 90, 60, p.life / p.max);
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                    if (p.life <= 0 || p.y > H + 20) bits.splice(i, 1);
                }
            },
        };
    }

    function createSpiral() {
        var pool = makePool(1200, function () {
            return { x: 0, y: 0, a: 0, r: 0, life: 0, max: 1, hue: 200 };
        });
        var head = { i: 0 };
        var spin = 0;
        return {
            tick: function () {
                fade(0.16);
                spin += 0.18;
                var k;
                for (k = 0; k < 10; k++) {
                    spawnFromPool(pool, head, function (p) {
                        p.x = pointer.x;
                        p.y = pointer.y;
                        p.a = spin + k * 0.35;
                        p.r = 2;
                        p.life = p.max = rand(40, 80);
                        p.hue = (spin * 20 + k * 12) % 360;
                    });
                }
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pool.length; i++) {
                    var q = pool[i];
                    if (q.life <= 0) continue;
                    q.life -= 1;
                    q.r += 2.4;
                    q.a += 0.08;
                    var t = q.life / q.max;
                    var x = q.x + Math.cos(q.a) * q.r;
                    var y = q.y + Math.sin(q.a) * q.r;
                    ctx.fillStyle = hsl(q.hue, 90, 65, t * 0.8);
                    ctx.fillRect(x, y, 2.2, 2.2);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createSand() {
        var n = 900;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: 0,
                vy: rand(0.4, 1.8),
                s: rand(1.1, 2.4),
            });
        }
        return {
            tick: function () {
                fade(0.2);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var dx = pointer.x - p.x;
                    var dy = pointer.y - p.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 18000) {
                        p.vx -= dx * 0.0008;
                        p.vy -= 0.15;
                    }
                    p.vy += 0.12;
                    p.vx *= 0.96;
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.y > H - 8) {
                        p.y = H - 8;
                        p.vy *= -0.18;
                        p.vx *= 0.7;
                    }
                    if (p.x < 0 || p.x > W) p.vx *= -1;
                    if (p.y < -10) { p.y = -10; p.vy = 0.4; }
                    ctx.fillStyle = hsl(32 + (p.y / H) * 20, 70, 62, 0.7);
                    ctx.fillRect(p.x, p.y, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createPulse() {
        var rings = [];
        var idle = 0;
        function ping(x, y) {
            rings.push({ x: x, y: y, r: 4, life: 1, hue: rand(180, 280) });
        }
        return {
            onDown: function (x, y) { ping(x, y); },
            tick: function () {
                fade(0.2);
                idle += 1;
                if (pointer.moved && idle > 8) {
                    idle = 0;
                    ping(pointer.x, pointer.y);
                }
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = rings.length - 1; i >= 0; i--) {
                    var g = rings[i];
                    g.r += 3.4;
                    g.life -= 0.016;
                    var count = 36;
                    var k;
                    for (k = 0; k < count; k++) {
                        var a = (k / count) * Math.PI * 2;
                        var x = g.x + Math.cos(a) * g.r;
                        var y = g.y + Math.sin(a) * g.r;
                        ctx.fillStyle = hsl(g.hue, 90, 68, g.life * 0.7);
                        ctx.fillRect(x, y, 2.2, 2.2);
                    }
                    if (g.life <= 0) rings.splice(i, 1);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createFireflies() {
        var n = 90;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: rand(-0.35, 0.35),
                vy: rand(-0.28, 0.28),
                phase: Math.random() * Math.PI * 2,
                speed: rand(0.04, 0.09),
                s: rand(1.4, 2.6),
                hue: rand(48, 78),
            });
        }
        return {
            tick: function () {
                fade(0.16);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    p.phase += p.speed;
                    var glow = 0.15 + Math.max(0, Math.sin(p.phase)) * 0.85;
                    p.vx += (pointer.x - p.x) * 0.00008;
                    p.vy += (pointer.y - p.y) * 0.00008;
                    p.vx += (Math.random() - 0.5) * 0.05;
                    p.vy += (Math.random() - 0.5) * 0.05;
                    p.vx *= 0.97;
                    p.vy *= 0.97;
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0) p.x = W;
                    if (p.x > W) p.x = 0;
                    if (p.y < 0) p.y = H;
                    if (p.y > H) p.y = 0;
                    ctx.fillStyle = hsl(p.hue, 100, 70, glow * 0.18);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.s * 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = hsl(p.hue, 100, 82, glow);
                    ctx.fillRect(p.x, p.y, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createRain() {
        var n = 520;
        var pts = [];
        var splashes = [];
        var i;
        function reset(p) {
            p.x = Math.random() * W;
            p.y = rand(-H, 0);
            p.vy = rand(11, 18);
            p.s = rand(1.1, 2.2);
        }
        for (i = 0; i < n; i++) {
            var drop = { x: 0, y: 0, vy: 0, s: 1 };
            reset(drop);
            pts.push(drop);
        }
        return {
            tick: function () {
                fade(0.28);
                var wind = (pointer.x / Math.max(W, 1) - 0.5) * 4.5;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    p.x += wind;
                    p.y += p.vy;
                    ctx.fillStyle = 'rgba(170,210,255,0.55)';
                    ctx.fillRect(p.x, p.y, p.s, p.s * 3.2);
                    if (p.y > H) {
                        var k;
                        for (k = 0; k < 3; k++) {
                            splashes.push({
                                x: p.x,
                                y: H - 4,
                                vx: rand(-1.8, 1.8),
                                vy: rand(-3.2, -1.2),
                                life: 14,
                            });
                        }
                        reset(p);
                    }
                }
                for (i = splashes.length - 1; i >= 0; i--) {
                    var s = splashes[i];
                    s.life -= 1;
                    s.vy += 0.22;
                    s.x += s.vx;
                    s.y += s.vy;
                    ctx.fillStyle = 'rgba(200,230,255,' + (s.life / 14) + ')';
                    ctx.fillRect(s.x, s.y, 1.6, 1.6);
                    if (s.life <= 0) splashes.splice(i, 1);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createSnake() {
        var n = 90;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({ x: W * 0.5, y: H * 0.55 });
        }
        return {
            tick: function () {
                fade(0.22);
                pts[0].x += (pointer.x - pts[0].x) * 0.28;
                pts[0].y += (pointer.y - pts[0].y) * 0.28;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 1; i < n; i++) {
                    pts[i].x += (pts[i - 1].x - pts[i].x) * 0.35;
                    pts[i].y += (pts[i - 1].y - pts[i].y) * 0.35;
                }
                for (i = 0; i < n; i++) {
                    var t = 1 - i / n;
                    ctx.fillStyle = hsl(190 + i * 1.6, 90, 68, 0.25 + t * 0.7);
                    var s = 1.4 + t * 3.2;
                    ctx.fillRect(pts[i].x, pts[i].y, s, s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createTornado() {
        var n = 700;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                a: Math.random() * Math.PI * 2,
                y: Math.random(),
                r: rand(8, 150),
                s: rand(0.06, 0.14),
                size: rand(1.2, 2.4),
                hue: rand(190, 250),
            });
        }
        var cx = W * 0.5;
        var cy = H * 0.55;
        return {
            tick: function () {
                fade(0.18);
                cx += (pointer.x - cx) * 0.08;
                cy += (pointer.y - cy) * 0.08;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    p.a += p.s * (1.4 - p.y);
                    p.y -= 0.0045;
                    if (p.y < 0) p.y = 1;
                    var rad = p.r * (0.18 + p.y * 0.92);
                    var x = cx + Math.cos(p.a) * rad;
                    var y = cy + (p.y - 0.55) * H * 0.72;
                    ctx.fillStyle = hsl(p.hue, 85, 70, 0.35 + (1 - p.y) * 0.45);
                    ctx.fillRect(x, y, p.size, p.size);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createTunnel() {
        var n = 480;
        var pts = [];
        var i;
        function reset(p, far) {
            var a = Math.random() * Math.PI * 2;
            p.a = a;
            p.z = far ? 1 : rand(0.08, 1);
            p.r = rand(12, 90);
            p.hue = rand(200, 280);
        }
        for (i = 0; i < n; i++) {
            var p = {};
            reset(p, false);
            pts.push(p);
        }
        return {
            tick: function () {
                fade(0.32);
                var cx = W * 0.5 + (pointer.x - W * 0.5) * 0.35;
                var cy = H * 0.5 + (pointer.y - H * 0.5) * 0.35;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var q = pts[i];
                    q.z -= 0.012;
                    if (q.z <= 0.02) reset(q, true);
                    var k = 1 / q.z;
                    var x = cx + Math.cos(q.a) * q.r * k;
                    var y = cy + Math.sin(q.a) * q.r * k;
                    var s = clamp(2.8 / q.z, 1.1, 6);
                    ctx.fillStyle = hsl(q.hue, 90, 72, clamp(0.15 + (1 - q.z) * 0.7, 0, 0.9));
                    ctx.fillRect(x, y, s, s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createSpringGrid() {
        var cols = 28;
        var rows = 16;
        var pts = [];
        var c;
        var r;
        function restOf(col, row) {
            return {
                rx: (col + 0.5) * (W / cols),
                ry: (row + 0.5) * (H / rows),
            };
        }
        function rebuild() {
            pts = [];
            for (r = 0; r < rows; r++) {
                for (c = 0; c < cols; c++) {
                    var rest = restOf(c, r);
                    pts.push({
                        x: rest.rx,
                        y: rest.ry,
                        vx: 0,
                        vy: 0,
                        rx: rest.rx,
                        ry: rest.ry,
                    });
                }
            }
        }
        rebuild();
        return {
            onResize: rebuild,
            tick: function () {
                fade(0.22);
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    var dx = p.x - pointer.x;
                    var dy = p.y - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 22000) {
                        var f = 90 / (d2 + 80);
                        p.vx += dx * f;
                        p.vy += dy * f;
                    }
                    p.vx += (p.rx - p.x) * 0.06;
                    p.vy += (p.ry - p.y) * 0.06;
                    p.vx *= 0.82;
                    p.vy *= 0.82;
                    p.x += p.vx;
                    p.y += p.vy;
                    ctx.fillStyle = 'rgba(180,220,255,0.78)';
                    ctx.fillRect(p.x, p.y, 2.3, 2.3);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createNebula() {
        var n = 900;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2;
            var rad = Math.pow(Math.random(), 0.55) * Math.min(W, H) * 0.34;
            pts.push({
                x: W * 0.5 + Math.cos(a) * rad,
                y: H * 0.5 + Math.sin(a) * rad * 0.72,
                vx: rand(-0.2, 0.2),
                vy: rand(-0.2, 0.2),
                s: rand(0.9, 2.4),
                hue: rand(250, 320),
            });
        }
        return {
            tick: function () {
                fade(0.08);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var n1 = noise(p.x * 0.004, p.y * 0.004);
                    p.vx += Math.cos(n1 * 6.28) * 0.04;
                    p.vy += Math.sin(n1 * 6.28) * 0.04;
                    var dx = p.x - pointer.x;
                    var dy = p.y - pointer.y;
                    var d2 = dx * dx + dy * dy + 60;
                    p.vx += dx / d2 * 18;
                    p.vy += dy / d2 * 18;
                    p.vx *= 0.96;
                    p.vy *= 0.96;
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < -20) p.x = W + 20;
                    if (p.x > W + 20) p.x = -20;
                    if (p.y < -20) p.y = H + 20;
                    if (p.y > H + 20) p.y = -20;
                    ctx.fillStyle = hsl(p.hue, 80, 68, 0.28);
                    ctx.fillRect(p.x, p.y, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createAsh() {
        var n = 380;
        var pts = [];
        var i;
        function reset(p, fromBottom) {
            p.x = Math.random() * W;
            p.y = fromBottom ? H + rand(0, 40) : Math.random() * H;
            p.vx = rand(-0.25, 0.25);
            p.vy = rand(-1.1, -0.35);
            p.s = rand(1.1, 2.6);
            p.life = rand(80, 180);
            p.max = p.life;
            p.hue = rand(18, 42);
        }
        for (i = 0; i < n; i++) {
            var p = {};
            reset(p, false);
            pts.push(p);
        }
        return {
            tick: function () {
                fade(0.12);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var q = pts[i];
                    var lift = 0;
                    var d2 = (q.x - pointer.x) * (q.x - pointer.x) + (q.y - pointer.y) * (q.y - pointer.y);
                    if (d2 < 28000) lift = 0.35;
                    q.vx += (Math.random() - 0.5) * 0.08;
                    q.vy += -0.01 - lift;
                    q.vx *= 0.98;
                    q.x += q.vx;
                    q.y += q.vy;
                    q.life -= 1;
                    var t = q.life / q.max;
                    ctx.fillStyle = hsl(q.hue, 30, 55, 0.15 + t * 0.45);
                    ctx.fillRect(q.x, q.y, q.s, q.s);
                    if (q.life <= 0 || q.y < -10) reset(q, true);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function sampleHouseCloud(n) {
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            var face = Math.floor(Math.random() * 6);
            var u = Math.random();
            var v = Math.random();
            var x = 0;
            var y = 0;
            var z = 0;
            if (face === 0) { x = lerp(-0.82, 0.82, u); y = lerp(0, 1.02, v); z = 0.56; }
            else if (face === 1) { x = lerp(-0.82, 0.82, u); y = lerp(0, 1.02, v); z = -0.56; }
            else if (face === 2) { x = -0.82; y = lerp(0, 1.02, v); z = lerp(-0.56, 0.56, u); }
            else if (face === 3) { x = 0.82; y = lerp(0, 1.02, v); z = lerp(-0.56, 0.56, u); }
            else if (face === 4) { x = lerp(-0.82, 0.82, u); y = 0; z = lerp(-0.56, 0.56, v); }
            else {
                x = lerp(-0.88, 0.88, u);
                z = lerp(-0.6, 0.6, v);
                y = 1.02 + (1 - Math.abs(x) / 0.88) * 0.58;
            }
            pts.push({ x: x, y: y - 0.72, z: z });
        }
        return pts;
    }

    function project3(px, py, pz, rot, scale) {
        var c = Math.cos(rot);
        var s = Math.sin(rot);
        var x2 = px * c - pz * s;
        var z2 = px * s + pz * c;
        var persp = scale / (3.35 + z2);
        return {
            sx: W * 0.5 + x2 * persp,
            sy: H * 0.52 - py * persp,
            z: z2,
            k: persp,
        };
    }

    function dustFill(z, a, hot) {
        var t = clamp((z + 1.15) / 2.3, 0, 1);
        var r = Math.round(lerp(139, 230, t));
        var g = Math.round(lerp(92, 210, t));
        var b = Math.round(lerp(246, 255, t));
        if (hot) {
            r = Math.round(lerp(r, 255, hot));
            g = Math.round(lerp(g, 240, hot));
            b = Math.round(lerp(b, 255, hot));
        }
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function createWorkRepel() {
        var n = 1100;
        var pts = [];
        var i;
        var angle = 0;
        var radius = Math.min(W, H) * 0.16;
        var collapsing = 0;
        function homes() {
            radius = Math.min(W, H) * 0.16;
            for (i = 0; i < pts.length; i++) {
                var p = pts[i];
                p.hx = Math.sin(p.phi) * Math.cos(p.theta) * radius;
                p.hy = Math.cos(p.phi) * radius;
            }
        }
        for (i = 0; i < n; i++) {
            var u = Math.random();
            var v = Math.random();
            pts.push({
                theta: u * Math.PI * 2,
                phi: Math.acos(2 * v - 1),
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                hx: 0,
                hy: 0,
            });
        }
        homes();
        for (i = 0; i < n; i++) {
            pts[i].x = pts[i].hx;
            pts[i].y = pts[i].hy;
        }
        return {
            onResize: homes,
            onDown: function () { collapsing = 1; },
            tick: function (dt) {
                fade(1);
                if (collapsing > 0) {
                    collapsing -= dt * 1.55;
                    if (collapsing < 0) collapsing = 0;
                }
                angle += 0.22 * dt * (collapsing > 0 ? 2.4 : 1);
                var scale = collapsing > 0 ? 1 - Math.pow(1 - collapsing, 3) : 1;
                if (scale < 0.02) scale = 0.02;
                var cx = W * 0.5;
                var cy = H * 0.5;
                var mx = pointer.x - cx;
                var my = pointer.y - cy;
                var repelR = radius * 0.18 * scale;
                var attract = collapsing > 0 ? 0.42 : 0.1;
                ctx.globalCompositeOperation = 'source-over';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var x = Math.sin(p.phi) * Math.cos(p.theta + angle) * radius * scale;
                    var y = Math.cos(p.phi) * radius * scale;
                    var z = Math.sin(p.phi) * Math.sin(p.theta + angle);
                    p.vx += (x - p.x) * attract;
                    p.vy += (y - p.y) * attract;
                    if (collapsing <= 0) {
                        var dx = p.x - mx;
                        var dy = p.y - my;
                        var d2 = dx * dx + dy * dy;
                        if (d2 > 0.4 && d2 < repelR * repelR) {
                            var d = Math.sqrt(d2);
                            var f = 28 * (1 - d / repelR);
                            p.vx += (dx / d) * f;
                            p.vy += (dy / d) * f;
                        }
                    }
                    p.vx *= collapsing > 0 ? 0.82 : 0.9;
                    p.vy *= collapsing > 0 ? 0.82 : 0.9;
                    p.x += p.vx;
                    p.y += p.vy;
                    ctx.fillStyle = dustFill(z, 0.55 + (z + 1) * 0.22, 0);
                    ctx.fillRect(cx + p.x, cy + p.y, 1.8, 1.8);
                }
            },
        };
    }

    function createWorkDissolve() {
        var cloud = sampleHouseCloud(3200);
        var pos = cloud.map(function (p) {
            return { x: p.x, y: p.y, z: p.z, ox: p.x, oy: p.y, oz: p.z };
        });
        var t = 0;
        var rot = 0.4;
        return {
            tick: function (dt) {
                fade(0.45);
                t += dt;
                rot += dt * 0.28;
                var cycle = t % 9;
                var pull = 0;
                var follow = 0;
                var size = 1.6;
                if (cycle < 2.4) {
                    var p = easeInOut(cycle / 2.4);
                    follow = 0.08;
                    size = lerp(2.4, 1.5, p);
                    pull = 0.012 * p;
                } else if (cycle < 6.5) {
                    var phase = (cycle - 2.4) / 4.1;
                    follow = 0.045;
                    pull = 0.055 * Math.sin(t * 3) * (1 - phase * 0.5);
                    size = 1.5;
                } else {
                    var s = clamp((cycle - 6.5) / 2.5, 0, 1);
                    follow = 0.012 + 0.14 * s * s;
                    pull = 0.055 * (1 - s) * (1 - s);
                    size = lerp(1.5, 2.2, s);
                }
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pos.length; i++) {
                    var q = pos[i];
                    q.x += (q.ox - q.x) * follow + Math.sin(t * 4 + q.ox * 8) * pull;
                    q.y += (q.oy - q.y) * follow + Math.sin(t * 4 + q.oy * 8) * pull;
                    q.z += (q.oz - q.z) * follow + Math.sin(t * 4 + q.oz * 8) * pull;
                    var pr = project3(q.x, q.y, q.z, rot, scale);
                    var dx = pr.sx - pointer.x;
                    var dy = pr.sy - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 16000) {
                        var f = 18 / (d2 + 40);
                        pr.sx += dx * f * 8;
                        pr.sy += dy * f * 8;
                    }
                    ctx.fillStyle = dustFill(q.z, 0.42, 0);
                    ctx.fillRect(pr.sx, pr.sy, size, size);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkShock() {
        var cloud = sampleHouseCloud(3600);
        var rot = 0.35;
        var waves = [];
        var nodes = [
            { x: -0.82, y: 0.35, z: 0.56 },
            { x: 0.82, y: 0.35, z: 0.56 },
            { x: -0.82, y: 0.35, z: -0.56 },
            { x: 0.82, y: 0.35, z: -0.56 },
            { x: 0, y: -0.2, z: 0 },
            { x: 0, y: 0.85, z: 0 },
        ];
        return {
            onDown: function (x, y) {
                waves.push({ x: x, y: y, r: 6, life: 1, hue: 258 });
            },
            tick: function (dt) {
                fade(0.38);
                rot += dt * 0.22;
                var scale = Math.min(W, H) * 0.42;
                var i;
                var k;
                for (i = waves.length - 1; i >= 0; i--) {
                    waves[i].r += 280 * dt;
                    waves[i].life -= dt * 0.55;
                    if (waves[i].life <= 0) waves.splice(i, 1);
                }
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var pr = project3(q.x, q.y, q.z, rot, scale);
                    var hot = 0;
                    var ox = 0;
                    var oy = 0;
                    for (k = 0; k < waves.length; k++) {
                        var w = waves[k];
                        var d = Math.hypot(pr.sx - w.x, pr.sy - w.y);
                        var band = Math.abs(d - w.r);
                        if (band < 26) {
                            var pulse = (1 - band / 26) * w.life;
                            hot = Math.max(hot, pulse);
                            var nx = (pr.sx - w.x) / (d + 0.001);
                            var ny = (pr.sy - w.y) / (d + 0.001);
                            ox += nx * pulse * 14;
                            oy += ny * pulse * 14;
                        }
                    }
                    ctx.fillStyle = dustFill(q.z, 0.38 + hot * 0.6, hot);
                    ctx.fillRect(pr.sx + ox, pr.sy + oy, 1.7 + hot * 2.2, 1.7 + hot * 2.2);
                }
                for (i = 0; i < nodes.length; i++) {
                    var nd = project3(nodes[i].x, nodes[i].y, nodes[i].z, rot, scale);
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    ctx.fillRect(nd.sx - 1, nd.sy - 1, 3.2, 3.2);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkGather() {
        var house = sampleHouseCloud(2800);
        var pts = [];
        var i;
        var golden = Math.PI * (3 - Math.sqrt(5));
        for (i = 0; i < house.length; i++) {
            var y = 1 - (i / (house.length - 1)) * 2;
            var rr = Math.sqrt(Math.max(0, 1 - y * y));
            var th = golden * i;
            pts.push({
                hx: house[i].x,
                hy: house[i].y,
                hz: house[i].z,
                sx: Math.cos(th) * rr * 0.72,
                sy: y * 0.72,
                sz: Math.sin(th) * rr * 0.72,
                x: house[i].x,
                y: house[i].y,
                z: house[i].z,
            });
        }
        var t = 0;
        var rot = 0.2;
        return {
            tick: function (dt) {
                fade(0.32);
                t += dt;
                rot += dt * 0.18;
                var cycle = t % 11;
                var mix;
                if (cycle < 5.5) mix = easeInOut(cycle / 5.5);
                else if (cycle < 8) mix = 1;
                else mix = 1 - easeInOut((cycle - 8) / 3);
                var scale = Math.min(W, H) * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    var tx = lerp(p.hx, p.sx, mix);
                    var ty = lerp(p.hy, p.sy, mix);
                    var tz = lerp(p.hz, p.sz, mix);
                    p.x += (tx - p.x) * 0.08;
                    p.y += (ty - p.y) * 0.08;
                    p.z += (tz - p.z) * 0.08;
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    var dx = pointer.x - pr.sx;
                    var dy = pointer.y - pr.sy;
                    var d2 = dx * dx + dy * dy + 80;
                    pr.sx += dx / d2 * 420 * mix;
                    pr.sy += dy / d2 * 420 * mix;
                    ctx.fillStyle = dustFill(p.z, 0.4 + mix * 0.2, mix * 0.25);
                    ctx.fillRect(pr.sx, pr.sy, 1.8, 1.8);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkRing() {
        var n = 720;
        var pts = [];
        var i;
        function birth(p, a) {
            var r = Math.min(W, H) * 0.08;
            p.ox = Math.cos(a) * r;
            p.oy = Math.sin(a) * r;
            p.x = p.ox;
            p.y = p.oy;
            p.dx = p.ox / r;
            p.dy = p.oy / r;
            p.life = true;
            p.s = rand(1.1, 2.2);
        }
        for (i = 0; i < n; i++) {
            var p = {};
            birth(p, (i / n) * Math.PI * 2);
            pts.push(p);
        }
        return {
            tick: function () {
                fade(0.07);
                var cx = W * 0.5 + (pointer.x - W * 0.5) * 0.08;
                var cy = H * 0.5 + (pointer.y - H * 0.5) * 0.08;
                var bx = W * 0.5;
                var by = H * 0.5;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var q = pts[i];
                    if (q.life) {
                        q.x += q.dx + rand(-1, 1);
                        q.y += q.dy + rand(-1, 1);
                        if (Math.abs(q.x) > bx || Math.abs(q.y) > by) q.life = false;
                    } else {
                        birth(q, (i / n) * Math.PI * 2 + Math.random() * 0.05);
                    }
                    ctx.fillStyle = 'rgba(210,200,255,0.55)';
                    ctx.fillRect(cx + q.x, cy + q.y, q.s, q.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkConstraint() {
        var n = 240;
        var pts = [];
        var links = [];
        var i;
        var j;
        for (i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2;
            var r = Math.pow(Math.random(), 0.55) * Math.min(W, H) * 0.22;
            var x = W * 0.5 + Math.cos(a) * r;
            var y = H * 0.5 + Math.sin(a) * r * 0.85;
            pts.push({ x: x, y: y, px: x, py: y });
        }
        for (i = 0; i < n; i++) {
            var near = [];
            for (j = 0; j < n; j++) {
                if (j === i) continue;
                var d2 = (pts[i].x - pts[j].x) * (pts[i].x - pts[j].x) + (pts[i].y - pts[j].y) * (pts[i].y - pts[j].y);
                near.push({ j: j, d: d2 });
            }
            near.sort(function (a, b) { return a.d - b.d; });
            for (j = 0; j < 3; j++) {
                if (near[j].j > i) {
                    links.push({ a: i, b: near[j].j, rest: Math.sqrt(near[j].d) });
                }
            }
        }
        return {
            tick: function () {
                fade(0.2);
                var k;
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var vx = (p.x - p.px) * 0.98;
                    var vy = (p.y - p.py) * 0.98 + 0.04;
                    p.px = p.x;
                    p.py = p.y;
                    var dx = pointer.x - p.x;
                    var dy = pointer.y - p.y;
                    var d2 = dx * dx + dy * dy + 40;
                    vx += dx / d2 * 28;
                    vy += dy / d2 * 28;
                    p.x += vx;
                    p.y += vy;
                }
                for (k = 0; k < 3; k++) {
                    for (i = 0; i < links.length; i++) {
                        var L = links[i];
                        var a = pts[L.a];
                        var b = pts[L.b];
                        var dx = b.x - a.x;
                        var dy = b.y - a.y;
                        var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
                        var diff = (d - L.rest) / d * 0.42;
                        a.x += dx * diff * 0.5;
                        a.y += dy * diff * 0.5;
                        b.x -= dx * diff * 0.5;
                        b.y -= dy * diff * 0.5;
                    }
                }
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    ctx.fillStyle = 'rgba(168,140,255,0.78)';
                    ctx.fillRect(pts[i].x, pts[i].y, 2.2, 2.2);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkSwallow() {
        var n = 2800;
        var pts = [];
        var i;
        var captured = 0;
        var burst = 0;
        var ang = 0;
        for (i = 0; i < n; i++) {
            var idx = i * 0.37;
            pts.push({
                i: idx,
                x: W * 0.5,
                y: H * 0.5,
                vx: 0,
                vy: 0,
                caught: false,
            });
        }
        return {
            onDown: function () {
                if (captured > n * 0.08) burst = 1;
            },
            tick: function (dt) {
                fade(0.35);
                ang += dt * 0.45;
                var radius = Math.min(W, H) * 0.28;
                var cx = W * 0.5;
                var cy = H * 0.5;
                var mx = pointer.x;
                var my = pointer.y;
                var mass = captured / n;
                var horizon = 10 + mass * 46;
                if (burst > 0) burst -= dt * 1.4;
                if (burst < 0) burst = 0;
                ctx.globalCompositeOperation = 'lighter';
                captured = 0;
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var homeX = cx + Math.sin(p.i + ang) * Math.sin(p.i * p.i) * radius;
                    var homeY = cy + Math.cos(p.i * p.i) * radius;
                    if (burst > 0 && p.caught) {
                        p.caught = false;
                        p.vx = rand(-8, 8);
                        p.vy = rand(-8, 8);
                    }
                    if (!p.caught) {
                        p.vx += (homeX - p.x) * 0.012;
                        p.vy += (homeY - p.y) * 0.012;
                        var dx = mx - p.x;
                        var dy = my - p.y;
                        var d2 = dx * dx + dy * dy;
                        var suction = 110 + mass * 220;
                        if (d2 < suction * suction && d2 > 4) {
                            var d = Math.sqrt(d2);
                            p.vx += dx / d * 0.9;
                            p.vy += dy / d * 0.9;
                            if (d < horizon) p.caught = true;
                        }
                        p.vx *= 0.9;
                        p.vy *= 0.9;
                        p.x += p.vx;
                        p.y += p.vy;
                    } else {
                        captured += 1;
                        p.x += (mx - p.x) * 0.2;
                        p.y += (my - p.y) * 0.2;
                    }
                    if (!p.caught) {
                        ctx.fillStyle = dustFill(0.2, 0.5, 0);
                        ctx.fillRect(p.x, p.y, 1.5, 1.5);
                    }
                }
                var g;
                for (g = 4; g >= 1; g--) {
                    ctx.fillStyle = 'rgba(180,160,255,' + (0.04 + mass * 0.05) + ')';
                    ctx.beginPath();
                    ctx.arc(mx, my, horizon + g * 7, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#020208';
                ctx.beginPath();
                ctx.arc(mx, my, horizon, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkNoise() {
        var cols = 52;
        var rows = 32;
        var pts = [];
        var c;
        var r;
        for (r = 0; r < rows; r++) {
            for (c = 0; c < cols; c++) {
                pts.push({
                    u: c / (cols - 1),
                    v: r / (rows - 1),
                });
            }
        }
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.16);
                t += dt;
                var i;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    var nx = noise(p.u * 3.2 + t * 0.22, p.v * 3.2);
                    var ny = noise(p.u * 3.2, p.v * 3.2 + t * 0.18);
                    var x = p.u * W + (nx - 0.5) * 90;
                    var y = p.v * H + (ny - 0.5) * 90;
                    var dx = x - pointer.x;
                    var dy = y - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 24000) {
                        var f = 70 / (d2 + 80);
                        x += dx * f * 18;
                        y += dy * f * 18;
                    }
                    ctx.fillStyle = dustFill(nx * 2 - 1, 0.42, 0);
                    ctx.fillRect(x, y, 2, 2);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkOverload() {
        var n = 1600;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            var u = Math.random();
            var v = Math.random();
            pts.push({
                theta: u * Math.PI * 2,
                phi: Math.acos(2 * v - 1),
                j: Math.random() * 10,
            });
        }
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.28);
                t += dt;
                var radius = Math.min(W, H) * 0.16;
                var cx = W * 0.5;
                var cy = H * 0.5;
                var mx = pointer.x - cx;
                var my = pointer.y - cy;
                var inside = Math.hypot(mx, my) < radius * 1.15;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var jitter = inside ? 0.08 * Math.sin(t * 28 + p.j) : 0;
                    var x = Math.sin(p.phi) * Math.cos(p.theta + t * 0.3) * radius * (1 + jitter);
                    var y = Math.cos(p.phi) * radius * (1 + jitter * 0.7);
                    var z = Math.sin(p.phi) * Math.sin(p.theta + t * 0.3);
                    var hot = inside ? 0.7 : 0;
                    ctx.fillStyle = inside
                        ? hsl(8 + p.j * 3, 90, 62, 0.55)
                        : dustFill(z, 0.5, 0);
                    ctx.fillRect(cx + x, cy + y, 1.7, 1.7);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    var PATH_RGB = [
        [232, 197, 71],
        [90, 150, 255],
        [220, 56, 48],
        [70, 176, 92],
        [139, 92, 246],
        [255, 140, 42],
    ];

    function createWorkWuming() {
        var cloud = sampleHouseCloud(3400);
        var t = 0;
        var rot = 0.25;
        return {
            tick: function (dt) {
                fade(0.4);
                t += dt;
                rot += dt * 0.2;
                var grow = easeInOut(clamp(t / 6, 0, 1));
                var breath = t > 6 ? 1 + 0.018 * Math.sin((t - 6) * 2.1) : 1;
                var scale = Math.min(W, H) * 0.42 * breath;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var px = q.x * grow;
                    var py = q.y * grow;
                    var pz = q.z * grow;
                    var pr = project3(px, py, pz, rot, scale);
                    ctx.fillStyle = dustFill(q.z, 0.2 + grow * 0.35, 0);
                    ctx.fillRect(pr.sx, pr.sy, 1.4 + grow * 0.8, 1.4 + grow * 0.8);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkShi() {
        var cloud = sampleHouseCloud(3000);
        var pos = cloud.map(function (p) {
            return { x: p.x, y: p.y, z: p.z, ox: p.x, oy: p.y, oz: p.z };
        });
        var t = 0;
        var rot = 0.15;
        return {
            tick: function (dt) {
                fade(0.42);
                t += dt;
                rot += dt * 0.16;
                var cycle = t % 12;
                var size = 2.6;
                var pull = 0;
                var follow = 0.12;
                if (cycle < 4) {
                    size = 2.7;
                    pull = 0;
                } else if (cycle < 7) {
                    var p = (cycle - 4) / 3;
                    size = lerp(2.7, 1.5, p);
                    pull = 0.04 * p;
                    follow = 0.05;
                } else {
                    var s = (cycle - 7) / 5;
                    size = lerp(1.5, 2.2, clamp(s, 0, 1));
                    pull = 0.05 * (1 - s);
                    follow = 0.02 + 0.12 * s;
                }
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pos.length; i++) {
                    var q = pos[i];
                    q.x += (q.ox - q.x) * follow + Math.sin(t * 3.2 + q.ox * 7) * pull;
                    q.y += (q.oy - q.y) * follow + Math.sin(t * 3.2 + q.oy * 7) * pull;
                    q.z += (q.oz - q.z) * follow + Math.sin(t * 3.2 + q.oz * 7) * pull;
                    var pr = project3(q.x, q.y, q.z, rot, scale);
                    ctx.fillStyle = dustFill(q.z, cycle < 4 ? 0.62 : 0.4, 0);
                    ctx.fillRect(pr.sx, pr.sy, size, size);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkLiuru() {
        var cloud = sampleHouseCloud(3200);
        var nodes = [
            { x: -0.82, y: 0.38, z: 0.56, lit: false },
            { x: 0.82, y: 0.38, z: 0.56, lit: false },
            { x: -0.82, y: 0.38, z: -0.56, lit: false },
            { x: 0.82, y: 0.38, z: -0.56, lit: false },
            { x: 0, y: -0.18, z: 0, lit: false },
            { x: 0, y: 0.88, z: 0, lit: false },
        ];
        var waves = [];
        var rot = 0.3;
        var doneT = -1;
        var screenNodes = [];
        return {
            onDown: function (x, y) {
                var best = -1;
                var bestD = 42;
                var i;
                for (i = 0; i < screenNodes.length; i++) {
                    var d = Math.hypot(screenNodes[i].x - x, screenNodes[i].y - y);
                    if (d < bestD) { bestD = d; best = i; }
                }
                if (best >= 0 && !nodes[best].lit) {
                    nodes[best].lit = true;
                    waves.push({ x: x, y: y, r: 4, life: 1 });
                    var all = true;
                    for (i = 0; i < 6; i++) if (!nodes[i].lit) all = false;
                    if (all) doneT = 0;
                }
            },
            tick: function (dt) {
                fade(0.36);
                rot += dt * 0.2;
                if (doneT >= 0) {
                    doneT += dt;
                    if (doneT > 2.8) {
                        doneT = -1;
                        var k;
                        for (k = 0; k < 6; k++) nodes[k].lit = false;
                    }
                }
                var i;
                for (i = waves.length - 1; i >= 0; i--) {
                    waves[i].r += 260 * dt;
                    waves[i].life -= dt * 0.5;
                    if (waves[i].life <= 0) waves.splice(i, 1);
                }
                var scale = Math.min(W, H) * 0.42;
                screenNodes = [];
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var pr = project3(q.x, q.y, q.z, rot, scale);
                    var hot = doneT >= 0 ? 0.35 : 0;
                    var ox = 0;
                    var oy = 0;
                    var w;
                    for (w = 0; w < waves.length; w++) {
                        var wv = waves[w];
                        var d = Math.hypot(pr.sx - wv.x, pr.sy - wv.y);
                        var band = Math.abs(d - wv.r);
                        if (band < 24) {
                            var pulse = (1 - band / 24) * wv.life;
                            hot = Math.max(hot, pulse);
                            ox += ((pr.sx - wv.x) / (d + 0.001)) * pulse * 12;
                            oy += ((pr.sy - wv.y) / (d + 0.001)) * pulse * 12;
                        }
                    }
                    ctx.fillStyle = dustFill(q.z, 0.36 + hot * 0.55, hot);
                    ctx.fillRect(pr.sx + ox, pr.sy + oy, 1.6 + hot * 2, 1.6 + hot * 2);
                }
                for (i = 0; i < nodes.length; i++) {
                    var nd = project3(nodes[i].x, nodes[i].y, nodes[i].z, rot, scale);
                    screenNodes.push({ x: nd.sx, y: nd.sy });
                    var on = nodes[i].lit;
                    ctx.fillStyle = on ? 'rgba(255,255,255,0.95)' : 'rgba(180,160,255,0.7)';
                    ctx.fillRect(nd.sx - 2, nd.sy - 2, on ? 5 : 3.4, on ? 5 : 3.4);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkQu() {
        var n = 1400;
        var pts = [];
        var i;
        var radius = Math.min(W, H) * 0.16;
        for (i = 0; i < n; i++) {
            var u = Math.random();
            var v = Math.random();
            var theta = u * Math.PI * 2;
            var phi = Math.acos(2 * v - 1);
            pts.push({
                theta: theta,
                phi: phi,
                x: Math.sin(phi) * Math.cos(theta) * radius,
                y: Math.cos(phi) * radius,
                vx: 0,
                vy: 0,
            });
        }
        var t = 0;
        var angle = 0;
        return {
            tick: function (dt) {
                fade(0.32);
                t += dt;
                angle += dt * 0.18;
                radius = Math.min(W, H) * 0.16;
                var lock = easeInOut(clamp(t / 7, 0, 1));
                var attract = 0.08 + lock * 0.38;
                var damp = 0.92 - lock * 0.1;
                var size = 1.5 + lock * 1.4;
                var cx = W * 0.5;
                var cy = H * 0.5;
                var mx = pointer.x - cx;
                var my = pointer.y - cy;
                var repelR = radius * 0.2 * (1 - lock * 0.7);
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var hx = Math.sin(p.phi) * Math.cos(p.theta + angle) * radius;
                    var hy = Math.cos(p.phi) * radius;
                    var z = Math.sin(p.phi) * Math.sin(p.theta + angle);
                    p.vx += (hx - p.x) * attract;
                    p.vy += (hy - p.y) * attract;
                    if (lock < 0.92) {
                        var dx = p.x - mx;
                        var dy = p.y - my;
                        var d2 = dx * dx + dy * dy;
                        if (d2 > 0.4 && d2 < repelR * repelR) {
                            var d = Math.sqrt(d2);
                            var f = 16 * (1 - lock) * (1 - d / repelR);
                            p.vx += (dx / d) * f;
                            p.vy += (dy / d) * f;
                        }
                    }
                    p.vx *= damp;
                    p.vy *= damp;
                    p.x += p.vx;
                    p.y += p.vy;
                    ctx.fillStyle = dustFill(z, 0.4 + lock * 0.35, lock * 0.2);
                    ctx.fillRect(cx + p.x, cy + p.y, size, size);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkSweep() {
        var cloud = sampleHouseCloud(3600);
        var t = 0;
        var rot = 0.22;
        return {
            tick: function (dt) {
                fade(0.38);
                t += dt;
                rot += dt * 0.18;
                var sweep = lerp(-0.85, 1.05, (t % 5.2) / 5.2);
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var band = 1 - clamp(Math.abs(q.y - sweep) / 0.14, 0, 1);
                    var pr = project3(q.x, q.y + band * 0.02, q.z, rot, scale);
                    ctx.fillStyle = dustFill(q.z, 0.32 + band * 0.55, band);
                    ctx.fillRect(pr.sx, pr.sy, 1.5 + band * 2.4, 1.5 + band * 2.4);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkWeave() {
        var n = 900;
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.22);
                t += dt;
                var rot = t * 0.35 + (pointer.x / Math.max(W, 1) - 0.5) * 0.8;
                var scale = Math.min(W, H) * 0.38;
                var R = 0.72;
                var r = 0.2;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                var ring;
                for (ring = 0; ring < 2; ring++) {
                    var spin = ring === 0 ? t * 0.7 : -t * 0.55;
                    var tilt = ring === 0 ? 0.4 : -0.55;
                    for (i = 0; i < n; i++) {
                        var a = (i / n) * Math.PI * 2 + spin;
                        var b = a * 3 + t * 1.4 + ring * Math.PI;
                        var x = (R + r * Math.cos(b)) * Math.cos(a);
                        var y = r * Math.sin(b) * 0.9 + Math.sin(a) * tilt * 0.15;
                        var z = (R + r * Math.cos(b)) * Math.sin(a);
                        if (ring === 1) {
                            var tmp = y;
                            y = z * 0.85;
                            z = tmp;
                        }
                        var pr = project3(x, y, z, rot, scale);
                        ctx.fillStyle = ring === 0
                            ? dustFill(z, 0.55, 0.15)
                            : 'rgba(210,190,255,0.5)';
                        ctx.fillRect(pr.sx, pr.sy, 1.8, 1.8);
                    }
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkCollapse() {
        var house = sampleHouseCloud(2600);
        var pts = house.map(function (p, i) {
            return {
                x: p.x, y: p.y, z: p.z,
                ox: p.x, oy: p.y, oz: p.z,
                path: i % 6,
                vx: 0, vy: 0, vz: 0,
            };
        });
        var t = 0;
        var rot = 0.2;
        return {
            tick: function (dt) {
                fade(0.28);
                t += dt;
                rot += dt * 0.22;
                var cycle = t % 10;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    var col = PATH_RGB[p.path];
                    if (cycle < 2.6) {
                        p.x += (p.ox - p.x) * 0.12;
                        p.y += (p.oy - p.y) * 0.12;
                        p.z += (p.oz - p.z) * 0.12;
                    } else if (cycle < 4.8) {
                        var k = easeInOut((cycle - 2.6) / 2.2);
                        p.x += (0 - p.x) * (0.04 + k * 0.16);
                        p.y += (0 - p.y) * (0.04 + k * 0.16);
                        p.z += (0 - p.z) * (0.04 + k * 0.16);
                    } else {
                        var a = (p.path / 6) * Math.PI * 2;
                        var u = (cycle - 4.8) / 5.2;
                        var rad = u * 1.35;
                        p.x += (Math.cos(a) * rad - p.x) * 0.08;
                        p.y += (Math.sin(a * 1.7 + u) * rad * 0.35 - p.y) * 0.08;
                        p.z += (Math.sin(a) * rad - p.z) * 0.08;
                    }
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.55)';
                    ctx.fillRect(pr.sx, pr.sy, 1.8, 1.8);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkUnload() {
        var cloud = sampleHouseCloud(3000);
        var pts = cloud.map(function (p) {
            return {
                x: p.x, y: p.y, z: p.z,
                ox: p.x, oy: p.y, oz: p.z,
                delay: Math.random() * 5,
                gone: 0,
            };
        });
        var t = 0;
        var rot = 0.18;
        return {
            tick: function (dt) {
                fade(0.14);
                t += dt;
                rot += dt * 0.12;
                if (t > 11) {
                    t = 0;
                    var r;
                    for (r = 0; r < pts.length; r++) {
                        pts[r].x = pts[r].ox;
                        pts[r].y = pts[r].oy;
                        pts[r].z = pts[r].oz;
                        pts[r].gone = 0;
                    }
                }
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    if (t > p.delay) {
                        p.gone += dt * 0.35;
                        p.y += dt * 0.18;
                        p.x += (noise(p.ox * 3, t) - 0.5) * dt * 0.4;
                    }
                    var a = clamp(1 - p.gone, 0, 1);
                    if (a <= 0.02) continue;
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    ctx.fillStyle = dustFill(p.z, 0.45 * a, 0);
                    ctx.fillRect(pr.sx, pr.sy, 1.8, 1.8);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkSpirit() {
        var n = 2200;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2;
            var y = rand(-1.1, 1.1);
            var rad = (0.22 + (1 - Math.abs(y) * 0.55)) * Math.sqrt(Math.random());
            pts.push({
                x: Math.cos(a) * rad,
                y: y,
                z: Math.sin(a) * rad,
                s: rand(1.2, 2.2),
            });
        }
        var t = 0;
        var rot = 0;
        return {
            tick: function (dt) {
                fade(0.2);
                t += dt;
                rot += dt * 0.25;
                var scale = Math.min(W, H) * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var n1 = noise(p.x * 1.4 + t * 0.15, p.y * 1.4);
                    var n2 = noise(p.z * 1.4, t * 0.12 + p.y);
                    p.x += (n1 - 0.5) * 0.012;
                    p.z += (n2 - 0.5) * 0.012;
                    p.y += Math.sin(t * 0.7 + p.x * 3) * 0.002;
                    if (p.y > 1.2) p.y = -1.15;
                    if (p.y < -1.2) p.y = 1.15;
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    var dx = pr.sx - pointer.x;
                    var dy = pr.sy - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 18000) {
                        var f = 40 / (d2 + 50);
                        pr.sx += dx * f * 10;
                        pr.sy += dy * f * 10;
                    }
                    ctx.fillStyle = dustFill(p.z, 0.42, 0);
                    ctx.fillRect(pr.sx, pr.sy, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkTian() {
        var layers = [
            { n: 700, col: [85, 148, 152], r: 0.95, sp: 0.18 },
            { n: 700, col: [40, 57, 77], r: 0.7, sp: 0.11 },
            { n: 700, col: [114, 117, 70], r: 1.15, sp: 0.07 },
            { n: 700, col: [100, 63, 21], r: 0.5, sp: 0.24 },
        ];
        var pts = [];
        var L;
        var i;
        for (L = 0; L < layers.length; L++) {
            var layer = layers[L];
            for (i = 0; i < layer.n; i++) {
                var a = Math.random() * Math.PI * 2;
                var b = Math.acos(2 * Math.random() - 1);
                pts.push({
                    a: a,
                    b: b,
                    r: layer.r * (0.75 + Math.random() * 0.35),
                    col: layer.col,
                    sp: layer.sp,
                    s: rand(1.2, 2.3),
                });
            }
        }
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.12);
                t += dt;
                var rot = t * 0.12 + (pointer.x / Math.max(W, 1) - 0.5) * 0.5;
                var scale = Math.min(W, H) * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    var a = p.a + t * p.sp;
                    var x = Math.sin(p.b) * Math.cos(a) * p.r;
                    var y = Math.cos(p.b) * p.r * 0.72;
                    var z = Math.sin(p.b) * Math.sin(a) * p.r;
                    var pr = project3(x, y, z, rot, scale);
                    ctx.fillStyle = 'rgba(' + p.col[0] + ',' + p.col[1] + ',' + p.col[2] + ',0.45)';
                    ctx.fillRect(pr.sx, pr.sy, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkXing() {
        var cloud = sampleHouseCloud(3000);
        var pts = cloud.map(function (p) {
            return {
                x: rand(-2.2, 2.2),
                y: rand(-2.2, 2.2),
                z: rand(-2.2, 2.2),
                ox: p.x,
                oy: p.y,
                oz: p.z,
            };
        });
        var t = 0;
        var rot = 0.2;
        return {
            tick: function (dt) {
                fade(0.3);
                t += dt;
                rot += dt * 0.22;
                var cycle = t % 8;
                var mix = cycle < 5.5 ? easeInOut(cycle / 5.5) : 1 - easeInOut((cycle - 5.5) / 2.5);
                var jitter = (1 - mix) * 0.08;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    p.x += (p.ox - p.x) * (0.03 + mix * 0.12);
                    p.y += (p.oy - p.y) * (0.03 + mix * 0.12);
                    p.z += (p.oz - p.z) * (0.03 + mix * 0.12);
                    p.x += Math.sin(t * 9 + p.ox * 12) * jitter;
                    p.y += Math.cos(t * 8 + p.oy * 12) * jitter;
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    ctx.fillStyle = dustFill(p.z, 0.28 + mix * 0.3, 0);
                    ctx.fillRect(pr.sx, pr.sy, 1.7, 1.7);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkDukha() {
        var cloud = sampleHouseCloud(3400);
        var t = 0;
        var rot = 0.25;
        var cx = 0;
        var cy = 0;
        var cz = 0;
        return {
            tick: function (dt) {
                fade(0.34);
                t += dt;
                rot += dt * 0.2;
                var radius = ((t * 0.62) % 1) * 2.4;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var dx = q.x - cx;
                    var dy = q.y - cy;
                    var dz = q.z - cz;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
                    var band = 1 - clamp(Math.abs(dist - radius) / 0.18, 0, 1);
                    var jag = band * 0.07 * Math.sin(dist * 28 + t * 16);
                    var pr = project3(q.x + dx / dist * jag, q.y + dy / dist * jag, q.z + dz / dist * jag, rot, scale);
                    var hot = band;
                    ctx.fillStyle = hot > 0.15
                        ? 'rgba(255,' + Math.round(90 + hot * 80) + ',48,' + (0.35 + hot * 0.5) + ')'
                        : dustFill(q.z, 0.34, 0);
                    ctx.fillRect(pr.sx, pr.sy, 1.5 + hot * 2.2, 1.5 + hot * 2.2);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkSukha() {
        var cloud = sampleHouseCloud(3200);
        var t = 0;
        var rot = 0.2;
        return {
            tick: function (dt) {
                fade(0.22);
                t += dt;
                rot += dt * 0.16;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var pulse = 1 + 0.035 * Math.sin(t * 3.2 + q.x * 6);
                    var pr = project3(q.x * pulse, q.y * pulse, q.z * pulse, rot, scale);
                    var dx = pointer.x - pr.sx;
                    var dy = pointer.y - pr.sy;
                    var d2 = dx * dx + dy * dy + 60;
                    pr.sx += dx / d2 * 520;
                    pr.sy += dy / d2 * 520;
                    var near = clamp(18000 / d2, 0, 1);
                    ctx.fillStyle = 'rgba(' + Math.round(160 + near * 80) + ',' + Math.round(180 + near * 50) + ',255,' + (0.32 + near * 0.45) + ')';
                    ctx.fillRect(pr.sx, pr.sy, 1.6 + near * 1.8, 1.6 + near * 1.8);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkUpeksha() {
        var cloud = sampleHouseCloud(3000);
        var t = 0;
        var rot = 0.18;
        return {
            tick: function (dt) {
                fade(0.18);
                t += dt;
                rot += dt * 0.14;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var pr = project3(q.x, q.y, q.z, rot, scale);
                    var dx = pr.sx - pointer.x;
                    var dy = pr.sy - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 14000) {
                        var f = 12 / (d2 + 80);
                        pr.sx += dx * f * 2;
                        pr.sy += dy * f * 2;
                    }
                    ctx.fillStyle = dustFill(q.z, 0.28, 0);
                    ctx.fillRect(pr.sx, pr.sy, 1.6, 1.6);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkAsura() {
        var n = 2400;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            pts.push({
                x: rand(-1.2, 1.2),
                y: rand(-1.2, 1.2),
                z: rand(-1.2, 1.2),
            });
        }
        var t = 0;
        var rot = 0;
        return {
            tick: function (dt) {
                fade(0.2);
                t += dt;
                rot += dt * 0.4;
                var scale = Math.min(W, H) * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var n1 = noise(p.x * 2.2 + t * 0.55, p.y * 2.2);
                    var n2 = noise(p.z * 2.2, p.y * 2.2 + t * 0.48);
                    p.x += (n1 - 0.5) * 0.055;
                    p.y += (n2 - 0.5) * 0.055;
                    p.z += (noise(p.x, t * 0.3) - 0.5) * 0.04;
                    if (Math.abs(p.x) > 1.4) p.x *= 0.92;
                    if (Math.abs(p.y) > 1.4) p.y *= 0.92;
                    if (Math.abs(p.z) > 1.4) p.z *= 0.92;
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    var dx = pr.sx - pointer.x;
                    var dy = pr.sy - pointer.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 20000) {
                        var f = 90 / (d2 + 40);
                        pr.sx += dx * f * 16;
                        pr.sy += dy * f * 16;
                    }
                    ctx.fillStyle = 'rgba(255,' + Math.round(70 + n1 * 80) + ',70,0.5)';
                    ctx.fillRect(pr.sx, pr.sy, 1.7, 1.7);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkBeast() {
        var n = 4200;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2;
            var r = Math.pow(Math.random(), 0.4) * 1.15;
            pts.push({
                a: a,
                r: r,
                y: rand(-0.7, 0.7),
                s: rand(0.9, 1.8),
            });
        }
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.08);
                t += dt;
                var rot = t * 0.55 + (pointer.x / Math.max(W, 1) - 0.5);
                var scale = Math.min(W, H) * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var a = p.a + t * (0.4 + p.r * 0.8);
                    var x = Math.cos(a) * p.r;
                    var z = Math.sin(a) * p.r;
                    var y = p.y + Math.sin(a * 3 + t) * 0.08;
                    var pr = project3(x, y, z, rot, scale);
                    ctx.fillStyle = 'rgba(70,200,110,0.38)';
                    ctx.fillRect(pr.sx, pr.sy, p.s, p.s);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkTouchpoint() {
        var n = 1100;
        var pts = [];
        var i;
        var radius = Math.min(W, H) * 0.16;
        for (i = 0; i < n; i++) {
            var u = Math.random();
            var v = Math.random();
            var theta = u * Math.PI * 2;
            var phi = Math.acos(2 * v - 1);
            pts.push({
                theta: theta,
                phi: phi,
                x: Math.sin(phi) * Math.cos(theta) * radius,
                y: Math.cos(phi) * radius,
                vx: 0,
                vy: 0,
            });
        }
        var collapsing = 0;
        var angle = 0;
        return {
            onDown: function () { collapsing = 1; },
            tick: function (dt) {
                fade(0.45);
                if (collapsing > 0) collapsing -= dt * 1.35;
                if (collapsing < 0) collapsing = 0;
                angle += dt * (0.22 + collapsing * 1.8);
                radius = Math.min(W, H) * 0.16;
                var scale = collapsing > 0 ? Math.pow(collapsing, 1.6) : 1;
                if (scale < 0.012) scale = 0.012;
                var cx = W * 0.5;
                var cy = H * 0.5;
                var mx = pointer.x - cx;
                var my = pointer.y - cy;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var hx = Math.sin(p.phi) * Math.cos(p.theta + angle) * radius * scale;
                    var hy = Math.cos(p.phi) * radius * scale;
                    var z = Math.sin(p.phi) * Math.sin(p.theta + angle);
                    p.vx += (hx - p.x) * (collapsing > 0 ? 0.4 : 0.1);
                    p.vy += (hy - p.y) * (collapsing > 0 ? 0.4 : 0.1);
                    if (collapsing <= 0) {
                        var dx = p.x - mx;
                        var dy = p.y - my;
                        var d2 = dx * dx + dy * dy;
                        var rr = radius * 0.18;
                        if (d2 > 0.4 && d2 < rr * rr) {
                            var d = Math.sqrt(d2);
                            p.vx += (dx / d) * 26 * (1 - d / rr);
                            p.vy += (dy / d) * 26 * (1 - d / rr);
                        }
                    }
                    p.vx *= 0.88;
                    p.vy *= 0.88;
                    p.x += p.vx;
                    p.y += p.vy;
                    ctx.fillStyle = dustFill(z, 0.55, collapsing);
                    ctx.fillRect(cx + p.x, cy + p.y, 1.8, 1.8);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkConsensus() {
        var n = 1800;
        var pts = [];
        var i;
        for (i = 0; i < n; i++) {
            var path = i % 6;
            var a = (path / 6) * Math.PI * 2 + rand(-0.4, 0.4);
            pts.push({
                path: path,
                a: a,
                r: rand(0.35, 1.15),
                y: rand(-0.5, 0.5),
            });
        }
        var t = 0;
        return {
            tick: function (dt) {
                fade(0.16);
                t += dt;
                var cycle = t % 7;
                var unify = 0;
                if (cycle > 3.2 && cycle < 5.2) unify = easeInOut(1 - Math.abs(cycle - 4.2) / 1);
                var rot = t * 0.2;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                for (i = 0; i < n; i++) {
                    var p = pts[i];
                    var a = p.a + t * 0.3;
                    var r = lerp(p.r, 0.55, unify);
                    var x = Math.cos(a) * r;
                    var z = Math.sin(a) * r;
                    var y = lerp(p.y, 0, unify);
                    var pr = project3(x, y, z, rot, scale);
                    var col = PATH_RGB[p.path];
                    var rC = Math.round(lerp(col[0], 230, unify));
                    var gC = Math.round(lerp(col[1], 210, unify));
                    var bC = Math.round(lerp(col[2], 255, unify));
                    ctx.fillStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + (0.4 + unify * 0.35) + ')';
                    ctx.fillRect(pr.sx, pr.sy, 1.6 + unify, 1.6 + unify);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkFlesh() {
        var cloud = sampleHouseCloud(2800);
        var pts = cloud.map(function (p) {
            return { x: p.x, y: p.y, z: p.z, ox: p.x, oy: p.y, oz: p.z, vx: 0, vy: 0, vz: 0 };
        });
        var t = 0;
        var rot = 0.25;
        return {
            tick: function (dt) {
                fade(0.26);
                t += dt;
                rot += dt * 0.2;
                var scale = Math.min(W, H) * 0.42;
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    p.vx += (p.ox - p.x) * 0.04 + Math.sin(t * 2.4 + p.ox * 5) * 0.004;
                    p.vy += (p.oy - p.y) * 0.04 + Math.sin(t * 2.1 + p.oy * 5) * 0.004;
                    p.vz += (p.oz - p.z) * 0.04;
                    var pr0 = project3(p.x, p.y, p.z, rot, scale);
                    var dx = pointer.x - pr0.sx;
                    var dy = pointer.y - pr0.sy;
                    var d2 = dx * dx + dy * dy + 50;
                    p.vx += dx / d2 * 0.35;
                    p.vy += dy / d2 * 0.22;
                    p.vx *= 0.9;
                    p.vy *= 0.9;
                    p.vz *= 0.9;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.z += p.vz;
                    var pr = project3(p.x, p.y, p.z, rot, scale);
                    var near = clamp(9000 / d2, 0, 1);
                    ctx.fillStyle = near > 0.25
                        ? 'rgba(255,' + Math.round(80 + near * 100) + ',' + Math.round(120 + near * 80) + ',' + (0.45 + near * 0.4) + ')'
                        : dustFill(p.z, 0.42, 0);
                    ctx.fillRect(pr.sx, pr.sy, 1.8 + near, 1.8 + near);
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    function createWorkQuote() {
        var cloud = sampleHouseCloud(2400);
        var t = 0;
        var rot = 0.08;
        return {
            tick: function (dt) {
                fade(0.08);
                t += dt;
                rot += dt * 0.05;
                var still = easeInOut(clamp(t / 10, 0, 1));
                var scale = Math.min(W, H) * lerp(0.42, 0.34, still);
                ctx.globalCompositeOperation = 'lighter';
                var i;
                for (i = 0; i < cloud.length; i++) {
                    var q = cloud[i];
                    var wiggle = (1 - still) * 0.03;
                    var pr = project3(
                        q.x + Math.sin(t * 1.4 + q.x * 4) * wiggle,
                        q.y + Math.cos(t * 1.1 + q.y * 4) * wiggle,
                        q.z,
                        rot,
                        scale
                    );
                    ctx.fillStyle = dustFill(q.z, 0.5 * (1 - still * 0.55), 0);
                    ctx.fillRect(pr.sx, pr.sy, lerp(1.9, 1.2, still), lerp(1.9, 1.2, still));
                }
                ctx.globalCompositeOperation = 'source-over';
            },
        };
    }

    var EFFECTS = [
        { id: 'fluid', label: 'WebGL流体', layer: 'frame', hint: '按住拖动，彩色墨会卷成涡', note: 'Pavel Dobryakov 的 WebGL Fluid Simulation。GPU Navier-Stokes，Google Experiments 上最有名的流体之一。', create: createFluid },
        { id: 'halo', label: 'VANTA光晕', layer: 'three', hint: '鼠标会推开光晕核', note: 'Vanta.js HALO。Three.js 体积光，官网 hero 常用。', create: function () { return createVanta('halo', { baseColor: 0x1a0533, amplitudeFactor: 1.3, size: 1.15 }); } },
        { id: 'three-galaxy', label: 'THREE星系', layer: 'three', hint: '鼠标左右会倾侧整个星系', note: 'Three.js r134 三维螺旋星系（Bruno Simon / Three.js Journey 那套）。加色混合，约 1.8 万点。', create: createThreeGalaxy },
        { id: 'three-wave', label: 'THREE波动', layer: 'three', hint: '光标是涟漪中心', note: 'Three.js 点阵海。点击感来自距离场正弦。', create: createThreeWave },
        { id: 'work-repel', label: '作品·排斥球', hint: '靠近会把球面点推开，点击球会缩没', note: '对应开头排斥球：球面点 + 圆形斥力 + 弹簧回位。', create: createWorkRepel },
        { id: 'work-wuming', label: '作品·无明', hint: '点从中心长成房屋', note: '对应无明：从一点展开成房屋点云，再轻微呼吸。', create: createWorkWuming },
        { id: 'work-shi', label: '作品·识', hint: '先像实体房屋，再慢慢溶成点', note: '对应识：完整轮廓缓转，然后点化、撕扯、再收回。', create: createWorkShi },
        { id: 'work-dissolve', label: '作品·溶点', hint: '房屋点云会被撕扯，再慢慢收回去', note: '对应名色：溶成点 → 正弦拉扯 → 再贴回房屋轮廓。循环 9 秒。', create: createWorkDissolve },
        { id: 'work-liuru', label: '作品·六入', hint: '点亮六个节点，波会顺着点云走', note: '对应六入：六个顶点，点完一遍才会重新开始。', create: createWorkLiuru },
        { id: 'work-shock', label: '作品·冲击波', hint: '点击，波会顺着点云表面走', note: '对应触：点云上的扩散冲击。', create: createWorkShock },
        { id: 'work-overload', label: '作品·过载', hint: '光标伸进球里，点会发烫抖动', note: '对应受：接触过载，点从房屋紫变成灼热。', create: createWorkOverload },
        { id: 'work-gather', label: '作品·聚球', hint: '房屋会收成球，光标能轻轻拽', note: '对应爱：房屋点云缓缓收成球，再散开。', create: createWorkGather },
        { id: 'work-qu', label: '作品·取', hint: '球会一点点凝固，光标越来越推不动', note: '对应取：Attachment，球面点锁死、变实。', create: createWorkQu },
        { id: 'work-sweep', label: '作品·扫光', hint: '一道亮带扫过房屋点云', note: '对应房屋 shader 的扫光带：点被照亮、略微抬起。', create: createWorkSweep },
        { id: 'work-weave', label: '作品·编织', hint: '两环粒子互相穿过', note: '对应编织：双环点带交错，不用线。', create: createWorkWeave },
        { id: 'work-collapse', label: '作品·坍缩', hint: '房屋收成一点，再按六道颜色喷出', note: '对应有 / 业力坍缩：房屋 → 奇点 → 六道分流。', create: createWorkCollapse },
        { id: 'work-unload', label: '作品·卸下', hint: '点会一片片离开房屋', note: '对应卸下：点云逐渐脱落、淡出，再重新长回。', create: createWorkUnload },
        { id: 'work-ring', label: '作品·环散', hint: '只看就行，环上的点往外散', note: '对应饿鬼：圆环上出发、拖尾消散。', create: createWorkRing },
        { id: 'work-constraint', label: '作品·约束', hint: '光标会拉这团软体', note: '对应地狱：点与点有距离约束，只画点、不画线。', create: createWorkConstraint },
        { id: 'work-swallow', label: '作品·吞噬', hint: '光标是视界，吞够了再点一下会爆', note: '对应鼠标黑洞：吸积、吞噬、质量反馈爆发。', create: createWorkSwallow },
        { id: 'work-spirit', label: '作品·灵体', hint: '光标会在灵体上顶出一个洞', note: '对应人道：体积里流动的点，有机、会让开。', create: createWorkSpirit },
        { id: 'work-tian', label: '作品·天尘', hint: '鼠标左右会让这团尘转', note: '对应天道：四层颜色、不同转速的体积点。', create: createWorkTian },
        { id: 'work-xing', label: '作品·行', hint: '散点会盲目地长成房屋', note: '对应行：Volition. 无序的点被拧成房屋轮廓。', create: createWorkXing },
        { id: 'work-dukha', label: '作品·苦受', hint: '一圈锯齿波从中心撕开点云', note: '对应苦受：系统把接触判成痛，冲击带是灼热的。', create: createWorkDukha },
        { id: 'work-sukha', label: '作品·乐受', hint: '点会轻轻涌向光标', note: '对应乐受：共振被接收为愉悦，点往接触处涨。', create: createWorkSukha },
        { id: 'work-upeksha', label: '作品·舍受', hint: '光标穿过去，点几乎不动', note: '对应舍受：数据穿过，不留痕迹。', create: createWorkUpeksha },
        { id: 'work-asura', label: '作品·修罗', hint: '光标会把这团红尘撑裂', note: '对应修罗：更暴的噪声体，点在互相撕。', create: createWorkAsura },
        { id: 'work-beast', label: '作品·畜生', hint: '密点在转，像停不下来的肉团', note: '对应畜生：超密、拖尾、一直在动。', create: createWorkBeast },
        { id: 'work-touchpoint', label: '作品·触点', hint: '靠近推开，点击整颗球缩成一点', note: '对应触之后的坍缩：球面点收成触点。', create: createWorkTouchpoint },
        { id: 'work-consensus', label: '作品·共识', hint: '六道颜色会短暂合成一闪', note: '对应六道那句协议共识：六色尘合一再分开。', create: createWorkConsensus },
        { id: 'work-flesh', label: '作品·血肉', hint: '光标能把房屋点云拽出黏性', note: '对应名色血肉：点有滞后，被拉处发红。', create: createWorkFlesh },
        { id: 'work-quote', label: '作品·终句', hint: '点会慢慢停住、变暗', note: '对应终句：运动熄灭，房屋还在，已经不像活的。', create: createWorkQuote },
        { id: 'attract', label: '引力汇聚', hint: '所有粒子被吸向光标', note: '万有引力点。和你们聚球很近。', create: createMouseAttract },
        { id: 'meteor', label: '流星雨', hint: '只看就行', note: '拖尾线段粒子。转场、夜空。', create: createMeteor },
        { id: 'orbit', label: '环绕', hint: '粒子绕着光标转', note: '轨道粒子。光标是中心，点在椭圆上转。', create: createOrbit },
        { id: 'spiral', label: '螺线喷发', hint: '从光标旋出粒子', note: '阿基米德螺线发射器。', create: createSpiral },
        { id: 'fireflies', label: '萤火虫', hint: '会慢慢飞向光标', note: '闪烁点 + 微弱引力。夜景、呼吸感。', create: createFireflies },
        { id: 'rain', label: '雨', hint: '鼠标左右会改变风向', note: '下落点 + 落地溅起的小点。', create: createRain },
        { id: 'tornado', label: '龙卷', hint: '柱体会跟着鼠标移', note: '上升螺旋点柱。漩涡的竖直版。', create: createTornado },
        { id: 'tunnel', label: '粒子隧道', hint: '消失点跟着鼠标偏', note: '深度点飞向镜头。超空间，但只用点、不用线。', create: createTunnel },
        { id: 'spring-grid', label: '弹簧点阵', hint: '光标会把点推开，再弹回', note: '网格上的点有弹簧，不画连线。', create: createSpringGrid },
        { id: 'nebula', label: '星云', hint: '光标会搅开这团云', note: '噪声团块粒子。宇宙尘、星云底。', create: createNebula },
        { id: 'ash', label: '灰烬', hint: '靠近会把灰吹上去', note: '缓慢上升的热灰点。焰尾更冷的亲戚。', create: createAsh },
        { id: 'galaxy', label: '螺旋星系', hint: '鼠标靠近会轻微扭曲旋臂', note: '四臂螺旋 + 加色混合。Three.js Journey 星系课的 2D 版，适合宇宙开场。', create: createGalaxy },
        { id: 'ember', label: '焰尾', hint: '挥动鼠标留下火星', note: '粒子寿命 + 上升浮力。游戏技能拖尾、光标火焰一类。', create: createEmber },
        { id: 'ink', label: '烟墨', hint: '慢慢划，墨会卷走', note: '用噪声扰动近似 Pavel Dobryakov 那种 WebGL 流体的观感，不必上完整 Navier-Stokes。', create: createInk },
        { id: 'flow', label: '流场', hint: '只看就行，场在自己流动', note: 'Perlin 风场推粒子。Tyler Hobbs 生成艺术、shadertoy flow field 一路。', create: createFlow },
        { id: 'swarm', label: '蜂群', hint: '光标是蜂王，粒子会追随', note: '简化 boids：靠近 + 对齐。互动 logo、跟随光标很有效。', create: createSwarm },
        { id: 'vortex', label: '漩涡', hint: '漩涡中心跟着鼠标', note: '角动量向内收。和你们「爱 / 取」聚球是同一类力。', create: createVortex },
        { id: 'blackhole', label: '吸积盘', hint: '盘面会跟着鼠标微移', note: '近快远慢的轨道粒子 + 事件视界。和你们宇宙背景最贴。', create: createBlackhole },
    ];

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (current && current.onResize) current.onResize();
    }

    function mount(id, keepTab) {
        var spec = null;
        var i;
        for (i = 0; i < EFFECTS.length; i++) {
            if (EFFECTS[i].id === id) spec = EFFECTS[i];
        }
        if (!spec) spec = EFFECTS[0];
        session += 1;
        try {
            if (current && current.destroy) current.destroy();
        } catch (err) {
            console.warn('[ParticleLab] destroy', err);
        }
        current = null;
        showLayer(spec.layer || 'canvas');
        currentId = spec.id;
        if ((spec.layer || 'canvas') === 'canvas') {
            resize();
            clearBlack();
        }
        try {
            current = spec.create();
        } catch (err) {
            console.warn('[ParticleLab] create', spec.id, err);
            current = { tick: function () { fade(0.2); } };
        }
        pointer.x = W * 0.5;
        pointer.y = H * 0.55;
        pointer.px = pointer.x;
        pointer.py = pointer.y;
        pointer.moved = false;
        noteEl.textContent = spec.note;
        hintEl.textContent = spec.hint;
        if (!keepTab) {
            var buttons = tabsEl.querySelectorAll('button');
            for (i = 0; i < buttons.length; i++) {
                buttons[i].classList.toggle('is-active', buttons[i].dataset.fx === spec.id);
            }
            var url = new URL(window.location.href);
            url.searchParams.set('fx', spec.id);
            history.replaceState(null, '', url);
        }
    }

    function loop(now) {
        var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
        lastT = now;
        try {
            if (current && current.tick) current.tick(dt);
        } catch (err) {
            console.warn('[ParticleLab] tick', currentId, err);
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
        pointer.moved = false;
        rafId = requestAnimationFrame(loop);
    }

    function isHeaderEvent(ev) {
        var t = ev.target;
        return !!(t && t.closest && t.closest('.lab-header'));
    }

    function onPointer(ev) {
        if (isHeaderEvent(ev)) return;
        var src = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
        pointer.x = src.clientX;
        pointer.y = src.clientY;
        pointer.moved = true;
    }

    EFFECTS.forEach(function (spec) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = spec.label;
        btn.dataset.fx = spec.id;
        btn.addEventListener('click', function () { mount(spec.id); });
        tabsEl.appendChild(btn);
    });

    window.addEventListener('pointermove', onPointer);
    window.addEventListener('pointerdown', function (ev) {
        if (isHeaderEvent(ev)) return;
        onPointer(ev);
        pointer.down = true;
        if (current && current.onDown) current.onDown(pointer.x, pointer.y);
    });
    window.addEventListener('pointerup', function () { pointer.down = false; });
    window.addEventListener('resize', resize);

    resize();
    var startId = new URLSearchParams(window.location.search).get('fx') || 'work-repel';
    mount(startId);
    rafId = requestAnimationFrame(loop);
})();
