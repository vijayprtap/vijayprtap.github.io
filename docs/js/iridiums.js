/*
 * Iridiums - pale iridescent liquid metal background.
 *
 * A WebGL2 full-screen fragment shader that derives a normal map from ridged
 * fractal noise, reflects it against an analytic "studio" room and tone maps
 * the result. This is a port of the component behind https://iridiums.framer.website/
 * so the About / Resume / Skills sections can carry that same surface.
 *
 * Vanilla on purpose - the page also loads Bootstrap 3 and 5 side by side, so
 * the jQuery plugin API is not safe to assume here.
 */
(function () {
	'use strict';

	var SELECTOR = '.fh5co-iridiums';
	var MAX_DPR = 1.5;
	var STILL_TIME = 47.4; // 0.79 (stillPoint) * 60, the reduced-motion frame

	// Uniform values as shipped on the reference page. All three colours are
	// pure white: the iridescence comes from per-channel reflection offsets
	// (dispersion), ACES highlight roll-off and a shallow relief, not a tint.
	var DEFAULTS = {
		scale: 0.7,
		relief: 0.2,
		strips: 6,
		polish: 1,
		lights: 0.95,
		dispersion: 0.11,
		fresnel: 0.7,
		exposure: 1.5,
		grain: 0.018,
		vignette: 0.16,
		angle: 0,
		speed: 0.65
	};

	var VERTEX_SRC = [
		'#version 300 es',
		'void main() {',
		'    vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));',
		'    gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);',
		'}'
	].join('\n');

	var FRAGMENT_SRC = [
		'#version 300 es',
		'precision highp float;',
		'out vec4 fragColor;',
		'uniform vec2 uRes;',
		'uniform float uTime;',
		'uniform vec3 uShadow;',
		'uniform vec3 uHighlight;',
		'uniform vec3 uTint;',
		'uniform float uAngle;',
		'uniform float uScale;',
		'uniform float uRelief;',
		'uniform float uStrips;',
		'uniform float uPolish;',
		'uniform float uLights;',
		'uniform float uDispersion;',
		'uniform float uFresnel;',
		'uniform float uExposure;',
		'uniform float uGrain;',
		'uniform float uVignette;',
		'',
		'vec2 hash22(vec2 p) {',
		'    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));',
		'    p3 += dot(p3, p3.yzx + 33.33);',
		'    return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);',
		'}',
		'',
		'float gnoise(vec2 p) {',
		'    vec2 i = floor(p);',
		'    vec2 f = fract(p);',
		'    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
		'    return mix(',
		'        mix(dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),',
		'            dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),',
		'        mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),',
		'            dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),',
		'        u.y',
		'    );',
		'}',
		'',
		'float ridged(vec2 q, float t) {',
		'    return gnoise(q * 1.00 + vec2(t * 0.045, t * 0.031)) * 0.60',
		'         + gnoise(q * 2.13 - vec2(t * 0.031, t * 0.052)) * 0.26',
		'         + gnoise(q * 4.37 + vec2(t * 0.062, 0.0)) * 0.14;',
		'}',
		'',
		'vec2 flowWarp(vec2 q, float t) {',
		'    return vec2(',
		'        gnoise(q * 0.72 + vec2(0.0, t * 0.075)),',
		'        gnoise(q * 0.72 + vec2(4.3, -t * 0.061))',
		'    );',
		'}',
		'',
		'float boxDist(vec2 p, vec2 halfSize) {',
		'    vec2 d = abs(p) - halfSize;',
		'    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);',
		'}',
		'',
		'vec3 studio(vec3 r, float edge) {',
		'    float el = r.y;',
		'    float down = clamp(-el, 0.0, 1.0);',
		'    vec3 floorCol = mix(uShadow * 1.12, uShadow * 0.58, smoothstep(0.0, 0.8, down));',
		'    float up = clamp(el, 0.0, 1.0);',
		'    vec3 skyCol = mix(uHighlight * 0.80, uHighlight, smoothstep(0.0, 0.75, up));',
		'    vec3 col = mix(floorCol, skyCol, smoothstep(-edge, edge, el));',
		'',
		'    float s = el * uStrips;',
		'    float tri = abs(fract(s) * 2.0 - 1.0);',
		'    float aa = max(edge * 1.5, fwidth(s) * 1.2);',
		'    float strip = smoothstep(0.62 - aa, 0.62 + aa, tri) * smoothstep(0.0, 0.22, el);',
		'    col += uHighlight * strip * uLights * 0.9;',
		'',
		'    float b1 = smoothstep(0.16, -0.01, boxDist(r.xy - vec2(-0.34, 0.46), vec2(0.30, 0.09)));',
		'    float b2 = smoothstep(0.22, -0.01, boxDist(r.xy - vec2(0.42, 0.16), vec2(0.16, 0.20)));',
		'    col += uHighlight * (b1 * 1.30 + b2 * 0.75) * uLights;',
		'',
		'    float hot = smoothstep(0.30, 0.0, length(r.xy - vec2(-0.12, 0.66)));',
		'    col += uHighlight * hot * hot * 1.7 * uLights;',
		'',
		'    return col;',
		'}',
		'',
		'vec3 tonemap(vec3 x) {',
		'    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;',
		'    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);',
		'}',
		'',
		'void main() {',
		'    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
		'    vec2 sp = p * uScale;',
		'    float t = uTime;',
		'',
		'    vec2 warped = sp + flowWarp(sp, t) * 0.85;',
		'',
		'    float d = 0.0035;',
		'    float h0 = ridged(warped, t);',
		'    float hx = ridged(warped + vec2(d, 0.0), t) - h0;',
		'    float hy = ridged(warped + vec2(0.0, d), t) - h0;',
		'',
		'    vec3 n = normalize(vec3(-hx / d * uRelief, -hy / d * uRelief, 1.0));',
		'',
		'    vec3 view = normalize(vec3(p * 0.55, 1.0));',
		'    vec3 r = reflect(-view, n);',
		'',
		'    float ca = cos(uAngle);',
		'    float sa = sin(uAngle);',
		'    r = vec3(r.x * ca - r.y * sa, r.x * sa + r.y * ca, r.z);',
		'',
		'    float edge = max(mix(0.09, 0.002, clamp(uPolish, 0.0, 1.0)), fwidth(r.y) * 0.4);',
		'',
		'    float dsp = uDispersion * 0.028;',
		'    vec3 envR = studio(normalize(r + vec3(0.0, dsp, 0.0)), edge);',
		'    vec3 envG = studio(r, edge);',
		'    vec3 envB = studio(normalize(r - vec3(0.0, dsp, 0.0)), edge);',
		'    vec3 env = vec3(envR.r, envG.g, envB.b);',
		'',
		'    float f = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 4.0);',
		'    env += uHighlight * f * uFresnel;',
		'',
		'    env *= uTint;',
		'',
		'    vec3 col = tonemap(env * uExposure);',
		'',
		'    col *= 1.0 - uVignette * dot(p, p);',
		'',
		'    col += hash22(gl_FragCoord.xy + fract(t) * 137.0).x * uGrain * 0.5;',
		'',
		'    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
		'}'
	].join('\n');

	var UNIFORMS = ['uRes', 'uTime', 'uShadow', 'uHighlight', 'uTint', 'uAngle',
		'uScale', 'uRelief', 'uStrips', 'uPolish', 'uLights', 'uDispersion',
		'uFresnel', 'uExposure', 'uGrain', 'uVignette'];

	function compile(gl, type, src) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			var log = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			return { error: log };
		}
		return { shader: shader };
	}

	// Builds one canvas: its own context (contexts cannot be shared between
	// canvases), but the program and uniform locations are cached per context.
	function createSurface(canvas, options) {
		var gl = canvas.getContext('webgl2', {
			antialias: false,
			alpha: false,
			powerPreference: 'low-power'
		});
		if (!gl) { return null; }

		var vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
		if (vs.error) { return null; }
		var fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
		if (fs.error) {
			gl.deleteShader(vs.shader);
			return null;
		}

		var program = gl.createProgram();
		gl.attachShader(program, vs.shader);
		gl.attachShader(program, fs.shader);
		gl.linkProgram(program);
		// The vertex shader is synthesised from gl_VertexID, so an empty VAO
		// still has to be bound for the draw call to be valid.
		gl.bindVertexArray(gl.createVertexArray());
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.deleteProgram(program);
			return null;
		}

		var locations = {};
		UNIFORMS.forEach(function (name) {
			locations[name] = gl.getUniformLocation(program, name);
		});

		var width = 0;
		var height = 0;

		// Setting canvas.width clears the drawing buffer, so this only runs
		// when the backing store actually needs to change - never per frame.
		function sync() {
			var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
			var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
			var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
			if (w === width && h === height) { return; }
			width = w;
			height = h;
			canvas.width = w;
			canvas.height = h;
		}

		function draw(time) {
			gl.viewport(0, 0, width, height);
			gl.useProgram(program);
			gl.uniform2f(locations.uRes, width, height);
			gl.uniform1f(locations.uTime, time);
			gl.uniform3f(locations.uShadow, 1, 1, 1);
			gl.uniform3f(locations.uHighlight, 1, 1, 1);
			gl.uniform3f(locations.uTint, 1, 1, 1);
			gl.uniform1f(locations.uAngle, options.angle);
			gl.uniform1f(locations.uScale, options.scale);
			gl.uniform1f(locations.uRelief, options.relief);
			gl.uniform1f(locations.uStrips, options.strips);
			gl.uniform1f(locations.uPolish, options.polish);
			gl.uniform1f(locations.uLights, options.lights);
			gl.uniform1f(locations.uDispersion, options.dispersion);
			gl.uniform1f(locations.uFresnel, options.fresnel);
			gl.uniform1f(locations.uExposure, options.exposure);
			gl.uniform1f(locations.uGrain, options.grain);
			gl.uniform1f(locations.uVignette, options.vignette);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		}

		return { gl: gl, program: program, sync: sync, draw: draw };
	}

	function start(canvas) {
		var surface = createSurface(canvas, DEFAULTS);
		// No WebGL2 (or a link failure): the section keeps its plain
		// background-colour, so the page still reads correctly.
		if (!surface) { canvas.remove(); return; }

		var speed = DEFAULTS.speed;
		var elapsed = 0;
		var last = 0;
		var running = false;
		var frame = 0;

		function paint(time) {
			surface.sync();
			surface.draw(time);
		}

		function tick(now) {
			// Guard against a 0 delta on the first frame after a visibility
			// change, otherwise uTime jumps on tab focus.
			if (last) { elapsed += (now - last) / 1000; }
			last = now;
			paint(elapsed * speed);
			frame = window.requestAnimationFrame(tick);
		}

		function play() {
			if (running) { return; }
			running = true;
			last = 0;
			frame = window.requestAnimationFrame(tick);
		}

		function pause() {
			if (!running) { return; }
			running = false;
			window.cancelAnimationFrame(frame);
			frame = 0;
		}

		paint(STILL_TIME);

		var resizeObserver = null;
		if (typeof window.ResizeObserver === 'function') {
			resizeObserver = new window.ResizeObserver(function () {
				paint(running ? elapsed * speed : STILL_TIME);
			});
			resizeObserver.observe(canvas);
		} else {
			window.addEventListener('resize', function () {
				paint(running ? elapsed * speed : STILL_TIME);
			});
		}

		var reduced = typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) { return; }

		// Only burn GPU while the section is actually on screen.
		if (typeof window.IntersectionObserver === 'function') {
			var visibility = new window.IntersectionObserver(function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) { play(); } else { pause(); }
				});
			}, { rootMargin: '200px' });
			visibility.observe(canvas);
		} else {
			play();
		}

		document.addEventListener('visibilitychange', function () {
			if (document.hidden) { pause(); } else { play(); }
		});
	}

	function init() {
		var canvases = document.querySelectorAll(SELECTOR);
		Array.prototype.forEach.call(canvases, start);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
