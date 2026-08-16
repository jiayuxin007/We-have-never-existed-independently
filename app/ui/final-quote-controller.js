(function (global) {
    'use strict';

    var DELAY_MS = 2000;
    var stageEl = null;
    var showTimer = null;

    function init(el) {
        stageEl = el;
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
            }, delay);
        });
    }

    function exit() {
        if (showTimer) {
            clearTimeout(showTimer);
            showTimer = null;
        }
        if (stageEl) {
            stageEl.classList.remove('visible');
            stageEl.hidden = true;
        }
    }

    global.FinalQuoteController = {
        init: init,
        enter: enter,
        exit: exit,
    };
})(typeof window !== 'undefined' ? window : this);
