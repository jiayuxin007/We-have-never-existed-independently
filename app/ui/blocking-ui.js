(function (global) {
    'use strict';

    var rootEl = null;
    var mode = null;
    var hintEl = null;
    var hintTimer = 0;

    function init(el) {
        rootEl = el;
        hintEl = document.getElementById('singularityHint');
    }

    function showSingularityHint() {
        if (!hintEl) hintEl = document.getElementById('singularityHint');
        if (!hintEl) return;
        hintEl.hidden = false;
        hintEl.classList.remove('is-shown');
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(function () {
            hintTimer = 0;
            if (hintEl && !hintEl.hidden) hintEl.classList.add('is-shown');
        }, 20);
    }

    function hideSingularityHint() {
        if (hintTimer) {
            clearTimeout(hintTimer);
            hintTimer = 0;
        }
        if (!hintEl) hintEl = document.getElementById('singularityHint');
        if (!hintEl) return;
        hintEl.classList.remove('is-shown');
        hintEl.hidden = true;
    }

    function clear() {
        mode = null;
        hideSingularityHint();
        if (rootEl) {
            rootEl.innerHTML = '';
            rootEl.dataset.mode = '';
            rootEl.hidden = true;
        }
    }

    function showSonar() {
        if (!rootEl) return;
        rootEl.hidden = false;
        rootEl.dataset.mode = 'sonar';
        rootEl.innerHTML =
            '<div class="blocking-sonar" aria-hidden="true">' +
                '<span class="blocking-sonar-ring"></span>' +
                '<span class="blocking-sonar-ring"></span>' +
                '<span class="blocking-sonar-ring"></span>' +
                '<span class="blocking-sonar-dot"></span>' +
            '</div>';
    }

    function showHollowCircle() {
        showSonar();
    }

    function showSixCircles(count) {
        if (!rootEl) return;
        count = count || 6;
        rootEl.hidden = false;
        rootEl.dataset.mode = 'six-circles';
        rootEl.innerHTML = '';

        var placed = [];
        var minDist = 0.12;

        for (var i = 0; i < count; i++) {
            var el = document.createElement('div');
            el.className = 'blocking-six-circle';
            el.dataset.index = String(i);

            var x = 0.15 + Math.random() * 0.7;
            var y = 0.15 + Math.random() * 0.7;
            var tries = 0;
            while (tries < 40) {
                var ok = true;
                for (var j = 0; j < placed.length; j++) {
                    var dx = x - placed[j].x;
                    var dy = y - placed[j].y;
                    if (dx * dx + dy * dy < minDist * minDist) {
                        ok = false;
                        break;
                    }
                }
                if (ok) break;
                x = 0.15 + Math.random() * 0.7;
                y = 0.15 + Math.random() * 0.7;
                tries += 1;
            }
            placed.push({ x: x, y: y });
            el.style.left = (x * 100) + '%';
            el.style.top = (y * 100) + '%';
            rootEl.appendChild(el);
        }
    }

    function removeCircle(index) {
        if (!rootEl) return;
        var el = rootEl.querySelector('.blocking-six-circle[data-index="' + index + '"]');
        if (el) el.remove();
    }

    function setMode(nextMode) {
        if (nextMode === 'hollow-circle' || nextMode === 'sonar') {
            showSonar();
            return;
        }
        if (nextMode === 'six-circles') {
            showSixCircles(6);
            return;
        }
        if (nextMode === 'snowflake') {
            if (rootEl) {
                rootEl.hidden = false;
                rootEl.dataset.mode = 'snowflake';
                rootEl.innerHTML = '';
            }
            return;
        }
        clear();
    }

    global.AppEventBus.on('blocking:ready', function (payload) {
        if (payload && payload.mode === 'click-after') {
            showSonar();
            showSingularityHint();
        }
        if (payload && payload.mode === 'sequence') {
            showSixCircles(6);
        }
    });

    global.AppEventBus.on('blocking:click-progress', function (payload) {
        if (payload && payload.current) {
            removeCircle(payload.current - 1);
        }
    });

    global.BlockingUI = {
        init: init,
        setMode: setMode,
        clear: clear,
        showHollowCircle: showHollowCircle,
        showSonar: showSonar,
        showSixCircles: showSixCircles,
    };
})(typeof window !== 'undefined' ? window : this);
