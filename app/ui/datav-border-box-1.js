/**
 * DataV BorderBox1 — vanilla JS port.
 * Source: @jiaminghi/data-view (MIT) · http://datav.jiaminghi.com/guide/borderBox.html
 */
(function (global) {
    'use strict';

    var DEFAULT_COLOR = ['#4fd2dd', '#235fa7'];
    var CORNERS = ['left-top', 'right-top', 'left-bottom', 'right-bottom'];

    function mergeColor(color) {
        color = color || [];
        return [
            color[0] || DEFAULT_COLOR[0],
            color[1] || DEFAULT_COLOR[1],
        ];
    }

    function bgPolygonPoints(w, h) {
        return [
            '10, 27',
            '10, ' + (h - 27),
            '13, ' + (h - 24),
            '13, ' + (h - 21),
            '24, ' + (h - 11),
            '38, ' + (h - 11),
            '41, ' + (h - 8),
            '73, ' + (h - 8),
            '75, ' + (h - 10),
            '81, ' + (h - 10),
            '85, ' + (h - 6),
            (w - 85) + ', ' + (h - 6),
            (w - 81) + ', ' + (h - 10),
            (w - 75) + ', ' + (h - 10),
            (w - 73) + ', ' + (h - 8),
            (w - 41) + ', ' + (h - 8),
            (w - 38) + ', ' + (h - 11),
            (w - 24) + ', ' + (h - 11),
            (w - 13) + ', ' + (h - 21),
            (w - 13) + ', ' + (h - 24),
            (w - 10) + ', ' + (h - 27),
            (w - 10) + ', 27',
            (w - 13) + ', 25',
            (w - 13) + ', 21',
            (w - 24) + ', 11',
            (w - 38) + ', 11',
            (w - 41) + ', 8',
            (w - 73) + ', 8',
            (w - 75) + ', 10',
            (w - 81) + ', 10',
            (w - 85) + ', 6',
            '85, 6',
            '81, 10',
            '75, 10',
            '73, 8',
            '41, 8',
            '38, 11',
            '24, 11',
            '13, 21',
            '13, 24',
        ].join(' ');
    }

    function cornerSvgMarkup(colors, durS) {
        durS = durS || 5;
        var dur = durS + 's';
        var c0 = colors[0];
        var c1 = colors[1];
        var ease = ' calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"';
        return (
            '<polygon fill="' + c0 + '" points="6,66 6,18 12,12 18,12 24,6 27,6 30,9 36,9 39,6 84,6 81,9 75,9 73.2,7 40.8,7 37.8,10.2 24,10.2 12,21 12,24 9,27 9,51 7.8,54 7.8,63">' +
            '<animate attributeName="fill" values="' + c0 + ';' + c1 + ';' + c0 + '" dur="' + dur + '" begin="0s" repeatCount="indefinite"' + ease + '/></polygon>' +
            '<polygon fill="' + c1 + '" points="27.6,4.8 38.4,4.8 35.4,7.8 30.6,7.8">' +
            '<animate attributeName="fill" values="' + c1 + ';' + c0 + ';' + c1 + '" dur="' + dur + '" begin="0s" repeatCount="indefinite"' + ease + '/></polygon>' +
            '<polygon fill="' + c0 + '" opacity="0.72" points="9,54 9,63 7.2,66 7.2,75 7.8,78 7.8,110 8.4,110 8.4,66 9.6,66 9.6,54">' +
            '<animate attributeName="opacity" values="0.35;0.95;0.35" dur="' + dur + '" begin="0s" repeatCount="indefinite"' + ease + '/></polygon>'
        );
    }

    function mount(container, options) {
        if (!container) return null;
        options = options || {};

        var colors = mergeColor(options.color || options.colors);
        var backgroundColor = options.backgroundColor || 'transparent';
        var animDurS = options.animationDurS;
        if (animDurS == null && global.TIMING_CONFIG && global.TIMING_CONFIG.logoPlayIntervalMs) {
            animDurS = global.TIMING_CONFIG.logoPlayIntervalMs / 1000;
        }
        if (animDurS == null) animDurS = 5;

        function paintCorners() {
            cornerSvgs.forEach(function (svg) {
                svg.innerHTML = cornerSvgMarkup(colors, animDurS);
            });
        }

        var root = document.createElement('div');
        root.className = 'dv-border-box-1';

        var mainSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        mainSvg.setAttribute('class', 'border dv-border-box-1-main');

        var mainPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        mainPoly.setAttribute('fill', backgroundColor);
        mainSvg.appendChild(mainPoly);

        var cornerSvgs = CORNERS.map(function (corner) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '150');
            svg.setAttribute('height', '150');
            svg.setAttribute('class', corner + ' border dv-border-box-1-corner');
            svg.innerHTML = cornerSvgMarkup(colors, animDurS);
            return svg;
        });

        var content = document.createElement('div');
        content.className = 'border-box-content';

        while (container.firstChild) {
            content.appendChild(container.firstChild);
        }

        root.appendChild(mainSvg);
        cornerSvgs.forEach(function (svg) {
            root.appendChild(svg);
        });
        root.appendChild(content);
        container.appendChild(root);

        function updateColors(nextColors) {
            colors = mergeColor(nextColors);
            paintCorners();
        }

        function restartAnimations() {
            /* 连续循环即可，勿每 tick 重置，否则会「突然弹回」 */
        }

        var lastW = 0;
        var lastH = 0;
        var sizeAnimId = null;
        var SIZE_TRANSITION_MS = 480;

        function applySize(w, h) {
            mainSvg.setAttribute('width', String(Math.round(w)));
            mainSvg.setAttribute('height', String(Math.round(h)));
            mainPoly.setAttribute('points', bgPolygonPoints(w, h));
        }

        function smoothstep(t) {
            return t * t * (3 - 2 * t);
        }

        function updateSize(immediate) {
            var targetW = container.clientWidth || 430;
            var targetH = container.clientHeight || 505;

            if (immediate || !lastW || !lastH) {
                if (sizeAnimId) {
                    cancelAnimationFrame(sizeAnimId);
                    sizeAnimId = null;
                }
                applySize(targetW, targetH);
                lastW = targetW;
                lastH = targetH;
                return;
            }

            if (Math.abs(targetW - lastW) < 1 && Math.abs(targetH - lastH) < 1) {
                return;
            }

            var startW = lastW;
            var startH = lastH;
            var startTime = performance.now();

            if (sizeAnimId) cancelAnimationFrame(sizeAnimId);

            function step(now) {
                var t = Math.min(1, (now - startTime) / SIZE_TRANSITION_MS);
                var eased = smoothstep(t);
                var w = startW + (targetW - startW) * eased;
                var h = startH + (targetH - startH) * eased;
                applySize(w, h);
                if (t < 1) {
                    sizeAnimId = requestAnimationFrame(step);
                } else {
                    lastW = targetW;
                    lastH = targetH;
                    sizeAnimId = null;
                }
            }

            sizeAnimId = requestAnimationFrame(step);
        }

        updateSize(true);

        var resizeObserver = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateSize);
            resizeObserver.observe(container);
        } else {
            global.addEventListener('resize', updateSize);
        }

        return {
            root: root,
            refresh: updateSize,
            restartAnimations: restartAnimations,
            setColors: updateColors,
            setBackgroundColor: function (color) {
                backgroundColor = color || 'transparent';
                mainPoly.setAttribute('fill', backgroundColor);
            },
            destroy: function () {
                if (sizeAnimId) cancelAnimationFrame(sizeAnimId);
                if (resizeObserver) resizeObserver.disconnect();
                else global.removeEventListener('resize', updateSize);
                if (root.parentNode) root.parentNode.removeChild(root);
            },
        };
    }

    global.DataVBorderBox1 = {
        mount: mount,
        DEFAULT_COLOR: DEFAULT_COLOR.slice(),
    };
})(typeof window !== 'undefined' ? window : this);
