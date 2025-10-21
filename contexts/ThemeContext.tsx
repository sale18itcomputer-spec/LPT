import React, { createContext, ReactNode } from 'react';
import { useDarkMode, UseDarkModeReturn } from '../hooks/useDarkMode';

export const ThemeContext = createContext<UseDarkModeReturn | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const darkModeProps = useDarkMode();
  return (
    <ThemeContext.Provider value={darkModeProps}>
      {children}
    </ThemeContext.Provider>
  );
};
