import React, { createContext, useContext, useState, useEffect } from 'react';

export const LYRA_THEMES = {
  vinyl: {
    id: 'vinyl',
    name: 'Vintage Vinyl',
    primary: '#c29e5a',
    secondary: '#e6dfd5',
    tertiary: '#3b2d1c',
    glow: 'rgba(194, 158, 90, 0.4)',
    bgAccent: 'rgba(194, 158, 90, 0.08)'
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier',
    primary: '#41CAF0',
    secondary: '#68FFE1',
    tertiary: '#44CEEF',
    glow: 'rgba(65, 202, 240, 0.4)',
    bgAccent: 'rgba(65, 202, 240, 0.08)'
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    primary: '#D57FEB',
    secondary: '#FCCB90',
    tertiary: '#E9A6BD',
    glow: 'rgba(213, 127, 235, 0.4)',
    bgAccent: 'rgba(213, 127, 235, 0.08)'
  },
  default: {
    id: 'default',
    name: 'Emerald',
    primary: '#1ED760',
    secondary: '#32EBB0',
    tertiary: '#9BFF19',
    glow: 'rgba(30, 215, 96, 0.4)',
    bgAccent: 'rgba(30, 215, 96, 0.08)'
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    primary: '#DB1500',
    secondary: '#FF6700',
    tertiary: '#ED3E00',
    glow: 'rgba(219, 21, 0, 0.4)',
    bgAccent: 'rgba(219, 21, 0, 0.08)'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    primary: '#6C5CE7',
    secondary: '#A29BFE',
    tertiary: '#4B3FCC',
    glow: 'rgba(108, 92, 231, 0.4)',
    bgAccent: 'rgba(108, 92, 231, 0.08)'
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    primary: '#FF6F91',
    secondary: '#FF9EB5',
    tertiary: '#E84A6F',
    glow: 'rgba(255, 111, 145, 0.4)',
    bgAccent: 'rgba(255, 111, 145, 0.08)'
  },
  solara: {
    id: 'solara',
    name: 'Solara',
    primary: '#EEC937',
    secondary: '#F8EF47',
    tertiary: '#E8AC2C',
    glow: 'rgba(238, 201, 55, 0.4)',
    bgAccent: 'rgba(238, 201, 55, 0.08)'
  },
  surge: {
    id: 'surge',
    name: 'Surge',
    primary: '#1964DB',
    secondary: '#008EF1',
    tertiary: '#1569ED',
    glow: 'rgba(25, 100, 219, 0.4)',
    bgAccent: 'rgba(25, 100, 219, 0.08)'
  },
  ashen: {
    id: 'ashen',
    name: 'Ashen',
    primary: '#FFFFFF',
    secondary: '#ADADAD',
    tertiary: '#BFBFBF',
    glow: 'rgba(255, 255, 255, 0.3)',
    bgAccent: 'rgba(255, 255, 255, 0.05)'
  }
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem('lyra_theme') || 'vinyl';
    } catch {
      return 'vinyl';
    }
  });

  const currentTheme = LYRA_THEMES[themeId] || LYRA_THEMES.vinyl;

  useEffect(() => {
    try {
      localStorage.setItem('lyra_theme', themeId);
    } catch {}

    const root = document.documentElement;
    root.style.setProperty('--color-theme-primary', currentTheme.primary);
    root.style.setProperty('--color-theme-secondary', currentTheme.secondary);
    root.style.setProperty('--color-theme-tertiary', currentTheme.tertiary);
    root.style.setProperty('--color-theme-glow', currentTheme.glow);
    root.style.setProperty('--color-theme-accent', currentTheme.bgAccent);
    root.style.setProperty('--color-brass', currentTheme.primary);
  }, [themeId, currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, themeId, setThemeId, themes: LYRA_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
