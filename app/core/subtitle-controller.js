(function (global) {
    'use strict';

    var cfg = function () { return global.TIMING_CONFIG || {}; };

    var rootEl = null;
    var timers = [];
    var fadeTimer = null;

    function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
        if (fadeTimer) {
            clearTimeout(fadeTimer);
            fadeTimer = null;
        }
    }

    function init(el) {
        rootEl = el;
    }

    function hide() {
        clearTimers();
        if (rootEl) {
            rootEl.classList.remove('active');
            rootEl.textContent = '';
        }
    }

    /** 与 MyProject #modelSubtitle：切换前先淡出，800ms 后换字并 .active 淡入 */
    function showLine(text, options) {
        options = options || {};
        if (!rootEl) return;
        if (fadeTimer) {
            clearTimeout(fadeTimer);
            fadeTimer = null;
        }
        rootEl.classList.remove('active');

        if (!text) {
            rootEl.textContent = '';
            return;
        }

        var delay = options.fadeDelayMs != null
            ? options.fadeDelayMs
            : (cfg().subtitleFadeDelayMs || 800);
        fadeTimer = setTimeout(function () {
            rootEl.textContent = text;
            rootEl.classList.add('active');
            fadeTimer = null;
        }, delay);
    }

    function play(subtitles) {
        hide();
        if (!subtitles || !subtitles.length) return;

        subtitles.forEach(function (line) {
            var t = setTimeout(function () {
                showLine(line.text, line);
            }, line.atMs || 0);
            timers.push(t);
        });
    }

    global.SubtitleController = {
        init: init,
        hide: hide,
        showLine: showLine,
        play: play,
    };
})(typeof window !== 'undefined' ? window : this);
