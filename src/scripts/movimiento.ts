import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

declare global {
  interface Window {
    __movimientoListo?: boolean;
  }
}

const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const raiz = document.documentElement;

// También se dibuja una composición estática con movimiento reducido.
const lienzo = document.querySelector<HTMLCanvasElement>('.lienzo');
if (lienzo) {
  import('./fondo').then((modulo) => modulo.montarFondo(lienzo)).catch(() => undefined);
}

function rendirse() {
  raiz.classList.remove('js-listo');
  window.__movimientoListo = true;
}

if (quieto) {
  rendirse();
} else {
  try {
    arrancar();
  } catch {
    rendirse();
  }
}

function arrancar() {
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ duration: 0.55, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((tiempo) => lenis.raf(tiempo * 1000));
  gsap.ticker.lagSmoothing(0);

  const curva = 'power3.out';

  /* Entrada: el nombre se entinta */
  const nombre = document.querySelector<HTMLElement>('.nombre');
  if (nombre) {
    const linea = gsap.timeline({ delay: 0.08 });
    linea
      .to(nombre.querySelectorAll('.mascara > i'), {
        y: '0%',
        duration: 0.65,
        ease: curva,
        stagger: 0.05,
      })
      .to(
        nombre,
        { '--rond': 0, '--peso': 700, duration: 0.8, ease: 'power2.inOut' },
        0.08,
      );
  }

  /* Revelados generales */
  const revelables = gsap.utils.toArray<HTMLElement>('.revelar');
  revelables.forEach((elemento) => {
    const comun = { opacity: 1, y: 0, duration: 0.5, ease: curva };
    const yaVisible = elemento.getBoundingClientRect().top < window.innerHeight;

    if (yaVisible) {
      gsap.to(elemento, { ...comun, delay: Number(elemento.dataset.retardo || 0) });
      return;
    }

    gsap.to(elemento, {
      ...comun,
      scrollTrigger: { trigger: elemento, start: 'top 92%', once: true },
    });
  });

  /* Trayectoria: se fija y las cotas avanzan de una en una */
  const trayectoria = document.querySelector<HTMLElement>('[data-trayectoria]');
  const escena = trayectoria?.querySelector<HTMLElement>('[data-escena]');
  const introduccion = escena?.querySelector<HTMLElement>('[data-introduccion]');
  const cotas = escena ? Array.from(escena.querySelectorAll<HTMLElement>('[data-cota]')) : [];
  const marcas = escena ? Array.from(escena.querySelectorAll<HTMLElement>('[data-marca]')) : [];

  if (trayectoria && escena && cotas.length > 1 && window.innerWidth >= 900) {
    trayectoria.classList.add('trayectoria--fijada');

    let activa = -1;
    const activar = (indice: number) => {
      if (indice === activa) return;
      activa = indice;
      introduccion?.toggleAttribute('data-activa', indice === 0);
      cotas.forEach((cota, i) => cota.toggleAttribute('data-activa', i === indice - 1));
      marcas.forEach((marca, i) => marca.toggleAttribute('data-activa', i < indice));
    };
    activar(0);

    const etapas = cotas.length + 1;

    const disparador = ScrollTrigger.create({
      trigger: escena,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (etapas - 1),
      pin: true,
      pinSpacing: true,
      scrub: 0.1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const indice = Math.min(etapas - 1, Math.round(self.progress * (etapas - 1)));
        activar(Math.max(0, indice));
      },
    });

    // Un gesto avanza una pantalla de toda la portada: entrada, introducción,
    // cada cota y ensayos. Reproduce el módulo de rueda de Swiper con los
    // parámetros de la portada de zarahome.com (vertical, speed 400, curva
    // ease): solo cuenta como gesto nuevo el evento que crece, cambia de
    // sentido o llega tras 150 ms de pausa, así la inercia del panel táctil
    // no encadena saltos. Durante la transición se ignora la rueda.
    const ensayos = trayectoria.nextElementSibling as HTMLElement | null;
    const anclas = () => {
      const maximo = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const paso = (disparador.end - disparador.start) / (etapas - 1);
      const destinos = [0, ...Array.from({ length: etapas }, (_, i) => disparador.start + paso * i)];
      if (ensayos) destinos.push(window.scrollY + ensayos.getBoundingClientRect().top);
      destinos.push(maximo);
      return destinos.map((valor) => Math.min(maximo, Math.max(0, valor)))
        .filter((valor, i, lista) => i === 0 || valor - lista[i - 1] > 80);
    };
    const VELOCIDAD = 0.4;
    const ease = curvaBezier(0.25, 0.1, 0.25, 1);
    let animando = false;
    let finAnimacion = 0;
    let ultimoIntento = 0;
    let recientes: { tiempo: number; delta: number; sentido: number }[] = [];

    const saltar = (sentido: number) => {
      const destinos = anclas();
      const actual = destinos.reduce((mejor, valor, i) =>
        Math.abs(valor - window.scrollY) < Math.abs(destinos[mejor] - window.scrollY) ? i : mejor, 0);
      const siguiente = Math.max(0, Math.min(destinos.length - 1, actual + sentido));
      if (siguiente === actual) return;
      animando = true;
      const terminar = () => {
        animando = false;
        window.clearTimeout(finAnimacion);
      };
      // Seguro por si Lenis no llega a avisar del final.
      finAnimacion = window.setTimeout(terminar, VELOCIDAD * 1000 + 150);
      lenis.scrollTo(destinos[siguiente], { duration: VELOCIDAD, easing: ease, onComplete: terminar });
    };

    const intentar = (evento: { tiempo: number; delta: number; sentido: number }) => {
      if (evento.delta >= 6 && evento.tiempo - ultimoIntento < 60) return;
      if (!animando) saltar(evento.sentido);
      ultimoIntento = evento.tiempo;
    };

    const avanzar = (evento: WheelEvent) => {
      if (evento.ctrlKey || evento.defaultPrevented) return;
      if (evento.target instanceof Element && evento.target.closest('dialog, [data-scroll-libre]')) return;
      evento.preventDefault();
      // Lenis no consulta defaultPrevented: si recibe esta misma rueda, suma
      // su delta al salto y la página acaba entre dos pantallas.
      evento.stopImmediatePropagation();

      const escala = evento.deltaMode === 1 ? 40 : evento.deltaMode === 2 ? 800 : 1;
      // Con mayúsculas la rueda vertical llega como horizontal, igual que en Swiper.
      const cambiado = evento.shiftKey && !evento.deltaX;
      const x = (cambiado ? evento.deltaY : evento.deltaX) * escala;
      const y = (cambiado ? 0 : evento.deltaY) * escala;
      const delta = Math.abs(x) > Math.abs(y) ? x : y;
      if (delta === 0) return;

      const nuevo = { tiempo: performance.now(), delta: Math.abs(delta), sentido: Math.sign(delta) };
      const previo = recientes[recientes.length - 1];
      recientes = [...recientes.slice(-1), nuevo];
      if (
        !previo ||
        nuevo.sentido !== previo.sentido ||
        nuevo.delta > previo.delta ||
        nuevo.tiempo > previo.tiempo + 150
      ) {
        intentar(nuevo);
      }
    };
    window.addEventListener('wheel', avanzar, { capture: true, passive: false });
  } else if (cotas.length) {
    cotas.forEach((cota, i) => {
      gsap.from(cota, {
        opacity: 0,
        y: 28,
        duration: 0.5,
        ease: curva,
        delay: i * 0.04,
        scrollTrigger: { trigger: cota, start: 'top 88%', once: true },
      });
    });
  }

  /* Barra de progreso de lectura */
  const progreso = document.querySelector<HTMLElement>('.progreso');
  const articulo = document.querySelector<HTMLElement>('.prosa');
  if (progreso && articulo) {
    gsap.to(progreso, {
      width: '100%',
      ease: 'none',
      scrollTrigger: { trigger: articulo, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    });
  }

  window.__movimientoListo = true;
  ScrollTrigger.refresh();
}

/* Curva cúbica de CSS como función de Lenis, resuelta por Newton y bisección */
function curvaBezier(x1: number, y1: number, x2: number, y2: number) {
  const coordenada = (t: number, a: number, b: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const pendiente = (t: number, a: number, b: number) =>
    3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = pendiente(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      t -= (coordenada(t, x1, x2) - x) / d;
    }
    if (t < 0 || t > 1 || Math.abs(coordenada(t, x1, x2) - x) > 1e-4) {
      let bajo = 0;
      let alto = 1;
      t = x;
      for (let i = 0; i < 30; i++) {
        if (coordenada(t, x1, x2) < x) bajo = t;
        else alto = t;
        t = (bajo + alto) / 2;
      }
    }
    return coordenada(t, y1, y2);
  };
}

/* Red de seguridad: si algo falla, el contenido nunca se queda invisible */
window.setTimeout(() => {
  if (!window.__movimientoListo) rendirse();
}, 2500);
