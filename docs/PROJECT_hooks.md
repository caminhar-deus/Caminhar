# Documentação Custom Hooks
Diretório `/hooks/`

---

## 📋 Resumo Geral
| Dado | Valor |
|---|---|
| Diretório | `/hooks/` |
| Finalidade | Hooks React reutilizáveis do projeto |
| Padrão | Funcional, tipado com JSDoc |
| Dependências | React 18+ |
| Exportação | Módulos ES |

---

## 📁 Arquivos Analisados

---

### 1. 📄 `/hooks/index.js`
#### Propósito
Arquivo de entrada e índice público dos hooks. Gerencia as exportações oficiais para uso no restante da aplicação.

#### Conteúdo:
✅ Exporta `useTheme` como named export
✅ Exporta `useThemeDefault` como default export
✅ Apenas re-exportações, nenhuma lógica

#### Observação:
- Apenas o `useTheme` está oficialmente exportado publicamente
- Demais hooks são importados diretamente pelo caminho completo

---

### 2. ⚙️ `/hooks/useAdminCrud.js`
#### Propósito
Hook genérico e reutilizável para todas as operações CRUD nos painéis administrativos. Centraliza 100% da lógica repetitiva de listagem, criação, edição e exclusão.

#### Funcionalidades:
✅ Fetch automático de dados na montagem
✅ Estados de loading, erro e formulário
✅ Manipulação de inputs e formulário
✅ Modo edição / criação
✅ Paginação integrada
✅ Tratamento de erros da API
✅ Integração nativa com toast notifications
✅ Callbacks de sucesso customizáveis

#### API:
| Parâmetro | Padrão | Descrição |
|---|---|---|
| `apiEndpoint` | Obrigatório | Endereço da API para este CRUD |
| `initialFormData` | Obrigatório | Estado inicial do formulário |
| `usePagination` | `false` | Habilita lógica de paginação |
| `itemsPerPage` | `10` | Itens por página |
| `onSuccess` | Opcional | Callback após operação bem sucedida |

#### Retorno:
`items, loading, error, formData, isEditing, currentPage, totalPages, handleInputChange, setFieldValue, handleEdit, handleSubmit, handleDelete, resetForm, goToPage`

#### Características:
- 🔄 Utiliza `useCallback` para evitar re-renderizações desnecessárias
- ✅ Trata erros de validação da API automaticamente
- 🚀 Volta para página 1 automaticamente ao criar novo item
- 🧹 Reseta formulário automaticamente após sucesso
- É o hook mais utilizado na área administrativa, presente em todos os módulos

---

### 3. 📊 `/hooks/usePerformanceMetrics.js`
#### Propósito
Hook completo para monitoramento de performance e Core Web Vitals. Coleta, formata, classifica e reporta métricas de performance automaticamente.

#### Métricas Monitoradas:
| Categoria | Métricas |
|---|---|
| Core Web Vitals | LCP, FID, CLS, INP |
| Adicionais | FCP, TTFB, TBT, MPFID |
| Custom | Long Tasks, Resource Loading, Uso de Memória |

#### Funcionalidades:
✅ Integração nativa com biblioteca `web-vitals`
✅ Classificação automática das métricas conforme padrões Google
✅ Log debug automático em desenvolvimento
✅ Envio assíncrono para analytics com `sendBeacon`
✅ Performance Observer para long tasks e recursos lentos
✅ Detecção automática de problemas de performance
✅ Contexto adicional: conexão, memória, user agent

#### Características:
- 🚀 Carrega `web-vitals` dinamicamente, não impacta bundle inicial
- ✅ Falha silenciosamente, analytics nunca quebra a aplicação
- 📱 Detecta tipo de conexão e modo economia de dados
- ⚠️ Alerta automaticamente sobre recursos que demoram mais de 1s
- Disponibiliza funções standalone para uso fora de componentes React

---

### 4. 🎨 `/hooks/useTheme.js`
#### Propósito
Hook de gerenciamento de tema e acesso centralizado aos Design Tokens do projeto. Único ponto de verdade para todo o sistema de design.

#### Funcionalidades:
✅ Detecção automática de preferência do sistema operacional
✅ Persistência no localStorage
✅ Aplicação automática de classes e atributos no HTML
✅ Toggle entre modo claro/escuro
✅ Helpers para acessar todos os tokens de design
✅ Utilitários para breakpoints e responsividade

#### Tokens Disponíveis:
`colors, spacing, typography, borders, shadows, breakpoints, animations`

#### Helpers:
| Função | Descrição |
|---|---|
| `getColor(path, alpha)` | Obtém cor com opacidade opcional, converte hex para rgba automaticamente |
| `getSpacing(key)` | Acessa valores de espaçamento |
| `getFontSize(key)` | Acessa tamanhos de fonte |
| `getShadow(key)` | Acessa sombras |
| `getRadius(key)` | Acessa raios de borda |
| `isMobile() / isTablet() / isDesktop()` | Verificação responsiva em tempo real |

#### Características:
- ⚡ Evita hidratação incorreta com flag `mounted`
- ✅ Suporta tanto atributo `data-theme` quanto classe `dark`
- 🔄 Nenhuma re-renderização desnecessária
- Único hook utilizado em toda a aplicação para qualquer valor de design

---

## 📌 Observações Gerais
1. ✅ Todos os hooks seguem padrão funcional moderno do React
2. ✅ Possuem documentação JSDoc completa
3. ✅ Utilizam corretamente `useCallback` e `useEffect`
4. ✅ Tratam adequadamente casos de SSR / window undefined
5. ✅ Nenhuma dependência externa desnecessária
6. ✅ Padrão consistente em todos os arquivos

---

## 🔗 Relação com Outras Partes do Projeto
| Hook | Utilizado em |
|---|---|
| `useAdminCrud` | Todos os componentes em `/components/Admin/` |
| `usePerformanceMetrics` | `_app.js`, painel administrativo |
| `useTheme` | Todos os componentes UI, páginas e layout |

---

## 🛠️ Padrões Adotados
- Named exports são preferidos ao invés de default export
- Todas as funções retornadas são memoizadas
- Efeitos sempre possuem array de dependências correto
- Tratamento de erro consistente
- Nenhuma lógica de negócio dentro dos hooks, apenas lógica de UI e estado