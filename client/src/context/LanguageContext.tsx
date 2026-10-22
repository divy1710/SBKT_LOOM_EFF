import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import enTranslations from '../locales/en.json';
import guTranslations from '../locales/gu.json';
import hiTranslations from '../locales/hi.json';

export type Language = 'en' | 'gu' | 'hi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, any> = {
  en: enTranslations,
  gu: guTranslations,
  hi: hiTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'sbkt_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'en' || saved === 'gu' || saved === 'hi')) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');

      // Try current language
      let value: any = translations[language];
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }

      // Fallback to English
      if (value === undefined || typeof value !== 'string') {
        value = translations.en;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            value = undefined;
            break;
          }
        }
      }

      if (typeof value !== 'string') {
        return key; // Fallback to raw key if missing
      }

      // Interpolate {param}
      if (params) {
        return Object.entries(params).reduce((str, [pKey, pVal]) => {
          return str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }, value);
      }

      return value;
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
