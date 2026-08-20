/**
 * After Effects Glow: extract bright pixels → blur halo → add over the image.
 * Defaults match the tuned preview: Threshold 10 / Softness 0 / Radius 26 / Intensity 0.7
 */
(function (global) {
    'use strict';

    var DEFAULTS = {
        threshold: 0.10,
        softness: 0,
        radius: 26,
        intensity: 0.7,
        colorize: 0,
    };

    function AeGlow(renderer, opts) {
        opts = opts || {};
        this.renderer = renderer;
        this.enabled = opts.enabled !== false;
        this.glowOnly = !!opts.glowOnly;
        this.threshold = opts.threshold != null ? opts.threshold : DEFAULTS.threshold;
        this.softness = opts.softness != null ? opts.softness : DEFAULTS.softness;
        this.radius = opts.radius != null ? opts.radius : DEFAULTS.radius;
        this.intensity = opts.intensity != null ? opts.intensity : DEFAULTS.intensity;
        this.colorize = opts.colorize != null ? opts.colorize : DEFAULTS.colorize;
        this.colorA = new THREE.Color(opts.colorA || 0x7ED4DE);
        this.sceneRT = null;
        this.extractRT = null;
        this.blurA = null;
        this.blurB = null;
        this.wideA = null;
        this.wideB = null;
        this._setup();
    }

    AeGlow.DEFAULTS = DEFAULTS;

    function makeRT(w, h, withDepth) {
        var rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            depthBuffer: !!withDepth,
        });
        rt.texture.generateMipmaps = false;
        return rt;
    }

    function makeFullscreenMat(fs, uniforms) {
        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: [
                'varying vec2 vUv;',
                'void main() {',
                '  vUv = uv;',
                '  gl_Position = vec4(position.xy, 0.0, 1.0);',
                '}',
            ].join('\n'),
            fragmentShader: fs,
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending,
            transparent: false,
        });
    }

    AeGlow.prototype._setup = function () {
        this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quadScene = new THREE.Scene();
        this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), new THREE.MeshBasicMaterial());
        this.quad.frustumCulled = false;
        this.quadScene.add(this.quad);

        this.extractMat = makeFullscreenMat([
            'uniform sampler2D tMap;',
            'uniform float uThreshold;',
            'uniform float uSoftness;',
            'uniform float uColorize;',
            'uniform vec3 uColorA;',
            'varying vec2 vUv;',
            'void main() {',
            '  vec4 c = texture2D(tMap, vUv);',
            '  float a = max(c.a, 0.0001);',
            '  vec3 straight = c.rgb / a;',
            '  float luma = dot(straight, vec3(0.2126, 0.7152, 0.0722));',
            '  float m;',
            '  if (uSoftness < 0.0005) m = step(uThreshold, luma);',
            '  else m = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, luma);',
            '  m *= pow(c.a, 0.55);',
            '  vec3 col = mix(straight, uColorA, step(0.5, uColorize));',
            '  gl_FragColor = vec4(col * m, m);',
            '}',
        ].join('\n'), {
            tMap: { value: null },
            uThreshold: { value: DEFAULTS.threshold },
            uSoftness: { value: DEFAULTS.softness },
            uColorize: { value: 0 },
            uColorA: { value: this.colorA },
        });

        this.blurMat = makeFullscreenMat([
            'uniform sampler2D tMap;',
            'uniform vec2 uDirection;',
            'varying vec2 vUv;',
            'void main() {',
            '  vec4 sum = vec4(0.0);',
            '  sum += texture2D(tMap, vUv - 4.0 * uDirection) * 0.016216;',
            '  sum += texture2D(tMap, vUv - 3.0 * uDirection) * 0.054054;',
            '  sum += texture2D(tMap, vUv - 2.0 * uDirection) * 0.121621;',
            '  sum += texture2D(tMap, vUv - 1.0 * uDirection) * 0.194594;',
            '  sum += texture2D(tMap, vUv) * 0.227027;',
            '  sum += texture2D(tMap, vUv + 1.0 * uDirection) * 0.194594;',
            '  sum += texture2D(tMap, vUv + 2.0 * uDirection) * 0.121621;',
            '  sum += texture2D(tMap, vUv + 3.0 * uDirection) * 0.054054;',
            '  sum += texture2D(tMap, vUv + 4.0 * uDirection) * 0.016216;',
            '  gl_FragColor = sum;',
            '}',
        ].join('\n'), {
            tMap: { value: null },
            uDirection: { value: new THREE.Vector2() },
        });

        this.copyMat = makeFullscreenMat([
            'uniform sampler2D tMap;',
            'varying vec2 vUv;',
            'void main() {',
            '  gl_FragColor = texture2D(tMap, vUv);',
            '}',
        ].join('\n'), {
            tMap: { value: null },
        });

        this.addMat = makeFullscreenMat([
            'uniform sampler2D tInner;',
            'uniform sampler2D tOuter;',
            'uniform float uIntensity;',
            'varying vec2 vUv;',
            'void main() {',
            '  vec3 inner = texture2D(tInner, vUv).rgb;',
            '  vec3 outer = texture2D(tOuter, vUv).rgb;',
            '  vec3 glow = inner * 1.8 + outer * 3.4;',
            '  vec3 rgb = glow * uIntensity;',
            '  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0);',
            '  gl_FragColor = vec4(rgb, a);',
            '}',
        ].join('\n'), {
            tInner: { value: null },
            tOuter: { value: null },
            uIntensity: { value: DEFAULTS.intensity },
        });
        this.addMat.blending = THREE.AdditiveBlending;
        this.addMat.transparent = true;
        this.addMat.premultipliedAlpha = true;
        this.addMat.depthTest = false;
        this.addMat.depthWrite = false;
    };

    AeGlow.prototype._disposeRT = function (rt) {
        if (rt) rt.dispose();
    };

    AeGlow.prototype.resize = function () {
        var renderer = this.renderer;
        if (!renderer) return;
        var size = renderer.getSize(new THREE.Vector2());
        var pr = renderer.getPixelRatio();
        var w = Math.max(2, Math.floor(size.x * pr));
        var h = Math.max(2, Math.floor(size.y * pr));
        var hw = Math.max(1, Math.floor(w / 2));
        var hh = Math.max(1, Math.floor(h / 2));
        var qw = Math.max(1, Math.floor(w / 4));
        var qh = Math.max(1, Math.floor(h / 4));

        this._disposeRT(this.sceneRT);
        this._disposeRT(this.extractRT);
        this._disposeRT(this.blurA);
        this._disposeRT(this.blurB);
        this._disposeRT(this.wideA);
        this._disposeRT(this.wideB);

        this.sceneRT = makeRT(w, h, true);
        this.extractRT = makeRT(hw, hh);
        this.blurA = makeRT(hw, hh);
        this.blurB = makeRT(hw, hh);
        this.wideA = makeRT(qw, qh);
        this.wideB = makeRT(qw, qh);

        if (renderer.outputEncoding !== undefined && this.sceneRT.texture.encoding !== undefined) {
            this.sceneRT.texture.encoding = renderer.outputEncoding;
        }
    };

    AeGlow.prototype._blit = function (mat, target) {
        this.quad.material = mat;
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
        this.renderer.render(this.quadScene, this.ortho);
    };

    AeGlow.prototype._blitScreen = function (mat, doClear) {
        this.quad.material = mat;
        this.renderer.setRenderTarget(null);
        if (doClear) this.renderer.clear();
        this.renderer.render(this.quadScene, this.ortho);
    };

    AeGlow.prototype._blurPass = function (src, ping, pong, radiusPx) {
        var texelX = 1 / pong.width;
        var texelY = 1 / pong.height;
        var dir = this.blurMat.uniforms.uDirection.value;
        this.blurMat.uniforms.tMap.value = src.texture;
        dir.set(radiusPx * texelX, 0);
        this._blit(this.blurMat, ping);
        this.blurMat.uniforms.tMap.value = ping.texture;
        dir.set(0, radiusPx * texelY);
        this._blit(this.blurMat, pong);
        this.blurMat.uniforms.tMap.value = pong.texture;
        dir.set(radiusPx * 1.65 * texelX, 0);
        this._blit(this.blurMat, ping);
        this.blurMat.uniforms.tMap.value = ping.texture;
        dir.set(0, radiusPx * 1.65 * texelY);
        this._blit(this.blurMat, pong);
    };

    AeGlow.prototype._setCopyOverlay = function (overlay) {
        if (!this.copyMat) return;
        if (overlay) {
            this.copyMat.blending = THREE.NormalBlending;
            this.copyMat.transparent = true;
            this.copyMat.premultipliedAlpha = true;
            this.copyMat.depthTest = false;
            this.copyMat.depthWrite = false;
        } else {
            this.copyMat.blending = THREE.NoBlending;
            this.copyMat.transparent = false;
            this.copyMat.premultipliedAlpha = false;
        }
    };

    AeGlow.prototype._applyGlow = function () {
        this.extractMat.uniforms.tMap.value = this.sceneRT.texture;
        this.extractMat.uniforms.uThreshold.value = this.threshold;
        this.extractMat.uniforms.uSoftness.value = this.softness;
        this.extractMat.uniforms.uColorize.value = this.colorize ? 1 : 0;
        this.extractMat.uniforms.uColorA.value.copy(this.colorA);
        this._blit(this.extractMat, this.extractRT);

        var innerR = Math.max(1.4, this.radius * 0.35);
        var outerR = Math.max(2.4, this.radius);
        this._blurPass(this.extractRT, this.blurA, this.blurB, innerR);
        this._blurPass(this.extractRT, this.wideA, this.wideB, outerR);

        this.addMat.uniforms.tInner.value = this.blurB.texture;
        this.addMat.uniforms.tOuter.value = this.wideB.texture;
        this.addMat.uniforms.uIntensity.value = this.intensity;
        this._blitScreen(this.addMat, !!this.glowOnly);
    };

    AeGlow.prototype.render = function (scene, camera, opts) {
        var renderer = this.renderer;
        var clearScreen = !opts || opts.clearScreen !== false;
        if (!renderer || !scene || !camera) return;
        if (!this.sceneRT) this.resize();

        renderer.setRenderTarget(this.sceneRT);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, camera);

        this.copyMat.uniforms.tMap.value = this.sceneRT.texture;
        this._setCopyOverlay(!clearScreen);
        this._blitScreen(this.copyMat, clearScreen);
        this._setCopyOverlay(false);

        if (!this.enabled) return;
        this._applyGlow();
    };

    AeGlow.prototype.dispose = function () {
        this._disposeRT(this.sceneRT);
        this._disposeRT(this.extractRT);
        this._disposeRT(this.blurA);
        this._disposeRT(this.blurB);
        this._disposeRT(this.wideA);
        this._disposeRT(this.wideB);
        this.sceneRT = this.extractRT = this.blurA = this.blurB = this.wideA = this.wideB = null;
        if (this.extractMat) this.extractMat.dispose();
        if (this.blurMat) this.blurMat.dispose();
        if (this.copyMat) this.copyMat.dispose();
        if (this.addMat) this.addMat.dispose();
        if (this.quad && this.quad.geometry) this.quad.geometry.dispose();
        this.renderer = null;
    };

    global.AeGlow = AeGlow;
})(typeof window !== 'undefined' ? window : this);
