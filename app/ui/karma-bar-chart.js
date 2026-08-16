/**
 * 六道 Path Time Ratio — 横向条形图（预览 / 面板可选）
 */
(function (global) {
    'use strict';

    var Pie = global.KarmaPieChart;
    var PATH_ORDER = Pie.PATH_ORDER;
    var PATH_META = Pie.PATH_META;
    var pct = Pie.pct;

    function realmLogoSrc(pathId) {
        var assets = global.REALM_ASSETS;
        if (!assets || !assets[pathId] || !assets[pathId].logo) return '';
        return assets[pathId].logo;
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

    function replayIconVideos() { /* logos are static PNG */ }

    function pauseIconVideos() { /* logos are static PNG */ }

    function startIconSchedule() { /* logos are static PNG */ }

    function stopIconSchedule() { /* logos are static PNG */ }

    function createBarIcon(pathId) {
        var icon = document.createElement('div');
        icon.className = 'karma-path-bar-icon';

        var src = resolveAssetPath(realmLogoSrc(pathId));
        if (!src) return icon;

        var img = document.createElement('img');
        img.className = 'karma-path-bar-icon-media';
        img.alt = '';
        img.setAttribute('data-path', pathId);
        img.setAttribute('aria-hidden', 'true');
        img.onerror = function () {
            img.hidden = true;
        };
        img.src = src;

        icon.appendChild(img);
        return icon;
    }

    function updateBarRow(row, id, ratio, options) {
        var value = ratio || 0;
        var widthPct = Math.max(value > 0 ? 4 : 0, Math.round(value * 1000) / 10);

        row.classList.toggle('is-zero', value <= 0.0001);
        row.classList.toggle('is-final', !!(options.highlightId && options.highlightId === id));

        var pctEl = row.querySelector('.karma-path-bar-pct');
        if (pctEl) pctEl.textContent = pct(value);

        var fill = row.querySelector('.karma-path-bar-fill');
        if (fill) fill.style.width = widthPct + '%';
    }

    function applyBarClasses(container, options, ratios) {
        var isPanelBar = container.dataset.panelBar === '1'
            || container.classList.contains('data-panel-bar-chart');
        container.className = 'karma-path-bar-chart'
            + (isPanelBar ? ' data-panel-bar-chart' : '')
            + (options.compact ? ' karma-path-bar-chart--compact' : '')
            + (options.highlightId ? ' karma-path-bar-chart--final' : '');
        container.classList.toggle('karma-path-bar-chart--empty', !ratios);
    }

    function updateBarEl(container, ratios, options) {
        if (!container) return;
        options = options || {};
        applyBarClasses(container, options, ratios);

        var rows = container.querySelectorAll('.karma-path-bar-row');
        for (var i = 0; i < rows.length; i += 1) {
            var row = rows[i];
            var id = row.getAttribute('data-path');
            if (id) updateBarRow(row, id, ratios ? ratios[id] : 0, options);
        }
    }

    function renderBarRow(id, ratio, options) {
        var meta = PATH_META[id];
        var value = ratio || 0;
        var widthPct = Math.max(value > 0 ? 4 : 0, Math.round(value * 1000) / 10);

        var row = document.createElement('div');
        row.className = 'karma-path-bar-row';
        row.setAttribute('data-path', id);
        if (value <= 0.0001) row.classList.add('is-zero');
        if (options.highlightId && options.highlightId === id) row.classList.add('is-final');

        var icon = createBarIcon(id);

        var cn = document.createElement('span');
        cn.className = 'karma-path-bar-cn';
        cn.textContent = meta.cnMark || meta.cn.charAt(0);
        cn.setAttribute('aria-hidden', 'true');

        var body = document.createElement('div');
        body.className = 'karma-path-bar-body';

        var head = document.createElement('div');
        head.className = 'karma-path-bar-head';

        var name = document.createElement('span');
        name.className = 'karma-path-bar-name';
        name.textContent = meta.label;

        var pctEl = document.createElement('span');
        pctEl.className = 'karma-path-bar-pct';
        pctEl.textContent = pct(value);

        head.appendChild(name);
        head.appendChild(pctEl);

        var track = document.createElement('div');
        track.className = 'karma-path-bar-track';
        track.setAttribute('role', 'presentation');

        var fill = document.createElement('div');
        fill.className = 'karma-path-bar-fill';
        fill.style.width = widthPct + '%';
        fill.style.setProperty('--bar-color', meta.color);
        fill.style.setProperty('--bar-glow', meta.glow);

        var dot = document.createElement('span');
        dot.className = 'karma-path-bar-dot';
        fill.appendChild(dot);

        track.appendChild(fill);
        body.appendChild(head);
        body.appendChild(track);

        row.appendChild(icon);
        row.appendChild(cn);
        row.appendChild(body);
        return row;
    }

    function renderBarEl(container, ratios, options) {
        if (!container) return;
        options = options || {};

        if (container.querySelector('.karma-path-bar-grid')) {
            updateBarEl(container, ratios, options);
            return;
        }

        container.innerHTML = '';
        applyBarClasses(container, options, ratios);
        container.setAttribute('role', 'img');
        container.setAttribute('aria-label', 'Path time ratio bar chart');

        var grid = document.createElement('div');
        grid.className = 'karma-path-bar-grid';

        PATH_ORDER.forEach(function (id, index) {
            var row = renderBarRow(id, ratios ? ratios[id] : 0, options);
            row.style.gridColumn = String((index % 2) + 1);
            row.style.gridRow = String(Math.floor(index / 2) + 1);
            grid.appendChild(row);
        });

        container.appendChild(grid);
    }

    global.KarmaBarChart = {
        renderBarEl: renderBarEl,
        updateBarEl: updateBarEl,
        replayIconVideos: replayIconVideos,
        pauseIconVideos: pauseIconVideos,
        startIconSchedule: startIconSchedule,
        stopIconSchedule: stopIconSchedule,
    };
})(typeof window !== 'undefined' ? window : this);
