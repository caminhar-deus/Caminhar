/**
 * Design Tokens - Sizes
 * Tamanhos consistentes para componentes
 */

// Tamanhos para botões
export const buttonSize = {
  sm: {
    height: '2rem',      // 32px
    padding: '0 0.75rem', // 0 12px
    fontSize: '0.875rem', // 14px
  },
  md: {
    height: '2.5rem',     // 40px
    padding: '0 1rem',    // 0 16px
    fontSize: '0.875rem', // 14px
  },
  lg: {
    height: '3rem',       // 48px
    padding: '0 1.5rem',   // 0 24px
    fontSize: '1rem',     // 16px
  },
  xl: {
    height: '3.5rem',     // 56px
    padding: '0 2rem',     // 0 32px
    fontSize: '1.125rem', // 18px
  },
};

// Tamanhos para inputs
export const inputSize = {
  sm: {
    height: '2rem',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
  },
  md: {
    height: '2.5rem',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
  },
  lg: {
    height: '3rem',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
  },
};

// Tamanhos para cards
export const cardSize = {
  sm: {
    padding: '1rem',
    minWidth: '200px',
  },
  md: {
    padding: '1.5rem',
    minWidth: '280px',
  },
  lg: {
    padding: '2rem',
    minWidth: '360px',
  },
};

// Tamanhos para avatares
export const avatarSize = {
  xs: '1.5rem',  // 24px
  sm: '2rem',    // 32px
  md: '2.5rem',  // 40px
  lg: '3rem',    // 48px
  xl: '4rem',    // 64px
  '2xl': '5rem', // 80px
};

// Tamanhos para ícones
export const iconSize = {
  xs: '0.75rem',  // 12px
  sm: '1rem',     // 16px
  md: '1.25rem',  // 20px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '2.5rem', // 40px
};

// Tamanhos para spinners
export const spinnerSize = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
};

// Tamanhos para modais
export const modalSize = {
  sm: '400px',
  md: '500px',
  lg: '700px',
  xl: '900px',
  full: '100vw',
};

// Alturas para layouts
export const height = {
  header: {
    sm: '3.5rem',
    md: '4rem',
    lg: '5rem',
  },
  footer: {
    sm: '3rem',
    md: '4rem',
  },
  sidebar: {
    sm: '100vh',
    collapsed: '3rem',
  },
};

// Larguras para layouts
export const width = {
  sidebar: {
    sm: '240px',
    md: '280px',
    collapsed: '64px',
  },
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

export default {
  buttonSize,
  inputSize,
  cardSize,
  avatarSize,
  iconSize,
  spinnerSize,
  modalSize,
  height,
  width,
};
