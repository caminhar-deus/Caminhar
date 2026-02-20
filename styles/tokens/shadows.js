/**
 * Design Tokens - Shadows
 * Sistema de sombras consistente
 */

// Sombras base
export const shadow = {
  none: '0 0 #0000',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  glow: '0 0 15px rgba(37, 99, 235, 0.3)',
};

// Sombras de elevação (níveis)
export const elevation = {
  0: shadow.none,
  1: shadow.xs,
  2: shadow.sm,
  3: shadow.DEFAULT,
  4: shadow.md,
  5: shadow.lg,
  6: shadow.xl,
};

// Sombras semânticas
export const shadows = {
  sm: shadow.sm,
  DEFAULT: shadow.DEFAULT,
  md: shadow.md,
  lg: shadow.lg,
  xl: shadow.xl,
  // Aliases semânticos
  card: shadow.DEFAULT,
  cardHover: shadow.md,
  button: shadow.sm,
  buttonHover: shadow.DEFAULT,
  input: shadow.inner,
  inputFocus: `0 0 0 3px rgba(37, 99, 235, 0.1), ${shadow.sm}`,
  dropdown: shadow.md,
  modal: shadow.lg,
  tooltip: shadow.md,
  toast: shadow.lg,
  avatar: shadow.sm,
  glow: shadow.glow,
  glowPrimary: '0 0 20px rgba(37, 99, 235, 0.4)',
  glowSecondary: '0 0 20px rgba(212, 175, 55, 0.4)',
};

// Sombras de cor
export const coloredShadows = {
  primary: {
    sm: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
    md: '0 10px 15px -3px rgba(37, 99, 235, 0.2)',
    lg: '0 20px 25px -5px rgba(37, 99, 235, 0.2)',
  },
  secondary: {
    sm: '0 4px 6px -1px rgba(212, 175, 55, 0.2)',
    md: '0 10px 15px -3px rgba(212, 175, 55, 0.2)',
    lg: '0 20px 25px -5px rgba(212, 175, 55, 0.2)',
  },
  success: {
    sm: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
    md: '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
  },
  error: {
    sm: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
    md: '0 10px 15px -3px rgba(239, 68, 68, 0.2)',
  },
};

// Drop shadows para SVG/filtros
export const dropShadow = {
  sm: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))',
  DEFAULT: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
  md: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))',
  lg: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.1))',
};

export default {
  shadow,
  elevation,
  shadows,
  coloredShadows,
  dropShadow,
};
