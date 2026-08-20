/**
 * Preta text-over-lines: four readability treatments. Preview only.
 * Recolor tab uses house point-cloud #3A6D75 plus the same AeGlow as main flow.
 */
(function (global) {
    'use strict';

    var NOTES = {
        shadow: '只动字：深色投影 + 极淡描边。特效仍是白线。',
        scrim: '字后加局部黑雾，特效还在，文字区被压暗。',
        recolor: '放射线用主流程点云色 #3A6D75，再叠同一套 AE Glow（Threshold 10 / Radius 26 / Intensity 0.7）。',
        vignette: '中间特效保持亮，左下/右上边缘压暗，字仍在原位。',
    };

    var WHITE = [255, 255, 255];
    var HOUSE_CYAN = [0x3A, 0x6D, 0x75];

    var stageEl = document.getElementById('ringStage');
    var glowStageEl = document.getElementById('glowStage');
    var statusEl = document.getElementById('pretaStatus');
    var noteEl = document.getElementById('pretaNote');
    var tabButtons = document.querySelectorAll('.preta-tabs button');
    var handle = null;
    var currentRgbKey = '';

    var glow = {
        renderer: null,
        scene: null,
        camera: null,
        mesh: null,
        texture: null,
        aeGlow: null,
        rafId: 0,
        active: false,
        bufW: 0,
        bufH: 0,
        cssW: 0,
        cssH: 0,
    };

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function rgbKey(rgb) {
        return (rgb || WHITE).join(',');
    }

    function p5Canvas() {
        return stageEl ? stageEl.querySelector('canvas') : null;
    }

    function syncGlowSize() {
        var src = p5Canvas();
        if (!src || !glow.renderer || !glow.aeGlow) return;
        var w = src.width || src.clientWidth;
        var h = src.height || src.clientHeight;
        var cssW = src.clientWidth || w;
        var cssH = src.clientHeight || h;
        if (glow.bufW === w && glow.bufH === h && glow.cssW === cssW && glow.cssH === cssH) return;
        glow.bufW = w;
        glow.bufH = h;
        glow.cssW = cssW;
        glow.cssH = cssH;
        glow.renderer.setPixelRatio(1);
        glow.renderer.setSize(w, h, false);
        glow.renderer.domElement.style.width = cssW + 'px';
        glow.renderer.domElement.style.height = cssH + 'px';
        glow.aeGlow.resize();
    }

    function bindGlowSource() {
        var src = p5Canvas();
        if (!src || !glow.mesh) return false;
        if (!glow.texture || glow.texture.image !== src) {
            if (glow.texture) glow.texture.dispose();
            glow.texture = new THREE.CanvasTexture(src);
            glow.texture.minFilter = THREE.LinearFilter;
            glow.texture.magFilter = THREE.LinearFilter;
            glow.texture.generateMipmaps = false;
            glow.texture.flipY = true;
            glow.mesh.material.map = glow.texture;
            glow.mesh.material.needsUpdate = true;
        }
        glow.texture.needsUpdate = true;
        syncGlowSize();
        return true;
    }

    function tickGlow() {
        glow.rafId = 0;
        if (!glow.active || !glow.aeGlow) return;
        if (bindGlowSource()) {
            glow.aeGlow.enabled = true;
            glow.aeGlow.render(glow.scene, glow.camera);
        }
        glow.rafId = global.requestAnimationFrame(tickGlow);
    }

    function setGlowActive(on) {
        glow.active = !!on;
        if (glowStageEl) glowStageEl.hidden = !glow.active;
        if (glow.active) {
            bindGlowSource();
            if (!glow.rafId) glow.rafId = global.requestAnimationFrame(tickGlow);
        } else if (glow.rafId) {
            global.cancelAnimationFrame(glow.rafId);
            glow.rafId = 0;
        }
    }

    function initGlow() {
        if (!global.THREE || !global.AeGlow || !glowStageEl) return false;
        if (glow.renderer) return true;
        glow.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
        glow.renderer.setClearColor(0x000000, 1);
        glow.renderer.autoClear = false;
        glowStageEl.innerHTML = '';
        glowStageEl.appendChild(glow.renderer.domElement);

        glow.scene = new THREE.Scene();
        glow.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        var PlaneGeo = THREE.PlaneBufferGeometry || THREE.PlaneGeometry;
        var mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        glow.mesh = new THREE.Mesh(new PlaneGeo(2, 2), mat);
        glow.mesh.frustumCulled = false;
        glow.scene.add(glow.mesh);

        glow.aeGlow = new global.AeGlow(glow.renderer);
        glow.aeGlow.threshold = global.AeGlow.DEFAULTS.threshold;
        glow.aeGlow.softness = global.AeGlow.DEFAULTS.softness;
        glow.aeGlow.radius = global.AeGlow.DEFAULTS.radius;
        glow.aeGlow.intensity = global.AeGlow.DEFAULTS.intensity;
        glow.aeGlow.colorize = 0;
        global.addEventListener('resize', syncGlowSize);
        return true;
    }

    function mountRing(rgb) {
        if (handle && typeof handle.dispose === 'function') {
            handle.dispose();
            handle = null;
        }
        if (stageEl) stageEl.innerHTML = '';
        if (typeof global.mountParticleRing !== 'function') {
            setStatus('特效未加载');
            return;
        }
        handle = global.mountParticleRing({
            container: stageEl,
            lineRgb: rgb || WHITE,
        });
        currentRgbKey = rgbKey(rgb || WHITE);
        bindGlowSource();
        var cyan = rgbKey(rgb || WHITE) === rgbKey(HOUSE_CYAN);
        setStatus(cyan ? '粒子环 · #3A6D75 + AE Glow' : '粒子环 · 白线');
    }

    function applyFix(fix) {
        document.body.setAttribute('data-fix', fix);
        if (noteEl) noteEl.textContent = NOTES[fix] || '';
        var want = fix === 'recolor' ? HOUSE_CYAN : WHITE;
        if (rgbKey(want) !== currentRgbKey) mountRing(want);
        setGlowActive(fix === 'recolor');
        var i;
        for (i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.toggle('is-active', tabButtons[i].getAttribute('data-fix') === fix);
        }
    }

    function start() {
        if (!global.ThreeRegistry) {
            setStatus('ThreeRegistry 未加载');
            return;
        }
        setStatus('加载 p5 / THREE…');
        Promise.all([
            global.ThreeRegistry.ensureProfile('p5'),
            global.ThreeRegistry.ensureR128(),
        ]).then(function () {
            global.ThreeRegistry.useR128();
            if (!initGlow()) throw new Error('AeGlow 未加载');
            var s = document.createElement('script');
            s.src = '../../reference/particle-ring/particle-ring-embed.js';
            s.onload = function () {
                applyFix(document.body.getAttribute('data-fix') || 'shadow');
            };
            s.onerror = function () {
                setStatus('particle-ring 加载失败');
            };
            document.head.appendChild(s);
        }).catch(function (err) {
            console.error('[PretaTextPreview]', err);
            setStatus('加载失败，请用本地 HTTP 打开');
        });
    }

    var t;
    for (t = 0; t < tabButtons.length; t++) {
        tabButtons[t].addEventListener('click', function () {
            applyFix(this.getAttribute('data-fix'));
        });
    }

    var logo = document.querySelector('#pathResolutionHud .path-res-logo');
    if (logo) {
        logo.addEventListener('error', function () {
            logo.hidden = true;
        });
    }

    start();
})(window);
