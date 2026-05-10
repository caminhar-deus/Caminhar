/**
 * Design Tokens - Opacity
 * Níveis de opacidade consistentes
 */

export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
};

// Opacidades semânticas
export const alpha = {
  disabled: opacity[50],
  muted: opacity[60],
  subtle: opacity[40],
  ghost: opacity[20],
  hover: opacity[80],
  active: opacity[100],
  backdrop: opacity[50],
  overlay: opacity[70],
  scrim: opacity[60],
};

// Cores com opacidade (para usar com CSS variables ou rgba)
export const withOpacity = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default {
  opacity,
  alpha,
  withOpacity,
};
