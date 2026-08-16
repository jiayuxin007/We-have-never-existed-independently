/**
 * 老项目因缘效果预览
 * 名色 / 六入 对齐 MyProject/js/model-morph-32s-embed.js
 */
(function (global) {
    'use strict';

    var EFFECTS = {
        wuming: {
            label: '无明',
            durationS: 7,
            note: '点云已在位，轻微呼吸稳住 · 原时长 7s · 循环播放',
            subtitle: 'The point of touch. Descending without awareness.',
        },
        xing: {
            label: '行',
            durationS: 6,
            note: 'lerp 回位 + 大噪波扰动 · 原时长 6s · 循环播放',
            subtitle: 'Volition. Blind form-shaping.',
        },
        shi: {
            label: '识',
            durationS: 6,
            note: '镜像虚像晃动 · 原时长 6s · 循环播放',
            subtitle: 'The Other. Mirroring the illusory self.',
        },
        mingse: {
            label: '名色',
            durationS: 9,
            note: '2.4s 溶点 + 压缩 sin 拉扯 + 2.5s 慢慢收回房屋点云 · 循环播放',
            subtitle: 'Apparition. Entangling into flesh and blood.',
        },
        liuru: {
            label: '六入',
            durationS: 5,
            note: '光环自下而上扫过点云 · 原时长 5s · 循环播放',
            subtitle: 'Capturing a faint flicker. Pushing through the echoing rift.',
        },
        chu: {
            label: '触',
            durationS: 7.5,
            note: '高频震荡 + 鼠标涟漪 · 原时长 7.5s · 循环播放',
            subtitle: 'Touch. Awakening the dormant pulse. You feel not the barrier, but the collective tremor of cosmic dust.',
        },
        'shou-dukha': {
            label: '苦受',
            durationS: 8,
            note: '0–1s 触余震平复 → 1–6s 锯齿错位撕裂 + 灼白/毒绿闪烁 → 6–8s 阻尼 · 地狱/修罗/饿鬼 · 循环',
            subtitle: 'Vedana. Overload. The system rejects the contact as pain.',
        },
        'shou-sukha': {
            label: '乐受',
            durationS: 8,
            note: '0–1s 触余震平复 → 1–6s 宽幅正弦向心吸附 + 钛白泛光 → 6–8s 阻尼 · 人/天 · 循环',
            subtitle: 'Vedana. Resonance. The current is received as pleasure.',
        },
        'shou-upeksha': {
            label: '舍受',
            durationS: 8,
            note: '0–1s 触余震平复 → 1–6s 零形变微呼吸 + 深苔灰扫描环（点云不变色） → 6–8s 阻尼 · 畜生 · 循环',
            subtitle: 'Vedana. Equanimity. Data passes through without a mark.',
        },
        ai: {
            label: '爱',
            durationS: 8,
            note: '房屋点云 8s 聚成二维粒子球，同时慢慢升到上方 · 交互对齐 sketch2812705',
            subtitle: 'Craving. Dust gathers, and the house becomes a sphere of wanting.',
        },
        qu: {
            label: '取',
            durationS: 8,
            note: '球已在上方不再移动，8s 保持 sketch 交互：慢转、鼠标推开再弹回',
            subtitle: 'Clinging. The sphere is held, and wanting takes root.',
        },
        'qu-hud': {
            label: '业力条',
            durationS: 7,
            note: '取的球上移 + 下方 HUD Bracket + 百分比 · 7s 循环',
            subtitle: 'Karma calculation in progress...',
        },
        overload: {
            label: '过载',
            durationS: 3.2,
            note: '点云发白变亮，往房屋原形收 · 原时长 3.2s',
            subtitle: '',
        },
        collapse: {
            label: '坍缩',
            durationS: 4,
            note: '整栋点云收成一点 · 原时长 4s',
            subtitle: '',
        },
        burst: {
            label: '爆发',
            durationS: 4.8,
            note: '从中心按归道颜色炸开 · 原时长 4.8s · 默认人道色',
            subtitle: '',
        },
        dissolve: {
            label: '消散',
            durationS: 5,
            note: '贴图房屋溶成点云 · 六道后消散页',
            subtitle: 'Woven as an algorithmic birthmark, cast as the first computed shadow.',
        },
        wave: {
            label: '波动',
            durationS: 8,
            note: '点云放大约 2.5 倍并随机浪散 · 六道后消散页',
            subtitle: 'Woven as an algorithmic birthmark, cast as the first computed shadow.',
        },
        reform: {
            label: '重组',
            durationS: 5.5,
            note: '浪收掉，再变回实体房屋 · 六道后消散页',
            subtitle: 'Uninstall every illusion here, relinquish all to the echo-less void.',
        },
    };

    var currentEffect = 'mingse';
    var MODEL_URLS = [
        '../../assets/models/less_25mb.glb',
        '../assets/models/less_25mb.glb',
        '/assets/models/less_25mb.glb',
        'assets/models/less_25mb.glb',
    ];

    var stageEl = document.getElementById('mingseStage');
    var statusEl = document.getElementById('mingseStatus');
    var replayBtn = document.getElementById('mingseReplay');
    var subtitleEl = document.getElementById('mingseSubtitle');
    var noteEl = document.getElementById('mingseNote');
    var tabButtons = document.querySelectorAll('.mingse-tabs [data-effect]');

    function currentMeta() {
        return EFFECTS[currentEffect] || EFFECTS.mingse;
    }

    function durationS() {
        return currentMeta().durationS;
    }

    var scene, camera, renderer, controls, modelRoot, points, pointsMaterial, targetMesh;
    var originalPositions = null;
    var randomOffsets = null;
    var mirrorOffsets = null;
    var waveOffsets = null;
    var mouseNDC = { x: -2, y: -2 };
    var mouseWorld = null;
    var clock = null;
    var animTime = 0;
    var phaseTime = 0;
    var rafId = 0;
    var sweepMinY = -2;
    var sweepMaxY = 2;
    var sweepWidth = 0.45;
    var modelMaxDim = 10;
    var mouseRadius = 4;
    var shouContact = { x: 0, y: 0, z: 0 };
    var COL_DEFAULT = { r: 0.2, g: 0.5, b: 1.0 };
    var COL_HOUSE = { r: 139 / 255, g: 92 / 255, b: 246 / 255 };
    var COL_STONE = { r: 0.38, g: 0.42, b: 0.39 };
    var AI_SCREEN_RATIO = 0.26;
    var AI_FORM_S = 6.5;
    var AI_ATTRACTION = 0.045;
    var AI_DAMPING = 0.76;
    var AI_REPEL_STRENGTH = 28;
    var AI_REPEL_RATIO = 90 / 250;
    var AI_ANGLE_STEP = 0.01;
    var AI_LIFT_START_S = 0;
    var AI_LIFT_S = 8;
    var aiTargets = null;
    var aiSphereCenter = null;
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
    var baseCamPos = { x: 0, y: 0, z: 0 };
    var baseCamReady = false;
    var modelRootBaseY = 0;

    function isShouEffect(id) {
        var key = id || currentEffect;
        return key === 'shou-dukha' || key === 'shou-sukha' || key === 'shou-upeksha';
    }

    function isQuHold(id) {
        var key = id || currentEffect;
        return key === 'qu' || key === 'qu-hud';
    }

    function applyCloudColorVars(c) {
        var host = document.getElementById('mingseHudBar') || document.documentElement;
        var r = Math.round((c.r != null ? c.r : 0.545) * 255);
        var g = Math.round((c.g != null ? c.g : 0.361) * 255);
        var b = Math.round((c.b != null ? c.b : 0.965) * 255);
        host.style.setProperty('--cloud-r', String(r));
        host.style.setProperty('--cloud-g', String(g));
        host.style.setProperty('--cloud-b', String(b));
    }

    function syncHudBar() {
        var wrap = document.getElementById('mingseHudBar');
        var fill = document.getElementById('mingseHudFill');
        var pctEl = document.getElementById('mingseHudPct');
        if (!wrap) return;
        var on = currentEffect === 'qu-hud';
        wrap.hidden = !on;
        if (!on) return;
        if (pointsMaterial && pointsMaterial.uniforms.uColorA) {
            applyCloudColorVars(pointsMaterial.uniforms.uColorA.value);
        } else {
            applyCloudColorVars(COL_HOUSE);
        }
        var p = durationS() > 0 ? Math.min(1, phaseTime / durationS()) : 0;
        if (fill) fill.style.width = (p * 100) + '%';
        if (pctEl) pctEl.textContent = Math.round(p * 100) + '%';
    }

    function fract(x) {
        return x - Math.floor(x);
    }

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function easeOut(t) {
        t = Math.min(1, Math.max(0, t));
        return 1 - Math.pow(1 - t, 2.4);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function noise3(x, y, z, t) {
        return Math.sin(x * 0.5 + t) * Math.cos(y * 0.7 + t * 1.3) * Math.sin(z * 0.4 + t * 0.8)
            + 0.5 * Math.sin((x + y) * 0.3 + t * 2) * Math.cos(z * 0.2 + t);
    }

    function parseGlbPositions(arrayBuffer) {
        var dv = new DataView(arrayBuffer);
        if (dv.getUint32(0, true) !== 0x46546c67) {
            throw new Error('Not a GLB file');
        }
        var jsonLen = dv.getUint32(12, true);
        var json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, 20, jsonLen)));
        var binHeader = 20 + jsonLen;
        var binBase = binHeader + 8;
        var typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
        var compType = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array };

        function readAccessor(idx) {
            var acc = json.accessors[idx];
            var view = json.bufferViews[acc.bufferView];
            var byteOffset = binBase + view.byteOffset + (acc.byteOffset || 0);
            var n = acc.count * (typeSize[acc.type] || 1);
            var Ctor = compType[acc.componentType];
            if (!Ctor) throw new Error('Unsupported accessor type');
            return new Ctor(arrayBuffer, byteOffset, n);
        }

        var prim = json.meshes[0].primitives[0];
        var posSrc = readAccessor(prim.attributes.POSITION);
        var posCopy = new Float32Array(posSrc.length);
        posCopy.set(posSrc);
        var indices = prim.indices != null ? readAccessor(prim.indices) : null;
        var uvs = prim.attributes.TEXCOORD_0 != null ? readAccessor(prim.attributes.TEXCOORD_0) : null;
        var image = null;
        if (json.images && json.images[0] && json.images[0].bufferView != null) {
            var imgDef = json.images[0];
            var imgView = json.bufferViews[imgDef.bufferView];
            var imgOff = binBase + imgView.byteOffset;
            image = {
                bytes: arrayBuffer.slice(imgOff, imgOff + imgView.byteLength),
                mime: imgDef.mimeType || 'image/jpeg',
            };
        }
        return { positions: posCopy, indices: indices, uvs: uvs, image: image };
    }

    function fetchModel(url) {
        return fetch(url).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.arrayBuffer();
        });
    }

    function loadPositions() {
        var index = 0;
        var lastErr = null;
        function tryNext() {
            if (index >= MODEL_URLS.length) {
                return Promise.reject(lastErr || new Error('Model load failed'));
            }
            var url = MODEL_URLS[index++];
            return fetchModel(url).then(function (buffer) {
                var model = parseGlbPositions(buffer);
                console.info('[MingsePreview] loaded', url, 'points', model.positions.length / 3);
                return model;
            }).catch(function (err) {
                lastErr = err;
                console.warn('[MingsePreview] retry', url, err);
                return tryNext();
            });
        }
        return tryNext();
    }

    function createPointsMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uPointSize: { value: 0.006 },
                uPointAlpha: { value: 1 },
                uGlow: { value: 1 },
                uSweepY: { value: -10 },
                uSweepWidth: { value: 0.12 },
                uMouse: { value: new THREE.Vector3(0, 0, 0) },
                uMouseRadius: { value: 2.0 },
                uRipple: { value: 0 },
                uOverload: { value: 0 },
                uBurst: { value: 0 },
                uRealmColor: { value: new THREE.Vector3(0.6, 0.75, 1.0) },
                uColorA: { value: new THREE.Vector3(0.2, 0.5, 1.0) },
                uColorB: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                uAccent: { value: 0 },
                uBloom: { value: 0 },
                uSweepColor: { value: new THREE.Vector3(0.85, 0.95, 1.0) },
                uSweepStrength: { value: 1 },
                uSweepBoost: { value: 1 },
            },
            vertexShader: [
                'attribute float aSizeScale;',
                'uniform float uPointSize;',
                'uniform float uPointAlpha;',
                'uniform float uGlow;',
                'uniform float uSweepY;',
                'uniform float uSweepWidth;',
                'uniform vec3 uMouse;',
                'uniform float uMouseRadius;',
                'uniform float uRipple;',
                'uniform float uOverload;',
                'uniform float uBurst;',
                'uniform vec3 uRealmColor;',
                'uniform vec3 uColorA;',
                'uniform vec3 uColorB;',
                'uniform float uAccent;',
                'uniform float uBloom;',
                'uniform float uSweepBoost;',
                'varying float vGlow;',
                'varying float vSweep;',
                'varying vec3 vColor;',
                'varying float vRipple;',
                'void main() {',
                '  if (uPointAlpha < 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
                '  vec4 world = modelMatrix * vec4(position, 1.0);',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  float dist = max(length(mv.xyz), 0.001);',
                '  float sweepBand = 1.0 - smoothstep(0.0, uSweepWidth, abs(world.y - uSweepY));',
                '  float mouseDist = length(world.xyz - uMouse);',
                '  float rippleHalo = 1.0 - smoothstep(uMouseRadius * 0.12, uMouseRadius, mouseDist);',
                '  float rippleCore = 1.0 - smoothstep(0.0, uMouseRadius * 0.3, mouseDist);',
                '  float ripple = min(1.0, rippleHalo * 0.72 + rippleCore) * uRipple;',
                '  gl_PointSize = uPointSize * (300.0 / dist) * aSizeScale * (1.0 + sweepBand * 2.2 * uSweepBoost + ripple * 1.15 + uBloom * 1.85);',
                '  gl_Position = projectionMatrix * mv;',
                '  vGlow = uGlow + sweepBand * 3.2 * uSweepBoost + ripple * 7.2 + uOverload * 2.0 + uBloom * 1.45;',
                '  vSweep = max(sweepBand, ripple);',
                '  vRipple = ripple;',
                '  vec3 baseCol = mix(uColorA, uColorB, uAccent);',
                '  vColor = mix(baseCol, uRealmColor, uBurst);',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform float uPointAlpha;',
                'uniform float uOverload;',
                'uniform float uBurst;',
                'uniform vec3 uSweepColor;',
                'uniform float uSweepStrength;',
                'varying float vGlow;',
                'varying float vSweep;',
                'varying vec3 vColor;',
                'varying float vRipple;',
                'void main() {',
                '  float d = length(gl_PointCoord - 0.5) * 2.0;',
                '  float a = (1.0 - smoothstep(0.2, 1.0, d)) * vGlow * uPointAlpha;',
                '  vec3 col = mix(vColor, uSweepColor, vSweep * uSweepStrength);',
                '  col = mix(col, vec3(1.0), vRipple * 0.68);',
                '  if (uOverload > 0.5 || uBurst > 0.5) col = mix(col, vec3(1.0), 0.9);',
                '  gl_FragColor = vec4(col, a);',
                '}',
            ].join('\n'),
        });
    }

    function setupScene(model) {
        scene = new THREE.Scene();
        clock = new THREE.Clock();

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
        if (renderer.toneMapping !== undefined) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }
        stageEl.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        var keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
        keyLight.position.set(5, 8, 6);
        scene.add(keyLight);

        var positions = model.positions;
        originalPositions = positions;
        var pointCount = positions.length / 3;
        randomOffsets = new Float32Array(positions.length);
        mirrorOffsets = new Float32Array(positions.length);
        waveOffsets = new Float32Array(positions.length);
        for (var ri = 0; ri < randomOffsets.length; ri++) {
            randomOffsets[ri] = (Math.random() * 2 - 1) * 1.2;
            mirrorOffsets[ri] = (Math.random() * 2 - 1) * 0.5;
            waveOffsets[ri] = (Math.random() * 2 - 1) * 0.8;
        }
        mouseWorld = new THREE.Vector3();

        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
        var sizeScale = new Float32Array(pointCount);
        for (var i = 0; i < pointCount; i++) sizeScale[i] = 0.85;
        geom.setAttribute('aSizeScale', new THREE.BufferAttribute(sizeScale, 1));

        pointsMaterial = createPointsMaterial();
        points = new THREE.Points(geom, pointsMaterial);
        points.rotation.x = Math.PI / 2;

        var meshGeom = new THREE.BufferGeometry();
        meshGeom.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
        if (model.uvs) {
            var uvCopy = new Float32Array(model.uvs.length);
            uvCopy.set(model.uvs);
            meshGeom.setAttribute('uv', new THREE.BufferAttribute(uvCopy, 2));
        }
        if (model.indices) meshGeom.setIndex(Array.prototype.slice.call(model.indices));
        meshGeom.computeVertexNormals();
        targetMesh = new THREE.Mesh(meshGeom, new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        targetMesh.rotation.x = Math.PI / 2;
        targetMesh.visible = false;
        if (model.image) {
            loadMeshTexture(model.image.bytes, model.image.mime);
        }

        modelRoot = new THREE.Group();
        modelRoot.add(targetMesh);
        modelRoot.add(points);
        scene.add(modelRoot);

        var box = new THREE.Box3().setFromObject(modelRoot);
        var center = new THREE.Vector3();
        box.getCenter(center);
        modelRoot.position.sub(center);
        modelRootBaseY = modelRoot.position.y;

        box.setFromObject(modelRoot);
        var size = new THREE.Vector3();
        box.getSize(size);
        sweepMinY = box.min.y;
        sweepMaxY = box.max.y;
        sweepWidth = Math.max(0.35, size.y * 0.1);
        var maxDim = Math.max(size.x, size.y, size.z);
        modelMaxDim = maxDim;
        mouseRadius = Math.max(3.8, maxDim * 0.34);
        computeShouContact();
        var dist = maxDim * 0.6;
        camera.position.set(dist * 1.2, dist * 0.4, dist);
        baseCamPos.x = camera.position.x;
        baseCamPos.y = camera.position.y;
        baseCamPos.z = camera.position.z;
        baseCamReady = true;

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.target.set(0, 0, 0);
        controls.update();

        onResize();
        global.addEventListener('resize', onResize);
        global.addEventListener('pointermove', onMouseMove);
        resetPhase();
    }

    function onResize() {
        if (!camera || !renderer || !stageEl) return;
        var w = stageEl.clientWidth || global.innerWidth;
        var h = stageEl.clientHeight || global.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    function onMouseMove(e) {
        var w = global.innerWidth || 1;
        var h = global.innerHeight || 1;
        mouseNDC.x = (e.clientX / w) * 2 - 1;
        mouseNDC.y = -(e.clientY / h) * 2 + 1;
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
        pointsMaterial.uniforms.uMouseRadius.value = mouseRadius;
    }

    function syncMouseRipple() {
        if (!pointsMaterial || !pointsMaterial.uniforms.uRipple) return;
        var alpha = pointsMaterial.uniforms.uPointAlpha;
        var on = points && points.visible && (!alpha || alpha.value > 0.01);
        if (!on || currentEffect === 'ai' || isQuHold()) {
            pointsMaterial.uniforms.uRipple.value = 0;
            return;
        }
        pointsMaterial.uniforms.uRipple.value = 1;
        updateMouseWorld();
    }

    function loadMeshTexture(bytes, mimeType) {
        var blob = new Blob([bytes], { type: mimeType || 'image/jpeg' });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
            URL.revokeObjectURL(url);
            if (!targetMesh) return;
            var tex = new THREE.Texture(img);
            tex.flipY = false;
            if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
            tex.needsUpdate = true;
            targetMesh.material.map = tex;
            targetMesh.material.needsUpdate = true;
        };
        img.onerror = function () { URL.revokeObjectURL(url); };
        img.src = url;
    }

    function setMeshOpacity(opacity) {
        if (!targetMesh) return;
        targetMesh.material.opacity = opacity;
        targetMesh.material.transparent = true;
        targetMesh.visible = opacity > 0.01;
    }

    function resetShaderExtras() {
        if (!pointsMaterial) return;
        pointsMaterial.uniforms.uOverload.value = 0;
        pointsMaterial.uniforms.uBurst.value = 0;
        pointsMaterial.uniforms.uGlow.value = 1;
        pointsMaterial.uniforms.uRipple.value = 0;
        pointsMaterial.uniforms.uSweepY.value = -10;
        pointsMaterial.uniforms.uAccent.value = 0;
        pointsMaterial.uniforms.uBloom.value = 0;
        pointsMaterial.uniforms.uSweepStrength.value = 1;
        pointsMaterial.uniforms.uSweepBoost.value = 1;
        pointsMaterial.uniforms.uColorA.value.set(COL_DEFAULT.r, COL_DEFAULT.g, COL_DEFAULT.b);
        pointsMaterial.uniforms.uColorB.value.set(1, 1, 1);
        pointsMaterial.uniforms.uSweepColor.value.set(0.85, 0.95, 1.0);
        if (renderer && renderer.toneMappingExposure !== undefined) {
            renderer.toneMappingExposure = 1.2;
        }
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

    function setSizeScale(value) {
        var sizeArr = points.geometry.attributes.aSizeScale.array;
        for (var i = 0; i < sizeArr.length; i++) sizeArr[i] = value;
        points.geometry.attributes.aSizeScale.needsUpdate = true;
    }

    function applyEffectMeta() {
        var meta = currentMeta();
        if (subtitleEl) subtitleEl.textContent = meta.subtitle;
        if (noteEl) noteEl.textContent = meta.note;
        for (var i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.toggle('is-active', tabButtons[i].getAttribute('data-effect') === currentEffect);
        }
    }

    function resetMeshXform() {
        if (!targetMesh) return;
        targetMesh.position.set(0, 0, 0);
        targetMesh.scale.set(1, 1, 1);
        if (targetMesh.material && targetMesh.material.color) {
            targetMesh.material.color.setHex(0xffffff);
        }
    }

    function resetPhase() {
        phaseTime = 0;
        if (!points || !originalPositions) return;
        points.geometry.attributes.position.array.set(originalPositions);
        points.geometry.attributes.position.needsUpdate = true;
        points.visible = true;
        resetShaderExtras();
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        setMeshOpacity(0);
        resetMeshXform();
        if (currentEffect === 'liuru') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.007;
            pointsMaterial.uniforms.uSweepY.value = sweepMinY;
            pointsMaterial.uniforms.uSweepWidth.value = sweepWidth;
        } else if (currentEffect === 'wuming' || currentEffect === 'xing' || currentEffect === 'shi' || currentEffect === 'chu') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.012;
        } else if (currentEffect === 'ai') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            ensureAiTargets();
            resetAiPhysics();
            if (modelRoot) modelRoot.position.y = modelRootBaseY;
            captureAiFromCurrent();
        } else if (isQuHold()) {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.008;
            ensureAiTargets();
            resetAiPhysics();
            seedAiHomes();
            applyAiLift(aiLiftAmount());
        } else if (isShouEffect()) {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            seedShouStart();
        } else if (currentEffect === 'overload' || currentEffect === 'collapse') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.012;
        } else if (currentEffect === 'burst') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.012;
            seedBurstStart();
        } else if (currentEffect === 'dissolve') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.005;
            pointsMaterial.uniforms.uPointAlpha.value = 0;
            setMeshOpacity(1);
        } else if (currentEffect === 'wave') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.0075;
        } else if (currentEffect === 'reform') {
            setSizeScale(1);
            pointsMaterial.uniforms.uPointSize.value = 0.0075;
            seedWaveStart();
            setMeshOpacity(0);
        } else if (currentEffect === 'mingse') {
            setSizeScale(0.85);
            points.visible = true;
            pointsMaterial.uniforms.uPointSize.value = 0.006;
            pointsMaterial.uniforms.uPointAlpha.value = 0;
            setMeshOpacity(1);
        } else {
            setSizeScale(0.85);
            pointsMaterial.uniforms.uPointSize.value = 0.006;
        }
        restoreCamera();
        applyEffectMeta();
    }

    function restoreCamera() {
        if (!camera || !baseCamReady) return;
        camera.position.set(baseCamPos.x, baseCamPos.y, baseCamPos.z);
        if (controls) {
            controls.enableZoom = true;
            controls.minDistance = 0;
            controls.maxDistance = Infinity;
            controls.target.set(0, 0, 0);
            controls.update();
        }
    }

    function aiEndCameraDistance() {
        var R = (aiSphereCenter && aiSphereCenter.r) || modelMaxDim * 0.24;
        var h = (stageEl && stageEl.clientHeight) || global.innerHeight || 800;
        var w = (stageEl && stageEl.clientWidth) || global.innerWidth || 800;
        var targetPx = Math.min(w, h) * AI_SCREEN_RATIO;
        var fov = camera && camera.fov ? camera.fov : 60;
        var tanHalf = Math.tan(fov * Math.PI / 360);
        var dist = (R * h * 0.5) / (Math.max(tanHalf, 1e-4) * Math.max(targetPx, 1));
        return Math.max(dist, R * 2.4);
    }

    function applyAiCamera(focus) {
        if (!camera || !baseCamReady) return;
        var dx = baseCamPos.x;
        var dy = baseCamPos.y;
        var dz = baseCamPos.z;
        var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        var start = len;
        var end = aiEndCameraDistance();
        var dist = focus >= 0.999 ? end : lerp(start, end, focus);
        var py = dy / len * dist;
        camera.position.set(dx / len * dist, py, dz / len * dist);
        if (controls) {
            controls.enableZoom = false;
            controls.target.set(0, 0, 0);
            controls.update();
        }
    }

    function ensureAiTargets() {
        if (!originalPositions) return;
        var count = originalPositions.length / 3;
        var radius = modelMaxDim * 0.24;
        aiSphereCenter = { x: 0, y: 0, z: 0, r: radius };
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
        aiTargets = true;
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
        ensureAiTargets();
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

    function seedAiHomes() {
        if (!aiPosX || !aiSphereCenter) return;
        var r = aiSphereCenter.r;
        for (var i = 0; i < aiPosX.length; i++) {
            var i2 = i * i;
            aiPosX[i] = Math.sin(i + aiAngle) * Math.sin(i2) * r;
            aiPosY[i] = Math.cos(i2) * r;
            aiVelX[i] = 0;
            aiVelY[i] = 0;
        }
    }

    function applyAiLift(amount) {
        if (!modelRoot) return;
        modelRoot.position.y = modelRootBaseY + amount;
    }

    function aiLiftAmount() {
        return (aiSphereCenter && aiSphereCenter.r ? aiSphereCenter.r : modelMaxDim * 0.24) * 0.36;
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
        var r = aiSphereCenter.r;
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
        points.visible = true;
        setMeshOpacity(0);
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        pointsMaterial.uniforms.uPointSize.value = lerp(0.012, 0.008, form);
        pointsMaterial.uniforms.uGlow.value = 1;
        pointsMaterial.uniforms.uAccent.value = 0;
        setColorA(COL_HOUSE);
        setSizeScale(1);
        if (mouse2 && pointsMaterial.uniforms.uMouse) {
            aiScratch.copy(aiCenter).addScaledVector(aiRight, mx).addScaledVector(aiUp, my);
            pointsMaterial.uniforms.uMouse.value.copy(aiScratch);
        }
    }

    function tickAi(delta) {
        ensureAiTargets();
        if (!points || !aiPosX) return;
        var t = phaseTime;
        var form = easeOut(Math.min(1, t / AI_FORM_S));
        var liftP = easeInOut(Math.min(1, Math.max(0, (t - AI_LIFT_START_S) / AI_LIFT_S)));
        applyAiLift(aiLiftAmount() * liftP);
        simulateAiSphere(delta, form);
        applyAiCamera(easeInOut(Math.min(1, t / 7)));
    }

    function tickQu(delta) {
        ensureAiTargets();
        if (!points || !aiPosX) return;
        applyAiLift(aiLiftAmount());
        simulateAiSphere(delta, 1);
        applyAiCamera(1);
    }

    function seedBurstStart() {
        var posArr = points.geometry.attributes.position.array;
        for (var i = 0; i < posArr.length; i++) posArr[i] = 0;
        points.geometry.attributes.position.needsUpdate = true;
    }

    function seedWaveStart() {
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = waveOffsets;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = orig[i] * 2.2 + off[i] * 0.6;
            posArr[i + 1] = orig[i + 1] * 2.2 + off[i + 1] * 0.6;
            posArr[i + 2] = orig[i + 2] * 2.2 + off[i + 2] * 0.6;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    function seedShouStart() {
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        var scale = Math.max(1, modelMaxDim / 8);
        var osc = 0.05 * scale;
        var wave = 0.032 * scale;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = orig[i] + off[i] * osc + Math.sin(i * 0.01) * wave;
            posArr[i + 1] = orig[i + 1] + off[i + 1] * osc + Math.cos(i * 0.01) * wave;
            posArr[i + 2] = orig[i + 2] + off[i + 2] * osc;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    function switchEffect(id) {
        if (!EFFECTS[id] || id === currentEffect) {
            if (id === currentEffect) resetPhase();
            return;
        }
        currentEffect = id;
        resetPhase();
    }

    function tickMingse() {
        var t = phaseTime;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var i;

        if (t < 2.4) {
            var p0 = easeInOut(t / 2.4);
            setMeshOpacity(1 - p0);
            points.visible = true;
            pointsMaterial.uniforms.uPointAlpha.value = p0;
            pointsMaterial.uniforms.uPointSize.value = 0.006;
            setSizeScale(0.85);
            posArr.set(orig);
            points.geometry.attributes.position.needsUpdate = true;
            return;
        }

        setMeshOpacity(0);

        if (t >= 6.5) {
            var settleP = Math.min(1, (t - 6.5) / 2.5);
            var ease = 1 - Math.pow(1 - settleP, 2.4);
            var follow = 0.012 + 0.036 * ease;
            if (settleP > 0.82) follow = lerp(follow, 0.16, (settleP - 0.82) / 0.18);
            var wiggle = 0.08 * (1 - ease) * (1 - ease);
            for (i = 0; i < posArr.length; i += 3) {
                posArr[i] = lerp(posArr[i], orig[i], follow) + Math.sin(animTime * 2.6 + orig[i]) * wiggle;
                posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], follow) + Math.sin(animTime * 2.6 + orig[i + 1]) * wiggle;
                posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], follow) + Math.sin(animTime * 2.6 + orig[i + 2]) * wiggle;
            }
            points.geometry.attributes.position.needsUpdate = true;
            pointsMaterial.uniforms.uPointSize.value = lerp(0.006, 0.012, ease);
            setSizeScale(lerp(0.85, 1, ease));
            if (settleP >= 1) {
                posArr.set(orig);
                points.geometry.attributes.position.needsUpdate = true;
            }
            return;
        }

        var phase = Math.min(1, (t - 2.4) / 4.1);
        var pull = 0.08 * Math.sin(animTime * 3) * (1 - phase * 0.5);
        for (i = 0; i < posArr.length; i += 3) {
            var dx = orig[i] - posArr[i];
            var dy = orig[i + 1] - posArr[i + 1];
            var dz = orig[i + 2] - posArr[i + 2];
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            posArr[i] += (dx / len) * 0.015 + Math.sin(animTime * 4 + orig[i]) * pull;
            posArr[i + 1] += (dy / len) * 0.015 + Math.sin(animTime * 4 + orig[i + 1]) * pull;
            posArr[i + 2] += (dz / len) * 0.015 + Math.sin(animTime * 4 + orig[i + 2]) * pull;
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uPointSize.value = 0.006;
        setSizeScale(0.85);
        pointsMaterial.uniforms.uSweepY.value = -10;
    }

    function tickWuming() {
        var phase = Math.min(1, phaseTime / durationS());
        var progress = easeInOut(phase);
        var amp = 0.028 * (1 - progress);
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var t = animTime;
        for (var i = 0; i < posArr.length; i += 3) {
            var settle = 1 + amp * Math.sin(t * 2 + orig[i] * 0.1);
            posArr[i] = orig[i] * settle;
            posArr[i + 1] = orig[i + 1] * settle;
            posArr[i + 2] = orig[i + 2] * settle;
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        pointsMaterial.uniforms.uSweepY.value = -10;
        pointsMaterial.uniforms.uRipple.value = 0;
    }

    function tickXing() {
        var phase = Math.min(1, phaseTime / durationS());
        var progress = easeInOut(phase);
        var noiseScale = 0.8 * (1 - progress * 0.5);
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        var t = animTime;

        for (var i = 0; i < posArr.length; i += 3) {
            var nx = noise3(orig[i], orig[i + 1], orig[i + 2], t * 2) * noiseScale;
            var ny = noise3(orig[i] + 10, orig[i + 1], orig[i + 2], t * 2.1) * noiseScale;
            var nz = noise3(orig[i], orig[i + 1] + 10, orig[i + 2], t * 1.9) * noiseScale;
            posArr[i] = lerp(posArr[i], orig[i], 0.1) + off[i] * 0.4 + nx;
            posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], 0.1) + off[i + 1] * 0.4 + ny;
            posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], 0.1) + off[i + 2] * 0.4 + nz;
        }

        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        pointsMaterial.uniforms.uSweepY.value = -10;
    }

    function tickShi() {
        var phase = Math.min(1, phaseTime / durationS());
        var mirrorMix = 0.3 + 0.5 * Math.sin(animTime * 1.5) * (1 - phase);
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = mirrorOffsets;
        var t = animTime;
        for (var i = 0; i < posArr.length; i += 3) {
            var tx = orig[i];
            var ty = orig[i + 1];
            var tz = orig[i + 2];
            posArr[i] = lerp(posArr[i], tx, 0.08) + off[i] * mirrorMix * Math.sin(t + tx);
            posArr[i + 1] = lerp(posArr[i + 1], ty, 0.08) + off[i + 1] * mirrorMix * Math.cos(t * 1.2 + ty);
            posArr[i + 2] = lerp(posArr[i + 2], tz, 0.08) + off[i + 2] * mirrorMix * Math.sin(t * 0.8 + tz);
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        pointsMaterial.uniforms.uSweepY.value = -10;
        pointsMaterial.uniforms.uRipple.value = 0;
    }

    function tickChu() {
        var scale = Math.max(1, modelMaxDim / 8);
        var osc = 0.16 * scale * Math.sin(animTime * 15);
        var wave = 0.1 * scale;
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
        pointsMaterial.uniforms.uPointSize.value = 0.012 * (1 + 0.28 * Math.abs(Math.sin(t * 15)));
        pointsMaterial.uniforms.uSweepY.value = -10;
        pointsMaterial.uniforms.uRipple.value = 1;
        updateMouseWorld();
    }

    function shouEnvelope() {
        var t = phaseTime;
        if (t < 1) {
            return { stage: 0, fade: 1 - t, core: 0, damp: 0 };
        }
        if (t < 6) {
            var u = (t - 1) / 5;
            var attack = Math.min(1, u / 0.12);
            return { stage: 1, fade: 0, core: attack, damp: 0 };
        }
        var p = Math.min(1, (t - 6) / 2);
        return { stage: 2, fade: 0, core: Math.pow(1 - p, 2.2), damp: p };
    }

    function setColorA(c) {
        pointsMaterial.uniforms.uColorA.value.set(c.r, c.g, c.b);
        applyCloudColorVars(c);
    }

    function tickShouVedana() {
        var env = shouEnvelope();
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        var t = animTime;
        var kScale = Math.max(1, modelMaxDim / 8);
        var cx = shouContact.x;
        var cy = shouContact.y;
        var cz = shouContact.z;
        var i;
        var u = pointsMaterial.uniforms;

        u.uRipple.value = 0;
        u.uSweepStrength.value = 1;
        u.uSweepBoost.value = 1;
        u.uSweepColor.value.set(0.85, 0.95, 1.0);
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
            points.geometry.attributes.position.needsUpdate = true;
            setColorA(COL_DEFAULT);
            u.uAccent.value = 0;
            u.uBloom.value = 0;
            u.uGlow.value = 1 + 0.45 * env.fade;
            u.uSweepY.value = -10;
            u.uRipple.value = env.fade;
            u.uPointSize.value = 0.012 * (1 + 0.22 * env.fade);
            updateMouseWorld();
            return;
        }

        var k = env.core;
        var kind = currentEffect;
        var bandW = Math.max(0.35, modelMaxDim * 0.09);

        if (kind === 'shou-dukha') {
            var radius = fract((phaseTime - 1) * 0.62) * modelMaxDim * 1.25;
            var jagAmp = k * modelMaxDim * 0.055;
            var pushAmp = k * modelMaxDim * 0.022;
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
                posArr[i] = orig[i] + nx * (pushAmp + glitch * jagAmp) + off[i] * jitter * modelMaxDim * 0.014;
                posArr[i + 1] = orig[i + 1] + ny * (pushAmp + glitch * jagAmp) + off[i + 1] * jitter * modelMaxDim * 0.014;
                posArr[i + 2] = orig[i + 2] + nz * (pushAmp + glitch * jagAmp) + off[i + 2] * jitter * modelMaxDim * 0.014;
            }
        } else if (kind === 'shou-sukha') {
            var radiusS = fract((phaseTime - 1) * 0.28) * modelMaxDim * 1.15;
            var waveLen = Math.max(1.2, modelMaxDim * 0.55);
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

        setColorA(COL_DEFAULT);
        u.uAccent.value = 0;
        u.uBloom.value = 0;
        u.uGlow.value = 1;
        u.uPointSize.value = 0.012;
        u.uSweepY.value = -10;
        u.uSweepStrength.value = 0;
        u.uRipple.value = 0;

        if (env.stage === 2 && kind !== 'shou-upeksha') {
            var follow = 0.1 + 0.35 * env.damp;
            for (i = 0; i < posArr.length; i += 3) {
                posArr[i] = lerp(posArr[i], orig[i], follow);
                posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], follow);
                posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], follow);
            }
        }

        points.geometry.attributes.position.needsUpdate = true;
        u.uPointAlpha.value = 1;
        setMeshOpacity(0);
    }

    function tickOverload() {
        var phase = Math.min(1, phaseTime / durationS());
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = lerp(posArr[i], orig[i], 0.05);
            posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], 0.05);
            posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], 0.05);
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uOverload.value = phase;
        pointsMaterial.uniforms.uGlow.value = 1 + phase * 2;
        pointsMaterial.uniforms.uBurst.value = 0;
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        setMeshOpacity(0);
    }

    function tickCollapse() {
        var phase = Math.min(1, phaseTime / durationS());
        var tCol = 1 - Math.pow(1 - phase, 2.5);
        var posArr = points.geometry.attributes.position.array;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = lerp(posArr[i], 0, tCol);
            posArr[i + 1] = lerp(posArr[i + 1], 0, tCol);
            posArr[i + 2] = lerp(posArr[i + 2], 0, tCol);
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uOverload.value = 1;
        pointsMaterial.uniforms.uGlow.value = 3;
        pointsMaterial.uniforms.uBurst.value = 0;
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        setMeshOpacity(0);
    }

    function tickBurst() {
        var phase = Math.min(1, phaseTime / durationS());
        var burstProgress = easeInOut(Math.min(1, phase * 1.2));
        var spread = 3 * burstProgress;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = randomOffsets;
        for (var i = 0; i < posArr.length; i += 3) {
            var dx = orig[i];
            var dy = orig[i + 1];
            var dz = orig[i + 2];
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            var s = spread * (0.8 + off[i] * 0.4);
            posArr[i] = (dx / len) * s;
            posArr[i + 1] = (dy / len) * s;
            posArr[i + 2] = (dz / len) * s;
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uBurst.value = burstProgress;
        pointsMaterial.uniforms.uOverload.value = 1 - burstProgress * 0.5;
        pointsMaterial.uniforms.uGlow.value = 2.4;
        pointsMaterial.uniforms.uPointSize.value = 0.012;
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        setMeshOpacity(0);
    }

    function tickDissolve() {
        var phase = Math.min(1, phaseTime / durationS());
        var p = easeInOut(phase);
        setMeshOpacity(1 - p);
        points.visible = true;
        pointsMaterial.uniforms.uPointAlpha.value = p;
        pointsMaterial.uniforms.uPointSize.value = 0.005 * (1 + p * 0.3);
        points.geometry.attributes.position.array.set(originalPositions);
        points.geometry.attributes.position.needsUpdate = true;
    }

    function tickWave() {
        var t = animTime;
        var scaleEffect = (Math.sin(t * 0.5) * 0.5 + 0.5) * 1.5 + 1;
        var displacementFactor = Math.sin(t * 3) * 0.5 + 0.5;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = waveOffsets;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = orig[i] * scaleEffect + off[i] * displacementFactor;
            posArr[i + 1] = orig[i + 1] * scaleEffect + off[i + 1] * displacementFactor;
            posArr[i + 2] = orig[i + 2] * scaleEffect + off[i + 2] * displacementFactor;
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.visible = true;
        pointsMaterial.uniforms.uPointAlpha.value = 1;
        pointsMaterial.uniforms.uPointSize.value = 0.005 * (1.5 + Math.sin(t * 6));
        setMeshOpacity(0);
    }

    function tickReform() {
        var phase = Math.min(1, phaseTime / durationS());
        var p = easeInOut(phase);
        var waveStrength = 1 - p;
        var t = animTime;
        var scaleEffect = (Math.sin(t * 0.5) * 0.5 + 0.5) * 1.5 * waveStrength + 1;
        var displacementFactor = (Math.sin(t * 3) * 0.5 + 0.5) * waveStrength;
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var off = waveOffsets;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = orig[i] * scaleEffect + off[i] * displacementFactor;
            posArr[i + 1] = orig[i + 1] * scaleEffect + off[i + 1] * displacementFactor;
            posArr[i + 2] = orig[i + 2] * scaleEffect + off[i + 2] * displacementFactor;
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.visible = waveStrength > 0.02;
        pointsMaterial.uniforms.uPointAlpha.value = waveStrength;
        pointsMaterial.uniforms.uPointSize.value = 0.005 * (1.5 + Math.sin(t * 6) * waveStrength);
        setMeshOpacity(p);
    }

    function tickLiuru() {
        var phase = Math.min(1, phaseTime / durationS());
        var posArr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        for (var i = 0; i < posArr.length; i += 3) {
            posArr[i] = lerp(posArr[i], orig[i], 0.03);
            posArr[i + 1] = lerp(posArr[i + 1], orig[i + 1], 0.03);
            posArr[i + 2] = lerp(posArr[i + 2], orig[i + 2], 0.03);
        }
        points.geometry.attributes.position.needsUpdate = true;
        pointsMaterial.uniforms.uSweepY.value = lerp(sweepMinY, sweepMaxY, phase);
        pointsMaterial.uniforms.uSweepWidth.value = sweepWidth;
        pointsMaterial.uniforms.uPointSize.value = 0.007;
    }

    function tickCurrent(delta) {
        phaseTime += delta;
        if (phaseTime >= durationS()) {
            resetPhase();
        }
        if (currentEffect === 'liuru') {
            tickLiuru();
        } else if (currentEffect === 'wuming') {
            tickWuming();
        } else if (currentEffect === 'xing') {
            tickXing();
        } else if (currentEffect === 'shi') {
            tickShi();
        } else if (currentEffect === 'chu') {
            tickChu();
        } else if (isShouEffect()) {
            tickShouVedana();
        } else if (currentEffect === 'ai') {
            tickAi(delta);
        } else if (isQuHold()) {
            tickQu(delta);
        } else if (currentEffect === 'overload') {
            tickOverload();
        } else if (currentEffect === 'collapse') {
            tickCollapse();
        } else if (currentEffect === 'burst') {
            tickBurst();
        } else if (currentEffect === 'dissolve') {
            tickDissolve();
        } else if (currentEffect === 'wave') {
            tickWave();
        } else if (currentEffect === 'reform') {
            tickReform();
        } else {
            tickMingse();
        }
        if (currentEffect !== 'ai' && !isQuHold()) {
            modelRoot.rotation.y += 0.0008;
        }
        syncHudBar();
        setStatus(currentMeta().label + ' ' + phaseTime.toFixed(1) + ' / ' + durationS() + 's');
    }

    function animate() {
        var delta = clock.getDelta();
        if (delta > 0.2) delta = 0.033;
        animTime += delta;
        tickCurrent(delta);
        syncMouseRipple();
        if (controls) controls.update();
        renderer.render(scene, camera);
        rafId = global.requestAnimationFrame(animate);
    }

    function start() {
        if (!global.ThreeRegistry) {
            setStatus('ThreeRegistry 未加载');
            return;
        }
        setStatus('加载模型…');
        global.ThreeRegistry.ensureR128().then(function () {
            global.ThreeRegistry.useR128();
            return loadPositions();
        }).then(function (model) {
            setupScene(model);
            clock.getDelta();
            animate();
        }).catch(function (err) {
            console.error('[MingsePreview]', err);
            setStatus('加载失败，请用本地 HTTP 打开');
        });
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', function () {
            resetPhase();
        });
    }

    for (var t = 0; t < tabButtons.length; t++) {
        tabButtons[t].addEventListener('click', function () {
            switchEffect(this.getAttribute('data-effect'));
        });
    }

    start();
})(window);
