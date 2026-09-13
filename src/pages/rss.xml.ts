import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { UI } from '../i18n/ui';
import { ensayosDe, urlDe } from '../lib/ensayos';

export async function GET(context: APIContext) {
  const entradas = await ensayosDe('es');
  return rss({
    title: 'acvx.es - Ensayos',
    description: UI.es.archivoDescripcion,
    site: context.site!,
    customData: '<language>es-ES</language>',
    items: entradas.map((entrada) => ({
      title: entrada.data.titulo,
      description: entrada.data.descripcion,
      pubDate: entrada.data.fecha,
      link: urlDe(entrada),
    })),
  });
}
