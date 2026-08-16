(function (global) {
    'use strict';

    var EFFECT_DEFS = {
        'repel-particles': {
            kind: 'stage',
            threeProfile: 'p5',
            scripts: ['../reference/repel-particles/repel-particles-embed.js'],
            mountName: 'mountRepelParticles',
            needsMouseMove: false,
        },
        'noise-flow-field': {
            kind: 'path',
            threeProfile: 'r128',
            scripts: ['../reference/noise-flow-field/noise-flow-field-embed.js'],
            mountName: 'mountNoiseFlowField',
            needsMouseMove: false,
        },
        'the-spirit': {
            kind: 'path',
            threeProfile: 'r74-spirit',
            scripts: ['../reference/the-spirit/js/the-spirit-embed.js'],
            mountName: 'mountTheSpirit',
            needsMouseMove: false,
        },
        'constraint-particles': {
            kind: 'path',
            threeProfile: 'r74-spirit',
            scripts: ['../reference/constraint-particles/js/constraint-particles-embed.js'],
            mountName: 'mountConstraintParticles',
            needsMouseMove: false,
        },
        'hyper-mix': {
            kind: 'path',
            threeProfile: 'r74-hyper',
            scripts: ['../reference/hyper-mix/js/hyper-mix-embed.js'],
            mountName: 'mountHyperMix',
            needsMouseMove: false,
            beforeLoad: prepareHyperMixHost,
        },
        'particle-love': {
            kind: 'path',
            threeProfile: 'r76-love',
            scripts: ['../reference/particle-love/particle-love-embed.js'],
            mountName: 'mountParticleLove',
            needsMouseMove: false,
            beforeLoad: prepareParticleLoveHost,
        },
        'particle-ring': {
            kind: 'path',
            threeProfile: 'p5',
            scripts: ['../reference/particle-ring/particle-ring-embed.js'],
            mountName: 'mountParticleRing',
            needsMouseMove: false,
        },
        /* 登记但不挂载于 13 段主流程 */
        'mouse-black-hole': {
            kind: 'unused',
            threeProfile: 'p5',
            scripts: ['../reference/mouse-black-hole/mouse-black-hole-embed.js'],
            mountName: 'mountMouseBlackHole',
            needsMouseMove: false,
        },
    };

    var scriptLoaded = {};

    /**
     * Hyper Mix 是原版演示整包（含 dat.GUI / logo / footer）。
     * settings 在脚本执行当下读一次 location.hash；缺 .footer 会在开启动画前抛错。
     */
    function prepareHyperMixHost() {
        var hash = '#amount=524k&motionBlurQuality=high';
        if (global.history && typeof global.history.replaceState === 'function') {
            global.history.replaceState(null, '', global.location.pathname + global.location.search + hash);
        } else {
            global.location.hash = hash;
        }

        var stubs = ['mobile', 'logo', 'instruction', 'footer'];
        stubs.forEach(function (cls) {
            if (document.querySelector('.' + cls)) return;
            var el = document.createElement('div');
            el.className = cls + ' hyper-mix-host-ui';
            el.setAttribute('aria-hidden', 'true');
            if (cls === 'footer') el.appendChild(document.createElement('span'));
            document.body.appendChild(el);
        });
    }

    function prepareParticleLoveHost() {
        var base = new URL('../reference/particle-love/', global.location.href).href;
        if (base.charAt(base.length - 1) !== '/') base += '/';
        global.__PARTICLE_LOVE_BASE__ = base;
        if (global.demoList && global.demoList.length) return;
        global.demoList = [{
            id: 'tian',
            title: 'Tian',
            bgColor: '#05070a',
            urls: { low: 'about:blank', medium: 'about:blank', high: 'about:blank' },
            colors: [0x559498, 0x28394d, 0x727546, 0x643f15],
            speeds: [1.3, 0.0029, 0.83, 0.5, 3.3, 3.7],
        }];
    }

    function loadScriptOnce(src) {
        if (scriptLoaded[src]) return scriptLoaded[src];
        scriptLoaded[src] = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = false;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('Effect script failed: ' + src)); };
            document.head.appendChild(s);
        });
        return scriptLoaded[src];
    }

    function getDef(effectId) {
        return EFFECT_DEFS[effectId] || null;
    }

    function listEffectIds() {
        return Object.keys(EFFECT_DEFS);
    }

    function ensureEffectScripts(effectId) {
        var def = getDef(effectId);
        if (!def) return Promise.reject(new Error('Unknown effect: ' + effectId));
        return global.ThreeRegistry.ensureProfile(def.threeProfile).then(function () {
            global.ThreeRegistry.useProfile(def.threeProfile);
            if (typeof def.beforeLoad === 'function') def.beforeLoad();
            var chain = Promise.resolve();
            (def.scripts || []).forEach(function (src) {
                chain = chain.then(function () { return loadScriptOnce(src); });
            });
            return chain;
        });
    }

    /**
     * @param {string} effectId
     * @param {{ container: HTMLElement, onMouseMove?: function, quality?: number }} opts
     */
    function mount(effectId, opts) {
        var def = getDef(effectId);
        if (!def) return Promise.reject(new Error('Unknown effect: ' + effectId));

        return ensureEffectScripts(effectId).then(function () {
            if (def.preMount) def.preMount();
            global.ThreeRegistry.useProfile(def.threeProfile);
            var fn = global[def.mountName];
            if (typeof fn !== 'function') {
                throw new Error('Mount function missing: ' + def.mountName);
            }
            return fn(opts);
        });
    }

    function disposeHandle(handle, effectId) {
        if (handle && typeof handle.dispose === 'function') {
            handle.dispose();
        }
        var def = getDef(effectId);
        if (def) {
            global.ThreeRegistry.useR128();
        }
    }

    global.EffectRegistry = {
        getDef: getDef,
        listEffectIds: listEffectIds,
        mount: mount,
        disposeHandle: disposeHandle,
        EFFECT_DEFS: EFFECT_DEFS,
    };
})(typeof window !== 'undefined' ? window : this);
