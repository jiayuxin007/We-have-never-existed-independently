/**
 * 半球游水测试页：玻璃半圆罩 + 房屋点云在罩内像水一样游动
 */
(function (global) {
    'use strict';

    var COL_HOUSE = { r: 139 / 255, g: 92 / 255, b: 246 / 255 };
    var COL_TEAL = { r: 0.31, g: 0.82, b: 0.86 };
    var BUBBLE_COUNT = 1400;
    var SWIM_R = 0.28;
    var WAVE_AMP = 0.055;
    var HOUSE_FIT = 0.42;

    var stageEl = document.getElementById('bowlStage');
    var statusEl = document.getElementById('bowlStatus');

    var scene, camera, renderer, controls, clock;
    var houseRoot, housePoints, houseOrig, houseScale = 1;
    var bowlRadius = 8;
    var bubbles, bubbleSeed;
    var rafId = 0;

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function buildModelUrls() {
        return [
            '../../assets/models/less_25mb.glb',
            '../assets/models/less_25mb.glb',
            '/assets/models/less_25mb.glb',
            'assets/models/less_25mb.glb',
        ];
    }

    function loadGltf(url) {
        return new Promise(function (resolve, reject) {
            var loader = new THREE.GLTFLoader();
            loader.load(url, resolve, undefined, reject);
        });
    }

    function loadModel() {
        var urls = buildModelUrls();
        var i = 0;
        var lastErr = null;
        function next() {
            if (i >= urls.length) return Promise.reject(lastErr || new Error('model failed'));
            var url = urls[i++];
            return loadGltf(url).catch(function (err) {
                lastErr = err;
                return next();
            });
        }
        return next();
    }

    function firstMesh(root) {
        var found = null;
        root.traverse(function (obj) {
            if (!found && obj.isMesh && obj.geometry) found = obj;
        });
        return found;
    }

    function createHousePointsMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uSize: { value: 0.018 },
                uColor: { value: new THREE.Vector3(COL_HOUSE.r, COL_HOUSE.g, COL_HOUSE.b) },
                uAlpha: { value: 0.92 },
            },
            vertexShader: [
                'uniform float uSize;',
                'void main() {',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  gl_PointSize = uSize * (280.0 / max(0.4, -mv.z));',
                '  gl_Position = projectionMatrix * mv;',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uColor;',
                'uniform float uAlpha;',
                'void main() {',
                '  vec2 p = gl_PointCoord * 2.0 - 1.0;',
                '  float d = dot(p, p);',
                '  if (d > 1.0) discard;',
                '  float glow = exp(-d * 2.6);',
                '  gl_FragColor = vec4(uColor * (0.55 + glow * 0.7), uAlpha * glow);',
                '}',
            ].join('\n'),
        });
    }

    function createBubbleMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uColor: { value: new THREE.Vector3(COL_TEAL.r, COL_TEAL.g, COL_TEAL.b) },
            },
            vertexShader: [
                'attribute float aSize;',
                'void main() {',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  gl_PointSize = aSize * (220.0 / max(0.4, -mv.z));',
                '  gl_Position = projectionMatrix * mv;',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uColor;',
                'void main() {',
                '  vec2 p = gl_PointCoord * 2.0 - 1.0;',
                '  float d = dot(p, p);',
                '  if (d > 1.0) discard;',
                '  float g = exp(-d * 3.4);',
                '  gl_FragColor = vec4(uColor, 0.55 * g);',
                '}',
            ].join('\n'),
        });
    }

    function createGlassMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
                uColor: { value: new THREE.Color(0x4fd2dd) },
            },
            vertexShader: [
                'varying vec3 vN;',
                'varying vec3 vV;',
                'void main() {',
                '  vec4 w = modelViewMatrix * vec4(position, 1.0);',
                '  vN = normalize(normalMatrix * normal);',
                '  vV = normalize(-w.xyz);',
                '  gl_Position = projectionMatrix * w;',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uColor;',
                'varying vec3 vN;',
                'varying vec3 vV;',
                'void main() {',
                '  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.35);',
                '  float fill = 0.045;',
                '  vec3 col = mix(uColor * 0.35, uColor, fres);',
                '  gl_FragColor = vec4(col, fill + fres * 0.62);',
                '}',
            ].join('\n'),
        });
    }

    function createVolumeMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uColor: { value: new THREE.Color(0x2ec4c8) },
            },
            vertexShader: [
                'varying float vY;',
                'varying vec3 vN;',
                'varying vec3 vV;',
                'void main() {',
                '  vY = position.y;',
                '  vec4 w = modelViewMatrix * vec4(position, 1.0);',
                '  vN = normalize(normalMatrix * normal);',
                '  vV = normalize(-w.xyz);',
                '  gl_Position = projectionMatrix * w;',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uColor;',
                'varying float vY;',
                'varying vec3 vN;',
                'varying vec3 vV;',
                'void main() {',
                '  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.8);',
                '  float depth = smoothstep(0.0, 1.0, 1.0 - vY / 10.0);',
                '  gl_FragColor = vec4(uColor, (0.035 + fres * 0.08) * (0.45 + depth * 0.7));',
                '}',
            ].join('\n'),
        });
    }

    function addHemisphere() {
        var R = bowlRadius;
        var shell = new THREE.Mesh(
            new THREE.SphereGeometry(R, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2),
            createGlassMaterial()
        );
        scene.add(shell);

        var volume = new THREE.Mesh(
            new THREE.SphereGeometry(R * 0.97, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
            createVolumeMaterial()
        );
        scene.add(volume);

        var rim = new THREE.Mesh(
            new THREE.TorusGeometry(R, R * 0.012, 12, 96),
            new THREE.MeshBasicMaterial({
                color: 0x7ef0f4,
                transparent: true,
                opacity: 0.55,
            })
        );
        rim.rotation.x = Math.PI / 2;
        scene.add(rim);

        var floor = new THREE.Mesh(
            new THREE.CircleGeometry(R * 0.98, 64),
            new THREE.MeshBasicMaterial({
                color: 0x0a2a2e,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
            })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        scene.add(floor);
    }

    function seedBubbles() {
        var pos = new Float32Array(BUBBLE_COUNT * 3);
        var size = new Float32Array(BUBBLE_COUNT);
        bubbleSeed = new Float32Array(BUBBLE_COUNT * 4);
        var R = bowlRadius * 0.92;
        var i;
        for (i = 0; i < BUBBLE_COUNT; i++) {
            var u = Math.random();
            var v = Math.random();
            var theta = u * Math.PI * 2;
            var r = Math.pow(v, 0.55) * R;
            var y = Math.random() * Math.sqrt(Math.max(0, R * R - r * r));
            pos[i * 3] = Math.cos(theta) * r;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = Math.sin(theta) * r;
            size[i] = 0.006 + Math.random() * 0.018;
            bubbleSeed[i * 4] = Math.random() * 100;
            bubbleSeed[i * 4 + 1] = 0.12 + Math.random() * 0.35;
            bubbleSeed[i * 4 + 2] = (Math.random() - 0.5) * 0.4;
            bubbleSeed[i * 4 + 3] = (Math.random() - 0.5) * 0.4;
        }
        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
        bubbles = new THREE.Points(geom, createBubbleMaterial());
        scene.add(bubbles);
    }

    function setupHouse(gltf) {
        var mesh = firstMesh(gltf.scene);
        if (!mesh) throw new Error('no mesh');
        var src = mesh.geometry.attributes.position;
        var count = src.count;
        var arr = new Float32Array(count * 3);
        var tmp = new THREE.Vector3();
        mesh.updateWorldMatrix(true, false);
        var i;
        for (i = 0; i < count; i++) {
            tmp.fromBufferAttribute(src, i);
            tmp.applyMatrix4(mesh.matrixWorld);
            arr[i * 3] = tmp.x;
            arr[i * 3 + 1] = tmp.y;
            arr[i * 3 + 2] = tmp.z;
        }

        var box = new THREE.Box3();
        box.setFromArray(arr);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z) || 1;
        houseScale = (bowlRadius * 2 * HOUSE_FIT) / maxDim;
        for (i = 0; i < arr.length; i += 3) {
            arr[i] = (arr[i] - center.x) * houseScale;
            arr[i + 1] = (arr[i + 1] - center.y) * houseScale;
            arr[i + 2] = (arr[i + 2] - center.z) * houseScale;
        }
        houseOrig = arr;

        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(arr.slice(), 3));
        housePoints = new THREE.Points(geom, createHousePointsMaterial());
        housePoints.rotation.x = Math.PI / 2;
        houseRoot = new THREE.Group();
        houseRoot.add(housePoints);
        scene.add(houseRoot);
    }

    function confine(x, y, z, pad) {
        var maxR = bowlRadius - pad;
        if (y < pad) y = pad;
        var len = Math.sqrt(x * x + y * y + z * z);
        if (len > maxR && len > 1e-6) {
            var s = maxR / len;
            x *= s;
            y *= s;
            z *= s;
        }
        return { x: x, y: y, z: z };
    }

    function tickHouse(t) {
        if (!houseRoot || !housePoints || !houseOrig) return;
        var reach = bowlRadius * SWIM_R;
        var cx = Math.sin(t * 0.21) * reach + Math.sin(t * 0.47) * reach * 0.22;
        var cz = Math.cos(t * 0.17) * reach + Math.cos(t * 0.39) * reach * 0.18;
        var cy = bowlRadius * 0.32 + Math.sin(t * 0.29) * bowlRadius * 0.1;
        var c = confine(cx, cy, cz, bowlRadius * 0.28);
        houseRoot.position.set(c.x, c.y, c.z);
        houseRoot.rotation.y = t * 0.11;
        houseRoot.rotation.x = Math.sin(t * 0.37) * 0.16;
        houseRoot.rotation.z = Math.cos(t * 0.31) * 0.1;

        var pos = housePoints.geometry.attributes.position.array;
        var orig = houseOrig;
        var amp = bowlRadius * WAVE_AMP;
        var i;
        for (i = 0; i < orig.length; i += 3) {
            var ox = orig[i];
            var oy = orig[i + 1];
            var oz = orig[i + 2];
            var w1 = Math.sin(t * 1.35 + ox * 2.4 + oz * 1.6);
            var w2 = Math.cos(t * 1.05 + oy * 2.1 + ox * 1.2);
            var w3 = Math.sin(t * 0.85 + oz * 1.8 + oy * 1.4);
            pos[i] = ox + (w1 * 0.7 + w3 * 0.3) * amp;
            pos[i + 1] = oy + (w2 * 0.85 + w1 * 0.25) * amp;
            pos[i + 2] = oz + (w3 * 0.7 + w2 * 0.3) * amp;
        }
        housePoints.geometry.attributes.position.needsUpdate = true;
    }

    function tickBubbles(t) {
        if (!bubbles || !bubbleSeed) return;
        var pos = bubbles.geometry.attributes.position.array;
        var R = bowlRadius * 0.92;
        var i;
        for (i = 0; i < BUBBLE_COUNT; i++) {
            var seed = bubbleSeed[i * 4];
            var rise = bubbleSeed[i * 4 + 1];
            var jx = bubbleSeed[i * 4 + 2];
            var jz = bubbleSeed[i * 4 + 3];
            var y = ((t * rise * 0.55 + seed) % 1) * R;
            var swirl = t * 0.18 + seed;
            var r = Math.sqrt(Math.max(0, R * R - y * y)) * (0.15 + (seed % 1) * 0.78);
            var x = Math.cos(swirl) * r + Math.sin(t * 0.7 + seed) * jx;
            var z = Math.sin(swirl) * r + Math.cos(t * 0.6 + seed) * jz;
            var c = confine(x, y, z, 0.12);
            pos[i * 3] = c.x;
            pos[i * 3 + 1] = c.y;
            pos[i * 3 + 2] = c.z;
        }
        bubbles.geometry.attributes.position.needsUpdate = true;
    }

    function onResize() {
        if (!renderer || !camera || !stageEl) return;
        var w = stageEl.clientWidth || global.innerWidth;
        var h = stageEl.clientHeight || global.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    function animate() {
        var t = clock.getElapsedTime();
        tickHouse(t);
        tickBubbles(t);
        if (controls) controls.update();
        renderer.render(scene, camera);
        rafId = global.requestAnimationFrame(animate);
    }

    function setupScene(gltf) {
        scene = new THREE.Scene();
        clock = new THREE.Clock();
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
        stageEl.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
        scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        var key = new THREE.DirectionalLight(0xb8fff8, 0.7);
        key.position.set(6, 10, 4);
        scene.add(key);
        var fill = new THREE.PointLight(0x4fd2dd, 1.1, bowlRadius * 6);
        fill.position.set(0, bowlRadius * 0.4, 0);
        scene.add(fill);

        addHemisphere();
        seedBubbles();
        setupHouse(gltf);

        var dist = bowlRadius * 2.35;
        camera.position.set(dist * 0.85, dist * 0.48, dist);
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.target.set(0, bowlRadius * 0.32, 0);
        controls.minDistance = bowlRadius * 1.2;
        controls.maxDistance = bowlRadius * 5;
        controls.update();

        onResize();
        global.addEventListener('resize', onResize);
        animate();
        setStatus('半球游水 · 拖动旋转');
    }

    function start() {
        if (!global.ThreeRegistry) {
            setStatus('ThreeRegistry 未加载');
            return;
        }
        setStatus('加载房屋…');
        global.ThreeRegistry.ensureR128().then(function () {
            global.ThreeRegistry.useR128();
            return loadModel();
        }).then(function (gltf) {
            setupScene(gltf);
        }).catch(function (err) {
            console.error('[BowlSwim]', err);
            setStatus('加载失败，请用本地 HTTP 打开');
        });
    }

    start();
})(window);
