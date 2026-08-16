/**
 * 六道 Path Time Ratio — 多风格 SVG 图（作品 UI 共用）
 * variant: arc | orbital | whisper | donut
 */
(function (global) {
    'use strict';

    var PATH_ORDER = ['tian', 'ren', 'xiuluo', 'chusheng', 'egui', 'diyu'];
    var DEFAULT_VARIANT = (global.KARMA_CHART_CONFIG && global.KARMA_CHART_CONFIG.variant) || 'orbital';

    var PATH_META = {
        tian:     { label: 'Deva Realm',    cn: '天道',   cnMark: '天', code: 'Ether_Frictionless', color: '#E8C547', glow: 'rgba(232,197,71,0.32)' },
        ren:      { label: 'Manusya Realm', cn: '人道',   cnMark: '人', code: 'Dynamic_Balance',    color: '#4A9BE8', glow: 'rgba(74,155,232,0.30)' },
        xiuluo:   { label: 'Asura Realm',   cn: '修羅道', cnMark: '修', code: 'Conflict_Mesh',      color: '#E53935', glow: 'rgba(229,57,53,0.32)' },
        chusheng: { label: 'Tiryag Realm',  cn: '畜生道', cnMark: '畜', code: 'Closed_Loop',        color: '#5CB85C', glow: 'rgba(92,184,92,0.30)' },
        egui:     { label: 'Preta Realm',   cn: '餓鬼道', cnMark: '餓', code: 'Void_Implosion',     color: '#9B6BD6', glow: 'rgba(155,107,214,0.32)' },
        diyu:     { label: 'Naraka Realm',  cn: '地獄道', cnMark: '獄', code: 'Frozen_Constraint',  color: '#F08A3A', glow: 'rgba(240,138,58,0.32)' },
    };

    var CX = 100;
    var CY = 100;

    function pct(n) {
        return (Math.round(n * 1000) / 10).toFixed(1) + '%';
    }

    function polar(cx, cy, r, angleRad) {
        return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
    }

    function arcPath(cx, cy, r, a0, a1) {
        if (a1 - a0 < 0.002) return '';
        var p0 = polar(cx, cy, r, a0);
        var p1 = polar(cx, cy, r, a1);
        var large = a1 - a0 > Math.PI ? 1 : 0;
        return ['M', p0.x, p0.y, 'A', r, r, 0, large, 1, p1.x, p1.y].join(' ');
    }

    function donutSector(cx, cy, ro, ri, a0, a1) {
        if (a1 - a0 < 0.002) return '';
        var o0 = polar(cx, cy, ro, a0);
        var o1 = polar(cx, cy, ro, a1);
        var i1 = polar(cx, cy, ri, a1);
        var i0 = polar(cx, cy, ri, a0);
        var large = a1 - a0 > Math.PI ? 1 : 0;
        return [
            'M', o0.x, o0.y,
            'A', ro, ro, 0, large, 1, o1.x, o1.y,
            'L', i1.x, i1.y,
            'A', ri, ri, 0, large, 0, i0.x, i0.y,
            'Z',
        ].join(' ');
    }

    function segmentOpacity(id, highlightId, active, dim) {
        active = active != null ? active : 0.72;
        dim = dim != null ? dim : 0.28;
        if (!highlightId) return String(active - 0.12);
        return highlightId === id ? String(active) : String(dim);
    }

    function dominantFromRatios(ratios) {
        var dominantId = null;
        var dominantVal = -1;
        PATH_ORDER.forEach(function (id) {
            var value = ratios[id] || 0;
            if (value > dominantVal) {
                dominantVal = value;
                dominantId = id;
            }
        });
        return { id: dominantId, val: dominantVal };
    }

    function setCenterLabel(svg, primary, secondary) {
        var existing = svg.querySelector('.karma-pie-center');
        if (existing) existing.remove();

        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'karma-pie-center');

        var t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t1.setAttribute('x', String(CX));
        t1.setAttribute('y', String(CY - 2));
        t1.setAttribute('text-anchor', 'middle');
        t1.setAttribute('class', 'karma-pie-center-primary');
        t1.textContent = primary || '—';

        var t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t2.setAttribute('x', String(CX));
        t2.setAttribute('y', String(CY + 14));
        t2.setAttribute('text-anchor', 'middle');
        t2.setAttribute('class', 'karma-pie-center-secondary');
        t2.textContent = secondary || '';

        g.appendChild(t1);
        g.appendChild(t2);
        svg.appendChild(g);
    }

    function drawTrackRing(svg, r, strokeWidth, opacity) {
        var track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        track.setAttribute('cx', String(CX));
        track.setAttribute('cy', String(CY));
        track.setAttribute('r', String(r));
        track.setAttribute('fill', 'none');
        track.setAttribute('stroke', 'rgba(255,255,255,' + (opacity || 0.05) + ')');
        track.setAttribute('stroke-width', String(strokeWidth));
        svg.appendChild(track);
    }

    function resolveCenter(ratios, options, dominant) {
        var cp = options.centerPrimary;
        var cs = options.centerSecondary;
        if (!cp && dominant.id) {
            cp = pct(dominant.val);
            cs = PATH_META[dominant.id].code;
        }
        setCenterLabel(options.svg, cp, cs);
    }

    /* —— Arc：细线分离环（shadcn separated / Apple Watch 风）—— */
    function renderArc(svg, ratios, options) {
        var highlightId = options.highlightId || null;
        var R = 72;
        var SW = 5;
        var GAP = 0.055;
        drawTrackRing(svg, R, SW, 0.045);

        var start = -Math.PI / 2;
        PATH_ORDER.forEach(function (id) {
            var value = ratios[id] || 0;
            if (value <= 0.0001) return;
            var sweep = Math.max(0, value * Math.PI * 2 - GAP);
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', arcPath(CX, CY, R, start + GAP * 0.5, start + sweep));
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', PATH_META[id].color);
            path.setAttribute('stroke-width', String(SW));
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-opacity', segmentOpacity(id, highlightId, 0.82, 0.22));
            path.setAttribute('class', 'karma-pie-segment' + (highlightId === id ? ' is-final' : ''));
            svg.appendChild(path);
            start += value * Math.PI * 2;
        });
    }

    /* —— Orbital：轨道节点（抽象六道轮）—— */
    function renderOrbital(svg, ratios, options) {
        var highlightId = options.highlightId || null;
        var R = 74;
        drawTrackRing(svg, R, 1, 0.07);

        var start = -Math.PI / 2;
        PATH_ORDER.forEach(function (id) {
            var value = ratios[id] || 0;
            if (value <= 0.0001) return;
            var sweep = value * Math.PI * 2;
            var a0 = start;
            var a1 = start + sweep;
            var mid = (a0 + a1) * 0.5;

            var arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arc.setAttribute('d', arcPath(CX, CY, R, a0 + 0.02, a1 - 0.02));
            arc.setAttribute('fill', 'none');
            arc.setAttribute('stroke', PATH_META[id].color);
            arc.setAttribute('stroke-width', '1.5');
            arc.setAttribute('stroke-opacity', segmentOpacity(id, highlightId, 0.55, 0.14));
            arc.setAttribute('class', 'karma-pie-segment');
            svg.appendChild(arc);

            var dotR = 2.2 + value * 7;
            var dot = polar(CX, CY, R, mid);
            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', String(dot.x));
            circle.setAttribute('cy', String(dot.y));
            circle.setAttribute('r', String(dotR));
            circle.setAttribute('fill', PATH_META[id].color);
            circle.setAttribute('fill-opacity', segmentOpacity(id, highlightId, 0.88, 0.25));
            circle.setAttribute('class', 'karma-pie-node' + (highlightId === id ? ' is-final' : ''));
            svg.appendChild(circle);

            start += sweep;
        });
    }

    /* —— Whisper：双线刻度环（极简仪表）—— */
    function renderWhisper(svg, ratios, options) {
        var highlightId = options.highlightId || null;
        var R_OUT = 78;
        var R_IN = 66;
        drawTrackRing(svg, R_OUT, 1.2, 0.06);
        drawTrackRing(svg, R_IN, 0.8, 0.04);

        var start = -Math.PI / 2;
        PATH_ORDER.forEach(function (id) {
            var value = ratios[id] || 0;
            if (value <= 0.0001) return;
            var sweep = value * Math.PI * 2;
            var a0 = start;
            var a1 = start + sweep;

            var seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            seg.setAttribute('d', arcPath(CX, CY, R_OUT, a0 + 0.015, a1 - 0.015));
            seg.setAttribute('fill', 'none');
            seg.setAttribute('stroke', PATH_META[id].color);
            seg.setAttribute('stroke-width', '2.2');
            seg.setAttribute('stroke-linecap', 'butt');
            seg.setAttribute('stroke-opacity', segmentOpacity(id, highlightId, 0.65, 0.18));
            svg.appendChild(seg);

            var tick0 = polar(CX, CY, R_IN - 3, a0);
            var tick1 = polar(CX, CY, R_IN + 3, a0);
            var tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', String(tick0.x));
            tick.setAttribute('y1', String(tick0.y));
            tick.setAttribute('x2', String(tick1.x));
            tick.setAttribute('y2', String(tick1.y));
            tick.setAttribute('stroke', PATH_META[id].color);
            tick.setAttribute('stroke-width', '1');
            tick.setAttribute('stroke-opacity', segmentOpacity(id, highlightId, 0.5, 0.12));
            svg.appendChild(tick);

            start += sweep;
        });
    }

    /* —— Donut：填充环（旧版，保留对比）—— */
    function renderDonut(svg, ratios, options) {
        var highlightId = options.highlightId || null;
        var R_OUT = 86;
        var R_IN = 58;
        var GAP = 0.028;
        drawTrackRing(svg, (R_OUT + R_IN) / 2, R_OUT - R_IN, 0.06);

        var start = -Math.PI / 2;
        PATH_ORDER.forEach(function (id) {
            var value = ratios[id] || 0;
            if (value <= 0.0001) return;
            var sweep = Math.max(0, value * Math.PI * 2 - GAP);
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', donutSector(CX, CY, R_OUT, R_IN, start + GAP * 0.5, start + sweep));
            path.setAttribute('fill', PATH_META[id].color);
            path.setAttribute('fill-opacity', segmentOpacity(id, highlightId, 0.58, 0.22));
            path.setAttribute('class', 'karma-pie-segment' + (highlightId === id ? ' is-final' : ''));
            svg.appendChild(path);
            start += value * Math.PI * 2;
        });
    }

    var RENDERERS = {
        arc: renderArc,
        orbital: renderOrbital,
        whisper: renderWhisper,
        donut: renderDonut,
    };

    var VARIANT_LABELS = {
        arc: 'Arc · 细线分离环',
        orbital: 'Orbital · 轨道节点',
        whisper: 'Whisper · 双线刻度',
        donut: 'Donut · 填充环',
    };

    function renderPieSvg(svg, ratios, options) {
        options = options || {};
        var variant = options.variant || DEFAULT_VARIANT;
        var render = RENDERERS[variant] || RENDERERS.arc;

        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute('data-variant', variant);

        if (!ratios) {
            drawTrackRing(svg, 72, 5, 0.045);
            setCenterLabel(svg, '—', 'awaiting signal');
            return;
        }

        render(svg, ratios, options);

        var dominant = dominantFromRatios(ratios);
        options.svg = svg;
        resolveCenter(ratios, options, dominant);
    }

    function renderLegendEl(legendEl, ratios, highlightId, legendOptions) {
        if (!legendEl) return;
        legendOptions = legendOptions || {};
        var layout = legendOptions.layout || 'rows';
        legendEl.innerHTML = '';
        legendEl.classList.remove('karma-panel-legend--pills', 'karma-panel-legend--grid');
        if (layout === 'pills') legendEl.classList.add('karma-panel-legend--pills');
        if (layout === 'grid') legendEl.classList.add('karma-panel-legend--grid');

        PATH_ORDER.forEach(function (id) {
            var meta = PATH_META[id];
            var ratio = ratios ? (ratios[id] || 0) : 0;
            var row = document.createElement('div');
            row.className = 'karma-panel-legend-row';
            if (ratio <= 0.0001) row.classList.add('is-zero');
            if (highlightId && highlightId === id) row.classList.add('is-final');

            var swatch = document.createElement('span');
            swatch.className = 'karma-panel-swatch';
            swatch.style.setProperty('--swatch', meta.color);
            swatch.style.setProperty('--swatch-glow', meta.glow);

            var text = document.createElement('span');
            text.className = 'karma-panel-legend-text';
            if (layout === 'grid') {
                text.textContent = meta.label;
            } else if (layout === 'pills') {
                text.textContent = meta.cn + ' ' + pct(ratio);
            } else {
                text.textContent = meta.label + ' · ' + pct(ratio);
            }

            var code = document.createElement('span');
            code.className = 'karma-panel-legend-code';
            if (layout === 'grid') {
                code.textContent = pct(ratio);
            } else if (layout === 'pills') {
                code.textContent = meta.code;
            } else {
                code.textContent = meta.cn + ' · ' + meta.code;
            }

            row.appendChild(swatch);
            row.appendChild(text);
            if (layout !== 'pills') row.appendChild(code);
            legendEl.appendChild(row);
        });
    }

    function ratiosFromSnapshot(snapshot) {
        if (!snapshot || !snapshot.timeInPath) return null;
        var total = snapshot.totalTime || 0;
        if (total <= 0) return null;
        var out = {};
        PATH_ORDER.forEach(function (id) {
            out[id] = (snapshot.timeInPath[id] || 0) / total;
        });
        return out;
    }

    global.KarmaPieChart = {
        PATH_ORDER: PATH_ORDER,
        PATH_META: PATH_META,
        VARIANTS: Object.keys(RENDERERS),
        VARIANT_LABELS: VARIANT_LABELS,
        DEFAULT_VARIANT: DEFAULT_VARIANT,
        pct: pct,
        renderPieSvg: renderPieSvg,
        renderLegendEl: renderLegendEl,
        ratiosFromSnapshot: ratiosFromSnapshot,
    };
})(typeof window !== 'undefined' ? window : this);
