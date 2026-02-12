/**
 * Design Tokens - Breakpoints
 * Pontos de quebra responsivos
 */

// Breakpoints em pixels
export const breakpoints = {
  sm: 640,    // Small devices (phones)
  md: 768,    // Medium devices (tablets)
  lg: 1024,   // Large devices (small laptops)
  xl: 1280,   // Extra large devices (desktops)
  '2xl': 1536, // Extra extra large devices (large desktops)
};

// Media queries prontas para uso
export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  // Max-width queries
  maxSm: `(max-width: ${breakpoints.sm - 1}px)`,
  maxMd: `(max-width: ${breakpoints.md - 1}px)`,
  maxLg: `(max-width: ${breakpoints.lg - 1}px)`,
  maxXl: `(max-width: ${breakpoints.xl - 1}px)`,
  // Range queries
  smOnly: `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  mdOnly: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lgOnly: `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
};

// Container widths
export const container = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
};

// Breakpoints para styled-components/emotion
export const breakpointValues = {
  sm: `${breakpoints.sm}px`,
  md: `${breakpoints.md}px`,
  lg: `${breakpoints.lg}px`,
  xl: `${breakpoints.xl}px`,
  '2xl': `${breakpoints['2xl']}px`,
};

// Helpers para JavaScript
export const isMobile = (width) => width < breakpoints.md;
export const isTablet = (width) => width >= breakpoints.md && width < breakpoints.lg;
export const isDesktop = (width) => width >= breakpoints.lg;
export const isLargeDesktop = (width) => width >= breakpoints.xl;

export default {
  breakpoints,
  mediaQueries,
  container,
  breakpointValues,
  isMobile,
  isTablet,
  isDesktop,
  isLargeDesktop,
};
