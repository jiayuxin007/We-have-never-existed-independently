(function () {
    'use strict';

    var DURATION = 8;
    var playing = true;
    var elapsed = 0;
    var lastTs = 0;
    var dockedId = 'current';

    var DOCK_HTML = {
        current: '<div class="bar-current"><div class="bar-current-fill"></div></div>',
        'panel-row': '<div class="bar-panel-track"><div class="bar-panel-fill"></div><i class="bar-panel-dot"></i></div>',
        heat: '<div class="bar-heat"><div class="bar-heat-fill"></div></div>',
        eq: '<div class="bar-eq" data-live-eq></div>',
        hollow: '<div class="bar-hollow"><div class="bar-hollow-fill"></div></div>',
        glass: '<div class="bar-glass"><div class="bar-glass-fill"></div></div>',
        whisper: '<div class="bar-whisper"><div class="bar-whisper-fill"></div></div>',
        hud: '<div class="bar-hud"><span class="bar-hud-c tl"></span><span class="bar-hud-c tr"></span><span class="bar-hud-c bl"></span><span class="bar-hud-c br"></span><div class="bar-hud-fill"></div></div>',
        scan: '<div class="bar-scan"><div class="bar-scan-fill"></div></div>',
        pixel: '<div class="bar-pixel" data-live-pixel></div>',
        steps: '<div class="bar-steps"><div class="bar-steps-line"><div></div></div><div class="bar-steps-nodes" data-live-steps></div></div>',
        shuttle: '<div class="bar-shuttle"><div class="bar-shuttle-fill"></div><i class="bar-shuttle-blob"></i></div>',
        cyber: '<div class="bar-cyber"><div class="bar-cyber-fill"></div></div>',
        chip: '<div class="bar-chip"><div class="bar-chip-track"><div class="bar-chip-fill"></div></div><i class="bar-chip-pill" data-pct></i></div>',
        pulse: '<div class="bar-pulse"><div class="bar-pulse-fill"></div></div>',
        liquid: '<div class="bar-liquid"><div class="bar-liquid-fill"></div></div>',
        dots: '<div class="bar-dots" data-live-dots></div>',
        gel: '<div class="bar-gel"><div class="bar-gel-fill"></div></div>',
        ruler: '<div class="bar-ruler"><div class="bar-ruler-fill"></div></div>',
        terminal: '<div class="bar-term" data-live-term></div>',
    };

    function fillTicks(root, selector, count) {
        var nodes = root.querySelectorAll(selector);
        var i;
        for (i = 0; i < nodes.length; i++) {
            if (nodes[i].childElementCount) continue;
            var html = '';
            var n;
            for (n = 0; n < count; n++) html += '<i></i>';
            nodes[i].innerHTML = html;
        }
    }

    function setTicks(root, selector, onCount) {
        var groups = root.querySelectorAll(selector);
        var g;
        for (g = 0; g < groups.length; g++) {
            var ticks = groups[g].children;
            var i;
            for (i = 0; i < ticks.length; i++) {
                ticks[i].classList.toggle('is-on', i < onCount);
            }
        }
    }

    function setProgress(p) {
        document.documentElement.style.setProperty('--p', String(p));
        var pct = Math.round(p * 100) + '%';
        var labels = document.querySelectorAll('[data-pct]');
        var i;
        for (i = 0; i < labels.length; i++) labels[i].textContent = pct;
        var clock = document.getElementById('pbClockPct');
        if (clock) clock.textContent = pct;
        var scrub = document.getElementById('pbScrub');
        if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round(p * 1000));

        setTicks(document, '.bar-eq', Math.round(p * 18));
        setTicks(document, '.bar-pixel', Math.round(p * 24));
        setTicks(document, '.bar-dots', Math.round(p * 20));
        setTicks(document, '.bar-steps-nodes', Math.round(p * 5));
        setTerminal(document, p);
    }

    function setTerminal(root, p) {
        var nodes = root.querySelectorAll('.bar-term, [data-live-term]');
        var total = 24;
        var on = Math.round(p * total);
        var i;
        var line = '[';
        for (i = 0; i < total; i++) {
            line += i < on - 1 ? '=' : (i === on - 1 ? '>' : '·');
        }
        line += ']';
        for (i = 0; i < nodes.length; i++) nodes[i].textContent = line;
    }

    function dock(id) {
        dockedId = id;
        var stage = document.getElementById('pbDockStage');
        var slot = document.getElementById('pbDockSlot');
        if (!stage || !slot) return;
        stage.setAttribute('data-style', id);
        slot.innerHTML = DOCK_HTML[id] || DOCK_HTML.current;
        fillTicks(slot, '[data-live-eq]', 18);
        fillTicks(slot, '[data-live-pixel]', 24);
        fillTicks(slot, '[data-live-dots]', 20);
        fillTicks(slot, '[data-live-steps]', 5);
        var buttons = document.querySelectorAll('.pb-dock');
        var i;
        for (i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('is-active', buttons[i].getAttribute('data-dock') === id);
        }
        setProgress(elapsed / DURATION);
    }

    function tick(ts) {
        if (!lastTs) lastTs = ts;
        var dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        if (playing) {
            elapsed += dt;
            if (elapsed >= DURATION) elapsed -= DURATION;
            setProgress(elapsed / DURATION);
        }
        requestAnimationFrame(tick);
    }

    fillTicks(document, '#barEq', 18);
    fillTicks(document, '#barPixel', 24);
    fillTicks(document, '#barDots', 20);
    fillTicks(document, '#barSteps .bar-steps-nodes', 5);

    var filters = document.querySelectorAll('.pb-filters [data-filter]');
    var f;
    for (f = 0; f < filters.length; f++) {
        filters[f].addEventListener('click', function () {
            var key = this.getAttribute('data-filter');
            var i;
            for (i = 0; i < filters.length; i++) filters[i].classList.toggle('is-active', filters[i] === this);
            var cards = document.querySelectorAll('.pb-card');
            for (i = 0; i < cards.length; i++) {
                var cat = cards[i].getAttribute('data-cat') || '';
                cards[i].classList.toggle('is-hidden', key !== 'all' && cat.indexOf(key) === -1);
            }
        });
    }

    var docks = document.querySelectorAll('.pb-dock');
    for (f = 0; f < docks.length; f++) {
        docks[f].addEventListener('click', function () {
            dock(this.getAttribute('data-dock'));
        });
    }

    var toggle = document.getElementById('pbToggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            playing = !playing;
            toggle.textContent = playing ? '暂停' : '播放';
        });
    }

    var scrub = document.getElementById('pbScrub');
    if (scrub) {
        scrub.addEventListener('input', function () {
            playing = false;
            if (toggle) toggle.textContent = '播放';
            elapsed = (Number(scrub.value) / 1000) * DURATION;
            setProgress(elapsed / DURATION);
        });
    }

    dock('current');
    requestAnimationFrame(tick);
}());
