(function (global) {
    'use strict';

    var audioEl = null;
    var started = false;

    function applySrc() {
        if (!audioEl) return;
        var src = global.ASSETS_CONFIG && global.ASSETS_CONFIG.bgm;
        if (!src) return;
        var current = audioEl.getAttribute('src');
        var sourceEl = audioEl.querySelector('source');
        if (sourceEl) current = sourceEl.getAttribute('src') || current;
        if (current === src) return;
        if (sourceEl) {
            sourceEl.src = src;
        } else {
            audioEl.src = src;
        }
        audioEl.load();
    }

    function init(el) {
        audioEl = el;
        if (!audioEl) return;
        applySrc();
        audioEl.loop = true;
        audioEl.preload = 'metadata';
        audioEl.playsInline = true;
        audioEl.autoplay = false;
        audioEl.muted = false;
        audioEl.volume = 0.35;
    }

    function startLoop() {
        if (!audioEl) return;
        applySrc();
        audioEl.loop = true;
        audioEl.muted = false;
        audioEl.volume = 0.35;
        audioEl.preload = 'auto';
        if (started && !audioEl.paused) return;
        started = true;
        var play = audioEl.play();
        if (play && typeof play.catch === 'function') {
            play.catch(function (err) {
                started = false;
                console.warn('[Bgm] play failed', err);
            });
        }
    }

    function stop() {
        started = false;
        if (!audioEl) return;
        audioEl.pause();
        try {
            audioEl.currentTime = 0;
        } catch (e) { /* ignore */ }
    }

    global.BgmController = {
        init: init,
        startLoop: startLoop,
        stop: stop,
    };
})(typeof window !== 'undefined' ? window : this);
