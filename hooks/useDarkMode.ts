import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

export interface UseDarkModeReturn {
  theme: Theme;
  toggleTheme: () => void;
}

export const useDarkMode = (): UseDarkModeReturn => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    // Default to 'light' if no theme is stored, ignoring system preference.
    const initialTheme = storedTheme || 'light';
    setTheme(initialTheme);
  }, []);
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);
  
  return { theme, toggleTheme };
};