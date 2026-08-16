(function (global) {
    'use strict';

    var stages = global.STAGES_CONFIG || [];
    var currentIndex = -1;
    var running = false;
    var effectHandle = null;
    var currentEffectId = null;
    var karmaResult = null;
    var crosshair = null;
    var currentVedanaKind = 'sukha';
    var currentVedanaPathId = 'ren';

    var dom = {};

    function getStage(i) {
        return stages[i] || null;
    }

    function peekPathId() {
        if (global.__PATH_OVERRIDE__ && global.PATHS_CONFIG && global.PATHS_CONFIG[global.__PATH_OVERRIDE__]) {
            return global.__PATH_OVERRIDE__;
        }
        if (karmaResult && karmaResult.finalPath && karmaResult.finalPath.pathId) {
            return karmaResult.finalPath.pathId;
        }
        var summary = global.INTERACTION_COLLECTOR && global.INTERACTION_COLLECTOR.isActive
            && global.INTERACTION_COLLECTOR.isActive()
            ? global.INTERACTION_COLLECTOR.getSummary()
            : null;
        if (global.SIX_PATHS_ALGORITHM && typeof global.SIX_PATHS_ALGORITHM.peekLeadingPath === 'function') {
            var peeked = global.SIX_PATHS_ALGORITHM.peekLeadingPath(summary);
            if (peeked && peeked.pathId) return peeked.pathId;
        }
        return 'ren';
    }

    function resolveVedanaKind(pathId) {
        var override = global.__VEDANA_OVERRIDE__;
        if (override === 'dukha' || override === 'sukha' || override === 'upeksha') {
            return override;
        }
        var map = global.VEDANA_BY_PATH || {};
        return map[pathId || peekPathId()] || 'sukha';
    }

    function resolveSubtitles(stage) {
        if (stage.subtitles === 'six-paths-fixed') {
            return (global.SIX_PATHS_SUBTITLES || []).slice();
        }
        if (stage.key === 'house-shou' && global.VEDANA_SUBTITLES) {
            var lines = global.VEDANA_SUBTITLES[currentVedanaKind];
            if (lines) return lines.slice();
        }
        return (stage.subtitles || []).slice();
    }

    function resolveEffectId(stage) {
        if (stage.layers.effect === 'assigned-path') {
            var pathId = peekPathId();
            var p = global.PATHS_CONFIG[pathId];
            return p ? p.effectId : 'the-spirit';
        }
        return stage.layers.effect;
    }

    function resolveThreeProfile(stage, effectId) {
        if (stage.threeProfile === 'dynamic' && effectId) {
            var def = global.EffectRegistry.getDef(effectId);
            return def ? def.threeProfile : 'r128';
        }
        return stage.threeProfile;
    }

    function setLayerVisibility(stage) {
        var L = stage.layers || {};
        global.BgVideoController.setVisible(L.bgVideo !== false);

        if (dom.karmaWrap) dom.karmaWrap.hidden = !L.karmaBar;
        if (dom.karmaText) dom.karmaText.hidden = !L.karmaBar;
        if (dom.houseLayer) dom.houseLayer.hidden = !L.houseModel;
        if (dom.effectLayer) dom.effectLayer.hidden = !L.effect;

        if (L.blockingUi) {
            global.BlockingUI.setMode(L.blockingUi);
            if (dom.blockingLayer) dom.blockingLayer.hidden = false;
        } else if (dom.blockingLayer) {
            global.BlockingUI.clear();
            dom.blockingLayer.hidden = true;
        }
    }

    function disposeCurrentEffect() {
        if (effectHandle && currentEffectId) {
            global.EffectRegistry.disposeHandle(effectHandle, currentEffectId);
        }
        effectHandle = null;
        currentEffectId = null;
        if (dom.effectLayer) dom.effectLayer.innerHTML = '';
    }

    function mountStageEffect(stage) {
        var effectId = resolveEffectId(stage);
        if (!effectId || !dom.effectLayer) return Promise.resolve();

        currentEffectId = effectId;
        dom.effectLayer.hidden = false;
        dom.effectLayer.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'effect-mount';
        wrap.style.cssText = 'position:absolute;inset:0;background:transparent;';
        dom.effectLayer.appendChild(wrap);

        var opts = { container: wrap };
        if (crosshair) {
            opts.onMouseMove = function (x, y) {
                crosshair.updatePosition(x, y);
            };
        }

        return global.EffectRegistry.mount(effectId, opts).then(function (h) {
            effectHandle = h;
        }).catch(function (err) {
            console.error('[StageDirector] effect mount failed', effectId, err);
            wrap.innerHTML = '<div class="effect-error">Effect load failed: ' + effectId + '</div>';
        });
    }

    function enterHouse(stage) {
        if (!stage.layers.houseModel) {
            if (dom.houseLayer) dom.houseLayer.hidden = true;
            return Promise.resolve();
        }
        if (dom.houseLayer) dom.houseLayer.hidden = false;
        var opts = {
            durationMs: stage.durationMs || 5000,
            onMouseMove: crosshair ? function (x, y) { crosshair.updatePosition(x, y); } : null,
        };
        if (stage.layers.houseModel === 'shou') {
            opts.vedanaKind = currentVedanaKind;
        }
        if (global.ThreeRegistry && global.ThreeRegistry.useR128) {
            global.ThreeRegistry.useR128();
        }
        return new Promise(function (resolve) {
            global.requestAnimationFrame(function () {
                global.requestAnimationFrame(resolve);
            });
        }).then(function () {
            return global.HouseModelStage.enterStageMode(stage.layers.houseModel, opts);
        }).catch(function (err) {
            console.error('[StageDirector] house enter failed', stage.layers.houseModel, err);
        });
    }

    function onSessionStart(stage) {
        if (global.INTERACTION_COLLECTOR && !global.INTERACTION_COLLECTOR.isActive()) {
            global.INTERACTION_COLLECTOR.start();
        }
        if (stage.startMarketSession && !global.MarketTicker.isRunning()) {
            global.MarketTicker.start({ provider: global.__MARKET_PROVIDER__ || 'binance-ws' });
        }
        global.NoteAudio.unlock();
    }

    function runSpecialStage(stage) {
        if (stage.key === 'diamond-sutra') {
            global.SubtitleController.hide();
            return global.SutraController.enter();
        }
        if (stage.key === 'final-quote') {
            global.SubtitleController.hide();
            return global.FinalQuoteController.enter();
        }
        return null;
    }

    function runStageBlocking(stage) {
        if (stage.key === 'intro-snowflake') return Promise.resolve();
        if (!stage.blocking) return Promise.resolve();

        var hooks = {};
        if (stage.blocking.postClick === 'collapse-effect') {
            hooks.postClick = function () {
                global.BlockingUI.clear();
                if (effectHandle && typeof effectHandle.collapse === 'function') {
                    return effectHandle.collapse();
                }
                return Promise.resolve();
            };
        }
        return global.BlockingGate.runBlocking(stage.blocking, hooks);
    }

    function runStageBody(stage) {
        if (stage.finalizeKarma) {
            return global.KarmaProgress.runFinalize(
                stage.karmaDurationMs || 7000,
                stage.karmaLabel || 'Karma calculation in progress...'
            ).then(function (result) {
                karmaResult = result;
                applyPathOverrideToKarma();
            });
        }

        var p = Promise.resolve();
        if (stage.blocking) {
            p = p.then(function () { return runStageBlocking(stage); });
        }
        if (stage.durationMs) {
            p = p.then(function () { return global.BlockingGate.waitMs(stage.durationMs); });
        }
        return p;
    }

    function exitSpecialStage(stage) {
        if (stage.key === 'diamond-sutra') global.SutraController.exit();
        if (stage.key === 'final-quote' && global.FinalQuoteController) {
            global.FinalQuoteController.exit();
        }
    }

    function exitStage(stage, nextStage) {
        global.SubtitleController.hide();
        exitSpecialStage(stage);
        global.BlockingUI.clear();
        disposeCurrentEffect();
        if (global.HouseModelStage && global.HouseModelStage.isActive() && (!nextStage || !nextStage.layers.houseModel)) {
            if (nextStage && nextStage.layers && nextStage.layers.effect === 'assigned-path' && global.HouseModelStage.suspend) {
                global.HouseModelStage.suspend();
            } else {
                global.HouseModelStage.exitStage();
            }
        }
        global.AppEventBus.emit('stage:exit', { stage: stage });
    }

    function enterStage(index) {
        var stage = getStage(index);
        if (!stage) return Promise.resolve(false);

        currentIndex = index;
        if (stage.layers && stage.layers.houseModel === 'shou') {
            currentVedanaPathId = peekPathId();
            currentVedanaKind = resolveVedanaKind(currentVedanaPathId);
            global.AppEventBus.emit('shou:vedana', {
                kind: currentVedanaKind,
                pathId: currentVedanaPathId,
            });
            console.info('[StageDirector] 受', currentVedanaKind, 'from', currentVedanaPathId);
        }
        global.AppEventBus.emit('stage:enter', { stage: stage, index: index });

        setLayerVisibility(stage);

        var special = runSpecialStage(stage);
        if (!special) {
            /* 有特效的阶段：等 mount 完成后再播字幕，atMs 相对「效果就绪」 */
            if (!resolveEffectId(stage)) {
                global.SubtitleController.play(resolveSubtitles(stage));
            }
        }

        var effectId = resolveEffectId(stage);
        var profile = resolveThreeProfile(stage, effectId);

        var chain = special || Promise.resolve();
        return chain.then(function () {
            if (stage.layers && stage.layers.effect === 'assigned-path' && global.HouseModelStage && global.HouseModelStage.ensureLoaded) {
                if (global.ThreeRegistry && global.ThreeRegistry.useR128) {
                    global.ThreeRegistry.useR128();
                }
                return global.HouseModelStage.ensureLoaded().then(function () {
                    if (global.HouseModelStage.suspend) global.HouseModelStage.suspend();
                }).catch(function (err) {
                    console.warn('[StageDirector] house preload before six-paths failed', err);
                });
            }
        }).then(function () {
            return global.ThreeRegistry.ensureProfile(profile);
        }).then(function () {
            global.ThreeRegistry.useProfile(profile);
            return enterHouse(stage);
        }).then(function () {
            if (stage.layers && stage.layers.effect === 'assigned-path') {
                return new Promise(function (resolve) {
                    global.requestAnimationFrame(function () {
                        global.requestAnimationFrame(resolve);
                    });
                });
            }
        }).then(function () {
            return mountStageEffect(stage);
        }).then(function () {
            if (special) return Promise.resolve();
            if (resolveEffectId(stage)) {
                global.SubtitleController.play(resolveSubtitles(stage));
            }
            return runStageBody(stage);
        }).then(function () {
            global.AppEventBus.emit('stage:complete', { stage: stage, index: index });
            exitStage(stage, getStage(index + 1));
            return true;
        });
    }

    function runFrom(startIndex) {
        if (running) return Promise.resolve();
        running = true;

        function loop(i) {
            if (i >= stages.length) {
                running = false;
                global.AppEventBus.emit('director:finished');
                return Promise.resolve();
            }
            return enterStage(i).then(function (ok) {
                if (!ok) {
                    running = false;
                    return;
                }
                return loop(i + 1);
            });
        }

        return loop(startIndex);
    }

    function applyPathOverrideToKarma() {
        var id = global.__PATH_OVERRIDE__;
        if (!id || !global.PATHS_CONFIG || !global.PATHS_CONFIG[id]) return;
        var cfg = global.PATHS_CONFIG[id];
        if (!karmaResult) karmaResult = {};
        karmaResult.finalPath = { pathId: id, name: cfg.name };
    }

    function init(options) {
        options = options || {};
        dom = options.dom || {};
        crosshair = options.crosshair || null;
        stages = global.STAGES_CONFIG || [];
        applyPathOverrideToKarma();

        var startIndex = typeof options.startIndex === 'number' ? options.startIndex : 0;
        return runFrom(startIndex);
    }

    function getKarmaResult() {
        return karmaResult;
    }

    global.StageDirector = {
        init: init,
        getKarmaResult: getKarmaResult,
        getCurrentIndex: function () { return currentIndex; },
    };
})(typeof window !== 'undefined' ? window : this);
