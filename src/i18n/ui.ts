export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const RUTAS = {
  es: { inicio: '/', sobre: '/sobre/', ensayos: '/ensayos/', rss: '/rss.xml' },
  en: { inicio: '/en/', sobre: '/en/about/', ensayos: '/en/essays/', rss: '/en/rss.xml' },
} as const satisfies Record<Idioma, Record<string, string>>;

export const COORDENADA = '43.3623 N · 8.4115 W';

export const UI = {
  es: {
    etiquetaIdioma: 'es-ES',
    otroIdioma: 'English',
    saltarContenido: 'Saltar al contenido',
    navInicio: 'Inicio',
    navSobre: 'Sobre mí',
    navEnsayos: 'Ensayos',
    temaClaro: 'Activar modo claro',
    temaOscuro: 'Activar modo oscuro',
    lugar: 'A Coruña, Galicia',
    credenciales: ['Inditex', 'Situm', 'Ancora Mobile', 'Ingeniería industrial'],
    trayectoriaRotulo: 'Trayectoria',
    trayectoriaTitulo: 'Cinco tramos, y lo que enseñó cada salto.',
    escrituraRotulo: 'Escritura',
    ultimosEnsayos: 'Últimos ensayos',
    todosLosEnsayos: 'Ver todos los ensayos',
    archivoRotulo: 'Archivo',
    archivoTitulo: 'Ensayos',
    archivoDescripcion: 'Notas largas sobre construir software y sistemas de IA aplicada.',
    archivoVacio: 'Todavía no hay ensayos publicados en español.',
    volverEnsayos: 'Volver a los ensayos',
    feed: 'Feed RSS',
    noEncontradoRotulo: 'Error 404',
    noEncontradoTitulo: 'Esta página no existe',
    noEncontradoTexto:
      'El enlace que has seguido no lleva a ningún sitio. Desde la portada se llega a todo lo demás.',
    noEncontradoEnlace: 'Ir a la portada',
  },
  en: {
    etiquetaIdioma: 'en',
    otroIdioma: 'Español',
    saltarContenido: 'Skip to content',
    navInicio: 'Home',
    navSobre: 'About',
    navEnsayos: 'Essays',
    temaClaro: 'Switch to light mode',
    temaOscuro: 'Switch to dark mode',
    lugar: 'A Coruña, Spain',
    credenciales: ['Inditex', 'Situm', 'Ancora Mobile', 'Industrial engineering'],
    trayectoriaRotulo: 'Track record',
    trayectoriaTitulo: 'Five stages, and what each jump taught.',
    escrituraRotulo: 'Writing',
    ultimosEnsayos: 'Latest essays',
    todosLosEnsayos: 'See all essays',
    archivoRotulo: 'Archive',
    archivoTitulo: 'Essays',
    archivoDescripcion: 'Long notes on building software and applied AI systems.',
    archivoVacio: 'No essays published in English yet.',
    volverEnsayos: 'Back to essays',
    feed: 'RSS feed',
    noEncontradoRotulo: 'Error 404',
    noEncontradoTitulo: 'This page does not exist',
    noEncontradoTexto: 'The link you followed leads nowhere. The home page gets you to everything else.',
    noEncontradoEnlace: 'Go to the home page',
  },
} as const;

export const COTAS = {
  es: [
    {
      nombre: 'Ingeniería industrial',
      texto:
        'CAD, CAE y prototipado. Simulación estructural y térmica, y el ciclo completo hasta producción. De ahí viene la costumbre de ensayar un diseño antes de defenderlo.',
    },
    {
      nombre: 'Situm',
      texto:
        'Posicionamiento en interiores. Desarrollo de producto y decisiones de hoja de ruta sacadas de datos de uso, más formación técnica a equipos de negocio, que es el examen más honesto sobre si entiendes algo.',
    },
    {
      nombre: 'Ancora Mobile',
      texto:
        'IA aplicada a entornos industriales y cuadros de mando para decisión operativa. Un panel que nadie mira rara vez tiene un problema de visualización. Tiene un problema de a quién le cambia la decisión.',
    },
    {
      nombre: 'Inditex',
      texto:
        'IA generativa, aprendizaje automático y lenguaje natural sobre texto y voz. Conocimiento corporativo con bases de datos vectoriales y asistentes internos. A esa escala lo difícil es la evaluación, la gobernanza y el coste por consulta.',
    },
    {
      nombre: 'Ahora',
      texto:
        'Producto propio. Las mismas piezas de ingeniería, con el ciclo más corto y el error más barato. Me interesan los sitios donde el software se encuentra con trabajo físico y con normativa.',
    },
  ],
  en: [
    {
      nombre: 'Industrial engineering',
      texto:
        'CAD, CAE and prototyping. Structural and thermal simulation, and the full cycle into production. That is where the habit of testing a design before defending it comes from.',
    },
    {
      nombre: 'Situm',
      texto:
        'Indoor positioning. Product development and roadmap decisions drawn from usage data, plus teaching technical material to business teams, which is the most honest exam on whether you understand something.',
    },
    {
      nombre: 'Ancora Mobile',
      texto:
        'Applied AI in industrial environments and dashboards for operating decisions. A dashboard nobody looks at rarely has a visualisation problem. It has a problem with whose decision it changes.',
    },
    {
      nombre: 'Inditex',
      texto:
        'Generative AI, machine learning and natural language over text and voice. Corporate knowledge backed by vector databases and internal assistants. At that scale the hard part is evaluation, governance and cost per query.',
    },
    {
      nombre: 'Now',
      texto:
        'My own products. The same engineering pieces, with a shorter cycle and cheaper mistakes. I am drawn to places where software meets physical work and regulation.',
    },
  ],
} as const;

export function formatearFecha(fecha: Date, idioma: Idioma): string {
  return fecha.toLocaleDateString(idioma === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
