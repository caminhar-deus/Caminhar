# Documentação Componentes Admin

---

## 📑 Índice de Componentes
- [AdminCrudBase.js](#arquivo-componentsadminadmincrudbasejs)
- [AdminAudit.js](#arquivo-componentsadminadminauditjs)
- [AdminDashboard.js](#arquivo-componentsadminadmindashboardjs)
- [AdminDicas.js](#arquivo-componentsadminadmindicasjs)
- [AdminMusicas.js](#arquivo-componentsadminadminmusicasjs)
- [AdminPosts.js](#arquivo-componentsadminadminpostsjs)
- [AdminProducts.js](#arquivo-componentsadminadminproductsjs)
- [AdminRolesTab.js](#arquivo-componentsadminadminrolestabjs)
- [AdminUsers.js](#arquivo-componentsadminadminusersjs)
- [AdminUsersTab.js](#arquivo-componentsadminadminuserstabjs)
- [AdminVideos.js](#arquivo-componentsadminadminvideosjs)
- [index.js](#arquivo-componentsadminindexjs)
- [withAdminAuth.js](#arquivo-componentsadminwithadminauthjs)

---

## Arquivo: `/components/Admin/AdminCrudBase.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente React Genérico |
| **Propósito** | Base reutilizável para criação de painéis CRUD administrativos |
| **Linhas de Código** | 628 |
| **Status** | Produção |
| **Dependências** | `useAdminCrud` Hook, React Toast |

---

### ✅ Principais Características

✅ **Elimina duplicação de código**: Usado por AdminMusicas, AdminVideos, AdminPosts, AdminProducts, etc  
✅ **Totalmente configurável via props**  
✅ **Atualização otimista** para ações instantâneas na UI  
✅ **Busca local ultra-rápida** sem requisições a API  
✅ **Drag & Drop nativo para reordenação**  
✅ **Exportação para CSV nativo com compatibilidade Excel**  
✅ **Validação integrada com Zod**  
✅ **Skeleton Loading nativo**  
✅ **Suporte a paginação**  
✅ **Modo Somente Leitura**  
✅ **Tratamento automático de erros e notificações**

---

### 🎯 Propósito e Arquitetura

Este é o componente **core e mais importante** do módulo administrativo.  
Foi projetado para ser a única implementação de lógica de CRUD, onde todos os outros painéis administrativos apenas passam configuração através de props, sem necessidade de reescrever lógica.

Todo painel administrativo novo deve ser implementado usando este componente base, ao invés de criar código do zero.

---

### 📌 Props Principais

| Prop | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `apiEndpoint` | `string` | ✅ | - | Endpoint base da API para operações CRUD |
| `title` | `string` | ✅ | - | Título exibido no topo do painel |
| `fields` | `Array` | ✅ | - | Configuração dos campos do formulário |
| `columns` | `Array` | ✅ | - | Configuração das colunas da tabela |
| `initialFormData` | `Object` | ✅ | - | Estrutura inicial do formulário |
| `validationSchema` | `ZodSchema` | ❌ | - | Schema para validação automática |
| `usePagination` | `boolean` | ❌ | `false` | Habilita paginação |
| `itemsPerPage` | `number` | ❌ | `10` | Itens por página |
| `searchable` | `boolean` | ❌ | `false` | Habilita barra de busca local |
| `reorderable` | `boolean` | ❌ | `false` | Habilita Drag & Drop |
| `exportable` | `boolean` | ❌ | `false` | Botão de exportar CSV |
| `readOnly` | `boolean` | ❌ | `false` | Desativa edição e formulário |

---

### ⚙️ Funcionalidades Implementadas

#### 1. 🔄 Atualização Otimista
- Quando usuário altera status booleano (Publicado/Rascunho)
- UI é atualizado **imediatamente** antes da resposta da API
- Em caso de falha, é feito rollback automático para estado anterior
- Usuário tem percepção de performance instantânea

#### 2. 🔍 Busca Local
- Busca é feita 100% no lado cliente
- Filtra todos os campos string e number automaticamente
- Sem latência, sem requisições adicionais
- Funciona inclusive com paginação ativada

#### 3. 📤 Exportação CSV
- Exporta apenas os itens visíveis na busca
- Tratamento especial para caracteres especiais
- Adiciona BOM UTF-8 para compatibilidade nativa com Excel
- Converte valores booleanos para texto amigável

#### 4. 🎚️ Toggle de Status com 1 clique
- Campos booleanos na tabela são renderizados como botões clicáveis
- Altera status diretamente sem precisar abrir formulário
- Inclui loading e confirmação visual

#### 5. 🎞️ Skeleton Loading
- Estado de loading nativo com animação
- Renderiza 5 linhas falsas enquanto carrega dados
- Melhora percepção de performance

#### 6. ↕️ Reordenação Drag & Drop
- Funcionalidade nativa sem dependências externas
- Apenas habilitado quando não há busca ativa
- Dispara callback `onReorder` para persistir nova ordem

---

### 🧠 Estados Internos

| Estado | Uso |
|---|---|
| `searchTerm` | Termo da busca local |
| `localItems` | Cópia local dos items para operações otimistas e drag&drop |
| `dragOverIndex` | Index do item sendo arrastado |
| `isFormVisible` | Controla visibilidade do formulário |

---

### 🔌 Integração com Hook

Utiliza o hook `useAdminCrud` que contém a lógica pura de negócio:
- Fetch de items
- Gerenciamento de formulário
- Submit, Delete, Editar
- Paginação
- Tratamento de erros

---

### 🎨 Pontos Técnicos Destacados

1. **Separação de responsabilidades**: Componente contém apenas lógica de renderização, toda lógica de negócio fica no hook dedicado
2. **Callbacks memoizados com `useCallback`**
3. **Efeitos controlados com dependências corretas**
4. **Tratamento adequado de null/undefined**
5. **Auto-scroll suave para formulário ao abrir/editar**
6. **Cabeçalho da tabela fixo durante scroll**
7. **Compatibilidade com todos os navegadores modernos**

---

### ❗ Observações Importantes

> ✅ A notificação de sucesso global foi removida deste componente para evitar duplicação, já que o sistema já possui uma notificação genérica centralizada.

> ⚠️ Quando `readOnly = true` todos os botões de ação, formulário e edição são removidos automaticamente da interface.

> 📌 Todos os campos de formulário suportam componentes customizados através da prop `renderCustomFormField`

> 🔒 **Fallback de Segurança**: Botão Cancelar executa `resetForm()` ANTES de fechar o formulário, garantindo que nenhum estado fique leakado mesmo em cenários de erro raro. Este comportamento é intencional e faz parte do design defensivo.

---

### 📊 Uso no Projeto

Este componente é atualmente utilizado por:
- ✅ AdminMusicas.js
- ✅ AdminVideos.js
- ✅ AdminPosts.js
- ✅ AdminProducts.js
- ✅ AdminDicas.js
- ✅ AdminUsers.js

---

### ✅ Padrões Aplicados

- ✅ DRY (Don't Repeat Yourself)
- ✅ Composição sobre Herança
- ✅ Separação de Responsabilidades
- ✅ Inversão de Controle
- ✅ Configuração ao invés de Código
- ✅ Otimizações de UX perceptível

---

## Arquivo: `/components/Admin/AdminAudit.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente React Independente |
| **Propósito** | Painel de visualização e exportação do histórico global de auditoria |
| **Linhas de Código** | 203 |
| **Status** | Produção |
| **Dependências** | Next Router, React Toast |

---

### ✅ Principais Características

✅ **Histórico completo de todas as ações do sistema**  
✅ **Filtro por período com data e hora**  
✅ **Busca local em todos os campos**  
✅ **Exportação para CSV compatível com Excel**  
✅ **Paginação com 50 itens por página**  
✅ **Skeleton Loading nativo**  
✅ **Tratamento automático de expiração de sessão**  
✅ **Cabeçalho fixo durante scroll**

---

### 🎯 Propósito e Arquitetura

Componente independente que não utiliza o AdminCrudBase, implementado especialmente para o log de auditoria.  
Monitora **todas as ações realizadas por todos os usuários** no sistema, registrando data, usuário, ação executada e detalhes.

Este é o único componente administrativo que não utiliza o sistema genérico de CRUD pois possui requisitos específicos de visualização.

---

### ⚙️ Funcionalidades Implementadas

#### 1. 🔍 Filtros
- Busca textual por ação, detalhes ou ID do usuário
- Filtro por período com data inicial e final
- Filtros são aplicados localmente sem novas requisições

#### 2. 📤 Exportação CSV
- Exporta apenas os logs visíveis após filtros
- Formata data para padrão pt-BR automaticamente
- Tratamento correto de caracteres especiais
- Nome do arquivo contém data da exportação

#### 3. 🔐 Tratamento de Autenticação
- Detecta automaticamente status 401 da API
- Exibe mensagem amigável e recarrega página para login
- Evita loop infinito de requisições não autorizadas

---

---

## Arquivo: `/components/Admin/AdminDashboard.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente React |
| **Propósito** | Painel inicial com estatísticas gerais do sistema |
| **Linhas de Código** | 161 |
| **Status** | Produção |
| **Dependências** | Admin.module.css |

---

### ✅ Principais Características

✅ **Visão unificada de todos os conteúdos do sistema**  
✅ **Contagem separada por status (Publicado / Rascunho)**  
✅ **Gráfico de barras nativo CSS sem bibliotecas externas**  
✅ **Cartões clicáveis que navegam diretamente para as abas**  
✅ **Animação suave no carregamento das barras**  
✅ **Tratamento para evitar Layout Shift**

---

### 🎯 Propósito e Arquitetura

Este é o painel padrão que abre quando o administrador acessa o sistema.  
Fornece uma visão geral rápida de todo o conteúdo cadastrado, com estatísticas de:
- Artigos
- Músicas
- Vídeos
- Produtos
- Dicas
- Usuários

---

### ⚙️ Funcionalidades Implementadas

#### 1. 📊 Gráfico de Barras CSS
- Implementado 100% com CSS nativo
- Sem dependências de bibliotecas de gráficos
- Animação de crescimento suave de 1 segundo
- Barras sempre aparecem mesmo com valor 0
- Valor exibido dentro da própria barra

#### 2. 🎯 Navegação Integrada
- Cada cartão é clicável
- Ao clicar automaticamente altera a aba ativa para o módulo correspondente
- Experiência de navegação fluida sem recarregamento

---

---

## Arquivo: `/components/Admin/AdminDicas.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente Configuração |
| **Propósito** | Gerenciamento de dicas do dia |
| **Linhas de Código** | 49 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase |

---

### ✅ Principais Características

✅ **Exemplo mínimo e perfeito de uso do AdminCrudBase**  
✅ **Apenas configuração, ZERO lógica implementada**  
✅ **Trunca texto longo na listagem automaticamente**  
✅ **Busca local ativada**  
✅ **Toggle de status com 1 clique**

---

### 🎯 Propósito e Arquitetura

Este componente é a referência para demonstração de como usar corretamente o AdminCrudBase.  
Não contém absolutamente nenhuma lógica própria, apenas passa as configurações necessárias para o componente base.

> 📌 **Referência**: Sempre que for criar um novo módulo administrativo, use este arquivo como exemplo mínimo.

---

### 📌 Configuração Aplicada

| Prop | Valor |
|---|---|
| `apiEndpoint` | `/api/admin/dicas` |
| `searchable` | `true` |
| `itemNameSingular` | `dica` |
| `itemNamePlural` | `dicas` |

---

---

## Arquivo: `/components/Admin/AdminMusicas.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente CRUD Avançado |
| **Propósito** | Gerenciamento completo de músicas do Spotify |
| **Linhas de Código** | 223 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase, Zod |

---

### ✅ Principais Características

✅ **Exemplo completo e avançado do AdminCrudBase**  
✅ **Validação com Zod nativa**  
✅ **Integração automática com API do Spotify**  
✅ **Preview embed do Spotify diretamente na tabela**  
✅ **Reordenação Drag & Drop persistida**  
✅ **Renderização customizada de campos**  
✅ **Botão para puxar dados automaticamente do Spotify**

---

### 🎯 Propósito e Arquitetura

Este componente demonstra todo o potencial do AdminCrudBase, utilizando todas as funcionalidades avançadas disponíveis. Serve como exemplo completo para módulos mais complexos.

---

### ⚙️ Funcionalidades Implementadas

#### 1. 🎵 Integração Spotify
- Botão que busca automaticamente título e artista apenas com o link
- Preview embed nativo do Spotify diretamente na listagem
- Validação de URL do Spotify

#### 2. ↕️ Reordenação Persistida
- Implementa callback `onReorder`
- Calcula offset corretamente por página
- Salva nova ordem automaticamente no banco de dados
- Funciona mesmo com paginação ativada

#### 3. 🎨 Campo Customizado
- Usa `renderCustomFormField` para adicionar botão extra no campo do Spotify
- Demonstra como extender a funcionalidade padrão do AdminCrudBase sem modificá-lo

---

### 📌 Configuração Aplicada

| Prop | Valor |
|---|---|
| `apiEndpoint` | `/api/admin/musicas` |
| `searchable` | `true` |
| `exportable` | `true` |
| `reorderable` | `true` |
| `showItemCount` | `true` |
| `validationSchema` | Zod Schema |

---


---

## Arquivo: `/components/Admin/AdminPosts.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente CRUD Avançado |
| **Propósito** | Gerenciamento completo de posts e artigos do blog |
| **Linhas de Código** | 265 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase, Zod, ImageUploadField |

---

### ✅ Principais Características

✅ **Geração automática de Slug a partir do título**  
✅ **Validação customizada com regra de negócio**  
✅ **Upload nativo de imagens de capa**  
✅ **Preview de miniatura na listagem**  
✅ **Renderização customizada de campos**  
✅ **Reordenação Drag & Drop persistida**  
✅ **Validação avançada com Zod**

---

### 🎯 Propósito e Arquitetura

Demonstra funcionalidades avançadas do AdminCrudBase com campos customizados e validação de regras de negócio.

---

### ⚙️ Funcionalidades Implementadas

#### 1. 🔗 Geração Automática de Slug
- Ao sair do campo título, o slug é gerado automaticamente
- Remove acentos, converte para minúsculas e formata corretamente
- Apenas gera se o campo slug estiver vazio

#### 2. ✅ Validação Customizada
- Impede publicação de posts sem imagem de capa
- Lança erro estruturado que é exibido diretamente no campo correspondente
- Integra perfeitamente com o sistema de erros do AdminCrudBase

---

---

## Arquivo: `/components/Admin/AdminProducts.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente CRUD Avançado |
| **Propósito** | Gerenciamento de produtos e loja virtual |
| **Linhas de Código** | 233 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase, Zod |

---

### ✅ Principais Características

✅ **Integração automática com Mercado Livre**  
✅ **Botão para puxar dados automáticos de produtos**  
✅ **Preview de imagem na listagem**  
✅ **Suporte a múltiplas imagens por produto**  
✅ **Integração com múltiplas marketplaces**  
✅ **Indicador visual de links cadastrados**

---

### ⚙️ Funcionalidades Implementadas

#### 1. 🛒 Integração Mercado Livre
- Apenas com o link do produto, busca automaticamente título, preço e todas as imagens
- Preenche todos os campos do formulário magicamente
- Inclui loading e feedback visual para o usuário

#### 2. 🎯 Indicador de Marketplaces
- Mostra visualmente quais marketplaces estão cadastrados para cada produto
- Ícones coloridos para Mercado Livre, Shopee e Amazon
- Permite visualização rápida sem precisar abrir o formulário

---

---

## Arquivo: `/components/Admin/AdminRolesTab.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente CRUD |
| **Propósito** | Gestão de cargos e permissões do sistema |
| **Linhas de Código** | 96 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase |

---

### ✅ Principais Características

✅ **Componente customizado de seleção de permissões**  
✅ **Migração automática de permissões antigas**  
✅ **Visualização em tags coloridas na listagem**  
✅ **Validação de pelo menos 1 permissão por cargo**

---

### 🎯 Propósito e Arquitetura

Gerenciamento completo do sistema RBAC (Role Based Access Control) do projeto. Permite criar cargos com diferentes níveis de acesso ao sistema administrativo.

---

---

## Arquivo: `/components/Admin/AdminUsers.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente Container |
| **Propósito** | Container com abas para gestão de usuários e cargos |
| **Linhas de Código** | 44 |
| **Status** | Produção |
| **Dependências** | AdminUsersTab, AdminRolesTab |

---

### ✅ Principais Características

✅ **Sistema de abas nativo sem dependências**  
✅ **Navegação fluida entre módulos**  
✅ **Transição suave entre conteúdos**  
✅ **Não contém lógica própria, apenas composição**

---


---

## Arquivo: `/components/Admin/AdminUsersTab.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente CRUD |
| **Propósito** | Gerenciamento completo de usuários e administradores |
| **Linhas de Código** | 150 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase, Zod, date-fns |

---

### ✅ Principais Características

✅ **Carregamento dinâmico de cargos cadastrados**  
✅ **Validação condicional de senha por contexto**  
✅ **Formatação relativa de último login em português**  
✅ **Campo customizado de seleção de cargos**  
✅ **Fallback padrão para cargos básicos**  
✅ **Tratamento automático de sessão expirada**

---

### 🎯 Propósito e Arquitetura

Este componente implementa todo o sistema de gerenciamento de usuários do painel administrativo, com suporte a cargos dinâmicos e validação inteligente de senhas.

---

---

## Arquivo: `/components/Admin/AdminVideos.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Componente CRUD Avançado |
| **Propósito** | Gerenciamento completo de vídeos do YouTube |
| **Linhas de Código** | 278 |
| **Status** | Produção |
| **Dependências** | AdminCrudBase, Zod |

---

### ✅ Principais Características

✅ **Extração automática de ID do YouTube em qualquer formato de URL**  
✅ **Embed nativo do YouTube diretamente na listagem**  
✅ **Botão para puxar dados automaticamente do YouTube**  
✅ **Suporte a capa personalizada**  
✅ **Reordenação Drag & Drop persistida**  
✅ **Cores customizadas com identidade visual do YouTube**

---

---

## Arquivo: `/components/Admin/index.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Arquivo de Barril (Barrel File) |
| **Propósito** | Ponto de entrada público para todos os componentes administrativos |
| **Linhas de Código** | 24 |
| **Status** | Produção |

---

### ✅ Principais Características

✅ **Exporta todos os componentes de um único lugar**  
✅ **Facilita importações limpas e organizadas**  
✅ **Centraliza a API pública do módulo Admin**  
✅ **Documentado com exemplo de uso**

> 📌 Padrão de importação recomendado:
> ```javascript
> import { AdminCrudBase, TextField } from './components/Admin';
> ```

---

---

## Arquivo: `/components/Admin/withAdminAuth.js`

---

### 📋 Visão Geral

| Item | Descrição |
|---|---|
| **Tipo** | Higher-Order Component (HOC) |
| **Propósito** | Camada de segurança e proteção de rotas administrativas |
| **Linhas de Código** | 135 |
| **Status** | Produção |

---

### ✅ Principais Características

✅ **Protege automaticamente qualquer página administrativa**  
✅ **Gerencia ciclo completo de autenticação**  
✅ **Inclui formulário de login nativo**  
✅ **Layout padrão administrativo com cabeçalho e logout**  
✅ **Verificação de autenticação em primeiro render**  
✅ **Tratamento de sessão expirada**

---

> 🎯 Este é o componente de segurança mais importante do sistema. Todas as páginas administrativas devem ser encapsuladas por este HOC.

---

> Última atualização da documentação: 20/04/2026
