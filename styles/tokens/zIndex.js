/**
 * Design Tokens - Z-Index
 * Sistema de camadas consistente
 */

export const zIndex = {
  // Base
  hide: -1,
  base: 0,
  docked: 10,
  
  // Elementos padrão
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  
  // Elementos flutuantes
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  
  // Especiais
  skipLink: 2000,
  loading: 2100,
  notification: 2200,
};

// Camadas semânticas
export const layer = {
  background: zIndex.base,
  content: 1,
  navigation: zIndex.sticky,
  overlay: zIndex.overlay,
  floating: zIndex.popover,
  important: zIndex.toast,
  critical: zIndex.notification,
};

export default {
  zIndex,
  layer,
};
