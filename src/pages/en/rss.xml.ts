import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { UI } from '../../i18n/ui';
import { ensayosDe, urlDe } from '../../lib/ensayos';

export async function GET(context: APIContext) {
  const entradas = await ensayosDe('en');
  return rss({
    title: 'acvx.es - Essays',
    description: UI.en.archivoDescripcion,
    site: context.site!,
    customData: '<language>en</language>',
    items: entradas.map((entrada) => ({
      title: entrada.data.titulo,
      description: entrada.data.descripcion,
      pubDate: entrada.data.fecha,
      link: urlDe(entrada),
    })),
  });
}
