import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Language } from '../types';
import { he, type Translations } from './he';
import { en } from './en';

interface LanguageContextValue {
  lang: Language;
  dir: 'rtl' | 'ltr';
  t: Translations;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
}

const STORAGE_KEY = 'bci_hub_lang';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'he';
  });

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const t = lang === 'he' ? he : en;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const toggleLang = () => setLangState((prev) => (prev === 'he' ? 'en' : 'he'));
  const setLang = (next: Language) => setLangState(next);

  return (
    <LanguageContext.Provider value={{ lang, dir, t, toggleLang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return ctx;
}
