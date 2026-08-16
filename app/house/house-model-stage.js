(function (global) {
    'use strict';

    var containerEl = null;
    var onMouseMoveCb = null;

    var scene = null;
    var camera = null;
    var renderer = null;
    var controls = null;
    var modelRoot = null;
    var targetMesh = null;
    var points = null;
    var pointsMaterial = null;
    var originalPositions = null;
    var randomOffsets = null;
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
    var mouseNDC = { x: -2, y: -2 };
    var mouseWorld = null;
    var shouKind = 'sukha';
    var shouContact = { x: 0, y: 0, z: 0 };
    var sweepMinY = -2;
    var sweepMaxY = 2;
    var COL_HOUSE = 0x8B5CF6;
    var AI_FORM_S = 6.5;
    var AI_CONTRACT_S = 1.8;
    var AI_SCREEN_RATIO = 0.26;
    var AI_ATTRACTION = 0.045;
    var AI_DAMPING = 0.76;
    var AI_REPEL_STRENGTH = 28;
    var AI_REPEL_RATIO = 90 / 250;
    var AI_ANGLE_STEP = 0.01;
    var aiSphereRadius = 0;
    var aiCamStart = 0;
    var aiAngle = 0;
    var aiPosX = null;
    var aiPosY = null;
    var aiFromX = null;
    var aiFromY = null;
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
    /** 名色：先溶成点云，再走旧项目 sin 拉扯，最后慢慢收成稳定房屋点云 */
    var MINGSE_DISSOLVE_S = 2.4;
    var MINGSE_SETTLE_S = 2.5;
    var MINGSE_PULL_AMP = 0.08;
    var MINGSE_RESTORE = 0.015;

    /** 与老项目 model-morph-32s-embed 一致 */
    var MODEL_ROTATE_Y = 0.0008;
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
        var href = global.location.href;
        return [
            new URL(rel, href).toString(),
            new URL('/assets/models/less_25mb.glb', href).toString(),
            new URL('./assets/models/less_25mb.glb', href).toString(),
            rel,
            '../assets/models/less_25mb.glb',
            'assets/models/less_25mb.glb',
        ];
    }

    var HOUSE_MODEL_LOADER_VERSION = 25;
    var gpuWarmed = false;
    var TEXTURE_MAX = 4096;

    function loadModelWithFallback(urls) {
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

    function warmupGpu() {
        if (gpuWarmed || !renderer || !scene || !camera || !targetMesh) return;
        targetMesh.visible = true;
        try {
            if (typeof renderer.compile === 'function') renderer.compile(scene, camera);
            renderer.render(scene, camera);
        } catch (err) {
            console.warn('[HouseModel] gpu warmup', err);
        }
        gpuWarmed = true;
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
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
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
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        var dir = new THREE.DirectionalLight(0xffffff, 1.0);
        dir.position.set(5, 5, 5);
        scene.add(dir);

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
        points = null;
        originalPositions = null;

        modelRoot = new THREE.Group();
        scene.add(modelRoot);
        modelRoot.add(gltf.scene);

        gltf.scene.traverse(function (child) {
            if (child.isMesh && !targetMesh) {
                targetMesh = child;
                var mat = child.material;
                child.material = new THREE.MeshStandardMaterial({
                    color: mat.color,
                    map: mat.map,
                    roughness: mat.roughness,
                    metalness: mat.metalness,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                });
                targetMesh.frustumCulled = false;
            }
        });

        if (!targetMesh) throw new Error('No mesh in GLB');

        var geom = targetMesh.geometry;
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
                uColor: { value: new THREE.Color(0x8B5CF6) },
                uColorB: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                uAccent: { value: 0 },
                uBloom: { value: 0 },
                uSweepY: { value: -10 },
                uSweepWidth: { value: 0.45 },
                uSweepColor: { value: new THREE.Vector3(0.325, 0.388, 0.349) },
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
                '  if (uPointAlpha < 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
                '  vec4 world = modelMatrix * vec4(position, 1.0);',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  float dist = max(length(mv.xyz), 0.001);',
                '  float shock = bandOf(position, uW0, uA0) + bandOf(position, uW1, uA1) + bandOf(position, uW2, uA2);',
                '  shock += bandOf(position, uW3, uA3) + bandOf(position, uW4, uA4) + bandOf(position, uW5, uA5);',
                '  float reveal = revealOf(position, uW0, uA0, uL0) + revealOf(position, uW1, uA1, uL1) + revealOf(position, uW2, uA2, uL2);',
                '  reveal += revealOf(position, uW3, uA3, uL3) + revealOf(position, uW4, uA4, uL4) + revealOf(position, uW5, uA5, uL5);',
                '  float mouseDist = length(world.xyz - uMouse);',
                '  float rippleHalo = 1.0 - smoothstep(uMouseRadius * 0.12, uMouseRadius, mouseDist);',
                '  float rippleCore = 1.0 - smoothstep(0.0, uMouseRadius * 0.3, mouseDist);',
                '  float ripple = min(1.0, rippleHalo * 0.72 + rippleCore) * uRipple;',
                '  float sweepBand = 1.0 - smoothstep(0.0, uSweepWidth, abs(world.y - uSweepY));',
                '  gl_PointSize = uPointSize * (300.0 / dist) * aSizeScale * (1.0 + shock * 2.4 + reveal * 0.55 + ripple * 1.15 + sweepBand * 2.2 * uSweepBoost + uBloom * 1.85);',
                '  gl_Position = projectionMatrix * mv;',
                '  vGlow = uGlow + shock * 3.4 + reveal * 1.6 + ripple * 7.2 + sweepBand * 3.2 * uSweepBoost + uBloom * 1.45;',
                '  vSweep = max(max(shock, ripple), sweepBand);',
                '  vReveal = reveal;',
                '  vRipple = ripple;',
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
                'void main() {',
                '  if (uPointAlpha < 0.001) discard;',
                '  float d = length(gl_PointCoord - 0.5) * 2.0;',
                '  float a = 1.0 - smoothstep(0.2, 1.0, d);',
                '  a *= vGlow * uPointAlpha;',
                '  vec3 col = mix(uColor, uColorB, uAccent);',
                '  col = mix(col, uSweepColor, vSweep * uSweepStrength);',
                '  col = mix(col, vec3(1.0), vRipple * 0.68);',
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
        modelRootBaseY = modelRoot.position.y;

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
            depthWrite: false,
        });
    }

    function syncMeshMaterialOpacity(opacity) {
        if (!targetMesh) return;
        targetMesh.material.opacity = Math.max(0, Math.min(1, opacity));
        targetMesh.material.transparent = true;
        targetMesh.material.depthWrite = false;
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

    function doEnsureLoaded() {
        if (loaded) return Promise.resolve();
        if (loadPromise) return loadPromise;
        if (typeof THREE === 'undefined') {
            return Promise.reject(new Error('THREE not available — use HTTP server from project root'));
        }
        showLoading();
        ensureRenderer();
        loadPromise = loadModelWithFallback(buildModelUrls()).then(function (gltf) {
            clearLoading();
            setupFromGltf(gltf);
            var map = targetMesh && targetMesh.material && targetMesh.material.map;
            return capColorMap(map).then(function () {
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

    function syncMouseRipple() {
        if (!pointsMaterial || !pointsMaterial.uniforms.uRipple) return;
        if (!pointsAreVisible() || mode === 'ai' || mode === 'qu') {
            pointsMaterial.uniforms.uRipple.value = 0;
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
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var ease = easeOut(p);
        var follow = 0.012 + 0.036 * ease;
        if (p > 0.82) follow = lerp(follow, 0.16, (p - 0.82) / 0.18);
        var wiggle = MINGSE_PULL_AMP * (1 - ease) * (1 - ease);
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = lerp(posArr[i], orig[i], follow) + Math.sin(animTime * 2.6 + orig[i]) * wiggle;
            posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], follow) + Math.sin(animTime * 2.6 + orig[i + 1]) * wiggle;
            posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], follow) + Math.sin(animTime * 2.6 + orig[i + 2]) * wiggle;
        }
        points.geometry.attributes.position.needsUpdate = true;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointSize.value = lerp(0.006, 0.012, ease);
            pointsMaterial.uniforms.uPointAlpha.value = 1;
        }
        setSizeScale(lerp(0.85, 1, ease));
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
        if (p >= 1) setPointPositionsToOriginal();
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
        for (var i = 0; i < liuruNodes.length; i++) {
            liuruNodes[i].el = makeLiuruNodeEl(i);
            liuruOverlay.appendChild(liuruNodes[i].el);
            syncLiuruWave(i);
        }
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
        if (mode !== 'six-circles' || !liuruNodes) return;
        var dx = e.clientX - liuruPointer.x;
        var dy = e.clientY - liuruPointer.y;
        if (dx * dx + dy * dy > 36) return;
        pickLiuruNode(e.clientX, e.clientY);
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
        syncLiuruWave(index);
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
        var duration = Math.max(modeDuration, MINGSE_DISSOLVE_S + MINGSE_SETTLE_S);
        var dissolveS = Math.min(MINGSE_DISSOLVE_S, Math.max(0.4, duration - MINGSE_SETTLE_S - 0.5));
        var pullEnd = Math.max(dissolveS, duration - MINGSE_SETTLE_S);

        if (modeElapsed < dissolveS) {
            var p = easeInOut(Math.min(1, modeElapsed / dissolveS));
            applyToPoints(p);
            setSizeScale(0.85);
            if (pointsMaterial) pointsMaterial.uniforms.uPointSize.value = 0.006;
            return;
        }

        if (!pointsReady) {
            pointsReady = true;
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

        if (modeElapsed < pullEnd) {
            var phase = (modeElapsed - dissolveS) / Math.max(0.001, pullEnd - dissolveS);
            applyMingsePull(Math.min(1, phase));
            return;
        }

        applyMingseSettle((modeElapsed - pullEnd) / MINGSE_SETTLE_S);
    }

    function ensureRandomOffsets() {
        if (!originalPositions) return;
        if (randomOffsets && randomOffsets.length === originalPositions.length) return;
        randomOffsets = new Float32Array(originalPositions.length);
        for (var ri = 0; ri < randomOffsets.length; ri++) {
            randomOffsets[ri] = (Math.random() * 2 - 1) * 1.2;
        }
    }

    function clearLiuruWaves() {
        liuruNodes = null;
        if (!pointsMaterial) return;
        for (var i = 0; i < 6; i++) {
            pointsMaterial.uniforms['uA' + i].value = 99;
            pointsMaterial.uniforms['uL' + i].value = 0;
        }
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
        if (!points || !originalPositions || !randomOffsets) return;
        if (!pointsReady) {
            hideMeshShowPoints();
            pointsReady = true;
        }
        var k = Math.max(1, houseMaxDim / 8);
        var osc = 0.05 * k * Math.sin(animTime * 15);
        var wave = 0.032 * k;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        var t = animTime;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = orig[i] + off[i] * osc + Math.sin(t * 8 + i * 0.01) * wave;
            posArr[i + 1] = orig[i + 1] + off[i + 1] * osc + Math.cos(t * 7 + i * 0.01) * wave;
            posArr[i + 2] = orig[i + 2] + off[i + 2] * osc;
        }
        points.geometry.attributes.position.needsUpdate = true;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uGlow.value = 1;
            pointsMaterial.uniforms.uRipple.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012 * (1 + 0.28 * Math.abs(Math.sin(t * 15)));
        }
        if (targetMesh) {
            targetMesh.visible = false;
            syncMeshMaterialOpacity(0);
        }
        points.visible = true;
        updateMouseWorld();
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
            var osc = 0.05 * kScale * Math.sin(t * 15) * env.fade;
            var wave = 0.032 * kScale * env.fade;
            for (i = 0; i < posArr.length; i += 3) {
                posArr[i] = orig[i] + off[i] * osc + Math.sin(t * 8 + i * 0.01) * wave;
                posArr[i + 1] = orig[i + 1] + off[i + 1] * osc + Math.cos(t * 7 + i * 0.01) * wave;
                posArr[i + 2] = orig[i + 2] + off[i + 2] * osc;
            }
            setPointColorHex(COL_HOUSE);
            u.uAccent.value = 0;
            u.uBloom.value = 0;
            u.uGlow.value = 1 + 0.45 * env.fade;
            u.uPointSize.value = 0.012 * (1 + 0.22 * env.fade);
            points.geometry.attributes.position.needsUpdate = true;
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
        var radius = houseMaxDim * 0.24;
        var count = originalPositions.length / 3;
        aiSphereRadius = radius;
        if (!aiPosX || aiPosX.length !== count) {
            aiPosX = new Float32Array(count);
            aiPosY = new Float32Array(count);
            aiFromX = new Float32Array(count);
            aiFromY = new Float32Array(count);
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
        if (aiVelX) aiVelX.fill(0);
        if (aiVelY) aiVelY.fill(0);
        aiAngle = 0;
        aiFromReady = false;
    }

    function captureAiFromCurrent() {
        ensureAiState();
        aiFromReady = false;
        if (!points || !aiFromX || !aiScratch || !updateAiBasis()) return;
        var posArr = points.geometry.attributes.position.array;
        var idx = 0;
        var i;
        for (i = 0; i < posArr.length; i += 3) {
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
        captureAiFromCurrent();
        if (points && points.geometry && points.geometry.attributes.position) {
            points.geometry.attributes.position.dynamic = true;
        }
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        resetVedanaLook();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
        }
        if (controls && controls.spherical) {
            aiCamStart = controls.spherical.radius;
        } else {
            aiCamStart = baseCameraDistance;
        }
        applyAiLift(0);
        lockAiControls();
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

    function beginPointsHold() {
        applyAiLift(0);
        unlockAiControls();
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        restoreDefaultCamera();
        resetVedanaLook();
        hideMeshShowPoints();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            pointsMaterial.uniforms.uGlow.value = 1;
        }
    }

    function tickPointsHold() {
        if (!points || !originalPositions) return;
        setPointPositionsToOriginal();
        keepPointCloud();
    }

    function aiLiftAmount() {
        return (aiSphereRadius || houseMaxDim * 0.24) * 0.36 || houseMaxDim * AI_LIFT_MUL;
    }

    function beginQu() {
        clearLiuruWaves();
        if (!expandComplete) forceExpandComplete();
        if (!pointsReady) {
            applyToPoints(1);
            markPointsReady();
        } else {
            hideMeshShowPoints();
        }
        ensureAiState();
        seedAiHomesIfEmpty();
        if (points && points.geometry && points.geometry.attributes.position) {
            points.geometry.attributes.position.dynamic = true;
        }
        if (modelRoot) modelRoot.scale.set(1, 1, 1);
        resetVedanaLook();
        if (pointsMaterial) {
            pointsMaterial.uniforms.uPointAlpha.value = 1;
            pointsMaterial.uniforms.uPointSize.value = 0.008;
        }
        aiCamStart = aiEndCameraDistance();
        applyAiLift(aiLiftAmount());
        lockAiControls();
    }

    function lockAiControls() {
        if (!controls) return;
        controls.enableZoom = false;
    }

    function unlockAiControls() {
        if (!controls) return;
        controls.enableZoom = true;
        controls.minDistance = 0;
        controls.maxDistance = Infinity;
    }

    function aiEndCameraDistance() {
        var R = aiSphereRadius || houseMaxDim * 0.24;
        var h = (containerEl && containerEl.clientHeight) || global.innerHeight || 800;
        var w = (containerEl && containerEl.clientWidth) || global.innerWidth || 800;
        var targetPx = Math.min(w, h) * AI_SCREEN_RATIO;
        var fov = camera && camera.fov ? camera.fov : 60;
        var tanHalf = Math.tan(fov * Math.PI / 360);
        var dist = (R * h * 0.5) / (Math.max(tanHalf, 1e-4) * Math.max(targetPx, 1));
        return Math.max(dist, R * 2.4);
    }

    function applyAiCamera(focus) {
        if (!controls || !controls.spherical) return;
        var start = aiCamStart || baseCameraDistance;
        var end = aiEndCameraDistance();
        var radius = focus >= 0.999 ? end : lerp(start, end, focus);
        controls.spherical.radius = radius;
        if (focus >= 0.999) {
            controls.minDistance = end;
            controls.maxDistance = end;
        }
        controls.enableZoom = false;
    }

    function updateAiBasis() {
        if (!camera || !points || !aiCenter) return false;
        points.updateMatrixWorld(true);
        var liftY = modelRoot ? (modelRoot.position.y - modelRootBaseY) : 0;
        aiCenter.set(0, liftY, 0);
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
                var fromX;
                var fromY;
                if (aiFromReady) {
                    fromX = aiFromX[idx];
                    fromY = aiFromY[idx];
                } else {
                    aiScratch.set(orig[i], orig[i + 1], orig[i + 2]);
                    points.localToWorld(aiScratch);
                    aiScratch.sub(aiCenter);
                    fromX = aiScratch.dot(aiRight);
                    fromY = aiScratch.dot(aiUp);
                }
                px = lerp(fromX, homeX, form);
                py = lerp(fromY, homeY, form);
                vx = 0;
                vy = 0;
            } else {
                px = aiPosX[idx];
                py = aiPosY[idx];
                vx = aiVelX[idx] + (homeX - px) * attract;
                vy = aiVelY[idx] + (homeY - py) * attract;
                if (mouse2) {
                    var ddx = px - mx;
                    var ddy = py - my;
                    var distSq = ddx * ddx + ddy * ddy;
                    if (distSq > 0.1 && distSq < rR2) {
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
            }
            aiPosX[idx] = px;
            aiPosY[idx] = py;
            aiVelX[idx] = vx;
            aiVelY[idx] = vy;
            aiScratch.copy(aiCenter).addScaledVector(aiRight, px).addScaledVector(aiUp, py);
            points.worldToLocal(aiScratch);
            posArr[i] = aiScratch.x;
            posArr[i + 1] = aiScratch.y;
            posArr[i + 2] = aiScratch.z;
            idx += 1;
        }
        points.geometry.attributes.position.needsUpdate = true;
        setPointColorHex(COL_HOUSE);
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        pointsMaterial.uniforms.uGlow.value = 1;
        pointsMaterial.uniforms.uPointSize.value = lerp(0.012, 0.008, form);
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
        var t = modeElapsed;
        var form = easeOut(Math.min(1, t / AI_FORM_S));
        var liftDur = modeDuration > 0 ? modeDuration : AI_LIFT_S;
        var liftP = easeInOut(Math.min(1, Math.max(0, (t - AI_LIFT_START_S) / liftDur)));
        applyAiLift(aiLiftAmount() * liftP);
        simulateAiSphere(delta, form);
        applyAiCamera(easeInOut(Math.min(1, t / 7)));
    }

    function tickQu(delta) {
        modeElapsed += delta;
        ensureAiState();
        if (!points || !originalPositions || !aiPosX || !pointsMaterial) return;
        if (!pointsReady) {
            hideMeshShowPoints();
            pointsReady = true;
        }
        applyAiLift(aiLiftAmount());
        simulateAiSphere(delta, 1);
        applyAiCamera(1);
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
        if (!modelRoot || !pointsReady || mode === 'particleize' || mode === 'six-circles' || mode === 'chu' || mode === 'shou' || mode === 'ai' || mode === 'qu') return;
        var t = animTime - idleEffectsStartTime;
        if (t < 0) t = 0;
        var ramp = Math.min(1, t / 2.0);
        var breath = 1 + BREATH_AMPLITUDE * ramp * Math.sin(t * BREATH_SPEED);
        modelRoot.scale.set(breath, breath, breath);
    }

    function applyCameraDolly() {
        if (!controls || !controls.spherical || baseCameraDistance <= 0 || !pointsReady || mode === 'particleize' || mode === 'six-circles' || mode === 'chu' || mode === 'shou' || mode === 'ai' || mode === 'qu') {
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
        if (controls) controls.update();
        if (mode === 'ai') {
            applyAiCamera(easeInOut(Math.min(1, modeElapsed / 7)));
        } else if (mode === 'qu') {
            applyAiCamera(1);
        }
        renderer.render(scene, camera);
    }

    function updateIdleMotion(delta) {
        if (!modelRoot) return;
        animTime += delta;
        if (pointsMaterial && pointsMaterial.uniforms.uTime) {
            pointsMaterial.uniforms.uTime.value = animTime;
        }
        if (liuruNodes) {
            for (var w = 0; w < liuruNodes.length; w++) {
                if (liuruNodes[w].lit && liuruNodes[w].age < 8) {
                    liuruNodes[w].age += delta;
                    syncLiuruWave(w);
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
        } else if (mode === 'ring-flow' || mode === 'fade') {
            tickPointsHold(delta);
        } else {
            tickPlaceholder(delta);
        }

        updateIdleMotion(delta);
        syncMouseRipple();

        renderFrame();
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
        onMouseMoveCb = opts.onMouseMove || null;
        modeDuration = (opts.durationMs || 5000) / 1000;
        modeElapsed = 0;
        mode = stageKey;

        if (!containerEl) return Promise.resolve();

        containerEl.dataset.houseMode = stageKey || '';
        containerEl.hidden = false;
        suspended = false;

        return ensureLoaded().then(function () {
            modeElapsed = 0;
            if (stageKey !== 'ai' && stageKey !== 'qu') {
                unlockAiControls();
                applyAiLift(0);
            }
            if (stageKey !== 'six-circles') endLiuruUi();

            if (stageKey === 'expand') {
                animTime = 0;
                idleEffectsStartTime = 0;
                expandComplete = false;
                pointsReady = false;
                if (modelRoot) {
                    modelRoot.scale.set(1, 1, 1);
                    modelRoot.rotation.y = 0;
                }
                onResize();
                applyExpand(0);
                renderFrame();
            } else if (stageKey === 'particleize') {
                if (!expandComplete) forceExpandComplete();
                pointsReady = false;
                applyHold();
                applyToPoints(0);
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
                beginAi();
                onResize();
                renderFrame();
            } else if (stageKey === 'qu') {
                if (prevMode !== 'qu') beginQu();
                onResize();
                renderFrame();
            } else if (stageKey === 'ring-flow' || stageKey === 'fade') {
                beginPointsHold();
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
        });
    }

    function tearDownRenderer() {
        stopLoop();
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
        points = null;
        pointsMaterial = null;
        clock = null;
        canvasReady = false;
        if (containerEl) {
            containerEl.innerHTML = '';
            containerEl.hidden = true;
        }
    }

    function suspend() {
        endLiuruUi();
        stopLoop();
        onMouseMoveCb = null;
        mode = null;
        modeElapsed = 0;
        applyAiLift(0);
        if (containerEl) {
            containerEl.hidden = true;
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
