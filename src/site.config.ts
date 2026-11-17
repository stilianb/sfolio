/**
 * GitHub Pages project site.
 * `site` in Astro is the origin only; `base` is the repo path.
 * SITE_URL is the public address of this site, with no trailing slash.
 */
export const SITE_ORIGIN = "https://stilianb.github.io";
export const BASE_PATH = "/sfolio";
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;

/** LinkedIn profile, used in the footer, contact block and contact page. */
export const LINKEDIN_URL = "https://www.linkedin.com/in/scullyb/";

/**
 * Where the contact form posts.
 * Netlify Forms: keep a same-site path (the thank-you page). The form turns on
 * `data-netlify` when this value starts with `/`.
 * Formspree: set this to the form endpoint, for example `https://formspree.io/f/xxxx`.
 */
export const FORM_ACTION = "/contact/thanks/";

export const EMAIL = "sbalasopoulov@gmail.com";
