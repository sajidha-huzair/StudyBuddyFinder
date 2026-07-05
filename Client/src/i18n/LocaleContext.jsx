import React, { createContext, useContext, useState, useCallback } from 'react';
import en from './locales/en';
import si from './locales/si';
import ta from './locales/ta';

const LOCALES = { en, si, ta };

const LocaleContext = createContext({ locale: 'en', t: (k) => k, setLocale: () => {} });

export const LocaleProvider = ({ children, initialLocale = 'en' }) => {
  const [locale, setLocaleState] = useState(() => {
    return localStorage.getItem('locale') || initialLocale || 'en';
  });

  const setLocale = useCallback((code) => {
    localStorage.setItem('locale', code);
    setLocaleState(code);
  }, []);

  const t = useCallback((key) => {
    const parts = key.split('.');
    let val = LOCALES[locale] || LOCALES.en;
    for (const p of parts) {
      val = val?.[p];
    }
    return val || LOCALES.en?.[parts[0]]?.[parts[1]] || key;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);

export default LocaleContext;
