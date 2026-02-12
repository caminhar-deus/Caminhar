import { useCallback, useEffect, useState } from 'react';
import tokens from '../styles/tokens';

/**
 * useTheme - Hook para acessar tokens e gerenciar tema
 * @returns {object} - Tokens e funções de tema
 */
export const useTheme = () => {
  // Estado do tema (light/dark)
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Detectar preferência do sistema
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    }
  }, []);

  // Aplicar tema
  useEffect(() => {
    if (!mounted) return;
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, mounted]);

  // Toggle tema
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, []);

  // Set tema específico
  const setThemeValue = useCallback((newTheme) => {
    setTheme(newTheme);
  }, []);

  // Helper para obter cor com opacidade
  const getColor = useCallback((path, alpha = 1) => {
    const keys = path.split('.');
    let color = tokens.colors;
    
    for (const key of keys) {
      color = color?.[key];
      if (!color) return null;
    }
    
    if (typeof color !== 'string') return color;
    
    if (alpha < 1) {
      // Converte hex para rgba
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return color;
  }, []);

  // Helper para spacing
  const getSpacing = useCallback((key) => {
    return tokens.spacing.space[key] || tokens.spacing.spacing[key] || key;
  }, []);

  // Helper para font size
  const getFontSize = useCallback((key) => {
    return tokens.typography.fontSize[key] || key;
  }, []);

  // Helper para shadow
  const getShadow = useCallback((key) => {
    return tokens.shadows.shadows[key] || tokens.shadows.shadow[key] || key;
  }, []);

  // Helper para border radius
  const getRadius = useCallback((key) => {
    return tokens.borders.radius[key] || tokens.borders.borderRadius[key] || key;
  }, []);

  // Helper para breakpoint
  const getBreakpoint = useCallback((key) => {
    return tokens.breakpoints.breakpoints[key];
  }, []);

  // Verificar media query
  const isMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < tokens.breakpoints.breakpoints.md;
  }, []);

  const isTablet = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width >= tokens.breakpoints.breakpoints.md && width < tokens.breakpoints.breakpoints.lg;
  }, []);

  const isDesktop = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= tokens.breakpoints.breakpoints.lg;
  }, []);

  return {
    // Estado
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted,
    
    // Ações
    toggleTheme,
    setTheme: setThemeValue,
    
    // Tokens completos
    tokens,
    colors: tokens.colors,
    spacing: tokens.spacing,
    typography: tokens.typography,
    borders: tokens.borders,
    shadows: tokens.shadows,
    breakpoints: tokens.breakpoints,
    animations: tokens.animations,
    
    // Helpers
    getColor,
    getSpacing,
    getFontSize,
    getShadow,
    getRadius,
    getBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
  };
};

export default useTheme;
