import type { APIContext } from 'astro';
import { RUTAS, type Idioma } from '../i18n/ui';
import { ensayosDe, idiomaDe, urlDe } from '../lib/ensayos';

type Grupo = Partial<Record<Idioma, string>>;

export async function GET(context: APIContext) {
  const base = context.site!;

  const grupos: Grupo[] = [
    { es: RUTAS.es.inicio, en: RUTAS.en.inicio },
    { es: RUTAS.es.sobre, en: RUTAS.en.sobre },
    { es: RUTAS.es.ensayos, en: RUTAS.en.ensayos },
  ];

  const porTraduccion = new Map<string, Grupo>();
  for (const idioma of ['es', 'en'] as const) {
    for (const entrada of await ensayosDe(idioma)) {
      const grupo = porTraduccion.get(entrada.data.traduccion) ?? {};
      grupo[idiomaDe(entrada)] = urlDe(entrada);
      porTraduccion.set(entrada.data.traduccion, grupo);
    }
  }
  grupos.push(...porTraduccion.values());

  const absoluta = (ruta: string) => new URL(ruta, base).href;
  const hreflang = (idioma: Idioma) => (idioma === 'es' ? 'es-ES' : 'en');

  const entradas = grupos.flatMap((grupo) =>
    (Object.keys(grupo) as Idioma[]).map((idioma) => {
      const alternas = (Object.keys(grupo) as Idioma[])
        .map(
          (otro) =>
            `<xhtml:link rel="alternate" hreflang="${hreflang(otro)}" href="${absoluta(grupo[otro]!)}"/>`,
        )
        .join('');
      const porDefecto = grupo.es
        ? `<xhtml:link rel="alternate" hreflang="x-default" href="${absoluta(grupo.es)}"/>`
        : '';
      return `<url><loc>${absoluta(grupo[idioma]!)}</loc>${alternas}${porDefecto}</url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entradas.join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
