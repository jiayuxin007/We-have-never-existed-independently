(function () {
    'use strict';

    var DEMOS = [
        { id: 'now', label: '呼吸圆' },
        { id: 'sonar', label: '声呐' },
        { id: 'arc', label: '描边' },
        { id: 'orbit', label: '绕行' },
        { id: 'inbound', label: '汇聚' },
        { id: 'magnetic', label: '磁吸' },
        { id: 'hold', label: '按住' },
        { id: 'lockon', label: '准星' },
        { id: 'lighthouse', label: '灯塔' },
        { id: 'horizon', label: '视界' },
        { id: 'chevron', label: '向心' },
        { id: 'bloom', label: '靠近亮' }
    ];

    function markup(id) {
        if (id === 'now') return '<div class="core"></div>';
        if (id === 'sonar') return '<span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="dot"></span>';
        if (id === 'arc') return '<svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="14"></circle></svg>';
        if (id === 'orbit') return '<span class="core"></span><div class="path"><span class="spark"></span></div>';
        if (id === 'inbound') {
            var html = '';
            for (var i = 0; i < 12; i++) {
                var a = (i / 12) * Math.PI * 2;
                var r = 34 + (i % 3) * 8;
                var x = Math.cos(a) * r;
                var y = Math.sin(a) * r;
                html += '<span class="mote" style="--x:' + x.toFixed(1) + 'px;--y:' + y.toFixed(1) + 'px;animation-delay:' + (i * 0.16) + 's"></span>';
            }
            return html;
        }
        if (id === 'magnetic') return '<div class="field"></div><div class="core"></div>';
        if (id === 'hold') return '<svg viewBox="0 0 46 46"><circle class="track" cx="23" cy="23" r="18"></circle><circle class="fill" cx="23" cy="23" r="18"></circle></svg><div class="core"></div>';
        if (id === 'lockon') return '<div class="box"></div><div class="cross"></div>';
        if (id === 'lighthouse') return '<div class="core"></div>';
        if (id === 'horizon') return '<div class="halo"></div><div class="disk"></div>';
        if (id === 'chevron') return '<span class="arm"></span><span class="arm"></span><span class="arm"></span><span class="arm"></span>';
        if (id === 'bloom') return '<div class="core"></div>';
        return '';
    }

    function fillOverlay(el) {
        var id = el.getAttribute('data-demo');
        el.innerHTML = markup(id);
    }

    function fire(overlay, onDone) {
        overlay.classList.add('is-fired');
        setTimeout(function () {
            overlay.classList.remove('is-fired');
            if (onDone) onDone();
        }, 560);
    }

    function bindMagnetic(stage, overlay) {
        var core = overlay.querySelector('.core');
        if (!core) return;
        stage.addEventListener('mousemove', function (e) {
            var r = stage.getBoundingClientRect();
            var cx = r.left + r.width / 2;
            var cy = r.top + r.height / 2;
            var dx = e.clientX - cx;
            var dy = e.clientY - cy;
            var dist = Math.hypot(dx, dy) || 1;
            var radius = Math.min(r.width, r.height) * 0.38;
            if (dist < radius) {
                var k = (1 - dist / radius) * 14;
                core.style.transform = 'translate(' + (dx / dist * k) + 'px,' + (dy / dist * k) + 'px)';
            } else {
                core.style.transform = '';
            }
        });
        stage.addEventListener('mouseleave', function () {
            core.style.transform = '';
        });
    }

    function bindHold(stage, overlay, onTrigger) {
        var holdTimer = null;
        var holding = false;

        function start(e) {
            e.preventDefault();
            holding = true;
            overlay.classList.add('is-holding');
            holdTimer = setTimeout(function () {
                if (!holding) return;
                overlay.classList.remove('is-holding');
                onTrigger();
            }, 850);
        }
        function cancel() {
            holding = false;
            overlay.classList.remove('is-holding');
            if (holdTimer) clearTimeout(holdTimer);
        }
        stage.addEventListener('pointerdown', start);
        stage.addEventListener('pointerup', cancel);
        stage.addEventListener('pointerleave', cancel);
        stage.addEventListener('pointercancel', cancel);
    }

    function bindNear(stage, overlay, cls) {
        stage.addEventListener('mousemove', function (e) {
            var r = stage.getBoundingClientRect();
            var dx = e.clientX - (r.left + r.width / 2);
            var dy = e.clientY - (r.top + r.height / 2);
            var near = Math.hypot(dx, dy) < Math.min(r.width, r.height) * 0.28;
            overlay.classList.toggle(cls, near);
        });
        stage.addEventListener('mouseleave', function () {
            overlay.classList.remove(cls);
        });
    }

    document.querySelectorAll('.hint-overlay').forEach(fillOverlay);

    document.querySelectorAll('.hint-card .hint-stage').forEach(function (stage) {
        var overlay = stage.querySelector('.hint-overlay');
        var demo = overlay.getAttribute('data-demo');
        if (demo === 'magnetic') bindMagnetic(stage, overlay);
        if (demo === 'lockon' || demo === 'bloom') bindNear(stage, overlay, 'is-near');
        if (demo === 'hold') {
            bindHold(stage, overlay, function () { fire(overlay); });
            return;
        }
        stage.addEventListener('click', function () { fire(overlay); });
    });

    var heroStage = document.getElementById('heroStage');
    var heroOverlay = document.getElementById('heroOverlay');
    var heroStatus = document.getElementById('heroStatus');
    var heroSwitcher = document.getElementById('heroSwitcher');
    var heroCanvas = document.getElementById('heroSphere');
    var currentDemo = 'sonar';
    var collapsing = false;
    var collapseT = 0;

    DEMOS.forEach(function (d) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = d.label;
        if (d.id === currentDemo) btn.className = 'is-active';
        btn.addEventListener('click', function () {
            currentDemo = d.id;
            heroOverlay.setAttribute('data-demo', d.id);
            fillOverlay(heroOverlay);
            attachHeroBehaviors();
            heroSwitcher.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
            btn.classList.add('is-active');
            heroStatus.textContent = d.id === 'hold' ? '按住中心' : '等待点击';
        });
        heroSwitcher.appendChild(btn);
    });

    fillOverlay(heroOverlay);

    var holdTimer = null;
    var holding = false;

    heroStage.addEventListener('mousemove', function (e) {
        var overlay = heroOverlay;
        var demo = currentDemo;
        var r = heroStage.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var dist = Math.hypot(dx, dy) || 1;
        if (demo === 'magnetic') {
            var core = overlay.querySelector('.core');
            if (!core) return;
            var radius = Math.min(r.width, r.height) * 0.38;
            if (dist < radius) {
                var k = (1 - dist / radius) * 18;
                core.style.transform = 'translate(' + (dx / dist * k) + 'px,' + (dy / dist * k) + 'px)';
            } else {
                core.style.transform = '';
            }
        }
        if (demo === 'lockon' || demo === 'bloom') {
            overlay.classList.toggle('is-near', dist < Math.min(r.width, r.height) * 0.28);
        }
    });
    heroStage.addEventListener('mouseleave', function () {
        var core = heroOverlay.querySelector('.core');
        if (core) core.style.transform = '';
        heroOverlay.classList.remove('is-near', 'is-holding');
        holding = false;
        if (holdTimer) clearTimeout(holdTimer);
    });
    heroStage.addEventListener('pointerdown', function (e) {
        if (currentDemo !== 'hold') return;
        e.preventDefault();
        holding = true;
        heroOverlay.classList.add('is-holding');
        holdTimer = setTimeout(function () {
            if (!holding) return;
            heroOverlay.classList.remove('is-holding');
            triggerHero();
        }, 850);
    });
    function cancelHeroHold() {
        holding = false;
        heroOverlay.classList.remove('is-holding');
        if (holdTimer) clearTimeout(holdTimer);
    }
    heroStage.addEventListener('pointerup', cancelHeroHold);
    heroStage.addEventListener('pointercancel', cancelHeroHold);

    function attachHeroBehaviors() {
        heroOverlay.classList.remove('is-near', 'is-holding', 'is-fired');
        var core = heroOverlay.querySelector('.core');
        if (core) core.style.transform = '';
    }
    attachHeroBehaviors();

    function triggerHero() {
        if (collapsing) return;
        collapsing = true;
        collapseT = 0;
        heroStage.classList.add('is-fired');
        fire(heroOverlay);
        heroStatus.textContent = '已触发 · 球体收缩';
        setTimeout(function () {
            collapsing = false;
            heroStage.classList.remove('is-fired');
            heroStatus.textContent = currentDemo === 'hold' ? '按住中心' : '等待点击';
        }, 900);
    }

    heroStage.addEventListener('click', function () {
        if (currentDemo === 'hold') return;
        triggerHero();
    });

    var dots = [];
    function resizeHero() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = heroCanvas.clientWidth;
        var h = heroCanvas.clientHeight;
        heroCanvas.width = w * dpr;
        heroCanvas.height = h * dpr;
        var ctx = heroCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dots = [];
        var n = 420;
        for (var i = 0; i < n; i++) {
            var u = Math.random();
            var v = Math.random();
            var theta = u * Math.PI * 2;
            var phi = Math.acos(2 * v - 1);
            dots.push({ theta: theta, phi: phi, tw: Math.random() });
        }
    }

    var t0 = performance.now();
    function drawHero(now) {
        var ctx = heroCanvas.getContext('2d');
        var w = heroCanvas.clientWidth;
        var h = heroCanvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        var cx = w / 2;
        var cy = h / 2;
        var radius = Math.min(w, h) * 0.22;
        var rot = (now - t0) / 1000 * 0.22;
        if (collapsing) {
            collapseT = Math.min(1, collapseT + 0.045);
            radius *= 1 - collapseT * 0.92;
        }
        for (var i = 0; i < dots.length; i++) {
            var d = dots[i];
            var x = Math.sin(d.phi) * Math.cos(d.theta + rot);
            var y = Math.cos(d.phi);
            var z = Math.sin(d.phi) * Math.sin(d.theta + rot);
            var a = 0.18 + (z + 1) * 0.28;
            ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
            ctx.fillRect(cx + x * radius, cy + y * radius, 1.2, 1.2);
        }
        requestAnimationFrame(drawHero);
    }

    window.addEventListener('resize', resizeHero);
    resizeHero();
    requestAnimationFrame(drawHero);
})();
