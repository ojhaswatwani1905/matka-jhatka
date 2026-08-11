import { useState, useEffect, useCallback } from 'react';
import enContent from './en.json';
import hiContent from './hi.json';

export type Language = 'en' | 'hi';
type ContentDict = typeof enContent;

const dicts: Record<Language, any> = {
  en: enContent,
  hi: hiContent,
};

let currentLang: Language = (typeof window !== 'undefined' && (localStorage.getItem('playarena_lang') as Language)) || 'en';

/**
 * Get nested content string using dot notation (e.g. 'hero.welcomeTitle')
 */
export function getContent(keyPath: string, fallback?: string, lang: Language = currentLang): string {
  const parts = keyPath.split('.');
  const activeDict = dicts[lang] || enContent;
  let curr: any = activeDict;

  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      // Fallback to English dict if missing in translation
      let enCurr: any = enContent;
      for (const p of parts) {
        if (enCurr && typeof enCurr === 'object' && p in enCurr) enCurr = enCurr[p];
        else return fallback || keyPath;
      }
      return typeof enCurr === 'string' ? enCurr : fallback || keyPath;
    }
  }
  return typeof curr === 'string' ? curr : fallback || keyPath;
}

export function setLanguage(lang: Language) {
  currentLang = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('playarena_lang', lang);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
  }
}

export function useContent() {
  const [lang, setLang] = useState<Language>(() => currentLang);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvt = e as CustomEvent<Language>;
      if (customEvt.detail) {
        setLang(customEvt.detail);
      }
    };
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);

  const t = useCallback((keyPath: string, fallback?: string) => {
    return getContent(keyPath, fallback, lang);
  }, [lang]);

  return {
    lang,
    setLanguage,
    t,
    content: (dicts[lang] || enContent) as ContentDict,
  };
}
