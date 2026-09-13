import { getCollection, type CollectionEntry } from 'astro:content';
import { RUTAS, type Idioma } from '../i18n/ui';

export type Entrada = CollectionEntry<'ensayos'>;

export function slugDe(entrada: Entrada): string {
  return entrada.id.replace(/^(es|en)\//, '');
}

export function idiomaDe(entrada: Entrada): Idioma {
  return entrada.id.startsWith('en/') ? 'en' : 'es';
}

export function urlDe(entrada: Entrada): string {
  return `${RUTAS[idiomaDe(entrada)].ensayos}${slugDe(entrada)}/`;
}

export async function ensayosDe(idioma: Idioma): Promise<Entrada[]> {
  const todos = await getCollection('ensayos');
  return todos
    .filter((entrada) => idiomaDe(entrada) === idioma)
    .sort((a, b) => b.data.fecha.valueOf() - a.data.fecha.valueOf());
}

export async function alternasDe(entrada: Entrada): Promise<Partial<Record<Idioma, string>>> {
  const todos = await getCollection('ensayos');
  const alternas: Partial<Record<Idioma, string>> = {};
  for (const otra of todos) {
    if (otra.data.traduccion === entrada.data.traduccion) {
      alternas[idiomaDe(otra)] = urlDe(otra);
    }
  }
  return alternas;
}
