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

// Se declara antes de arrancar(), que lo asigna al cargar el módulo.
let lenisActivo: Lenis | null = null;

/* Volver al principio: aparece al bajar media pantalla */
const volver = document.querySelector<HTMLButtonElement>('[data-volver-arriba]');
if (volver) {
  const actualizar = () => volver.toggleAttribute('data-visible', window.scrollY > window.innerHeight * 0.5);
  window.addEventListener('scroll', actualizar, { passive: true });
  actualizar();
  volver.addEventListener('click', () => {
    if (lenisActivo) {
      lenisActivo.scrollTo(0, { duration: 1.1, easing: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)) });
    } else {
      window.scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
    }
    document.querySelector<HTMLElement>('.marca')?.focus({ preventScroll: true });
  });
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
  lenisActivo = lenis;
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

    // Cada etapa ocupa una pantalla de recorrido y su parada queda en el
    // centro del tramo. Si una parada cayera en el borde, la escena pasaría de
    // fija a estática en reposo y se movería una fracción de píxel, lo que
    // descuadra las líneas de 1 px del eje respecto a sus números.
    const disparador = ScrollTrigger.create({
      trigger: escena,
      start: 'top top',
      end: () => '+=' + window.innerHeight * etapas,
      pin: true,
      pinSpacing: true,
      scrub: 0.1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const indice = Math.min(etapas - 1, Math.floor(self.progress * etapas));
        activar(Math.max(0, indice));
      },
    });

    // Un gesto avanza una pantalla de toda la portada: entrada, introducción,
    // cada cota y ensayos. Los paneles táctiles siguen mandando rueda por
    // inercia después de soltar, así que un silencio no sirve para separar
    // gestos. Como en fullPage.js, se compara la media de los últimos eventos
    // con la de los anteriores: la inercia decae y un empujón nuevo acelera.
    // Tras cada salto, el siguiente exige que antes el gesto haya frenado por
    // debajo del 40 % de su pico y que luego repunte a 2,5 veces el valle;
    // así un deslizamiento largo, aunque llegue con ruido, cuenta una vez.
    const ensayos = trayectoria.nextElementSibling as HTMLElement | null;
    const anclas = () => {
      const maximo = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const paso = (disparador.end - disparador.start) / etapas;
      const destinos = [0, ...Array.from({ length: etapas }, (_, i) => disparador.start + paso * (i + 0.5))];
      if (ensayos) destinos.push(window.scrollY + ensayos.getBoundingClientRect().top);
      destinos.push(maximo);
      return destinos.map((valor) => Math.min(maximo, Math.max(0, valor)))
        .filter((valor, i, lista) => i === 0 || valor - lista[i - 1] > 80);
    };
    const DURACION = 0.5;
    const PAUSA = 200;
    // Al volver a tocar el panel, la inercia se corta, los eventos (cada
    // 8-16 ms) se interrumpen y el dedo nuevo arranca despacio. Un hueco con
    // caída a menos de la mitad marca un dedo nuevo; tras un frame perdido la
    // inercia sigue igual o más fuerte, porque el navegador agrupa lo atrasado.
    const TOQUE = 40;
    // Salida exponencial, la curva por defecto de Lenis: responde al instante.
    const salida = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
    const media = (lista: number[], n: number) => {
      const tramo = lista.slice(-n);
      return tramo.reduce((suma, valor) => suma + valor, 0) / tramo.length;
    };

    let animando = false;
    let finAnimacion = 0;
    let pendiente = 0;
    let ultimoEvento = 0;
    let sentidoActual = 0;
    let historial: number[] = [];
    // libre: puede saltar ya. frenando: acaba de saltar y espera a que el
    // gesto decaiga. armado: ha decaído y salta si vuelve a acelerar.
    let fase: 'libre' | 'frenando' | 'armado' = 'libre';
    let pico = 0;
    let valle = 0;

    const saltar = (sentido: number) => {
      const destinos = anclas();
      const actual = destinos.reduce((mejor, valor, i) =>
        Math.abs(valor - window.scrollY) < Math.abs(destinos[mejor] - window.scrollY) ? i : mejor, 0);
      const siguiente = Math.max(0, Math.min(destinos.length - 1, actual + sentido));
      if (siguiente === actual) return;
      animando = true;
      const terminar = () => {
        if (!animando) return;
        animando = false;
        window.clearTimeout(finAnimacion);
        // Los gestos que llegaron durante la transición saltan al acabar esta,
        // uno por gesto.
        if (pendiente) {
          const sentidoPendiente = Math.sign(pendiente);
          pendiente -= sentidoPendiente;
          saltar(sentidoPendiente);
        }
      };
      // Seguro por si Lenis no llega a avisar del final.
      finAnimacion = window.setTimeout(terminar, DURACION * 1000 + 150);
      lenis.scrollTo(destinos[siguiente], { duration: DURACION, easing: salida, onComplete: terminar });
    };

    const pedirSalto = (sentido: number, fuerza: number) => {
      fase = 'frenando';
      pico = fuerza;
      if (!animando) saltar(sentido);
      else pendiente = Math.sign(pendiente) === -sentido ? sentido : Math.max(-2, Math.min(2, pendiente + sentido));
    };

    const avanzar = (evento: WheelEvent) => {
      if (evento.ctrlKey || evento.defaultPrevented) return;
      if (evento.target instanceof Element && evento.target.closest('dialog, [data-scroll-libre]')) return;
      evento.preventDefault();
      // Lenis no consulta defaultPrevented: si recibe esta misma rueda, suma
      // su delta al salto y la página acaba entre dos pantallas.
      evento.stopImmediatePropagation();

      // Solo cuenta el eje vertical; con mayúsculas la rueda llega en el
      // horizontal. Un deslizamiento algo torcido en el panel mete eventos
      // horizontales que no deben cambiar el sentido.
      const escala = evento.deltaMode === 1 ? 40 : evento.deltaMode === 2 ? 800 : 1;
      const cambiado = evento.shiftKey && !evento.deltaY;
      const x = (cambiado ? 0 : evento.deltaX) * escala;
      const y = (cambiado ? evento.deltaX : evento.deltaY) * escala;
      if (y === 0 || Math.abs(x) > Math.abs(y)) return;

      const ahora = performance.now();
      const sentido = Math.sign(y);
      const hueco = ahora - ultimoEvento;
      if (hueco > PAUSA || sentido !== sentidoActual) {
        historial = [];
        fase = 'libre';
      } else if (hueco > TOQUE && fase === 'frenando' && Math.abs(y) < media(historial, 6) * 0.5) {
        historial = [];
        fase = 'armado';
        valle = Infinity;
      }
      ultimoEvento = ahora;
      sentidoActual = sentido;
      historial.push(Math.abs(y));
      if (historial.length > 120) historial.shift();

      const corta = media(historial, 6);
      const larga = media(historial, 40);

      if (fase === 'libre') {
        pedirSalto(sentido, corta);
      } else if (fase === 'frenando') {
        pico = Math.max(pico, corta);
        if (corta < pico * 0.4) {
          fase = 'armado';
          valle = corta;
        }
      } else {
        valle = Math.min(valle, corta);
        if (corta >= larga && corta > valle * 2.5 + 3) pedirSalto(sentido, corta);
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

/* Red de seguridad: si algo falla, el contenido nunca se queda invisible */
window.setTimeout(() => {
  if (!window.__movimientoListo) rendirse();
}, 2500);
