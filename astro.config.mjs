import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { SITE_URL } from "./src/site.config.ts";
import { remarkCaseSections } from "./src/lib/remark-case-sections.js";

export default defineConfig({
  site: SITE_URL,
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
