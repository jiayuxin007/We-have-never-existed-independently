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
    var warmPath = { effectId: null, handle: null, promise: null };

    var PATH_FADE_MS = 700;
    var DIP_OUT_MS = 3000;
    var DIP_IN_MS = 3000;
    var DIP_HOLD_MS = 80;

    var dipFade = null;
    var dipPendingReveal = false;

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

    function waitMs(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function ensureDipFade() {
        if (dipFade) return dipFade;
        if (typeof global.createDipFade === 'function') {
            dipFade = global.createDipFade();
        }
        return dipFade;
    }

    function fadePathToBlackIfBirth(index) {
        var next = getStage(index + 1);
        if (!next || next.key !== 'woven-ring') return Promise.resolve();
        var dip = ensureDipFade();
        if (!dip) return Promise.resolve();
        dipPendingReveal = true;
        return dip.fadeToBlack(DIP_OUT_MS);
    }

    function revealFromBlackIfNeeded() {
        if (!dipPendingReveal) return Promise.resolve();
        dipPendingReveal = false;
        var dip = ensureDipFade();
        if (!dip) return Promise.resolve();
        return waitMs(DIP_HOLD_MS).then(function () {
            return dip.fadeFromBlack(DIP_IN_MS);
        });
    }

    function assignedPathEffectId() {
        return resolveEffectId({ layers: { effect: 'assigned-path' } });
    }

    function restoreHouseThree() {
        if (global.ThreeRegistry && global.ThreeRegistry.useR128) {
            global.ThreeRegistry.useR128();
        }
    }

    function preloadAssignedPathScripts() {
        var effectId = assignedPathEffectId();
        if (!effectId || !global.EffectRegistry || !global.EffectRegistry.ensureEffectScripts) {
            return Promise.resolve();
        }
        return global.EffectRegistry.ensureEffectScripts(effectId).then(function () {
            restoreHouseThree();
        }).catch(function (err) {
            console.warn('[StageDirector] path script preload failed', err);
            restoreHouseThree();
        });
    }

    function clearWarmPath(dispose) {
        if (dispose && warmPath.handle && warmPath.effectId) {
            global.EffectRegistry.disposeHandle(warmPath.handle, warmPath.effectId);
        }
        warmPath = { effectId: null, handle: null, promise: null };
    }

    function warmAssignedPathMount() {
        var effectId = assignedPathEffectId();
        if (!effectId || !dom.effectLayer) return Promise.resolve();
        if (warmPath.promise && warmPath.effectId === effectId) return warmPath.promise;

        if (warmPath.handle && warmPath.effectId) {
            global.EffectRegistry.disposeHandle(warmPath.handle, warmPath.effectId);
        }
        warmPath = { effectId: effectId, handle: null, promise: null };

        if (global.HouseModelStage && global.HouseModelStage.suspend) {
            global.HouseModelStage.suspend({ keepVisible: true });
        }

        currentEffectId = effectId;
        dom.effectLayer.hidden = false;
        dom.effectLayer.classList.add('is-path-pending');
        dom.effectLayer.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'effect-mount';
        wrap.style.cssText = 'position:absolute;inset:0;background:transparent;';
        dom.effectLayer.appendChild(wrap);

        var opts = { container: wrap };
        if (crosshair) {
            opts.onMouseMove = function (x, y) { crosshair.updatePosition(x, y); };
        }

        warmPath.promise = global.EffectRegistry.mount(effectId, opts).then(function (h) {
            warmPath.handle = h;
            effectHandle = h;
            return h;
        }).catch(function (err) {
            console.error('[StageDirector] warm path mount failed', effectId, err);
            wrap.innerHTML = '<div class="effect-error">Effect load failed: ' + effectId + '</div>';
            warmPath.promise = null;
        });
        return warmPath.promise;
    }

    function fadeOutgoingToPath() {
        if (dom.effectLayer) {
            dom.effectLayer.hidden = false;
            dom.effectLayer.classList.remove('is-path-pending');
        }
        if (dom.houseLayer && !dom.houseLayer.hidden) {
            dom.houseLayer.classList.add('is-fading-out');
        }
        if (dom.karmaWrap && !dom.karmaWrap.hidden) {
            dom.karmaWrap.classList.add('is-fading-out');
        }
        if (global.BgVideoController) global.BgVideoController.setVisible(false);

        return new Promise(function (resolve) {
            setTimeout(function () {
                if (dom.houseLayer) {
                    dom.houseLayer.hidden = true;
                    dom.houseLayer.classList.remove('is-fading-out');
                    dom.houseLayer.style.opacity = '';
                }
                if (dom.karmaWrap) {
                    dom.karmaWrap.classList.remove('is-fading-out');
                    dom.karmaWrap.style.opacity = '';
                }
                if (global.KarmaProgress && global.KarmaProgress.hide) {
                    global.KarmaProgress.hide();
                }
                resolve();
            }, PATH_FADE_MS);
        });
    }

    function enterAssignedPathStage(stage, index) {
        var effectId = assignedPathEffectId();
        var pathId = peekPathId();
        var pathCfg = global.PATHS_CONFIG && global.PATHS_CONFIG[pathId];
        console.info('[StageDirector] six-paths', pathId, pathCfg && pathCfg.name, 'effect=' + effectId);
        var alreadyWarm = warmPath.promise && warmPath.effectId === effectId;
        var chain = alreadyWarm
            ? warmPath.promise
            : Promise.resolve().then(function () {
                if (global.HouseModelStage && global.HouseModelStage.ensureLoaded) {
                    restoreHouseThree();
                    return global.HouseModelStage.ensureLoaded().then(function () {
                        if (global.HouseModelStage.suspend) {
                            global.HouseModelStage.suspend({ keepVisible: true });
                        }
                    }).catch(function (err) {
                        console.warn('[StageDirector] house preload before six-paths failed', err);
                    });
                }
            }).then(function () {
                return warmAssignedPathMount();
            });

        return chain.then(function () {
            return fadeOutgoingToPath();
        }).then(function () {
            if (global.PathResolutionHud) global.PathResolutionHud.show(pathId);
            global.SubtitleController.play(resolveSubtitles(stage));
            return runStageBody(stage);
        }).then(function () {
            return fadePathToBlackIfBirth(index);
        }).then(function () {
            global.AppEventBus.emit('stage:complete', { stage: stage, index: index });
            exitStage(stage, getStage(index + 1));
            return true;
        });
    }

    function setLayerVisibility(stage) {
        var L = stage.layers || {};
        var holdOutgoing = L.effect === 'assigned-path';

        if (!holdOutgoing) {
            global.BgVideoController.setVisible(L.bgVideo !== false);
            if (dom.karmaWrap) dom.karmaWrap.hidden = !L.karmaBar;
            if (dom.karmaText) dom.karmaText.hidden = !L.karmaBar;
            if (dom.houseLayer) dom.houseLayer.hidden = !L.houseModel;
        }
        if (dom.effectLayer) {
            dom.effectLayer.hidden = !L.effect;
            if (holdOutgoing) dom.effectLayer.classList.add('is-path-pending');
        }

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
            if (dom.houseLayer) {
                dom.houseLayer.hidden = true;
                dom.houseLayer.style.visibility = '';
            }
            return Promise.resolve();
        }
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
            hooks.hitTest = function (e) {
                if (effectHandle && typeof effectHandle.containsPoint === 'function') {
                    return effectHandle.containsPoint(e.clientX, e.clientY);
                }
                return true;
            };
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
            var scriptsP = preloadAssignedPathScripts();
            return global.KarmaProgress.runFinalize(
                stage.karmaDurationMs || 7000,
                stage.karmaLabel || 'Karma calculation in progress...',
                stage.karmaResolvedHoldMs
            ).then(function (result) {
                karmaResult = result;
                applyPathOverrideToKarma();
                return scriptsP;
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
        if (stage && stage.key === 'six-paths-reveal' && global.PathResolutionHud) {
            global.PathResolutionHud.hide();
        }
        exitSpecialStage(stage);
        global.BlockingUI.clear();
        var goingToPath = nextStage && nextStage.layers && nextStage.layers.effect === 'assigned-path';
        if (!goingToPath) {
            disposeCurrentEffect();
            clearWarmPath(false);
            if (global.HouseModelStage && global.HouseModelStage.isActive() && (!nextStage || !nextStage.layers.houseModel)) {
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
        global.AppEventBus.emit('stage:enter', {
            stage: stage,
            index: index,
            pathId: peekPathId(),
        });

        setLayerVisibility(stage);

        var holdBirthSub = dipPendingReveal && !(stage.layers && stage.layers.effect);

        if (stage.layers && stage.layers.effect === 'assigned-path') {
            return enterAssignedPathStage(stage, index);
        }

        var special = runSpecialStage(stage);
        if (!special) {
            /* 有特效的阶段：等 mount 完成后再播字幕，atMs 相对「效果就绪」 */
            if (!resolveEffectId(stage) && !holdBirthSub) {
                global.SubtitleController.play(resolveSubtitles(stage));
            }
        }

        var effectId = resolveEffectId(stage);
        var profile = resolveThreeProfile(stage, effectId);

        var chain = special || Promise.resolve();
        return chain.then(function () {
            return global.ThreeRegistry.ensureProfile(profile);
        }).then(function () {
            global.ThreeRegistry.useProfile(profile);
            return enterHouse(stage);
        }).then(function () {
            return mountStageEffect(stage);
        }).then(function () {
            if (special) return Promise.resolve();
            return revealFromBlackIfNeeded();
        }).then(function () {
            if (special) return Promise.resolve();
            if (resolveEffectId(stage) || holdBirthSub) {
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
