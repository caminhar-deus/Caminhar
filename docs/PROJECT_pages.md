# Documentação das Páginas do Projeto

> Documentação oficial das páginas principais do Next.js do projeto **O Caminhar com Deus**

---

## 📑 Sumário
1. [\_app.js](#_appjs)
2. [\_document.js](#_documentjs)
3. [admin.js](#adminjs)
4. [design-system.js](#design-systemjs)
5. [index.js](#indexjs)
6. [[slug].js](#slugjs)
7. [blog/index.js](#blogindexjs)
8. [blog/[slug].js](#blogslugjs)

---

---

## ✅ \_app.js

### 🎯 Propósito
Página principal de wrapper do Next.js, responsável por inicializar a aplicação, configurar provedores globais e comportamento comum a todas as páginas.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/_app.js` |
| **Tipo** | Wrapper Raiz da Aplicação |
| **Responsabilidade** | Componente raiz que envolve TODAS as páginas da aplicação |

### 🔧 Funcionalidades Implementadas
1. 🔔 **Sistema de Notificações Global**
    - Configuração do `react-hot-toast` com posicionamento top-right
    - Estilos customizados para sucesso e erro
    - Duração padrão de 5 segundos
    - Temas de ícone e cores consistentes

2. 📊 **Monitoramento de Rotas**
    - Listener para eventos de mudança de rota
    - Log de navegação apenas em ambiente de desenvolvimento
    - Limpeza automática de event listeners no unmount

3. 🧱 Estrutura Render
    - Renderiza o componente da página atual com suas props
    - Injeta o Toaster global antes de qualquer conteúdo da página

### 📦 Dependências
- `react-hot-toast`
- `next/router`

---

---

## ✅ \_document.js

### 🎯 Propósito
Documento HTML customizado e otimizado para performance, segurança e SEO. Controla a estrutura base do HTML que é enviada para o navegador.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/_document.js` |
| **Tipo** | Documento HTML Raiz |
| **Renderizado** | Apenas no lado servidor (Server Side) |

### 🔧 Funcionalidades Implementadas
1. ⚡ **Otimizações de Performance**
    - Preconnect para todos domínios críticos (fonts, youtube, spotify)
    - DNS Prefetch para acelerar resolução de domínios
    - CSS Crítico inline injetado no head
    - Script automático para remover CSS crítico após carregamento completo

2. 🔒 **Segurança**
    - Content Security Policy (CSP) completo e configurado
    - Permissions Policy com restrições de hardware
    - Meta tags de segurança e referrer policy
    - X-UA-Compatible e headers de proteção

3. 🎨 **Experiência do Usuário**
    - Theme Color dinâmico para modo claro/escuro
    - Meta tags para PWA e dispositivos móveis
    - Suporte Apple Mobile Web App
    - Configurações Microsoft Edge e navegadores modernos

4. 📈 **Métricas**
    - Performance Mark no carregamento do documento
    - Controle de tempo de vida do CSS crítico

### 📦 Dependências
- `next/document`
- `../lib/seo/config`
- `../components/Performance/CriticalCSS`

---

---

## ✅ admin.js

### 🎯 Propósito
Painel Administrativo completo da aplicação. Página central para gestão de todo conteúdo, usuários, segurança e configurações do sistema.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/admin.js` |
| **Tipo** | Página Funcional |
| **Acesso** | Restrito apenas para usuários autenticados |
| **Linhas de Código** | 711 |

### 🔧 Funcionalidades Implementadas
1. 🔐 **Sistema de Autenticação**
    - Tela de login
    - Verificação automática de autenticação no mount
    - Logout com limpeza de estado
    - Sistema de permissões baseado em roles

2. 🗂️ **Módulos Administrativos**
| Aba | Funcionalidade |
|-----|----------------|
| 📊 Visão Geral | Dashboard com métricas e estatísticas |
| 📝 Posts | Gestão completa de artigos e publicações |
| 🎵 Músicas | Cadastro e edição de músicas |
| 🎬 Vídeos | Gestão de conteúdo de vídeo |
| 📦 Produtos | Gerenciamento de produtos |
| 💡 Dicas | Conteúdo de dicas diárias |
| 🎨 Cabeçalho | Configuração de título, subtítulo e imagem principal |
| 🔒 Segurança | Rate Limit, Integridade, Backups, Cache |
| 👥 Usuários | Gestão de usuários e permissões |
| 📜 Auditoria | Logs de atividades do sistema |

3. 🖼️ **Processamento de Imagens**
    - Upload com recorte (Cropper) na proporção correta 1100x320
    - Redimensionamento automático e otimização de qualidade
    - Pré-visualização e cálculo de economia de tamanho
    - Limite de segurança de 10MB para upload

4. ⚙️ **Sistema de Abas Dinâmicas**
    - Abas são exibidas apenas se o usuário tiver a permissão correspondente
    - Administradores tem acesso total a todas funcionalidades
    - Navegação tabulada com estado ativo

### 📦 Dependências
- `react-easy-crop`
- `react-hot-toast`
- Todos componentes Admin do projeto
- Estilos `Admin.module.css`

---

---

## ✅ design-system.js

### 🎯 Propósito
Página de demonstração e documentação do Design System completo do projeto. Serve como referência visual e técnica para todos componentes UI.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/design-system.js` |
| **Tipo** | Página de Demonstração / Documentação |
| **Versão** | Design System v1.0 |

### 🔧 Conteúdo Demonstado
1. 🎨 **Fundação**
    - Paleta de cores completa (Primária, Secundária, Feedback)
    - Tokens de design
    - Espaçamento, tipografia e padrões visuais

2. 🧩 **Componentes UI**
| Categoria | Componentes |
|-----------|--------------|
| Botões | Variantes, tamanhos, estados (loading, disabled, fullWidth) |
| Formulários | Input, TextArea, Select, estados de erro |
| Conteúdo | Cards (6 variantes diferentes) |
| Feedback | Badges, Alerts, Spinners, Toast, Modal |
| Layout | Container, Grid, Stack, Sidebar |

3. 📐 **Sistema de Layout**
    - Demonstração de Stack vertical e horizontal
    - Grid responsivo com breakpoints
    - Exemplos práticos de uso

4. 📚 **Documentação**
    - Lista completa de componentes disponíveis
    - Hooks e utilitários inclusos
    - Links para documentação completa

### 📦 Dependências
- Todos componentes `UI` do projeto
- Todos componentes `Layout` do projeto
- Estilos `DesignSystem.module.css`

---

---

## 📌 Observações Gerais

1. Todas as páginas seguem o padrão ES Modules com `import/export`
2. Nenhuma das páginas utiliza `getServerSideProps` ou `getStaticProps` explicitamente
3. Todas as páginas possuem seus estilos isolados em arquivos `.module.css`
4. Toda comunicação com API é feita via `fetch` nativo com credentials
5. Todas páginas são acessíveis via rotas padrão do Next.js

---


---

## ✅ index.js

### 🎯 Propósito
Página inicial (Home) da aplicação. Página principal acessada na raiz do domínio.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/index.js` |
| **Tipo** | Página Pública |
| **Acesso** | Aberto para todos os usuários |
| **Renderização** | Client Side + Server Side |

### 🔧 Funcionalidades Implementadas
1. ⚙️ **Configurações Dinâmicas**
    - Carrega título e subtítulo do site diretamente do banco de dados
    - Fallback para valores padrão caso a API não responda
    - Previne Hydration Mismatch com timestamp na URL da imagem

2. 🎨 Conteúdo da Página
    - Header com título e subtítulo dinâmicos
    - Imagem Hero otimizada com loading lazy
    - Componente `ContentTabs` com abas de conteúdo
    - Componente `Testimonials` com depoimentos

3. 📦 Dependências
- `../styles/Home.module.css`
- `../components/Features/ContentTabs`
- `../components/Features/Testimonials`

---

---

## ✅ [slug].js

### 🎯 Propósito
Página dinâmica de post individual com Server Side Rendering. Página otimizada para SEO e compartilhamento social.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/[slug].js` |
| **Tipo** | Página Dinâmica |
| **Renderização** | Server Side Rendering (getServerSideProps) |
| **Rota** | `/{slug-do-post}` |

### 🔧 Funcionalidades Implementadas
1. 📊 **SEO e Compartilhamento Social**
    - Meta tags Open Graph completas para Facebook/WhatsApp
    - Twitter Cards com imagem sumário
    - URLs absolutas automáticas para imagens
    - Data de publicação formatada para pt-BR

2. ⚡ Performance
    - Busca o post diretamente no banco durante o SSR
    - Retorna 404 automaticamente se o post não existir
    - Sem estado de loading para o usuário final

3. 🎨 Interface
    - Renderização de conteúdo com quebra automática de parágrafos
    - Botões de compartilhamento WhatsApp e Facebook
    - Link de volta para listagem do blog

### 📦 Dependências
- `../lib/db.js` (consulta direta ao banco)
- `next/link`

---

---

## ✅ blog/index.js

### 🎯 Propósito
Página de listagem pública do blog com paginação. Exibe todos os posts publicados.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/blog/index.js` |
| **Tipo** | Página Pública |
| **Renderização** | Server Side Rendering |
| **Itens por Página** | 9 posts |

### 🔧 Funcionalidades Implementadas
1. 📄 Sistema de Paginação
    - Paginação manual com limite de 9 itens por página
    - Navegação Anterior/Próxima
    - Indicador de página atual e total de páginas

2. ⚡ Carregamento de Dados
    - Busca posts via API interna durante SSR
    - Fallback para array vazio em caso de erro
    - Tratamento de falha de conexão com logs

3. 🎨 Interface
    - Grid responsivo de posts
    - Componente `PostCard` para cada publicação
    - Link de volta para a página inicial

### 📦 Dependências
- `../../styles/Blog.module.css`
- `../../components/Features/Blog/PostCard`

---

---

## ✅ blog/[slug].js

### 🎯 Propósito
Página dinâmica de post do blog com renderização no lado cliente e funcionalidades avançadas.

### 📋 Características Principais
| Item | Detalhe |
|------|---------|
| **Localização** | `/pages/blog/[slug].js` |
| **Tipo** | Página Dinâmica |
| **Renderização** | Client Side Rendering |
| **Rota** | `/blog/{slug-do-post}` |

### 🔧 Funcionalidades Implementadas
1. 🖼️ **Visualizador de Imagem Fullscreen**
    - Zoom na imagem do post ao clicar
    - Fechamento com clique na sobreposição ou tecla ESC
    - Overlay semi-transparente com sombra

2. 📤 **Sistema de Compartilhamento Avançado**
    - Facebook
    - WhatsApp
    - Compartilhamento nativo do navegador (Web Share API)
    - Fallback para cópia de link na área de transferência
    - Suporte para Instagram

3. ⚡ Funcionalidades UX
    - Estado de loading enquanto busca o post
    - Página de 404 customizada para post não encontrado
    - Formatação de data para padrão brasileiro
    - Conteúdo com white-space: pre-wrap

### 📦 Dependências
- `../../styles/Blog.module.css`
- `next/router`

---

---

**Última Atualização:** 21/04/2026
