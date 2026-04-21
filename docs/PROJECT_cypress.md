# Documentação Cypress - Testes E2E

---

## Arquivo: `/cypress/e2e/image_zoom.cy.js`

### 📋 Resumo Geral
| Dado | Valor |
|---|---|
| **Nome do Teste** | Funcionalidade de Zoom de Imagem (Lightbox) no Post |
| **Tipo** | Teste End-to-End (E2E) |
| **Objetivo** | Validar comportamento completo do componente de lightbox/zoom de imagens |
| **Cobertura** | Abertura, fechamento por clique e tecla ESC |
| **Dependências** | Nenhuma (teste isolado com mock de API) |

---

### 🎯 Propósito do Arquivo
Este teste valida a funcionalidade de visualização ampliada de imagens que aparece em posts do blog. Garante que a interação do usuário com o componente lightbox funcione corretamente em todos os cenários esperados.

---

### ⚙️ Estrutura e Funcionamento

#### 1. Preparação do Ambiente (`beforeEach`)
✅ **Mock de API independente**:
- Intercepta requisição `GET /api/posts`
- Retorna um post de teste fixo com imagem
- Não depende de dados reais no banco de dados
- Garante consistência e repetibilidade dos testes

✅ **Setup padrão**:
- Acessa automaticamente a página do post mockado
- Aguarda carregamento completo dos dados antes de cada teste

---

#### 2. Cenários Testados

| Etapa | Ação | Verificação |
|---|---|---|
| 1 | Verificação inicial | Confirma que a imagem do post está visível na página |
| 2 | Abertura do Lightbox | Clica na imagem com cursor `zoom-in` |
| 3 | Validação de abertura | Confirma que o overlay fixo e a imagem ampliada aparecem |
| 4 | Fechamento por clique | Clica na área externa (overlay) do lightbox |
| 5 | Validação fechamento | Confirma que o componente foi removido do DOM |
| 6 | Reabertura | Clica novamente na imagem para reabrir o lightbox |
| 7 | Fechamento por teclado | Pressiona a tecla `Esc` na página |
| 8 | Validação final | Confirma novamente que o lightbox foi fechado |

---

### 🔍 Seletores Utilizados
| Seletor | Propósito |
|---|---|
| `div[style*="cursor: zoom-in"]` | Container da imagem clicável para zoom |
| `div[style*="position: fixed"]` | Container principal do Lightbox / Overlay |

> 💡 Observação: Os seletores são baseados em estilos inline, não em classes ou atributos `data-testid`.

---

### ✅ Características Positivas do Teste
1. **🔒 Totalmente Isolado**: Não depende de estado do banco ou outros testes
2. **✅ Completo**: Cobre todos os métodos de interação esperados pelo usuário
3. **⏱️ Rápido**: Não tem dependências externas
4. **🔄 Repetível**: Sempre terá o mesmo resultado
5. **🧹 Limpo**: Não deixa resíduos após execução

---

### 📌 Pontos de Atenção
- Seletores baseados em estilos CSS inline podem quebrar se o design da interface for alterado
- Não testa scroll da página enquanto lightbox está aberto
- Não testa zoom adicional dentro do lightbox
- Não valida comportamento em dispositivos móveis (toque)

---

### 🚀 Execução
Para rodar este teste individualmente:
```bash
npx cypress run --spec cypress/e2e/image_zoom.cy.js
```

Para abrir no modo interativo:
```bash
npx cypress open