# Design Tokens

Guia rápido para os tokens de design (cores, espaçamentos, fontes) utilizados no projeto. Os tokens garantem consistência visual e facilitam a manutenção do estilo da aplicação.

## Como Usar

Todos os tokens estão centralizados e podem ser importados diretamente no seu componente JavaScript/React.

```javascript
import tokens from '@/styles/tokens';

function MeuComponente() {
  return (
    <div style={{ 
      backgroundColor: tokens.colors.primary.main,
      padding: tokens.spacing.md,
      fontSize: tokens.typography.fontSize.lg,
      borderRadius: tokens.borders.radius.md,
    }}>
      Conteúdo
    </div>
  );
}
```

## Referência de Tokens

### Cores (`tokens.colors`)

| Categoria | Token | Valor | Descrição |
|---|---|---|---|
| **Primária** | `primary.main` | `#2563eb` | Azul principal, usado em botões e links. |
| **Secundária** | `secondary.main` | `#d4af37` | Dourado, para detalhes e destaques. |
| **Feedback** | `success` | `#10B981` | Verde para sucesso. |
| | `error` | `#EF4444` | Vermelho para erros. |
| | `warning` | `#F59E0B` | Âmbar para avisos. |
| **Texto** | `text.primary` | `#111827` | Cor principal para textos. |
| | `text.secondary` | `#6B7280` | Cor para textos secundários. |
| **Fundo** | `background.default` | `#FFFFFF` | Fundo principal da página. |
| | `background.paper` | `#F9FAFB` | Fundo para cards e seções. |

### Espaçamentos (`tokens.spacing`)

Use para `padding`, `margin` e `gap`.

- `tokens.spacing.xs` (4px)
- `tokens.spacing.sm` (8px)
- `tokens.spacing.md` (16px)
- `tokens.spacing.lg` (24px)
- `tokens.spacing.xl` (32px)

### Tipografia (`tokens.typography`)

- **Font Family**: `tokens.typography.fontFamily.sans`
- **Font Size**: `sm`, `base`, `lg`, `xl`
- **Font Weight**: `normal`, `medium`, `bold`

## Integração com CSS

Os tokens também são expostos como variáveis CSS globais para uso direto em arquivos `.css`.

```css
.meu-componente {
  background-color: var(--color-primary-main);
  padding: var(--spacing-md);
  font-size: var(--font-size-lg);
}
```