import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Accessibility = 'none' | 'red-green' | 'tritanopia';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accessibility: Accessibility;
  setAccessibility: (acc: Accessibility) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as Theme) || 'system';
  });

  const [accessibility, setAccessibility] = useState<Accessibility>(() => {
    const saved = localStorage.getItem('app_accessibility');
    return (saved as Accessibility) || 'none';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.removeAttribute('data-theme');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') {
        root.setAttribute('data-theme', 'dark');
      }
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    }

    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.removeAttribute('data-accessibility');

    if (accessibility !== 'none') {
      root.setAttribute('data-accessibility', accessibility);
    }

    localStorage.setItem('app_accessibility', accessibility);
  }, [accessibility]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accessibility, setAccessibility }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
