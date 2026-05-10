/**
 * Design Tokens - Animations
 * Sistema de animações consistente
 */

// Durações
export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '150ms',
  moderate: '200ms',
  slow: '300ms',
  slower: '500ms',
  slowest: '700ms',
};

// Easings
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Cubic beziers
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Transições comuns
export const transition = {
  fast: `${duration.fast} ${easing.standard}`,
  DEFAULT: `${duration.normal} ${easing.standard}`,
  slow: `${duration.slow} ${easing.standard}`,
  slower: `${duration.slower} ${easing.standard}`,
  // Específicas
  color: `color ${duration.normal} ${easing.standard}`,
  background: `background-color ${duration.normal} ${easing.standard}`,
  border: `border-color ${duration.normal} ${easing.standard}`,
  transform: `transform ${duration.slow} ${easing.spring}`,
  opacity: `opacity ${duration.normal} ${easing.standard}`,
  shadow: `box-shadow ${duration.normal} ${easing.standard}`,
  all: `all ${duration.normal} ${easing.standard}`,
};

// Keyframes
export const keyframes = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  slideInUp: `
    @keyframes slideInUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  slideInDown: `
    @keyframes slideInDown {
      from { 
        opacity: 0;
        transform: translateY(-20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  slideInLeft: `
    @keyframes slideInLeft {
      from { 
        opacity: 0;
        transform: translateX(-20px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from { 
        opacity: 0;
        transform: translateX(20px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.9);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  ripple: `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `,
};

// Animações prontas
export const animation = {
  fadeIn: 'fadeIn 0.3s ease-out',
  fadeOut: 'fadeOut 0.2s ease-in',
  slideInUp: 'slideInUp 0.4s ease-out',
  slideInDown: 'slideInDown 0.4s ease-out',
  slideInLeft: 'slideInLeft 0.4s ease-out',
  slideInRight: 'slideInRight 0.4s ease-out',
  scaleIn: 'scaleIn 0.3s ease-out',
  pulse: 'pulse 2s ease-in-out infinite',
  spin: 'spin 1s linear infinite',
  bounce: 'bounce 1s ease-in-out infinite',
  shimmer: 'shimmer 2s linear infinite',
  ripple: 'ripple 0.6s linear',
};

// Animações de entrada para listas
export const stagger = {
  fast: 50,
  DEFAULT: 100,
  slow: 150,
  slower: 200,
};

export default {
  duration,
  easing,
  transition,
  keyframes,
  animation,
  stagger,
};
