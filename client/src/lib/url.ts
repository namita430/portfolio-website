/**
 * Returns the URL only if it is a valid http(s) URL; otherwise undefined.
 * Every link built from API data goes through this, so a stored `javascript:` URL can never become an href.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function displayHost(url: string | null | undefined): string {
  const href = safeHref(url);
  if (!href) return '';
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
