/**
 * Preview: each path tab plays the real six-path beat, dip-to-black, then 生.
 * Fade out 3s / fade in 3s. Not wired into StageDirector.
 */
(function (global) {
    'use strict';

    var PATH_ORDER = ['tian', 'ren', 'xiuluo', 'chusheng', 'egui', 'diyu'];
    var FADE_OUT_MS = 3000;
    var HOLD_MS = 80;
    var FADE_IN_MS = 3000;

    var effectLayer = document.getElementById('effectLayer');
    var houseLayer = document.getElementById('houseLayer');
    var statusEl = document.getElementById('irisStatus');
    var tabButtons = document.querySelectorAll('.iris-tabs button');

    var pathId = 'ren';
    var effectHandle = null;
    var currentEffectId = null;
    var dip = null;
    var runId = 0;

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function still(id) {
        return runId === id;
    }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function stageByKey(key) {
        var stages = global.STAGES_CONFIG || [];
        var i;
        for (i = 0; i < stages.length; i++) {
            if (stages[i].key === key) return stages[i];
        }
        return null;
    }

    function stageMs(key, fallback) {
        var stage = stageByKey(key);
        return stage && stage.durationMs != null ? stage.durationMs : fallback;
    }

    function birthSubtitles() {
        var stage = stageByKey('woven-ring');
        return (stage && stage.subtitles) || [];
    }

    function pathCfg(id) {
        return (global.PATHS_CONFIG && global.PATHS_CONFIG[id]) || null;
    }

    function restoreHouseThree() {
        if (global.ThreeRegistry && global.ThreeRegistry.useR128) {
            global.ThreeRegistry.useR128();
        }
    }

    function disposePath() {
        if (effectHandle && currentEffectId && global.EffectRegistry) {
            global.EffectRegistry.disposeHandle(effectHandle, currentEffectId);
        }
        effectHandle = null;
        currentEffectId = null;
        if (effectLayer) effectLayer.innerHTML = '';
    }

    function emitStage(key) {
        if (!global.AppEventBus) return;
        global.AppEventBus.emit('stage:enter', {
            stage: { key: key },
            pathId: pathId,
        });
    }

    function markTab(id) {
        var i;
        for (i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.toggle('is-active', tabButtons[i].getAttribute('data-path') === id);
        }
    }

    function mountPath() {
        var cfg = pathCfg(pathId);
        if (!cfg || !global.EffectRegistry || !effectLayer) {
            return Promise.reject(new Error('path mount missing'));
        }
        disposePath();
        restoreHouseThree();
        if (global.HouseModelStage && global.HouseModelStage.suspend) {
            global.HouseModelStage.suspend({ keepVisible: false });
        }
        if (houseLayer) houseLayer.hidden = true;
        if (global.BgVideoController) global.BgVideoController.setVisible(false);
        if (dip) dip.hide();

        effectLayer.hidden = false;
        effectLayer.classList.remove('is-path-pending');
        var wrap = document.createElement('div');
        wrap.className = 'effect-mount';
        wrap.style.cssText = 'position:absolute;inset:0;background:transparent;';
        effectLayer.appendChild(wrap);

        currentEffectId = cfg.effectId;
        global.__PATH_OVERRIDE__ = pathId;
        setStatus('加载 ' + cfg.name + '…');

        return global.EffectRegistry.mount(cfg.effectId, { container: wrap }).then(function (h) {
            effectHandle = h;
            if (global.PathResolutionHud) global.PathResolutionHud.show(pathId);
            if (global.SubtitleController) global.SubtitleController.play(global.SIX_PATHS_SUBTITLES || []);
            emitStage('six-paths-reveal');
        }).catch(function (err) {
            console.error('[IrisPreview] mount', pathId, err);
            wrap.innerHTML = '<div class="effect-error">Effect load failed: ' + cfg.effectId + '</div>';
            throw err;
        });
    }

    function enterBirth() {
        restoreHouseThree();
        disposePath();
        if (effectLayer) effectLayer.hidden = true;
        if (global.PathResolutionHud) global.PathResolutionHud.hide();
        if (global.BgVideoController) global.BgVideoController.setVisible(true);
        if (houseLayer) houseLayer.hidden = false;
        return global.HouseModelStage.enterStageMode('phase', {
            durationMs: stageMs('woven-ring', 6000),
        }).then(function () {
            emitStage('woven-ring');
        });
    }

    function runSequence(id) {
        var my = ++runId;
        var cfg = pathCfg(id);
        pathId = id;
        global.__PATH_OVERRIDE__ = id;
        markTab(id);
        if (global.SubtitleController) global.SubtitleController.hide();
        if (global.HouseHint) global.HouseHint.stop();

        return mountPath().then(function () {
            if (!still(my)) return;
            var pathMs = stageMs('six-paths-reveal', 15000);
            setStatus((cfg && cfg.name) + ' · 六道 ' + (pathMs / 1000) + 's');
            return wait(pathMs);
        }).then(function () {
            if (!still(my) || !dip) return;
            setStatus((cfg && cfg.name) + ' · 变暗 3s');
            return dip.fadeToBlack(FADE_OUT_MS);
        }).then(function () {
            if (!still(my)) return;
            if (global.SubtitleController) global.SubtitleController.hide();
            if (global.PathResolutionHud) global.PathResolutionHud.hide();
            return enterBirth();
        }).then(function () {
            if (!still(my)) return;
            return wait(HOLD_MS);
        }).then(function () {
            if (!still(my) || !dip) return;
            setStatus((cfg && cfg.name) + ' · 变亮 3s');
            return dip.fadeFromBlack(FADE_IN_MS);
        }).then(function () {
            if (!still(my)) return;
            if (global.SubtitleController) global.SubtitleController.play(birthSubtitles());
            var birthMs = stageMs('woven-ring', 6000);
            setStatus((cfg && cfg.name) + ' · 生 ' + (birthMs / 1000) + 's');
            return wait(birthMs);
        }).then(function () {
            if (!still(my)) return;
            setStatus((cfg && cfg.name) + ' · 生结束。再点一道从头看');
        }).catch(function (err) {
            if (!still(my)) return;
            console.error('[IrisPreview] sequence', err);
            setStatus('播放失败');
        });
    }

    function selectPath(id) {
        if (PATH_ORDER.indexOf(id) < 0) return;
        runSequence(id);
    }

    function start() {
        if (!global.createDipFade || !global.EffectRegistry || !global.HouseModelStage) {
            setStatus('主流程模块未加载');
            return;
        }
        dip = global.createDipFade();
        global.__PATH_OVERRIDE__ = pathId;

        if (global.CrosshairCursor && global.CrosshairCursor.create) {
            global.CrosshairCursor.create().show();
        }
        global.BgVideoController.init(document.getElementById('globalBgVideo'));
        global.BgVideoController.setVisible(false);
        global.SubtitleController.init(document.getElementById('subtitleLayer'));
        global.HouseModelStage.init(houseLayer);
        if (global.HouseHint) global.HouseHint.init();

        var i;
        for (i = 0; i < tabButtons.length; i++) {
            tabButtons[i].addEventListener('click', function () {
                selectPath(this.getAttribute('data-path'));
            });
        }

        setStatus('预热房屋模型…');
        global.ThreeRegistry.ensureR128().then(function () {
            restoreHouseThree();
            return global.HouseModelStage.ensureLoaded();
        }).then(function () {
            if (global.HouseModelStage.suspend) {
                global.HouseModelStage.suspend({ keepVisible: false });
            }
            return runSequence(pathId);
        }).catch(function (err) {
            console.error('[IrisPreview] boot', err);
            setStatus('启动失败，请用本地 HTTP 打开');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})(window);
