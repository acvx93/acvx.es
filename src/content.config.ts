import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const ensayos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/ensayos' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    traduccion: z.string(),
  }),
});

export const collections = { ensayos };
