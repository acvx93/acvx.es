import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/fondo.ts', import.meta.url), 'utf8'));
const { montarFondo } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function entorno(t, width, height, theme) {
  let now = 0, id = 0, allocations = 0, observer;
  const queue = new Map();
  const stats = { frames: 0, fills: 0, filters: 0, positions: [], alphas: [] };
  const schedule = (callback, delay = 0) => {
    queue.set(++id, { callback, at: now + delay });
    return id;
  };
  const cancel = key => queue.delete(key);
  const media = new Map();
  const w = Object.assign(new EventTarget(), {
    innerWidth: width, innerHeight: height, devicePixelRatio: 3,
    setTimeout: schedule, clearTimeout: cancel,
    matchMedia(query) {
      if (!media.has(query)) media.set(query, Object.assign(new EventTarget(), { matches: false }));
      return media.get(query);
    },
  });
  class Canvas {
    width = 0; height = 0; clientWidth = width; clientHeight = height;
    classList = { add() {} };
    constructor(main = false) {
      allocations++;
      const gradient = { addColorStop() {} };
      this.ctx = new Proxy({
        filter: 'none', globalAlpha: 1,
        createRadialGradient: () => gradient, createLinearGradient: () => gradient,
        clearRect() { if (main) { stats.frames++; stats.positions = []; stats.alphas = []; } },
        fill() { stats.fills++; },
        translate(x, y) { if (main) stats.positions.push([x, y]); },
        drawImage() { if (this.filter !== 'none') stats.filters++; if (main) stats.alphas.push(this.globalAlpha); },
      }, { get: (obj, key) => key in obj ? obj[key] : () => {} });
    }
    getContext() { return this.ctx; }
  }
  const doc = Object.assign(new EventTarget(), {
    hidden: false, documentElement: { dataset: { tema: theme } }, createElement: () => new Canvas(),
  });
  const globals = {
    window: w, document: doc, performance: { now: () => now },
    requestAnimationFrame: fn => schedule(() => fn(now), 1000 / 60), cancelAnimationFrame: cancel,
    MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() {} },
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
  const canvas = new Canvas(true);
  const destroy = montarFondo(canvas);
  function advance(ms) {
    const end = now + ms;
    while (queue.size) {
      const [key, item] = [...queue.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (item.at > end) break;
      now = item.at; queue.delete(key); item.callback();
    }
    now = end;
  }
  return { w, doc, canvas, destroy, advance, stats, queue, allocations: () => allocations, themeChanged: () => observer() };
}

for (const theme of ['light', 'dark']) {
  test(`fondo móvil ${theme}: scroll estable, rotación y ciclo de vida`, t => {
    const e = entorno(t, 390, 844, theme);
    const { w, doc, canvas, stats, advance } = e;
    const allocations = e.allocations(), fills = stats.fills, filters = stats.filters;
    const frames = stats.frames;
    // Simula los resize sucesivos de las barras/teclado, también cuando el
    // navegador reporta un alto de layout diferente del lienzo inicial.
    for (const height of [800, 760, 700, 844, 500, 844]) {
      w.innerHeight = height;
      canvas.clientHeight = height;
      w.dispatchEvent(new Event('resize'));
      advance(80);
    }
    assert.equal(e.allocations(), allocations, 'no reconstruir texturas al deslizar');
    assert.equal(canvas.height, 844, 'no cambiar la composición');
    assert.ok(stats.frames > frames, 'no detener la animación durante los resize');
    assert.equal(stats.fills, fills);
    assert.equal(stats.filters, filters, 'sin desenfoques nuevos por fotograma');
    assert.ok(stats.positions.filter(([x]) => x > 195 && x < 370).length > 25, 'nube dentro de la pantalla');
    assert.ok(stats.alphas.some(a => a >= 0.7 && a <= 0.8), 'sin atenuación móvil excesiva');

    // Un resize real (p. ej. giro) sí actualiza composición y presupuesto.
    canvas.clientWidth = w.innerWidth = 844;
    canvas.clientHeight = w.innerHeight = 390;
    w.dispatchEvent(new Event('orientationchange')); advance(200);
    assert.equal(canvas.width, 844); assert.equal(canvas.height, 390);
    assert.ok(e.allocations() > allocations);

    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    const paused = stats.frames; advance(1000);
    assert.equal(stats.frames, paused); assert.equal(e.queue.size, 0);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); advance(100);
    assert.ok(stats.frames > paused);
    const reduced = w.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.matches = true; reduced.dispatchEvent(new Event('change'));
    const still = stats.frames; advance(1000);
    assert.equal(stats.frames, still); assert.equal(e.queue.size, 0);
    doc.documentElement.dataset.tema = theme === 'dark' ? 'light' : 'dark';
    e.themeChanged(); assert.ok(stats.frames > still);
    e.destroy(); advance(1000); assert.equal(e.queue.size, 0);
    const finalFrames = stats.frames;
    w.dispatchEvent(new Event('resize')); doc.dispatchEvent(new Event('visibilitychange')); advance(1000);
    assert.equal(stats.frames, finalFrames);
  });
}

test('mantiene los presupuestos de píxeles y fotogramas en 4K', t => {
  const e = entorno(t, 3840, 2160, 'dark');
  const { frames, fills, filters } = e.stats;
  e.advance(1000);
  assert.ok(e.canvas.width * e.canvas.height <= 640000);
  assert.ok(e.stats.frames > frames && e.stats.frames - frames <= 20);
  assert.equal(e.stats.fills, fills); assert.equal(e.stats.filters, filters);
  e.destroy();
});
