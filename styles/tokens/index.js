/**
 * Design Tokens - Índice Centralizado
 * Exporta todos os tokens de design
 */

// Tokens individuais
export { colors, primary, secondary, neutral, feedback, semantic, state, spiritual } from './colors';
export { spacing, space, section, gap, padding, margin } from './spacing';
export { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textStyle, fontWeightSemantic } from './typography';
export { borderWidth, borderStyle, borderRadius, border, radius, focusRing } from './borders';
export { shadow, elevation, shadows, coloredShadows, dropShadow } from './shadows';
export { breakpoints, mediaQueries, container, breakpointValues, isMobile, isTablet, isDesktop, isLargeDesktop } from './breakpoints';
export { duration, easing, transition, keyframes, animation, stagger } from './animations';

// Objeto consolidado de tokens
import colorsTokens from './colors';
import spacingTokens from './spacing';
import typographyTokens from './typography';
import bordersTokens from './borders';
import shadowsTokens from './shadows';
import breakpointsTokens from './breakpoints';
import animationsTokens from './animations';

export const tokens = {
  colors: colorsTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
  borders: bordersTokens,
  shadows: shadowsTokens,
  breakpoints: breakpointsTokens,
  animations: animationsTokens,
};

export default tokens;
