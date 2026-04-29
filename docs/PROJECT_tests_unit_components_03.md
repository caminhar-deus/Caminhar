# Documentação Testes Unitários - Componentes (Parte 03)

> **Data da Análise:** 21/04/2026  
> **Versão:** 1.0  
> **Arquivos Analisados:** 21 arquivos de teste unitário de componentes

---

## 📋 Sumário dos Testes

| Arquivo | Componente | Total de Testes | Cobertura Funcional |
|---------|------------|-----------------|---------------------|
| `ProductCard.test.js` | ProductCard | 5 | 100% das funcionalidades |
| `ProductList.test.js` | ProductList | 7 | 100% das funcionalidades |
| `ArticleSchema.test.js` | ArticleSchema | 2 | 100% dos casos de uso |
| `BreadcrumbSchema.test.js` | BreadcrumbSchema | 3 | 100% dos casos de uso |
| `Head.test.js` | SEOHead | 8 | 100% das funcionalidades |
| `index.test.js` | SEO Index Exports | 1 | Validação de exports |
| `MusicSchema.test.js` | MusicSchema | 2 | 100% dos casos de uso |
| `OrganizationSchema.test.js` | OrganizationSchema | 1 | 100% dos casos de uso |
| `VideoSchema.test.js` | VideoSchema | 2 | 100% dos casos de uso |
| `WebsiteSchema.test.js` | WebsiteSchema | 1 | 100% dos casos de uso |
| `Alert.test.js` | Alert | 3 | 100% das funcionalidades |
| `Badge.test.js` | Badge | 4 | 100% das funcionalidades |
| `Button.test.js` | Button | 3 | 100% das funcionalidades |
| `Card.test.js` | Card | 4 | 100% das funcionalidades |
| `index.test.js` | UI Index Exports | 1 | Validação de exports |
| `Input.test.js` | Input | 2 | 100% das funcionalidades |
| `Modal.test.js` | Modal | 6 | 100% das funcionalidades |
| `Select.test.js` | Select | 3 | 100% das funcionalidades |
| `Spinner.test.js` | Spinner | 3 | 100% das funcionalidades |
| `TextArea.test.js` | TextArea | 4 | 100% das funcionalidades |
| `Toast.test.js` | Toast | 8 | 100% das funcionalidades |

---

---

## 1. 📦 ProductCard.test.js
**Arquivo:** `/tests/unit/components/Products/ProductCard.test.js`
**Propósito:** Componente de exibição individual de produto

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização básica | Exibe título, descrição, preço e fallback "Sem imagem" quando não há imagem |
| 2 | Links de Marketplaces | Renderiza botões para Mercado Livre, Shopee e Amazon quando links são fornecidos |
| 3 | Carregamento de Imagem | Exibe loading inicial e remove após evento `onLoad` da imagem |
| 4 | Carrossel de Imagens | Navegação infinito entre múltiplas imagens com botões próximo/anterior e contador de posição |
| 5 | Lightbox Tela Cheia | Abre modal em tela cheia ao clicar na imagem, permite fechar e navegação interna |

### 📌 Observações Técnicas:
- Usa `fireEvent` para simular eventos DOM reais (click, load)
- Valida comportamento negativo (não exibe elementos que não devem existir)
- Testa ciclos completos de interação do usuário
- Cobertura total: 99 linhas de código

---

## 2. 📦 ProductList.test.js
**Arquivo:** `/tests/unit/components/Products/ProductList.test.js`
**Propósito:** Componente de listagem e filtragem de produtos

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Estado Loading + Dados | Ciclo completo: loading inicial → renderização dos produtos → chamada API com parâmetros corretos |
| 2 | Tratamento de Erro | Exibe mensagem amigável quando a API retorna erro |
| 3 | Lista Vazia | Exibe mensagem apropriada quando não existem produtos cadastrados |
| 4 | Busca com Debounce | Apenas dispara a API 500ms após o usuário parar de digitar no campo de busca |
| 5 | Paginação | Navegação entre páginas ao clicar nos botões de paginação |
| 6 | Filtros de Preço | Aplica filtros de preço mínimo e máximo, e exibe mensagem quando filtros não retornam resultados |
| 7 | Ordenação Personalizada | Ordena produtos por `position` (menor primeiro), fallback para 9999 se nulo, desempate por ID maior |

### 📌 Observações Técnicas:
- Mock do `fetch` global para simular respostas da API
- Usa `jest.useFakeTimers()` para controlar o tempo do debounce
- Valida parâmetros exatos enviados para a API
- Usa `act()` para manter sincronia com ciclo de vida React
- Cobertura total: 155 linhas de código

---
## 3. 🔍 ArticleSchema.test.js
**Arquivo:** `/tests/unit/components/SEO/ArticleSchema.test.js`
**Propósito:** Componente de Dados Estruturados JSON-LD para Artigos (Google SEO)

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização completa | Injetar script JSON-LD no `document.head` com todos os campos obrigatórios e opcionais |
| 2 | Valores padrão e opcionais | Usa `publishedAt` como valor padrão para `dateModified` se não informado, omite campos opcionais quando não fornecidos |

### 📌 Observações Técnicas:
- Limpa o `document.head` após cada teste para evitar contaminação
- Faz parse do JSON gerado para validação estrutural
- Valida conformidade com schema.org para tipo Article
- Cobertura total: 39 linhas de código

---
## 4. 🔍 BreadcrumbSchema.test.js
**Arquivo:** `/tests/unit/components/SEO/BreadcrumbSchema.test.js`
**Propósito:** Componente de Dados Estruturados JSON-LD para Breadcrumb (Migalha de Pão)

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Adição automática do Início | Insere automaticamente o item "Início" como primeiro nível do breadcrumb |
| 2 | Prevenção de duplicação | Não duplica o item Início caso ele já esteja na lista fornecida |
| 3 | Formatação de URLs | Trata corretamente URLs absolutas, relativas com e sem barra inicial |

### 📌 Observações Técnicas:
- Componente adiciona automaticamente domínio base para URLs relativas
- Segue padrão oficial do Google para BreadcrumbList
- Valida quantidade exata de itens gerados
- Cobertura total: 34 linhas de código

---

## 📊 Qualidade Geral dos Testes

### ✅ Pontos Positivos:
- Todos os testes são determinísticos e independentes
- Valida tanto comportamento positivo quanto negativo
- Simulam interações reais do usuário
- Limpeza adequada de mocks e estado entre testes
- Nomenclatura clara e descritiva para cada caso de teste
- 100% das funcionalidades dos componentes estão cobertas

### 📋 Padrões Utilizados:
- **Arrange-Act-Assert** em todos os testes
- Uso correto da Testing Library (sem seletores por classe)
- Mocks somente do que é necessário
- Validação de efeitos colaterais (chamadas API, DOM)

---


---

## 5. 🔍 Head.test.js
**Arquivo:** `/tests/unit/components/SEO/Head.test.js`
**Propósito:** Componente principal de Meta Tags SEO e Open Graph

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Meta Tags Básicas | Título concatenado, descrição, keywords, canonical e tags padrão de robots |
| 2 | Rota Raiz | Não adiciona path extra na URL canônica quando é a página inicial |
| 3 | Título Identico | Não duplica o nome do site no título quando já é igual |
| 4 | URL Canônica Customizada | Suporta URL customizada e remove query params automaticamente no OG |
| 5 | Processamento de Imagens | Converte caminhos relativos para absolutos e mantém URLs externas intactas |
| 6 | Noindex | Aplica meta tags `noindex, nofollow` quando solicitado |
| 7 | Tipo Artigo | Renderiza todas as meta tags específicas para artigos com datas, autor e seção |
| 8 | Valor Padrão Autor | Usa nome do site como autor padrão no Twitter quando não informado |

### 📌 Observações Técnicas:
- Mock completo do `next/head`, `next/router` e configurações de SEO
- Testa todas as variantes e edge cases do componente
- Valida formatação de datas para o Twitter
- Cobertura total: 122 linhas de código

---
## 6. 🔍 index.test.js (SEO)
**Arquivo:** `/tests/unit/components/SEO/index.test.js`
**Propósito:** Arquivo barril de exportação de todos os componentes SEO

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Validação Exports | Verifica que todos os componentes, schemas, utilitários e configurações estão sendo re-exportados corretamente |

### 📌 Observações Técnicas:
- Garante que `SEOHead` é o export default
- Valida presença de todos os 8 schemas + 2 funções utilitárias + configuração
- Previne quebras acidentais na API pública do módulo SEO
- Cobertura total: 34 linhas de código

---
## 7. 🔍 MusicSchema.test.js
**Arquivo:** `/tests/unit/components/SEO/MusicSchema.test.js`
**Propósito:** Dados Estruturados JSON-LD para Músicas e Gravações

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Esquema Completo | Gera estrutura completa MusicRecording com artista, álbum, duração, letra e links para plataformas |
| 2 | Campos Opcionais | Funciona corretamente com apenas campos mínimos, omite propriedades não informadas |

### 📌 Observações Técnicas:
- Gera automaticamente links para YouTube e Spotify a partir dos IDs
- Segue schema.org oficial para tipo MusicRecording
- Cobertura total: 36 linhas de código

---
## 8. 🔍 OrganizationSchema.test.js
**Arquivo:** `/tests/unit/components/SEO/OrganizationSchema.test.js`
**Propósito:** Dados Estruturados JSON-LD para Organização / Site

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Esquema Básico | Gera estrutura padrão Organization com nome, descrição e logotipo |

### 📌 Observações Técnicas:
- Schema global utilizado por todo o site
- Injetado automaticamente na página inicial
- Cobertura total: 16 linhas de código

---
---

## 9. 🔍 VideoSchema.test.js
**Arquivo:** `/tests/unit/components/SEO/VideoSchema.test.js`
**Propósito:** Dados Estruturados JSON-LD para Vídeos

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Esquema Completo | Gera estrutura VideoObject com embed, duração, visualizações, transcrição e links |
| 2 | Campos Mínimos e Opcionais | Suporta tags em formato string, contentUrl e renderização com apenas campos obrigatórios |

### 📌 Observações Técnicas:
- Implementa schema.org VideoObject completo
- Suporta estatísticas de interação e transcrições
- Cobertura total: 36 linhas de código

---
## 10. 🔍 WebsiteSchema.test.js
**Arquivo:** `/tests/unit/components/SEO/WebsiteSchema.test.js`
**Propósito:** Dados Estruturados JSON-LD para Site com Busca Sitelinks

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Esquema WebSite | Gera estrutura com SearchAction para busca integrada no Google |

### 📌 Observações Técnicas:
- Inclui campo `potentialAction` para caixa de pesquisa nos resultados
- Schema global injetado na página inicial
- Cobertura total: 17 linhas de código

---
## 11. 🎨 Alert.test.js
**Arquivo:** `/tests/unit/components/UI/Alert.test.js`
**Propósito:** Componente UI de Alerta e Notificação

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Variantes de Status | Renderiza todos os 4 tipos: info, success, warning, error com ícones correspondentes |
| 2 | Ícone Customizado | Suporta substituição do ícone padrão por componente customizado |
| 3 | Funcionalidade Fechar | Botão de fechar, callback `onClose` e remoção do DOM após clique |

### 📌 Observações Técnicas:
- Usa `rerender` para testar múltiplas variantes em um único teste
- Valida tanto o estado visual quanto o comportamento funcional
- Cobertura total: 33 linhas de código

---
## 12. 🎨 Badge.test.js
**Arquivo:** `/tests/unit/components/UI/Badge.test.js`
**Propósito:** Componente UI de Badge, Contador e Indicador

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Badge Padrão | Renderiza texto, ícones esquerdo/direito, animação pulse e posições |
| 2 | Modo Dot | Renderiza apenas indicador visual sem texto |
| 3 | Badge.Counter | Exibe números, limite máximo com `99+`, não renderiza com 0 e flag `showZero` |
| 4 | Badge.Dot | Componente separado para indicador de notificação simples |

### 📌 Observações Técnicas:
- Componente composto com subcomponentes exportados
- Testa todos os edge cases de contador
- Cobertura total: 38 linhas de código

---
---

## 13. 🎨 Button.test.js
**Arquivo:** `/tests/unit/components/UI/Button.test.js`
**Propósito:** Componente UI de Botão

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização Básica | Exibe texto, ícones esquerdo/direito, fullWidth e executa callback onClick |
| 2 | Modo Loading | Aplica `aria-busy`, desabilita botão, oculta ícones e previne cliques |
| 3 | Validação de atributos ARIA quando desabilitado via prop | Garante que `aria-disabled` e `aria-busy` são strings literais e o botão está desabilitado |


### 📌 Observações Técnicas:
- Valida comportamento negativo (não executa onClick enquanto loading)
- Acessibilidade adequada com atributos ARIA
- Cobertura total: 30 linhas de código

---
## 14. 🎨 Card.test.js
**Arquivo:** `/tests/unit/components/UI/Card.test.js`
**Propósito:** Componente UI de Cartão Composto

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Estrutura Básica | Renderiza header, conteúdo, footer e modo hoverable |
| 2 | Media | Suporta tanto URL de imagem quanto componente React customizado |
| 3 | Modo Clickable | Adiciona role=button e executa onClick automaticamente |
| 4 | Subcomponentes | Valida renderização de `Card.Header` e `Card.Footer` |

### 📌 Observações Técnicas:
- Componente composto com subcomponentes aninhados
- Usa `rerender` para testar múltiplas variantes
- Cobertura total: 41 linhas de código

---
## 15. 🎨 index.test.js (UI)
**Arquivo:** `/tests/unit/components/UI/index.test.js`
**Propósito:** Arquivo barril de exportação dos componentes UI

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Validação Exports | Verifica que todos os 8 componentes UI estão sendo exportados corretamente |

### 📌 Observações Técnicas:
- Garante integridade da API pública do módulo UI
- Previne quebras acidentais em imports
- Cobertura total: 15 linhas de código

---
## 16. 🎨 Input.test.js
**Arquivo:** `/tests/unit/components/UI/Input.test.js`
**Propósito:** Componente UI de Campo de Entrada

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização Básica | Suporta label, required, addons laterais e forwardRef |
| 2 | Mensagens de Erro | Exibe helperText, substitui por errorMessage quando em estado de erro |

### 📌 Observações Técnicas:
- Valida atributo `aria-invalid` para acessibilidade
- Testa forwarding de referência para o elemento nativo
- Cobertura total: 26 linhas de código

---
---

## 17. 🎨 Modal.test.js
**Arquivo:** `/tests/unit/components/UI/Modal.test.js`
**Propósito:** Componente UI de Modal / Janela Diálogo

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Estado Fechado | Não renderiza nada no DOM quando `isOpen = false` |
| 2 | Estado Aberto | Renderiza título, conteúdo e estrutura completa |
| 3 | Fechamento | Executa onClose ao clicar no botão X, no overlay ou pressionar Escape |
| 4 | Footer e PreventScroll | Adiciona `overflow: hidden` no body e remove ao desmontar |
| 5 | Compatibilidade SSR | Renderiza corretamente sem portal quando document.body não existe |
| 6 | Focus Trap | Garante que a navegação por teclado permaneça restrita ao modal aberto |

### 📌 Observações Técnicas:
- Testa todos os métodos de fechamento padrão
- Valida limpeza de efeitos colaterais no body
- Valida gerenciamento de foco assíncrono (Focus Trap)
- Cobertura total: 64 linhas de código

---

## 18. 🎨 Select.test.js
**Arquivo:** `/tests/unit/components/UI/Select.test.js`
**Propósito:** Componente UI de Campo de Seleção

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização Básica | Suporta label, placeholder, opções desabilitadas e forwardRef |
| 2 | Evento onChange | Dispara callback com valor selecionado |
| 3 | Estado de Erro | Alterna entre helperText e errorMessage |

### 📌 Observações Técnicas:
- Usa elemento `<select>` nativo para acessibilidade
- Mantém API igual ao componente Input
- Cobertura total: 36 linhas de código

---

## 19. 🎨 Spinner.test.js
**Arquivo:** `/tests/unit/components/UI/Spinner.test.js`
**Propósito:** Componente UI de Indicador de Carregamento

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização Básica | Exibe label e atributo ARIA role=status |
| 2 | Variante Dots | Renderiza estrutura correta para animação de 3 pontos |
| 3 | Componentes Compostos | Valida `Spinner.Container` e `Spinner.Overlay` |

### 📌 Observações Técnicas:
- Testa estrutura HTML já que estilos são mockados
- Suporta múltiplas variantes e modos
- Cobertura total: 28 linhas de código

---

## 20. 🎨 TextArea.test.js
**Arquivo:** `/tests/unit/components/UI/TextArea.test.js`
**Propósito:** Componente UI de Área de Texto Multi Linha

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Renderização Básica | Label, required e forwardRef |
| 2 | Auto Resize | Ajusta altura automaticamente de acordo com conteúdo |
| 3 | Contador de Caracteres | Exibe `x / max` e atualiza em tempo real |
| 4 | Estado de Erro | Alterna entre helperText e mensagem de erro |

### 📌 Observações Técnicas:
- Mock do `scrollHeight` para testar comportamento de auto resize
- Suporta `defaultValue` corretamente
- Cobertura total: 46 linhas de código

---

## 21. 🎨 Toast.test.js
**Arquivo:** `/tests/unit/components/UI/Toast.test.js`
**Propósito:** Componente UI de Notificação Toast + Hook useToast

### ✅ Testes Implementados:

| ID | Caso de Teste | Funcionalidade Validada |
|----|---------------|--------------------------|
| 1 | Auto Fechamento | Renderiza o toast e fecha automaticamente após a duração definida |
| 2 | Fechamento Manual | Botão de fechar com callback onClose |
| 3 | Hook useToast | Gerenciamento de estado global: adicionar, remover toasts |
| 4 | Status Info | Valida suporte do hook ao status informacional |
| 5 | Status Warning | Valida suporte do hook ao status de aviso |
| 6 | Status Error | Valida suporte do hook ao status de erro |
| 7 | Persistência | Notificação não fecha automaticamente quando a duração é definida como zero (persistente) |
| 8 | Container | Suporte a múltiplas instâncias e posições customizadas via Toast.Container |

### 📌 Observações Técnicas:
- Usa `jest.useFakeTimers()` para controlar timeout de fechamento
- Testa ciclo completo de animação entrada/saída
- Componente + Hook integrado
- Cobertura total: 100% das funcionalidades e casos de borda

### ✅ Casos de Borda Testados:
- Garantia de que `onClose` não é disparado automaticamente em Toasts persistentes (`duration: 0`)
- Renderização correta em múltiplas posições (`top-right`, `bottom-left`, etc.) via `Toast.Container`

### ✅ Garantias:
- Notificações de erro ou aviso crítico podem ser configuradas para exigir ação manual do usuário

---

> **Este documento faz parte da série de documentação de testes do projeto.**  
> Documentos relacionados: `PROJECT_tests_unit_components_01.md`, `PROJECT_tests_unit_components_02.md`
