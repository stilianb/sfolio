/**
 * Public site. SITE_ORIGIN has no trailing slash.
 * BASE_PATH is empty when the site is served from the domain root.
 * A project path such as `/sfolio` is only for a `*.github.io` project site.
 */
export const SITE_ORIGIN = "https://scullybalasopoulov.com";
export const BASE_PATH = "";
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
