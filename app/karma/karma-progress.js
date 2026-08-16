(function (global) {
    'use strict';

    var barEl = null;
    var labelEl = null;
    var textEl = null;
    var wrapEl = null;
    var animId = null;

    function init(bar, label, text, wrap) {
        barEl = bar;
        labelEl = label;
        textEl = text;
        wrapEl = wrap || (bar && bar.closest ? bar.closest('.karma-hud') : null);
        setProgress(0);
        if (labelEl) labelEl.textContent = '0%';
        if (textEl) textEl.hidden = true;
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

    function showKarmaUi(labelText) {
        applyCloudColor();
        if (wrapEl) wrapEl.hidden = false;
        if (textEl) {
            textEl.hidden = false;
            if (labelText) textEl.textContent = labelText;
        }
        if (labelEl) labelEl.hidden = false;
    }

    function hideKarmaUi() {
        if (wrapEl) wrapEl.hidden = true;
        if (textEl) textEl.hidden = true;
        if (labelEl) labelEl.textContent = '0%';
        setProgress(0);
    }

    /**
     * 0→100% 动画，结束时 stop 采集并 finalizeSession
     * @returns {Promise<object>} sixPathsResult
     */
    function runFinalize(durationMs, labelText) {
        durationMs = durationMs || 7000;
        if (global.AppEventBus) {
            global.AppEventBus.emit('karma:finalize-start');
        }
        showKarmaUi(labelText);
        setProgress(0);
        return new Promise(function (resolve) {
            var start = performance.now();

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
                    var result = SIX_PATHS_ALGORITHM.finalizeSession(summary);
                    try {
                        localStorage.setItem('sixPathsResult', JSON.stringify(result));
                        localStorage.setItem('sixPathsResultTime', String(Date.now()));
                    } catch (e) { /* ignore */ }

                    global.AppEventBus.emit('karma:finalized', result);
                    resolve(result);
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
    };
})(typeof window !== 'undefined' ? window : this);
