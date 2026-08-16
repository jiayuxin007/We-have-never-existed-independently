/**
 * 噪声流场效果："Not Safe" by ZRNOF（改编自 OpenProcessing sketch 2027130）。
 * 挂载到父页同一文档内（约定与 js/model-morph-32s-embed.js 一致），不使用 iframe。
 * 已将原本分散的 tools.js / snoise4D.js / snoise4DImage.js / displace.js /
 * shaderSource.js / mySketch.js 合并进一个闭包，避免向全局作用域暴露
 * vert / frag / snoise4D / random 等标识符，防止与页面其他脚本冲突。
 *
 * opts: {
 *   container: HTMLElement,   必填，承载 canvas 的容器（建议全屏定位）
 *   gridResolution?: number,  可选，网格基准分辨率，默认 1280（越大点越密，越吃性能）
 *   trailAlpha?: number       可选，每帧黑色叠加清屏的不透明度，默认 0.1（拖尾感）；
 *                             叠加在其他内容上时建议传 0（完全透明清屏）
 * }
 * 返回: { dispose: function }
 */
window.mountNoiseFlowField = function (opts) {
    'use strict';
    if (!opts || !opts.container) {
        console.error('mountNoiseFlowField: opts.container required');
        return { dispose: function () {} };
    }
    if (typeof THREE === 'undefined') {
        console.error('mountNoiseFlowField: THREE.js not loaded');
        return { dispose: function () {} };
    }

    const container = opts.container;
    const trailAlpha = opts.trailAlpha != null ? opts.trailAlpha : 0.1;

    const random = function (min, max) {
        if (min === undefined) min = 0;
        if (max === undefined) max = 1;
        return Math.random() * (max - min) + min;
    };

    const snoise4D = `
	vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
	float permute(float x) { return mod289(((x*34.0)+10.0)*x); }
	vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
	float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

	vec4 grad4(float j, vec4 ip) {
		const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
		vec4 p,s;

		p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
		p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
		s = vec4(lessThan(p, vec4(0.0)));
		p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

		return p;
	}

	#define F4 0.309016994374947451

	float snoise(vec4 v) {
		const vec4  C = vec4( 0.138196601125011,
													0.276393202250021,
													0.414589803375032,
												-0.447213595499958);

		vec4 i  = floor(v + dot(v, vec4(F4)) );
		vec4 x0 = v -   i + dot(i, C.xxxx);

		vec4 i0;
		vec3 isX = step( x0.yzw, x0.xxx );
		vec3 isYZ = step( x0.zww, x0.yyz );
		
		i0.x = isX.x + isX.y + isX.z;
		i0.yzw = 1.0 - isX;

		i0.y += isYZ.x + isYZ.y;
		i0.zw += 1.0 - isYZ.xy;
		i0.z += isYZ.z;
		i0.w += 1.0 - isYZ.z;

		vec4 i3 = clamp( i0, 0.0, 1.0 );
		vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
		vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

		vec4 x1 = x0 - i1 + C.xxxx;
		vec4 x2 = x0 - i2 + C.yyyy;
		vec4 x3 = x0 - i3 + C.zzzz;
		vec4 x4 = x0 + C.wwww;

		i = mod289(i); 
		float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
		vec4 j1 = permute( permute( permute( permute (
							i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
						+ i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
						+ i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
						+ i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

		vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

		vec4 p0 = grad4(j0,   ip);
		vec4 p1 = grad4(j1.x, ip);
		vec4 p2 = grad4(j1.y, ip);
		vec4 p3 = grad4(j1.z, ip);
		vec4 p4 = grad4(j1.w, ip);

		vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;
		p4 *= taylorInvSqrt(dot(p4,p4));

		vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
		vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
		m0 = m0 * m0;
		m1 = m1 * m1;
		return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
								+ dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
	}
`;

    const snoise4DImage = `
	vec4 snoise4DImage(vec2 uv, float scal, float gain, float ofst, vec4 move) {
		uv *= scal;
		float R = snoise(vec4(uv, 100., 200.)+move);
		float G = snoise(vec4(uv, 300., 400.)+move);
		float B = snoise(vec4(uv, 500., 600.)+move);
		vec3 color = ofst+gain*vec3(R, G, B);
		return vec4(color, 1.);
	}

	vec4 snoise4DImage(vec2 uv, float scal, float gain, float ofst, float expo, vec4 move) {
		uv *= scal;
		float R = snoise(vec4(uv, 100., 200.)+move);
		float G = snoise(vec4(uv, 300., 400.)+move);
		float B = snoise(vec4(uv, 500., 600.)+move);
		vec3 col;
		col.r = pow(abs(R), expo)*(step(0., R)*2.-1.);
		col.g = pow(abs(G), expo)*(step(0., G)*2.-1.);
		col.b = pow(abs(B), expo)*(step(0., B)*2.-1.);
		return vec4(ofst+gain*col, 1.);
	}
`;

    const displace = `
	vec2 displace(vec2 uv, vec2 duv, float off, float wei) {
		duv -= off;
		return uv-duv*wei;
	}

	vec4 displace(vec2 uv, sampler2D img, vec2 duv, float off, float wei) {
		duv -= off;
		return texture(img, uv-duv*wei);
	}
`;

    const vert = `
	in vec3 position;
	in vec2 aTexCoord;
	
	uniform vec2 uRandomVec2;
	uniform float uTime;
	
	${snoise4D}
	${snoise4DImage}
	${displace}
	
	vec4 noise(vec2 uv, float scal, float gain, float ofst, float expo, vec4 move) {
    vec4 noise;
    noise  =     1.*snoise4DImage((uv-vec2(421., 132))*1., scal, gain, ofst, move);
    noise +=     .5*snoise4DImage((uv-vec2(913., 687))*2., scal, gain, ofst, move);
    noise +=    .25*snoise4DImage((uv-vec2(834., 724))*4., scal, gain, ofst, move);
    noise +=   .125*snoise4DImage((uv-vec2(125., 209))*8., scal, gain, ofst, move);
    noise +=  .0625*snoise4DImage((uv-vec2(387., 99))*16., scal, gain, ofst, move);
    noise /= 1.9375;
    return noise;
  }

	out vec2 vTexCoord;
	out vec2 vCol;
	void main() {
		vTexCoord = aTexCoord;
		vec2 pos = position.xy;
		float circle = smoothstep(1., .0, length(0.-pos));
		vec2 n = noise(pos, 2., 5., .5, 1., vec4(vec2(0.), vec2(cos(uTime*.5), sin(uTime*.5))+uRandomVec2)).rg*circle;
		vec2 dpos = displace(pos, n, .5, .2*circle);
		vCol = n.rg*noise(pos*1000., 1., 1., .5, 1., vec4(0.)).r;
		gl_Position = vec4(dpos, 0., 1.);
		gl_PointSize = 2.0;
	}
`;

    const frag = `
	precision mediump float;

	in vec2 vTexCoord;
	in vec2 vCol;

	out vec4 fragColor;
	void main() {
		vec2 uv = vTexCoord;
		fragColor = vec4(vCol.rrr, 1.);
	}
`;

    const BASE = opts.gridResolution || 1280;
    const cols = BASE / 2;
    const rows = BASE / 2;
    const xOff = 2 / cols, yOff = 2 / rows;
    const uOff = 1 / cols, vOff = 1 / rows;

    let renderer, scene, camera, geometry, material, pointsMesh;
    let rafId = 0;
    let time = 0;
    let canvas;

    function updateSize() {
        const size = Math.min(window.innerWidth, window.innerHeight);
        renderer.setSize(size, size);
    }

    function onResize() {
        updateSize();
    }

    function animate() {
        rafId = requestAnimationFrame(animate);
        time += 0.02;
        material.uniforms.uTime.value = time;

        renderer.setClearColor(0x000000, trailAlpha);
        renderer.clear();
        renderer.render(scene, camera);
    }

    function dispose() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        window.removeEventListener('resize', onResize);
        if (renderer) {
            try {
                renderer.dispose();
                if (typeof renderer.forceContextLoss === 'function') {
                    renderer.forceContextLoss();
                }
                if (canvas && canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
            } catch (e) {}
        }
        if (geometry) geometry.dispose();
        if (material) material.dispose();
    }

    function init() {
        const positionData = [];
        const texCoordData = [];

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = -1 + xOff * col + 1 / cols;
                const y = 1 - yOff * row - 1 / rows;
                positionData.push(x, y, 0);
                texCoordData.push((col + 1 / cols) * uOff);
                texCoordData.push((row + 1 / rows) * vOff);
            }
        }

        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionData, 3));
        geometry.setAttribute('aTexCoord', new THREE.Float32BufferAttribute(texCoordData, 2));
        geometry.computeBoundingSphere();

        material = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uRandomVec2: { value: new THREE.Vector2(random(0, 300), random(0, 300)) },
                uTime: { value: 0 }
            },
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        pointsMesh = new THREE.Points(geometry, material);
        pointsMesh.frustumCulled = false;

        scene = new THREE.Scene();
        scene.add(pointsMesh);

        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.position = 'fixed';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.pointerEvents = 'none';
        container.appendChild(canvas);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        updateSize();
        if (renderer.debug) renderer.debug.checkShaderErrors = true;

        window.addEventListener('resize', onResize);

        animate();
    }

    init();
    return { dispose: dispose };
};
