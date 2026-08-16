/**
 * 右上角数据面板
 */
(function (global) {
    'use strict';

    var Pie = global.KarmaPieChart;
    var panelEl = null;
    var logoImg = null;
    var logoFallback = null;
    var tendenciesEl = null;
    var tendenciesRealmEl = null;
    var lineVideo = null;
    var actionEl = null;
    var actionValueEl = null;
    var metricEls = {};
    var pieSvg = null;
    var barChartEl = null;
    var borderBox = null;

    var lastPathId = null;
    var pendingLogoPathId = 'ren';
    var displayedPathId = 'ren';
    var lastRaw = null;
    var actionPollId = null;
    var mediaTimerId = null;
    var fadeTimerId = null;
    var FADE_OUT_MS = 3000;

    function logoPlayIntervalMs() {
        return (global.TIMING_CONFIG && global.TIMING_CONFIG.logoPlayIntervalMs) || 5000;
    }

    function clearFadeTimer() {
        if (fadeTimerId) {
            clearTimeout(fadeTimerId);
            fadeTimerId = null;
        }
    }

    function show() {
        if (!panelEl) buildPanel();
        clearFadeTimer();
        panelEl.hidden = false;
        panelEl.classList.remove('data-panel--hidden', 'data-panel--fading');
        if (lastPathId) pendingLogoPathId = lastPathId;
        startMediaSchedule();
    }

    function hide() {
        if (!panelEl) return;
        clearFadeTimer();
        stopMediaSchedule();
        panelEl.classList.remove('data-panel--fading');
        panelEl.hidden = true;
        panelEl.classList.add('data-panel--hidden');
    }

    function fadeOut(durationMs) {
        if (!panelEl || panelEl.hidden || panelEl.classList.contains('data-panel--hidden')) return;
        if (panelEl.classList.contains('data-panel--fading')) return;
        var ms = durationMs == null ? FADE_OUT_MS : durationMs;
        panelEl.style.setProperty('--panel-fade-ms', ms + 'ms');
        panelEl.classList.add('data-panel--fading');
        fadeTimerId = setTimeout(function () {
            fadeTimerId = null;
            hide();
        }, ms);
    }

    function onStageEnter(payload) {
        var stage = payload && payload.stage;
        if (stage && stage.key === 'house-qu') {
            fadeOut(FADE_OUT_MS);
        }
    }

    function playVideoFromStart(video) {
        if (!video || !video.src) return;
        video.pause();
        try {
            video.currentTime = 0;
        } catch (e) { /* ignore seek errors */ }
        video.play().catch(function () {});
    }

    function ensureLogoReady(pathId, done) {
        if (!logoImg) {
            if (done) done();
            return;
        }
        if (logoImg.getAttribute('data-path') === pathId && logoImg.complete && logoImg.naturalWidth) {
            if (done) done();
            return;
        }
        setRealmLogo(pathId, { onReady: done });
    }

    function onMediaTick() {
        if (!panelEl || panelEl.hidden) return;
        var pathId = pendingLogoPathId || lastPathId || 'ren';
        displayedPathId = pathId;
        setTendencies(pathId);
        ensureLogoReady(pathId);
        if (lineVideo && lineVideo.src && lineVideo.readyState >= 2) {
            playVideoFromStart(lineVideo);
        }
    }

    function startMediaSchedule() {
        stopMediaSchedule();
        onMediaTick();
        mediaTimerId = setInterval(onMediaTick, logoPlayIntervalMs());
    }

    function stopMediaSchedule() {
        if (mediaTimerId) {
            clearInterval(mediaTimerId);
            mediaTimerId = null;
        }
        if (lineVideo) lineVideo.pause();
    }

    function resolveAssetPath(src) {
        if (!src || src.charAt(0) === '/') return src;
        var inPreview = global.location
            && global.location.pathname
            && global.location.pathname.indexOf('/preview/') !== -1;
        if (inPreview && src.indexOf('../assets/') === 0) {
            return '../../assets/' + src.slice('../assets/'.length);
        }
        return src;
    }

    function realmMeta(pathId) {
        var map = global.REALM_ASSETS || {};
        return map[pathId] || map.ren || { realm: 'Manusya Realm', logo: '' };
    }

    function realmLabel(name) {
        return (name || '').replace(/^The /, '');
    }

    function sentenceCase(str) {
        str = String(str || '').toLowerCase();
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatActionCode(code) {
        return sentenceCase(code || 'Stop');
    }

    function formatVol(vol) {
        if (vol == null || !isFinite(vol)) return '—';
        return (Math.round(vol * 10) / 10).toFixed(1) + '%';
    }

    function formatTurn(turn) {
        if (turn == null || !isFinite(turn)) return '—';
        return (turn * 100).toFixed(2) + '%';
    }

    function formatStab(stab) {
        if (stab == null || !isFinite(stab)) return '—';
        return stab.toFixed(2);
    }

    function formatMC(mc) {
        if (mc == null || !isFinite(mc)) return '—';
        if (mc >= 1e12) return '$' + (mc / 1e12).toFixed(2) + 'T';
        if (mc >= 1e9) return '$' + (mc / 1e9).toFixed(2) + 'B';
        if (mc >= 1e6) return '$' + (mc / 1e6).toFixed(2) + 'M';
        return '$' + Math.round(mc).toLocaleString('en-US');
    }

    function formatChange(pct) {
        if (pct == null || !isFinite(pct)) return '—';
        var sign = pct > 0 ? '+' : '';
        return sign + pct.toFixed(2) + '%';
    }

    function loadVideoWithFallback(video, sources, onSuccess, onFail, options) {
        options = options || {};
        if (!video || !sources || !sources.length) {
            if (onFail) onFail();
            return;
        }
        var index = 0;
        function tryNext() {
            if (index >= sources.length) {
                if (onFail) onFail();
                return;
            }
            video.src = sources[index];
            index += 1;
            video.load();
        }
        video.onerror = function () {
            tryNext();
        };
        video.onloadeddata = function () {
            video.onerror = null;
            video.style.opacity = '1';
            video.style.background = 'transparent';
            if (options.autoPlay) video.play().catch(function () {});
            if (onSuccess) onSuccess();
        };
        tryNext();
    }

    function setRealmLogo(pathId, options) {
        options = options || {};
        if (!pathId) return;
        var meta = realmMeta(pathId);
        if (logoFallback) {
            logoFallback.textContent = meta.key ? meta.key.charAt(0) : '?';
            logoFallback.style.setProperty('--realm-color', (Pie.PATH_META[pathId] && Pie.PATH_META[pathId].color) || '#888');
            logoFallback.hidden = true;
        }
        if (!logoImg) return;
        if (logoImg.getAttribute('data-path') === pathId && logoImg.complete && logoImg.naturalWidth) {
            logoImg.style.opacity = '1';
            if (options.onReady) options.onReady();
            return;
        }
        logoImg.setAttribute('data-path', pathId);
        logoImg.style.opacity = '0';
        logoImg.onload = function () {
            logoImg.style.opacity = '1';
            if (logoFallback) logoFallback.hidden = true;
            if (options.onReady) options.onReady();
        };
        logoImg.onerror = function () {
            logoImg.style.opacity = '0';
            if (logoFallback) logoFallback.hidden = false;
            if (options.onReady) options.onReady();
        };
        logoImg.src = resolveAssetPath(meta.logo || '');
    }

    function bindLineVideo(video) {
        if (!video) return;
        var sources = (global.REALM_ASSETS && global.REALM_ASSETS.lineFallbacks)
            ? global.REALM_ASSETS.lineFallbacks.slice()
            : [video.src];
        sources = sources.map(resolveAssetPath);
        loadVideoWithFallback(video, sources, null, function () {
            video.style.opacity = '0';
            if (video.nextElementSibling && video.nextElementSibling.classList.contains('data-panel-line-fallback')) {
                video.nextElementSibling.hidden = false;
            }
        }, { autoPlay: false });
    }

    function setTendencies(pathId) {
        if (!tendenciesRealmEl) return;
        var meta = realmMeta(pathId || lastPathId || 'ren');
        tendenciesRealmEl.textContent = realmLabel(meta.realm);
    }

    function updateMetrics(metrics, raw) {
        if (!metrics) return;
        if (metricEls.vol) {
            metricEls.vol.label.textContent = sentenceCase('Volatility factor');
            metricEls.vol.value.textContent = formatVol(metrics.Vol);
        }
        if (metricEls.turn) {
            metricEls.turn.label.textContent = sentenceCase('Turnover factor');
            metricEls.turn.value.textContent = formatTurn(metrics.Turn);
        }
        if (metricEls.stab) {
            metricEls.stab.label.textContent = sentenceCase('Stability factor');
            metricEls.stab.value.textContent = formatStab(metrics.Stab);
        }
        if (metricEls.mc && raw) {
            metricEls.mc.label.textContent = 'MARKET CAP';
            metricEls.mc.value.textContent = formatMC(raw.MC);
        }
        if (metricEls.change && raw) {
            metricEls.change.label.textContent = sentenceCase('24h change %');
            metricEls.change.value.textContent = formatChange(raw.priceChange24h);
        }
    }

    function refreshBorderBox() {
        if (!borderBox || !borderBox.refresh) return;
        requestAnimationFrame(function () {
            borderBox.refresh();
        });
    }

    function paintChart(ratios, options) {
        options = options || {};
        options.variant = options.variant
            || (global.KARMA_CHART_CONFIG && global.KARMA_CHART_CONFIG.variant)
            || Pie.DEFAULT_VARIANT;

        Pie.renderPieSvg(pieSvg, ratios, options);

        if (global.KarmaBarChart && barChartEl) {
            global.KarmaBarChart.renderBarEl(barChartEl, ratios, {
                highlightId: options.highlightId || null,
                compact: true,
            });
        }
        refreshBorderBox();
    }

    function ratiosFromPayload(payload) {
        if (payload && payload.pathTimeRatio) return payload.pathTimeRatio;
        if (!global.SIX_PATHS_ALGORITHM || !global.SIX_PATHS_ALGORITHM.getSessionSnapshot) return null;
        return Pie.ratiosFromSnapshot(global.SIX_PATHS_ALGORITHM.getSessionSnapshot());
    }

    function updateActionLine() {
        if (!actionEl) return;
        var code = global.INTERACTION_COLLECTOR && global.INTERACTION_COLLECTOR.getActionDisplay
            ? global.INTERACTION_COLLECTOR.getActionDisplay()
            : 'STOP';
        if (actionValueEl) {
            actionValueEl.textContent = formatActionCode(code);
        }
    }

    function onMarketTick(payload) {
        if (payload && payload.pathId) {
            lastPathId = payload.pathId;
            pendingLogoPathId = payload.pathId;
        }
        if (payload && payload.metrics) {
            if (payload.raw) lastRaw = payload.raw;
            updateMetrics(payload.metrics, payload.raw || lastRaw);
        }

        var snapshot = global.SIX_PATHS_ALGORITHM && global.SIX_PATHS_ALGORITHM.getSessionSnapshot
            ? global.SIX_PATHS_ALGORITHM.getSessionSnapshot()
            : null;
        var ratios = ratiosFromPayload(payload);
        var totalSec = payload && payload.sessionTotalTime
            ? payload.sessionTotalTime
            : (snapshot && snapshot.totalTime) || 0;
        paintChart(ratios, {
            centerPrimary: totalSec > 0 ? String(Math.round(totalSec)) + 's' : null,
            centerSecondary: 'live',
        });
    }

    function onFinalized(result) {
        if (!result) return;
        var finalId = result.finalPath && result.finalPath.pathId;
        if (finalId) {
            lastPathId = finalId;
            pendingLogoPathId = finalId;
            displayedPathId = finalId;
            setTendencies(finalId);
        }
        paintChart(result.pathTimeRatio || null, {
            highlightId: finalId,
            centerPrimary: finalId && realmMeta(finalId) ? realmLabel(realmMeta(finalId).realm) : null,
            centerSecondary: finalId && Pie.PATH_META[finalId] ? Pie.PATH_META[finalId].code : null,
        });
        if (result.avgMetrics) {
            updateMetrics(result.avgMetrics, lastRaw);
        }
    }

    function buildPanel() {
        panelEl = document.createElement('aside');
        panelEl.id = 'karmaDataPanel';
        panelEl.className = 'data-panel';
        panelEl.setAttribute('aria-label', 'Data panel');

        var row1 = document.createElement('div');
        row1.className = 'data-panel-row1';

        var logoWrap = document.createElement('div');
        logoWrap.className = 'data-panel-logo-wrap';

        logoImg = document.createElement('img');
        logoImg.className = 'data-panel-logo';
        logoImg.alt = '';
        logoImg.setAttribute('aria-hidden', 'true');

        logoFallback = document.createElement('span');
        logoFallback.className = 'data-panel-logo-fallback';
        logoFallback.hidden = true;

        logoWrap.appendChild(logoImg);
        logoWrap.appendChild(logoFallback);

        tendenciesEl = document.createElement('div');
        tendenciesEl.className = 'data-panel-tendencies';

        var tendenciesLabelEl = document.createElement('span');
        tendenciesLabelEl.className = 'data-panel-tendencies-label';
        tendenciesLabelEl.textContent = 'Current Tendencies:';

        tendenciesRealmEl = document.createElement('span');
        tendenciesRealmEl.className = 'data-panel-tendencies-realm';
        tendenciesRealmEl.textContent = 'Manusya Realm';

        tendenciesEl.appendChild(tendenciesLabelEl);
        tendenciesEl.appendChild(tendenciesRealmEl);

        row1.appendChild(logoWrap);
        row1.appendChild(tendenciesEl);

        lineVideo = document.createElement('video');
        lineVideo.className = 'data-panel-line';
        lineVideo.muted = true;
        lineVideo.autoplay = false;
        lineVideo.loop = false;
        lineVideo.playsInline = true;
        lineVideo.setAttribute('preload', 'auto');

        var lineFallback = document.createElement('div');
        lineFallback.className = 'data-panel-line-fallback';
        lineFallback.hidden = true;
        lineFallback.setAttribute('aria-hidden', 'true');

        actionEl = document.createElement('p');
        actionEl.className = 'data-panel-action data-panel-row-divider';
        var actionLabelEl = document.createElement('span');
        actionLabelEl.className = 'data-panel-action-label';
        actionLabelEl.textContent = 'Action';
        actionValueEl = document.createElement('span');
        actionValueEl.className = 'data-panel-action-value';
        actionValueEl.textContent = 'Stop';
        actionEl.appendChild(actionLabelEl);
        actionEl.appendChild(actionValueEl);

        var metricsWrap = document.createElement('div');
        metricsWrap.className = 'data-panel-metrics';
        var metricLabels = {
            vol: 'Volatility factor',
            turn: 'Turnover factor',
            stab: 'Stability factor',
            mc: 'MARKET CAP',
            change: '24h change %',
        };
        ['vol', 'turn', 'stab', 'mc', 'change'].forEach(function (key) {
            var p = document.createElement('p');
            p.className = 'data-panel-metric';
            if (key === 'stab' || key === 'mc') {
                p.classList.add('data-panel-row-divider');
            }
            var label = document.createElement('span');
            label.className = 'data-panel-metric-label';
            label.textContent = metricLabels[key];
            var value = document.createElement('span');
            value.className = 'data-panel-metric-value';
            value.textContent = '—';
            p.appendChild(label);
            p.appendChild(value);
            metricEls[key] = { row: p, label: label, value: value };
            metricsWrap.appendChild(p);
        });

        pieSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pieSvg.setAttribute('viewBox', '0 0 200 200');
        pieSvg.setAttribute('class', 'data-panel-pie');
        pieSvg.setAttribute('role', 'img');
        pieSvg.setAttribute('aria-label', 'Path time ratio chart');

        barChartEl = document.createElement('div');
        barChartEl.className = 'data-panel-bar-chart karma-path-bar-chart';
        barChartEl.dataset.panelBar = '1';
        barChartEl.setAttribute('aria-label', 'Path time ratio bar chart');

        var mainRow = document.createElement('div');
        mainRow.className = 'data-panel-main-row';

        var bodyCol = document.createElement('div');
        bodyCol.className = 'data-panel-body-col';
        bodyCol.appendChild(actionEl);
        bodyCol.appendChild(metricsWrap);

        var pieCol = document.createElement('div');
        pieCol.className = 'data-panel-pie-col';
        pieCol.appendChild(pieSvg);

        mainRow.appendChild(bodyCol);
        mainRow.appendChild(pieCol);

        var lineWrap = document.createElement('div');
        lineWrap.className = 'data-panel-line-wrap';
        lineWrap.appendChild(lineVideo);
        lineWrap.appendChild(lineFallback);
        bindLineVideo(lineVideo);

        var sheetEl = document.createElement('div');
        sheetEl.className = 'data-panel-sheet';

        var systemTitleEl = document.createElement('p');
        systemTitleEl.className = 'data-panel-system-title';
        systemTitleEl.textContent = '業力計算系統';
        systemTitleEl.setAttribute('aria-hidden', 'true');

        sheetEl.appendChild(systemTitleEl);
        sheetEl.appendChild(row1);
        sheetEl.appendChild(lineWrap);
        sheetEl.appendChild(mainRow);
        sheetEl.appendChild(barChartEl);

        var borderHost = document.createElement('div');
        borderHost.className = 'data-panel-border-host';
        borderHost.appendChild(sheetEl);
        panelEl.appendChild(borderHost);

        if (global.DataVBorderBox1) {
            sheetEl.classList.add('data-panel-sheet--border-box');
            borderBox = global.DataVBorderBox1.mount(borderHost, {
                colors: ['#8ECAE6', '#289786'],
                backgroundColor: 'rgba(40, 151, 134, 0.14)',
            });
        }

        document.body.appendChild(panelEl);
        panelEl.hidden = true;
        panelEl.classList.add('data-panel--hidden');

        setRealmLogo('ren');
        setTendencies('ren');
        paintChart(null, {});
    }

    function init(options) {
        options = options || {};
        if (panelEl) return;
        buildPanel();
        global.AppEventBus.on('market:tick', onMarketTick);
        global.AppEventBus.on('karma:finalized', onFinalized);
        global.AppEventBus.on('sutra:complete', show);
        global.AppEventBus.on('stage:enter', onStageEnter);
        global.AppEventBus.on('karma:finalize-start', hide);
        actionPollId = setInterval(updateActionLine, 120);
        updateActionLine();
        if (options.showImmediately) show();
    }

    function showDemo(payload) {
        if (!panelEl) buildPanel();
        payload = payload || {};
        if (payload.pathId) {
            lastPathId = payload.pathId;
            pendingLogoPathId = payload.pathId;
        }
        show();
        if (payload.metrics) updateMetrics(payload.metrics, payload.raw);
        paintChart(payload.ratios || null, payload);
    }

    global.KarmaDataPanel = {
        init: init,
        show: show,
        hide: hide,
        fadeOut: fadeOut,
        showDemo: showDemo,
        updateLive: onMarketTick,
        updateFinal: onFinalized,
    };
})(typeof window !== 'undefined' ? window : this);
