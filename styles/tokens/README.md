# Design Tokens - O Caminhar com Deus

Sistema completo de tokens de design para o site "O Caminhar com Deus".

## Estrutura

```
tokens/
├── colors.js      # Paleta de cores completa
├── spacing.js     # Espaçamentos e paddings
├── typography.js  # Tipografia
├── borders.js     # Bordas e raios
├── shadows.js     # Sombras
├── breakpoints.js # Pontos de quebra
├── animations.js  # Animações e transições
├── zIndex.js      # Camadas z-index
├── sizes.js       # Tamanhos de componentes
├── opacity.js     # Opacidades
└── index.js       # Exportações centralizadas
```

## Cores

### Primárias (Azul Serenidade)
```javascript
import { colors } from './tokens';

colors.primary[500]  // #2563eb - Cor principal
```

### Secundárias (Dourado Luz)
```javascript
colors.secondary[500]  // #d4af37 - Dourado divino
```

### Feedback
- `success` - Verde esperança (#10B981)
- `error` - Vermelho atenção (#EF4444)
- `warning` - Âmbar reflexão (#F59E0B)
- `info` - Azul calma (#3B82F6)

### Espirituais
```javascript
colors.spiritual.light   // Luz divina
colors.spiritual.peace   // Paz interior
colors.spiritual.faith   // Fé
colors.spiritual.hope    // Esperança
colors.spiritual.love    // Amor
```

## Uso Básico

```javascript
import tokens from '@/styles/tokens';

// Acessar cores
const primaryColor = tokens.colors.primary[500];

// Acessar espaçamentos
const padding = tokens.spacing.space.md;

// Acessar tipografia
const fontSize = tokens.typography.fontSize.lg;
```

## Integração com CSS

As variáveis CSS em `globals-refactored.css` usam estes tokens como base.

```css
.my-component {
  color: var(--color-primary-500);
  padding: var(--space-4);
  font-size: var(--font-size-base);
}
```
