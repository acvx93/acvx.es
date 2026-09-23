import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const base = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8')
  .match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
const toggle = readFileSync(new URL('../src/components/TemaToggle.astro', import.meta.url), 'utf8')
  .match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
assert.ok(base && toggle);

function pagina(storage, { movil, oscuro }) {
  const dataset = {};
  const atributos = {
    'data-etiqueta-light': 'Activar modo claro',
    'data-etiqueta-dark': 'Activar modo oscuro',
  };
  const escuchas = {};
  const boton = {
    getAttribute: nombre => atributos[nombre],
    setAttribute: (nombre, valor) => { atributos[nombre] = valor; },
    addEventListener: (nombre, fn) => { escuchas[nombre] = fn; },
  };
  const sistema = {
    matches: oscuro,
    addEventListener: (nombre, fn) => { escuchas[`sistema-${nombre}`] = fn; },
  };
  const ventana = {
    matchMedia: consulta => consulta.includes('prefers-color-scheme') ? sistema
      : { matches: consulta.includes('max-width') ? movil : true },
  };
  const contexto = {
    window: ventana,
    document: {
      documentElement: { dataset, classList: { add() {} } },
      querySelector: () => boton,
    },
    localStorage: {
      getItem: clave => storage.get(clave) ?? null,
      setItem: (clave, valor) => storage.set(clave, valor),
      removeItem: clave => storage.delete(clave),
    },
  };
  runInNewContext(base, contexto);
  runInNewContext(toggle, contexto);
  return {
    dataset,
    etiqueta: () => atributos['aria-label'],
    pulsar: () => escuchas.click(),
    cambiarSistema: valor => { sistema.matches = valor; escuchas['sistema-change'](); },
  };
}

test('en móvil conserva el cambio manual al navegar y sigue un cambio del sistema en vivo', () => {
  const storage = new Map();
  const ensayo = pagina(storage, { movil: true, oscuro: false });
  assert.equal(ensayo.dataset.tema, undefined);
  assert.equal(ensayo.etiqueta(), 'Activar modo oscuro');
  ensayo.pulsar();
  assert.equal(storage.get('tema'), 'dark');
  assert.equal(storage.get('tema-sistema'), 'light');

  const portada = pagina(storage, { movil: true, oscuro: false });
  assert.equal(portada.dataset.tema, 'dark');
  portada.cambiarSistema(true);
  assert.equal(portada.dataset.tema, undefined);
  assert.equal(storage.has('tema'), false);
  assert.equal(portada.etiqueta(), 'Activar modo claro');
});

test('en móvil detecta el cambio del sistema ocurrido mientras la web estaba cerrada', () => {
  const storage = new Map([['tema', 'light'], ['tema-sistema', 'dark']]);
  const paginaNueva = pagina(storage, { movil: true, oscuro: false });
  assert.equal(paginaNueva.dataset.tema, undefined);
  assert.equal(storage.has('tema'), false);
  assert.equal(storage.get('tema-sistema'), 'light');
});

test('en escritorio mantiene la preferencia manual aunque cambie el sistema', () => {
  const storage = new Map([['tema', 'dark']]);
  const escritorio = pagina(storage, { movil: false, oscuro: false });
  escritorio.cambiarSistema(true);
  assert.equal(escritorio.dataset.tema, 'dark');
  assert.equal(storage.get('tema'), 'dark');
});
