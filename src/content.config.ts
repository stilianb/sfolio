import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const work = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/work" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      kind: z.enum(["case-study", "exploration"]),
      order: z.number(),
      summary: z.string(),
      thumbnail: image(),
      cover: image(),
      meta: z.object({
        project: z.string(),
        role: z.string(),
        type: z.string(),
        scope: z.string(),
      }),
      next: z.string(),
    }),
});

export const collections = { work };
