# Documentação Componentes UI
Projeto: Caminhar
Última atualização: 20/04/2026

---

## 📋 Sumário
1. [Alert](#alert)
2. [Badge](#badge)
3. [Button](#button)
4. [Card](#card)
5. [Input](#input)
6. [Modal](#modal)
7. [Select](#select)
8. [Spinner](#spinner)
9. [TextArea](#textarea)
10. [Toast](#toast)
11. [Index Export](#index)

---

---

## <a id="alert"></a> 🚨 Alert

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Alert.js` | Componente React | 96 |
| `/components/UI/Alert.module.css` | Estilos CSS Modules | 185 |

### 🎯 Propósito
Componente de alerta para exibição de mensagens de feedback, avisos, erros e informações ao usuário. Segue padrões de acessibilidade WCAG e implementa 4 estilos visuais diferentes.

### ✅ Principais Características
- ✅ 4 tipos de status: `info`, `success`, `warning`, `error`
- ✅ 4 variantes visuais: `subtle` (padrão), `solid`, `left-accent`, `top-accent`
- ✅ Ícones nativos padrão por status (sem dependências externas)
- ✅ Suporte a ícone customizado
- ✅ Funcionalidade de fechar com estado interno
- ✅ Acessibilidade nativa: `role="alert"` e `aria-live="polite"`
- ✅ Responsivo e acessível para leitores de tela

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `status` | string | `info` | Tipo de alerta |
| `variant` | string | `subtle` | Estilo visual |
| `title` | ReactNode | - | Título opcional do alerta |
| `children` | ReactNode | - | Conteúdo principal |
| `icon` | ReactNode | - | Ícone customizado (sobrescreve padrão) |
| `closable` | boolean | `false` | Habilita botão de fechar |
| `onClose` | function | - | Callback executado ao fechar |
| `className` | string | `''` | Classes CSS adicionais |

### 🎨 Estilos Implementados
| Variante | Descrição |
|----------|-----------|
| **Subtle** | Fundo claro suave, cor do texto em tom correspondente |
| **Solid** | Fundo totalmente colorido, texto branco |
| **Left Accent** | Borda lateral esquerda com cor do status |
| **Top Accent** | Borda superior com cor do status |

### 🧠 Arquitetura
- Gerencia estado de visibilidade internamente com `useState`
- Monta classes dinamicamente de forma declarativa
- Ícones SVG embutidos (zero dependências)
- Tratamento seguro de callback `onClose` com optional chaining
- Ajustes automáticos de layout quando não há título ou quando é fechável

---

---

## <a id="badge"></a> 🏷️ Badge

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Badge.js` | Componente React | 89 |
| `/components/UI/Badge.module.css` | Estilos CSS Modules | 215 |

### 🎯 Propósito
Componente versátil de insígnia, etiqueta e indicador. Utilizado para status, contadores, notificações, marcações e indicadores de estado.

### ✅ Principais Características
- ✅ 7 variantes de cor
- ✅ 3 tamanhos padrão: `sm`, `md`, `lg`
- ✅ Modo ponto indicador (`dot`)
- ✅ Animação pulsante para notificações
- ✅ Posicionamento absoluto pré-definido
- ✅ Sub-componentes pré-configurados: `Counter` e `Dot`
- ✅ Suporte a ícones esquerda e direita

### 🎛️ Propriedades Principal
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `variant` | string | `default` | Cor do badge |
| `size` | string | `md` | Tamanho |
| `leftIcon` | ReactNode | - | Ícone antes do conteúdo |
| `rightIcon` | ReactNode | - | Ícone depois do conteúdo |
| `pulse` | boolean | `false` | Habilita animação de pulso |
| `dot` | boolean | `false` | Renderiza apenas ponto sem texto |
| `position` | string | - | Posição absoluta: `top-right`, `top-left`, `bottom-right`, `bottom-left` |

### 📦 Sub-componentes Inclusos

#### 🔢 Badge.Counter
Especializado para contadores numéricos
- Limite máximo automático com `+` ex: `99+`
- Oculta automaticamente quando valor é 0
- Padrão variante `error` e tamanho `sm`

#### ⚫ Badge.Dot
Indicador de status visual apenas com ponto
- Por padrão com animação pulsante ativada
- Padrão variante `error`

### 🎨 Estilos Implementados
| Variante | Tipo |
|----------|------|
| `default`, `primary`, `secondary` | Cores base |
| `success`, `error`, `warning`, `info` | Cores de status |
| `outline` | Versão apenas com borda |
| `soft` | Versão fundo claro e texto colorido |

### 🧠 Arquitetura
- Componente composto e extensível
- Classes dinâmicas montadas por filtro booleano
- Sub-componentes anexados diretamente na exportação principal
- Animação CSS nativa sem biblioteca
- Transformação automática para posicionamento em cantos
- Tratamento de acessibilidade para modo dot

---

---

## <a id="button"></a> 🔘 Button

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Button.js` | Componente React | 75 |
| `/components/UI/Button.module.css` | Estilos CSS Modules | 194 |

### 🎯 Propósito
Componente base de botão padrão do Design System. Implementa todos estados, variantes e tamanhos seguindo guias de design e acessibilidade.

### ✅ Principais Características
- ✅ 6 variantes de cor: `primary`, `secondary`, `ghost`, `danger`, `success`, `warning`
- ✅ 4 tamanhos: `sm`, `md`, `lg`, `xl`
- ✅ Estado loading com spinner nativo
- ✅ Estado desabilitado
- ✅ Modo largura total
- ✅ Suporte a ícones esquerda e direita
- ✅ Animações de transição e feedback
- ✅ Acessibilidade: atributos ARIA (`aria-busy`, `aria-disabled`) como strings literais para compatibilidade máxima
- ✅ Foco visível para navegação por teclado

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `variant` | string | `primary` | Estilo visual do botão |
| `size` | string | `md` | Tamanho |
| `fullWidth` | boolean | `false` | Ocupa 100% da largura disponível |
| `disabled` | boolean | `false` | Desabilita interação |
| `loading` | boolean | `false` | Mostra spinner e desabilita |
| `leftIcon` | ReactNode | - | Ícone antes do texto |
| `rightIcon` | ReactNode | - | Ícone depois do texto |
| `type` | string | `button` | Tipo nativo do botão |
| `onClick` | function | - | Handler de clique |

### 🎨 Comportamento Visual
- Transições suaves de 150ms em todos estados
- Efeito de elevação no hover
- Deslocamento de 1px no clique ativo
- Outline de foco acessível
- Spinner centralizado automaticamente no loading
- Conteúdo fica invisível durante loading mantendo dimensões

---

---

## <a id="card"></a> 🃏 Card

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Card.js` | Componente React | 107 |
| `/components/UI/Card.module.css` | Estilos CSS Modules | 192 |

### 🎯 Propósito
Componente container versátil para exibição de conteúdo agrupado. Suporta estrutura flexível com mídia, cabeçalho, conteúdo e rodapé.

### ✅ Principais Características
- ✅ 4 variantes: `default`, `outlined`, `filled`, `elevated`
- ✅ 3 tamanhos: `sm`, `md`, `lg`
- ✅ Área de mídia nativa com auto detecção de imagem
- ✅ Sub-componentes estruturados: `Card.Header` e `Card.Footer`
- ✅ Modo hover com animação de elevação
- ✅ Modo clicável com acessibilidade
- ✅ Efeito de zoom automático na imagem no hover

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `variant` | string | `default` | Estilo visual do card |
| `size` | string | `md` | Tamanho e espaçamentos |
| `media` | ReactNode \| string | - | Mídia no topo (string = url de imagem) |
| `mediaAlt` | string | - | Texto alternativo para imagem |
| `header` | ReactNode | - | Conteúdo do cabeçalho |
| `footer` | ReactNode | - | Conteúdo do rodapé |
| `hoverable` | boolean | `false` | Habilita efeito hover |
| `clickable` | boolean | `false` | Cursor de clique |
| `onClick` | function | - | Handler de clique |

### 📦 Sub-componentes Inclusos

#### 📑 Card.Header
Cabeçalho estruturado com ícone, título, subtítulo e ação
- Layout flexível automatico
- Alinhamento vertical centralizado
- Espaçamentos padrão pré-definidos

#### 🦶 Card.Footer
Rodapé com alinhamento configurável
- Alinhamentos: `start`, `center`, `end`, `between`
- Suporta múltiplos elementos
- Separação automática do conteúdo

---

---

## <a id="input"></a> 📝 Input

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Input.js` | Componente React | 96 |
| `/components/UI/Input.module.css` | Estilos CSS Modules | 168 |

### 🎯 Propósito
Componente base de campo de entrada de texto com suporte nativo a label, mensagem de erro, texto de ajuda e addons laterais. Totalmente acessível e compatível com React Refs.

### ✅ Principais Características
- ✅ Implementado com `forwardRef` para integração nativa com formulários
- ✅ 3 tamanhos: `sm`, `md`, `lg`
- ✅ 3 variantes: `default`, `filled`, `flushed`
- ✅ Estado de erro nativo com mensagem
- ✅ Texto de ajuda
- ✅ Addons esquerdo e direito para ícones
- ✅ Label com indicação de campo obrigatório
- ✅ Acessibilidade completa com `aria-invalid` e `aria-describedby`
- ✅ Geração automática de ids únicos

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `size` | string | `md` | Tamanho do input |
| `variant` | string | `default` | Estilo visual |
| `error` | boolean | `false` | Estado de erro |
| `errorMessage` | string | - | Mensagem de erro exibida abaixo |
| `leftAddon` | ReactNode | - | Elemento fixo à esquerda |
| `rightAddon` | ReactNode | - | Elemento fixo à direita |
| `label` | string | - | Label acima do campo |
| `required` | boolean | `false` | Marca campo obrigatório com * |
| `helperText` | string | - | Texto de ajuda exibido abaixo |

### 🎨 Comportamento Visual
- Transição suave no foco
- Outline acessível com sombra
- Ajuste automático de padding quando existem addons
- Mudança de cor dos addons quando em estado de erro
- Placeholder com contraste adequado
- Estado desabilitado nativo

---

---

## <a id="modal"></a> 🪟 Modal

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Modal.js` | Componente React | 121 |
| `/components/UI/Modal.module.css` | Estilos CSS Modules | 152 |

### 🎯 Propósito
Componente de janela modal acessível, com backdrop, animações e comportamento padrão de interface. Utiliza React Portal para renderização fora da hierarquia DOM.

### ✅ Principais Características
- ✅ 5 tamanhos: `sm`, `md`, `lg`, `xl`, `full`
- ✅ Renderização via React Portal no `document.body`
- ✅ Fechamento com tecla ESC
- ✅ Fechamento por clique no overlay
- ✅ Bloqueio automático do scroll da página
- ✅ Animações de entrada fade e slide
- ✅ Backdrop com efeito blur
- ✅ Acessibilidade: `role="dialog"` e `aria-modal="true"`
- ✅ Responsivo para dispositivos móveis
- ✅ Cabeçalho e rodapé estruturados

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `isOpen` | boolean | - | Controla visibilidade do modal |
| `onClose` | function | - | Handler executado ao fechar |
| `size` | string | `md` | Tamanho do modal |
| `title` | ReactNode | - | Título no cabeçalho |
| `footer` | ReactNode | - | Conteúdo do rodapé |
| `closeOnOverlayClick` | boolean | `true` | Fecha ao clicar fora |
| `showCloseButton` | boolean | `true` | Mostra botão X no cabeçalho |
| `preventScroll` | boolean | `true` | Bloqueia scroll da página |

### 🧠 Arquitetura
- Gerenciamento de eventos de teclado com useCallback
- Limpeza automática de event listeners e estado do scroll
- Previne propagação de clique dentro do conteúdo
- Fallback de renderização para SSR
- Scroll automático no conteúdo interno
- Ajustes responsivos para telas pequenas
- ✅ Gerenciamento de foco (Focus Trap) para acessibilidade
---

---

## <a id="select"></a> 📋 Select

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Select.js` | Componente React | 109 |
| `/components/UI/Select.module.css` | Estilos CSS Modules | 129 |

### 🎯 Propósito
Componente nativo de seleção (dropdown) com estilo customizado, mantendo acessibilidade e comportamento padrão do navegador.

### ✅ Principais Características
- ✅ Implementado com `forwardRef`
- ✅ 3 tamanhos: `sm`, `md`, `lg`
- ✅ Estado de erro e mensagem
- ✅ Texto de ajuda
- ✅ Label com indicação de campo obrigatório
- ✅ Ícone de seta customizado
- ✅ Acessibilidade completa
- ✅ Geração automática de ids únicos
- ✅ Suporte nativo a `value` e `defaultValue`

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `options` | Array | `[]` | Lista de opções `{value, label, disabled}` |
| `placeholder` | string | `Selecione...` | Opção inicial desabilitada |
| `size` | string | `md` | Tamanho do campo |
| `error` | boolean | `false` | Estado de erro |
| `errorMessage` | string | - | Mensagem de erro |
| `label` | string | - | Label acima do campo |
| `required` | boolean | `false` | Marca campo obrigatório |
| `helperText` | string | - | Texto de ajuda |
| `disabled` | boolean | `false` | Desabilita o campo |

### 🎨 Comportamento Visual
- Remoção de aparência nativa do navegador
- Animação de rotação da seta no foco
- Mudança de cor da seta conforme estado
- Mesmos padrões de estilo do componente Input
- Transições suaves em todos estados

---

---

## <a id="spinner"></a> ⏳ Spinner

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Spinner.js` | Componente React | 63 |
| `/components/UI/Spinner.module.css` | Estilos CSS Modules | 215 |

### 🎯 Propósito
Componente versátil de indicador de carregamento com múltiplos estilos e tamanhos.

### ✅ Principais Características
- ✅ 3 variantes: `border` (circular), `grow` (pulso), `dots` (3 pontos)
- ✅ 5 tamanhos: `xs`, `sm`, `md`, `lg`, `xl`
- ✅ 4 cores: `primary`, `secondary`, `white`, `dark`
- ✅ Modo centralizado fixo na tela
- ✅ Sub-componentes: `Container` e `Overlay`
- ✅ Acessibilidade com texto oculto para leitores de tela
- ✅ Animações CSS nativas

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `size` | string | `md` | Tamanho do spinner |
| `color` | string | `primary` | Cor do indicador |
| `variant` | string | `border` | Tipo de animação |
| `label` | string | `Carregando...` | Texto acessibilidade |
| `centered` | boolean | `false` | Centraliza fixamente na tela |

### 📦 Sub-componentes Inclusos

#### 📦 Spinner.Container
Container com altura mínima e spinner centralizado

#### 🎭 Spinner.Overlay
Overlay full screen com fundo semi-transparente e blur
---

---

## <a id="textarea"></a> 📝 TextArea

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/TextArea.js` | Componente React | 112 |
| `/components/UI/TextArea.module.css` | Estilos CSS Modules | 121 |

### 🎯 Propósito
Componente de área de texto multi-linha com suporte a auto-redimensionamento, contador de caracteres e validação.

### ✅ Principais Características
- ✅ Implementado com `forwardRef`
- ✅ 3 tamanhos: `sm`, `md`, `lg`
- ✅ Auto-redimensionamento automático
- ✅ Contador de caracteres nativo
- ✅ Limite máximo de caracteres
- ✅ Estado de erro e mensagem
- ✅ Texto de ajuda
- ✅ Controle de redimensionamento manual
- ✅ Mesma API e padrões do componente Input

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `rows` | number | `4` | Número de linhas visíveis padrão |
| `minRows` | number | - | Mínimo de linhas para auto-resize |
| `maxRows` | number | - | Máximo de linhas para auto-resize |
| `resize` | boolean | `true` | Permite redimensionamento manual |
| `autoResize` | boolean | `false` | Redimensiona automaticamente conforme conteúdo |
| `size` | string | `md` | Tamanho do campo |
| `maxLength` | number | - | Limite máximo de caracteres |
| `showCount` | boolean | `false` | Mostra contador de caracteres |

### 🎨 Comportamento Visual
- Ajuste automático de altura no auto-resize
- Contador muda de cor quando ultrapassa o limite
- Alinhamento lado a lado de mensagem e contador
- Números tabulares para contagem consistente
- Mesmo padrão de estados e foco do Input

---

---

## <a id="toast"></a> 🔔 Toast

### 📁 Arquivos
| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `/components/UI/Toast.js` | Componente React | 159 |
| `/components/UI/Toast.module.css` | Estilos CSS Modules | 229 |

### 🎯 Propósito
Sistema completo de notificações temporárias com hook integrado e gerenciamento de múltiplos toasts.

### ✅ Principais Características
- ✅ 4 status: `info`, `success`, `warning`, `error`
- ✅ 6 posições fixas na tela
- ✅ Fechamento automático com duração configurável
- ✅ Persistência de notificação quando `duration: 0`
- ✅ Suporte a múltiplas instâncias e posições customizadas via `Toast.Container`
- ✅ Barra de progresso visual do tempo restante
- ✅ Animações de entrada e saída
- ✅ Hook `useToast` nativo para gerenciamento
- ✅ Container para múltiplas notificações
- ✅ Ícones padrão por status
- ✅ Totalmente acessível

### 🎛️ Propriedades
| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `status` | string | `info` | Tipo de notificação |
| `title` | ReactNode | - | Título do toast |
| `description` | ReactNode | - | Conteúdo descritivo |
| `duration` | number | `5000` | Duração em milissegundos |
| `isClosable` | boolean | `true` | Botão para fechar manualmente |
| `position` | string | `top-right` | Posição na tela |
| `onClose` | function | - | Callback ao fechar |

### 📦 Hook e Sub-componentes

#### 🪝 useToast
Hook nativo para gerenciar múltiplas notificações:
- Métodos rápidos: `toast.info()`, `toast.success()`, `toast.warning()`, `toast.error()`
- Gerenciamento automático de ids e tempo de vida
- Remoção programática

#### 📦 Toast.Container
Container para empilhamento de múltiplos toasts

### 🎨 Comportamento Visual
- Animação slide de entrada e saída
- Barra de progresso animada linear
- Borda colorida lateral por status
- Ajustes responsivos para dispositivos móveis
- Posicionamento automático em tela cheia em mobile

---

---

## <a id="index"></a> 📦 Index de Exportações

### 📁 Arquivo
`/components/UI/index.js` - 27 linhas

### 🎯 Propósito
Arquivo barril centralizado para importação de todos componentes UI. Permite importações limpas e padronizadas em todo o projeto.

### 📤 Exportações Disponíveis
```javascript
// Exportações nomeadas (recomendado)
import { Button, Card, Badge, Alert, Input, TextArea, Select, Modal, Spinner, Toast, useToast } from '@/components/UI';

// Exportações padrão
import Button from '@/components/UI/Button';
```

### ✅ Componentes Disponíveis
✅ Button ✅ Input ✅ TextArea ✅ Select ✅ Card ✅ Modal ✅ Spinner ✅ Badge ✅ Alert ✅ Toast + hook useToast

---

## 📌 Padrões Gerais Observados
✅ Todos componentes utilizam CSS Modules
✅ Zero dependências externas para ícones
✅ Acessibilidade implementada nativamente
✅ Valores padrão sensatos para todas propriedades
✅ Suporte a classes customizadas para sobreposição
✅ Interface declarativa e auto-documentada
✅ Tratamento seguro de props opcionais
✅ Separação clara entre lógica e estilos
✅ Arquivo barril centralizado para importações
✅ Padrões consistentes entre todos componentes
✅ Suporte nativo a refs e formulários (`forwardRef`)
✅ Utilização de React Portal para modais e overlays
✅ Gerenciamento de efeitos colaterais com `useEffect`
✅ Animações CSS nativas otimizadas
✅ Hooks customizados para lógica complexa (ex: `useToast`, `useAuth`)
✅ Responsividade nativa "mobile-first" em todos componentes
