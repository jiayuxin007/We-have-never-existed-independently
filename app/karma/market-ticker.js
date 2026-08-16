(function (global) {
    'use strict';

    /**
     * 行情采样：推送驱动（与 MyProject test-stream.html 一致）
     * - 默认 binance-ws：Binance @ticker 推一条 → tickFromStream 一次，dt = 距上条的实际秒数
     * - mock：模拟稀疏推送，本地调试
     * 不使用定时 REST 轮询；推送间隔可能很长，由 dt 自然反映停留权重
     */
    var running = false;
    var provider = 'binance-ws';
    var ws = null;
    var lastPathId = null;
    var lastTs = null;
    var mockTimerId = null;
    var tickCount = 0;

    function getMarketConfig() {
        var cfg = (global.ASSETS_CONFIG && global.ASSETS_CONFIG.market) || {};
        return {
            symbol: (cfg.binanceSymbol || 'btcusdt').toLowerCase(),
            circulatingSupply: cfg.circulatingSupply || 19900000,
            wsBase: cfg.wsBase || 'wss://stream.binance.com:9443/ws/',
        };
    }

    function getUserSummary() {
        if (global.INTERACTION_COLLECTOR && global.INTERACTION_COLLECTOR.isActive()) {
            return global.INTERACTION_COLLECTOR.getSummary();
        }
        return null;
    }

    function handleStreamTick(raw, dtSeconds) {
        if (!running || typeof SIX_PATHS_ALGORITHM === 'undefined') return;

        var dt = Math.max(0.001, dtSeconds || 1);
        var summary = getUserSummary();
        var result = SIX_PATHS_ALGORITHM.tickFromStream(raw, null, dt, summary);
        var snapshot = SIX_PATHS_ALGORITHM.getSessionSnapshot();
        var pathTimeRatio = null;
        if (snapshot && snapshot.totalTime > 0 && snapshot.timeInPath) {
            pathTimeRatio = {};
            for (var key in snapshot.timeInPath) {
                pathTimeRatio[key] = snapshot.timeInPath[key] / snapshot.totalTime;
            }
        }

        tickCount += 1;
        lastPathId = result && result.path ? result.path.pathId : lastPathId;
        global.AppEventBus.emit('market:tick', {
            provider: provider,
            dt: dt,
            tickCount: tickCount,
            pathId: result && result.path ? result.path.pathId : null,
            path: result && result.path ? result.path : null,
            metrics: result && result.metrics ? result.metrics : null,
            raw: result && result.raw ? result.raw : null,
            pathTimeRatio: pathTimeRatio,
            sessionTotalTime: snapshot ? snapshot.totalTime : 0,
        });
    }

    function parseBinanceTicker(data) {
        var P = parseFloat(data.c);
        var H = parseFloat(data.h);
        var L = parseFloat(data.l);
        var V = parseFloat(data.q);
        var priceChange24h = parseFloat(data.P);
        var supply = getMarketConfig().circulatingSupply;
        var MC = supply * P;
        return { P: P, V: V, MC: MC, H: H, L: L, priceChange24h: priceChange24h };
    }

    function onWsMessage(evt) {
        var now = Date.now();
        var dt = lastTs ? (now - lastTs) / 1000 : 1;
        lastTs = now;

        try {
            var data = JSON.parse(evt.data);
            handleStreamTick(parseBinanceTicker(data), dt);
        } catch (err) {
            console.warn('[MarketTicker] parse message failed', err);
            global.AppEventBus.emit('market:tick-error', { error: err });
        }
    }

    function startBinanceWs() {
        var cfg = getMarketConfig();
        var url = cfg.wsBase + cfg.symbol + '@ticker';

        lastTs = null;
        tickCount = 0;

        SIX_PATHS_ALGORITHM.startSession(cfg.symbol.toUpperCase());

        ws = new WebSocket(url);

        ws.onopen = function () {
            global.AppEventBus.emit('market:connected', { provider: 'binance-ws', symbol: cfg.symbol });
        };

        ws.onmessage = onWsMessage;

        ws.onerror = function () {
            global.AppEventBus.emit('market:tick-error', { error: new Error('WebSocket error') });
        };

        ws.onclose = function () {
            ws = null;
            global.AppEventBus.emit('market:disconnected', { provider: 'binance-ws' });
        };
    }

    function scheduleMockPush() {
        if (!running || provider !== 'mock') return;
        var delay = 1500 + Math.random() * 3500;
        mockTimerId = setTimeout(function () {
            if (!running) return;
            var now = Date.now();
            var dt = lastTs ? (now - lastTs) / 1000 : 1;
            lastTs = now;

            handleStreamTick({
                P: 60000 + Math.random() * 1000,
                V: 2e10,
                MC: 1.2e12,
                H: 61000,
                L: 59000,
                priceChange24h: (Math.random() - 0.5) * 10,
            }, dt);

            scheduleMockPush();
        }, delay);
    }

    function startMock() {
        lastTs = null;
        tickCount = 0;
        SIX_PATHS_ALGORITHM.startSession('MOCK');
        scheduleMockPush();
    }

    function start(opts) {
        opts = opts || {};
        if (running) return;

        provider = opts.provider || 'binance-ws';
        running = true;

        if (typeof SIX_PATHS_ALGORITHM === 'undefined') {
            console.warn('[MarketTicker] SIX_PATHS_ALGORITHM not loaded');
            running = false;
            return;
        }

        if (provider === 'mock') {
            startMock();
            return;
        }

        startBinanceWs();
    }

    function stop() {
        running = false;
        lastTs = null;

        if (mockTimerId) {
            clearTimeout(mockTimerId);
            mockTimerId = null;
        }

        if (ws) {
            try { ws.close(); } catch (e) { /* ignore */ }
            ws = null;
        }
    }

    function isRunning() {
        return running;
    }

    function getTickCount() {
        return tickCount;
    }

    function getLastPathId() {
        return lastPathId;
    }

    global.MarketTicker = {
        start: start,
        stop: stop,
        isRunning: isRunning,
        getTickCount: getTickCount,
        getLastPathId: getLastPathId,
    };
})(typeof window !== 'undefined' ? window : this);
