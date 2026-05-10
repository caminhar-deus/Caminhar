/**
 * Design Tokens - Spacing
 * Sistema de espaçamento consistente baseado em 4px
 */

// Escala base de 4px
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
};

// Aliases semânticos
export const space = {
  none: spacing[0],
  xxs: spacing[1],   // 4px
  xs: spacing[2],    // 8px
  sm: spacing[3],    // 12px
  md: spacing[4],    // 16px
  lg: spacing[6],    // 24px
  xl: spacing[8],    // 32px
  '2xl': spacing[12], // 48px
  '3xl': spacing[16], // 64px
  '4xl': spacing[24], // 96px
  '5xl': spacing[32], // 128px
  '6xl': spacing[40], // 160px
  '7xl': spacing[48], // 192px
  '8xl': spacing[64], // 256px
};

// Espaçamento de seções
export const section = {
  sm: spacing[12],   // 48px
  md: spacing[16],   // 64px
  lg: spacing[24],   // 96px
  xl: spacing[32],   // 128px
};

// Gap para layouts
export const gap = {
  none: spacing[0],
  xs: spacing[2],    // 8px
  sm: spacing[3],    // 12px
  md: spacing[4],    // 16px
  lg: spacing[6],    // 24px
  xl: spacing[8],    // 32px
  '2xl': spacing[12], // 48px
};

// Padding consistente
export const padding = {
  button: {
    sm: `${spacing[1.5]} ${spacing[3]}`,   // 6px 12px
    md: `${spacing[2.5]} ${spacing[4]}`,   // 10px 16px
    lg: `${spacing[3]} ${spacing[6]}`,     // 12px 24px
  },
  input: {
    sm: `${spacing[1.5]} ${spacing[3]}`,   // 6px 12px
    md: `${spacing[2.5]} ${spacing[3]}`,   // 10px 12px
    lg: `${spacing[3]} ${spacing[4]}`,     // 12px 16px
  },
  card: {
    sm: spacing[4],    // 16px
    md: spacing[6],    // 24px
    lg: spacing[8],    // 32px
  },
  container: {
    sm: spacing[4],    // 16px
    md: spacing[6],    // 24px
    lg: spacing[8],    // 32px
    xl: spacing[12],   // 48px
  },
};

// Margin helpers
export const margin = {
  auto: 'auto',
  none: spacing[0],
  xs: spacing[2],
  sm: spacing[3],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  '2xl': spacing[12],
};

export default {
  spacing,
  space,
  section,
  gap,
  padding,
  margin,
};
