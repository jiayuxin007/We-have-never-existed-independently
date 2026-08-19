(function (global) {
    'use strict';

    var barEl = null;
    var labelEl = null;
    var textEl = null;
    var wrapEl = null;
    var barHudEl = null;
    var resolvedEl = null;
    var animId = null;
    var holdTimer = null;

    function timing() {
        return global.TIMING_CONFIG || {};
    }

    function waitMs(ms) {
        return new Promise(function (resolve) {
            holdTimer = setTimeout(function () {
                holdTimer = null;
                resolve();
            }, ms);
        });
    }

    function clearHoldTimer() {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
    }

    function init(bar, label, text, wrap) {
        barEl = bar;
        labelEl = label;
        textEl = text;
        wrapEl = wrap || (bar && bar.closest ? bar.closest('.karma-hud') : null);
        barHudEl = wrapEl ? wrapEl.querySelector('.bar-hud') : null;
        resolvedEl = wrapEl ? wrapEl.querySelector('.karma-resolved') : document.getElementById('karmaResolved');
        setProgress(0);
        if (labelEl) labelEl.textContent = '0%';
        if (textEl) textEl.hidden = true;
        resetResolved();
        if (wrapEl) wrapEl.hidden = true;
    }

    function setProgress(pct) {
        pct = Math.max(0, Math.min(100, pct));
        if (barEl) barEl.style.width = pct + '%';
        if (labelEl) {
            labelEl.textContent = Math.round(pct) + '%';
        }
    }

    function applyCloudColor() {
        if (!wrapEl) return;
        var c = global.HouseModelStage && global.HouseModelStage.getCloudColorRgb
            ? global.HouseModelStage.getCloudColorRgb()
            : { r: 139, g: 92, b: 246 };
        wrapEl.style.setProperty('--cloud-r', String(c.r));
        wrapEl.style.setProperty('--cloud-g', String(c.g));
        wrapEl.style.setProperty('--cloud-b', String(c.b));
    }

    function resetResolved() {
        clearHoldTimer();
        if (wrapEl) {
            wrapEl.classList.remove('is-bar-out', 'is-resolved');
        }
        if (barHudEl) barHudEl.hidden = false;
        if (resolvedEl) resolvedEl.hidden = true;
    }

    function showKarmaUi(labelText) {
        applyCloudColor();
        resetResolved();
        if (wrapEl) wrapEl.hidden = false;
        if (textEl) {
            textEl.hidden = false;
            if (labelText) textEl.textContent = labelText;
        }
        if (labelEl) labelEl.hidden = false;
    }

    function hideKarmaUi() {
        resetResolved();
        if (wrapEl) wrapEl.hidden = true;
        if (textEl) textEl.hidden = true;
        if (labelEl) labelEl.textContent = '0%';
        setProgress(0);
    }

    function showResolved(holdMs) {
        var fadeMs = (timing().karmaBarFadeMs != null) ? timing().karmaBarFadeMs : 400;
        var stayMs = holdMs != null ? holdMs : (timing().karmaResolvedHoldMs || 5000);
        if (!wrapEl) return waitMs(stayMs);

        wrapEl.classList.add('is-bar-out');
        return waitMs(fadeMs).then(function () {
            if (resolvedEl) resolvedEl.hidden = false;
            return waitMs(30);
        }).then(function () {
            wrapEl.classList.add('is-resolved');
            return waitMs(stayMs);
        });
    }

    /**
     * 0→100% 动画，结束时 stop 采集并 finalizeSession，再显示结算文案后才交还
     * @returns {Promise<object>} sixPathsResult
     */
    function runFinalize(durationMs, labelText, holdMs) {
        durationMs = durationMs || 7000;
        if (global.AppEventBus) {
            global.AppEventBus.emit('karma:finalize-start');
        }
        showKarmaUi(labelText);
        setProgress(0);
        return new Promise(function (resolve) {
            var start = performance.now();

            function finish(result) {
                showResolved(holdMs).then(function () {
                    resolve(result);
                });
            }

            function frame(now) {
                var t = (now - start) / durationMs;
                if (t >= 1) {
                    setProgress(100);
                    cancelAnimationFrame(animId);
                    animId = null;

                    if (global.INTERACTION_COLLECTOR && global.INTERACTION_COLLECTOR.isActive()) {
                        global.INTERACTION_COLLECTOR.stop();
                    }
                    global.MarketTicker.stop();

                    var summary = global.INTERACTION_COLLECTOR
                        ? global.INTERACTION_COLLECTOR.getSummary()
                        : null;
                    var result = null;
                    try {
                        result = SIX_PATHS_ALGORITHM.finalizeSession(summary);
                    } catch (err) {
                        console.error('[KarmaProgress] finalize failed', err);
                        result = {
                            finalPath: { pathId: 'ren', name: '人道' },
                            pathTimeRatio: {},
                            totalTime: 0,
                        };
                    }
                    try {
                        localStorage.setItem('sixPathsResult', JSON.stringify(result));
                        localStorage.setItem('sixPathsResultTime', String(Date.now()));
                    } catch (e) { /* ignore */ }

                    global.AppEventBus.emit('karma:finalized', result);
                    finish(result);
                    return;
                }
                setProgress(t * 100);
                animId = requestAnimationFrame(frame);
            }

            if (animId) cancelAnimationFrame(animId);
            animId = requestAnimationFrame(frame);
        });
    }

    function hide() {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        hideKarmaUi();
    }

    global.KarmaProgress = {
        init: init,
        setProgress: setProgress,
        runFinalize: runFinalize,
        hide: hide,
        showKarmaUi: showKarmaUi,
        hideKarmaUi: hideKarmaUi,
        showResolved: showResolved,
    };
})(typeof window !== 'undefined' ? window : this);
