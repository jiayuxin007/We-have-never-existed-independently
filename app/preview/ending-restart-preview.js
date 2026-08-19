(function () {
    'use strict';

    var VARIANTS = [
        {
            id: 'ghost',
            label: '幽灵线',
            hint: 'Begin again，悬停才长出下划线',
            note: '网上：Awwwards ghost typography、Codrops button hover、诗站 / 电影片尾 CTA。最贴终句：它不像按钮，像下一句。',
            copy: 'Begin again',
        },
        {
            id: 'pixel',
            label: '像素框',
            hint: '和右上面板同一套 Pixelate',
            note: '网上：像素 HUD、复古终端按钮。和你们数据面板是同一字体，系统感，不抢 NITEMARE 终句。',
            copy: 'Restart',
        },
        {
            id: 'brackets',
            label: '四角框',
            hint: '业力条同款角标',
            note: '网上：科幻 HUD lock frame。你们 karma 条已经在用四角，结束时再出现一次，像协议还在。',
            copy: 'Resume',
        },
        {
            id: 'hold',
            label: '按住',
            hint: '按住圆环填满才重开',
            note: '网上：Nintendo Switch、Apple TV、Instagram 长按。适合「进入下一轮」，减少误点。',
            copy: '',
        },
        {
            id: 'scan',
            label: '扫光',
            hint: '一道光带慢慢刮过字',
            note: '网上：全息按钮 / scanline CTA。对应房屋 shader 的扫光带。',
            copy: 'Begin again',
        },
        {
            id: 'magnetic',
            label: '磁吸',
            hint: '字会轻轻跟着光标',
            note: '网上：Codrops Magnetic Buttons、机构站 GSAP magnetic。身体感强，仍是一行字。',
            copy: 'Begin again',
        },
        {
            id: 'dust',
            label: '尘点',
            hint: '字周围有细尘在游',
            note: '网上：Codrops Particle Effects for Buttons。对应终句里的 particles of dust。',
            copy: 'Begin again',
        },
        {
            id: 'orbit',
            label: '绕行',
            hint: '一颗紫点绕着字转',
            note: '网上：太空主题站轨道 CTA、Apple Event 开场微粒。宇宙，但不做成大按钮。',
            copy: 'Begin again',
        },
        {
            id: 'spread',
            label: '字距',
            hint: '悬停时字母慢慢拉开',
            note: '网上：电影字幕 / 片尾字距动画。安静，和 NITEMARE 很配。',
            copy: 'Begin again',
        },
        {
            id: 'protocol',
            label: '协议行',
            hint: '像一行还没打完的命令',
            note: '网上：终端 resume、黑客电影 CLI。对应六道那句协议共识。',
            copy: 'resume protocol',
        },
        {
            id: 'bilingual',
            label: '双语',
            hint: '英文 + 再一次',
            note: '网上：博物馆双语标注。对应金刚经中英并置。',
            copy: 'Begin again',
        },
        {
            id: 'horizon',
            label: '视界',
            hint: '一个可进入的暗环',
            note: '网上：黑洞可视化、你们点击引导里的事件视界。不是字，是洞。',
            copy: '',
        },
        {
            id: 'press',
            label: '闪字',
            hint: 'Press to continue 在呼吸',
            note: '网上：DVD 菜单闪字 + 全息扫光。两行都是终句同一套 NITEMARE。点击后整段终句按刚打开时再播一遍。',
            copy: 'Begin again',
        },
        {
            id: 'dissolve',
            label: '溶字',
            hint: '悬停时字母自己散开',
            note: '网上：文字溶点 / kinetic type。对应名色溶成点。',
            copy: 'Begin again',
        },
        {
            id: 'capsule',
            label: '细胶囊',
            hint: '细描边、圆角很小的系统钮',
            note: '网上：博物馆展陈 kiosk、Apple TV 轻按钮。比方框软一点，仍很克制。',
            copy: 'Restart',
        },
        {
            id: 'tick',
            label: '图例点',
            hint: '紫色色块 + 标签，像面板图例',
            note: '网上：图例当按钮。和六道饼图图例同一语言，像选中下一次循环。',
            copy: 'Again',
        },
    ];

    var tabsEl = document.getElementById('endingTabs');
    var noteEl = document.getElementById('endingNote');
    var ctaEl = document.getElementById('endingCta');
    var quoteEl = document.getElementById('endingQuote');
    var statusEl = document.getElementById('endingStatus');
    var stageEl = document.getElementById('finalQuoteStage');
    var currentId = 'press';
    var dustRaf = 0;
    var holdTimer = 0;
    var holdAmt = 0;
    var statusTimer = 0;
    var openTimer = 0;

    function variantById(id) {
        var i;
        for (i = 0; i < VARIANTS.length; i++) {
            if (VARIANTS[i].id === id) return VARIANTS[i];
        }
        return VARIANTS[0];
    }

    function playOpening() {
        if (openTimer) {
            clearTimeout(openTimer);
            openTimer = 0;
        }
        if (statusTimer) {
            clearTimeout(statusTimer);
            statusTimer = 0;
        }
        statusEl.hidden = true;
        ctaEl.classList.remove('is-shown');
        quoteEl.classList.remove('quote-reenter');
        stageEl.classList.remove('visible');
        void stageEl.offsetWidth;
        stageEl.classList.add('visible');
        openTimer = setTimeout(function () {
            ctaEl.classList.add('is-shown');
        }, 1100);
    }

    function stopDust() {
        if (dustRaf) {
            cancelAnimationFrame(dustRaf);
            dustRaf = 0;
        }
    }

    function startDust(canvas) {
        stopDust();
        var ctx = canvas.getContext('2d');
        var w = 0;
        var h = 0;
        var pts = [];
        var i;
        function resize() {
            var r = canvas.getBoundingClientRect();
            w = Math.max(2, Math.floor(r.width));
            h = Math.max(2, Math.floor(r.height));
            canvas.width = w;
            canvas.height = h;
            pts = [];
            for (i = 0; i < 48; i++) {
                pts.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.12,
                });
            }
        }
        resize();
        function tick() {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(139,92,246,0.55)';
            for (i = 0; i < pts.length; i++) {
                var p = pts[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
                ctx.fillRect(p.x, p.y, 1.4, 1.4);
            }
            dustRaf = requestAnimationFrame(tick);
        }
        tick();
    }

    function splitLetters(text) {
        return text.split('').map(function (ch) {
            if (ch === ' ') return '<span class="ch">&nbsp;</span>';
            var dx = ((Math.random() * 10) - 5).toFixed(1) + 'px';
            var dy = ((Math.random() * 14) - 7).toFixed(1) + 'px';
            return '<span class="ch" style="--dx:' + dx + ';--dy:' + dy + '">' + ch + '</span>';
        }).join('');
    }

    function innerHtml(v) {
        if (v.id === 'brackets') {
            return '<span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>' + v.copy;
        }
        if (v.id === 'hold') {
            return '<svg viewBox="0 0 72 72" aria-hidden="true"><circle class="track" cx="36" cy="36" r="30"></circle><circle class="fill" cx="36" cy="36" r="30"></circle></svg><span class="hold-dot"></span>';
        }
        if (v.id === 'dust') {
            return '<canvas></canvas><span>' + v.copy + '</span>';
        }
        if (v.id === 'orbit') {
            return '<span class="mote"></span>' + v.copy;
        }
        if (v.id === 'protocol') {
            return '<span class="prompt">&gt;</span>' + v.copy + '<span class="caret"></span>';
        }
        if (v.id === 'bilingual') {
            return '<span class="en">' + v.copy + '</span><span class="cn">再一次</span>';
        }
        if (v.id === 'horizon') {
            return '';
        }
        if (v.id === 'press') {
            return '<span class="again"><span class="scan" aria-hidden="true"></span>' + v.copy + '</span>';
        }
        if (v.id === 'dissolve') {
            return splitLetters(v.copy);
        }
        if (v.id === 'tick') {
            return '<span class="swatch"></span>' + v.copy;
        }
        return v.copy;
    }

    function bindHold(btn) {
        var fill = btn.querySelector('circle.fill');
        holdAmt = 0;
        function setFill() {
            if (fill) fill.style.strokeDashoffset = String(188 * (1 - holdAmt));
        }
        function stopHold() {
            if (holdTimer) {
                clearInterval(holdTimer);
                holdTimer = 0;
            }
            holdAmt = 0;
            setFill();
        }
        btn.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            stopHold();
            holdTimer = setInterval(function () {
                holdAmt += 0.035;
                if (holdAmt >= 1) {
                    holdAmt = 1;
                    setFill();
                    stopHold();
                    playOpening();
                    btn.classList.add('is-fired');
                    setTimeout(function () { btn.classList.remove('is-fired'); }, 700);
                } else {
                    setFill();
                }
            }, 16);
        });
        btn.addEventListener('pointerup', stopHold);
        btn.addEventListener('pointerleave', stopHold);
        btn.addEventListener('pointercancel', stopHold);
    }

    function bindMagnetic(btn) {
        btn.addEventListener('pointermove', function (e) {
            var r = btn.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5;
            var y = (e.clientY - r.top) / r.height - 0.5;
            btn.style.transform = 'translate(' + (x * 14) + 'px,' + (y * 10) + 'px)';
        });
        btn.addEventListener('pointerleave', function () {
            btn.style.transform = 'translate(0,0)';
        });
    }

    function renderCta(id) {
        var v = variantById(id);
        currentId = v.id;
        stopDust();
        if (holdTimer) {
            clearInterval(holdTimer);
            holdTimer = 0;
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'restart-btn restart-btn--' + v.id;
        btn.setAttribute('aria-label', v.copy || v.label);
        btn.innerHTML = innerHtml(v);
        ctaEl.innerHTML = '';
        if (v.id === 'press') {
            var label = document.createElement('p');
            label.className = 'press-label';
            label.textContent = 'Press to continue';
            ctaEl.appendChild(label);
        }
        ctaEl.appendChild(btn);
        noteEl.textContent = v.note;

        var tabs = tabsEl.querySelectorAll('button');
        var i;
        for (i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('is-active', tabs[i].getAttribute('data-id') === v.id);
        }

        if (v.id === 'dust') {
            var canvas = btn.querySelector('canvas');
            if (canvas) startDust(canvas);
        }
        if (v.id === 'hold') {
            bindHold(btn);
            return;
        }
        if (v.id === 'magnetic') bindMagnetic(btn);

        btn.addEventListener('click', function () {
            playOpening();
        });
    }

    function renderTabs() {
        VARIANTS.forEach(function (v) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('data-id', v.id);
            b.textContent = v.label;
            b.addEventListener('click', function () {
                renderCta(v.id);
            });
            tabsEl.appendChild(b);
        });
    }

    renderTabs();
    renderCta(currentId);
    playOpening();
})();
