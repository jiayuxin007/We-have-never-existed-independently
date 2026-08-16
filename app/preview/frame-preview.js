(function (global) {
    'use strict';

    var Pie = global.KarmaPieChart;
    var Panel = global.KarmaDataPanel;

    var borderHost = null;
    var frameScaleInput = document.getElementById('frameScale');
    var frameScaleOut = document.getElementById('frameScaleOut');
    var frameVisibleInput = document.getElementById('frameVisible');
    var tick = 0;
    var timer = null;

    var SAMPLE_LIVE = {
        tian: 0.08,
        ren: 0.34,
        xiuluo: 0.18,
        chusheng: 0.12,
        egui: 0.14,
        diyu: 0.14,
    };

    function jitterRatios(base) {
        var out = {};
        var sum = 0;
        Pie.PATH_ORDER.forEach(function (id) {
            var v = Math.max(0.02, (base[id] || 0) + (Math.random() - 0.5) * 0.06);
            out[id] = v;
            sum += v;
        });
        Pie.PATH_ORDER.forEach(function (id) {
            out[id] /= sum;
        });
        return out;
    }

    function paintPanel(payload) {
        if (!Panel || !Panel.showDemo) return;
        Panel.showDemo({
            ratios: payload.ratios,
            highlightId: payload.highlightId || null,
            centerPrimary: payload.centerPrimary,
            centerSecondary: payload.centerSecondary,
            pathId: payload.pathId || 'ren',
            metrics: payload.metrics || {
                Vol: 0.42,
                Turn: 0.18,
                Stab: 0.61,
            },
            raw: payload.raw || {
                MC: 1280000000,
                priceChange24h: 0.032,
            },
        });
    }

    function tickLive() {
        tick += 1;
        var sec = 40 + tick * 3;
        paintPanel({
            ratios: jitterRatios(SAMPLE_LIVE),
            centerPrimary: sec + 's',
            centerSecondary: 'live',
            pathId: Pie.PATH_ORDER[tick % Pie.PATH_ORDER.length],
        });
    }

    function applyFrameScale() {
        var frameScale = Number(frameScaleInput.value) / 100;
        if (borderHost) {
            borderHost.style.setProperty('--frame-preview-scale', String(frameScale));
        }
        if (frameScaleOut) frameScaleOut.textContent = frameScaleInput.value + '%';
    }

    function applyFrameVisibility() {
        if (!borderHost) return;
        borderHost.classList.toggle('is-frame-hidden', !frameVisibleInput.checked);
    }

    Panel.init({ showImmediately: true });
    borderHost = document.querySelector('.data-panel-border-host');
    applyFrameScale();
    applyFrameVisibility();
    tickLive();
    timer = setInterval(tickLive, 1800);

    frameScaleInput.addEventListener('input', applyFrameScale);
    frameVisibleInput.addEventListener('change', applyFrameVisibility);

    global.addEventListener('beforeunload', function () {
        if (timer) clearInterval(timer);
    });
})(window);
