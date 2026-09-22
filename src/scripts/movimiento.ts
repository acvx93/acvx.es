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

  const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((tiempo) => lenis.raf(tiempo * 1000));
  gsap.ticker.lagSmoothing(0);

  const curva = 'power3.out';

  /* Entrada: el nombre se entinta */
  const nombre = document.querySelector<HTMLElement>('.nombre');
  if (nombre) {
    const linea = gsap.timeline({ delay: 0.25 });
    linea
      .to(nombre.querySelectorAll('.mascara > i'), {
        y: '0%',
        duration: 1.15,
        ease: curva,
        stagger: 0.09,
      })
      .to(
        nombre,
        { '--rond': 0, '--peso': 700, duration: 1.5, ease: 'power2.inOut' },
        0.25,
      );
  }

  /* Revelados generales */
  const revelables = gsap.utils.toArray<HTMLElement>('.revelar');
  revelables.forEach((elemento) => {
    const comun = { opacity: 1, y: 0, duration: 0.95, ease: curva };
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
  const cotas = escena ? Array.from(escena.querySelectorAll<HTMLElement>('[data-cota]')) : [];
  const marcas = escena ? Array.from(escena.querySelectorAll<HTMLElement>('[data-marca]')) : [];

  if (trayectoria && escena && cotas.length > 1 && window.innerWidth >= 900) {
    trayectoria.classList.add('trayectoria--fijada');

    let activa = -1;
    const activar = (indice: number) => {
      if (indice === activa) return;
      activa = indice;
      cotas.forEach((cota, i) => cota.toggleAttribute('data-activa', i === indice));
      marcas.forEach((marca, i) => marca.toggleAttribute('data-activa', i <= indice));
    };
    activar(0);

    ScrollTrigger.create({
      trigger: escena,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (cotas.length - 0.35),
      pin: true,
      pinSpacing: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const indice = Math.min(cotas.length - 1, Math.floor(self.progress * cotas.length));
        activar(Math.max(0, indice));
      },
    });
  } else if (cotas.length) {
    cotas.forEach((cota, i) => {
      gsap.from(cota, {
        opacity: 0,
        y: 28,
        duration: 0.85,
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
