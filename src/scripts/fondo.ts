import { Renderer, Triangle, Program, Mesh } from 'ogl';

const vertex = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;

uniform float uTiempo;
uniform vec2 uResolucion;
uniform vec2 uRaton;
uniform float uScroll;
uniform vec3 uColor;
uniform vec3 uAcento;
uniform float uFuerza;

varying vec2 vUv;

float rejilla(vec2 p, float ancho) {
  vec2 g = abs(fract(p) - 0.5);
  float l = min(g.x, g.y);
  return 1.0 - smoothstep(0.0, ancho, l);
}

vec2 deformar(vec2 p) {
  vec2 d = p - uRaton;
  float r2 = dot(d, d);
  p += d * 0.34 * exp(-r2 * 6.0);
  float t = uTiempo * 0.07;
  p += 0.03 * vec2(sin(p.y * 1.7 + t), cos(p.x * 1.5 - t * 1.2));
  return p;
}

void main() {
  float aspecto = uResolucion.x / max(uResolucion.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspecto, 1.0);
  vec2 p = deformar(uv);

  float escala = mix(8.0, 11.5, uScroll);
  float pixel = escala / max(uResolucion.y, 1.0);

  float fina = rejilla(p * escala, pixel * 1.6);
  float gruesa = rejilla(p * escala * 0.25, pixel * 0.5);
  float lineas = max(fina * 0.32, gruesa * 0.9);

  vec2 haciaRaton = uv - uRaton;
  float cerca = exp(-dot(haciaRaton, haciaRaton) * 3.5);

  vec3 color = mix(uColor, uAcento, cerca * 0.6);
  float vinieta = 1.0 - smoothstep(0.3, 1.1, length(uv));
  float alfa = lineas * uFuerza * mix(0.28, 1.0, vinieta) * (0.5 + 0.7 * cerca);

  gl_FragColor = vec4(color, clamp(alfa, 0.0, 1.0));
}
`;

function aRgb(valor: string): [number, number, number] {
  const hex = valor.trim();
  const corto = hex.length === 4;
  const n = parseInt(corto ? hex.slice(1).replace(/./g, (c) => c + c) : hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function montarFondo(canvas: HTMLCanvasElement): (() => void) | undefined {
  let renderer: Renderer;
  try {
    renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.75),
      powerPreference: 'low-power',
    });
  } catch {
    return;
  }

  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const estilo = getComputedStyle(document.documentElement);

  const program = new Program(gl, {
    vertex,
    fragment,
    transparent: true,
    depthTest: false,
    uniforms: {
      uTiempo: { value: 0 },
      uResolucion: { value: [1, 1] },
      uRaton: { value: [0, 0] },
      uScroll: { value: 0 },
      uColor: { value: aRgb(estilo.getPropertyValue('--malla') || '#f2f3f5') },
      uAcento: { value: aRgb(estilo.getPropertyValue('--acento') || '#6ee7ff') },
      uFuerza: { value: parseFloat(estilo.getPropertyValue('--malla-fuerza')) || 0.3 },
    },
  });

  const malla = new Mesh(gl, { geometry: new Triangle(gl), program });

  const leerTema = () => {
    const s = getComputedStyle(document.documentElement);
    program.uniforms.uColor.value = aRgb(s.getPropertyValue('--malla') || '#f2f3f5');
    program.uniforms.uAcento.value = aRgb(s.getPropertyValue('--acento') || '#6ee7ff');
    program.uniforms.uFuerza.value = parseFloat(s.getPropertyValue('--malla-fuerza')) || 0.3;
  };

  const objetivo = { x: 0, y: 0 };
  const actual = { x: 0, y: 0 };

  const redimensionar = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    program.uniforms.uResolucion.value = [gl.canvas.width, gl.canvas.height];
  };

  const mover = (e: PointerEvent) => {
    const aspecto = window.innerWidth / window.innerHeight;
    objetivo.x = (e.clientX / window.innerWidth - 0.5) * aspecto;
    objetivo.y = 0.5 - e.clientY / window.innerHeight;
  };

  let bucle = 0;
  let visible = true;
  const inicio = performance.now();

  const dibujar = (ahora: number) => {
    bucle = requestAnimationFrame(dibujar);
    if (!visible) return;

    actual.x += (objetivo.x - actual.x) * 0.045;
    actual.y += (objetivo.y - actual.y) * 0.045;

    const alto = document.documentElement.scrollHeight - window.innerHeight;
    program.uniforms.uScroll.value = alto > 0 ? Math.min(window.scrollY / alto, 1) : 0;
    program.uniforms.uRaton.value = [actual.x, actual.y];
    program.uniforms.uTiempo.value = (ahora - inicio) / 1000;

    renderer.render({ scene: malla });
  };

  const alCambiarVisibilidad = () => {
    visible = !document.hidden;
  };

  redimensionar();
  window.addEventListener('resize', redimensionar, { passive: true });
  window.addEventListener('pointermove', mover, { passive: true });
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  consulta.addEventListener('change', leerTema);
  const observador = new MutationObserver(leerTema);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });

  bucle = requestAnimationFrame(dibujar);
  canvas.classList.add('visible');

  return () => {
    cancelAnimationFrame(bucle);
    window.removeEventListener('resize', redimensionar);
    window.removeEventListener('pointermove', mover);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    consulta.removeEventListener('change', leerTema);
    observador.disconnect();
  };
}
