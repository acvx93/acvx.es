type Punto = [number, number, number];
type Fragmento = {
  centro: Punto;
  vertices: Punto[];
  giro: Punto;
  velocidad: number;
  fase: number;
  material: number;
};
type Sprite = { pieza: Fragmento; imagen: HTMLCanvasElement; lado: number };

// Presupuesto independiente de la resolución física del monitor.
const MAX_PIXELES = 640_000;
const MAX_LADO_SPRITE = 192;
const FPS = 20;

function rotar([x, y, z]: Punto, [a, b, c]: Punto): Punto {
  const y1 = y * Math.cos(a) - z * Math.sin(a);
  const z1 = y * Math.sin(a) + z * Math.cos(a);
  const x2 = x * Math.cos(b) + z1 * Math.sin(b);
  return [x2 * Math.cos(c) - y1 * Math.sin(c), x2 * Math.sin(c) + y1 * Math.cos(c), -x * Math.sin(b) + z1 * Math.cos(b)];
}

export function montarFondo(canvas: HTMLCanvasElement): (() => void) | undefined {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // Misma semilla y composición. Las caras y los desenfoques se rasterizan
  // una sola vez en superficies pequeñas, nunca en el bucle de animación.
  let semilla = 89105;
  const azar = () => {
    semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0;
    return semilla / 4294967296;
  };
  const fragmentos = Array.from({ length: 210 }, (_, i): Fragmento => {
    const recorrido = azar() * 2 - 1;
    const dispersion = Math.pow(azar(), 1.8);
    const angulo = azar() * Math.PI * 2;
    const cercano = i > 197;
    const tamano = (0.012 + Math.pow(azar(), 2) * 0.057) * (cercano ? 2.2 : 1);
    const lados = 3 + Math.floor(azar() * 3);
    const vertices: Punto[] = Array.from({ length: lados }, (_, j) => {
      const a = (j / lados) * Math.PI * 2;
      const radio = tamano * (0.5 + azar());
      return [Math.cos(a) * radio, Math.sin(a) * radio * (0.35 + azar()), (azar() - 0.5) * tamano];
    });
    return {
      centro: [Math.sin(recorrido * 2.5) * 0.11 + Math.cos(angulo) * dispersion * 0.35,
        recorrido * 0.65 + Math.sin(angulo) * dispersion * 0.24,
        cercano ? 1.5 + azar() * 0.5 : -1.4 + azar() * 2.1],
      vertices, giro: [azar() * 6, azar() * 6, azar() * 6],
      velocidad: (0.025 + azar() * 0.055) * (azar() > 0.5 ? 1 : -1),
      fase: azar() * Math.PI * 2, material: azar(),
    };
  }).sort((a, b) => a.centro[2] - b.centro[2]);

  const tema = window.matchMedia('(prefers-color-scheme: dark)');
  const movimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ambiente = document.createElement('canvas');
  let sprites: Sprite[] = [];
  let oscuro = true, ancho = 1, alto = 1, resolucion = 1, tiempo = 0;
  let raf = 0, temporizador = 0, cambioTamano = 0, ultimo = 0;
  let intervalo = 1000 / FPS, destruido = false;
  const raton = { x: 0, y: 0, destinoX: 0, destinoY: 0 };
  const escala = () => Math.min(ancho, alto * 1.3);
  const origenX = () => ancho * (ancho < 700 ? 0.74 : 0.78);

  function atenuacion(x: number) {
    // En móvil la nube entra en pantalla y conserva contraste propio:
    // no se multiplica otra vez por una opacidad global casi invisible.
    const paradas = ancho < 700
      ? [[0, 0.06], [0.48, 0.2], [0.66, 0.55], [0.82, 0.8], [1, 0.55]]
      : [[0, 0.035], [0.48, 0.065], [0.66, 0.3], [0.82, 0.95], [1, 0.5]];
    const posicion = Math.max(0, Math.min(1, x / ancho));
    for (let i = 1; i < paradas.length; i++) {
      const a = paradas[i - 1], b = paradas[i];
      if (posicion <= b[0]) {
        const mezcla = (posicion - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * mezcla;
      }
    }
    return 0;
  }

  function preparar() {
    const medida = escala();
    sprites = fragmentos.flatMap((pieza, i): Sprite[] => {
      if (ancho < 700 && i % 2) return [];
      const z = pieza.centro[2], perspectiva = 3.4 / (3.4 - z);
      const puntos = pieza.vertices.map(v => rotar(v, pieza.giro).map(n => n * medida * perspectiva));
      const blur = z > 1.4 ? 3 + (z - 1.4) * 5 : z < -0.65 ? 1.2 : 0;
      const radio = Math.max(...puntos.map(p => Math.hypot(p[0], p[1])));
      const lado = Math.ceil((radio + blur * 3 + 2) * 2);
      const imagen = document.createElement('canvas');
      imagen.width = imagen.height = Math.max(2, Math.min(MAX_LADO_SPRITE, Math.ceil(lado * resolucion)));
      const s = imagen.getContext('2d');
      if (!s) return [];
      const proporcion = imagen.width / lado;
      s.scale(proporcion, proporcion);
      s.translate(lado / 2, lado / 2);
      for (let j = 0; j < puntos.length; j++) {
        const a = puntos[j], b = puntos[(j + 1) % puntos.length];
        const brillo = 0.5 + 0.5 * Math.sin(pieza.giro[1] + j * 1.9 + pieza.fase);
        const negra = pieza.material < 0.46, azul = pieza.material > 0.985;
        const color = oscuro
          ? (azul ? '70,99,109' : negra ? '8,0,0' : brillo > 0.88 ? '245,163,5' : brillo > 0.58 ? '232,145,5' : '74,39,0')
          : (azul ? '103,122,127' : negra ? '94,68,40' : brillo > 0.65 ? '232,145,5' : '150,107,51');
        const alfa = oscuro ? (negra ? 0.78 : 0.13 + brillo * 0.2)
          : ancho < 700 ? 0.12 + brillo * 0.16 : 0.055 + brillo * 0.085;
        s.beginPath();
        s.moveTo(0, 0);
        s.lineTo(a[0], a[1]);
        s.lineTo(b[0], b[1]);
        s.closePath();
        s.fillStyle = `rgba(${color},${alfa})`;
        s.fill();
        if (!negra && brillo > 0.86 && !blur) {
          s.beginPath(); s.moveTo(a[0], a[1]); s.lineTo(b[0], b[1]);
          s.strokeStyle = oscuro ? 'rgba(245,163,5,0.28)' : 'rgba(150,107,51,0.16)';
          s.lineWidth = 0.55; s.stroke();
        }
      }
      if (!blur) return [{ pieza, imagen, lado }];
      const difuminada = document.createElement('canvas');
      difuminada.width = difuminada.height = imagen.width;
      const filtro = difuminada.getContext('2d');
      if (!filtro) return [{ pieza, imagen, lado }];
      filtro.filter = `blur(${blur * proporcion}px)`;
      filtro.drawImage(imagen, 0, 0);
      return [{ pieza, imagen: difuminada, lado }];
    });

    // La luz y su máscara también quedan en caché hasta cambiar tamaño/tema.
    ambiente.width = canvas.width;
    ambiente.height = canvas.height;
    const luzCtx = ambiente.getContext('2d');
    if (!luzCtx) return;
    luzCtx.scale(resolucion, resolucion);
    luzCtx.save();
    luzCtx.translate(origenX(), alto * 0.48);
    luzCtx.scale(0.54, 1);
    const luz = luzCtx.createRadialGradient(0, 0, 0, 0, 0, alto * 0.64);
    luz.addColorStop(0, oscuro ? 'rgba(232,145,5,0.12)' : 'rgba(245,163,5,0.10)');
    luz.addColorStop(0.5, oscuro ? 'rgba(74,39,0,0.16)' : 'rgba(232,145,5,0.045)');
    luz.addColorStop(1, 'rgba(74,39,0,0)');
    luzCtx.fillStyle = luz;
    luzCtx.fillRect(-alto, -alto, alto * 2, alto * 2);
    luzCtx.restore();
    const velo = luzCtx.createLinearGradient(0, 0, ancho, 0);
    for (const posicion of [0, 0.48, 0.66, 0.82, 1]) {
      velo.addColorStop(posicion, `rgba(0,0,0,${atenuacion(posicion * ancho)})`);
    }
    luzCtx.globalCompositeOperation = 'destination-in';
    luzCtx.fillStyle = velo;
    luzCtx.fillRect(0, 0, ancho, alto);
  }

  function dibujar() {
    if (!ctx || destruido) return;
    ctx.setTransform(resolucion, 0, 0, resolucion, 0, 0);
    ctx.clearRect(0, 0, ancho, alto);
    ctx.drawImage(ambiente, 0, 0, ancho, alto);
    const medida = escala();
    for (const { pieza, imagen, lado } of sprites) {
      const z = pieza.centro[2], perspectiva = 3.4 / (3.4 - z);
      const x = origenX() + (pieza.centro[0] + Math.sin(tiempo * 0.24 + pieza.fase) * 0.02 + raton.x * 0.016 * z) * medida * perspectiva;
      const y = alto * 0.48 + (pieza.centro[1] + Math.cos(tiempo * 0.2 + pieza.fase) * 0.022 + raton.y * 0.012 * z) * medida * perspectiva;
      if (x + lado < 0 || x - lado > ancho || y + lado < 0 || y - lado > alto) continue;
      ctx.save();
      ctx.globalAlpha = atenuacion(x);
      ctx.translate(x, y);
      ctx.rotate(tiempo * pieza.velocidad * 0.9);
      // Giro y escorzo suaves sobre la textura ya iluminada.
      ctx.scale(0.85 + 0.15 * Math.cos(tiempo * pieza.velocidad * 1.8 + pieza.fase), 1);
      ctx.drawImage(imagen, -lado / 2, -lado / 2, lado, lado);
      ctx.restore();
    }
  }

  function parar() {
    cancelAnimationFrame(raf);
    window.clearTimeout(temporizador);
  }
  function animar(ahora: number) {
    if (destruido || document.hidden || movimiento.matches) return;
    tiempo += Math.min((ahora - ultimo) / 1000, 0.1);
    ultimo = ahora;
    raton.x += (raton.destinoX - raton.x) * 0.09;
    raton.y += (raton.destinoY - raton.y) * 0.09;
    const inicio = performance.now();
    dibujar();
    const coste = performance.now() - inicio;
    if (coste > 10) intervalo = 1000 / 12;
    // Sin callback a cada refresco del monitor (60/144/240 Hz).
    temporizador = window.setTimeout(() => {
      raf = requestAnimationFrame(animar);
    }, Math.max(0, intervalo - coste));
  }
  function reanudar() {
    parar();
    if (destruido || document.hidden) return;
    ultimo = performance.now();
    dibujar();
    if (!movimiento.matches) temporizador = window.setTimeout(() => {
      raf = requestAnimationFrame(animar);
    }, intervalo);
  }
  function leerTema() {
    const nuevo = (document.documentElement.dataset.tema ?? (tema.matches ? 'dark' : 'light')) === 'dark';
    if (nuevo === oscuro && sprites.length) return;
    oscuro = nuevo;
    preparar();
    reanudar();
  }
  function redimensionar() {
    const nuevoAncho = canvas.clientWidth, nuevoAlto = canvas.clientHeight;
    if (nuevoAncho === ancho && nuevoAlto === alto) return;
    ancho = nuevoAncho;
    alto = nuevoAlto;
    resolucion = Math.min(1, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELES / (ancho * alto)));
    canvas.width = Math.max(1, Math.floor(ancho * resolucion));
    canvas.height = Math.max(1, Math.floor(alto * resolucion));
    intervalo = 1000 / FPS;
    preparar();
    reanudar();
  }
  function alRedimensionar() {
    // La barra de direcciones y el teclado cambian innerHeight al deslizar.
    // El lienzo usa lvh: solo regeneramos texturas si cambia su tamaño real.
    if (canvas.clientWidth === ancho && canvas.clientHeight === alto) return;
    window.clearTimeout(cambioTamano);
    cambioTamano = window.setTimeout(redimensionar, 120);
  }
  function mover(evento: PointerEvent) {
    if (evento.pointerType !== 'mouse') return;
    raton.destinoX = evento.clientX / ancho - 0.5;
    raton.destinoY = evento.clientY / alto - 0.5;
  }
  function destruir() {
    if (destruido) return;
    destruido = true;
    parar();
    window.clearTimeout(cambioTamano);
    window.removeEventListener('resize', alRedimensionar);
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pagehide', alSalir);
    window.removeEventListener('pageshow', reanudar);
    document.removeEventListener('visibilitychange', reanudar);
    movimiento.removeEventListener('change', reanudar);
    tema.removeEventListener('change', leerTema);
    observador.disconnect();
    sprites = [];
    ambiente.width = ambiente.height = 0;
  }
  function alSalir(evento: PageTransitionEvent) {
    if (evento.persisted) parar();
    else destruir();
  }
  const observador = new MutationObserver(leerTema);
  oscuro = (document.documentElement.dataset.tema ?? (tema.matches ? 'dark' : 'light')) === 'dark';
  redimensionar();
  canvas.classList.add('visible');
  window.addEventListener('resize', alRedimensionar, { passive: true });
  window.addEventListener('pointermove', mover, { passive: true });
  window.addEventListener('pagehide', alSalir);
  window.addEventListener('pageshow', reanudar);
  document.addEventListener('visibilitychange', reanudar);
  movimiento.addEventListener('change', reanudar);
  tema.addEventListener('change', leerTema);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  return destruir;
}
