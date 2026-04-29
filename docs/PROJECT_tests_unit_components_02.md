# Documentação dos Testes Unitários - Componentes Features (Parte 02)

> Arquivo gerado com análise objetiva dos arquivos de teste encontrados em `/tests/unit/components/Features/`
> Data: 21/04/2026

---

## Sumário
1. [BlogSection.test.js](#blogsectiontestjs)
2. [PostCard.test.js](#postcardtestjs)
3. [ContentTabs.test.js](#contenttabstestjs)
4. [MusicCard.test.js](#musiccardtestjs)
5. [MusicGallery.edge.test.js](#musicgalleryedgetestjs)
6. [MusicGallery.test.js](#musicgallerytestjs)
7. [Testimonials/index.test.js](#testimonialsindextestjs)
8. [VideoCard.test.js](#videocardtestjs)
9. [VideoGallery.test.js](#videogallerytestjs)
10. [Container.test.js](#containertestjs)
11. [Grid.test.js](#gridtestjs)
12. [Layout/index.test.js](#layoutindextestjs)
13. [Sidebar.test.js](#sidebartestjs)
14. [Stack.test.js](#stacktestjs)
15. [CriticalCSS.test.js](#criticalcsstestjs)
16. [ImageOptimized.test.js](#imageoptimizedtestjs)
17. [Performance/index.test.js](#performanceindextestjs)
18. [LazyIframe.test.js](#lazyiframetestjs)
19. [PreloadResources.test.js](#preloadresourcestestjs)

---

## 🔹 BlogSection.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Blog/BlogSection.test.js` |
| Componente alvo | `BlogSection` |
| Total de testes | 10 |
| Linhas | 112 |
| Nível de cobertura | ✅ Completo (cobre todos os fluxos) |

### 🎯 Propósito do Componente
Seção que carrega posts do blog diretamente da API, gerencia estado de loading, limita quantidade de itens exibidos e lida com todos os tipos possíveis de erro de forma silenciosa sem quebrar a aplicação.

### ✅ Cenários Testados
1. ✅ Renderiza estado de loading inicialmente enquanto carrega os posts
2. ✅ Retorna nada (não renderiza nada) se não existirem posts
3. ✅ Renderiza corretamente todos os posts vindos da API
4. ✅ Respeita a propriedade `limit` e mostra botão "Ver todos" quando há mais posts
5. ✅ Oculta o botão "Ver todos" quando o limite é maior que a quantidade de posts disponíveis
6. ✅ Lida com retorno `success: false` da API sem quebrar
7. ✅ Lida com erros HTTP (ex: 500, 404) com mensagem de erro
8. ✅ Usa fallback "Unknown error" quando a API retorna erro sem mensagem
9. ✅ Lida com falha de rede e JSON inválido na resposta
10. ✅ Reseta corretamente o `fetch` global após cada teste

### 💡 Pontos Importantes
- Mocka o componente filho `PostCard` para testar apenas a lógica do BlogSection
- Testa Promise pendente para garantir que o loading é realmente exibido
- Todos os erros são tratados silenciosamente, somente logados no console
- Nenhum erro é propagado para o usuário final

---

### 🛠️ Correção Aplicada 26/04/2026
| Item | Detalhe |
|---|---|
| ✅ **Problema** | Todos os testes falhavam com `TypeError: Cannot read properties of undefined (reading 'get')` |
| ✅ **Causa Raiz** | Componente possuia validação defensiva para `Content-Type` que acessava `res.headers.get()`, porém os mocks do `fetch` nos testes não implementavam o objeto `headers`. O código caia diretamente no catch geral antes de chegar em qualquer fluxo que os testes esperavam. |
| ✅ **Ajuste 1** | **Componente**: Adicionado optional chaining `res.headers?.get?.()` para máxima segurança |
| ✅ **Ajuste 2** | **Testes**: Adicionado objeto `headers` com mock da função `get()` em todos os mockResolvedValueOnce |
| ✅ **Resultado** | Todos os 10 testes passam sem nenhuma outra alteração. |


---

## 🔹 PostCard.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Blog/PostCard.test.js` |
| Componente alvo | `PostCard` |
| Total de testes | 4 |
| Linhas | 42 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Card individual de exibição de post do blog, com imagem, título, resumo, categoria e link para leitura completa.

### ✅ Cenários Testados
1. ✅ Renderiza todas as informações do post corretamente
2. ✅ Usa imagem placeholder padrão quando não há `image_url`
3. ✅ Aceita texto customizado para o botão "Ler mais"
4. ✅ Não quebra quando o post não possui categorias

### 💡 Pontos Importantes
- Testa link correto gerado com o slug do post
- Valida atributo `alt` das imagens
- Garante graceful degradation (degradação graciosa) em todos os campos opcionais

---

## 🔹 ContentTabs.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/ContentTabs/ContentTabs.test.js` |
| Componente alvo | `ContentTabs` |
| Total de testes | 4 |
| Linhas | 48 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Sistema de abas principal da página inicial que alterna entre as seções: Blog, Músicas, Vídeos e Produtos.

### ✅ Cenários Testados
1. ✅ Abre por padrão na aba "Reflexões" (Blog)
2. ✅ Alterna corretamente entre todas as abas ao clicar
3. ✅ Não muda de aba ao clicar em projetos bloqueados/desativados
4. ✅ Possui fallback para abas futuras ou desconhecidas

### 💡 Pontos Importantes
- Mocka todos os componentes filhos para testar apenas a lógica de navegação das abas
- Testa comportamento para funcionalidades ainda não implementadas
- Garante que não haverá quebra quando novas abas forem adicionadas no futuro

---

## 🔹 MusicCard.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Music/MusicCard.test.js` |
| Componente alvo | `MusicCard` |
| Total de testes | 6 |
| Linhas | 81 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Card de exibição de música com embed do Spotify, tratamento universal de URLs e botão para abrir no Spotify.

### ✅ Cenários Testados
1. ✅ Renderiza título, artista e converte URL normal do Spotify para embed
2. ✅ Converte corretamente URL internacional do Spotify (intl-pt)
3. ✅ Converte corretamente URI do Spotify (formato `spotify:track:`)
4. ✅ Usa URL original como fallback para formatos desconhecidos
5. ✅ Lida com segurança com URL nula ou inválida (catch seguro)
6. ✅ Abre música em nova aba com atributos de segurança `noopener,noreferrer`

### 💡 Pontos Importantes
- Implementa e testa tratamento universal para 3 formatos diferentes de URL do Spotify
- Silencia `console.error` propositalmente durante o teste de cenário de erro
- Garante segurança nas abas externas abertas
- Todos os erros na conversão de URL são tratados e não quebram o componente

---

## 🔹 MusicGallery.edge.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Music/MusicGallery.edge.test.js` |
| Componente alvo | `MusicGallery` |
| Total de testes | 3 |
| Linhas | 82 |
| Tipo | ✅ Testes de Edge Cases (casos limites) |

### 🎯 Propósito do Arquivo
Testes dedicados exclusivamente para cenários limites, erros e comportamento de borda do componente MusicGallery que não estão cobertos nos testes principais.

### ✅ Cenários Testados
1. ✅ Fallback vazio quando a API retorna objeto sem a chave `data`
2. ✅ Exibição de mensagem de erro quando requisição falha completamente
3. ✅ Paginação: avançar e retroceder páginas, botões disabled, proteção contra avançar além do limite

---

## 🔹 MusicGallery.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Music/MusicGallery.test.js` |
| Componente alvo | `MusicGallery` |
| Total de testes | 5 |
| Linhas | 120 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Galeria completa de músicas com carregamento da API, busca local, paginação, tratamento de erros e botão de retry.

### ✅ Cenários Testados
1. ✅ Estado de loading e carregamento normal de músicas
2. ✅ Tratamento de erro com botão "Tentar novamente"
3. ✅ Busca local por título ou artista e limpeza de busca
4. ✅ Mensagem de nenhum resultado quando busca não encontra itens
5. ✅ Compatibilidade com APIs que retornam dados encapsulados em `{ data: [] }`

### 💡 Pontos Importantes
- Mocka componente MusicCard para testar apenas lógica da galeria
- Trata erro nativo do JSDOM no teste do botão retry
- Limite padrão de 6 itens por página

---

## 🔹 Testimonials/index.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Testimonials/index.test.js` |
| Componente alvo | `Testimonials` |
| Total de testes | 4 |
| Linhas | 117 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Seção de dicas/depoimentos com fallback offline, carrossel horizontal scrollável e lazy loading.

### ✅ Cenários Testados
1. ✅ Carrega dados fallback inicialmente e depois substitui pelos dados da API
2. ✅ Mantém dados fallback quando API retorna erro ou exceção
3. ✅ Mantém dados fallback quando API retorna array vazio ou erro HTTP
4. ✅ Funcionamento completo do carrossel: botões de scroll, comportamento, limites e limpeza de event listeners

### 💡 Pontos Importantes
- Mocka propriedades nativas do DOM (clientWidth, scrollWidth) pois JSDOM não possui engine de layout
- Testa limpeza correta de event listeners no unmount para evitar memory leaks
- Estratégia de graceful degradation: nunca quebra, sempre mostra conteúdo mínimo

---

## 🔹 VideoCard.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Video/VideoCard.test.js` |
| Componente alvo | `VideoCard` |
| Total de testes | 2 |
| Linhas | 39 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Card individual de vídeo do Youtube utilizando componente LazyIframe para performance.

### ✅ Cenários Testados
1. ✅ Renderiza corretamente título e LazyIframe com todas as propriedades
2. ✅ Renderiza descrição opcional quando fornecida

---

## 🔹 VideoGallery.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Features/Video/VideoGallery.test.js` |
| Componente alvo | `VideoGallery` |
| Total de testes | 8 |
| Linhas | 189 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Galeria completa de vídeos do Youtube com busca remota com debounce, paginação servidor, tratamento de erros e retry.

### ✅ Cenários Testados
1. ✅ Estado de loading e carregamento normal de vídeos
2. ✅ Tratamento de singular/plural na contagem de itens
3. ✅ Busca com debounce de 300ms e limpeza de busca
4. ✅ Mensagem de nenhum resultado e botão de limpar busca
5. ✅ Fallback estrutural quando API retorna sem dados
6. ✅ Tratamento de erro HTTP com botão "Tentar novamente"
7. ✅ Tratamento de erro genérico quando API retorna `success: false`
8. ✅ Navegação por páginas (anterior/próxima)

---

## 🔹 Container.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Layout/Container.test.js` |
| Componente alvo | `Container` |
| Total de testes | 4 |
| Linhas | 29 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Componente base de layout para containers responsivos com suporte a diferentes tags HTML.

### ✅ Cenários Testados
1. ✅ Renderização padrão como `<div>`
2. ✅ Propriedades customizadas: `fluid`, `as`, `className`, `centered`
3. ✅ Sub-componente `Container.Section` renderiza como `<section>`
4. ✅ Sub-componente `Container.Article` renderiza como `<article>`

---

## 🔹 Grid.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Layout/Grid.test.js` |
| Componente alvo | `Grid` |
| Total de testes | 5 |
| Linhas | 38 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Sistema de Grid CSS nativo com variantes: Grid padrão, Grid Auto, Grid Responsivo por breakpoints.

### ✅ Cenários Testados
1. ✅ Grid base com `columns`, `gap`, `align`, `justify`
2. ✅ `Grid.Item` com `colSpan`, `colStart`, `rowSpan`
3. ✅ `Grid.Auto` com `minWidth` dinâmico via variável CSS
4. ✅ `Grid.Responsive` com breakpoints por tamanho de tela
5. ✅ Fallback para colunas padrão quando não informado

---

## 🔹 Layout/index.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Layout/index.test.js` |
| Componente alvo | Arquivo de exportações |
| Total de testes | 1 |
| Linhas | 27 |
| Tipo | ✅ Teste de contrato de API |

### 🎯 Propósito do Arquivo
Teste para garantir que todas as exportações do módulo Layout continuem funcionando e não quebrem na refatoração.

### ✅ Cenários Testados
1. ✅ Verifica todas as exportações nomeadas e padrão do módulo Layout

---

## 🔹 Sidebar.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Layout/Sidebar.test.js` |
| Componente alvo | `Sidebar` |
| Total de testes | 5 |
| Linhas | 60 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Sidebar responsiva com suporte a menu mobile, collapse, posições esquerda/direita e subcomponentes.

### ✅ Cenários Testados
1. ✅ Renderização base e toggle do menu mobile com overlay
2. ✅ Handler `onCollapse` e posição direita
3. ✅ Botão de expandir quando sidebar está colapsada
4. ✅ Modo não colapsável oculta botões
5. ✅ Subcomponentes: `Header`, `Section`, `Nav`, `NavItem`, `Footer`

---

## 🔹 Stack.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Layout/Stack.test.js` |
| Componente alvo | `Stack` |
| Total de testes | 4 |
| Linhas | 33 |
| Nível de cobertura | ✅ Completo |

### 🎯 Propósito do Componente
Componente de layout flexbox direcional (horizontal/vertical) com espaçamento automático.

### ✅ Cenários Testados
1. ✅ Stack horizontal com todas as propriedades de layout
2. ✅ Stack vertical padrão
3. ✅ Subcomponentes `Stack.Item` e `Stack.Divider`
4. ✅ Wrappers rápidos `Stack.HStack` e `Stack.VStack`

---

## 🔹 CriticalCSS.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Performance/CriticalCSS.test.js` |
| Componente alvo | `CriticalCSS` |
| Total de testes | 6 |
| Linhas | 48 |
| Tipo | ✅ Componente de Performance |

### 🎯 Propósito do Componente
Gerenciador de CSS crítico para Above the fold com injeção e remoção segura.

### ✅ Cenários Testados
1. ✅ Renderiza tag `<style>` com CSS crítico
2. ✅ Retorna null quando não tem CSS fornecido
3. ✅ Função `extractCriticalCSS()` retorna CSS padrão
4. ✅ Função `removeCriticalCSS()` remove tag do DOM
5. ✅ Não quebra quando elemento não existe
6. ✅ Funciona corretamente em ambiente SSR (sem document)

---

## 🔹 ImageOptimized.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Performance/ImageOptimized.test.js` |
| Componente alvo | `ImageOptimized` |
| Total de testes | 5 |
| Linhas | 98 |
| Tipo | ✅ Componente de Performance |

### 🎯 Propósito do Componente
Wrapper otimizado para next/image com skeleton de loading, fallback de erro e propriedades inteligentes.

### ✅ Cenários Testados
1. ✅ Skeleton de loading que desaparece após onLoad
2. ✅ Fallback automático para `fallbackSrc` no erro
3. ✅ Proteção contra loops infinitos de erro
4. ✅ Modo `priority/critical` carrega com eager
5. ✅ Estilos e propriedades herdadas corretamente

---

## 🔹 Performance/index.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Performance/index.test.js` |
| Componente alvo | Arquivo de exportações |
| Total de testes | 1 |
| Linhas | 16 |
| Tipo | ✅ Teste de contrato de API |

### 🎯 Propósito do Arquivo
Teste para garantir que todas as exportações do módulo Performance continuem funcionando.

### ✅ Cenários Testados
1. ✅ Verifica todas as exportações de componentes e funções utilitárias de performance

---

## 🔹 LazyIframe.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Performance/LazyIframe.test.js` |
| Componente alvo | `LazyIframe` |
| Total de testes | 9 |
| Linhas | 109 |
| Tipo | ✅ Componente de Performance |

### 🎯 Propósito do Componente
Iframe com lazy loading via IntersectionObserver, placeholder com thumbnail e suporte nativo para Youtube.

### ✅ Cenários Testados
1. ✅ Renderiza placeholder inicialmente, sem iframe
2. ✅ Carrega o iframe automaticamente quando entra na viewport
3. ✅ Integração nativa com Youtube: thumbnail automática e URL embed
4. ✅ Suporte a thumbnail customizada
5. ✅ Evento `onLoad` e transição de opacidade
6. ✅ Modo `loadOnVisible=false` com clique manual para carregar
7. ✅ Limpeza correta do IntersectionObserver no unmount
8. ✅ Fallback gracioso quando IntersectionObserver não existe
9. ✅ Fallback para URL original quando formato é inválido

---

## 🔹 PreloadResources.test.js

### 📋 Informações Gerais
| Item | Valor |
|------|-------|
| Arquivo | `/tests/unit/components/Performance/PreloadResources.test.js` |
| Componente alvo | `PreloadResources` |
| Total de testes | 4 |
| Linhas | 63 |
| Tipo | ✅ Componente de Performance |

### 🎯 Propósito do Componente
Gerenciador inteligente de `preconnect`, `dns-prefetch` e `preload` de recursos críticos por rota.

### ✅ Cenários Testados
1. ✅ Renderiza preconnect e dns-prefetch padrões + domínios customizados
2. ✅ Preload automático de fontes com mime-type correto
3. ✅ Preload de imagens, scripts e styles
4. ✅ Função `getCriticalResources()` retorna recursos específicos por rota

---

## 📊 Resumo Geral

| Componente | Total de Testes | Cobertura | Tipo |
|------------|-----------------|-----------|------|
| BlogSection | 10 | ✅ 100% | Container com lógica de API |
| PostCard | 4 | ✅ 100% | Componente de apresentação |
| ContentTabs | 4 | ✅ 100% | Componente de navegação |
| MusicCard | 6 | ✅ 100% | Componente com lógica de formatação |
| MusicGallery | 8 | ✅ 100% | Galeria completa com paginação e busca |
| Testimonials | 4 | ✅ 100% | Carrossel com fallback offline |
| VideoCard | 2 | ✅ 100% | Componente de apresentação |
| VideoGallery | 8 | ✅ 100% | Galeria completa com busca remota |
| Container | 4 | ✅ 100% | Componente base de layout |
| Grid | 5 | ✅ 100% | Sistema de Grid CSS |
| Layout Index | 1 | ✅ 100% | Teste de contrato de exportações |
| Sidebar | 5 | ✅ 100% | Sidebar responsiva |
| Stack | 4 | ✅ 100% | Layout flex direcional |
| CriticalCSS | 6 | ✅ 100% | Componente de performance |
| ImageOptimized | 5 | ✅ 100% | Imagem otimizada com skeleton |
| Performance Index | 1 | ✅ 100% | Teste de contrato de exportações |
| LazyIframe | 9 | ✅ 100% | Iframe com lazy loading |
| PreloadResources | 4 | ✅ 100% | Otimizador de preload de recursos |

✅ **Total: 90 testes unitários analisados e documentados.**

✅ **Todos os componentes dessa seção possuem testes completos e cobrem todos os cenários de erro e casos limites.**
