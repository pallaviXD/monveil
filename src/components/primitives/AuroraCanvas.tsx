import { useEffect, useRef } from 'react';

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

const FRAG = `
uniform float uTime;
uniform vec2 uRes;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(1.3, 0.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  uv.x *= uRes.x / uRes.y;
  float t = uTime * 0.12;

  vec2 q = vec2(fbm(uv + t * 0.4), fbm(uv + vec2(1.0)));
  vec2 r = vec2(fbm(uv + 1.7 * q + vec2(1.7, 9.2) + 0.15 * t),
                fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * t));
  float f = fbm(uv + r);

  // Cinematic indigo + violet palette
  vec3 col = mix(vec3(0.043, 0.043, 0.118),  // canvas-start #0b0b1e
                 vec3(0.071, 0.063, 0.169),   // canvas-end #12102b
                 clamp(f * f * 4.0, 0.0, 1.0));

  col = mix(col, vec3(0.302, 0.149, 0.647),  // violet #4D26A5
            clamp(length(q), 0.0, 1.0));

  col = mix(col, vec3(0.447, 0.247, 0.859),  // brand #7240DB
            clamp(length(r.x), 0.0, 1.0) * 0.45);

  // Top-center aurora glow
  float glow = smoothstep(0.65, 0.0, length(vUv - vec2(0.5, 0.85)));
  col += glow * vec3(0.18, 0.08, 0.38);

  // Keep it dark overall
  col = pow(col, vec3(1.6));
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}`;

export function AuroraCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return; // static fallback handled by parent

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,0,  1,-1,0,  -1,1,0,  1,1,0
    ]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uRes  = gl.getUniformLocation(prog, 'uRes');

    let raf = 0;
    let start = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas!.width  = canvas!.clientWidth  * dpr;
      canvas!.height = canvas!.clientHeight * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }

    function draw() {
      resize();
      const t = (performance.now() - start) / 1000;
      gl!.uniform1f(uTime, t);
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    }

    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      resize();
      const t = 0;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      draw();
    }

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
