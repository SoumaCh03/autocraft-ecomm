import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('autocraft-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (isDark) {
      html.classList.remove('light');
      body.classList.remove('light');
      html.classList.add('dark');
      localStorage.setItem('autocraft-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
      body.classList.add('light');
      localStorage.setItem('autocraft-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

