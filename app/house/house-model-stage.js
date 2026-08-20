(function (global) {
    'use strict';

    var containerEl = null;
    var onMouseMoveCb = null;

    var scene = null;
    var camera = null;
    var renderer = null;
    var aeGlow = null;
    var controls = null;
    var modelRoot = null;
    var targetMesh = null;
    var meshBaseMaterial = null;
    var extraHouseMeshes = [];
    var points = null;
    var pointsMaterial = null;
    var originalPositions = null;
    var randomOffsets = null;
    var fadeDelay = null;
    var fadeInvMat = null;
    var fadeUp = null;
    var fadeSnapX = null;
    var fadeSnapY = null;
    var fadeSnapZ = null;
    var fadePeeling = null;
    var fadeFromPhase = false;
    var phaseTime = 0;
    var phaseAmp = 0;
    var pointCount = 0;

    var rafId = 0;
    var clock = null;
    var mode = null;
    var modeElapsed = 0;
    var modeDuration = 5;
    var loaded = false;
    var loadPromise = null;
    var cachedGltf = null;
    var suspended = false;
    var expandComplete = false;
    var pointsReady = false;
    var animTime = 0;
    var idleEffectsStartTime = 0;
    var baseCameraDistance = 0;
    var canvasReady = false;
    var canvasSizeW = 0;
    var canvasSizeH = 0;
    var houseMaxDim = 10;
    var liuruNodes = null;
    var liuruOverlay = null;
    var liuruComplete = false;
    var liuruPointer = { down: false, x: 0, y: 0 };
    var cloudShocks = null;
    var cloudShockSlot = 0;
    var cloudPickVec = null;
    var mouseNDC = { x: -2, y: -2 };
    var mouseWorld = null;
    var shouKind = 'sukha';
    var shouContact = { x: 0, y: 0, z: 0 };
    var sweepMinY = -2;
    var sweepMaxY = 2;
    var holoPhase = 0;
    var COL_HOUSE = 0x3A6D75;
    /** Ripple / slice rim / shockwave — warm orange vs teal house cloud */
    var COL_FX_R = 1.0;
    var COL_FX_G = 0.478;
    var COL_FX_B = 0.157;
    var AI_FORM_S = 6.5;
    var AI_CAM_S = 5.5;
    var AI_CONTRACT_S = 1.8;
    /** 屏上直径 / min(宽,高)；与开头排斥球 SPHERE_RATIO=0.16（半径）对齐，故直径 0.32 */
    var AI_SCREEN_RATIO = 0.32;
    var AI_SCREEN_LIFT_PX = 0;
    var AI_RADIUS_MUL = 0.11;
    var AI_ATTRACTION = 0.045;
    var AI_DAMPING = 0.76;
    var AI_REPEL_STRENGTH = 28;
    var AI_REPEL_RATIO = 90 / 250;
    var AI_ANGLE_STEP = 0.01;
    var aiSphereRadius = 0;
    var aiCamStart = 0;
    var aiCamFromPX = 0;
    var aiCamFromPY = 0;
    var aiCamFromPZ = 0;
    var aiCamFromTargetX = 0;
    var aiCamFromTargetY = 0;
    var aiCamFromTargetZ = 0;
    var aiCamFromReady = false;
    var aiAngle = 0;
    var aiPosX = null;
    var aiPosY = null;
    var aiFromX = null;
    var aiFromY = null;
    var aiFromLX = null;
    var aiFromLY = null;
    var aiFromLZ = null;
    var aiFromReady = false;
    var aiVelX = null;
    var aiVelY = null;
    var aiRight = null;
    var aiUp = null;
    var aiCenter = null;
    var aiScratch = null;
    var modelRootBaseY = 0;
    var AI_LIFT_START_S = 0;
    var AI_LIFT_S = 8;
    var AI_LIFT_MUL = 0.16;

    /** 识：按老项目开场，一点 → 完整贴图模型（2.4s），随后保持实体慢转 */
    var INTRO_EXPAND_S = 2.4;
    /** 名色：贴图溶边消失 + 点云切片显现，再收成稳定房屋点云 */
    var MINGSE_HOLD_S = 0.8;
    var MINGSE_DUAL_S = 6.4;
    var MINGSE_SETTLE_S = 1.0;
    var MINGSE_PULL_AMP = 0.08;
    var MINGSE_RESTORE = 0.015;
    var GLSL_VNOISE = [
        'float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
        'float vnoise(vec2 p) {',
        '  vec2 i = floor(p);',
        '  vec2 f = fract(p);',
        '  vec2 u = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);',
        '}',
        'float houseStripe(vec3 p, float freq) {',
        '  float f = max(freq, 0.08) * 10.0;',
        '  float wobble = vnoise(vec2(p.x * freq * 0.85 + 2.4, p.z * freq * 0.85 + 7.1));',
        '  float bands = 0.5 + 0.5 * sin(p.y * f + wobble * 1.65);',
        '  float grain = vnoise(vec2(p.y * f * 0.35, wobble * 3.0));',
        '  return clamp(mix(bands, grain, 0.18), 0.0, 1.0);',
        '}',
    ].join('\n');
    var dissolveUniforms = {
        uDissolve: { value: 0 },
        uEdgeWidth: { value: 0.12 },
        uSliceCut: { value: -999 },
        uSliceMesh: { value: 0 },
        uSliceSoft: { value: 0.25 },
        uNoiseFreq: { value: 0.4 },
        uPeel: { value: 0 },
        uOpacity: { value: 1 },
    };

    /** 与老项目 model-morph-32s-embed 一致 */
    var MODEL_ROTATE_Y = 0.0008;
    var MODEL_YAW0 = Math.PI;
    /** 展开完成后模型整体呼吸缩放（±幅度，sin 周期） */
    var BREATH_SPEED = 0.5;
    var BREATH_AMPLITUDE = 0.035;
    /** 相机沿视线方向缓慢推拉（相对初始距离的比例） */
    var DOLLY_SPEED = 0.32;
    var DOLLY_MIN = 0.9;
    var DOLLY_MAX = 1.1;

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function smootherstep(t) {
        t = Math.min(1, Math.max(0, t));
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function easeOut(t) {
        t = Math.min(1, Math.max(0, t));
        return 1 - Math.pow(1 - t, 2.4);
    }

    function lerp(a, b, t) {
        return a + (b - a) * Math.min(1, Math.max(0, t));
    }

    function fract(x) {
        return x - Math.floor(x);
    }

    function buildModelUrls() {
        var cfg = global.ASSETS_CONFIG && global.ASSETS_CONFIG.model;
        var rel = (cfg && cfg.house) ? cfg.house : '../assets/models/less_25mb.glb';
        var absolute = '';
        try {
            absolute = new URL(rel, global.location.href).toString();
        } catch (err) {}
        var urls = [];
        if (absolute) urls.push(absolute);
        if (rel && urls.indexOf(rel) < 0) urls.push(rel);
        return urls;
    }

    var HOUSE_MODEL_LOADER_VERSION = 27;
    var gpuWarmed = false;
    var TEXTURE_MAX = 4096;
    var prefetchPromise = null;
    var prefetchedBuffer = null;
    var prefetchedUrl = '';

    function prefetchModel() {
        if (prefetchedBuffer) return Promise.resolve(prefetchedBuffer);
        if (prefetchPromise) return prefetchPromise;
        var url = (buildModelUrls()[0] || '');
        if (!url) {
            prefetchPromise = Promise.resolve();
            return prefetchPromise;
        }
        if (global.document && !global.document.querySelector('link[rel="preload"][href="' + url + '"]')) {
            var link = global.document.createElement('link');
            link.rel = 'preload';
            link.as = 'fetch';
            link.href = url;
            global.document.head.appendChild(link);
        }
        prefetchPromise = fetch(url).then(function (res) {
            if (!res.ok) throw new Error('House model HTTP ' + res.status);
            return res.arrayBuffer();
        }).then(function (buf) {
            prefetchedBuffer = buf;
            prefetchedUrl = url;
            console.info('[HouseModel] prefetched', (buf.byteLength / 1048576).toFixed(1) + 'MB');
            return buf;
        }).catch(function (err) {
            prefetchPromise = null;
            console.warn('[HouseModel] prefetch failed', err);
        });
        return prefetchPromise;
    }

    function parseGltfBuffer(buffer, url) {
        return new Promise(function (resolve, reject) {
            if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader !== 'function') {
                reject(new Error('THREE.GLTFLoader not available'));
                return;
            }
            var loader = new THREE.GLTFLoader();
            if (typeof loader.setCrossOrigin === 'function') loader.setCrossOrigin('anonymous');
            var path = String(url || '').replace(/[^/]+$/, '');
            loader.parse(buffer, path, function (gltf) {
                console.info('[HouseModel] v' + HOUSE_MODEL_LOADER_VERSION + ' parse', url);
                resolve(gltf);
            }, function (err) {
                reject(err || new Error('GLTF parse failed'));
            });
        });
    }

    function loadFromNetwork(urls) {
        return new Promise(function (resolve, reject) {
            if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader !== 'function') {
                reject(new Error('THREE.GLTFLoader not available'));
                return;
            }
            var loader = new THREE.GLTFLoader();
            if (typeof loader.setCrossOrigin === 'function') loader.setCrossOrigin('anonymous');
            var index = 0;
            var lastErr = null;
            function tryNext() {
                if (index >= urls.length) {
                    reject(lastErr || new Error('Model load failed'));
                    return;
                }
                var url = urls[index++];
                loader.load(url, function (gltf) {
                    console.info('[HouseModel] v' + HOUSE_MODEL_LOADER_VERSION + ' GLTFLoader', url);
                    resolve(gltf);
                }, undefined, function (err) {
                    lastErr = err;
                    console.warn('[HouseModel] load retry', url, err);
                    tryNext();
                });
            }
            tryNext();
        });
    }

    function loadModelWithFallback(urls) {
        if (prefetchedBuffer) return parseGltfBuffer(prefetchedBuffer, prefetchedUrl || urls[0]);
        return Promise.resolve(prefetchPromise || prefetchModel()).then(function () {
            if (prefetchedBuffer) return parseGltfBuffer(prefetchedBuffer, prefetchedUrl || urls[0]);
            return loadFromNetwork(urls);
        });
    }

    function capColorMap(texture) {
        if (!texture || !texture.image) return Promise.resolve(texture);
        var img = texture.image;
        var w = img.width || 0;
        var h = img.height || 0;
        if (!w || !h || Math.max(w, h) <= TEXTURE_MAX) return Promise.resolve(texture);
        var scale = TEXTURE_MAX / Math.max(w, h);
        var tw = Math.max(1, Math.round(w * scale));
        var th = Math.max(1, Math.round(h * scale));

        function applyImage(source) {
            texture.image = source;
            texture.needsUpdate = true;
            console.info('[HouseModel] texture cap', w + 'x' + h, '→', tw + 'x' + th);
            return texture;
        }

        if (typeof createImageBitmap === 'function') {
            return createImageBitmap(img, {
                resizeWidth: tw,
                resizeHeight: th,
                resizeQuality: 'medium',
                colorSpaceConversion: 'none',
            }).then(applyImage);
        }

        var canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        canvas.getContext('2d').drawImage(img, 0, 0, tw, th);
        return Promise.resolve(applyImage(canvas));
    }

    function paintBlankHouseFrame() {
        if (!renderer || !scene || !camera) return;
        syncMeshMaterialOpacity(0);
        if (points) points.visible = false;
        if (pointsMaterial && pointsMaterial.uniforms.uPointAlpha) {
            pointsMaterial.uniforms.uPointAlpha.value = 0;
        }
        renderer.setClearColor(0x000000, 0);
        renderer.clear(true, true, true);
        renderHouse();
    }

    function warmupGpu() {
        if (gpuWarmed || !renderer || !scene || !camera || !targetMesh) return;
        syncMeshMaterialOpacity(1);
        try {
            if (typeof renderer.compile === 'function') renderer.compile(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(scene, camera);
        } catch (err) {
            console.warn('[HouseModel] gpu warmup', err);
        }
        paintBlankHouseFrame();
        gpuWarmed = true;
    }

    function coverHouseLayer() {
        if (!containerEl) return;
        containerEl.hidden = false;
        containerEl.style.visibility = 'hidden';
    }

    function revealHouseLayer() {
        if (!containerEl) return;
        containerEl.hidden = false;
        containerEl.style.visibility = '';
    }

    function showLoading() {
        if (!containerEl) return;
        containerEl.innerHTML = '<div class="house-stage-placeholder house-stage-loading">Loading model…</div>';
    }

    function clearLoading() {
        if (!containerEl) return;
        var el = containerEl.querySelector('.house-stage-loading');
        if (el) el.remove();
    }

    function ensureRenderer() {
        if (renderer) return;
        scene = new THREE.Scene();
        clock = new THREE.Clock();

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        if (renderer.debug) renderer.debug.checkShaderErrors = true;
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        renderer.autoClear = false;
        if (renderer.outputEncoding !== undefined) {
            renderer.outputEncoding = THREE.sRGBEncoding;
        }
        if (THREE.ACESFilmicToneMapping) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }
        containerEl.innerHTML = '';
        containerEl.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        var dir = new THREE.DirectionalLight(0xffffff, 0.95);
        dir.position.set(5, 8, 6);
        scene.add(dir);
        var fill = new THREE.DirectionalLight(0xc8d4ff, 0.28);
        fill.position.set(-4, 2, -3);
        scene.add(fill);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.autoRotate = false;

        global.addEventListener('resize', onResize);
        global.addEventListener('pointermove', onMouseMove);
        renderer.domElement.addEventListener('pointerdown', onLiuruPointerDown);
        renderer.domElement.addEventListener('pointerup', onLiuruPointerUp);
        onResize();
        if (global.AeGlow) {
            aeGlow = new global.AeGlow(renderer);
            aeGlow.resize();
        }
    }

    function meshOpacityOf(mat) {
        if (!mat) return 0;
        if (Array.isArray(mat)) {
            var best = 0;
            var i;
            for (i = 0; i < mat.length; i++) {
                if (mat[i] && mat[i].opacity > best) best = mat[i].opacity;
            }
            return best;
        }
        return mat.opacity || 0;
    }

    function meshIsShowing() {
        if (targetMesh && targetMesh.visible && meshOpacityOf(targetMesh.material) > 0.04) return true;
        var i;
        for (i = 0; i < extraHouseMeshes.length; i++) {
            var mesh = extraHouseMeshes[i];
            if (mesh && mesh.visible && meshOpacityOf(mesh.material) > 0.04) return true;
        }
        return false;
    }

    function pointsAreShowing() {
        if (!points || !points.visible || !pointsMaterial) return false;
        var alpha = pointsMaterial.uniforms.uPointAlpha;
        return !alpha || alpha.value > 0.02;
    }

    function hideHouseMeshes() {
        var saved = [];
        if (targetMesh) {
            saved.push({ mesh: targetMesh, visible: targetMesh.visible });
            targetMesh.visible = false;
        }
        var i;
        for (i = 0; i < extraHouseMeshes.length; i++) {
            var mesh = extraHouseMeshes[i];
            if (!mesh) continue;
            saved.push({ mesh: mesh, visible: mesh.visible });
            mesh.visible = false;
        }
        return saved;
    }

    function restoreHouseMeshes(saved) {
        if (!saved) return;
        var i;
        for (i = 0; i < saved.length; i++) {
            saved[i].mesh.visible = saved[i].visible;
        }
    }

    function aeGlowAllowed() {
        if (suspended) return false;
        if (mode === 'expand') return false;
        if (mode === 'ring-flow') return false;
        return pointsAreShowing();
    }

    function renderHouse() {
        if (!renderer || !scene || !camera) return;
        if (!aeGlow) {
            renderer.setRenderTarget(null);
            renderer.setClearColor(0x000000, 0);
            renderer.clear();
            renderer.render(scene, camera);
            return;
        }
        var meshOn = meshIsShowing();
        var cloudOn = pointsAreShowing();
        var glowOn = aeGlowAllowed();
        if (meshOn && cloudOn && glowOn && points) {
            var ptsVis = points.visible;
            points.visible = false;
            aeGlow.enabled = false;
            aeGlow.render(scene, camera);
            points.visible = ptsVis;
            var savedMeshes = hideHouseMeshes();
            aeGlow.enabled = true;
            aeGlow.render(scene, camera, { clearScreen: false });
            restoreHouseMeshes(savedMeshes);
            return;
        }
        aeGlow.enabled = glowOn && !meshOn;
        aeGlow.render(scene, camera);
    }

    function setupFromGltf(gltf) {
        cachedGltf = gltf;
        if (gltf.scene && gltf.scene.parent) {
            gltf.scene.parent.remove(gltf.scene);
        }
        if (modelRoot) {
            scene.remove(modelRoot);
            modelRoot = null;
        }
        targetMesh = null;
        meshBaseMaterial = null;
        extraHouseMeshes = [];
        points = null;
        originalPositions = null;

        modelRoot = new THREE.Group();
        scene.add(modelRoot);
        modelRoot.add(gltf.scene);

        gltf.scene.traverse(function (child) {
            if (!child.isMesh) return;
            var src = firstGltfMaterial(child.material);
            var mat = cloneHouseLookMaterial(src, 0);
            child.material = mat;
            attachDissolveToMaterial(mat);
            child.frustumCulled = false;
            child.visible = false;
            if (!targetMesh) {
                targetMesh = child;
                meshBaseMaterial = mat;
            } else {
                extraHouseMeshes.push(child);
            }
        });

        if (!targetMesh) throw new Error('No mesh in GLB');

        var geom = targetMesh.geometry;
        if (!geom.attributes.uv) {
            geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geom.attributes.position.count * 2), 2));
        }
        var pos = geom.attributes.position;
        originalPositions = new Float32Array(pos.array.length);
        originalPositions.set(pos.array);
        pointCount = pos.count;
        computeShouContact();
        randomOffsets = new Float32Array(originalPositions.length);
        for (var ri = 0; ri < randomOffsets.length; ri++) {
            randomOffsets[ri] = (Math.random() * 2 - 1) * 1.2;
        }
        mouseWorld = new THREE.Vector3();

        var pGeom = new THREE.BufferGeometry();
        var posAttr = new THREE.BufferAttribute(originalPositions.slice(), 3);
        posAttr.dynamic = true;
        pGeom.setAttribute('position', posAttr);
        var sizeScale = new Float32Array(pointCount);
        for (var si = 0; si < pointCount; si++) sizeScale[si] = 1;
        pGeom.setAttribute('aSizeScale', new THREE.BufferAttribute(sizeScale, 1));

        pointsMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 },
                uPointSize: { value: 0.012 },
                uPointAlpha: { value: 0 },
                uGlow: { value: 1.0 },
                uColor: { value: new THREE.Color(COL_HOUSE) },
                uColorB: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                uAccent: { value: 0 },
                uBloom: { value: 0 },
                uSweepY: { value: -10 },
                uSweepWidth: { value: 0.45 },
                uSweepColor: { value: new THREE.Vector3(COL_FX_R, COL_FX_G, COL_FX_B) },
                uSweepStrength: { value: 0 },
                uSweepBoost: { value: 1 },
                uMouse: { value: new THREE.Vector3(0, 0, 0) },
                uMouseRadius: { value: 2.0 },
                uRipple: { value: 0 },
                uWaveSpeed: { value: 8.0 },
                uWaveWidth: { value: 0.42 },
                uW0: { value: new THREE.Vector3() },
                uW1: { value: new THREE.Vector3() },
                uW2: { value: new THREE.Vector3() },
                uW3: { value: new THREE.Vector3() },
                uW4: { value: new THREE.Vector3() },
                uW5: { value: new THREE.Vector3() },
                uA0: { value: 99.0 },
                uA1: { value: 99.0 },
                uA2: { value: 99.0 },
                uA3: { value: 99.0 },
                uA4: { value: 99.0 },
                uA5: { value: 99.0 },
                uL0: { value: 0.0 },
                uL1: { value: 0.0 },
                uL2: { value: 0.0 },
                uL3: { value: 0.0 },
                uL4: { value: 0.0 },
                uL5: { value: 0.0 },
                uSliceOn: { value: 0 },
                uSliceCut: { value: -999 },
                uSliceRim: { value: 0.12 },
                uSliceNoise: { value: 0 },
                uDissolve: { value: 0 },
                uNoiseFreq: { value: 0.4 },
                uPeelAmp: { value: 0.08 },
                uShockKick: { value: 0.22 },
                uHoloOn: { value: 0 },
                uHoloY: { value: 0 },
                uHoloWidth: { value: 0.18 },
                uHoloKick: { value: 0.04 },
            },
            vertexShader: [
                'attribute float aSizeScale;',
                'uniform float uPointSize;',
                'uniform float uPointAlpha;',
                'uniform float uGlow;',
                'uniform vec3 uMouse;',
                'uniform float uMouseRadius;',
                'uniform float uRipple;',
                'uniform float uBloom;',
                'uniform float uSweepY;',
                'uniform float uSweepWidth;',
                'uniform float uSweepBoost;',
                'uniform float uWaveSpeed;',
                'uniform float uWaveWidth;',
                'uniform float uSliceOn;',
                'uniform float uSliceCut;',
                'uniform float uSliceRim;',
                'uniform float uSliceNoise;',
                'uniform float uDissolve;',
                'uniform float uNoiseFreq;',
                'uniform float uPeelAmp;',
                'uniform float uShockKick;',
                'uniform float uTime;',
                'uniform float uHoloOn;',
                'uniform float uHoloY;',
                'uniform float uHoloWidth;',
                'uniform float uHoloKick;',
                'uniform vec3 uW0; uniform vec3 uW1; uniform vec3 uW2;',
                'uniform vec3 uW3; uniform vec3 uW4; uniform vec3 uW5;',
                'uniform float uA0; uniform float uA1; uniform float uA2;',
                'uniform float uA3; uniform float uA4; uniform float uA5;',
                'uniform float uL0; uniform float uL1; uniform float uL2;',
                'uniform float uL3; uniform float uL4; uniform float uL5;',
                'varying float vGlow;',
                'varying float vSweep;',
                'varying float vReveal;',
                'varying float vRipple;',
                'varying float vHolo;',
                GLSL_VNOISE,
                'float bandOf(vec3 pos, vec3 origin, float age) {',
                '  float dist = length(pos - origin);',
                '  float radius = age * uWaveSpeed;',
                '  float band = 1.0 - smoothstep(0.0, uWaveWidth, abs(dist - radius));',
                '  float fade = 1.0 - smoothstep(0.0, 1.45, age);',
                '  return band * fade;',
                '}',
                'float revealOf(vec3 pos, vec3 origin, float age, float lit) {',
                '  float dist = length(pos - origin);',
                '  float radius = age * uWaveSpeed;',
                '  float inside = 1.0 - smoothstep(radius - uWaveWidth, radius + uWaveWidth * 0.35, dist);',
                '  float halo = exp(-dist * 0.12) * 0.28;',
                '  return lit * max(inside * 0.7, halo);',
                '}',
                'void main() {',
                '  if (uPointAlpha < 0.001 || aSizeScale < 0.02) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
                '  vec3 pos = position;',
                '  float edge = 0.0;',
                '  float sliceRim = 0.0;',
                '  float sliceVis = 1.0;',
                '  if (uSliceOn > 0.5) {',
                '    vec4 world0 = modelMatrix * vec4(position, 1.0);',
                '    float nCut = (vnoise(vec2(position.x * 0.22 + 1.7, position.z * 0.22)) - 0.5) * uSliceNoise;',
                '    float d = (uSliceCut + nCut) - world0.y;',
                '    if (d < 0.0) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
                '    sliceVis = 1.0;',
                '    sliceRim = 1.0 - clamp(d / max(uSliceRim, 0.0001), 0.0, 1.0);',
                '  }',
                '  float shock = bandOf(pos, uW0, uA0) + bandOf(pos, uW1, uA1) + bandOf(pos, uW2, uA2);',
                '  shock += bandOf(pos, uW3, uA3) + bandOf(pos, uW4, uA4) + bandOf(pos, uW5, uA5);',
                '  vec3 kick = vec3(0.0);',
                '  kick += bandOf(pos, uW0, uA0) * normalize(pos - uW0 + vec3(0.0008, 0.0, 0.0));',
                '  kick += bandOf(pos, uW1, uA1) * normalize(pos - uW1 + vec3(0.0008, 0.0, 0.0));',
                '  kick += bandOf(pos, uW2, uA2) * normalize(pos - uW2 + vec3(0.0008, 0.0, 0.0));',
                '  kick += bandOf(pos, uW3, uA3) * normalize(pos - uW3 + vec3(0.0008, 0.0, 0.0));',
                '  kick += bandOf(pos, uW4, uA4) * normalize(pos - uW4 + vec3(0.0008, 0.0, 0.0));',
                '  kick += bandOf(pos, uW5, uA5) * normalize(pos - uW5 + vec3(0.0008, 0.0, 0.0));',
                '  pos += kick * uShockKick;',
                '  vec4 worldPre = modelMatrix * vec4(pos, 1.0);',
                '  float holoBand = 0.0;',
                '  float holoCore = 0.0;',
                '  if (uHoloOn > 0.5) {',
                '    float holoDist = abs(worldPre.y - uHoloY);',
                '    holoBand = 1.0 - smoothstep(0.0, uHoloWidth, holoDist);',
                '    holoCore = 1.0 - smoothstep(0.0, uHoloWidth * 0.28, holoDist);',
                '    float n = vnoise(vec2(pos.x * 6.0 + pos.z * 2.0, uTime * 5.5));',
                '    float n2 = vnoise(vec2(pos.z * 5.0, uTime * 3.2 + 1.7));',
                '    float jag = holoBand * holoBand;',
                '    pos.x += (n - 0.5) * uHoloKick * jag;',
                '    pos.z += (n2 - 0.5) * uHoloKick * 0.55 * jag;',
                '  }',
                '  vec4 world = modelMatrix * vec4(pos, 1.0);',
                '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
                '  float dist = max(length(mv.xyz), 0.001);',
                '  float reveal = revealOf(pos, uW0, uA0, uL0) + revealOf(pos, uW1, uA1, uL1) + revealOf(pos, uW2, uA2, uL2);',
                '  reveal += revealOf(pos, uW3, uA3, uL3) + revealOf(pos, uW4, uA4, uL4) + revealOf(pos, uW5, uA5, uL5);',
                '  float mouseDist = length(world.xyz - uMouse);',
                '  float rippleHalo = 1.0 - smoothstep(uMouseRadius * 0.12, uMouseRadius, mouseDist);',
                '  float rippleCore = 1.0 - smoothstep(0.0, uMouseRadius * 0.3, mouseDist);',
                '  float ripple = min(1.0, rippleHalo * 0.72 + rippleCore) * uRipple;',
                '  float sweepBand = 1.0 - smoothstep(0.0, uSweepWidth, abs(world.y - uSweepY));',
                '  gl_PointSize = uPointSize * (300.0 / dist) * aSizeScale * sliceVis * (1.0 + shock * 2.4 + reveal * 0.55 + ripple * 1.15 + sweepBand * 2.2 * uSweepBoost + holoBand * 3.4 + holoCore * 2.8 + uBloom * 1.85 + sliceRim * 2.4 + edge * 0.9);',
                '  gl_Position = projectionMatrix * mv;',
                '  if (uSliceOn > 0.5) gl_Position.z -= 0.006 * gl_Position.w;',
                '  vGlow = uGlow + shock * 3.4 + reveal * 1.6 + ripple * 7.2 + sweepBand * 2.2 * uSweepBoost + holoBand * 4.2 + holoCore * 3.6 + uBloom * 1.45 + sliceRim * 1.8 + edge * 1.15;',
                '  vSweep = max(max(shock, ripple), max(sweepBand, sliceRim));',
                '  vReveal = reveal;',
                '  vRipple = ripple;',
                '  vHolo = max(holoBand, holoCore);',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform float uPointAlpha;',
                'uniform vec3 uColor;',
                'uniform vec3 uColorB;',
                'uniform float uAccent;',
                'uniform vec3 uSweepColor;',
                'uniform float uSweepStrength;',
                'varying float vGlow;',
                'varying float vSweep;',
                'varying float vReveal;',
                'varying float vRipple;',
                'varying float vHolo;',
                'void main() {',
                '  if (uPointAlpha < 0.001) discard;',
                '  float d = length(gl_PointCoord - 0.5) * 2.0;',
                '  float a = 1.0 - smoothstep(0.2, 1.0, d);',
                '  a *= vGlow * uPointAlpha;',
                '  vec3 col = mix(uColor, uColorB, uAccent);',
                '  float fxAmt = max(vRipple, vSweep * max(uSweepStrength, 0.88));',
                '  col = mix(col, uSweepColor, fxAmt * 0.94);',
                '  col = mix(col, uSweepColor, vHolo * 0.9);',
                '  a *= 1.0 + vHolo * 1.35;',
                '  gl_FragColor = vec4(col, a);',
                '}',
            ].join('\n'),
        });
        points = new THREE.Points(pGeom, pointsMaterial);
        points.visible = false;
        points.frustumCulled = false;
        points.rotation.x = Math.PI / 2;
        modelRoot.add(points);

        var box = new THREE.Box3().setFromObject(modelRoot);
        var center = new THREE.Vector3();
        box.getCenter(center);
        modelRoot.position.sub(center);
        modelRoot.rotation.y = MODEL_YAW0;
        modelRootBaseY = modelRoot.position.y;

        box.setFromObject(modelRoot);
        var size = new THREE.Vector3();
        box.getSize(size);
        var maxDim = Math.max(size.x, size.y, size.z);
        houseMaxDim = maxDim;
        sweepMinY = box.min.y;
        sweepMaxY = box.max.y;
        computeShouContact();
        var dist = maxDim * 0.6;
        camera.position.set(dist * 1.2, dist * 0.4, dist);
        controls.target.set(0, 0, 0);
        controls.update();
        baseCameraDistance = camera.position.distanceTo(controls.target);
        syncControlsSphericalFromCamera();
        animTime = 0;

        loaded = true;
    }

    function createHouseMaterial(texture, opacity, roughness, metalness) {
        return new THREE.MeshStandardMaterial({
            map: texture || null,
            color: 0xffffff,
            roughness: roughness != null ? roughness : 0.55,
            metalness: metalness != null ? metalness : 0,
            transparent: true,
            opacity: opacity,
            depthWrite: opacity >= 0.7,
        });
    }

    function firstGltfMaterial(mat) {
        if (Array.isArray(mat)) return mat[0] || null;
        return mat || null;
    }

    function polishHouseTexture(tex) {
        if (!tex || !renderer) return;
        var maxA = renderer.capabilities && renderer.capabilities.getMaxAnisotropy
            ? renderer.capabilities.getMaxAnisotropy()
            : 1;
        tex.anisotropy = Math.min(8, maxA || 1);
        tex.generateMipmaps = true;
        if (THREE.LinearMipmapLinearFilter) tex.minFilter = THREE.LinearMipmapLinearFilter;
        if (THREE.LinearFilter) tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
    }

    function polishHouseMaterialMaps(mat) {
        if (!mat) return;
        if (Array.isArray(mat)) {
            var i;
            for (i = 0; i < mat.length; i++) polishHouseMaterialMaps(mat[i]);
            return;
        }
        polishHouseTexture(mat.map);
        polishHouseTexture(mat.normalMap);
        polishHouseTexture(mat.roughnessMap);
        polishHouseTexture(mat.metalnessMap);
        polishHouseTexture(mat.aoMap);
        polishHouseTexture(mat.emissiveMap);
        polishHouseTexture(mat.bumpMap);
        polishHouseTexture(mat.lightMap);
        polishHouseTexture(mat.alphaMap);
    }

    function cloneHouseLookMaterial(src, opacity) {
        src = src || {};
        var dst = new THREE.MeshStandardMaterial({
            color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
            map: src.map || null,
            roughness: src.roughness != null ? src.roughness : 0.5,
            metalness: src.metalness != null ? src.metalness : 0,
            roughnessMap: src.roughnessMap || null,
            metalnessMap: src.metalnessMap || null,
            normalMap: src.normalMap || null,
            aoMap: src.aoMap || null,
            aoMapIntensity: src.aoMapIntensity != null ? src.aoMapIntensity : 1,
            emissiveMap: src.emissiveMap || null,
            emissiveIntensity: src.emissiveIntensity != null ? src.emissiveIntensity : 0,
            bumpMap: src.bumpMap || null,
            bumpScale: src.bumpScale != null ? src.bumpScale : 1,
            envMap: src.envMap || null,
            envMapIntensity: src.envMapIntensity != null ? src.envMapIntensity : 1,
            lightMap: src.lightMap || null,
            lightMapIntensity: src.lightMapIntensity != null ? src.lightMapIntensity : 1,
            alphaMap: src.alphaMap || null,
            side: src.side != null ? src.side : THREE.FrontSide,
            transparent: true,
            opacity: opacity,
            depthWrite: opacity >= 0.7,
        });
        if (src.normalScale) dst.normalScale.copy(src.normalScale);
        if (src.emissive) dst.emissive.copy(src.emissive);
        polishHouseMaterialMaps(dst);
        return dst;
    }

    function setMatOpacity(mat, o) {
        if (!mat) return;
        if (Array.isArray(mat)) {
            var i;
            for (i = 0; i < mat.length; i++) setMatOpacity(mat[i], o);
            return;
        }
        mat.opacity = o;
        mat.transparent = true;
        mat.depthWrite = o >= 0.65;
    }

    function syncMeshMaterialOpacity(opacity) {
        var o = Math.max(0, Math.min(1, opacity));
        var show = o > 0.01;
        if (targetMesh) {
            setMatOpacity(targetMesh.material, o);
            targetMesh.visible = show;
        }
        var i;
        for (i = 0; i < extraHouseMeshes.length; i++) {
            setMatOpacity(extraHouseMeshes[i].material, o);
            extraHouseMeshes[i].visible = show;
        }
    }

    function attachDissolveToMaterial(mat) {
        if (!mat || mat.userData.mingseDissolve) return;
        mat.userData.mingseDissolve = true;
        mat.onBeforeCompile = function (shader) {
            shader.uniforms.uDissolve = dissolveUniforms.uDissolve;
            shader.uniforms.uEdgeWidth = dissolveUniforms.uEdgeWidth;
            shader.uniforms.uNoiseFreq = dissolveUniforms.uNoiseFreq;
            shader.vertexShader = 'varying vec3 vDissPos;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\n vDissPos = transformed;'
            );
            shader.fragmentShader = [
                'varying vec3 vDissPos;',
                'uniform float uDissolve;',
                'uniform float uEdgeWidth;',
                'uniform float uNoiseFreq;',
                GLSL_VNOISE,
                shader.fragmentShader
            ].join('\n');
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                [
                    '#include <map_fragment>',
                    'float n = houseStripe(vDissPos, uNoiseFreq);',
                    'float ew = max(uEdgeWidth, 0.0001);',
                    'if (uDissolve > 0.001 && n < uDissolve - ew * 0.55) discard;',
                    'float edge = 1.0 - clamp(abs(n - uDissolve) / ew, 0.0, 1.0);',
                    'edge *= step(0.001, uDissolve);',
                    'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.48, 0.16), edge * 0.78);',
                    'diffuseColor.rgb += vec3(1.0, 0.42, 0.1) * edge * 0.32;',
                ].join('\n')
            );
        };
        mat.customProgramCacheKey = function () {
            return 'mingse-hstripe-dissolve-v2';
        };
    }

    function useMeshDissolveMaterial() {
        if (!targetMesh || !meshBaseMaterial) return;
        targetMesh.material = meshBaseMaterial;
        meshBaseMaterial.transparent = true;
        meshBaseMaterial.depthWrite = meshBaseMaterial.opacity >= 0.65;
        targetMesh.visible = true;
    }

    function restoreMeshBaseMaterial() {
        if (!targetMesh || !meshBaseMaterial) return;
        targetMesh.material = meshBaseMaterial;
        meshBaseMaterial.transparent = true;
        meshBaseMaterial.depthWrite = meshBaseMaterial.opacity >= 0.65;
        dissolveUniforms.uDissolve.value = 0;
    }

    function mingseNoiseFreq() {
        var h = Math.abs((sweepMaxY != null ? sweepMaxY : 1) - (sweepMinY != null ? sweepMinY : 0));
        var dim = Math.min(houseMaxDim || 10, Math.max(h, 1));
        return 2.4 / Math.max(dim * 0.14, 0.18);
    }

    function mingseSliceRange() {
        var boxYMin = sweepMinY;
        var boxYMax = sweepMaxY;
        if (points) {
            points.updateMatrixWorld(true);
            var box = new THREE.Box3().setFromObject(points);
            if (isFinite(box.min.y) && isFinite(box.max.y) && box.max.y > box.min.y) {
                boxYMin = box.min.y;
                boxYMax = box.max.y;
            }
        }
        var height = Math.max(0.8, boxYMax - boxYMin);
        return {
            lo: boxYMin + height * 0.01,
            hi: boxYMax + height * 0.06,
            rim: Math.max(height * 0.04, 0.07),
            noise: Math.max(height * 0.025, 0.04),
        };
    }

    function clearMingseDual() {
        dissolveUniforms.uDissolve.value = 0;
        dissolveUniforms.uSliceCut.value = -999;
        dissolveUniforms.uSliceMesh.value = 0;
        dissolveUniforms.uPeel.value = 0;
        if (targetMesh && meshBaseMaterial) {
            restoreMeshBaseMaterial();
        } else if (targetMesh && targetMesh.material) {
            targetMesh.material.depthWrite = false;
        }
        if (!pointsMaterial || !pointsMaterial.uniforms) return;
        var u = pointsMaterial.uniforms;
        if (u.uSliceOn) u.uSliceOn.value = 0;
        if (u.uSliceCut) u.uSliceCut.value = -999;
        if (u.uDissolve) u.uDissolve.value = 0;
        if (u.uPeelAmp) u.uPeelAmp.value = 0.18;
        if (u.uSweepStrength) u.uSweepStrength.value = 0;
        if (u.uSweepY) u.uSweepY.value = -10;
        if (u.uSweepBoost) u.uSweepBoost.value = 1;
        if (u.uSweepColor) u.uSweepColor.value.set(COL_FX_R, COL_FX_G, COL_FX_B);
    }

    function beginMingseDual() {
        if (!expandComplete) forceExpandComplete();
        pointsReady = false;
        setPointPositionsToOriginal();
        setSizeScale(1);
        if (points) {
            points.position.set(0, 0, 0);
            points.scale.set(1, 1, 1);
            points.rotation.set(Math.PI / 2, 0, 0);
        }
        var freq = mingseNoiseFreq();
        dissolveUniforms.uNoiseFreq.value = freq;
        dissolveUniforms.uDissolve.value = 0;
        dissolveUniforms.uEdgeWidth.value = 0.12;
        dissolveUniforms.uSliceMesh.value = 0;
        dissolveUniforms.uPeel.value = 0;
        dissolveUniforms.uOpacity.value = 1;
        var range = mingseSliceRange();
        dissolveUniforms.uSliceCut.value = range.lo;
        dissolveUniforms.uSliceSoft.value = range.rim * 2.4;
        if (targetMesh) {
            restoreMeshBaseMaterial();
            targetMesh.visible = true;
            syncMeshMaterialOpacity(1);
        }
        if (points) points.visible = true;
        if (pointsMaterial) {
            var u = pointsMaterial.uniforms;
            setPointColorHex(COL_HOUSE);
            u.uPointAlpha.value = 0;
            u.uPointSize.value = 0.01;
            u.uGlow.value = 1;
            if (u.uAccent) u.uAccent.value = 0;
            if (u.uRipple) u.uRipple.value = 0;
            if (u.uSliceOn) u.uSliceOn.value = 1;
            if (u.uSliceCut) u.uSliceCut.value = range.lo;
            if (u.uSliceRim) u.uSliceRim.value = range.rim;
            if (u.uSliceNoise) u.uSliceNoise.value = range.noise;
            if (u.uDissolve) u.uDissolve.value = 0;
            if (u.uNoiseFreq) u.uNoiseFreq.value = freq;
            if (u.uPeelAmp) u.uPeelAmp.value = 0;
            if (u.uSweepY) u.uSweepY.value = range.lo;
            if (u.uSweepWidth) u.uSweepWidth.value = range.rim * 1.8;
            if (u.uSweepStrength) u.uSweepStrength.value = 0.55;
            if (u.uSweepBoost) u.uSweepBoost.value = 1.05;
            if (u.uSweepColor) u.uSweepColor.value.set(COL_FX_R, COL_FX_G, COL_FX_B);
        }
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
    }

    function applyMingseDual(u) {
        u = Math.min(1, Math.max(0, u));
        var tDiss = smootherstep(Math.min(1, u / 0.36));
        var sliceDelay = 0.22;
        var tSlice = u <= sliceDelay ? 0 : (u - sliceDelay) / (1 - sliceDelay);
        var range = mingseSliceRange();
        var cut = lerp(range.lo, range.hi, tSlice);
        var dissolve = lerp(0, 1.08, tDiss);
        dissolveUniforms.uDissolve.value = dissolve;
        dissolveUniforms.uSliceCut.value = cut;
        dissolveUniforms.uSliceMesh.value = 0;
        dissolveUniforms.uSliceSoft.value = range.rim * 2.4;
        dissolveUniforms.uPeel.value = 0.7 * (1 - tDiss * 0.45);
        dissolveUniforms.uOpacity.value = 1;
        if (targetMesh) {
            targetMesh.visible = tDiss < 0.995 || tSlice < 0.08;
            syncMeshMaterialOpacity(tDiss < 0.92 ? 1 : lerp(1, 0, (tDiss - 0.92) / 0.08));
        }
        if (points) points.visible = true;
        if (pointsMaterial) {
            var pu = pointsMaterial.uniforms;
            pu.uPointAlpha.value = tSlice > 0.001 ? 1 : 0;
            pu.uPointSize.value = lerp(0.01, 0.013, tSlice);
            pu.uGlow.value = 1;
            if (pu.uSliceOn) pu.uSliceOn.value = 1;
            if (pu.uSliceCut) pu.uSliceCut.value = cut;
            if (pu.uSliceRim) pu.uSliceRim.value = range.rim;
            if (pu.uSliceNoise) pu.uSliceNoise.value = range.noise;
            if (pu.uDissolve) pu.uDissolve.value = dissolve;
            if (pu.uSweepY) pu.uSweepY.value = cut;
            if (pu.uSweepWidth) pu.uSweepWidth.value = range.rim * 1.8;
            if (pu.uSweepStrength) pu.uSweepStrength.value = 0.42 + (1 - tSlice) * 0.28;
            if (pu.uSweepBoost) pu.uSweepBoost.value = 1.05;
        }
    }

    function finishMingseDual() {
        if (targetMesh) {
            targetMesh.visible = false;
            targetMesh.material.depthWrite = false;
            syncMeshMaterialOpacity(0);
        }
        clearMingseDual();
        setPointPositionsToOriginal();
        if (points) points.visible = true;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
        pointsReady = true;
        if (!expandComplete) {
            expandComplete = true;
            idleEffectsStartTime = animTime;
        }
    }

    function syncControlsSphericalFromCamera() {
        if (!controls || !camera || typeof THREE.Spherical === 'undefined') return;
        var offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        if (offset.lengthSq() < 1e-8) return;
        if (!controls.spherical) return;
        controls.spherical.setFromVector3(offset);
    }

    function setPointPositionsToOriginal() {
        if (!points || !originalPositions) return;
        var arr = points.geometry.attributes.position.array;
        arr.set(originalPositions);
        points.geometry.attributes.position.needsUpdate = true;
    }

    function computeShouContact() {
        if (!originalPositions) return;
        var orig = originalPositions;
        var n = orig.length / 3;
        var sx = 0;
        var sy = 0;
        var sz = 0;
        var i;
        for (i = 0; i < orig.length; i += 3) {
            sx += orig[i];
            sy += orig[i + 1];
            sz += orig[i + 2];
        }
        sx /= n;
        sy /= n;
        sz /= n;
        var best = 0;
        var bestD = Infinity;
        for (i = 0; i < orig.length; i += 3) {
            var dx = orig[i] - sx;
            var dy = orig[i + 1] - sy;
            var dz = orig[i + 2] - sz;
            var d = dx * dx + dy * dy + dz * dz;
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        shouContact.x = orig[best];
        shouContact.y = orig[best + 1];
        shouContact.z = orig[best + 2];
    }

    function setPointColorHex(hex) {
        if (!pointsMaterial || !pointsMaterial.uniforms.uColor) return;
        var v = pointsMaterial.uniforms.uColor.value;
        if (typeof v.setHex === 'function') v.setHex(hex);
        else if (typeof v.setRGB === 'function') {
            var c = new THREE.Color(hex);
            v.setRGB(c.r, c.g, c.b);
        } else v.set(hex);
    }
    function resetVedanaLook() {
        clearMingseDual();
        if (!pointsMaterial) return;
        var u = pointsMaterial.uniforms;
        setPointColorHex(COL_HOUSE);
        if (u.uColorB) u.uColorB.value.set(1, 1, 1);
        if (u.uAccent) u.uAccent.value = 0;
        if (u.uBloom) u.uBloom.value = 0;
        if (u.uSweepY) u.uSweepY.value = -10;
        if (u.uSweepWidth) u.uSweepWidth.value = Math.max(0.35, houseMaxDim * 0.1);
        if (u.uSweepStrength) u.uSweepStrength.value = 0;
        if (u.uSweepBoost) u.uSweepBoost.value = 1;
        if (u.uGlow) u.uGlow.value = 1;
        if (renderer && renderer.toneMappingExposure !== undefined) {
            renderer.toneMappingExposure = 1.2;
        }
    }

    function keepPointCloud() {
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        if (points) points.visible = true;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
    }

    function hideMeshShowPoints() {
        keepPointCloud();
        setPointPositionsToOriginal();
    }

    function markMeshReady() {
        if (expandComplete) return;
        expandComplete = true;
        idleEffectsStartTime = animTime;
        applyHold();
        if (targetMesh) {
            targetMesh.geometry.computeBoundingSphere();
            targetMesh.geometry.computeBoundingBox();
        }
        syncControlsSphericalFromCamera();
    }

    function markPointsReady() {
        pointsReady = true;
        hideMeshShowPoints();
        if (!expandComplete) {
            expandComplete = true;
            idleEffectsStartTime = animTime;
        }
        syncControlsSphericalFromCamera();
    }

    function ensurePointCloudReady() {
        if (!originalPositions) return;
        if (targetMesh) {
            var meshPos = targetMesh.geometry.attributes.position;
            meshPos.array.set(originalPositions);
            meshPos.needsUpdate = true;
        }
        markPointsReady();
    }

    function forceExpandComplete() {
        applyHold();
        markMeshReady();
    }

    function wakeSuspended() {
        if (global.ThreeRegistry && global.ThreeRegistry.useR128) {
            global.ThreeRegistry.useR128();
        }
        if (containerEl) containerEl.hidden = false;
        suspended = false;
        if (clock) clock.getDelta();
        return !!(renderer && scene && points);
    }

    function ensureLoaded() {
        if (global.ThreeRegistry && global.ThreeRegistry.useR128) {
            global.ThreeRegistry.useR128();
        }
        if (renderer && scene && (points || loaded || suspended)) {
            return Promise.resolve();
        }
        if (loadPromise) return loadPromise;
        loaded = false;
        suspended = false;
        if (global.ThreeRegistry && global.ThreeRegistry.ensureR128) {
            return global.ThreeRegistry.ensureR128().then(function () {
                if (global.ThreeRegistry.useR128) global.ThreeRegistry.useR128();
                return doEnsureLoaded();
            });
        }
        return doEnsureLoaded();
    }

    function yieldToPaint() {
        return new Promise(function (resolve) {
            requestAnimationFrame(function () {
                setTimeout(resolve, 0);
            });
        });
    }

    function yieldIdle(timeoutMs) {
        return new Promise(function (resolve) {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(function () { resolve(); }, { timeout: timeoutMs || 600 });
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    function doEnsureLoaded() {
        if (loaded) return Promise.resolve();
        if (loadPromise) return loadPromise;
        if (typeof THREE === 'undefined') {
            return Promise.reject(new Error('THREE not available — use HTTP server from project root'));
        }
        if (!containerEl.hidden) showLoading();
        loadPromise = loadModelWithFallback(buildModelUrls()).then(function (gltf) {
            return yieldToPaint().then(function () {
                ensureRenderer();
                return yieldToPaint().then(function () {
                    clearLoading();
                    setupFromGltf(gltf);
                    var map = targetMesh && targetMesh.material && targetMesh.material.map;
                    return capColorMap(map);
                });
            });
        }).then(function () {
            return yieldIdle(800).then(function () {
                warmupGpu();
                console.info('[HouseModel] ready');
            });
        }).catch(function (err) {
            loadPromise = null;
            loaded = false;
            console.error('[HouseModel] load failed', err);
            if (renderer && renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer = null;
            scene = null;
            camera = null;
            controls = null;
            if (containerEl) {
                containerEl.innerHTML = '<div class="house-stage-placeholder">Model failed to load</div>';
            }
            throw err;
        });
        return loadPromise;
    }

    function onResize() {
        if (!camera || !renderer || !containerEl) return;
        var w = containerEl.clientWidth || global.innerWidth;
        var h = containerEl.clientHeight || global.innerHeight;
        if (w === canvasSizeW && h === canvasSizeH) return;
        canvasSizeW = w;
        canvasSizeH = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (aeGlow) aeGlow.resize();
    }

    function onMouseMove(e) {
        var w = global.innerWidth || 1;
        var h = global.innerHeight || 1;
        mouseNDC.x = (e.clientX / w) * 2 - 1;
        mouseNDC.y = -(e.clientY / h) * 2 + 1;
        if (onMouseMoveCb) onMouseMoveCb(e.clientX, e.clientY);
    }

    function updateMouseWorld() {
        if (!camera || !pointsMaterial || !mouseWorld) return;
        mouseWorld.set(mouseNDC.x, mouseNDC.y, 0.5).unproject(camera);
        var dir = mouseWorld.clone().sub(camera.position).normalize();
        var n = camera.position.clone().normalize();
        var denom = n.dot(dir);
        if (Math.abs(denom) < 1e-5) return;
        var tHit = -n.dot(camera.position) / denom;
        if (tHit < 0) return;
        mouseWorld.copy(camera.position).addScaledVector(dir, tHit);
        pointsMaterial.uniforms.uMouse.value.copy(mouseWorld);
        pointsMaterial.uniforms.uMouseRadius.value = mouseRippleRadius();
    }

    function mouseRippleRadius() {
        return Math.max(3.8, houseMaxDim * 0.34);
    }

    function pointsAreVisible() {
        if (!points || !points.visible || !pointsMaterial) return false;
        var alpha = pointsMaterial.uniforms.uPointAlpha;
        return !alpha || alpha.value > 0.01;
    }

    function ensureCloudShocks() {
        if (cloudShocks) return;
        cloudShocks = [];
        var i;
        for (i = 0; i < 6; i++) {
            cloudShocks.push({ pos: new THREE.Vector3(), age: 99 });
        }
        if (!cloudPickVec) cloudPickVec = new THREE.Vector3();
    }

    function ensureShockWaveParams() {
        if (!pointsMaterial || !pointsMaterial.uniforms) return;
        var u = pointsMaterial.uniforms;
        if (u.uWaveSpeed) u.uWaveSpeed.value = Math.max(houseMaxDim * 1.15, 4.5);
        if (u.uWaveWidth) u.uWaveWidth.value = Math.max(houseMaxDim * 0.045, 0.22);
        if (u.uShockKick) u.uShockKick.value = Math.max(0.16, houseMaxDim * 0.022);
    }

    function syncCloudShock(i) {
        if (!pointsMaterial || !cloudShocks || !cloudShocks[i]) return;
        var n = cloudShocks[i];
        var u = pointsMaterial.uniforms;
        u['uW' + i].value.copy(n.pos);
        u['uA' + i].value = n.age;
    }

    function spawnCloudShockLocal(localPos) {
        if (!localPos || !pointsMaterial) return;
        ensureCloudShocks();
        ensureShockWaveParams();
        var slot = cloudShockSlot % 6;
        cloudShockSlot += 1;
        cloudShocks[slot].pos.copy(localPos);
        cloudShocks[slot].age = 0;
        syncCloudShock(slot);
    }

    function pickCloudPointFromClient(clientX, clientY) {
        if (!points || !camera || !originalPositions || !containerEl) return null;
        ensureCloudShocks();
        points.updateMatrixWorld(true);
        var rect = containerEl.getBoundingClientRect();
        var w = rect.width || 1;
        var h = rect.height || 1;
        var px = clientX - rect.left;
        var py = clientY - rect.top;
        var orig = originalPositions;
        var step = 3;
        var count = orig.length / 3;
        if (count > 4500) step = Math.floor(count / 4500) * 3;
        var bestI = -1;
        var bestD = 52 * 52;
        var v = cloudPickVec;
        var i;
        for (i = 0; i < orig.length; i += step) {
            v.set(orig[i], orig[i + 1], orig[i + 2]);
            points.localToWorld(v);
            v.project(camera);
            if (v.z < -1 || v.z > 1) continue;
            var sx = (v.x * 0.5 + 0.5) * w;
            var sy = (-v.y * 0.5 + 0.5) * h;
            var dx = px - sx;
            var dy = py - sy;
            var d = dx * dx + dy * dy;
            if (d < bestD) {
                bestD = d;
                bestI = i;
            }
        }
        if (bestI < 0) return null;
        return new THREE.Vector3(orig[bestI], orig[bestI + 1], orig[bestI + 2]);
    }

    function trySpawnCloudShockFromClick(clientX, clientY) {
        if (!pointsAreVisible()) return false;
        var local = pickCloudPointFromClient(clientX, clientY);
        if (!local) return false;
        spawnCloudShockLocal(local);
        return true;
    }

    function syncMouseRipple() {
        if (!pointsMaterial || !pointsMaterial.uniforms.uRipple) return;
        if (!pointsAreVisible()) {
            pointsMaterial.uniforms.uRipple.value = 0;
            return;
        }
        if (mode === 'qu') {
            pointsMaterial.uniforms.uRipple.value = 0;
            return;
        }
        if (mode === 'ai') {
            var rippleFade = Math.max(0, 1 - modeElapsed / 1.6);
            pointsMaterial.uniforms.uRipple.value = rippleFade;
            if (rippleFade > 0.01) updateMouseWorld();
            return;
        }
        pointsMaterial.uniforms.uRipple.value = 1;
        updateMouseWorld();
    }

    function applyExpand(p) {
        if (!targetMesh) return;
        targetMesh.visible = true;
        if (points) points.visible = false;
        if (pointsMaterial) pointsMaterial.uniforms.uPointAlpha.value = 0;
        var s = Math.max(0.001, p);
        if (modelRoot) modelRoot.scale.set(s, s, s);
        syncMeshMaterialOpacity(easeInOut(p));
    }

    function applyHold() {
        if (!targetMesh) return;
        targetMesh.visible = true;
        if (points) points.visible = false;
        if (pointsMaterial) pointsMaterial.uniforms.uPointAlpha.value = 0;
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        restoreMeshBaseMaterial();
        syncMeshMaterialOpacity(1);
    }

    function applyToPoints(p) {
        if (!targetMesh || !originalPositions) return;
        var meshPos = targetMesh.geometry.attributes.position;
        meshPos.array.set(originalPositions);
        meshPos.needsUpdate = true;

        targetMesh.visible = true;
        if (points) points.visible = true;
        syncMeshMaterialOpacity(1 - p);
        if (pointsMaterial) pointsMaterial.uniforms.uPointAlpha.value = p;
        setPointPositionsToOriginal();
    }

    function setSizeScale(value) {
        if (!points) return;
        var attr = points.geometry.attributes.aSizeScale;
        if (!attr) return;
        var arr = attr.array;
        for (var i = 0; i < arr.length; i++) arr[i] = value;
        attr.needsUpdate = true;
    }

    function applyMingsePull(phase) {
        if (!points || !originalPositions) return;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var pull = MINGSE_PULL_AMP * Math.sin(animTime * 3) * (1 - phase * 0.5);
        for (var i = 0; i < posArr.length; i += 3) {
            var dx = orig[i] - posArr[i];
            var dy = orig[i + 1] - posArr[i + 1];
            var dz = orig[i + 2] - posArr[i + 2];
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            posArr[i] += (dx / len) * MINGSE_RESTORE + Math.sin(animTime * 4 + orig[i]) * pull;
            posArr[i + 1] += (dy / len) * MINGSE_RESTORE + Math.sin(animTime * 4 + orig[i + 1]) * pull;
            posArr[i + 2] += (dz / len) * MINGSE_RESTORE + Math.sin(animTime * 4 + orig[i + 2]) * pull;
        }
        points.geometry.attributes.position.needsUpdate = true;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointSize.value = 0.006;
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
        setSizeScale(0.85);
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
    }

    function applyMingseSettle(p) {
        if (!points || !originalPositions) return;
        p = Math.min(1, Math.max(0, p));
        var ease = easeOut(p);
        setPointPositionsToOriginal();
        if (pointsMaterial) {
            var u = pointsMaterial.uniforms;
            if (u.uSliceOn) u.uSliceOn.value = 0;
            if (u.uSweepStrength) u.uSweepStrength.value = lerp(0.2, 0, ease);
            u.uPointSize.value = lerp(0.013, 0.012, ease);
            u.uPointAlpha.value = 1;
            u.uGlow.value = 1;
        }
        setSizeScale(1);
        if (targetMesh) {
            restoreMeshBaseMaterial();
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
    }

    function applyWumingSettle(progress) {
        if (!points || !originalPositions) return;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var t = animTime;
        var amp = 0.012 * (1 - Math.min(1, Math.max(0, progress)));
        for (var i = 0; i < posArr.length; i += 3) {
            var settle = 1 + amp * Math.sin(t * 2 + orig[i] * 0.1);
            posArr[i] = orig[i] * settle;
            posArr[i + 1] = orig[i + 1] * settle;
            posArr[i + 2] = orig[i + 2] * settle;
        }
        points.geometry.attributes.position.needsUpdate = true;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
        if (targetMesh) targetMesh.visible = false;
        if (points) points.visible = true;
    }

    function nearestCloudPoint(tx, ty, tz) {
        var orig = originalPositions;
        var bestI = 0;
        var bestD = Infinity;
        for (var i = 0; i < orig.length; i += 3) {
            var dx = orig[i] - tx;
            var dy = orig[i + 1] - ty;
            var dz = orig[i + 2] - tz;
            var d = dx * dx + dy * dy + dz * dz;
            if (d < bestD) {
                bestD = d;
                bestI = i;
            }
        }
        return new THREE.Vector3(orig[bestI], orig[bestI + 1], orig[bestI + 2]);
    }

    function buildLiuruAnchors() {
        points.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(points);
        var c = box.getCenter(new THREE.Vector3());
        var s = box.getSize(new THREE.Vector3());
        var worldTargets = [
            new THREE.Vector3(c.x - s.x * 0.42, c.y + s.y * 0.38, c.z - s.z * 0.42),
            new THREE.Vector3(c.x + s.x * 0.42, c.y + s.y * 0.38, c.z - s.z * 0.42),
            new THREE.Vector3(c.x - s.x * 0.42, c.y + s.y * 0.38, c.z + s.z * 0.42),
            new THREE.Vector3(c.x + s.x * 0.42, c.y + s.y * 0.38, c.z + s.z * 0.42),
            new THREE.Vector3(c.x - s.x * 0.46, c.y + s.y * 0.02, c.z),
            new THREE.Vector3(c.x + s.x * 0.46, c.y + s.y * 0.02, c.z),
        ];
        var nodes = [];
        var local = new THREE.Vector3();
        for (var i = 0; i < worldTargets.length; i++) {
            local.copy(worldTargets[i]);
            points.worldToLocal(local);
            var p = nearestCloudPoint(local.x, local.y, local.z);
            nodes.push({ pos: p, lit: false, age: 99, el: null });
        }
        return nodes;
    }

    function ensureLiuruOverlay() {
        if (liuruOverlay || !containerEl) return;
        liuruOverlay = document.createElement('div');
        liuruOverlay.className = 'liuru-overlay';
        containerEl.appendChild(liuruOverlay);
    }

    function makeLiuruNodeEl(index) {
        var el = document.createElement('div');
        el.className = 'liuru-node';
        el.dataset.index = String(index);
        el.innerHTML =
            '<span class="blocking-sonar-ring"></span>' +
            '<span class="blocking-sonar-ring"></span>' +
            '<span class="blocking-sonar-ring"></span>' +
            '<span class="blocking-sonar-dot"></span>';
        return el;
    }

    function beginLiuru() {
        liuruComplete = false;
        ensureLiuruOverlay();
        liuruOverlay.innerHTML = '';
        liuruNodes = buildLiuruAnchors();
        var i;
        for (i = 0; i < liuruNodes.length; i++) {
            liuruNodes[i].el = makeLiuruNodeEl(i);
            liuruOverlay.appendChild(liuruNodes[i].el);
        }
        resetCloudShocks();
        ensureShockWaveParams();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uGlow.value = 1;
            pointsMaterial.uniforms.uWaveSpeed.value = Math.max(houseMaxDim * 1.15, 4.5);
            pointsMaterial.uniforms.uWaveWidth.value = Math.max(houseMaxDim * 0.045, 0.22);
        }
        setSizeScale(1);
        hideMeshShowPoints();
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        projectLiuruNodes();
    }

    function endLiuruUi() {
        if (liuruOverlay && liuruOverlay.parentNode) {
            liuruOverlay.parentNode.removeChild(liuruOverlay);
        }
        liuruOverlay = null;
        if (liuruNodes) {
            for (var i = 0; i < liuruNodes.length; i++) liuruNodes[i].el = null;
        }
    }

    function syncLiuruWave(i) {
        if (!pointsMaterial || !liuruNodes || !liuruNodes[i]) return;
        var n = liuruNodes[i];
        var u = pointsMaterial.uniforms;
        u['uW' + i].value.copy(n.pos);
        u['uA' + i].value = n.age;
        u['uL' + i].value = 0;
    }

    function projectLiuruNodes() {
        if (!liuruNodes || !camera || !points || !containerEl) return;
        var rect = containerEl.getBoundingClientRect();
        var w = rect.width || 1;
        var h = rect.height || 1;
        var v = new THREE.Vector3();
        points.updateMatrixWorld(true);
        for (var i = 0; i < liuruNodes.length; i++) {
            var n = liuruNodes[i];
            if (!n.el) continue;
            v.copy(n.pos);
            points.localToWorld(v);
            v.project(camera);
            var x = (v.x * 0.5 + 0.5) * w;
            var y = (-v.y * 0.5 + 0.5) * h;
            var visible = v.z > -1 && v.z < 1;
            n.el.style.left = x + 'px';
            n.el.style.top = y + 'px';
            n.el.style.opacity = visible ? '1' : '0.2';
            n.el.classList.toggle('is-behind', !visible);
        }
    }

    function onLiuruPointerDown(e) {
        if (e.button !== 0) return;
        liuruPointer.down = true;
        liuruPointer.x = e.clientX;
        liuruPointer.y = e.clientY;
    }

    function onLiuruPointerUp(e) {
        if (e.button !== 0 || !liuruPointer.down) return;
        liuruPointer.down = false;
        var dx = e.clientX - liuruPointer.x;
        var dy = e.clientY - liuruPointer.y;
        if (dx * dx + dy * dy > 36) return;
        if (mode === 'six-circles' && liuruNodes) {
            var litBefore = 0;
            var n;
            for (n = 0; n < liuruNodes.length; n++) {
                if (liuruNodes[n].lit) litBefore += 1;
            }
            pickLiuruNode(e.clientX, e.clientY);
            var litAfter = 0;
            for (n = 0; n < liuruNodes.length; n++) {
                if (liuruNodes[n].lit) litAfter += 1;
            }
            if (litAfter > litBefore) return;
        }
        trySpawnCloudShockFromClick(e.clientX, e.clientY);
    }

    function pickLiuruNode(clientX, clientY) {
        if (!containerEl || !liuruNodes) return;
        var rect = containerEl.getBoundingClientRect();
        var best = -1;
        var bestD = 42 * 42;
        for (var i = 0; i < liuruNodes.length; i++) {
            var el = liuruNodes[i].el;
            if (!el || liuruNodes[i].lit) continue;
            var nx = parseFloat(el.style.left) || 0;
            var ny = parseFloat(el.style.top) || 0;
            var dx = clientX - rect.left - nx;
            var dy = clientY - rect.top - ny;
            var d = dx * dx + dy * dy;
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        if (best >= 0) activateLiuruNode(best);
    }

    function activateLiuruNode(index) {
        var n = liuruNodes[index];
        if (!n || n.lit) return;
        n.lit = true;
        n.age = 0;
        spawnCloudShockLocal(n.pos);
        if (n.el) {
            if (n.el.parentNode) n.el.parentNode.removeChild(n.el);
            n.el = null;
        }
        if (global.NoteAudio && typeof global.NoteAudio.playNote === 'function') {
            global.NoteAudio.playNote(index);
        }
        var litCount = 0;
        for (var i = 0; i < liuruNodes.length; i++) {
            if (liuruNodes[i].lit) litCount += 1;
        }
        if (global.AppEventBus) {
            global.AppEventBus.emit('liuru:node', { index: index, litCount: litCount, total: 6 });
        }
        if (litCount >= 6 && !liuruComplete) {
            liuruComplete = true;
            global.setTimeout(function () {
                if (global.AppEventBus) global.AppEventBus.emit('liuru:complete', { litCount: litCount });
            }, 480);
        }
    }

    function tickLiuru(delta) {
        modeElapsed += delta;
        if (!pointsReady) {
            hideMeshShowPoints();
            pointsReady = true;
        }
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
        }
        projectLiuruNodes();
    }

    function tickExpand(delta) {
        modeElapsed += delta;
        var expandS = INTRO_EXPAND_S;
        if (modeDuration > 0 && expandS > modeDuration) expandS = modeDuration;

        if (modeElapsed < expandS) {
            applyExpand(easeInOut(modeElapsed / expandS));
            return;
        }
        if (!expandComplete) {
            applyHold();
            markMeshReady();
        }
    }

    function tickParticleize(delta) {
        modeElapsed += delta;
        var duration = modeDuration > 0 ? modeDuration : (MINGSE_HOLD_S + MINGSE_DUAL_S + MINGSE_SETTLE_S);
        var holdS = MINGSE_HOLD_S;
        var settleS = MINGSE_SETTLE_S;
        var dualS = Math.max(3.5, duration - holdS - settleS);

        if (modeElapsed < holdS) {
            if (targetMesh) {
                restoreMeshBaseMaterial();
                syncMeshMaterialOpacity(1);
            }
            dissolveUniforms.uDissolve.value = 0;
            dissolveUniforms.uOpacity.value = 1;
            if (pointsMaterial && pointsMaterial.uniforms.uSliceOn) {
                var range = mingseSliceRange();
                pointsMaterial.uniforms.uSliceOn.value = 1;
                pointsMaterial.uniforms.uSliceCut.value = range.lo;
                pointsMaterial.uniforms.uPointAlpha.value = 0;
                pointsMaterial.uniforms.uSweepY.value = range.lo;
                dissolveUniforms.uSliceCut.value = range.lo;
                dissolveUniforms.uDissolve.value = 0;
            }
            return;
        }

        if (modeElapsed < holdS + dualS) {
            applyMingseDual((modeElapsed - holdS) / dualS);
            return;
        }

        if (!pointsReady) finishMingseDual();
        applyMingseSettle((modeElapsed - holdS - dualS) / settleS);
    }

    function ensureRandomOffsets() {
        if (!originalPositions) return;
        if (randomOffsets && randomOffsets.length === originalPositions.length) return;
        randomOffsets = new Float32Array(originalPositions.length);
        for (var ri = 0; ri < randomOffsets.length; ri++) {
            randomOffsets[ri] = (Math.random() * 2 - 1) * 1.2;
        }
    }

    function resetCloudShocks() {
        ensureCloudShocks();
        var i;
        for (i = 0; i < 6; i++) {
            cloudShocks[i].age = 99;
            if (pointsMaterial) {
                pointsMaterial.uniforms['uA' + i].value = 99;
            }
        }
    }

    function clearLiuruWaves() {
        liuruNodes = null;
        resetCloudShocks();
        if (!pointsMaterial) return;
        var i;
        for (i = 0; i < 6; i++) {
            pointsMaterial.uniforms['uL' + i].value = 0;
        }
    }

    function applyDustTremor(strength) {
        if (!points || !originalPositions) return;
        updateMouseWorld();
        points.updateMatrixWorld(true);
        var e = points.matrixWorld.elements;
        var mx = mouseWorld ? mouseWorld.x : 0;
        var my = mouseWorld ? mouseWorld.y : 0;
        var mz = mouseWorld ? mouseWorld.z : 0;
        var hasMouse = !!mouseWorld;
        var dim = houseMaxDim || 10;
        var peak = dim * 0.032 * strength;
        var base = dim * 0.007 * strength;
        var fall = 3.4 / dim;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var t = animTime;
        var i;
        for (i = 0; i < orig.length; i += 3) {
            var ox = orig[i];
            var oy = orig[i + 1];
            var oz = orig[i + 2];
            var d = 1e6;
            if (hasMouse) {
                var wx = e[0] * ox + e[4] * oy + e[8] * oz + e[12];
                var wy = e[1] * ox + e[5] * oy + e[9] * oz + e[13];
                var wz = e[2] * ox + e[6] * oy + e[10] * oz + e[14];
                var dx = wx - mx;
                var dy = wy - my;
                var dz = wz - mz;
                d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
            var amp = peak * Math.exp(-d * fall) + base;
            posArr[i] = ox + Math.sin(t * 18 + ox * 20) * amp;
            posArr[i + 1] = oy + Math.cos(t * 16 + oy * 20) * amp;
            posArr[i + 2] = oz + Math.sin(t * 17 + oz * 20) * amp;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    function beginChu() {
        ensureRandomOffsets();
        clearLiuruWaves();
        if (!expandComplete) forceExpandComplete();
        if (!pointsReady) {
            applyToPoints(1);
            markPointsReady();
        } else {
            hideMeshShowPoints();
        }
        if (points && points.geometry && points.geometry.attributes.position) {
            points.geometry.attributes.position.dynamic = true;
        }
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
            pointsMaterial.uniforms.uRipple.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            pointsMaterial.uniforms.uMouseRadius.value = mouseRippleRadius();
        }
    }

    function tickChu(delta) {
        modeElapsed += delta;
        ensureRandomOffsets();
        if (!points || !originalPositions) return;
        if (!pointsReady) {
            hideMeshShowPoints();
            pointsReady = true;
        }
        applyDustTremor(1);
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
            pointsMaterial.uniforms.uRipple.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
        }
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
    }

    function seedShouStart() {
        if (!points || !originalPositions || !randomOffsets) return;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        var scale = Math.max(1, houseMaxDim / 8);
        var osc = 0.05 * scale;
        var wave = 0.032 * scale;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = orig[i] + off[i] * osc + Math.sin(i * 0.01) * wave;
            posArr[i + 1] = orig[i + 1] + off[i + 1] * osc + Math.cos(i * 0.01) * wave;
            posArr[i + 2] = orig[i + 2] + off[i + 2] * osc;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    function beginShou(kind) {
        shouKind = kind === 'dukha' || kind === 'upeksha' ? kind : 'sukha';
        ensureRandomOffsets();
        clearLiuruWaves();
        computeShouContact();
        if (!expandComplete) forceExpandComplete();
        if (!pointsReady) {
            applyToPoints(1);
            markPointsReady();
            seedShouStart();
        } else {
            keepPointCloud();
        }
        ensureAiState();
        if (points && points.geometry && points.geometry.attributes.position) {
            points.geometry.attributes.position.dynamic = true;
        }
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        resetVedanaLook();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
        }
    }

    function shouEnvelope() {
        var t = modeElapsed;
        if (t < 1) return { stage: 0, fade: 1 - t, core: 0, damp: 0 };
        if (t < 6) {
            var u = (t - 1) / 5;
            return { stage: 1, fade: 0, core: Math.min(1, u / 0.12), damp: 0 };
        }
        var p = Math.min(1, (t - 6) / 2);
        return { stage: 2, fade: 0, core: Math.pow(1 - p, 2.2), damp: p };
    }

    function tickShou(delta) {
        modeElapsed += delta;
        ensureRandomOffsets();
        if (!points || !originalPositions || !randomOffsets || !pointsMaterial) return;
        if (!pointsReady) {
            hideMeshShowPoints();
            pointsReady = true;
        }

        var env = shouEnvelope();
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        var t = animTime;
        var kScale = Math.max(1, houseMaxDim / 8);
        var cx = shouContact.x;
        var cy = shouContact.y;
        var cz = shouContact.z;
        var i;
        var u = pointsMaterial.uniforms;

        u.uSweepStrength.value = 0;
        u.uSweepBoost.value = 1;
        u.uSweepY.value = -10;
        if (renderer && renderer.toneMappingExposure !== undefined) {
            renderer.toneMappingExposure = 1.2;
        }

        if (env.stage === 0) {
            applyDustTremor(env.fade);
            setPointColorHex(COL_HOUSE);
            u.uAccent.value = 0;
            u.uBloom.value = 0;
            u.uGlow.value = 1 + 0.45 * env.fade;
            u.uRipple.value = env.fade;
            u.uPointSize.value = 0.012;
            if (targetMesh) {
                targetMesh.visible = false;
                syncMeshMaterialOpacity(0);
            }
            points.visible = true;
            return;
        }

        var k = env.core;
        var bandW = Math.max(0.35, houseMaxDim * 0.09);
        var kind = shouKind;

        if (kind === 'dukha') {
            var radius = fract((modeElapsed - 1) * 0.62) * houseMaxDim * 1.25;
            var jagAmp = k * houseMaxDim * 0.055;
            var pushAmp = k * houseMaxDim * 0.022;
            for (i = 0; i < posArr.length; i += 3) {
                var dx = orig[i] - cx;
                var dy = orig[i + 1] - cy;
                var dz = orig[i + 2] - cz;
                var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
                var nx = dx / dist;
                var ny = dy / dist;
                var nz = dz / dist;
                var band = 1 - Math.min(1, Math.abs(dist - radius) / bandW);
                band *= band;
                var saw = fract(dist * 2.6 - t * 11) * 2 - 1;
                var sharp = saw >= 0 ? 1 : -1;
                var glitch = sharp * band + saw * 0.32;
                var jitter = Math.sin(t * 47 + orig[i] * 13.7) * band;
                posArr[i] = orig[i] + nx * (pushAmp + glitch * jagAmp) + off[i] * jitter * houseMaxDim * 0.014;
                posArr[i + 1] = orig[i + 1] + ny * (pushAmp + glitch * jagAmp) + off[i + 1] * jitter * houseMaxDim * 0.014;
                posArr[i + 2] = orig[i + 2] + nz * (pushAmp + glitch * jagAmp) + off[i + 2] * jitter * houseMaxDim * 0.014;
            }
        } else if (kind === 'sukha') {
            var radiusS = fract((modeElapsed - 1) * 0.28) * houseMaxDim * 1.15;
            var waveLen = Math.max(1.2, houseMaxDim * 0.55);
            var attractMax = k * 0.18;
            for (i = 0; i < posArr.length; i += 3) {
                var sx = orig[i] - cx;
                var sy = orig[i + 1] - cy;
                var sz = orig[i + 2] - cz;
                var sdist = Math.sqrt(sx * sx + sy * sy + sz * sz) || 0.0001;
                var sine = Math.sin((sdist - radiusS) * (Math.PI * 2 / waveLen));
                var attract = attractMax * (0.52 + 0.48 * sine);
                posArr[i] = orig[i] + (cx - orig[i]) * attract;
                posArr[i + 1] = orig[i + 1] + (cy - orig[i + 1]) * attract;
                posArr[i + 2] = orig[i + 2] + (cz - orig[i + 2]) * attract;
            }
        } else {
            for (i = 0; i < posArr.length; i += 3) {
                var breath = 0.02 * kScale * k * Math.sin(t * 1.35 + orig[i] * 0.1);
                posArr[i] = orig[i] * (1 + breath);
                posArr[i + 1] = orig[i + 1] * (1 + breath);
                posArr[i + 2] = orig[i + 2] * (1 + breath);
            }
        }

        setPointColorHex(COL_HOUSE);
        u.uAccent.value = 0;
        u.uBloom.value = 0;
        u.uGlow.value = 1;
        u.uPointSize.value = 0.012;
        u.uSweepY.value = -10;
        u.uSweepStrength.value = 0;

        if (env.stage === 2 && kind !== 'upeksha') {
            var follow = 0.1 + 0.35 * env.damp;
            for (i = 0; i < posArr.length; i += 3) {
                posArr[i] = lerp(posArr[i], orig[i], follow);
                posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], follow);
                posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], follow);
            }
        }

        points.geometry.attributes.position.needsUpdate = true;
        u.uPointAlpha.value = 1;
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
    }

    function ensureAiState() {
        if (!originalPositions) return;
        var count = originalPositions.length / 3;
        if (!aiPosX || aiPosX.length !== count) {
            aiPosX = new Float32Array(count);
            aiPosY = new Float32Array(count);
            aiFromX = new Float32Array(count);
            aiFromY = new Float32Array(count);
            aiFromLX = new Float32Array(count);
            aiFromLY = new Float32Array(count);
            aiFromLZ = new Float32Array(count);
            aiVelX = new Float32Array(count);
            aiVelY = new Float32Array(count);
        }
        if (typeof THREE !== 'undefined') {
            if (!aiRight) aiRight = new THREE.Vector3();
            if (!aiUp) aiUp = new THREE.Vector3();
            if (!aiCenter) aiCenter = new THREE.Vector3();
            if (!aiScratch) aiScratch = new THREE.Vector3();
        }
    }

    function resetAiPhysics() {
        if (aiPosX) aiPosX.fill(0);
        if (aiPosY) aiPosY.fill(0);
        if (aiFromX) aiFromX.fill(0);
        if (aiFromY) aiFromY.fill(0);
        if (aiFromLX) aiFromLX.fill(0);
        if (aiFromLY) aiFromLY.fill(0);
        if (aiFromLZ) aiFromLZ.fill(0);
        aiCamFromReady = false;
        if (aiVelX) aiVelX.fill(0);
        if (aiVelY) aiVelY.fill(0);
        aiAngle = 0;
        aiFromReady = false;
    }

    function captureAiFromCurrent() {
        ensureAiState();
        aiFromReady = false;
        if (!points || !aiFromX || !aiFromLX || !aiScratch || !updateAiBasis()) return;
        var posArr = points.geometry.attributes.position.array;
        var idx = 0;
        var i;
        for (i = 0; i < posArr.length; i += 3) {
            aiFromLX[idx] = posArr[i];
            aiFromLY[idx] = posArr[i + 1];
            aiFromLZ[idx] = posArr[i + 2];
            aiScratch.set(posArr[i], posArr[i + 1], posArr[i + 2]);
            points.localToWorld(aiScratch);
            aiScratch.sub(aiCenter);
            var fx = aiScratch.dot(aiRight);
            var fy = aiScratch.dot(aiUp);
            aiFromX[idx] = fx;
            aiFromY[idx] = fy;
            aiPosX[idx] = fx;
            aiPosY[idx] = fy;
            aiVelX[idx] = 0;
            aiVelY[idx] = 0;
            idx += 1;
        }
        aiAngle = 0;
        aiFromReady = true;
    }

    function seedAiHomesIfEmpty() {
        if (!aiPosX || !aiPosY || !aiSphereRadius) return;
        var max = 0;
        var n = Math.min(64, aiPosX.length);
        var i;
        for (i = 0; i < n; i++) {
            max = Math.max(max, Math.abs(aiPosX[i]), Math.abs(aiPosY[i]));
        }
        if (max > aiSphereRadius * 0.05) return;
        var r = aiSphereRadius;
        for (i = 0; i < aiPosX.length; i++) {
            var i2 = i * i;
            aiPosX[i] = Math.sin(i + aiAngle) * Math.sin(i2) * r;
            aiPosY[i] = Math.cos(i2) * r;
            aiVelX[i] = 0;
            aiVelY[i] = 0;
        }
    }

    function beginAi() {
        clearLiuruWaves();
        if (!expandComplete) forceExpandComplete();
        if (!pointsReady) {
            applyToPoints(1);
            markPointsReady();
        } else {
            keepPointCloud();
        }
        ensureAiState();
        if (points && points.geometry && points.geometry.attributes.position) {
            points.geometry.attributes.position.dynamic = true;
        }
        resetVedanaLook();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            pointsMaterial.uniforms.uGlow.value = 1.28;
        }
        lockAiControls();
        refreshAiSphereForCurrentCamera();
        captureAiFromCurrent();
        if (clock) clock.getDelta();
    }

    function applyAiLift(amount) {
        if (!modelRoot) return;
        modelRoot.position.y = modelRootBaseY + amount;
    }

    function restoreDefaultCamera() {
        if (!camera || !controls) return;
        var dist = houseMaxDim * 0.6;
        camera.position.set(dist * 1.2, dist * 0.4, dist);
        controls.target.set(0, 0, 0);
        controls.enableZoom = true;
        controls.minDistance = 0;
        controls.maxDistance = Infinity;
        controls.update();
        baseCameraDistance = camera.position.distanceTo(controls.target);
        syncControlsSphericalFromCamera();
    }

    function isPhaseMode(key) {
        return key === 'phase' || key === 'ring-flow';
    }

    function phaseInvScale() {
        return 1 / Math.max((houseMaxDim || 10) * 0.5, 1e-4);
    }

    function phaseAmpTarget() {
        var nx = mouseNDC.x;
        var u = (nx > -1.5 && nx < 1.5) ? (nx + 1) * 0.5 : 0.5;
        if (u < 0) u = 0;
        if (u > 1) u = 1;
        return (0.04 + u * 0.12) * Math.max((houseMaxDim || 10) * 0.5, 1);
    }

    function writePhaseOffset(posArr, i, orig, t, amp, inv) {
        var ph = t * 1.4 + orig[i] * 6 * inv + orig[i + 2] * 5 * inv;
        posArr[i] = orig[i] + Math.cos(ph) * amp;
        posArr[i + 1] = orig[i + 1] + Math.sin(ph * 0.85) * amp * 0.7;
        posArr[i + 2] = orig[i + 2] + Math.sin(ph * 1.1) * amp;
    }

    function hideHouseMeshes() {
        if (!modelRoot) return;
        modelRoot.traverse(function (child) {
            if (child.isMesh) {
                child.visible = false;
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 0;
                }
            }
        });
    }

    function beginPhase() {
        fadeFromPhase = false;
        phaseTime = 0;
        phaseAmp = 0;
        applyAiLift(0);
        unlockAiControls();
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        restoreDefaultCamera();
        resetVedanaLook();
        if (!pointsReady) markPointsReady();
        else hideMeshShowPoints();
        hideHouseMeshes();
        setSizeScale(1);
        if (points) {
            points.visible = true;
            points.frustumCulled = false;
            if (points.geometry && points.geometry.attributes.position) {
                points.geometry.attributes.position.dynamic = true;
            }
        }
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
        keepPointCloud();
    }

    function tickPhase(delta) {
        if (!points || !originalPositions) return;
        phaseTime += delta;
        var intro = Math.min(1, phaseTime / 0.75);
        intro = intro * intro * (3 - 2 * intro);
        var target = phaseAmpTarget();
        phaseAmp += (target - phaseAmp) * Math.min(1, delta * 6);
        var amp = phaseAmp * intro;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        if (posArr.length < orig.length) return;
        var inv = phaseInvScale();
        var i;
        for (i = 0; i < orig.length; i += 3) {
            writePhaseOffset(posArr, i, orig, phaseTime, amp, inv);
        }
        points.geometry.attributes.position.needsUpdate = true;
        keepPointCloud();
    }

    function beginFade() {
        var seamless = fadeFromPhase;
        applyAiLift(0);
        unlockAiControls();
        if (modelRoot && !seamless) modelRoot.scale.set(1, 1, 1);
        hideHouseMeshes();
        if (!seamless) restoreDefaultCamera();
        resetVedanaLook();
        if (seamless) {
            keepPointCloud();
        } else {
            hideMeshShowPoints();
            phaseTime = 0;
            phaseAmp = 0;
        }
        if (points) {
            points.visible = true;
            points.frustumCulled = false;
            if (points.geometry && points.geometry.attributes.position) {
                points.geometry.attributes.position.dynamic = true;
            }
        }
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
        var n = originalPositions ? originalPositions.length / 3 : 0;
        fadeDelay = new Float32Array(n);
        fadeSnapX = new Float32Array(n);
        fadeSnapY = new Float32Array(n);
        fadeSnapZ = new Float32Array(n);
        fadePeeling = new Uint8Array(n);
        var i;
        for (i = 0; i < n; i++) fadeDelay[i] = Math.random() * 5.4;
        if (!fadeInvMat) fadeInvMat = new THREE.Matrix4();
        if (!fadeUp) fadeUp = new THREE.Vector3();
        setSizeScale(1);
        if (!seamless) setPointPositionsToOriginal();
    }

    function tickFade(delta) {
        modeElapsed += delta;
        if (!points || !originalPositions || !fadeDelay) return;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        if (posArr.length < orig.length) return;
        var sizeAttr = points.geometry.attributes.aSizeScale;
        var sizeArr = sizeAttr ? sizeAttr.array : null;
        var t = modeElapsed;
        var lift = (houseMaxDim || 10) * 0.28;
        var drift = (houseMaxDim || 10) * 0.1;
        if (!fadeInvMat) fadeInvMat = new THREE.Matrix4();
        if (!fadeUp) fadeUp = new THREE.Vector3();
        fadeInvMat.copy(points.matrixWorld).invert();
        fadeUp.set(0, 1, 0).transformDirection(fadeInvMat).normalize();
        var ux = fadeUp.x * lift;
        var uy = fadeUp.y * lift;
        var uz = fadeUp.z * lift;
        if (fadeFromPhase) {
            phaseTime += delta;
            var target = phaseAmpTarget();
            phaseAmp += (target - phaseAmp) * Math.min(1, delta * 4);
            if (modelRoot) {
                var s = modelRoot.scale.x;
                var ns = s + (1 - s) * Math.min(1, delta * 1.8);
                modelRoot.scale.set(ns, ns, ns);
            }
        }
        var amp = fadeFromPhase ? phaseAmp : 0;
        var inv = phaseInvScale();
        var idx = 0;
        var i;
        for (i = 0; i < orig.length; i += 3) {
            var delay = fadeDelay[idx];
            var gone = t > delay ? (t - delay) * 0.55 : 0;
            if (gone <= 0) {
                if (fadeFromPhase && amp > 1e-5) {
                    writePhaseOffset(posArr, i, orig, phaseTime, amp, inv);
                } else {
                    posArr[i] = orig[i];
                    posArr[i + 1] = orig[i + 1];
                    posArr[i + 2] = orig[i + 2];
                }
                if (sizeArr && idx < sizeArr.length) sizeArr[idx] = 1;
            } else {
                if (fadePeeling && !fadePeeling[idx]) {
                    fadePeeling[idx] = 1;
                    if (fadeSnapX) {
                        fadeSnapX[idx] = posArr[i];
                        fadeSnapY[idx] = posArr[i + 1];
                        fadeSnapZ[idx] = posArr[i + 2];
                    }
                }
                var a = gone >= 1 ? 0 : 1 - gone;
                if (a <= 0.02) {
                    if (sizeArr && idx < sizeArr.length) sizeArr[idx] = 0;
                } else {
                    var n1 = Math.sin(orig[i] * 3.1 + t * 1.35);
                    var n2 = Math.sin(orig[i + 1] * 2.7 + t * 1.05 + 8.4);
                    var sx = fadeSnapX ? fadeSnapX[idx] : orig[i];
                    var sy = fadeSnapY ? fadeSnapY[idx] : orig[i + 1];
                    var sz = fadeSnapZ ? fadeSnapZ[idx] : orig[i + 2];
                    posArr[i] = sx + ux * gone + n1 * drift * gone;
                    posArr[i + 1] = sy + uy * gone + n2 * drift * gone;
                    posArr[i + 2] = sz + uz * gone;
                    if (sizeArr && idx < sizeArr.length) sizeArr[idx] = a;
                }
            }
            idx += 1;
        }
        points.geometry.attributes.position.needsUpdate = true;
        if (sizeAttr) sizeAttr.needsUpdate = true;
        hideHouseMeshes();
        points.visible = true;
        if (pointsMaterial) {
            var tail = t > 7.2 ? Math.max(0, 1 - (t - 7.2) / 2.6) : 1;
            pointsMaterial.uniforms.uPointAlpha.value = tail;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
    }

    function aiLiftAmount() {
        return (aiSphereRadius || houseMaxDim * AI_RADIUS_MUL) * 0.36 || houseMaxDim * AI_LIFT_MUL;
    }

    function beginQu() {
        clearLiuruWaves();
        if (!expandComplete) forceExpandComplete();
        if (!pointsReady) {
            applyToPoints(1);
            markPointsReady();
        } else {
            keepPointCloud();
        }
        ensureAiState();
        if (!(aiSphereRadius > 0)) refreshAiSphereForCurrentCamera();
        seedAiHomesIfEmpty();
        if (points && points.geometry && points.geometry.attributes.position) {
            points.geometry.attributes.position.dynamic = true;
        }
        resetVedanaLook();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            pointsMaterial.uniforms.uGlow.value = 1.35;
        }
        lockAiControls();
    }

    function lockAiControls() {
        if (!controls) return;
        controls.enabled = false;
        controls.enableZoom = false;
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableDamping = false;
    }

    function unlockAiControls() {
        if (!controls) return;
        controls.enabled = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.minDistance = 0;
        controls.maxDistance = Infinity;
    }

    function refreshAiSphereForCurrentCamera() {
        if (!camera) return;
        if (!aiCenter && typeof THREE !== 'undefined') aiCenter = new THREE.Vector3();
        if (!aiCenter) return;
        var tx = controls ? controls.target.x : 0;
        var ty = controls ? controls.target.y : 0;
        var tz = controls ? controls.target.z : 0;
        var dist = camera.position.distanceTo(controls ? controls.target : aiCenter.set(tx, ty, tz));
        if (!(dist > 1e-4)) dist = baseCameraDistance || houseMaxDim || 1;
        var h = (containerEl && containerEl.clientHeight) || global.innerHeight || 800;
        var w = (containerEl && containerEl.clientWidth) || global.innerWidth || 800;
        var fov = camera.fov || 60;
        var tanHalf = Math.tan(fov * Math.PI / 360);
        var targetDiam = Math.min(w, h) * AI_SCREEN_RATIO;
        aiSphereRadius = Math.max(targetDiam * dist * tanHalf / Math.max(h, 1), houseMaxDim * 0.02);
        var lift = (AI_SCREEN_LIFT_PX / Math.max(h, 1)) * (2 * dist * tanHalf);
        var ux = camera.up.x;
        var uy = camera.up.y;
        var uz = camera.up.z;
        var ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
        aiCenter.set(tx + (ux / ul) * lift, ty + (uy / ul) * lift, tz + (uz / ul) * lift);
    }

    function updateAiBasis() {
        if (!camera || !points || !aiCenter) return false;
        points.updateMatrixWorld(true);
        if (!(aiSphereRadius > 0)) refreshAiSphereForCurrentCamera();
        aiScratch.copy(camera.position).sub(aiCenter);
        if (aiScratch.lengthSq() < 1e-8) return false;
        aiScratch.normalize();
        aiRight.crossVectors(camera.up, aiScratch);
        if (aiRight.lengthSq() < 1e-8) aiRight.set(1, 0, 0);
        else aiRight.normalize();
        aiUp.crossVectors(aiScratch, aiRight).normalize();
        return true;
    }

    function mouseOnAiPlane() {
        if (!camera || !aiCenter) return null;
        aiScratch.set(mouseNDC.x, mouseNDC.y, 0.5).unproject(camera);
        aiScratch.sub(camera.position);
        if (aiScratch.lengthSq() < 1e-10) return null;
        aiScratch.normalize();
        var nx = camera.position.x - aiCenter.x;
        var ny = camera.position.y - aiCenter.y;
        var nz = camera.position.z - aiCenter.z;
        var nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;
        var denom = nx * aiScratch.x + ny * aiScratch.y + nz * aiScratch.z;
        if (Math.abs(denom) < 1e-5) return null;
        var tHit = (nx * (aiCenter.x - camera.position.x) + ny * (aiCenter.y - camera.position.y) + nz * (aiCenter.z - camera.position.z)) / denom;
        if (tHit < 0) return null;
        var hx = camera.position.x + aiScratch.x * tHit - aiCenter.x;
        var hy = camera.position.y + aiScratch.y * tHit - aiCenter.y;
        var hz = camera.position.z + aiScratch.z * tHit - aiCenter.z;
        return {
            x: hx * aiRight.x + hy * aiRight.y + hz * aiRight.z,
            y: hx * aiUp.x + hy * aiUp.y + hz * aiUp.z,
        };
    }

    function simulateAiSphere(delta, form) {
        if (!updateAiBasis()) return;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var r = aiSphereRadius;
        var rR = r * AI_REPEL_RATIO;
        var rR2 = rR * rR;
        var minDistSq = (r * 0.02) * (r * 0.02);
        var strength = AI_REPEL_STRENGTH * (r / 250);
        var frameScale = Math.min(2.5, Math.max(0.5, delta / 0.016));
        var attract = AI_ATTRACTION * frameScale;
        var damp = Math.pow(AI_DAMPING, frameScale);
        var mouseLive = mouseNDC.x > -1.5 && mouseNDC.x < 1.5;
        var mouse2 = mouseLive ? mouseOnAiPlane() : null;
        var mx = mouse2 ? mouse2.x : 0;
        var my = mouse2 ? mouse2.y : 0;
        aiAngle += AI_ANGLE_STEP * frameScale;
        var formed = form >= 0.999;
        var i;
        var idx = 0;
        for (i = 0; i < posArr.length; i += 3) {
            var i2 = idx * idx;
            var homeX = Math.sin(idx + aiAngle) * Math.sin(i2) * r;
            var homeY = Math.cos(i2) * r;
            var px;
            var py;
            var vx;
            var vy;
            if (!formed) {
                if (aiFromReady && aiFromLX) {
                    aiScratch.set(aiFromLX[idx], aiFromLY[idx], aiFromLZ[idx]);
                } else {
                    aiScratch.set(orig[i], orig[i + 1], orig[i + 2]);
                }
                points.localToWorld(aiScratch);
                var fx = aiScratch.x;
                var fy = aiScratch.y;
                var fz = aiScratch.z;
                var hx = aiCenter.x + aiRight.x * homeX + aiUp.x * homeY;
                var hy = aiCenter.y + aiRight.y * homeX + aiUp.y * homeY;
                var hz = aiCenter.z + aiRight.z * homeX + aiUp.z * homeY;
                aiScratch.set(lerp(fx, hx, form), lerp(fy, hy, form), lerp(fz, hz, form));
                px = (aiScratch.x - aiCenter.x) * aiRight.x + (aiScratch.y - aiCenter.y) * aiRight.y + (aiScratch.z - aiCenter.z) * aiRight.z;
                py = (aiScratch.x - aiCenter.x) * aiUp.x + (aiScratch.y - aiCenter.y) * aiUp.y + (aiScratch.z - aiCenter.z) * aiUp.z;
                vx = 0;
                vy = 0;
                points.worldToLocal(aiScratch);
                posArr[i] = aiScratch.x;
                posArr[i + 1] = aiScratch.y;
                posArr[i + 2] = aiScratch.z;
            } else {
                px = aiPosX[idx];
                py = aiPosY[idx];
                vx = aiVelX[idx] + (homeX - px) * attract;
                vy = aiVelY[idx] + (homeY - py) * attract;
                if (mouse2) {
                    var ddx = px - mx;
                    var ddy = py - my;
                    var distSq = ddx * ddx + ddy * ddy;
                    if (distSq > minDistSq && distSq < rR2) {
                        var dist = Math.sqrt(distSq);
                        var repel = strength * (1 - dist / rR) * frameScale;
                        vx += (ddx / dist) * repel;
                        vy += (ddy / dist) * repel;
                    }
                }
                vx *= damp;
                vy *= damp;
                px += vx;
                py += vy;
                aiScratch.copy(aiCenter).addScaledVector(aiRight, px).addScaledVector(aiUp, py);
                points.worldToLocal(aiScratch);
                posArr[i] = aiScratch.x;
                posArr[i + 1] = aiScratch.y;
                posArr[i + 2] = aiScratch.z;
            }
            aiPosX[idx] = px;
            aiPosY[idx] = py;
            aiVelX[idx] = vx;
            aiVelY[idx] = vy;
            idx += 1;
        }
        points.geometry.attributes.position.needsUpdate = true;
        setPointColorHex(COL_HOUSE);
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        pointsMaterial.uniforms.uGlow.value = lerp(1.28, 1.35, form);
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
        if (mouse2 && pointsMaterial.uniforms.uMouse) {
            aiScratch.copy(aiCenter).addScaledVector(aiRight, mx).addScaledVector(aiUp, my);
            pointsMaterial.uniforms.uMouse.value.copy(aiScratch);
        }
    }

    function tickAi(delta) {
        modeElapsed += delta;
        ensureAiState();
        if (!points || !originalPositions || !aiPosX || !pointsMaterial) return;
        if (!pointsReady) {
            keepPointCloud();
            pointsReady = true;
        }
        if (!aiFromReady) return;
        var t = modeElapsed;
        var form = easeInOut(Math.min(1, t / AI_FORM_S));
        simulateAiSphere(delta, form);
    }

    function tickQu(delta) {
        modeElapsed += delta;
        ensureAiState();
        if (!points || !originalPositions || !aiPosX || !pointsMaterial) return;
        if (!pointsReady) {
            hideMeshShowPoints();
            pointsReady = true;
        }
        simulateAiSphere(delta, 1);
    }

    function tickPlaceholder(delta) {
        modeElapsed += delta;
        if (pointsReady && points) {
            var progress = modeDuration > 0 ? Math.min(1, modeElapsed / modeDuration) : 1;
            applyWumingSettle(progress);
        } else if (expandComplete) {
            return;
        }
    }

    function applyModelBreathScale() {
        if (!modelRoot || !pointsReady || mode === 'particleize' || mode === 'six-circles' || mode === 'chu' || mode === 'shou' || mode === 'ai' || mode === 'qu' || mode === 'fade') return;
        var t = animTime - idleEffectsStartTime;
        if (t < 0) t = 0;
        var ramp = Math.min(1, t / 2.0);
        var breath = 1 + BREATH_AMPLITUDE * ramp * Math.sin(t * BREATH_SPEED);
        modelRoot.scale.set(breath, breath, breath);
    }

    function applyCameraDolly() {
        if (!controls || !controls.spherical || baseCameraDistance <= 0 || !pointsReady || mode === 'particleize' || mode === 'six-circles' || mode === 'chu' || mode === 'shou' || mode === 'ai' || mode === 'qu' || mode === 'fade') {
            return;
        }

        var t = animTime - idleEffectsStartTime;
        if (t < 0) t = 0;
        var ramp = Math.min(1, t / 2.5);
        var dollyT = Math.sin(animTime * DOLLY_SPEED) * 0.5 + 0.5;
        var distMul = lerp(1, lerp(DOLLY_MIN, DOLLY_MAX, dollyT), ramp);
        controls.spherical.radius = baseCameraDistance * distMul;
    }

    function renderFrame() {
        if (!renderer || !scene || !camera) return;
        applyCameraDolly();
        if (mode !== 'ai' && mode !== 'qu' && controls) {
            controls.update();
        }
        renderHouse();
    }

    function updateHoloScan(delta) {
        var u = pointsMaterial && pointsMaterial.uniforms;
        if (!u || !u.uHoloOn) return;
        var alpha = u.uPointAlpha ? u.uPointAlpha.value : 0;
        var showing = points && points.visible && alpha > 0.02;
        if (!showing || mode === 'ai' || mode === 'qu') {
            u.uHoloOn.value = 0;
            return;
        }
        var lo = sweepMinY;
        var hi = sweepMaxY;
        if (points) {
            points.updateMatrixWorld(true);
            var box = new THREE.Box3().setFromObject(points);
            if (isFinite(box.min.y) && isFinite(box.max.y) && box.max.y > box.min.y + 0.05) {
                lo = box.min.y;
                hi = box.max.y;
            }
        }
        var span = hi - lo;
        if (!(span > 0.05)) span = houseMaxDim || 10;
        holoPhase += delta * 0.22;
        if (holoPhase >= 1) holoPhase -= Math.floor(holoPhase);
        u.uHoloOn.value = 1;
        u.uHoloY.value = lo - span * 0.12 + holoPhase * span * 1.24;
        u.uHoloWidth.value = Math.max(span * 0.11, 0.22);
        u.uHoloKick.value = Math.max(span * 0.085, 0.12);
    }

    function updateIdleMotion(delta) {
        if (!modelRoot) return;
        animTime += delta;
        if (pointsMaterial && pointsMaterial.uniforms.uTime) {
            pointsMaterial.uniforms.uTime.value = animTime;
        }
        updateHoloScan(delta);
        if (liuruNodes) {
            for (var w = 0; w < liuruNodes.length; w++) {
                if (liuruNodes[w].lit && liuruNodes[w].age < 8) {
                    liuruNodes[w].age += delta;
                }
            }
        }
        if (cloudShocks) {
            var s;
            for (s = 0; s < cloudShocks.length; s++) {
                if (cloudShocks[s].age < 8) {
                    cloudShocks[s].age += delta;
                    syncCloudShock(s);
                }
            }
        }
        if (mode !== 'ai' && mode !== 'qu') {
            modelRoot.rotation.y += MODEL_ROTATE_Y;
        }
        applyModelBreathScale();
    }

    function animate() {
        if (!renderer || !scene || !camera || !clock) {
            rafId = 0;
            return;
        }

        var delta = clock.getDelta();
        if (delta > 0.2) delta = 0.033;

        try {
            if (mode === 'expand') {
                tickExpand(delta);
            } else if (mode === 'particleize') {
                tickParticleize(delta);
            } else if (mode === 'six-circles') {
                tickLiuru(delta);
            } else if (mode === 'chu') {
                tickChu(delta);
            } else if (mode === 'shou') {
                tickShou(delta);
            } else if (mode === 'ai') {
                tickAi(delta);
            } else if (mode === 'qu') {
                tickQu(delta);
            } else if (mode === 'fade') {
                tickFade(delta);
            } else if (mode === 'phase' || mode === 'ring-flow') {
                tickPhase(delta);
            } else {
                tickPlaceholder(delta);
            }

            updateIdleMotion(delta);
            syncMouseRipple();
            renderFrame();
        } catch (err) {
            console.error('[HouseModel] frame', err);
        }
        rafId = global.requestAnimationFrame(animate);
    }

    function startLoop() {
        if (rafId) return;
        if (clock) clock.getDelta();
        rafId = global.requestAnimationFrame(animate);
    }

    function stopLoop() {
        if (rafId) {
            global.cancelAnimationFrame(rafId);
            rafId = 0;
        }
    }

    function init(container) {
        containerEl = container;
    }

    /**
     * @param {string} stageKey expand | particleize | ...
     * @param {{ durationMs?: number, onMouseMove?: function }} opts
     */
    function enterStageMode(stageKey, opts) {
        opts = opts || {};
        var prevMode = mode;
        var seamlessFade = isPhaseMode(prevMode) && stageKey === 'fade';
        fadeFromPhase = seamlessFade;
        onMouseMoveCb = opts.onMouseMove || null;
        modeDuration = (opts.durationMs || 5000) / 1000;
        modeElapsed = 0;
        if (stageKey === 'ai' && pointsReady && points) {
            beginAi();
        }
        mode = stageKey;

        if (!containerEl) return Promise.resolve();

        containerEl.dataset.houseMode = stageKey || '';
        if (!seamlessFade) coverHouseLayer();
        if (!loaded) showLoading();
        suspended = false;

        return ensureLoaded().then(function () {
            if (!gpuWarmed) warmupGpu();
            modeElapsed = 0;
            if (stageKey !== 'ai' && stageKey !== 'qu') {
                unlockAiControls();
                applyAiLift(0);
            }
            if (stageKey !== 'six-circles') endLiuruUi();
            if (stageKey !== 'particleize') clearMingseDual();

            if (stageKey === 'expand') {
                animTime = 0;
                idleEffectsStartTime = 0;
                expandComplete = false;
                pointsReady = false;
                if (modelRoot) {
                    modelRoot.rotation.y = MODEL_YAW0;
                }
                onResize();
                applyExpand(0);
                renderFrame();
            } else if (stageKey === 'particleize') {
                beginMingseDual();
                onResize();
                renderFrame();
            } else if (stageKey === 'six-circles') {
                if (!expandComplete) forceExpandComplete();
                if (!pointsReady) {
                    applyToPoints(1);
                    markPointsReady();
                } else {
                    hideMeshShowPoints();
                }
                beginLiuru();
                onResize();
                renderFrame();
            } else if (stageKey === 'chu') {
                beginChu();
                onResize();
                renderFrame();
            } else if (stageKey === 'shou') {
                beginShou(opts.vedanaKind);
                onResize();
                renderFrame();
            } else if (stageKey === 'ai') {
                if (!aiFromReady) beginAi();
                onResize();
                renderFrame();
            } else if (stageKey === 'qu') {
                if (prevMode !== 'qu') beginQu();
                onResize();
                renderFrame();
            } else if (stageKey === 'phase' || stageKey === 'ring-flow') {
                beginPhase();
                onResize();
                renderFrame();
            } else if (stageKey === 'fade') {
                beginFade();
                onResize();
                renderFrame();
            } else if (loaded) {
                resetVedanaLook();
                if (!pointsReady) {
                    if (!expandComplete) forceExpandComplete();
                    applyToPoints(1);
                    markPointsReady();
                } else if (points) {
                    points.visible = true;
                    if (targetMesh) {
                        targetMesh.visible = false;
                        syncMeshMaterialOpacity(0);
                    }
                    if (pointsMaterial) {
                        pointsMaterial.uniforms.uPointAlpha.value = 1;
                        pointsMaterial.uniforms.uGlow.value = 1;
                    }
                }
                onResize();
                renderFrame();
            } else {
                onResize();
                ensurePointCloudReady();
                renderFrame();
            }

            startLoop();
            revealHouseLayer();
        });
    }

    function tearDownRenderer() {
        stopLoop();
        if (aeGlow) {
            aeGlow.dispose();
            aeGlow = null;
        }
        if (renderer) {
            global.removeEventListener('resize', onResize);
            global.removeEventListener('pointermove', onMouseMove);
            if (controls) controls.dispose();
            controls = null;
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer = null;
        }
        scene = null;
        camera = null;
        modelRoot = null;
        targetMesh = null;
        meshBaseMaterial = null;
        extraHouseMeshes = [];
        points = null;
        pointsMaterial = null;
        cloudShocks = null;
        clock = null;
        canvasReady = false;
        if (containerEl) {
            containerEl.innerHTML = '';
            containerEl.hidden = true;
            containerEl.style.visibility = '';
        }
    }

    function suspend(opts) {
        opts = opts || {};
        endLiuruUi();
        stopLoop();
        onMouseMoveCb = null;
        mode = null;
        modeElapsed = 0;
        if (!opts.keepVisible) applyAiLift(0);
        if (controls) {
            controls.enabled = false;
            controls.enableZoom = false;
            controls.enableRotate = false;
        }
        if (containerEl) {
            if (!opts.keepVisible) {
                containerEl.hidden = true;
                containerEl.style.visibility = '';
            }
            containerEl.dataset.houseMode = '';
        }
        suspended = !!(renderer && points);
        loaded = loaded || suspended;
    }

    function exitStage() {
        endLiuruUi();
        onMouseMoveCb = null;
        mode = null;
        modeElapsed = 0;
        tearDownRenderer();
        originalPositions = null;
        randomOffsets = null;
        fadeDelay = null;
        fadeSnapX = null;
        fadeSnapY = null;
        fadeSnapZ = null;
        fadePeeling = null;
        fadeFromPhase = false;
        phaseTime = 0;
        phaseAmp = 0;
        cachedGltf = null;
        suspended = false;
        loaded = false;
        loadPromise = null;
        expandComplete = false;
        pointsReady = false;
        gpuWarmed = false;
        if (containerEl) containerEl.dataset.houseMode = '';
    }

    function isActive() {
        return !!mode && loaded;
    }

    function getCloudColorRgb() {
        return {
            r: (COL_HOUSE >> 16) & 255,
            g: (COL_HOUSE >> 8) & 255,
            b: COL_HOUSE & 255,
        };
    }

    global.HouseModelStage = {
        init: init,
        enterStageMode: enterStageMode,
        exitStage: exitStage,
        suspend: suspend,
        isActive: isActive,
        getCloudColorRgb: getCloudColorRgb,
        isLiuruComplete: function () { return liuruComplete; },
        ensureLoaded: ensureLoaded,
        prefetchModel: prefetchModel,
        debugState: function () {
            return {
                mode: mode,
                modeElapsed: modeElapsed,
                loaded: loaded,
                rafId: rafId,
                hasRenderer: !!renderer,
                hasScene: !!scene,
                hasTargetMesh: !!targetMesh,
                hasClock: !!clock,
                shouKind: shouKind,
            };
        },
    };
})(typeof window !== 'undefined' ? window : this);
