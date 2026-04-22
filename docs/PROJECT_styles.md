# Documentação dos Arquivos de Estilos do Projeto

> Última atualização: 21/04/2026
>
> Arquivos analisados: 22
> Total de linhas: 3879

---

## 📁 Arquivos Analisados

| Arquivo | Propósito | Tamanho | Responsivo |
|---------|-----------|---------|------------|
| `Admin.module.css` | Painel Administrativo completo | 904 linhas | ✅ Sim |
| `Blog.module.css` | Listagem e cards de Blog | 136 linhas | ✅ Sim |
| `ContentTabs.module.css` | Sistema de Abas de conteúdo | 230 linhas | ✅ Sim |
| `DesignSystem.module.css` | Página de Demonstração Design System | 180 linhas | ✅ Sim |
| `globals.css` | Estilos Globais Legado | 78 linhas | ❌ Não |
| `globals-refactored.css` | Estilos Globais Refatorado com Design Tokens | 335 linhas | ✅ Sim |
| `Home.module.css` | Página Inicial Hero Section | 87 linhas | ✅ Sim |
| `MusicCard.module.css` | Card de Músicas com integração Spotify | 164 linhas | ✅ Sim |
| `MusicGallery.module.css` | Galeria de Músicas com sistema de busca | 238 linhas | ✅ Sim |
| `VideoCard.module.css` | Card de Vídeos com integração Youtube | 209 linhas | ✅ Sim |
| `VideoGallery.module.css` | Galeria de Vídeos com busca | 120 linhas | ✅ Sim |
| `/tokens/animations.js` | Design Tokens de Animações | 188 linhas | - |
| `/tokens/colors.js` | Paleta Oficial de Cores do Projeto | 171 linhas | - |
| `/tokens/borders.js` | Tokens de Bordas e Raios | 93 linhas | - |
| `/tokens/breakpoints.js` | Pontos de Quebra Responsivos | 67 linhas | - |
| `/tokens/spacing.js` | Sistema de Espaçamento Base 4px | 126 linhas | - |
| `/tokens/shadows.js` | Sistema de Sombras e Elevação | 91 linhas | - |
| `/tokens/sizes.js` | Tamanhos Padronizados de Componentes | 144 linhas | - |
| `/tokens/opacity.js` | Níveis de Opacidade Consistentes | 49 linhas | - |
| `/tokens/typography.js` | Sistema Tipográfico Completo | 191 linhas | - |
| `/tokens/zIndex.js` | Sistema de Camadas e Z-Index | 44 linhas | - |
| `/tokens/index.js` | Índice Centralizado de Tokens | 34 linhas | - |

---

## 1️⃣ /styles/Admin.module.css

### ✅ Resumo
Arquivo de estilos principal e mais completo do projeto. Contém toda a interface do Painel Administrativo, com sistema completo de formulários, tabelas, navegação, dashboards e estados.

### 🎯 Propósito
Estilizar a página `/admin` e todos os componentes internos do painel administrativo incluindo:
- Tela de Login
- Painel Principal
- Sistema de Abas
- Navegação e Submenus
- Tabelas de dados
- Formulários completos
- Sistema de Preview
- Estados vazios e placeholders
- Mensagens de feedback
- Badges e status
- Paginação
- Cards de estatísticas
- Dashboard

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Cores** | Sistema de cores padrão Bootstrap: `#007bff` (primário), `#28a745` (sucesso), `#dc3545` (erro), `#ffc107` (alerta) |
| **Sombras** | 3 níveis de sombra: leve, média e elevada |
| **Transições** | Todas as interações possuem `transition: 0.3s ease` padrão |
| **Animações** | `fadeIn` com translate para entradas suaves |
| **Breakpoints** | `768px` (tablet) e `480px` (mobile) |
| **Layout** | Flexbox + Grid responsivo |

### 📐 Estrutura Principal
1.  Layout base do container
2.  Estilos de Login
3.  Painel Administrativo
4.  Sistema de Abas
5.  Navegação secundária
6.  Tabelas e listagens
7.  Formulários e grupos de campos
8.  Botões e ações
9.  Estados vazios e placeholders
10. Mensagens de sucesso/erro
11. Badges de status
12. Paginação
13. Cards de estatísticas do Dashboard
14. Media Queries responsivas

### 📌 Observações Importantes
- É o arquivo de estilos mais complexo e com maior quantidade de classes
- Possui classes específicas para integração com Spotify
- Todos os elementos possuem estados `hover`, `active` e `disabled`
- Suporta textos longos com quebra automática `overflow-wrap: break-word`

---

## 2️⃣ /styles/Blog.module.css

### ✅ Resumo
Arquivo leve e otimizado para listagem de artigos do blog. Arquitetura de cards com grid responsivo.

### 🎯 Propósito
Estilizar a seção de Blog na página inicial e páginas de listagem de conteúdo.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Layout** | Grid CSS com `auto-fill` e `minmax(300px, 1fr)` |
| **Cards** | Altura uniforme com `height: 100%` e flex column |
| **Efeito Hover** | Elevação de 5px e aumento de sombra |
| **Responsivo** | Ajuste de paddings e tamanhos de fonte em mobile |
| **Espaçamentos** | Sistema consistente de espaçamento vertical e horizontal |

### 📐 Estrutura Principal
1.  Seção container
2.  Cabeçalho da seção
3.  Grid de cards
4.  Estrutura interna dos cards
5.  Área de imagem
6.  Conteúdo textual
7.  Meta informações e categorias
8.  Rodapé dos cards
9.  Responsividade

### 📌 Observações Importantes
- Design minimalista e limpo
- Cards se ajustam automaticamente ao tamanho da tela
- Sem dependências externas
- Otimizado para performance com transições leves

---

## 3️⃣ /styles/ContentTabs.module.css

### ✅ Resumo
Sistema reutilizável de abas com animações de transição e scroll horizontal nativo.

### 🎯 Propósito
Componente genérico de abas utilizado em diversas páginas do projeto para organizar conteúdo por categorias.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Scroll Horizontal** | Abas transbordam com scroll e scrollbar oculto |
| **Animações** | Sistema de transição fade entre conteúdos |
| **Estados** | `hover`, `active`, `disabled` implementados |
| **Touch Support** | `touch-action: manipulation` para dispositivos móveis |
| **Breakpoints** | 3 breakpoints: `480px`, `768px`, `1024px` |

### 📐 Estrutura Principal
1.  Container da seção
2.  Container das abas com scroll
3.  Botões das abas com ícones
4.  Container de conteúdo com animações
5.  Classes para estados de transição
6.  Placeholder para conteúdo vazio
7.  3 níveis de media queries responsivas

### 📌 Observações Importantes
- Componente 100% reutilizável
- Scrollbar oculta em todos os navegadores (webkit, IE/Edge)
- Animações separadas para entrada e saída de conteúdo
- Suporta ícones dentro dos botões das abas
- Botões nunca quebram linha, mantém aparência uniforme

---

## 4️⃣ /styles/DesignSystem.module.css

### ✅ Resumo
Arquivo de estilos para a página de demonstração do Design System do projeto.

### 🎯 Propósito
Estilizar a página `/design-system` que exibe todos os componentes, tokens de cores e padrões visuais do projeto.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Cores** | Paleta oficial do projeto com variações 50, 100, 200, 500, 700, 900 |
| **Cabeçalho** | Gradiente azul `#2563eb` até `#1e40af` |
| **Seções** | Cards com sombra leve e cantos arredondados de 1rem |
| **Paleta** | Demonstração visual de todas as cores do sistema |
| **Responsivo** | Ajuste automático em telas menores |

### 📐 Estrutura Principal
1.  Layout base da página
2.  Cabeçalho com gradiente
3.  Conteúdo principal
4.  Estrutura de seções
5.  Títulos e descrições
6.  Grupos de componentes
7.  Demonstração de paleta de cores
8.  Área de demonstração de componentes
9.  Rodapé
10. Media queries

### 📌 Observações Importantes
- Contém a definição oficial de todas as cores do projeto
- É a referência visual para todos os estilos do sistema
- Utiliza raio de borda maior que os outros arquivos (1rem)
- Design clean e voltado para documentação

---

---

## 5️⃣ /styles/globals.css

### ✅ Resumo
Arquivo de estilos globais legado contendo reset CSS básico e classes utilitárias simples.

### 🎯 Propósito
Estilos base que são aplicados globalmente em todas as páginas do projeto.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Reset CSS** | `box-sizing: border-box` e reset de margens/paddings |
| **Fonte** | System Font Stack padrão |
| **Classes Utilitárias** | `.container`, `.btn`, `.btn-secondary`, `.input`, `.textarea`, `.form-group`, `.label` |
| **Scroll Fix** | Força barra de rolagem sempre visível para evitar Layout Shift |

### 📌 Observações Importantes
- Arquivo legado que está sendo substituido por `globals-refactored.css`
- Não possui responsividade
- Sem variáveis CSS ou design tokens
- Estilos simples e diretos

---

## 6️⃣ /styles/globals-refactored.css

### ✅ Resumo
Arquivo de estilos globais moderno e completo, refatorado com sistema completo de Design Tokens usando CSS Custom Properties. É o coração do Design System do projeto.

### 🎯 Propósito
Definir todos os tokens de design, reset CSS, estilos base e classes utilitárias para todo o projeto.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Design Tokens** | Sistema completo de variáveis CSS para cores, espaçamentos, tipografia, bordas, sombras, transições e z-index |
| **Paleta de Cores** | 3 paletas completas: Primária (Azul), Secundária (Dourado), Neutra + cores de feedback |
| **Dark Mode** | Suporte nativo a tema escuro com atributo `data-theme="dark"` |
| **Acessibilidade** | Classes `.visually-hidden`, `.sr-only` e estilos de foco |
| **Tipografia** | Escala de fontes completa e estilos base para todos os elementos HTML |
| **Scrollbar Customizada** | Estilos nativos para barra de rolagem |
| **Animações** | Animações padrão: `fadeIn`, `slideInUp`, `spin`, `pulse`, `bounce` |

### 📌 Observações Importantes
- É o arquivo mais importante de todo o sistema de estilos
- 100% compatível com o Design System
- Segue padrões modernos de CSS
- Possui documentação interna completa

---

## 7️⃣ /styles/Home.module.css

### ✅ Resumo
Arquivo específico para a seção Hero da Página Inicial.

### 🎯 Propósito
Estilizar o cabeçalho principal, título e imagem hero da página inicial.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Título** | 3rem, uppercase, espaçamento entre letras |
| **Imagem Hero** | Efeito zoom no hover com `scale(1.05)` |
| **Responsivo** | 2 breakpoints: `768px` e `480px` com ajuste de tamanhos de fonte e altura da imagem |

### 📌 Observações Importantes
- Arquivo pequeno e específico, sem lógica complexa
- Apenas o hero da página inicial
- Segue todos os padrões de design do projeto

---

## 8️⃣ /styles/MusicCard.module.css

### ✅ Resumo
Componente de Card para exibição de músicas com integração nativa com Spotify.

### 🎯 Propósito
Estilizar os cards de músicas utilizados na listagem de músicas e conteúdo relacionado.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Aspect Ratio** | Imagem quadrada 1:1 perfeito com `padding-top: 100%` |
| **Efeito Hover** | Elevação de 4px e zoom na imagem |
| **Line Clamp** | Título limitado a 2 linhas com ellipsis |
| **Spotify Integration** | Estilos específicos para embed do Spotify e botão oficial |
| **Breakpoints** | 3 níveis de responsividade: `480px`, `768px`, `1024px` |

### 📌 Observações Importantes
- Design muito bem polido e profissional
- Utiliza gradiente oficial do Spotify
- Todos os estados e interações implementados
- Um dos componentes com melhor qualidade visual do projeto

---

---

## 9️⃣ /styles/MusicGallery.module.css

### ✅ Resumo
Galeria completa de músicas com sistema de busca integrado e estados.

### 🎯 Propósito
Estilizar a página de listagem de músicas com grid responsivo, barra de busca e estados vazios.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Grid Responsivo** | Mobile-first: 1 coluna / Tablet: 2 colunas / Desktop: 3 colunas |
| **Busca** | Input com borda arredondada de 50px, cor de foco Verde Spotify |
| **Estados** | Contador de resultados, botão limpar busca, estado sem resultados |
| **Breakpoints** | 3 níveis: `480px`, `768px`, `1025px` |

### 📌 Observações Importantes
- Utiliza identidade visual do Spotify (verde `#1DB954`)
- Todos os elementos possuem estados e transições suaves
- Design muito polido e profissional

---

## 1️⃣0️⃣ /styles/VideoCard.module.css

### ✅ Resumo
Componente de Card para exibição de vídeos com integração nativa Youtube.

### 🎯 Propósito
Estilizar os cards de vídeos utilizados na galeria e listagem de conteúdo.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Aspect Ratio** | Vídeo perfeito 16:9 com `padding-top: 56.25%` |
| **Efeito Hover** | Elevação de 4px e aumento de sombra |
| **Line Clamp** | Título 2 linhas / Descrição 3 linhas |
| **Expandir Texto** | Sistema para expandir descrição completa |
| **Breakpoints** | 3 níveis de responsividade |

### 📌 Observações Importantes
- Integração nativa com embed Youtube
- Utiliza cor oficial do Youtube (`#ff0000`)
- Possui placeholder para vídeos não disponíveis

---

## 1️⃣1️⃣ /styles/VideoGallery.module.css

### ✅ Resumo
Galeria de vídeos com sistema de busca.

### 🎯 Propósito
Estilizar a página de listagem de vídeos com grid e barra de pesquisa.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Grid** | `auto-fill minmax(300px, 1fr)` |
| **Busca** | Input com botão de busca separado |
| **Estados** | Loading, Erro, Sem Resultados |
| **Cor Principal** | Azul `#3498db` |

---

## 1️⃣2️⃣ /styles/tokens/animations.js

### ✅ Resumo
Sistema completo de Design Tokens para animações exportados em Javascript.

### 🎯 Propósito
Definir e padronizar TODAS as animações do projeto em um único lugar, reutilizável em CSS, Javascript e componentes.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Durações** | 7 níveis de `0ms` até `700ms` |
| **Easings** | Funções padrão + 6 curvas cubic-bezier incluindo `spring` e `bounce` |
| **Transições** | Transições pré-definidas para cada tipo de propriedade |
| **Keyframes** | 12 animações completas prontas para uso |
| **Animações** | Definições prontas com duração e easing |
| **Stagger** | Valores para animações em sequência em listas |

### 📌 Observações Importantes
- É a única fonte da verdade para todas as animações do sistema
- Padroniza todas as transições e evita duplicação
- Exportado em Javascript para uso com bibliotecas de animação
- Segue os padrões do Material Design

---

---

## 1️⃣3️⃣ /styles/tokens/colors.js

### ✅ Resumo
Paleta oficial completa de cores do projeto, organizada e documentada com nomes semânticos e temática espiritual.

### 🎯 Propósito
Ser a única fonte da verdade para TODAS as cores utilizadas em todo o projeto.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Paleta Primária** | Azul Serenidade com 11 tons de 50 até 950 |
| **Paleta Secundária** | Dourado Luz com tons completos |
| **Paleta Neutra** | Branco Pureza com escala completa de cinzas |
| **Feedback** | 4 paletas completas: Success, Error, Warning, Info |
| **Cores Semânticas** | Mapeamento para background, texto, bordas e estados |
| **Cores Espirituais** | Paleta exclusiva com nomes temáticos: Luz, Paz, Fé, Esperança, Amor, Alegria, Sabedoria |

---

## 1️⃣4️⃣ /styles/tokens/borders.js

### ✅ Resumo
Sistema consistente de tokens para bordas, larguras, estilos e raios.

### 🎯 Propósito
Padronizar todos os cantos arredondados e bordas do projeto.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Larguras** | 5 níveis de 0px até 8px |
| **Estilos** | solid, dashed, dotted, double |
| **Raios** | 9 níveis de 0px até 9999px |
| **Aliases Semânticos** | Definições específicas: `button`, `card`, `input`, `badge`, `modal`, `tooltip` |
| **Focus Ring** | Padrão de anel de foco para acessibilidade |

---

## 1️⃣5️⃣ /styles/tokens/breakpoints.js

### ✅ Resumo
Pontos de quebra responsivos oficiais com media queries prontas para uso.

### 🎯 Propósito
Padronizar todos os breakpoints responsivos do projeto para manter consistência.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Breakpoints** | `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`, `2xl:1536px` |
| **Media Queries** | Pré-definidas min-width, max-width e ranges |
| **Containers** | Larguras máximas para cada breakpoint |
| **Helpers Javascript** | Funções utilitárias para detectar tamanho de tela |

---

## 1️⃣6️⃣ /styles/tokens/index.js

### ✅ Resumo
Índice centralizado que exporta e consolida TODOS os tokens de design do projeto.

### 🎯 Propósito
Ponto de entrada único para importar qualquer token do Design System em qualquer lugar do código.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Exportações Nomeadas** | Todos os tokens individuais exportados separadamente |
| **Objeto Consolidado** | Um único objeto `tokens` contendo todo o sistema |
| **Módulos** | colors, spacing, typography, borders, shadows, breakpoints, animations |

---

---

## 1️⃣7️⃣ /styles/tokens/spacing.js

### ✅ Resumo
Sistema completo de espaçamento baseado em escala de 4px, o padrão da industria para Design Systems.

### 🎯 Propósito
Padronizar TODOS os espaçamentos, margens, paddings e gaps do projeto em um único lugar.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Escala Base** | 37 níveis de 0 até 384px |
| **Aliases Semânticos** | `xxs` até `8xl` |
| **Espaçamento de Seções** | Tamanhos pré-definidos para seções de página |
| **Gap Padronizado** | Valores específicos para layouts em grid e flex |
| **Paddings** | Padronizados para buttons, inputs, cards e containers |
| **Margens** | Valores comuns e helper `auto` |

---

## 1️⃣8️⃣ /styles/tokens/shadows.js

### ✅ Resumo
Sistema consistente de sombras, elevação e efeitos de brilho.

### 🎯 Propósito
Definir todos os níveis de sombra utilizados em todo o projeto para manter uniformidade visual.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Sombras Base** | 8 níveis de `none` até `2xl` |
| **Elevação** | 6 níveis hierárquicos de Z-index |
| **Aliases Semânticos** | `card`, `button`, `input`, `modal`, `tooltip`, `toast` |
| **Sombras Coloridas** | Versões coloridas para cada cor principal do projeto |
| **Drop Shadow** | Versões para filtros CSS e SVG |
| **Glow Effects** | Efeitos de brilho primário e secundário |

---

## 1️⃣9️⃣ /styles/tokens/sizes.js

### ✅ Resumo
Tamanhos padronizados para todos os componentes e elementos de layout.

### 🎯 Propósito
Garantir que todos os componentes do projeto tenham tamanhos consistentes entre si.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Buttons** | 4 tamanhos: `sm`, `md`, `lg`, `xl` |
| **Inputs** | 3 tamanhos padronizados |
| **Cards** | 3 tamanhos com min-width definido |
| **Avatares** | 6 tamanhos de 24px até 80px |
| **Ícones** | 6 tamanhos de 12px até 40px |
| **Modais** | 5 tamanhos incluindo full screen |
| **Layouts** | Alturas e larguras padrão para header, footer e sidebar |

---

## 2️⃣0️⃣ /styles/tokens/opacity.js

### ✅ Resumo
Níveis padronizados de opacidade e transparência.

### 🎯 Propósito
Manter consistência em todos os efeitos de transparência utilizados no projeto.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Escala Base** | 13 níveis de 0 até 1 |
| **Aliases Semânticos** | `disabled`, `muted`, `ghost`, `hover`, `backdrop`, `overlay` |
| **Utilitário** | Função `withOpacity()` para converter cores hex para rgba |

---

## 2️⃣1️⃣ /styles/tokens/typography.js

### ✅ Resumo
Sistema tipográfico completo e profissional, com todas as definições de fontes, tamanhos, pesos e estilos de texto.

### 🎯 Propósito
Ser a referência única para TODOS os textos em todo o projeto, mantendo uniformidade e legibilidade.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Famílias de Fonte** | Sans, Serif, Mono, Display e Body com Inter como fonte principal |
| **Tamanhos** | 14 níveis de 12px até 128px |
| **Pesos** | 9 níveis de 100 até 900 |
| **Altura de Linha** | 6 níveis de 1 até 2 |
| **Espaçamento entre Letras** | 6 níveis de `tighter` até `widest` |
| **Estilos Pré-Definidos** | h1 até h6, body, caption, button, label, overline |

---

## 2️⃣2️⃣ /styles/tokens/zIndex.js

### ✅ Resumo
Sistema hierárquico consistente para camadas e z-index de todos os elementos do projeto.

### 🎯 Propósito
Prevenir conflitos de z-index e definir a ordem correta de sobreposição de elementos.

### ✨ Principais Características
| Categoria | Detalhes |
|-----------|----------|
| **Hierarquia Base** | `hide`, `base`, `docked` |
| **Elementos Padrão** | `dropdown`, `sticky`, `banner`, `overlay` |
| **Elementos Flutuantes** | `modal`, `popover`, `tooltip`, `toast` |
| **Especiais** | `skipLink`, `loading`, `notification` |
| **Aliases Semânticos** | `background`, `content`, `navigation`, `floating`, `important`, `critical` |

---

## 📋 Padrões Gerais Encontrados

### ✅ Padrões Consistentes em Todos os Arquivos:
1.  **Cores base**: `#f8f9fa` para fundos claros, `#2c3e50` para textos principais, `#6c757d` para textos secundários
2.  **Raio de borda padrão**: `12px` para cards, `8px` para botões, `6px` para inputs
3.  **Transição padrão**: `0.3s ease` para todas as interações
4.  **Sombras**: Padrão de sombras leves e suaves, sem exageros
5.  **Responsividade**: Mobile-first com breakpoints em `480px` e `768px`
6.  **Estados**: Todos os elementos interativos possuem `hover`, `active` e `disabled`
7.  **Espaçamentos**: Sistema de espaçamento vertical e horizontal consistente

### ❌ Diferenças e Exceções:
- `DesignSystem.module.css` utiliza valores diferentes para raio de borda e sombras
- `Admin.module.css` é o único que utiliza animação `@keyframes`
- `ContentTabs.module.css` é o único com sistema de scroll horizontal