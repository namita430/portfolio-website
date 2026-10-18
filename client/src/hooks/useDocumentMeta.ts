import { useEffect } from 'react';

interface Meta {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string | undefined) {
  if (content === undefined) return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Per-route title/description/Open Graph tags (client-side). Search engines that run JavaScript pick these up;
 * social-media crawlers generally only read the static tags in index.html (see docs/README for the trade-off).
 */
export function useDocumentMeta({ title, description, image, noindex }: Meta) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    }
    return () => {
      document.title = previousTitle;
      if (noindex) robots?.remove();
    };
  }, [title, description, image, noindex]);
}
