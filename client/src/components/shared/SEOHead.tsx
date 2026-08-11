import { useEffect } from 'react';

export interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  canonicalUrl?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

export function SEOHead({
  title,
  description,
  keywords = 'Matka Jhatka, Aviator crash game, WinGo color prediction, Royal 777 slots, Jaipur gaming casino, Jaipur casino online',
  ogImage = 'https://playarena.com/og-banner.png',
  ogType = 'website',
  canonicalUrl,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    // Title
    const fullTitle = title.includes('PlayArena') ? title : `${title} | PlayArena`;
    document.title = fullTitle;

    const setMetaTag = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);

    // OpenGraph meta tags
    const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : 'https://playarena.com');
    setMetaTag('og:title', fullTitle, 'property');
    setMetaTag('og:description', description, 'property');
    setMetaTag('og:image', ogImage, 'property');
    setMetaTag('og:url', currentUrl, 'property');
    setMetaTag('og:type', ogType, 'property');
    setMetaTag('og:site_name', 'PlayArena', 'property');

    // Twitter Card meta tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // JSON-LD Script Injection
    let scriptTag = document.querySelector('#seo-json-ld') as HTMLScriptElement;
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'seo-json-ld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = JSON.stringify(jsonLd);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Optional cleanup
    };
  }, [title, description, keywords, ogImage, ogType, canonicalUrl, jsonLd]);

  return null;
}
