(function (global) {
    'use strict';

    var T = global.TIMING_CONFIG || {};
    var INTRO_TEXT = 'We have never existed independently.';
    var REVEAL_DELAY_MS = T.introRevealDelayMs || 1000;
    var REVEAL_DURATION_S = T.introRevealDurationS || 2.5;
    var SNOWFLAKE_DELAY_MS = T.introSnowflakeDelayMs || 2000;
    var CLICK_LOCK_MS = T.introClickLockMs || 2000;

    var screenEl = null;
    var lineEl = null;
    var overlayEl = null;
    var snowflake = null;
    var clickResolver = null;
    var clickArmed = false;
    var crosshair = null;
    var onCompleteCb = null;
    var lockTimer = 0;
    var snowflakeTimer = 0;

    function init(screen, line, overlay) {
        screenEl = screen;
        lineEl = line;
        overlayEl = overlay;
    }

    function setCrosshair(c) {
        crosshair = c;
    }

    function setOnComplete(fn) {
        onCompleteCb = fn;
    }

    function runReveal() {
        if (!lineEl) return;
        lineEl.textContent = '';
        for (var i = 0; i < INTRO_TEXT.length; i++) {
            var span = document.createElement('span');
            span.className = 'intro-char';
            span.style.animationDelay = (i / INTRO_TEXT.length) * REVEAL_DURATION_S + 's';
            span.textContent = INTRO_TEXT[i];
            lineEl.appendChild(span);
        }
    }

    function startSnowflake() {
        if (snowflake) return;
        if (overlayEl) overlayEl.hidden = false;
        if (typeof SnowflakeCursor !== 'undefined') {
            snowflake = new SnowflakeCursor('snowflake-cursor-container');
        }
    }

    function onOverlayClick(e) {
        if (!clickArmed || !snowflake || !clickResolver) return;
        var canvas = document.getElementById('snowflakeCanvas');
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        if (snowflake.isPointNearSnowflake(x, y)) {
            if (global.BgmController) global.BgmController.startLoop();
            var resolve = clickResolver;
            clickResolver = null;
            resolve();
        }
    }

    /** 与 MyProject bootIntro() 一致：页面打开即启动 */
    function bootIntro() {
        clickArmed = false;
        if (screenEl) {
            screenEl.hidden = false;
            screenEl.classList.remove('hidden');
        }
        if (overlayEl) overlayEl.hidden = true;
        requestAnimationFrame(function () {
            if (snowflakeTimer) clearTimeout(snowflakeTimer);
            snowflakeTimer = setTimeout(function () {
                snowflakeTimer = 0;
                startSnowflake();
            }, SNOWFLAKE_DELAY_MS);
        });
        setTimeout(runReveal, REVEAL_DELAY_MS);
        if (lockTimer) clearTimeout(lockTimer);
        lockTimer = setTimeout(function () {
            clickArmed = true;
            lockTimer = 0;
        }, CLICK_LOCK_MS);
    }

    function enter() {
        bootIntro();
        if (overlayEl) {
            overlayEl.addEventListener('click', onOverlayClick);
        }
        return new Promise(function (resolve) {
            clickResolver = resolve;
        });
    }

    function exit() {
        if (overlayEl) overlayEl.removeEventListener('click', onOverlayClick);
        if (snowflake) {
            snowflake.destroy();
            snowflake = null;
        }
        if (screenEl) {
            screenEl.classList.add('hidden');
            screenEl.hidden = true;
        }
        clickResolver = null;
        clickArmed = false;
        if (lockTimer) {
            clearTimeout(lockTimer);
            lockTimer = 0;
        }
        if (snowflakeTimer) {
            clearTimeout(snowflakeTimer);
            snowflakeTimer = 0;
        }
        if (crosshair) crosshair.show();
        if (onCompleteCb) onCompleteCb();
    }

    global.IntroController = {
        init: init,
        setCrosshair: setCrosshair,
        setOnComplete: setOnComplete,
        bootIntro: bootIntro,
        enter: enter,
        exit: exit,
    };
})(typeof window !== 'undefined' ? window : this);
