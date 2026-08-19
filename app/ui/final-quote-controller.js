(function (global) {
    'use strict';

    var DELAY_MS = 2000;
    var CTA_DELAY_MS = 1100;
    var stageEl = null;
    var ctaEl = null;
    var restartBtn = null;
    var showTimer = null;
    var ctaTimer = null;

    function init(el) {
        stageEl = el;
        ctaEl = el ? el.querySelector('#finalQuoteCta') : null;
        restartBtn = el ? el.querySelector('#finalRestartBtn') : null;
        if (restartBtn && !restartBtn._wired) {
            restartBtn._wired = true;
            restartBtn.addEventListener('click', restartExperience);
        }
    }

    function restartExperience() {
        if (global.BgmController && global.BgmController.stop) {
            global.BgmController.stop();
        }
        global.location.href = global.location.pathname;
    }

    function enter() {
        exit();
        return new Promise(function () {
            var delay = (global.TIMING_CONFIG && global.TIMING_CONFIG.finalQuoteDelayMs) || DELAY_MS;
            showTimer = setTimeout(function () {
                showTimer = null;
                if (!stageEl) return;
                stageEl.hidden = false;
                stageEl.classList.add('visible');
                ctaTimer = setTimeout(function () {
                    ctaTimer = null;
                    if (ctaEl) ctaEl.classList.add('is-shown');
                }, CTA_DELAY_MS);
            }, delay);
        });
    }

    function exit() {
        if (showTimer) {
            clearTimeout(showTimer);
            showTimer = null;
        }
        if (ctaTimer) {
            clearTimeout(ctaTimer);
            ctaTimer = null;
        }
        if (ctaEl) ctaEl.classList.remove('is-shown');
        if (stageEl) {
            stageEl.classList.remove('visible');
            stageEl.hidden = true;
        }
    }

    global.FinalQuoteController = {
        init: init,
        enter: enter,
        exit: exit,
        restart: restartExperience,
    };
})(typeof window !== 'undefined' ? window : this);
