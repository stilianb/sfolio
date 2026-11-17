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

`npm run build` writes the site to `dist/`. That folder is the deploy artifact: HTML, CSS, images, and `robots.txt`. No server adapter.

## Password gate

Every page is behind one password field, with a control to show the password and an Enter button. After the build, `integrations/password-gate.mjs` encrypts each HTML page in `dist/` (AES-256-GCM, key from PBKDF2-SHA256) and replaces it with a small unlock page, so the page markup is never served in plain text. A correct entry is remembered for the browser tab session. The value is trimmed, so a trailing newline in the secret does not change it.

The password is read from `SITE_PASSWORD`:

- Locally: put `SITE_PASSWORD=...` in `.env` (git-ignored).
- In CI: add a repository secret named `SITE_PASSWORD` (Settings → Secrets and variables → Actions).

The build fails if it is missing, so the site is never published unprotected. To change the password, update both places and redeploy.

Search engines are kept out by `robots.txt` (`Disallow: /`), a `noindex, nofollow` robots meta tag on every page and on the unlock page, and no sitemap. `npm run dev` does not apply the gate.

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

The site is published with GitHub Pages from `.github/workflows/pages.yml`. A push to `main` builds `dist/` and deploys it. The public URL is `https://scullybalasopoulov.com/`.

In the GitHub repo, Settings → Pages → Build and deployment must be **GitHub Actions**.

| Constant | Where | What to set |
|---|---|---|
| `SITE_ORIGIN`, `BASE_PATH` | `src/site.config.ts` | The public origin and an optional path. `BASE_PATH` is empty for `scullybalasopoulov.com`. `SITE_URL` is those two joined. Canonical URLs and Open Graph use `SITE_URL`. |
| `LINKEDIN_URL` | `src/site.config.ts` | The LinkedIn profile. |
| `FORM_ACTION` | `src/site.config.ts` | Where the contact form posts. |

GitHub Pages only serves files. It does not receive form posts. Leave `FORM_ACTION` as `/contact/thanks/` and the button opens that page without storing the message. To deliver messages, set `FORM_ACTION` to a form endpoint such as `https://formspree.io/f/xxxx` and set that endpoint's redirect to `https://scullybalasopoulov.com/contact/thanks/`. A full URL turns the Netlify form attribute off.

The custom domain is saved in the repository under Settings → Pages. DNS for `scullybalasopoulov.com` points at GitHub Pages.

## Design source

`design-source/` is the canvas export this site was ported from. It is not used at runtime.
