import { useCallback, useEffect, useMemo, useState } from 'react';
import tokens from '../pages/styles/tokens';
import { useThrottle } from './useThrottle';

/**
 * Converte cor hex para rgba.
 * Função utilitária pura, testável e reutilizável fora do hook.
 *
 * @param {string} hex - Cor em formato hexadecimal (ex: "#ff0000")
 * @param {number} alpha - Opacidade entre 0 e 1
 * @returns {string} Cor no formato rgba
 */
function hexToRgba(hex, alpha) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * @typedef {Object} ThemeReturn
 * @property {string} theme - Tema atual ("light" | "dark")
 * @property {boolean} isDark - Se o tema escuro está ativo
 * @property {boolean} isLight - Se o tema claro está ativo
 * @property {boolean} mounted - Se o hook já foi montado (SSR guard)
 * @property {function} toggleTheme - Alterna entre light/dark com throttle de 300ms
 * @property {function} setTheme - Define tema específico
 * @property {Object} tokens - Tokens completos de design
 * @property {Object} colors - Tokens de cor
 * @property {Object} spacing - Tokens de espaçamento
 * @property {Object} typography - Tokens de tipografia
 * @property {Object} borders - Tokens de bordas
 * @property {Object} shadows - Tokens de sombras
 * @property {Object} breakpoints - Tokens de breakpoints
 * @property {Object} animations - Tokens de animação
 * @property {function} getColor - Obtém cor com opacidade opcional
 * @property {function} getSpacing - Obtém valor de espaçamento
 * @property {function} getFontSize - Obtém tamanho de fonte
 * @property {function} getShadow - Obtém sombra
 * @property {function} getRadius - Obtém raio de borda
 * @property {function} getBreakpoint - Obtém valor de breakpoint
 * @property {boolean} isMobile - Se a viewport é mobile
 * @property {boolean} isTablet - Se a viewport é tablet
 * @property {boolean} isDesktop - Se a viewport é desktop
 */

/**
 * useTheme - Hook para acessar tokens e gerenciar tema
 * @returns {ThemeReturn} - Tokens e funções de tema
 */
export const useTheme = () => {
  // Estado do tema (light/dark)
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Estado reativo para largura da viewport
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

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

  // Monitorar resize da viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

    // Dispara evento customizado para código fora do React
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
  }, [theme, mounted]);

  // Toggle tema com throttle para prevenir múltiplas trocas rápidas
  const toggleTheme = useThrottle(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, 300);

  // Valores booleanos reativos de viewport
  const md = tokens.breakpoints.breakpoints.md;
  const lg = tokens.breakpoints.breakpoints.lg;

  const isMobile = windowWidth > 0 && windowWidth < md;
  const isTablet = windowWidth >= md && windowWidth < lg;
  const isDesktop = windowWidth >= lg;

  // Helper para obter cor com opacidade
  const getColor = useCallback((path, alpha = 1) => {
    const keys = path.split('.');
    let color = tokens.colors;
    
    for (const key of keys) {
      color = color?.[key];
      if (!color) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useTheme] Token de cor não encontrado: "${path}"`);
        }
        return null;
      }
    }
    
    if (typeof color !== 'string') return color;
    
    if (alpha < 1) {
      return hexToRgba(color, alpha);
    }
    
    return color;
  }, []);

  // Helper para spacing
  const getSpacing = useCallback((key) => {
    const value = tokens.spacing.space[key] || tokens.spacing.spacing[key];
    if (!value && process.env.NODE_ENV === 'development') {
      console.warn(`[useTheme] Token de espaçamento não encontrado: "${key}"`);
    }
    return value || key;
  }, []);

  // Helper para font size
  const getFontSize = useCallback((key) => {
    const value = tokens.typography.fontSize[key];
    if (!value && process.env.NODE_ENV === 'development') {
      console.warn(`[useTheme] Token de tamanho de fonte não encontrado: "${key}"`);
    }
    return value || key;
  }, []);

  // Helper para shadow
  const getShadow = useCallback((key) => {
    const value = tokens.shadows.shadows[key] || tokens.shadows.shadow[key];
    if (!value && process.env.NODE_ENV === 'development') {
      console.warn(`[useTheme] Token de sombra não encontrado: "${key}"`);
    }
    return value || key;
  }, []);

  // Helper para border radius
  const getRadius = useCallback((key) => {
    const value = tokens.borders.radius[key] || tokens.borders.borderRadius[key];
    if (!value && process.env.NODE_ENV === 'development') {
      console.warn(`[useTheme] Token de raio de borda não encontrado: "${key}"`);
    }
    return value || key;
  }, []);

  // Helper para breakpoint
  const getBreakpoint = useCallback((key) => {
    return tokens.breakpoints.breakpoints[key];
  }, []);

  return useMemo(() => ({
    // Estado
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted,
    
    // Ações
    toggleTheme,
    setTheme,
    
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
  }), [
    theme,
    mounted,
    toggleTheme,
    tokens,
    getColor,
    getSpacing,
    getFontSize,
    getShadow,
    getRadius,
    getBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
  ]);
};

export default useTheme;