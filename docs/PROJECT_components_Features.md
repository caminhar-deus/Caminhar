# Documentação dos Componentes Features

**Arquivo:** `/docs/PROJECT_components_Features.md`  
**Última atualização:** 20/04/2026  
**Módulo:** `/components/Features/`

---

## 📑 Visão Geral

Este módulo contém componentes de funcionalidades principais da plataforma, sendo responsáveis por apresentar conteúdo dinâmico e interativo para o usuário final.

---

## 📂 Estrutura Analisada

| Módulo | Arquivos |
|--------|----------|
| **Blog** | `BlogSection.js`, `PostCard.js`, `styles/Blog.module.css` |
| **ContentTabs** | `index.js`, `ContentTabs.module.css` |
| **Music** | `MusicCard.js`, `MusicGallery.js`, `styles/MusicCard.module.css`, `styles/MusicGallery.module.css` |
| **Video** | `VideoCard.js`, `VideoGallery.js`, `styles/VideoCard.module.css`, `styles/VideoGallery.module.css` |
| **Testimonials** | `index.js` |

---

---

## 📌 Módulo: Blog

### 1. `BlogSection.js`
**Caminho:** `/components/Features/Blog/BlogSection.js`

#### Propósito
Componente de seção principal que carrega e exibe uma lista de postagens do blog. É o ponto de entrada para exibição de artigos na plataforma.

#### Funcionalidades:
- ✅ Carregamento assíncrono de posts via API `/api/posts`
- ✅ Tratamento completo de erros e estados de loading
- ✅ Validação de estrutura de resposta da API
- ✅ Limitação de quantidade de posts exibidos via prop `limit`
- ✅ Renderização condicional: retorna `null` se não houver posts
- ✅ Botão "Ver todas as postagens" quando há mais posts que o limite
- ✅ Integração nativa com componente `PostCard`

#### Props:
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `limit` | `Number` | ❌ | Quantidade máxima de posts a serem exibidos |

#### Pontos Técnicos Importantes:
- Garante que `posts` sempre seja um array, mesmo em caso de falha na API
- Possui fix crítico para acesso a propriedade `data` na resposta da API
- Estado de loading com mensagem amigável para o usuário
- Utiliza `useEffect` com array de dependências vazio para carregamento uma única vez

---

### 2. `PostCard.js`
**Caminho:** `/components/Features/Blog/PostCard.js`

#### Propósito
Componente de card individual para exibição de cada postagem do blog. Responsável pela apresentação visual de um único artigo.

#### Funcionalidades:
- ✅ Exibição de imagem, título, resumo, categorias e data
- ✅ Imagem com `loading="lazy"` para performance
- ✅ Fallback de imagem caso não exista na postagem
- ✅ Link para página detalhada do post
- ✅ Formatação automática de data para padrão pt-BR
- ✅ Suporte a texto customizado para botão "Ler mais"

#### Props:
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `post` | `Object` | ✅ | Objeto completo da postagem |
| `readMoreText` | `String` | ❌ | Texto customizado para link (padrão: `Ler mais →`) |

#### Estrutura do Post:
```javascript
{
  id: Number,
  slug: String,
  title: String,
  excerpt: String,
  image_url: String,
  created_at: Date,
  categories: Array[Object]
}
```

---

### 3. `Blog.module.css`
**Caminho:** `/components/Features/Blog/styles/Blog.module.css`

#### Propósito
Arquivo de estilos modular para os componentes do Blog.

#### Características:
✅ Design System consistente
✅ Grid responsivo com `auto-fill` e `minmax`
✅ Efeitos de hover com animação suave
✅ Altura uniforme para todos os cards
✅ Espaçamentos e paddings padronizados
✅ Breakpoint para mobile em 768px
✅ Sombras suaves e transições de 0.2s

#### Classes Principais:
| Classe | Descrição |
|--------|-----------|
| `.section` | Container principal da seção |
| `.grid` | Layout em grid para os cards |
| `.card` | Estilo base do card de post |
| `.category` | Badge de categoria com cor azul |
| `.footer` | Rodapé do card com data e link |

---

---

## 📌 Módulo: ContentTabs

### 1. `index.js`
**Caminho:** `/components/Features/ContentTabs/index.js`

#### Propósito
Componente de abas de conteúdo que organiza e alterna entre diferentes seções da plataforma em um mesmo espaço. É o componente principal que agrega todas as funcionalidades de conteúdo.

#### Funcionalidades:
- ✅ Sistema de abas com estado local gerenciado
- ✅ Alternância entre seções de conteúdo sem reload de página
- ✅ Aba desabilitada para funcionalidades em desenvolvimento
- ✅ Renderização condicional do conteúdo ativo
- ✅ Acessibilidade com atributo `aria-selected`
- ✅ Integração nativa com:
  - BlogSection
  - MusicGallery
  - VideoGallery
  - ProductList

#### Abas Disponíveis:
| ID | Label | Status |
|----|-------|--------|
| `reflexoes` | Reflexões & Estudos | ✅ Ativo |
| `musicas` | Músicas | ✅ Ativo |
| `videos` | Vídeos | ✅ Ativo |
| `produtos` | Produtos Religiosos | ✅ Ativo |
| `projeto1` | Em Desenvolvimento | ⏳ Desabilitado |

#### Pontos Técnicos Importantes:
- Abas desabilitadas não alteram o estado ativo
- Conteúdo padrão é a seção de Reflexões
- Possui componente `PlaceholderContent` para funcionalidades em desenvolvimento
- Cada aba possui ícone próprio para melhor UX

---

### 2. `ContentTabs.module.css`
**Caminho:** `/components/Features/ContentTabs/ContentTabs.module.css`

#### Propósito
Arquivo de estilos modular para o componente de abas de conteúdo.

#### Características:
✅ Navegação horizontal com scroll suave
✅ Scrollbar oculta para design limpo
✅ Estados de hover, active e disabled
✅ Indicador visual de aba ativa
✅ Animações de transição entre conteúdos
✅ Totalmente responsivo com 3 breakpoints
✅ Touch-action otimizado para dispositivos móveis

#### Breakpoints:
| Resolução | Ajustes |
|-----------|---------|
| `> 1024px` | Desktop |
| `769px - 1024px` | Tablet Landscape |
| `481px - 768px` | Tablet |
| `< 480px` | Mobile |

---

---

## 📌 Módulo: Music

### 1. `MusicCard.js`
**Caminho:** `/components/Features/Music/MusicCard.js`

#### Propósito
Componente de card individual para exibição de músicas com integração nativa do Spotify. Responsável pela apresentação e reprodução de cada faixa musical.

#### Funcionalidades:
- ✅ Integração nativa com player embed do Spotify
- ✅ Conversão automática de URLs do Spotify para formato embed
- ✅ Suporte a URLs internacionais do Spotify (intl-*)
- ✅ Botão para abrir música diretamente no aplicativo Spotify
- ✅ Tratamento de erros na conversão de URL
- ✅ Segurança com `noopener,noreferrer` em links externos
- ✅ Acessibilidade com atributos `aria-label`
- ✅ Iframe com `loading="lazy"` para performance

#### Props:
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `musica` | `Object` | ✅ | Objeto completo da música |

#### Estrutura do Objeto Música:
```javascript
{
  id: Number,
  titulo: String,
  artista: String,
  url_spotify: String
}
```

#### Pontos Técnicos Importantes:
- Regex inteligente que extrai ID da música independente do formato da URL
- Fallback para URL original caso não consiga converter para embed
- Abre Spotify em nova aba sem acesso ao contexto da página
- Player Spotify com tema escuro padrão

---

### 2. `MusicGallery.js`
**Caminho:** `/components/Features/Music/MusicGallery.js`

#### Propósito
Galeria completa de músicas com sistema de busca, paginação local e tratamento completo de estados. É o componente principal para listagem e filtro de músicas.

#### Funcionalidades:
- ✅ Carregamento assíncrono de músicas via API `/api/musicas?public=true`
- ✅ Busca em tempo real por título ou artista
- ✅ Paginação local com 6 itens por página
- ✅ Filtragem otimizada com `useMemo`
- ✅ Tratamento completo de estados: loading, erro, sem resultados
- ✅ Botão de limpar busca
- ✅ Contador de resultados dinâmico
- ✅ Reset automático para página 1 ao pesquisar
- ✅ Integração nativa com componente `MusicCard`

#### Estados:
| Estado | Função |
|--------|--------|
| `searchTerm` | Termo de busca digitado pelo usuário |
| `musicas` | Array completo de músicas carregadas |
| `currentPage` | Página atual da paginação |
| `loading`, `error` | Estados de carregamento e erro |

#### Pontos Técnicos Importantes:
- Paginação é feita 100% no lado cliente
- Busca é case-insensitive e trim automático
- `useMemo` evita recálculos desnecessários no filtro
- Possui fallback para diferentes formatos de resposta da API
- Ordem correta de renderização dos estados

---

### 3. `MusicCard.module.css`
**Caminho:** `/components/Features/Music/styles/MusicCard.module.css`

#### Propósito
Arquivo de estilos modular para o componente MusicCard.

#### Características:
✅ Efeito de hover com elevação e sombra
✅ Gradiente oficial das cores do Spotify
✅ Truncamento de texto com line-clamp em 2 linhas
✅ Altura uniforme para todos os cards
✅ Animações suaves de 0.2s e 0.3s
✅ 4 breakpoints responsivos
✅ Cores e espaçamentos consistentes com Design System

#### Classes Principais:
| Classe | Descrição |
|--------|-----------|
| `.musicCard` | Container principal do card |
| `.spotifyButton` | Botão com gradiente verde oficial |
| `.spotifyContainer` | Container do player embed |
| `.titulo` | Título da música com truncamento |

---

### 4. `MusicGallery.module.css`
**Caminho:** `/components/Features/Music/styles/MusicGallery.module.css`

#### Propósito
Arquivo de estilos modular para o componente MusicGallery.

#### Características:
✅ Grid responsivo com 3 colunas no desktop
✅ Campo de busca com borda arredondada e foco customizado
✅ Efeito de escala no botão de limpar busca
✅ Estados visuais para foco e hover
✅ 6 breakpoints responsivos granulares
✅ Layout para "sem resultados" com gradiente
✅ Ajustes específicos para cada tamanho de tela

#### Breakpoints Granulares:
| Resolução | Colunas |
|-----------|---------|
| `> 1024px` | 3 colunas |
| `769px - 1024px` | 2 colunas |
| `< 768px` | 1 coluna |
| Ajustes específicos para 360px, 480px, 768px |

---

---

## 📌 Módulo: Video

### 1. `VideoCard.js`
**Caminho:** `/components/Features/Video/VideoCard.js`

#### Propósito
Componente de card individual para exibição de vídeos com integração nativa do YouTube e Lazy Loading otimizado.

#### Funcionalidades:
- ✅ Integração com componente `LazyIframe` para performance
- ✅ Suporte a thumbnail personalizada do banco de dados
- ✅ Fallback automático para thumbnail padrão do YouTube
- ✅ Aspect ratio fixo 16:9
- ✅ Truncamento inteligente de título em 2 linhas
- ✅ Truncamento de descrição em 3 linhas

#### Props:
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `video` | `Object` | ✅ | Objeto completo do vídeo |

#### Pontos Técnicos Importantes:
- Integração transparente com sistema de Lazy Loading
- Thumbnail personalizada tem prioridade sobre a padrão do YouTube
- Iframe só carrega quando entra no viewport

---

### 2. `VideoGallery.js`
**Caminho:** `/components/Features/Video/VideoGallery.js`

#### Propósito
Galeria completa de vídeos com sistema de busca otimizado, paginação no servidor e debounce inteligente.

#### Funcionalidades:
- ✅ Busca com debounce de 300ms para evitar requisições excessivas
- ✅ Paginação server-side com 6 itens por página
- ✅ Tratamento completo de estados: loading, erro, sem resultados
- ✅ Hook customizado `useDebounce` implementado internamente
- ✅ `useCallback` para otimização de memória
- ✅ Reseta automaticamente para página 1 ao pesquisar
- ✅ Integração nativa com componente `VideoCard`

#### Características Únicas:
- Única galeria que utiliza paginação no lado servidor
- Debounce previne múltiplas chamadas API enquanto o usuário digita
- Todas as requisições incluem parâmetros de paginação e busca

---

### 3. `VideoCard.module.css`
**Caminho:** `/components/Features/Video/styles/VideoCard.module.css`

#### Propósito
Arquivo de estilos modular para o componente VideoCard.

#### Características:
✅ Aspect ratio 16:9 nativo para players de vídeo
✅ Gradiente oficial das cores do YouTube
✅ Truncamento de texto com line-clamp
✅ Estados de hover com elevação
✅ 3 breakpoints responsivos
✅ Placeholder para vídeos indisponíveis

---

### 4. `VideoGallery.module.css`
**Caminho:** `/components/Features/Video/styles/VideoGallery.module.css`

#### Propósito
Arquivo de estilos modular para o componente VideoGallery.

#### Características:
✅ Grid responsivo com `auto-fill`
✅ Campo de busca com foco customizado na cor azul
✅ Estados uniformes para loading, erro e sem resultados
✅ Layout responsivo com 1 coluna no mobile
✅ Ajustes específicos para sobreposição de botões

---

---

## 📌 Módulo: Testimonials

### 1. `index.js`
**Caminho:** `/components/Features/Testimonials/index.js`

#### Propósito
Componente de Dicas do Dia com sistema inteligente de carrossel que alterna automaticamente entre modo grid e carrossel de acordo com a quantidade de itens.

#### Funcionalidades:
- ✅ Dados fallback embarcados para funcionamento offline
- ✅ Carregamento dinâmico via API `/api/dicas`
- ✅ Modo automático: Grid até 3 itens, Carrossel acima de 3 itens
- ✅ Navegação com setas que aparecem dinamicamente
- ✅ Scroll suave com comportamento nativo do navegador
- ✅ Scrollbar oculta para design limpo
- ✅ Atualização automática das setas no resize da janela
- ✅ CSS-in-JS nativo com `style jsx`

#### Características Únicas:
- Único componente Features que utiliza CSS-in-JS
- Não possui arquivo .css externo
- Implementa lógica condicional de layout
- Dados de fallback sempre disponíveis mesmo se API falhar
- Setas de navegação só aparecem se realmente for possível rolar

---

---

## 🎯 Padrões Arquiteturais Observados

### ✅ Boas Práticas Implementadas:
1. **Separação de Responsabilidades**: Cada componente tem uma única função bem definida
2. **Modularidade**: Estilos isolados por módulo CSS Modules
3. **Tratamento de Erros**: Todos os componentes possuem fallback para estados de erro
4. **Performance**: Imagens com lazy loading, condicionais inteligentes
5. **Acessibilidade**: Atributos ARIA adequados
6. **Responsividade**: Todos os componentes são mobile-first
7. **Consistência**: Padrões de design e código mantidos em todos os arquivos

---

## 📋 Dependências

| Componente | Dependências Internas |
|------------|------------------------|
| BlogSection | PostCard |
| MusicGallery | MusicCard |
| VideoGallery | VideoCard |
| ContentTabs | BlogSection, MusicGallery, VideoGallery, ProductList |
| PostCard | Nenhuma |
| MusicCard | Nenhuma |
| VideoCard | LazyIframe (Performance) |
| Testimonials | Nenhuma |

---

## ✅ Status dos Componentes

| Arquivo | Status | Testes | Manutenibilidade |
|---------|--------|--------|------------------|
| BlogSection.js | ✅ Produção | Alta | Excelente |
| PostCard.js | ✅ Produção | Muito Alta | Excelente |
| Blog.module.css | ✅ Produção | - | Excelente |
| ContentTabs/index.js | ✅ Produção | Alta | Bom |
| ContentTabs.module.css | ✅ Produção | - | Excelente |
| MusicCard.js | ✅ Produção | Alta | Excelente |
| MusicGallery.js | ✅ Produção | Alta | Excelente |
| MusicCard.module.css | ✅ Produção | - | Excelente |
| MusicGallery.module.css | ✅ Produção | - | Excelente |
| VideoCard.js | ✅ Produção | Alta | Excelente |
| VideoGallery.js | ✅ Produção | Muito Alta | Excelente |
| VideoCard.module.css | ✅ Produção | - | Excelente |
| VideoGallery.module.css | ✅ Produção | - | Excelente |
| Testimonials/index.js | ✅ Produção | Alta | Bom |

---

*Documentação gerada automaticamente através de análise de código fonte*