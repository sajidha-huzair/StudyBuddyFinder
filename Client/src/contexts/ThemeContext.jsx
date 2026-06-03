import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import settingsService from '../services/settingsService';

const THEME_STORAGE_KEY = 'studybuddy-theme';

const ThemeContext = createContext(null);

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveTheme = (preference) => {
  if (preference === 'system') return getSystemTheme();
  return preference === 'dark' ? 'dark' : 'light';
};

export const ThemeProvider = ({ children, userTheme }) => {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return stored;
    if (userTheme) return userTheme;
    return 'light';
  });
  const [userSynced, setUserSynced] = useState(false);

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    if (userTheme && !userSynced) {
      setThemeState(userTheme);
      setUserSynced(true);
    }
  }, [userTheme, userSynced]);

  useEffect(() => {
    if (!userTheme) setUserSynced(false);
  }, [userTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.setAttribute('data-theme', getSystemTheme());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback(async (nextTheme, persistRemote = true) => {
    setThemeState(nextTheme);
    if (persistRemote) {
      try {
        await settingsService.updatePreferences({ appearance: { theme: nextTheme } });
      } catch {
      }
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, isDark: resolvedTheme === 'dark' }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export { THEME_STORAGE_KEY, resolveTheme };
