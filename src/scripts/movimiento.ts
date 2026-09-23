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

    // Una rueda avanza una pantalla de toda la portada: entrada, introducción,
    // cada cota y ensayos. El objetivo se conserva durante la transición para
    // que los giros consecutivos no tengan que esperar a la animación anterior.
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
    let objetivo = 0;
    let ultimoPaso = 0;
    let acumulado = 0;
    const avanzar = (evento: WheelEvent) => {
      if (evento.ctrlKey || evento.defaultPrevented || evento.deltaY === 0) return;
      if (evento.target instanceof Element && evento.target.closest('dialog, [data-scroll-libre]')) return;
      evento.preventDefault();
      // Lenis no consulta defaultPrevented: si recibe esta misma rueda, suma
      // su delta al salto y la página acaba entre dos pantallas.
      evento.stopImmediatePropagation();
      const ahora = performance.now();
      const destinos = anclas();
      if (ahora - ultimoPaso > 420) {
        objetivo = destinos.reduce((mejor, valor, i) =>
          Math.abs(valor - window.scrollY) < Math.abs(destinos[mejor] - window.scrollY) ? i : mejor, 0);
        acumulado = 0;
      }
      const delta = evento.deltaY * (evento.deltaMode === 1 ? 16 : evento.deltaMode === 2 ? window.innerHeight : 1);
      acumulado = Math.sign(delta) === Math.sign(acumulado) ? acumulado + delta : delta;
      if (Math.abs(acumulado) < 70) return;
      acumulado = 0;
      objetivo = Math.max(0, Math.min(destinos.length - 1, objetivo + Math.sign(delta)));
      ultimoPaso = ahora;
      lenis.scrollTo(destinos[objetivo], { duration: 0.32 });
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

/* Red de seguridad: si algo falla, el contenido nunca se queda invisible */
window.setTimeout(() => {
  if (!window.__movimientoListo) rendirse();
}, 2500);
