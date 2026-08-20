/**
 * House point-cloud + After Effects Glow.
 * Preview only — main sequence uses the same AeGlow defaults.
 */
(function (global) {
    'use strict';

    var COL_HOUSE = 0x3A6D75;
    var MODEL_YAW0 = Math.PI;
    var MODEL_URL = '../../assets/models/less_25mb.glb';

    var stageEl = document.getElementById('glowStage');
    var statusEl = document.getElementById('glowStatus');
    var enabledEl = document.getElementById('glowEnabled');
    var thresholdEl = document.getElementById('glowThreshold');
    var softnessEl = document.getElementById('glowSoftness');
    var radiusEl = document.getElementById('glowRadius');
    var intensityEl = document.getElementById('glowIntensity');
    var glowOnlyEl = document.getElementById('glowOnly');
    var colorizeEl = document.getElementById('glowColorize');
    var colorAEl = document.getElementById('glowColorA');
    var thresholdVal = document.getElementById('glowThresholdVal');
    var softnessVal = document.getElementById('glowSoftnessVal');
    var radiusVal = document.getElementById('glowRadiusVal');
    var intensityVal = document.getElementById('glowIntensityVal');

    var scene, camera, renderer, aeGlow, controls, clock;
    var modelRoot, points, pointsMaterial;
    var holdOff = false;
    var rafId = 0;

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function glowParams() {
        return {
            enabled: !!(enabledEl && enabledEl.checked) && !holdOff,
            threshold: (Number(thresholdEl.value) || 0) / 100,
            softness: (Number(softnessEl.value) || 0) / 100,
            radius: Number(radiusEl.value) || 2,
            intensity: (Number(intensityEl.value) || 0) / 10,
            colorize: !!(colorizeEl && colorizeEl.checked),
            glowOnly: !!(glowOnlyEl && glowOnlyEl.checked),
            colorA: colorAEl ? colorAEl.value : '#7ED4DE',
        };
    }

    function syncLabels() {
        var p = glowParams();
        if (thresholdVal) thresholdVal.textContent = String(Math.round(p.threshold * 100));
        if (softnessVal) softnessVal.textContent = String(Math.round(p.softness * 100));
        if (radiusVal) radiusVal.textContent = String(p.radius);
        if (intensityVal) intensityVal.textContent = p.intensity.toFixed(1);
    }

    function syncGlow() {
        if (!aeGlow) return;
        var p = glowParams();
        aeGlow.enabled = p.enabled;
        aeGlow.threshold = p.threshold;
        aeGlow.softness = p.softness;
        aeGlow.radius = p.radius;
        aeGlow.intensity = p.intensity;
        aeGlow.colorize = p.colorize ? 1 : 0;
        aeGlow.glowOnly = p.glowOnly;
        if (p.colorA) aeGlow.colorA.set(p.colorA);
    }

    function createPointsMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uPointSize: { value: 0.012 },
                uPointAlpha: { value: 1 },
                uColor: { value: new THREE.Color(COL_HOUSE) },
            },
            vertexShader: [
                'uniform float uPointSize;',
                'void main() {',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  float dist = max(length(mv.xyz), 0.001);',
                '  gl_PointSize = uPointSize * (300.0 / dist);',
                '  gl_Position = projectionMatrix * mv;',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform float uPointAlpha;',
                'uniform vec3 uColor;',
                'void main() {',
                '  float d = length(gl_PointCoord - 0.5) * 2.0;',
                '  float a = 1.0 - smoothstep(0.2, 1.0, d);',
                '  a *= uPointAlpha;',
                '  if (a < 0.004) discard;',
                '  gl_FragColor = vec4(uColor, a);',
                '}',
            ].join('\n'),
        });
    }

    function firstMesh(root) {
        var found = null;
        var best = 0;
        root.traverse(function (child) {
            if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) return;
            var n = child.geometry.attributes.position.count;
            if (n > best) {
                best = n;
                found = child;
            }
        });
        return found;
    }

    function setupFromGltf(gltf) {
        modelRoot = new THREE.Group();
        scene.add(modelRoot);

        var mesh = firstMesh(gltf.scene);
        if (!mesh) throw new Error('No mesh in GLB');

        var src = mesh.geometry.attributes.position.array;
        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(src), 3));

        pointsMaterial = createPointsMaterial();
        points = new THREE.Points(geom, pointsMaterial);
        points.frustumCulled = false;
        points.rotation.x = Math.PI / 2;
        modelRoot.add(points);

        var box = new THREE.Box3().setFromObject(modelRoot);
        var center = new THREE.Vector3();
        box.getCenter(center);
        modelRoot.position.sub(center);
        modelRoot.rotation.y = MODEL_YAW0;

        box.setFromObject(modelRoot);
        var size = new THREE.Vector3();
        box.getSize(size);
        var maxDim = Math.max(size.x, size.y, size.z) || 10;
        var dist = maxDim * 0.6;
        camera.position.set(dist * 1.2, dist * 0.4, dist);
        controls.target.set(0, 0, 0);
        controls.update();
        setStatus('点云 ' + (src.length / 3 | 0) + ' · 拖动旋转');
    }

    function onResize() {
        if (!renderer || !camera || !stageEl) return;
        var w = stageEl.clientWidth || global.innerWidth;
        var h = stageEl.clientHeight || global.innerHeight;
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        if (aeGlow) aeGlow.resize();
    }

    function tick() {
        rafId = requestAnimationFrame(tick);
        if (controls) controls.update();
        if (clock) clock.getDelta();
        syncGlow();
        if (aeGlow) aeGlow.render(scene, camera);
        else renderer.render(scene, camera);
    }

    function loadModel() {
        return new Promise(function (resolve, reject) {
            var loader = new THREE.GLTFLoader();
            loader.load(MODEL_URL, resolve, function (ev) {
                if (!ev.total) return;
                var pct = Math.round((ev.loaded / ev.total) * 100);
                setStatus('加载模型… ' + pct + '%');
            }, reject);
        });
    }

    function applyPresetAe() {
        enabledEl.checked = true;
        thresholdEl.value = '10';
        softnessEl.value = '0';
        radiusEl.value = '26';
        intensityEl.value = '7';
        colorizeEl.checked = false;
        if (glowOnlyEl) glowOnlyEl.checked = false;
        syncLabels();
    }

    function applyPresetOff() {
        enabledEl.checked = false;
        syncLabels();
    }

    function bindUi() {
        [thresholdEl, softnessEl, radiusEl, intensityEl].forEach(function (el) {
            if (!el) return;
            el.addEventListener('input', syncLabels);
        });
        if (enabledEl) enabledEl.addEventListener('change', syncLabels);
        document.getElementById('glowPresetAe').addEventListener('click', applyPresetAe);
        document.getElementById('glowPresetOff').addEventListener('click', applyPresetOff);
        global.addEventListener('keydown', function (e) {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                holdOff = true;
            }
        });
        global.addEventListener('keyup', function (e) {
            if (e.code === 'Space') holdOff = false;
        });
        syncLabels();
    }

    function start() {
        if (!global.ThreeRegistry) {
            setStatus('ThreeRegistry 未加载');
            return;
        }
        setStatus('加载 THREE…');
        global.ThreeRegistry.ensureR128().then(function () {
            global.ThreeRegistry.useR128();
            if (!global.AeGlow) throw new Error('AeGlow not loaded');
            scene = new THREE.Scene();
            clock = new THREE.Clock();
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
            renderer.autoClear = false;
            stageEl.innerHTML = '';
            stageEl.appendChild(renderer.domElement);

            camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
            scene.add(new THREE.AmbientLight(0xffffff, 0.55));
            var dir = new THREE.DirectionalLight(0xffffff, 0.95);
            dir.position.set(5, 8, 6);
            scene.add(dir);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enablePan = false;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.6;

            aeGlow = new global.AeGlow(renderer);
            onResize();
            global.addEventListener('resize', onResize);
            bindUi();
            setStatus('加载模型…');
            return loadModel();
        }).then(function (gltf) {
            setupFromGltf(gltf);
            tick();
        }).catch(function (err) {
            console.error('[GlowPreview]', err);
            setStatus('加载失败，请用本地 HTTP 打开');
        });
    }

    start();
})(window);
