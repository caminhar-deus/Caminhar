/**
 * Gerador de CSS Custom Properties a partir dos Design Tokens
 * 
 * Uso: importar e executar generateTokensCSS() para obter o CSS completo
 * ou importar direto o arquivo gerado variables.css
 */

import {
  primary, secondary, neutral, feedback, semantic, state, spiritual
} from './tokens/colors';

import {
  spacing, space, section, gap, padding, margin
} from './tokens/spacing';

import {
  fontFamily, fontSize, fontWeight, lineHeight, letterSpacing
} from './tokens/typography';

import {
  borderWidth, borderStyle, borderRadius
} from './tokens/borders';

import {
  shadow, shadows
} from './tokens/shadows';

import {
  breakpoints, container
} from './tokens/breakpoints';

import {
  duration, easing, transition
} from './tokens/animations';

import {
  opacity, alpha
} from './tokens/opacity';

import {
  zIndex, layer
} from './tokens/zIndex';

/**
 * Gera uma string CSS com todas as custom properties a partir dos tokens
 * @returns {string} CSS content with :root variables
 */
export function generateTokensCSS() {
  const lines = [];
  
  lines.push('/* =============================================');
  lines.push(' * Design Tokens - CSS Custom Properties');
  lines.push(' * Gerado automaticamente a partir de /pages/styles/tokens/');
  lines.push(' * ============================================= */');
  lines.push('');
  lines.push(':root {');
  
  // ── Colors: Primary ──
  lines.push('  /* ── Primary Colors ── */');
  Object.entries(primary).forEach(([key, value]) => {
    lines.push(`  --color-primary-${key}: ${value};`);
  });
  
  // ── Colors: Secondary ──
  lines.push('  /* ── Secondary Colors ── */');
  Object.entries(secondary).forEach(([key, value]) => {
    lines.push(`  --color-secondary-${key}: ${value};`);
  });
  
  // ── Colors: Neutral ──
  lines.push('  /* ── Neutral Colors ── */');
  Object.entries(neutral).forEach(([key, value]) => {
    lines.push(`  --color-neutral-${key}: ${value};`);
  });
  
  // ── Colors: Feedback ──
  lines.push('  /* ── Feedback Colors ── */');
  Object.entries(feedback).forEach(([type, shades]) => {
    Object.entries(shades).forEach(([key, value]) => {
      lines.push(`  --color-${type}-${key}: ${value};`);
    });
  });
  
  // ── Colors: Semantic ──
  lines.push('  /* ── Semantic Colors ── */');
  if (semantic.background) {
    lines.push(`  --color-bg-primary: ${semantic.background.primary};`);
    lines.push(`  --color-bg-secondary: ${semantic.background.secondary};`);
    lines.push(`  --color-bg-tertiary: ${semantic.background.tertiary};`);
    lines.push(`  --color-bg-inverse: ${semantic.background.inverse};`);
  }
  if (semantic.text) {
    lines.push(`  --color-text-primary: ${semantic.text.primary};`);
    lines.push(`  --color-text-secondary: ${semantic.text.secondary};`);
    lines.push(`  --color-text-tertiary: ${semantic.text.tertiary};`);
    lines.push(`  --color-text-inverse: ${semantic.text.inverse};`);
    lines.push(`  --color-text-link: ${semantic.text.link};`);
    lines.push(`  --color-text-link-hover: ${semantic.text.linkHover};`);
  }
  if (semantic.border) {
    lines.push(`  --color-border-light: ${semantic.border.light};`);
    lines.push(`  --color-border-default: ${semantic.border.DEFAULT};`);
    lines.push(`  --color-border-dark: ${semantic.border.dark};`);
  }
  
  // ── Colors: State ──
  lines.push('  /* ── State Colors ── */');
  Object.entries(state).forEach(([stateName, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      const varName = key === 'ring' ? 'focus-ring' : `${stateName}-${key}`;
      lines.push(`  --color-${varName}: ${value};`);
    });
  });
  
  // ── Colors: Spiritual ──
  lines.push('  /* ── Spiritual Colors ── */');
  Object.entries(spiritual).forEach(([key, value]) => {
    lines.push(`  --color-spiritual-${key}: ${value};`);
  });
  
  // ── Spacing ──
  lines.push('');
  lines.push('  /* ── Spacing ── */');
  Object.entries(spacing).forEach(([key, value]) => {
    lines.push(`  --spacing-${key}: ${value};`);
  });
  
  // ── Spacing Semântico ──
  lines.push('  /* ── Spacing Semântico ── */');
  Object.entries(space).forEach(([key, value]) => {
    lines.push(`  --space-${key}: ${value};`);
  });
  
  // ── Section ──
  Object.entries(section).forEach(([key, value]) => {
    lines.push(`  --section-${key}: ${value};`);
  });
  
  // ── Gap ──
  Object.entries(gap).forEach(([key, value]) => {
    lines.push(`  --gap-${key}: ${value};`);
  });
  
  // ── Padding ──
  Object.entries(padding).forEach(([component, sizes]) => {
    Object.entries(sizes).forEach(([size, value]) => {
      lines.push(`  --padding-${component}-${size}: ${value};`);
    });
  });
  
  // ── Margin ──
  Object.entries(margin).forEach(([key, value]) => {
    lines.push(`  --margin-${key}: ${value};`);
  });
  
  // ── Typography ──
  lines.push('');
  lines.push('  /* ── Typography ── */');
  
  // Font Family
  Object.entries(fontFamily).forEach(([key, value]) => {
    lines.push(`  --font-family-${key}: ${value};`);
  });
  
  // Font Size
  Object.entries(fontSize).forEach(([key, value]) => {
    lines.push(`  --font-size-${key}: ${value};`);
  });
  
  // Font Weight
  Object.entries(fontWeight).forEach(([key, value]) => {
    lines.push(`  --font-weight-${key}: ${value};`);
  });
  
  // Line Height
  Object.entries(lineHeight).forEach(([key, value]) => {
    lines.push(`  --line-height-${key}: ${value};`);
  });
  
  // Letter Spacing
  Object.entries(letterSpacing).forEach(([key, value]) => {
    lines.push(`  --letter-spacing-${key}: ${value};`);
  });
  
  // ── Borders ──
  lines.push('');
  lines.push('  /* ── Borders ── */');
  Object.entries(borderWidth).forEach(([key, value]) => {
    lines.push(`  --border-width-${key}: ${value};`);
  });
  lines.push(`  --border-style: ${borderStyle.solid};`);
  Object.entries(borderRadius).forEach(([key, value]) => {
    const varKey = key === 'DEFAULT' ? 'default' : key;
    lines.push(`  --border-radius-${varKey}: ${value};`);
  });
  
  // ── Shadows ──
  lines.push('');
  lines.push('  /* ── Shadows ── */');
  Object.entries(shadow).forEach(([key, value]) => {
    const varKey = key === 'DEFAULT' ? 'default' : key;
    lines.push(`  --shadow-${varKey}: ${value};`);
  });
  Object.entries(shadows).forEach(([key, value]) => {
    lines.push(`  --shadow-${key}: ${value};`);
  });
  
  // ── Breakpoints ──
  lines.push('');
  lines.push('  /* ── Breakpoints ── */');
  Object.entries(breakpoints).forEach(([key, value]) => {
    lines.push(`  --breakpoint-${key}: ${value}px;`);
  });
  Object.entries(container).forEach(([key, value]) => {
    lines.push(`  --container-${key}: ${value};`);
  });
  
  // ── Animations ──
  lines.push('');
  lines.push('  /* ── Animation ── */');
  Object.entries(duration).forEach(([key, value]) => {
    lines.push(`  --duration-${key}: ${value};`);
  });
  Object.entries(easing).forEach(([key, value]) => {
    lines.push(`  --easing-${key}: ${value};`);
  });
  Object.entries(transition).forEach(([key, value]) => {
    const varKey = key === 'DEFAULT' ? 'default' : key;
    lines.push(`  --transition-${varKey}: ${value};`);
  });
  
  // ── Opacity ──
  lines.push('');
  lines.push('  /* ── Opacity ── */');
  Object.entries(opacity).forEach(([key, value]) => {
    lines.push(`  --opacity-${key}: ${value};`);
  });
  Object.entries(alpha).forEach(([key, value]) => {
    lines.push(`  --alpha-${key}: ${value};`);
  });
  
  // ── Z-Index ──
  lines.push('');
  lines.push('  /* ── Z-Index ── */');
  Object.entries(zIndex).forEach(([key, value]) => {
    lines.push(`  --z-${key}: ${value};`);
  });
  Object.entries(layer).forEach(([key, value]) => {
    lines.push(`  --layer-${key}: ${value};`);
  });
  
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Exporta o CSS completo para uso programático
 */
export const tokensCSS = generateTokensCSS();

export default tokensCSS;