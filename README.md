# Scully Balasopoulov

Static portfolio site. Astro, plain CSS, no client-side framework.

## Run

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

The dev server prints a local URL. Production build:

```bash
npm run build
npm run preview
```

`npm run build` writes the site to `dist/`. That folder is the deploy artifact: HTML, CSS, images, `sitemap-index.xml`, and `robots.txt`. No server adapter.

## Add a case study

1. Add images under `src/assets/`. Use a short name such as `acme-cover.png` and `acme-01.png`.
2. Create `src/content/work/acme.mdx`. Copy an existing file and keep the frontmatter fields: `title`, `slug`, `kind` (`case-study` or `exploration`), `order`, `summary` (the card subtitle), `thumbnail`, `cover`, `meta` (`project`, `role`, `type`, `scope`), and `next` (the slug of the following project).
3. Write the story in Markdown. A `##` heading becomes a section. Put screens in an `ImageSequence`:

```mdx
import CaseSection from '../../components/CaseSection.astro';
import ImageSequence from '../../components/ImageSequence.astro';
import shot from '../../assets/acme-01.png';

## Overview

What the work was.

<ImageSequence items={[{ src: shot, alt: "Describe the screen." }]} />
```

`layout` is `stack` (default), `pair` (two tall frames), or `bleed` (edge-to-edge). Point the previous project's `next` field at this slug, and set this file's `next` so the loop stays closed. Home and Work read the collection; the new card shows up on its own.

Give every image a real `alt`. Use `alt=""` only when the image adds nothing a nearby caption does not already say.

## Deploy

The build is static. Set the three values in `src/site.config.ts` before you ship:

| Constant | What to set |
|---|---|
| `SITE_URL` | The public origin, with no trailing slash. Canonical URLs, Open Graph, the sitemap, and `robots.txt` use it. |
| `LINKEDIN_URL` | The LinkedIn profile. The placeholder is marked TODO. |
| `FORM_ACTION` | Where the contact form posts. |

**Netlify.** Leave `FORM_ACTION` as `/contact/thanks/`. The form sets `data-netlify="true"` and a honeypot field when the action is a site path, so Netlify Forms will pick it up from the built HTML. In the Netlify UI, confirm form detection is on. Publish `dist/`, or connect the repo with build command `npm run build` and publish directory `dist`.

**Vercel.** Import the repo. Framework preset Astro, output `dist`. Vercel does not process Netlify form attributes. For Vercel, point `FORM_ACTION` at a form endpoint such as Formspree (`https://formspree.io/f/xxxx`). A full URL turns the Netlify attribute off. The thank-you page stays at `/contact/thanks/`; set the endpoint's redirect to that URL if you want the same success page.

**Cloudflare Pages.** Build command `npm run build`, output directory `dist`. Use the same `FORM_ACTION` swap as Vercel.

## Design source

`design-source/` is the canvas export this site was ported from. It is not used at runtime.
