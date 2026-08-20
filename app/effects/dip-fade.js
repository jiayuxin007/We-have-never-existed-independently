/**
 * Cinematic dip-to-black: cover any layer, swap underneath, then lift.
 * Path-agnostic — same channel for all six 六道 effects.
 */
(function (global) {
    'use strict';

    var STYLE_ID = 'dip-fade-style';

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.dip-fade{position:fixed;inset:0;z-index:80;pointer-events:none;background:#000;',
            'opacity:0;display:none;}',
            '.dip-fade.is-on{display:block;}',
        ].join('');
        document.head.appendChild(s);
    }

    function easeInQuad(t) {
        return t * t;
    }

    function easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }

    function createDipFade(opts) {
        opts = opts || {};
        ensureStyle();
        var parent = opts.parent || document.body;
        var root = document.createElement('div');
        root.className = 'dip-fade';
        root.setAttribute('aria-hidden', 'true');
        parent.appendChild(root);

        var amount = 0;
        var raf = 0;

        function apply(t) {
            amount = t;
            root.style.opacity = String(Math.max(0, Math.min(1, t)));
        }

        function stopTween() {
            if (raf) {
                global.cancelAnimationFrame(raf);
                raf = 0;
            }
        }

        function tween(from, to, ms, ease, onDone) {
            stopTween();
            var dur = Math.max(1, ms || 1000);
            var t0 = performance.now();
            root.classList.add('is-on');
            apply(from);
            function step(now) {
                var u = Math.min(1, (now - t0) / dur);
                apply(from + (to - from) * ease(u));
                if (u < 1) {
                    raf = global.requestAnimationFrame(step);
                    return;
                }
                raf = 0;
                apply(to);
                if (onDone) onDone();
            }
            raf = global.requestAnimationFrame(step);
        }

        apply(0);

        return {
            el: root,
            hide: function () {
                stopTween();
                apply(0);
                root.classList.remove('is-on');
            },
            fadeToBlack: function (ms) {
                return new Promise(function (resolve) {
                    tween(amount, 1, ms == null ? 3000 : ms, easeInQuad, resolve);
                });
            },
            fadeFromBlack: function (ms) {
                return new Promise(function (resolve) {
                    tween(amount, 0, ms == null ? 3000 : ms, easeOutQuad, function () {
                        root.classList.remove('is-on');
                        resolve();
                    });
                });
            },
            dispose: function () {
                stopTween();
                if (root.parentNode) root.parentNode.removeChild(root);
            },
        };
    }

    global.createDipFade = createDipFade;
})(typeof window !== 'undefined' ? window : this);
