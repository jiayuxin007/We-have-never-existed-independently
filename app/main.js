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

    function preloadHouseModel() {
        if (!global.HouseModelStage || !global.ThreeRegistry) return;
        global.ThreeRegistry.ensureR128().then(function () {
            global.ThreeRegistry.useR128();
            return global.HouseModelStage.ensureLoaded();
        }).catch(function (err) {
            console.warn('[App] house model preload:', err && err.message ? err.message : err);
        });
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
            if (global.ASSETS_CONFIG && global.ASSETS_CONFIG.video) {
                bgVideo.src = global.ASSETS_CONFIG.video.bg;
            }
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
        preloadHouseModel();
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

        /* 与 MyProject 一致：enter 内 bootIntro，点雪花后再进 stage 1+ */
        initDataPanel(dbg, startIndex);
        global.IntroController.enter().then(function () {
            onIntroComplete(stage0);
            global.IntroController.exit();
            return global.ThreeRegistry.ensureR128();
        }).then(function () {
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
