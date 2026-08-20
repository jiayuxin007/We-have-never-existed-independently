/**
 * Circular iris wipe: hole shrinks to a point (black), then opens again.
 * Path-agnostic overlay — sit it above any 六道 effect layer.
 */
(function (global) {
    'use strict';

    var STYLE_ID = 'iris-wipe-style';

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.iris-wipe{position:fixed;inset:0;z-index:80;pointer-events:none;overflow:hidden;display:none;}',
            '.iris-wipe.is-on{display:block;}',
            '.iris-wipe-hole{position:absolute;left:50%;top:50%;border-radius:50%;',
            'background:transparent;transform:translate(-50%,-50%) scale(1);',
            'box-shadow:0 0 56px 8px #000,0 0 0 300vmax #000;will-change:transform;}',
            '.iris-wipe-seed{position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;',
            'border-radius:50%;background:#d8ecee;opacity:0;box-shadow:0 0 10px 4px rgba(58,109,117,.9),0 0 28px 10px rgba(58,109,117,.45);}',
            '.iris-wipe-caption{position:absolute;left:50%;top:50%;width:min(42em,78vw);transform:translate(-50%,-50%);',
            'margin:0;text-align:center;font-family:SiteFont,serif;font-size:clamp(20px,3.2vw,30px);letter-spacing:2px;line-height:1.8;',
            'color:rgba(255,255,255,.9);text-shadow:0 0 18px rgba(0,0,0,.9),0 0 15px rgba(255,255,255,.35);',
            'opacity:0;transition:opacity 1.1s ease;}',
            '.iris-wipe-caption.is-shown{opacity:1;}',
        ].join('');
        document.head.appendChild(s);
    }

    function holePx() {
        return Math.hypot(global.innerWidth || 1, global.innerHeight || 1) * 1.2;
    }

    function easeInCubic(t) {
        return t * t * t;
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function createIrisWipe(opts) {
        opts = opts || {};
        ensureStyle();
        var parent = opts.parent || document.body;
        var root = document.createElement('div');
        root.className = 'iris-wipe';
        root.setAttribute('aria-hidden', 'true');
        var hole = document.createElement('div');
        hole.className = 'iris-wipe-hole';
        var seed = document.createElement('div');
        seed.className = 'iris-wipe-seed';
        var caption = document.createElement('p');
        caption.className = 'iris-wipe-caption';
        root.appendChild(hole);
        root.appendChild(seed);
        root.appendChild(caption);
        parent.appendChild(root);

        var open = 1;
        var raf = 0;

        function apply(t) {
            open = t;
            var size = holePx();
            hole.style.width = size + 'px';
            hole.style.height = size + 'px';
            hole.style.transform = 'translate(-50%,-50%) scale(' + Math.max(0, t) + ')';
            var seedOn = t < 0.12 ? (0.12 - t) / 0.12 : 0;
            seed.style.opacity = String(Math.max(0, Math.min(1, seedOn)));
        }

        function stopTween() {
            if (raf) {
                global.cancelAnimationFrame(raf);
                raf = 0;
            }
        }

        function tween(from, to, ms, ease, onDone) {
            stopTween();
            var dur = Math.max(1, ms || 800);
            var t0 = performance.now();
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

        apply(1);

        return {
            el: root,
            getOpen: function () { return open; },
            show: function () {
                root.classList.add('is-on');
                apply(open);
            },
            hide: function () {
                caption.classList.remove('is-shown');
                root.classList.remove('is-on');
            },
            setCaption: function (text) {
                caption.textContent = text || '';
            },
            showCaption: function () {
                caption.classList.add('is-shown');
            },
            hideCaption: function () {
                caption.classList.remove('is-shown');
            },
            collapse: function (ms) {
                return new Promise(function (resolve) {
                    root.classList.add('is-on');
                    tween(open, 0, ms == null ? 900 : ms, easeInCubic, resolve);
                });
            },
            expand: function (ms) {
                return new Promise(function (resolve) {
                    root.classList.add('is-on');
                    tween(open, 1, ms == null ? 1100 : ms, easeOutCubic, function () {
                        caption.classList.remove('is-shown');
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

    global.createIrisWipe = createIrisWipe;
})(typeof window !== 'undefined' ? window : this);
