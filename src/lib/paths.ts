import { BASE_PATH, SITE_ORIGIN } from "../site.config";

/** Absolute URL for a root path, including the GitHub Pages base. */
export function absoluteUrl(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  const rooted = src.startsWith("/") ? src : `/${src}`;
  const path =
    rooted === BASE_PATH || rooted.startsWith(`${BASE_PATH}/`) ? rooted : `${BASE_PATH}${rooted}`;
  return new URL(path, SITE_ORIGIN).href;
}

/** Prefix a site path with the Astro base, for example `/sfolio`. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalized}`;
}

/** Current pathname with the base removed, always starting with `/`. */
export function sitePath(pathname: string): string {
  const base = import.meta.env.BASE_URL;
  if (base !== "/" && pathname.startsWith(base)) {
    const rest = pathname.slice(base.length - 1);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname || "/";
}
