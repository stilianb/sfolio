import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import { BASE_PATH, SITE_ORIGIN } from "./src/site.config.ts";
import { remarkCaseSections } from "./src/lib/remark-case-sections.js";
import passwordGate from "./integrations/password-gate.mjs";

export default defineConfig({
  site: SITE_ORIGIN,
  ...(BASE_PATH ? { base: BASE_PATH } : {}),
  output: "static",
  trailingSlash: "always",
  integrations: [mdx(), passwordGate()],
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
