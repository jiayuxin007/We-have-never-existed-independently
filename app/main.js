(function (global) {
    'use strict';

    var PATH_ALIASES = {
        tian: 'tian', '天': 'tian', '天道': 'tian',
        ren: 'ren', '人': 'ren', '人道': 'ren',
        xiuluo: 'xiuluo', '修罗': 'xiuluo', '修罗道': 'xiuluo',
        chusheng: 'chusheng', '畜': 'chusheng', '畜生': 'chusheng', '畜生道': 'chusheng',
        egui: 'egui', '饿': 'egui', '饿鬼': 'egui', '饿鬼道': 'egui',
        diyu: 'diyu', '地狱': 'diyu', '地狱道': 'diyu',
    };

    function normalizePathId(raw) {
        if (!raw) return null;
        var key = String(raw).trim().toLowerCase();
        var id = PATH_ALIASES[key] || PATH_ALIASES[String(raw).trim()] || null;
        return id && global.PATHS_CONFIG && global.PATHS_CONFIG[id] ? id : null;
    }

    function parseDebugParams() {
        var params = new URLSearchParams(global.location.search);
        return {
            debug: params.get('debug') === '1',
            stage: params.has('stage') ? parseInt(params.get('stage'), 10) : null,
            market: params.get('market') || null,
            panel: params.get('panel') === '1',
            chart: params.get('chart') || null,
            vedana: params.get('vedana') || null,
            path: normalizePathId(params.get('path')),
        };
    }

    function initDataPanel(dbg, startIndex) {
        if (dbg.panel === '0' || !global.KarmaDataPanel) return;
        if (dbg.chart && global.KarmaPieChart && global.KarmaPieChart.VARIANTS.indexOf(dbg.chart) >= 0) {
            global.__KARMA_CHART_VARIANT__ = dbg.chart;
        }
        var showNow = startIndex >= 2 && startIndex < 10;
        global.KarmaDataPanel.init({ showImmediately: showNow });
    }

    function wireNoteClicks() {
        global.AppEventBus.on('blocking:click-progress', function (payload) {
            if (payload && payload.current) {
                global.NoteAudio.playNote(payload.current - 1);
            }
        });
    }

    function onIntroComplete(stage0) {
        if (global.INTERACTION_COLLECTOR && !global.INTERACTION_COLLECTOR.isActive()) {
            global.INTERACTION_COLLECTOR.start();
        }
        if (stage0 && stage0.startMarketSession && !global.MarketTicker.isRunning()) {
            global.MarketTicker.start({ provider: global.__MARKET_PROVIDER__ || 'binance-ws' });
        }
        global.NoteAudio.unlock();
    }

    function afterMs(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function hintPrefetch(url, asType) {
        if (!url || !document.head) return;
        var link = document.createElement('link');
        link.rel = 'preload';
        if (asType) link.as = asType;
        if (asType === 'font') {
            link.type = 'font/ttf';
            link.crossOrigin = 'anonymous';
        }
        link.href = url;
        document.head.appendChild(link);
    }

    /** 开场前 2 秒：只做网络预取，不解析 Three / GLB / 着色器 */
    function prefetchNextStageAssets() {
        var assets = global.ASSETS_CONFIG || {};
        if (global.ThreeRegistry) {
            if (global.ThreeRegistry.prefetchR128) global.ThreeRegistry.prefetchR128();
            if (global.ThreeRegistry.prefetchP5) global.ThreeRegistry.prefetchP5();
        }
        if (assets.fonts && assets.fonts.sutra) hintPrefetch(assets.fonts.sutra, 'font');
        if (assets.bgm) hintPrefetch(assets.bgm, 'audio');
        if (global.HouseModelStage && global.HouseModelStage.prefetchModel) {
            global.HouseModelStage.prefetchModel();
        }
    }

    /** 点击解锁后：再编译后续关卡，避免抢开场动画的主线程 */
    function warmupNextStage(dbg, startIndex) {
        if (global.SutraController && global.SutraController.preloadFont) {
            global.SutraController.preloadFont();
        }
        initDataPanel(dbg, startIndex);
        preloadHouseModel();
    }

    function preloadHouseModel() {
        if (!global.HouseModelStage || !global.ThreeRegistry) return;
        global.ThreeRegistry.ensureR128().then(function () {
            global.ThreeRegistry.useR128();
            return global.HouseModelStage.ensureLoaded();
        }).catch(function (err) {
            console.warn('[App] house model preload:', err && err.message ? err.message : err);
        });
    }

    function scheduleIntroLoading(dbg, startIndex) {
        afterMs(400).then(function () {
            prefetchNextStageAssets();
        });
        /* 解析 Three / 房屋会卡住雪花，等点完开场再做 */
        global.__INTRO_WARMUP__ = function () {
            warmupNextStage(dbg, startIndex);
        };
    }

    function boot() {
        var dbg = parseDebugParams();
        if (dbg.market === 'mock') {
            global.__MARKET_PROVIDER__ = 'mock';
        }

        if (dbg.vedana === 'dukha' || dbg.vedana === 'sukha' || dbg.vedana === 'upeksha') {
            global.__VEDANA_OVERRIDE__ = dbg.vedana;
        }
        if (dbg.path) {
            global.__PATH_OVERRIDE__ = dbg.path;
        }

        var crosshair = global.CrosshairCursor.create();
        crosshair.show();

        var bgVideo = document.getElementById('globalBgVideo');
        if (bgVideo) {
            var nextBg = global.ASSETS_CONFIG && global.ASSETS_CONFIG.video && global.ASSETS_CONFIG.video.bg;
            if (nextBg && !bgVideo.currentSrc) bgVideo.src = nextBg;
            bgVideo.play().catch(function () {});
        }

        global.BgVideoController.init(bgVideo);
        global.SubtitleController.init(document.getElementById('subtitleLayer'));
        global.KarmaProgress.init(
            document.getElementById('karmaBarFill'),
            document.getElementById('karmaBarPct'),
            document.getElementById('karmaText'),
            document.getElementById('karmaHud')
        );
        global.HouseModelStage.init(document.getElementById('houseLayer'));
        global.BgmController.init(document.getElementById('ambientAudio'));
        global.IntroController.init(
            document.getElementById('introScreen'),
            document.getElementById('introSubtitleLine'),
            document.getElementById('snowflake-cursor-container')
        );
        global.IntroController.setCrosshair(crosshair);
        global.SutraController.init(document.getElementById('sutraQuoteStage'));
        if (global.FinalQuoteController) {
            global.FinalQuoteController.init(document.getElementById('finalQuoteStage'));
        }
        global.BlockingUI.init(document.getElementById('blockingLayer'));
        if (global.HouseHint) global.HouseHint.init();

        wireNoteClicks();

        var stage0 = global.STAGES_CONFIG && global.STAGES_CONFIG[0];
        var startIndex = 1;

        var jumpToStage = dbg.debug && dbg.stage != null && !isNaN(dbg.stage);
        if (!jumpToStage && dbg.path) {
            jumpToStage = true;
            dbg.stage = 11;
        }

        if (jumpToStage) {
            startIndex = Math.max(0, Math.min(dbg.stage, global.STAGES_CONFIG.length - 1));
            if (startIndex > 0) {
                document.getElementById('introScreen').hidden = true;
                crosshair.show();
            }
            console.info('[App] debug start at stage', startIndex, dbg.path ? ('path=' + dbg.path) : '');
            if (startIndex >= 2) {
                if (global.INTERACTION_COLLECTOR && !global.INTERACTION_COLLECTOR.isActive()) {
                    global.INTERACTION_COLLECTOR.start();
                }
                if (global.MarketTicker && !global.MarketTicker.isRunning()) {
                    global.MarketTicker.start({ provider: global.__MARKET_PROVIDER__ || 'binance-ws' });
                }
            }
            initDataPanel(dbg, startIndex);
            preloadHouseModel();
            if (startIndex > 0 && global.BgmController) {
                global.BgmController.startLoop();
            }
            global.ThreeRegistry.ensureR128().then(function () {
                return global.StageDirector.init({
                    dom: buildDom(crosshair),
                    crosshair: crosshair,
                    startIndex: startIndex,
                });
            });
            return;
        }

        /* 开场先跑动画；前 2 秒不能点雪花，只预取后续资源 */
        scheduleIntroLoading(dbg, startIndex);
        global.IntroController.enter().then(function () {
            onIntroComplete(stage0);
            global.IntroController.exit();
            if (typeof global.__INTRO_WARMUP__ === 'function') {
                global.__INTRO_WARMUP__();
                global.__INTRO_WARMUP__ = null;
            }
            return global.StageDirector.init({
                dom: buildDom(crosshair),
                crosshair: crosshair,
                startIndex: startIndex,
            });
        }).catch(function (err) {
            console.error('[App] boot failed', err);
        });
    }

    function buildDom(crosshair) {
        return {
            effectLayer: document.getElementById('effectLayer'),
            houseLayer: document.getElementById('houseLayer'),
            karmaWrap: document.getElementById('karmaHud'),
            karmaText: document.getElementById('karmaText'),
            blockingLayer: document.getElementById('blockingLayer'),
            subtitleLayer: document.getElementById('subtitleLayer'),
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : this);
