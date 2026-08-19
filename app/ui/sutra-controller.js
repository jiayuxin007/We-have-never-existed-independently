(function (global) {
    'use strict';

    var T = global.TIMING_CONFIG || {};
    var REVEAL_DURATION_S = T.sutraRevealDurationS || 8;
    var REVEAL_TAIL_MS = T.sutraRevealTailMs || 150;
    var PAUSE_AFTER_MS = T.sutraPauseAfterMs || 5000;

    var FONT_WAIT_MS = 8000;
    var CN_FONT_SAMPLE = '过去心不可得现在心不可得未来心不可得——金刚经';
    var fontPromise = null;

    var stageEl = null;
    var autoTimer = null;
    var resolveEnter = null;
    var clickHandler = null;

    function loadCnFont() {
        if (!global.document || !global.document.fonts || !global.document.fonts.load) {
            return Promise.resolve();
        }
        return global.document.fonts.load('16px FZCAOYTJW', CN_FONT_SAMPLE).then(function () {
            return global.document.fonts.ready;
        });
    }

    function waitForCnFont() {
        if (!fontPromise) fontPromise = loadCnFont();
        return new Promise(function (resolve) {
            var settled = false;
            var timer = setTimeout(function () {
                if (settled) return;
                settled = true;
                resolve();
            }, FONT_WAIT_MS);
            fontPromise.then(function () {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
            }, function () {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
            });
        });
    }

    function init(el) {
        stageEl = el;
    }

    function preloadFont() {
        waitForCnFont();
    }

    function fillLineParallel(el, text, delaySec) {
        el.textContent = '';
        for (var i = 0; i < text.length; i++) {
            var span = document.createElement('span');
            span.className = 'sutra-char';
            span.style.animationDelay = delaySec(i) + 's';
            span.textContent = text[i];
            el.appendChild(span);
        }
    }

    function runReveal() {
        if (!stageEl) return;
        var cnEls = stageEl.querySelectorAll('.sutra-quote-cn-block .sutra-reveal-line');
        var enEls = stageEl.querySelectorAll('.sutra-quote-en-block .sutra-reveal-line');
        if (!cnEls.length || !enEls.length) return;

        var cnParts = Array.prototype.map.call(cnEls, function (el) { return el.textContent; });
        var enParts = Array.prototype.map.call(enEls, function (el) { return el.textContent; });
        var cnStr = cnParts.join('');
        var enStr = enParts.join('');
        var cnLen = Math.max(cnStr.length, 1);
        var enLen = Math.max(enStr.length, 1);
        var D = REVEAL_DURATION_S;

        var cnOffset = 0;
        cnParts.forEach(function (t, idx) {
            var off = cnOffset;
            fillLineParallel(cnEls[idx], t, function (i) {
                return ((off + i) / cnLen) * D;
            });
            cnOffset += t.length;
        });

        var enOffset = 0;
        enParts.forEach(function (t, idx) {
            var off = enOffset;
            fillLineParallel(enEls[idx], t, function (i) {
                return ((off + i) / enLen) * D;
            });
            enOffset += t.length;
        });
    }

    function cleanupEnterListeners() {
        if (autoTimer) {
            clearTimeout(autoTimer);
            autoTimer = null;
        }
        if (clickHandler && stageEl) {
            stageEl.removeEventListener('click', clickHandler);
            clickHandler = null;
        }
    }

    function finishEnter() {
        cleanupEnterListeners();
        if (global.AppEventBus) {
            global.AppEventBus.emit('sutra:complete');
        }
        if (resolveEnter) {
            var done = resolveEnter;
            resolveEnter = null;
            done();
        }
    }

    function onStageClick(e) {
        if (typeof e.button === 'number' && e.button !== 0) return;
        finishEnter();
    }

    function enter() {
        return waitForCnFont().then(function () {
            if (stageEl) {
                stageEl.hidden = false;
                stageEl.classList.remove('hidden');
                stageEl.classList.add('is-cn-font-ready');
            }
            runReveal();
            var totalMs = Math.ceil(REVEAL_DURATION_S * 1000) + REVEAL_TAIL_MS + PAUSE_AFTER_MS;
            return new Promise(function (resolve) {
                resolveEnter = resolve;
                autoTimer = setTimeout(finishEnter, totalMs);
                clickHandler = onStageClick;
                if (stageEl) {
                    stageEl.addEventListener('click', clickHandler);
                }
            });
        });
    }

    function exit() {
        cleanupEnterListeners();
        resolveEnter = null;
        if (stageEl) {
            stageEl.classList.remove('is-cn-font-ready');
            stageEl.classList.add('hidden');
            stageEl.hidden = true;
        }
    }

    global.SutraController = {
        init: init,
        preloadFont: preloadFont,
        enter: enter,
        exit: exit,
    };
})(typeof window !== 'undefined' ? window : this);
