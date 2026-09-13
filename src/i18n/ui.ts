export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const RUTAS = {
  es: { inicio: '/', sobre: '/sobre/', ensayos: '/ensayos/', rss: '/rss.xml' },
  en: { inicio: '/en/', sobre: '/en/about/', ensayos: '/en/essays/', rss: '/en/rss.xml' },
} as const satisfies Record<Idioma, Record<string, string>>;

export const UI = {
  es: {
    etiquetaIdioma: 'es-ES',
    nombreIdioma: 'Español',
    otroIdioma: 'English',
    saltarContenido: 'Saltar al contenido',
    navInicio: 'Inicio',
    navSobre: 'Sobre mí',
    navEnsayos: 'Ensayos',
    cambiarTema: 'Cambiar entre modo claro y oscuro',
    ultimosEnsayos: 'Últimos ensayos',
    todosLosEnsayos: 'Ver todos los ensayos',
    archivoTitulo: 'Ensayos',
    archivoDescripcion: 'Notas largas sobre construir software y sistemas de IA aplicada.',
    archivoVacio: 'Todavía no hay ensayos publicados en español.',
    volverEnsayos: 'Volver a los ensayos',
    escribeme: 'Escríbeme a',
    feed: 'Feed RSS',
    noEncontradoTitulo: 'Esta página no existe',
    noEncontradoTexto: 'El enlace que has seguido no lleva a ningún sitio. Desde la portada se llega a todo lo demás.',
    noEncontradoEnlace: 'Ir a la portada',
  },
  en: {
    etiquetaIdioma: 'en',
    nombreIdioma: 'English',
    otroIdioma: 'Español',
    saltarContenido: 'Skip to content',
    navInicio: 'Home',
    navSobre: 'About',
    navEnsayos: 'Essays',
    cambiarTema: 'Switch between light and dark mode',
    ultimosEnsayos: 'Latest essays',
    todosLosEnsayos: 'See all essays',
    archivoTitulo: 'Essays',
    archivoDescripcion: 'Long notes on building software and applied AI systems.',
    archivoVacio: 'No essays published in English yet.',
    volverEnsayos: 'Back to essays',
    escribeme: 'Write to me at',
    feed: 'RSS feed',
    noEncontradoTitulo: 'This page does not exist',
    noEncontradoTexto: 'The link you followed leads nowhere. The home page gets you to everything else.',
    noEncontradoEnlace: 'Go to the home page',
  },
} as const;

export function formatearFecha(fecha: Date, idioma: Idioma): string {
  return fecha.toLocaleDateString(idioma === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
