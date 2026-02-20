/**
 * Design Tokens - Colors
 * Paleta inspirada no tema cristão/espiritual
 */

// Cores Primárias - Azul Serenidade
export const primary = {
  50: '#eff6ff',   // Azul muito claro
  100: '#dbeafe',  // Azul claro
  200: '#bfdbfe',  // Azul pastel
  300: '#93c5fd',  // Azul médio-claro
  400: '#60a5fa',  // Azul médio
  500: '#2563eb',  // Azul Serenidade (principal)
  600: '#1d4ed8',  // Azul escuro
  700: '#1e40af',  // Azul mais escuro
  800: '#1e3a8a',  // Azul profundo
  900: '#1e3a5f',  // Azul muito escuro
  950: '#172554',  // Azul quase preto
};

// Cores de Destaque - Dourado Luz
export const secondary = {
  50: '#fefdf9',
  100: '#fdf9ed',
  200: '#faf0c8',
  300: '#f5e398',
  400: '#edd15e',
  500: '#d4af37',  // Dourado Luz (principal)
  600: '#b5952f',
  700: '#967628',
  800: '#7d5f26',
  900: '#6a4f24',
  950: '#3d2a11',
};

// Cores de Superfície - Branco Pureza
export const neutral = {
  50: '#fafafa',   // Branco Pureza (fundo principal)
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
};

// Cores de Feedback
export const feedback = {
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',  // Verde Esperança
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Vermelho Atenção
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Âmbar Reflexão
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Azul Calma
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
};

// Cores Semânticas
export const semantic = {
  background: {
    primary: neutral[50],
    secondary: neutral[100],
    tertiary: neutral[200],
    inverse: neutral[900],
  },
  text: {
    primary: neutral[900],
    secondary: neutral[600],
    tertiary: neutral[400],
    inverse: neutral[50],
    link: primary[500],
    linkHover: primary[600],
  },
  border: {
    light: neutral[200],
    DEFAULT: neutral[300],
    dark: neutral[400],
  },
};

// Cores de Estado
export const state = {
  hover: {
    primary: primary[600],
    secondary: secondary[600],
    neutral: neutral[200],
  },
  active: {
    primary: primary[700],
    secondary: secondary[700],
    neutral: neutral[300],
  },
  focus: {
    primary: primary[500],
    ring: `0 0 0 3px ${primary[200]}`,
  },
  disabled: {
    background: neutral[200],
    text: neutral[400],
    border: neutral[200],
  },
};

// Cores do Tema Espiritual
export const spiritual = {
  light: '#fefdf9',     // Luz divina
  peace: '#e0f2f1',     // Paz interior
  faith: '#ede9f6',     // Fé
  hope: '#e8f5e9',      // Esperança
  love: '#fce4ec',      // Amor
  joy: '#fff8e1',       // Alegria
  wisdom: '#e3f2fd',    // Sabedoria
};

// Exportação padrão
export const colors = {
  primary,
  secondary,
  neutral,
  feedback,
  semantic,
  state,
  spiritual,
};

export default colors;
