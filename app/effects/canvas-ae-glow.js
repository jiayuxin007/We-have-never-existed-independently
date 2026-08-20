/**
 * Composite a 2D canvas (p5 particle-ring) through the same AeGlow as the house cloud.
 * Preview + 饿鬼道主流程共用。
 */
(function (global) {
    'use strict';

    function sourceCanvas(container) {
        if (!container) return null;
        var nodes = container.querySelectorAll('canvas');
        var i;
        for (i = 0; i < nodes.length; i++) {
            if (!nodes[i].__aeGlowOverlay) return nodes[i];
        }
        return null;
    }

    function wrapCanvasAeGlow(opts) {
        opts = opts || {};
        var container = opts.container;
        var inner = opts.inner || null;
        var enabled = opts.enabled !== false;
        var glow = {
            renderer: null,
            scene: null,
            camera: null,
            mesh: null,
            texture: null,
            aeGlow: null,
            overlay: null,
            rafId: 0,
            bufW: 0,
            bufH: 0,
            cssW: 0,
            cssH: 0,
            disposed: false,
        };

        function hideSource(src, hide) {
            if (!src) return;
            src.style.opacity = hide ? '0' : '';
        }

        function syncSize(src) {
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

        function bindSource() {
            var src = sourceCanvas(container);
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
            syncSize(src);
            hideSource(src, enabled);
            return true;
        }

        function tick() {
            glow.rafId = 0;
            if (glow.disposed || !enabled || !glow.aeGlow) return;
            if (bindSource()) {
                glow.aeGlow.enabled = true;
                glow.aeGlow.render(glow.scene, glow.camera);
            }
            glow.rafId = global.requestAnimationFrame(tick);
        }

        function setEnabled(on) {
            enabled = !!on;
            if (glow.overlay) glow.overlay.hidden = !enabled;
            hideSource(sourceCanvas(container), enabled);
            if (enabled) {
                bindSource();
                if (!glow.rafId) glow.rafId = global.requestAnimationFrame(tick);
            } else if (glow.rafId) {
                global.cancelAnimationFrame(glow.rafId);
                glow.rafId = 0;
            }
        }

        function dispose() {
            if (glow.disposed) return;
            glow.disposed = true;
            setEnabled(false);
            global.removeEventListener('resize', onResize);
            if (glow.aeGlow && glow.aeGlow.dispose) glow.aeGlow.dispose();
            if (glow.texture && glow.texture.dispose) glow.texture.dispose();
            if (glow.mesh) {
                if (glow.mesh.material) glow.mesh.material.dispose();
                if (glow.mesh.geometry) glow.mesh.geometry.dispose();
            }
            if (glow.renderer) {
                glow.renderer.dispose();
                if (glow.renderer.domElement && glow.renderer.domElement.parentNode) {
                    glow.renderer.domElement.parentNode.removeChild(glow.renderer.domElement);
                }
            }
            if (glow.overlay && glow.overlay.parentNode) {
                glow.overlay.parentNode.removeChild(glow.overlay);
            }
            glow.renderer = glow.scene = glow.camera = glow.mesh = glow.texture = glow.aeGlow = glow.overlay = null;
            if (inner && typeof inner.dispose === 'function') inner.dispose();
        }

        function onResize() {
            if (enabled) bindSource();
        }

        if (!container) return { dispose: dispose, setEnabled: setEnabled };
        if (!global.THREE || !global.AeGlow) {
            console.error('wrapCanvasAeGlow: THREE / AeGlow required');
            return inner || { dispose: dispose, setEnabled: setEnabled };
        }

        glow.overlay = document.createElement('div');
        glow.overlay.className = 'canvas-ae-glow';
        glow.overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;background:#000;z-index:1;';
        container.style.position = container.style.position || 'relative';
        container.appendChild(glow.overlay);

        glow.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
        glow.renderer.setClearColor(0x000000, 1);
        glow.renderer.autoClear = false;
        glow.renderer.domElement.__aeGlowOverlay = true;
        glow.overlay.appendChild(glow.renderer.domElement);

        glow.scene = new THREE.Scene();
        glow.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        var PlaneGeo = THREE.PlaneBufferGeometry || THREE.PlaneGeometry;
        glow.mesh = new THREE.Mesh(new PlaneGeo(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        glow.mesh.frustumCulled = false;
        glow.scene.add(glow.mesh);

        glow.aeGlow = new global.AeGlow(glow.renderer);
        glow.aeGlow.threshold = global.AeGlow.DEFAULTS.threshold;
        glow.aeGlow.softness = global.AeGlow.DEFAULTS.softness;
        glow.aeGlow.radius = global.AeGlow.DEFAULTS.radius;
        glow.aeGlow.intensity = global.AeGlow.DEFAULTS.intensity;
        glow.aeGlow.colorize = 0;

        global.addEventListener('resize', onResize);
        setEnabled(enabled);

        return { dispose: dispose, setEnabled: setEnabled };
    }

    global.wrapCanvasAeGlow = wrapCanvasAeGlow;
})(typeof window !== 'undefined' ? window : this);
