import React, { createContext, useContext, useState, useEffect } from 'react';

export const LYRA_THEMES = {
  vinyl: {
    id: 'vinyl',
    name: 'Gold Audiophile',
    category: 'Classique',
    desc: 'Ambiance cuivre chaleureuse et vinyle vintage',
    primary: '#c29e5a',
    secondary: '#e6dfd5',
    tertiary: '#3b2d1c',
    bg: '#0f0c08',
    cardBg: '#1a150e',
    glow: 'rgba(194, 158, 90, 0.4)',
    bgAccent: 'rgba(194, 158, 90, 0.08)'
  },
  default: {
    id: 'default',
    name: 'Spotify Dark',
    category: 'Moderne',
    desc: 'Vert emblématique sur fond sombre épuré',
    primary: '#1ED760',
    secondary: '#32EBB0',
    tertiary: '#9BFF19',
    bg: '#121212',
    cardBg: '#181818',
    glow: 'rgba(30, 215, 96, 0.4)',
    bgAccent: 'rgba(30, 215, 96, 0.08)'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'Futuriste',
    desc: 'Néon fuchsia vibrant et reflets néons synthwave',
    primary: '#FF007F',
    secondary: '#00F0FF',
    tertiary: '#9D00FF',
    bg: '#0a0512',
    cardBg: '#140c24',
    glow: 'rgba(255, 0, 127, 0.45)',
    bgAccent: 'rgba(255, 0, 127, 0.12)'
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier Cyan',
    category: 'Frais',
    desc: 'Teintes glaciales et reflets cyan vifs high-tech',
    primary: '#41CAF0',
    secondary: '#68FFE1',
    tertiary: '#44CEEF',
    bg: '#08131a',
    cardBg: '#0f202b',
    glow: 'rgba(65, 202, 240, 0.4)',
    bgAccent: 'rgba(65, 202, 240, 0.08)'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Purple',
    category: 'Sombre',
    desc: 'Violet néon profond et atmosphère veloutée',
    primary: '#6C5CE7',
    secondary: '#A29BFE',
    tertiary: '#4B3FCC',
    bg: '#0c0a1a',
    cardBg: '#14112a',
    glow: 'rgba(108, 92, 231, 0.4)',
    bgAccent: 'rgba(108, 92, 231, 0.08)'
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    category: 'Lumineux',
    desc: 'Aurore boréale aux tons rosés et dorés doux',
    primary: '#D57FEB',
    secondary: '#FCCB90',
    tertiary: '#E9A6BD',
    bg: '#140c18',
    cardBg: '#201326',
    glow: 'rgba(213, 127, 235, 0.4)',
    bgAccent: 'rgba(213, 127, 235, 0.08)'
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno Red',
    category: 'Intense',
    desc: 'Rouge feu électrique et braises incandescentes',
    primary: '#DB1500',
    secondary: '#FF6700',
    tertiary: '#ED3E00',
    bg: '#1a0604',
    cardBg: '#280b08',
    glow: 'rgba(219, 21, 0, 0.4)',
    bgAccent: 'rgba(219, 21, 0, 0.08)'
  },
  solara: {
    id: 'solara',
    name: 'Solara Amber',
    category: 'Chaud',
    desc: 'Or solaire éclatant et teintes cuivrées',
    primary: '#EEC937',
    secondary: '#F8EF47',
    tertiary: '#E8AC2C',
    bg: '#141207',
    cardBg: '#211d0b',
    glow: 'rgba(238, 201, 55, 0.4)',
    bgAccent: 'rgba(238, 201, 55, 0.08)'
  },
  surge: {
    id: 'surge',
    name: 'Electric Blue',
    category: 'Futuriste',
    desc: 'Bleu cobalt électrique dynamique',
    primary: '#1964DB',
    secondary: '#008EF1',
    tertiary: '#1569ED',
    bg: '#060e1e',
    cardBg: '#0d1a33',
    glow: 'rgba(25, 100, 219, 0.4)',
    bgAccent: 'rgba(25, 100, 219, 0.08)'
  },
  ashen: {
    id: 'ashen',
    name: 'Ashen Platinum',
    category: 'Minimal',
    desc: 'Monochrome monochrome platine et blanc pur',
    primary: '#FFFFFF',
    secondary: '#ADADAD',
    tertiary: '#BFBFBF',
    bg: '#121212',
    cardBg: '#1c1c1c',
    glow: 'rgba(255, 255, 255, 0.3)',
    bgAccent: 'rgba(255, 255, 255, 0.05)'
  }
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => {
    try {
      return localStorage.getItem('lyra_theme') || 'vinyl';
    } catch {
      return 'vinyl';
    }
  });

  const [glowEnabled, setGlowEnabledState] = useState(() => {
    try {
      const val = localStorage.getItem('lyra_glow_enabled');
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  });

  const currentTheme = LYRA_THEMES[themeId] || LYRA_THEMES.vinyl;

  const setThemeId = (id) => {
    if (LYRA_THEMES[id]) {
      setThemeIdState(id);
    }
  };

  const setGlowEnabled = (enabled) => {
    setGlowEnabledState(enabled);
  };

  useEffect(() => {
    try {
      localStorage.setItem('lyra_theme', themeId);
    } catch {}

    try {
      localStorage.setItem('lyra_glow_enabled', JSON.stringify(glowEnabled));
    } catch {}

    const root = document.documentElement;
    root.style.setProperty('--color-theme-primary', currentTheme.primary);
    root.style.setProperty('--color-theme-secondary', currentTheme.secondary);
    root.style.setProperty('--color-theme-tertiary', currentTheme.tertiary);
    root.style.setProperty('--color-theme-glow', glowEnabled ? currentTheme.glow : 'transparent');
    root.style.setProperty('--color-theme-accent', currentTheme.bgAccent);
    root.style.setProperty('--color-theme-bg', currentTheme.bg);
    root.style.setProperty('--color-theme-card-bg', currentTheme.cardBg);
    root.style.setProperty('--color-canvas', currentTheme.bg);
    root.style.setProperty('--color-panel', currentTheme.cardBg);
    root.style.setProperty('--color-brass', currentTheme.primary);
    
    // Smooth transition on body
    document.body.style.backgroundColor = currentTheme.bg;
    document.body.style.color = '#ffffff';
  }, [themeId, glowEnabled, currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, themeId, setThemeId, glowEnabled, setGlowEnabled, themes: LYRA_THEMES }}>
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
