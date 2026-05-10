/**
 * Design Tokens - Borders
 * Sistema de bordas e raios consistente
 */

// Larguras de borda
export const borderWidth = {
  0: '0px',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
};

// Estilos de borda
export const borderStyle = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
  hidden: 'hidden',
  none: 'none',
};

// Raios de borda
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',     // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
};

// Bordas predefinidas
export const border = {
  none: {
    borderWidth: borderWidth[0],
  },
  thin: {
    borderWidth: borderWidth[1],
    borderStyle: borderStyle.solid,
  },
  medium: {
    borderWidth: borderWidth[2],
    borderStyle: borderStyle.solid,
  },
  thick: {
    borderWidth: borderWidth[4],
    borderStyle: borderStyle.solid,
  },
};

// Raios semânticos
export const radius = {
  none: borderRadius.none,
  sm: borderRadius.sm,
  DEFAULT: borderRadius.DEFAULT,
  md: borderRadius.md,
  lg: borderRadius.lg,
  xl: borderRadius.xl,
  '2xl': borderRadius['2xl'],
  '3xl': borderRadius['3xl'],
  full: borderRadius.full,
  // Aliases semânticos
  button: borderRadius.lg,
  card: borderRadius.xl,
  input: borderRadius.lg,
  badge: borderRadius.full,
  avatar: borderRadius.full,
  modal: borderRadius['2xl'],
  tooltip: borderRadius.md,
};

// Bordas de foco
export const focusRing = {
  offset: '2px',
  width: '2px',
  style: 'solid',
  color: 'var(--color-primary-500)',
};

export default {
  borderWidth,
  borderStyle,
  borderRadius,
  border,
  radius,
  focusRing,
};
