(function (global) {
    'use strict';

    var audioEl = null;
    var started = false;

    function init(el) {
        audioEl = el;
        if (!audioEl) return;
        var src = global.ASSETS_CONFIG && global.ASSETS_CONFIG.bgm;
        if (src && !audioEl.getAttribute('src') && !audioEl.querySelector('source')) {
            var source = document.createElement('source');
            source.src = src;
            source.type = 'audio/mpeg';
            audioEl.appendChild(source);
        }
        audioEl.loop = true;
        audioEl.preload = 'auto';
        audioEl.playsInline = true;
        try { audioEl.load(); } catch (e) {}
    }

    function startLoop() {
        if (!audioEl || started) return;
        started = true;
        audioEl.loop = true;
        audioEl.muted = false;
        audioEl.volume = 0.7;
        var play = audioEl.play();
        if (play && typeof play.catch === 'function') {
            play.catch(function (err) {
                started = false;
                console.warn('[Bgm] play failed — put a legally obtained Mars.mp3 at assets/audio/mars.mp3', err);
            });
        }
    }

    global.BgmController = {
        init: init,
        startLoop: startLoop,
    };
})(typeof window !== 'undefined' ? window : this);
