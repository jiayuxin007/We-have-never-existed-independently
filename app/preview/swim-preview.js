/**
 * 游动研究页：主流程房屋点云 + 星空背景。
 * 生 = 3D curl 流场慢游（格点求旋度，粒子插值）；老死 = 主流程卸下。
 */
(function (global) {
    'use strict';

    var LIFE_S = 8.5;
    var DEATH_S = 11;
    var HOLD_S = 1.8;
    var COL_HOUSE = 0x8B5CF6;
    var LINE_LIFE = 'Woven as an algorithmic birthmark, cast as the first computed shadow.';
    var LINE_DEATH = 'Uninstall every illusion here, relinquish all to the echo-less void.';
    var GRID = 16;

    var stageEl = document.getElementById('swimStage');
    var statusEl = document.getElementById('swimStatus');
    var phaseEl = document.getElementById('swimPhase');
    var replayBtn = document.getElementById('swimReplay');
    var modeLifeBtn = document.getElementById('modeLife');
    var modeCycleBtn = document.getElementById('modeCycle');

    var scene, camera, renderer, aeGlow, controls, clock;
    var modelRoot, points, pointsMaterial;
    var originalPositions = null;
    var velX, velY, velZ, speedArr;
    var fadeDelay, snapX, snapY, snapZ, peeling;
    var houseMaxDim = 10;
    var fadeInvMat, fadeUp;
    var mouseNDC = { x: 0, y: 0 };
    var mouseLocal = null;
    var mouseRay, mouseHit, mousePlane, camDir;
    var rafId = 0;
    var flowTime = 0;
    var clockTime = 0;
    var phase = 'life';
    var cycleDeath = true;
    var field = null;
    var fieldOriginX = 0;
    var fieldOriginY = 0;
    var fieldOriginZ = 0;
    var fieldExtent = 1;
    var fieldInv = 1;
    var sampleFx = 0;
    var sampleFy = 0;
    var sampleFz = 0;
    var origCx = 0;
    var origCy = 0;
    var origCz = 0;
    var lastMeanX = 0;
    var lastMeanY = 0;
    var lastMeanZ = 0;
    var mouseIdleTime = 10;
    var lastMouseNdcX = 0;
    var lastMouseNdcY = 0;
    var screenTmp = null;

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function setPhaseLabel(text) {
        if (phaseEl) phaseEl.textContent = text;
    }

    function showSubtitle(text) {
        if (!global.SubtitleController) return;
        if (!text) {
            global.SubtitleController.hide();
            return;
        }
        global.SubtitleController.showLine(text);
    }

    function hash3(ix, iy, iz) {
        var n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 2147483647)) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function valueNoise3(x, y, z) {
        var ix = Math.floor(x);
        var iy = Math.floor(y);
        var iz = Math.floor(z);
        var fx = x - ix;
        var fy = y - iy;
        var fz = z - iz;
        var ux = fx * fx * (3 - 2 * fx);
        var uy = fy * fy * (3 - 2 * fy);
        var uz = fz * fz * (3 - 2 * fz);
        var n000 = hash3(ix, iy, iz);
        var n100 = hash3(ix + 1, iy, iz);
        var n010 = hash3(ix, iy + 1, iz);
        var n110 = hash3(ix + 1, iy + 1, iz);
        var n001 = hash3(ix, iy, iz + 1);
        var n101 = hash3(ix + 1, iy, iz + 1);
        var n011 = hash3(ix, iy + 1, iz + 1);
        var n111 = hash3(ix + 1, iy + 1, iz + 1);
        var n00 = n000 + (n100 - n000) * ux;
        var n10 = n010 + (n110 - n010) * ux;
        var n01 = n001 + (n101 - n001) * ux;
        var n11 = n011 + (n111 - n011) * ux;
        var n0 = n00 + (n10 - n00) * uy;
        var n1 = n01 + (n11 - n01) * uy;
        return n0 + (n1 - n0) * uz;
    }

    function noise1(x, y, z) {
        return valueNoise3(x, y, z) * 2 - 1;
    }

    function noise2(x, y, z) {
        return valueNoise3(x + 17.2, y + 31.4, z + 9.8) * 2 - 1;
    }

    function noise3(x, y, z) {
        return valueNoise3(x + 53.1, y + 41.7, z + 23.6) * 2 - 1;
    }

    function curlOctave(x, y, z) {
        var e = 0.12;
        var inv = 0.5 / e;
        var cx = (noise3(x, y + e, z) - noise3(x, y - e, z) - (noise2(x, y, z + e) - noise2(x, y, z - e))) * inv;
        var cy = (noise1(x, y, z + e) - noise1(x, y, z - e) - (noise3(x + e, y, z) - noise3(x - e, y, z))) * inv;
        var cz = (noise2(x + e, y, z) - noise2(x - e, y, z) - (noise1(x, y + e, z) - noise1(x, y - e, z))) * inv;
        return { x: cx, y: cy, z: cz };
    }

    function curlAt(x, y, z, t) {
        var p = curlOctave(x + t, y + t * 0.71, z + t * 0.53);
        var q = curlOctave(x * 2.03 + t * 1.4, y * 2.03 + t * 0.9, z * 2.03 + t * 1.1);
        return {
            x: p.x + q.x * 0.36,
            y: p.y + q.y * 0.36,
            z: p.z + q.z * 0.36,
        };
    }

    function initFieldFromCloud() {
        var orig = originalPositions;
        var minX = Infinity;
        var minY = Infinity;
        var minZ = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        var maxZ = -Infinity;
        var i;
        for (i = 0; i < orig.length; i += 3) {
            if (orig[i] < minX) minX = orig[i];
            if (orig[i] > maxX) maxX = orig[i];
            if (orig[i + 1] < minY) minY = orig[i + 1];
            if (orig[i + 1] > maxY) maxY = orig[i + 1];
            if (orig[i + 2] < minZ) minZ = orig[i + 2];
            if (orig[i + 2] > maxZ) maxZ = orig[i + 2];
        }
        var span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
        var pad = span * 0.4;
        fieldOriginX = minX - pad;
        fieldOriginY = minY - pad;
        fieldOriginZ = minZ - pad;
        fieldExtent = span + pad * 2;
        fieldInv = (GRID - 1) / fieldExtent;
        field = new Float32Array(GRID * GRID * GRID * 3);
        origCx = (minX + maxX) * 0.5;
        origCy = (minY + maxY) * 0.5;
        origCz = (minZ + maxZ) * 0.5;
        lastMeanX = origCx;
        lastMeanY = origCy;
        lastMeanZ = origCz;
    }

    function rebuildField(time) {
        if (!field) return;
        var freq = 1.45 / Math.max(fieldExtent, 1);
        var t = time * 0.28;
        var gi = 0;
        var x;
        var y;
        var z;
        for (z = 0; z < GRID; z++) {
            for (y = 0; y < GRID; y++) {
                for (x = 0; x < GRID; x++) {
                    var px = (fieldOriginX + (x / (GRID - 1)) * fieldExtent) * freq;
                    var py = (fieldOriginY + (y / (GRID - 1)) * fieldExtent) * freq;
                    var pz = (fieldOriginZ + (z / (GRID - 1)) * fieldExtent) * freq;
                    var c = curlAt(px, py, pz, t);
                    field[gi++] = c.x;
                    field[gi++] = c.y;
                    field[gi++] = c.z;
                }
            }
        }
    }

    function sampleField(x, y, z) {
        var u = (x - fieldOriginX) * fieldInv;
        var v = (y - fieldOriginY) * fieldInv;
        var w = (z - fieldOriginZ) * fieldInv;
        if (u < 0) u = 0;
        if (v < 0) v = 0;
        if (w < 0) w = 0;
        if (u > GRID - 1.001) u = GRID - 1.001;
        if (v > GRID - 1.001) v = GRID - 1.001;
        if (w > GRID - 1.001) w = GRID - 1.001;
        var x0 = u | 0;
        var y0 = v | 0;
        var z0 = w | 0;
        var tx = u - x0;
        var ty = v - y0;
        var tz = w - z0;
        var strideY = GRID * 3;
        var strideZ = GRID * GRID * 3;
        var i000 = (x0 * 3) + y0 * strideY + z0 * strideZ;
        var i100 = i000 + 3;
        var i010 = i000 + strideY;
        var i110 = i100 + strideY;
        var i001 = i000 + strideZ;
        var i101 = i100 + strideZ;
        var i011 = i010 + strideZ;
        var i111 = i110 + strideZ;
        var n00 = field[i000] + (field[i100] - field[i000]) * tx;
        var n10 = field[i010] + (field[i110] - field[i010]) * tx;
        var n01 = field[i001] + (field[i101] - field[i001]) * tx;
        var n11 = field[i011] + (field[i111] - field[i011]) * tx;
        sampleFx = n00 + (n10 - n00) * ty + ((n01 + (n11 - n01) * ty) - (n00 + (n10 - n00) * ty)) * tz;
        n00 = field[i000 + 1] + (field[i100 + 1] - field[i000 + 1]) * tx;
        n10 = field[i010 + 1] + (field[i110 + 1] - field[i010 + 1]) * tx;
        n01 = field[i001 + 1] + (field[i101 + 1] - field[i001 + 1]) * tx;
        n11 = field[i011 + 1] + (field[i111 + 1] - field[i011 + 1]) * tx;
        sampleFy = n00 + (n10 - n00) * ty + ((n01 + (n11 - n01) * ty) - (n00 + (n10 - n00) * ty)) * tz;
        n00 = field[i000 + 2] + (field[i100 + 2] - field[i000 + 2]) * tx;
        n10 = field[i010 + 2] + (field[i110 + 2] - field[i010 + 2]) * tx;
        n01 = field[i001 + 2] + (field[i101 + 2] - field[i001 + 2]) * tx;
        n11 = field[i011 + 2] + (field[i111 + 2] - field[i011 + 2]) * tx;
        sampleFz = n00 + (n10 - n00) * ty + ((n01 + (n11 - n01) * ty) - (n00 + (n10 - n00) * ty)) * tz;
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

    function createPointsMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uPointSize: { value: 0.012 },
                uPointAlpha: { value: 1 },
                uGlow: { value: 1 },
                uColor: { value: new THREE.Color(COL_HOUSE) },
                uHemiCenter: { value: new THREE.Vector3() },
                uHemiRadius: { value: 1 },
                uHemiCutY: { value: 0 },
            },
            vertexShader: [
                'attribute float aSizeScale;',
                'attribute float aSpeed;',
                'uniform float uPointSize;',
                'uniform float uPointAlpha;',
                'uniform float uGlow;',
                'uniform vec3 uHemiCenter;',
                'uniform float uHemiRadius;',
                'uniform float uHemiCutY;',
                'varying float vGlow;',
                'void main() {',
                '  if (uPointAlpha < 0.001 || aSizeScale < 0.02) {',
                '    gl_PointSize = 0.0;',
                '    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);',
                '    return;',
                '  }',
                '  vec4 world = modelMatrix * vec4(position, 1.0);',
                '  vec3 hemiD = world.xyz - uHemiCenter;',
                '  if (world.y < uHemiCutY || dot(hemiD, hemiD) > uHemiRadius * uHemiRadius) {',
                '    gl_PointSize = 0.0;',
                '    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);',
                '    return;',
                '  }',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  float dist = max(length(mv.xyz), 0.001);',
                '  float spd = clamp(aSpeed, 0.0, 1.0);',
                '  gl_PointSize = uPointSize * (300.0 / dist) * aSizeScale * (1.0 + spd * 0.7);',
                '  gl_Position = projectionMatrix * mv;',
                '  vGlow = uGlow * (1.0 + spd * 0.28);',
                '}',
            ].join('\n'),
            fragmentShader: [
                'uniform float uPointAlpha;',
                'uniform vec3 uColor;',
                'varying float vGlow;',
                'void main() {',
                '  if (uPointAlpha < 0.001) discard;',
                '  float d = length(gl_PointCoord - 0.5) * 2.0;',
                '  float a = (1.0 - smoothstep(0.2, 1.0, d)) * vGlow * uPointAlpha;',
                '  gl_FragColor = vec4(uColor, a);',
                '}',
            ].join('\n'),
        });
    }

    function resetLife() {
        if (!points || !originalPositions) return;
        var arr = points.geometry.attributes.position.array;
        arr.set(originalPositions);
        points.geometry.attributes.position.needsUpdate = true;
        var sizeArr = points.geometry.attributes.aSizeScale.array;
        var n = originalPositions.length / 3;
        var i;
        for (i = 0; i < n; i++) {
            velX[i] = 0;
            velY[i] = 0;
            velZ[i] = 0;
            speedArr[i] = 0;
            fadeDelay[i] = Math.random() * 5.4;
            peeling[i] = 0;
            sizeArr[i] = 1;
        }
        points.geometry.attributes.aSizeScale.needsUpdate = true;
        points.geometry.attributes.aSpeed.needsUpdate = true;
        if (pointsMaterial) pointsMaterial.uniforms.uPointAlpha.value = 1;
        flowTime = 0;
        clockTime = 0;
        lastMeanX = origCx;
        lastMeanY = origCy;
        lastMeanZ = origCz;
        phase = 'life';
        setPhaseLabel('生');
        setStatus(cycleDeath ? '生 → 老死' : '只游动');
        showSubtitle(LINE_LIFE);
    }

    function setMode(cycle) {
        cycleDeath = cycle;
        if (modeLifeBtn) modeLifeBtn.classList.toggle('is-active', !cycle);
        if (modeCycleBtn) modeCycleBtn.classList.toggle('is-active', cycle);
        resetLife();
    }

    function updateMouseLocal() {
        if (!camera || !points || !mouseRay) return;
        mouseRay.setFromCamera(mouseNDC, camera);
        camera.getWorldDirection(camDir);
        mousePlane.setFromNormalAndCoplanarPoint(camDir, controls ? controls.target : scene.position);
        if (!mouseRay.ray.intersectPlane(mousePlane, mouseHit)) return;
        points.worldToLocal(mouseHit);
        mouseLocal.copy(mouseHit);
    }

    function tickLife(dt, spring, idle) {
        var arr = points.geometry.attributes.position.array;
        var orig = originalPositions;
        var n = orig.length / 3;
        var curlAmp = houseMaxDim * 0.08;
        var speedNorm = 1 / Math.max(houseMaxDim * 0.004, 1e-6);
        var stirR = houseMaxDim * 0.22;
        var stirR2 = stirR * stirR;
        var mx = mouseLocal ? mouseLocal.x : 0;
        var my = mouseLocal ? mouseLocal.y : 0;
        var mz = mouseLocal ? mouseLocal.z : 0;
        var hold = (idle ? 0.7 : 0.35) * dt;
        var holdX = (origCx - lastMeanX) * hold;
        var holdY = (origCy - lastMeanY) * hold;
        var holdZ = (origCz - lastMeanZ) * hold;
        var sumCurlX = 0;
        var sumCurlY = 0;
        var sumCurlZ = 0;
        var i;
        var idx;
        for (i = 0; i < n; i++) {
            idx = i * 3;
            sampleField(arr[idx], arr[idx + 1], arr[idx + 2]);
            velX[i] += sampleFx * curlAmp * dt;
            velY[i] += sampleFy * curlAmp * dt;
            velZ[i] += sampleFz * curlAmp * dt;
            sumCurlX += sampleFx;
            sumCurlY += sampleFy;
            sumCurlZ += sampleFz;
        }
        var meanCurlX = (sumCurlX / n) * curlAmp * dt;
        var meanCurlY = (sumCurlY / n) * curlAmp * dt;
        var meanCurlZ = (sumCurlZ / n) * curlAmp * dt;
        var sumX = 0;
        var sumY = 0;
        var sumZ = 0;
        for (i = 0; i < n; i++) {
            idx = i * 3;
            var x = arr[idx];
            var y = arr[idx + 1];
            var z = arr[idx + 2];
            velX[i] -= meanCurlX;
            velY[i] -= meanCurlY;
            velZ[i] -= meanCurlZ;
            velX[i] += holdX;
            velY[i] += holdY;
            velZ[i] += holdZ;
            if (!idle && mouseLocal) {
                var dx = x - mx;
                var dy = y - my;
                var dz = z - mz;
                var d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < stirR2) {
                    var stir = 0.045 / (d2 / (houseMaxDim * houseMaxDim) + 0.08);
                    velX[i] += -dy * stir * dt;
                    velY[i] += dx * stir * dt;
                }
            }
            if (spring > 0) {
                velX[i] += (orig[idx] - x) * spring * dt;
                velY[i] += (orig[idx + 1] - y) * spring * dt;
                velZ[i] += (orig[idx + 2] - z) * spring * dt;
            }
            velX[i] *= 0.972;
            velY[i] *= 0.972;
            velZ[i] *= 0.972;
            x += velX[i];
            y += velY[i];
            z += velZ[i];
            arr[idx] = x;
            arr[idx + 1] = y;
            arr[idx + 2] = z;
            sumX += x;
            sumY += y;
            sumZ += z;
            var spd = Math.sqrt(velX[i] * velX[i] + velY[i] * velY[i] + velZ[i] * velZ[i]);
            speedArr[i] = Math.min(1, spd * speedNorm);
        }
        lastMeanX = sumX / n;
        lastMeanY = sumY / n;
        lastMeanZ = sumZ / n;
        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.aSpeed.needsUpdate = true;
    }

    function tickDeath(dt) {
        points.updateMatrixWorld(true);
        fadeInvMat.copy(points.matrixWorld).invert();
        fadeUp.set(0, 1, 0).transformDirection(fadeInvMat).normalize();
        var lift = houseMaxDim * 0.28;
        var drift = houseMaxDim * 0.1;
        var ux = fadeUp.x * lift;
        var uy = fadeUp.y * lift;
        var uz = fadeUp.z * lift;
        var arr = points.geometry.attributes.position.array;
        var sizeArr = points.geometry.attributes.aSizeScale.array;
        var n = originalPositions.length / 3;
        var t = clockTime;
        var i;
        var idx;
        for (i = 0; i < n; i++) {
            var gone = t > fadeDelay[i] ? (t - fadeDelay[i]) * 0.55 : 0;
            idx = i * 3;
            if (gone >= 1) {
                sizeArr[i] = 0;
                continue;
            }
            if (gone <= 0) continue;
            if (!peeling[i]) {
                snapX[i] = arr[idx];
                snapY[i] = arr[idx + 1];
                snapZ[i] = arr[idx + 2];
                peeling[i] = 1;
            }
            var n1 = Math.sin(originalPositions[idx] * 3.1 + t * 1.35);
            var n2 = Math.sin(originalPositions[idx + 1] * 2.7 + t * 1.05 + 8.4);
            arr[idx] = snapX[i] + ux * gone + n1 * drift * gone;
            arr[idx + 1] = snapY[i] + uy * gone + n2 * drift * gone;
            arr[idx + 2] = snapZ[i] + uz * gone;
            sizeArr[i] = 1 - gone;
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.aSizeScale.needsUpdate = true;
        var tail = t > 7.2 ? Math.max(0, 1 - (t - 7.2) / 2.6) : 1;
        pointsMaterial.uniforms.uPointAlpha.value = tail;
    }

    function animate() {
        rafId = global.requestAnimationFrame(animate);
        var dt = clock ? Math.min(0.033, clock.getDelta()) : 0.016;
        if (controls) controls.update();
        if (!points) {
            if (renderer && scene && camera) {
                if (aeGlow) aeGlow.render(scene, camera);
                else renderer.render(scene, camera);
            }
            return;
        }

        clockTime += dt;
        if (phase === 'life' && cycleDeath && clockTime > LIFE_S) {
            phase = 'death';
            clockTime = 0;
            setPhaseLabel('老死');
            showSubtitle(LINE_DEATH);
        } else if (phase === 'death' && clockTime > DEATH_S) {
            phase = 'hold';
            clockTime = 0;
            setPhaseLabel('空');
            showSubtitle('');
        } else if (phase === 'hold' && clockTime > HOLD_S) {
            resetLife();
        }

        if (phase === 'hold') {
            if (pointsMaterial) pointsMaterial.uniforms.uPointAlpha.value = 0;
            if (aeGlow) aeGlow.render(scene, camera);
            else renderer.render(scene, camera);
            return;
        }

        flowTime += dt * 0.14;
        rebuildField(flowTime);
        mouseIdleTime += dt;
        var idle = mouseIdleTime > 0.35;
        updateMouseLocal();
        if (phase === 'life') {
            tickLife(dt, 0.18, idle);
        } else {
            tickLife(dt, 0.08, false);
            tickDeath(dt);
        }
        if (aeGlow) aeGlow.render(scene, camera);
        else renderer.render(scene, camera);
    }

    function onResize() {
        if (!camera || !renderer || !stageEl) return;
        var w = stageEl.clientWidth || global.innerWidth;
        var h = stageEl.clientHeight || global.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (aeGlow) aeGlow.resize();
    }

    function onMouseMove(e) {
        var w = global.innerWidth || 1;
        var h = global.innerHeight || 1;
        var nx = (e.clientX / w) * 2 - 1;
        var ny = -(e.clientY / h) * 2 + 1;
        var dx = nx - lastMouseNdcX;
        var dy = ny - lastMouseNdcY;
        if (dx * dx + dy * dy > 4e-6) mouseIdleTime = 0;
        lastMouseNdcX = nx;
        lastMouseNdcY = ny;
        mouseNDC.x = nx;
        mouseNDC.y = ny;
    }

    function setupScene(gltf) {
        scene = new THREE.Scene();
        clock = new THREE.Clock();
        fadeInvMat = new THREE.Matrix4();
        fadeUp = new THREE.Vector3();
        camDir = new THREE.Vector3();
        mouseLocal = new THREE.Vector3();
        mouseHit = new THREE.Vector3();
        mousePlane = new THREE.Plane();
        mouseRay = new THREE.Raycaster();
        screenTmp = new THREE.Vector3();

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        renderer.autoClear = false;
        if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
        if (THREE.ACESFilmicToneMapping) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }
        stageEl.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        var dir = new THREE.DirectionalLight(0xffffff, 1.0);
        dir.position.set(5, 5, 5);
        scene.add(dir);

        var mesh = firstMesh(gltf.scene);
        if (!mesh) throw new Error('No mesh in GLB');
        gltf.scene.traverse(function (child) {
            if (child.isMesh) child.visible = false;
        });

        var src = mesh.geometry.attributes.position;
        originalPositions = new Float32Array(src.array.length);
        originalPositions.set(src.array);
        var count = src.count;
        velX = new Float32Array(count);
        velY = new Float32Array(count);
        velZ = new Float32Array(count);
        speedArr = new Float32Array(count);
        fadeDelay = new Float32Array(count);
        snapX = new Float32Array(count);
        snapY = new Float32Array(count);
        snapZ = new Float32Array(count);
        peeling = new Uint8Array(count);
        initFieldFromCloud();

        var pGeom = new THREE.BufferGeometry();
        var posAttr = new THREE.BufferAttribute(originalPositions.slice(), 3);
        posAttr.dynamic = true;
        pGeom.setAttribute('position', posAttr);
        var sizeScale = new Float32Array(count);
        var i;
        for (i = 0; i < count; i++) {
            sizeScale[i] = 1;
            fadeDelay[i] = Math.random() * 5.4;
        }
        pGeom.setAttribute('aSizeScale', new THREE.BufferAttribute(sizeScale, 1));
        var speedAttr = new THREE.BufferAttribute(speedArr, 1);
        speedAttr.dynamic = true;
        pGeom.setAttribute('aSpeed', speedAttr);

        pointsMaterial = createPointsMaterial();
        points = new THREE.Points(pGeom, pointsMaterial);
        points.frustumCulled = false;
        points.rotation.x = Math.PI / 2;

        modelRoot = new THREE.Group();
        if (gltf.scene.parent) gltf.scene.parent.remove(gltf.scene);
        modelRoot.add(gltf.scene);
        modelRoot.add(points);
        scene.add(modelRoot);

        var box = new THREE.Box3().setFromObject(modelRoot);
        var center = new THREE.Vector3();
        box.getCenter(center);
        modelRoot.position.sub(center);
        var size = new THREE.Vector3();
        box.getSize(size);
        houseMaxDim = Math.max(size.x, size.y, size.z) || 10;
        box.setFromObject(modelRoot);
        var hemiY = box.min.y;
        var hx = Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
        var hz = Math.max(Math.abs(box.min.z), Math.abs(box.max.z));
        var hy = Math.max(0, box.max.y - hemiY);
        var hemiRadius = Math.sqrt(hx * hx + hy * hy + hz * hz) * 1.08;
        if (pointsMaterial) {
            pointsMaterial.uniforms.uHemiCenter.value.set(0, hemiY, 0);
            pointsMaterial.uniforms.uHemiRadius.value = hemiRadius;
            pointsMaterial.uniforms.uHemiCutY.value = hemiY;
        }
        var rimPts = [];
        var ri;
        for (ri = 0; ri <= 96; ri++) {
            var th = (ri / 96) * Math.PI * 2;
            rimPts.push(new THREE.Vector3(Math.cos(th) * hemiRadius, hemiY, Math.sin(th) * hemiRadius));
        }
        scene.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(rimPts),
            new THREE.LineBasicMaterial({
                color: COL_HOUSE,
                transparent: true,
                opacity: 0.2,
                depthWrite: false,
            })
        ));
        var dist = houseMaxDim * 0.6;
        camera.position.set(dist * 1.2, dist * 0.4, dist);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.target.set(0, 0, 0);
        controls.update();

        onResize();
        if (global.AeGlow) {
            aeGlow = new global.AeGlow(renderer);
            aeGlow.resize();
        }
        global.addEventListener('resize', onResize);
        global.addEventListener('pointermove', onMouseMove);
        animate();
        setPhaseLabel('生');
        setStatus('半球内游动 · 出界不显示');
        showSubtitle(LINE_LIFE);
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', function () {
            resetLife();
        });
    }
    if (modeLifeBtn) {
        modeLifeBtn.addEventListener('click', function () {
            setMode(false);
        });
    }
    if (modeCycleBtn) {
        modeCycleBtn.addEventListener('click', function () {
            setMode(true);
        });
    }

    function start() {
        if (!global.ThreeRegistry) {
            setStatus('ThreeRegistry 未加载');
            return;
        }
        setStatus('加载房屋…');
        if (global.SubtitleController) {
            global.SubtitleController.init(document.getElementById('subtitleLayer'));
        }
        global.ThreeRegistry.ensureR128().then(function () {
            global.ThreeRegistry.useR128();
            return loadModel();
        }).then(function (gltf) {
            setupScene(gltf);
        }).catch(function (err) {
            console.error('[SwimPreview]', err);
            setStatus('加载失败，请用本地 HTTP 打开');
        });
    }

    start();
})(window);
