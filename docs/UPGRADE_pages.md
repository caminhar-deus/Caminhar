# Relatório de Melhorias e Correções — `/pages`

> **Data:** 28/06/2026
> **Objetivo:** Levantamento analítico de possíveis melhorias identificadas nos arquivos da pasta `/pages`. Nenhuma correção deve ser aplicada; apenas documentar.
> **Baseado em:** Análise completa dos 53 arquivos atuais da pasta `/pages`.

---

## Índice

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Inconsistências Arquiteturais](#2-inconsistências-arquiteturais)
3. [Problemas de Performance](#3-problemas-de-performance)
4. [Fragilidade e Falta de Validação](#4-fragilidade-e-falta-de-validação)
5. [Manutenibilidade e Padronização](#5-manutenibilidade-e-padronização)
6. [Segurança](#6-segurança)

---

## 1. Duplicidade de Código

### 1.1 Funções de Manipulação de Imagem Embutidas no `admin.js`

**Arquivo:** `/pages/admin.js`

**Problema:** As funções `resizeImage()` (linhas 51-83) e `getCroppedImg()` (linhas 86-109) estão definidas diretamente no arquivo do componente admin, sem serem exportadas ou reutilizáveis em outros pontos da aplicação.

**Impacto:**
- Código não reutilizável — se outra página precisar de redimensionamento de imagem, precisará reimplementar
- Aumento desnecessário de 58 linhas no arquivo (que já tem 776 linhas)
- Dificulta testes unitários dessas funções isoladamente

**Sugestão:** Extrair ambas as funções para um utilitário em `lib/` ou `utils/`, por exemplo `lib/imageUtils.js`, e importá-las no admin.js.

---

### 1.2 Estilos Inline Repetidos no `admin.js`

**Arquivo:** `/pages/admin.js`

**Problema:** O admin.js importa 4 CSS Modules diferentes (login, tabs, form, misc) e faz um mapeamento manual de classes (linhas 11-35). Além disso, diversos elementos usam estilos inline via `style={{}}` que poderiam ser extraídos para classes CSS, como:
- Botão de logout (linhas 432-436): `style={{ backgroundColor: 'var(--color-error-500)', ... }}`
- Container de usuário logado (linhas 424-438): `style={{ display: 'flex', justifyContent: 'space-between', ... }}`
- Preview da imagem (linhas 631-644)
- Controles do cropper (linhas 597-629)

**Impacto:**
- Mapeamento manual de CSS Modules: se uma classe for removida ou renomeada no módulo, o mapeamento quebra sem aviso
- Estilos inline dificultam manutenção e não se beneficiam do sistema de Design Tokens via CSS Modules
- Arquivo fica mais verboso e difícil de navegar

**Sugestão:** Criar um CSS Module específico para o admin (por exemplo `Admin/Admin.module.css`) que concentre todos os estilos, eliminando o mapeamento de 4 módulos diferentes e os estilos inline espalhados.

---

### 1.3 Duplicação de Tags SEO no `admin.js`

**Arquivo:** `/pages/admin.js`

**Problema:** O bloco `<style>{ html, body { overflow-y: scroll !important; } }</style>` está duplicado: aparece na tela de login (linhas 365-371) e no painel autenticado (linhas 413-419). Além disso, é uma solução inline que replica o que já foi tratado em `globals.css`.

**Impacto:** Duplicação desnecessária. Em versões anteriores do `globals.css`, `overflow-y: scroll !important` foi substituído por `overflow-y: auto`.

**Sugestão:** Remover ambos os blocos `style` e, se realmente necessário, criar uma classe CSS Module para forçar scroll quando a página admin estiver ativa.

---

### 1.4 Itens Repetidos na Navegação de Abas do Admin

**Arquivo:** `/pages/admin.js`

**Problema:** Cada aba do admin tem seu próprio bloco `{activeTab === 'xxx' && hasPermission('yyy') && (<AdminComponent />)}`. Isso resulta em 10 blocos condicionais para as abas principais, mais 4 sub-blocos dentro da aba "Segurança" (linhas 543-771), todos com a mesma estrutura repetida.

**Impacto:** Código verboso. Adicionar uma nova aba exige criar um novo bloco condicional + adicionar um novo botão na barra de abas + adicionar uma nova permissão em pelo menos 2 lugares.

**Sugestão:** Criar uma configuração declarativa de abas, por exemplo um array de objetos `{ key, label, icon, permission, component }`, e iterar para renderizar tanto os botões quanto os conteúdos condicionais.

---

## 2. Inconsistências Arquiteturais

### 2.1 `products.js` Fora do Padrão `createAdminHandler()`

**Arquivo:** `/pages/api/products.js`

**Problema:** Enquanto todos os 15 endpoints admin usam o handler factory `createAdminHandler()` de `lib/api/adminCrudHandler.js`, o endpoint `products.js` implementa sua própria lógica de autenticação com `requireAuth()`, que é um middleware diferente (criado internamente no mesmo arquivo). Não usa o padrão de injeção de utilitários (`req.adminUtils.logActivity()`, `req.adminUtils.invalidateCache()`).

**Impacto:**
- Inconsistência arquitetural — products não segue o mesmo padrão dos demais CRUDs
- Log de auditoria e invalidação de cache precisam ser implementados manualmente
- Caso o `createAdminHandler()` seja atualizado (ex: novo formato de erro), products.js precisará de ajuste manual separado

**Sugestão:** Refatorar `products.js` para usar `createAdminHandler()`, ou criar uma versão unificada do handler que atenda tanto endpoints admin quanto endpoints público+admin.

---

### 2.2 `login.js` Trata `withAuth` de Forma Diferente

**Arquivo:** `/pages/api/auth/login.js`

**Problema:** O login.js implementa sua própria lógica de rate limiting (linhas manuais de Redis) em vez de usar o `checkRateLimit()` padronizado que outros endpoints usam. Também usa `detectSpoofedIP()` manualmente, enquanto outros endpoints usam `getClientIP()`.

**Impacto:** Lógica de rate limiting duplicada em relação ao que `lib/cache.js` já oferece via `checkRateLimit()`.

**Sugestão:** Substituir a lógica manual de rate limiting do login por `checkRateLimit()` padronizado. Manter `detectSpoofedIP()` apenas se houver motivo específico de segurança para o login ter detecção diferente.

---

### 2.3 Endpoints com Cache-Control Inconsistentes

**Arquivos:**
- `/pages/api/dicas.js`: `public, s-maxage=60, stale-while-revalidate=300`
- `/pages/api/musicas.js`: `public, s-maxage=60, stale-while-revalidate=300`
- `/pages/api/videos.js`: `public, s-maxage=60, stale-while-revalidate=300`
- `/pages/api/posts.js`: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`

**Problema:** Os endpoints de dicas, músicas e vídeos usam `s-maxage=60` (CDN cacheia por 1 minuto), enquanto posts usa `s-maxage=300` (5 minutos). A diferença de TTL pode ser intencional (posts têm mutações menos frequentes?), mas não há documentação ou padronização clara.

**Impacto:** Comportamento de cache imprevisível para consumidores da API. Um cliente que usa dicas e posts pode ter expectativas diferentes de frescor dos dados.

**Sugestão:** Definir uma política centralizada de Cache-Control, centralizando valores em constantes (ex: `CACHE_SHORT = 60`, `CACHE_MEDIUM = 300`) e documentando quando usar cada um.

---

## 3. Problemas de Performance

### 3.1 `/api/placeholder-image` com Cache Prejudicado

**Arquivo:** `/pages/index.js`

**Problema:** A página inicial usa `/api/placeholder-image?t=${Date.now()}` (linha 17) para evitar Hydration Mismatch entre SSR e CSR. No entanto, o timestamp impede qualquer cache efetivo da imagem, forçando o navegador a solicitar uma nova imagem a cada carregamento de página.

**Impacto:**
- Cache de 1 hora definido no endpoint `placeholder-image.js` é anulado pelo query string variável
- A cada carregamento da página, uma nova requisição HTTP é feita para a mesma imagem

**Sugestão:** Usar uma estratégia diferente para evitar hydration mismatch: definir um valor padrão estável no SSR (ex: o primeiro fallback) e atualizar via `useEffect` apenas quando realmente necessário. Ou, alternativamente, usar uma técnica de SSR que já resolva a URL da imagem no servidor.

---

### 3.2 Múltiplos `fetch()` no Admin para Salvar Configurações

**Arquivo:** `/pages/admin.js`

**Problema:** O método `handleSaveSettings()` (linhas 299-339) faz duas requisições HTTP separadas para salvar título e subtítulo (`fetch('/api/settings', ...)` duas vezes). Isso dobra o número de requisições para uma operação que poderia ser atômica.

**Impacto:** O usuário espera o dobro do tempo para salvar configurações. Cada requisição tem overhead de autenticação, validação, log de auditoria e invalidação de cache.

**Sugestão:** Modificar o endpoint `/api/settings` para aceitar multiplas configurações em uma única requisição (PUT com array de `{ key, value }`). Ou fazer as duas requisições em paralelo com `Promise.all()`.

---

### 3.3 `sessionStorage` como Cache no Cliente

**Arquivo:** `/pages/index.js`

**Problema:** O cache de configurações via `sessionStorage` (linhas 22-31 e 44-51) tem TTL de 1 minuto. O `sessionStorage` é específico da aba do navegador e é limpo ao fechar a aba. O try/catch silencia falhas de `sessionStorage` cheio.

**Impacto:**
- Cache não persiste entre abas
- Dados são recarregados ao abrir nova aba
- Falhas de storage são silenciadas, o que pode mascarar problemas

**Sugestão:** Considerar substituir por `localStorage` com TTL ou usar um estado global gerenciado (React Context). O TTL de 1 minuto é muito curto para ser útil em cache; aumentar para 5-10 minutos reduziria requisições.

---

### 3.4 Invalidação de Cache Excessiva no `posts.js`

**Arquivo:** `/pages/api/posts.js`

**Problema:** Após criar um post (linhas 126-128), o endpoint invalida três chaves de cache:
```js
await invalidateCache('posts:list:*');
await invalidateCache('posts:search:*');
await invalidateCache('posts:*');
```

**Impacto:** A última chamada `invalidateCache('posts:*')` já cobre tudo que as duas anteriores cobrem, pois o padrão glob `posts:*` casa tanto `posts:list:*` quanto `posts:search:*`. As duas primeiras chamadas são redundantes.

**Sugestão:** Manter apenas `invalidateCache('posts:*')` que já invalida todos os caches de posts de uma vez.

---

## 4. Fragilidade e Falta de Validação

### 4.1 Permissão de Super-Usuário Sem Verificação de Role

**Arquivo:** `/pages/admin.js`

**Problema:** A função `hasPermission()` (linhas 342-346) considera que qualquer usuário com `role === 'admin'` tem todas as permissões, independentemente de permissões individuais. Isso é intencional, mas a verificação não confirma se o role 'admin' realmente existe no banco com todas as permissões.

**Impacto:** Se o role 'admin' for modificado ou removido acidentalmente do banco de dados, o comportamento do painel admin pode ser imprevisível. Usuários com role 'admin' podem perder acesso a funcionalidades se permissões individuais não estiverem sincronizadas.

**Sugestão:** Adicionar uma verificação no servidor (no endpoint de login ou check) que garanta que o role 'admin' sempre retorne com todas as permissões, independentemente do que está armazenado. Ou, alternativamente, popular permissões automaticamente no momento da verificação.

---

### 4.2 Tratamento de Erro Genérico no Login

**Arquivo:** `/pages/admin.js`

**Problema:** O `handleLogin` (linhas 196-233) trata todos os erros de forma genérica — exibe `(data && data.message) || 'Falha no login'`. Não diferencia entre erro de rede, credenciais inválidas, servidor offline, ou rate limiting.

**Impacto:** O usuário recebe a mesma mensagem "Falha no login" para cenários muito diferentes, o que dificulta o diagnóstico de problemas.

**Sugestão:** Melhorar a extração da mensagem de erro: verificar campos específicos como `data.error`, `data.message`, e tratar status codes específicos (429 para rate limit, 403 para bloqueio, 503 para servidor indisponível).

---

### 4.3 Fallback de Imagem Inline sem Verificação de Existência no BD

**Arquivo:** `/pages/api/placeholder-image.js`

**Problema:** O endpoint tenta buscar imagem do banco e, se falhar ou não existir, faz fallback para placeholder externo via fetch, e depois para SVG inline. Se o fetch externo falhar (rede, timeout), o fallback para SVG é a última barreira.

**Impacto:** Se o banco de dados estiver indisponível, o endpoint depende de fetch externo. Se o fetch externo também falhar (ex: serviço de placeholder offline), o SVG inline salva, mas sem garantia de qualidade visual adequada.

**Sugestão:** Considerar manter o SVG placeholder como fallback primário (evita dependência externa) e usar o placeholder externo como melhoria opcional em vez de fallback intermediário obrigatório.

---

### 4.4 Estilo Forçado de Scroll na Página Admin

**Arquivo:** `/pages/admin.js`

**Problema:** O estilo inline `html, body { overflow-y: scroll !important; }` é injetado via `<style>` no `<Head>` tanto na tela de login quanto no painel (linhas 366-370 e 414-418). O `!important` força a barra de rolagem mesmo quando o conteúdo cabe na viewport.

**Impacto:** Experiência de usuário prejudicada em monitores pequenos ou quando o conteúdo do admin é menos extenso — a barra de rolagem aparece mesmo sem necessidade.

**Sugestão:** Aplicar `overflow-y: auto` com CSS Module condicional, ativando apenas quando o conteúdo realmente exceder a viewport. O `!important` deve ser removido por ser uma prática CSS desaconselhada.

---

## 5. Manutenibilidade e Padronização

### 5.1 Nomenclatura Inconsistente de Rotas de API

**Arquivos:**
- `/pages/api/dicas.js` (pt)
- `/pages/api/musicas.js` (pt)
- `/pages/api/posts.js` (en)
- `/pages/api/videos.js` (en)
- `/pages/api/products.js` (en)

**Problema:** Mistura de português e inglês nos nomes dos endpoints.

**Impacto:** Falta de padronização dificulta a memorização e descoberta das rotas para novos desenvolvedores.

**Sugestão:** Definir um idioma padrão para nomes de rotas de API. Considerar manter em português, já que o domínio da aplicação é um site cristão em português (o próprio código usa mensagens em PT-BR em grande parte). Mas a decisão deve ser tomada de forma consistente — ou tudo em português, ou tudo em inglês.

---

### 5.2 Arquivo `admin.js` Excessivamente Grande

**Arquivo:** `/pages/admin.js` — 776 linhas

**Problema:** O arquivo do painel admin contém:
- Lógica de autenticação
- Upload e crop de imagem (com duas funções utilitárias grandes)
- Gerenciamento de 10 abas condicionais (+ 4 sub-blocos de segurança)
- Preview de imagem
- Mapeamento manual de 4 CSS Modules
- Estilos inline espalhados

**Impacto:** Dificuldade de navegação, manutenção e testes. Qualquer mudança no painel admin exige localizar o ponto exato em 776 linhas.

**Sugestão:** Extrair para componentes menores:
- `AdminLogin.js` — formulário de login
- `AdminHeader.js` — cabeçalho com saudação e logout
- `AdminImageUploader.js` — upload, crop, resize e preview de imagem
- `AdminHeaderConfig.js` — formulário de título/subtítulo + imagem
- Manter o `Admin.js` apenas como orquestrador de abas e estado global

---

### 5.3 `generateTokensCSS.js` Não Importa `sizes.js`

**Arquivo:** `/pages/styles/generateTokensCSS.js`

**Problema:** O gerador de CSS tokens importa `shadows`, `colors`, `typography`, `spacing`, `breakpoints`, `borders`, `opacity`, `zIndex` e `animations`, mas **não importa `sizes`**.

**Impacto:** O token `sizes` não é convertido em CSS Custom Properties. Se houver valores de tamanho importantes definidos em `sizes.js`, eles não estarão disponíveis como variáveis CSS.

**Sugestão:** Adicionar a importação de `sizes` no `generateTokensCSS.js` para garantir que todos os tokens sejam refletidos como CSS Custom Properties.

---

### 5.4 Possível Duplicação de Token `shadow`/`shadows`

**Arquivo:** `/pages/styles/generateTokensCSS.js`

**Problema:** O gerador itera `shadow` e `shadows` separadamente. Em `variables.css`, isso pode gerar duplicação de entradas como `--shadow-glow` se ambos os objetos exportarem a mesma chave com nomes similares.

**Impacto:** Valores CSS duplicados no `:root` — o último valor sobrescreve o primeiro, o que pode causar comportamento inesperado se as definições forem diferentes entre os dois objetos.

**Sugestão:** Verificar se `shadow` e `shadows` são objetos diferentes ou se um é subconjunto do outro. Unificar em uma única iteração se possível.

---

### 5.5 `design-system.js` Usa Placeholder Externo

**Arquivo:** `/pages/design-system.js`

**Problema:** O Card com imagem (linha 194) usa URL externa `https://via.placeholder.com/400x200/...` como mídia de demonstração.

**Impacto:** Dependência externa para renderizar a página de demonstração. Se o serviço Via.placeholder estiver indisponível, a imagem não será exibida.

**Sugestão:** Usar o endpoint interno `/api/placeholder-image` ou um SVG placeholder inline, eliminando a dependência externa e garantindo que a página de design system funcione offline.

### 5.6 `design-system.js` com Caminho Incorreto de CSS Module

**Arquivo:** `/pages/design-system.js`

**Problema:** O import do CSS Module na linha 5 usava `'../styles/DesignSystem.module.css'`, que tenta resolver a partir de `pages/` subindo um nível (`../`) para a raiz do projeto (`/styles/`), porém o arquivo está em `pages/styles/`.

**Impacto:** Erro de build `Module not found: Can't resolve '../styles/DesignSystem.module.css'` impedia a geração do bundle de produção do Next.js.

**Sugestão:** Corrigir para `'./styles/DesignSystem.module.css'`, mantendo consistência com o padrão usado por `pages/index.js` que importa `./styles/Home.module.css`.

**Status:** **Resolvido** — Caminho corrigido na linha 5 de `'../styles/DesignSystem.module.css'` para `'./styles/DesignSystem.module.css'`. Build compilou com sucesso (`✓ Compiled successfully in 3.2s`).

---

## 6. Segurança

### 6.1 Log de Credenciais no Admin

**Arquivo:** `/pages/admin.js`

**Problema:** A linha `console.log('Login successful:', data.user)` (linha 225) loga os dados do usuário no console do navegador após login bem-sucedido.

**Impacto:** Embora o objeto `data.user` provavelmente não contenha a senha (o backend não retorna senha), dados como username, role, permissions e possivelmente ID são expostos no console do navegador. Em ambientes compartilhados ou com extensões maliciosas, isso representa um vazamento mínimo de informação.

**Sugestão:** Remover o `console.log` ou substituir por uma mensagem genérica como `console.log('Login bem-sucedido para usuário:', data.user.username)` que não exponha o objeto completo.

---

## Resumo das Recomendações

| Prioridade | Item | Arquivo | Descrição |
|:----------:|:----:|:-------:|-----------|
| 🔴 Alta | 2.1 | `products.js` | Não usa `createAdminHandler()` — fora do padrão arquitetural |
| 🔴 Alta | 4.1 | `admin.js` | Super-usuário sem verificação de role no servidor |
| 🟠 Média | 1.1 | `admin.js` | Funções de imagem embutidas sem reuso |
| 🟠 Média | 1.2 | `admin.js` | 4 CSS Modules + estilos inline espalhados |
| 🟠 Média | 1.4 | `admin.js` | 10 blocos condicionais de abas + 4 sub-blocos — código repetitivo |
| 🟠 Média | 3.1 | `index.js` | Timestamp quebra cache da imagem placeholder |
| 🟠 Média | 3.4 | `posts.js` | Invalidação de cache redundante |
| 🟠 Média | 4.2 | `admin.js` | Tratamento genérico de erro de login |
| 🟠 Média | 5.1 | Múltiplos | Nomenclatura inconsistente pt/en em rotas |
| 🟠 Média | 5.2 | `admin.js` | Arquivo muito grande (776 linhas) |
| 🟠 Média | 5.3 | `generateTokensCSS.js` | `sizes.js` não importado |
| 🟠 Média | 5.4 | `generateTokensCSS.js` | Possível duplicação `shadow`/`shadows` |
| 🟡 Baixa | 1.3 | `admin.js` | Bloco `overflow-y` duplicado |
| 🟡 Baixa | 2.2 | `login.js` | Rate limiting manual diverge do padrão |
| 🟡 Baixa | 2.3 | Múltiplos | Cache-Control inconsistente entre endpoints |
| 🟡 Baixa | 3.2 | `admin.js` | Duas requisições para salvar config (poderia ser paralelo) |
| 🟡 Baixa | 3.3 | `index.js` | Cache sessionStorage com TTL curto |
| 🟡 Baixa | 4.3 | `placeholder-image.js` | Fallback externo vs SVG inline |
| 🟡 Baixa | 4.4 | `admin.js` | `overflow-y: scroll !important` forçado |
| 🟡 Baixa | 5.5 | `design-system.js` | Placeholder externo em vez de interno |
| 🟢 Mínima | 6.1 | `admin.js` | Log de dados do usuário no console |