import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { BASE_PATH, SITE_ORIGIN } from "./src/site.config.ts";
import { remarkCaseSections } from "./src/lib/remark-case-sections.js";

export default defineConfig({
  site: SITE_ORIGIN,
  base: BASE_PATH,
  output: "static",
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkCaseSections],
      smartypants: false,
      gfm: true,
    }),
  },
  build: {
    format: "directory",
  },
});
