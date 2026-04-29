# Relatório de Análise e Sugestões de Melhoria
## Componentes UI - Projeto Caminhar

Última atualização: 29/04/2026
Análise baseada em: `/components/UI/*`

---

## 🎯 Objetivo
Este documento contém o acompanhamento de melhorias, ajustes e correções dos componentes UI.

---

## ✅ Melhorias Implementadas

### 🔘 Button
- **Loading State**: Corrigido o uso dos atributos ARIA (`aria-busy`, `aria-disabled`) como strings literais (`"true"`/`"false"`) para garantir compatibilidade máxima com tecnologias assistivas durante o estado de carregamento.
- **Testes Unitários**: Implementação de testes de unidade cobrindo interações e acessibilidade.

### 🪟 Modal
- **Focus Trap**: Implementado o gerenciamento de foco para garantir que a navegação por teclado permaneça restrita ao modal quando aberto, melhorando a acessibilidade.

---

## 📋 Classificação dos Itens
| Nível | Descrição |
|-------|-----------|
| 🔴 ALTO | Correção necessária, bug ou comportamento inadequado |
| ⚠️ MÉDIO | Ajuste recomendado, melhoria de usabilidade ou padrão |
| ✅ BAIXO | Melhoria de código, otimização ou refatoração |

---

### 📊 Resumo Geral de Pendências
| Nível | Quantidade de Itens |
|-------|----------------------|
| 🔴 ALTO | 3 |
| ⚠️ MÉDIO | 17 |
| ✅ BAIXO | 18 |
| **TOTAL** | **38 itens** |

---

## 🔍 Análise por Componente

---

### 🚨 Alert
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Gerenciamento de Estado | O componente gerencia estado de visibilidade internamente. Não existe forma de controlar externamente sem perder a funcionalidade interna |
| ✅ BAIXO | Ícones Duplicados | Os ícones SVG são duplicados entre Alert e Toast. Podem ser extraidos para um arquivo compartilhado |
| ✅ BAIXO | Callback onClose | Não existe forma de cancelar o fechamento ou interceptar o evento antes de executar |

### 💡 Sugestões:
1. Implementar propriedade `isOpen` para controle externo opcional
2. Extrair ícones SVG para um módulo compartilhado
3. Adicionar `onBeforeClose` com suporte a cancelamento

---

### 🏷️ Badge
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Variantes não documentadas | As variantes `outline` e `soft` existem no CSS mas não estão documentadas no JSDoc do componente |
| ✅ BAIXO | Position naming | O componente aceita como prop `top-right` mas o CSS utiliza `topRight` (camelCase). É feito uma conversão implícita que pode gerar bugs |
| ✅ BAIXO | Badge.Dot | É apenas um alias com defaults diferentes, pode ser eliminado e substituido por props padrão |

### 💡 Sugestões:
1. Documentar todas as variantes existentes no JSDoc
2. Normalizar o tratamento de nomes de posição ou utilizar o mesmo padrão
3. Remover sub-componente Dot e utilizar composição

---

### 🔘 Button
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Ripple Effect | O CSS tem estilo para efeito ripple mas não existe implementação no componente |
| ✅ BAIXO | Spinner Duplicado | O spinner do botão é duplicado com o componente Spinner |

### 💡 Sugestões:
1. Implementar ou remover o efeito ripple do CSS
2. Utilizar o componente Spinner nativo ao invés de duplicar código

---

### 🃏 Card
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Acessibilidade Clickable | Quando `onClick` é passado o componente ganha `role="button"` mas não tem tratamento de teclado Enter e Space |
| ⚠️ MÉDIO | Media Alt Text | Quando a media é passada como componente React o `mediaAlt` é ignorado |
| ✅ BAIXO | Variante fullWidth | Existe a classe `.fullWidth` no CSS mas não existe propriedade correspondente no componente |

### 💡 Sugestões:
1. Implementar suporte a navegação por teclado quando clicável
2. Documentar que mediaAlt só funciona com url de string
3. Adicionar propriedade `fullWidth` no componente

---

### 📝 Input
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Addons Pointer Events | Os addons tem `pointer-events: none` o que impossibilita utilização de botões ou elementos interativos |
| ✅ BAIXO | Variant flushed | Existe a variante no JSDoc mas não existe implementação no CSS |
| ✅ BAIXO | Searchable e Clearable | Existem propriedades no JSDoc que não foram implementadas |

### 💡 Sugestões:
1. Remover `pointer-events: none` ou adicionar aviso na documentação
2. Implementar a variante `flushed` ou remover do JSDoc
3. Remover propriedades não implementadas da documentação

---

### 🪟 Modal
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Scroll Lock | Quando existem múltiplos modais abertos o scroll é restaurado quando qualquer um deles fecha |
| ⚠️ MÉDIO | Event Listener | O listener de keydown não é removido adequadamente se o componente for desmontado sem fechar |
| ✅ BAIXO | Body Overflow | Não salva o valor original do overflow do body, sempre restaura para vazio |

### 💡 Sugestões:
1. Adicionar contador de referência para bloqueio de scroll
2. Armazenar estado original do overflow do body antes de modificar

---

### 📋 Select
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Accessibilidade | Não existe `aria-expanded` nem indicador de estado para leitores de tela |
| ✅ BAIXO | Searchable e Clearable | Propriedades documentadas mas não implementadas |
| ✅ BAIXO | Arrow Rotation | A seta gira 180graus no foco, não somente quando o select está aberto |

### 💡 Sugestões:
1. Adicionar atributos ARIA adequados para estado aberto/fechado
2. Remover propriedades não implementadas da documentação
3. Corrigir animação da seta para apenas quando aberto

---

### ⏳ Spinner
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | Dots Animation | Não existe implementação para tamanho md na variante dots, só xs, sm, lg, xl |
| ✅ BAIXO | Duplicação | O componente é replicado dentro do Button |
| ✅ BAIXO | Label Padrão | O label padrão é "Carregando..." não é internacionalizado |

### 💡 Sugestões:
1. Adicionar tamanho md para variante dots
2. Remover implementação duplicada no Button
3. Permitir internacionalização do texto padrão

---

### 📝 TextArea
| Nível | Item | Descrição |
|-------|------|-----------|
| 🔴 ALTO | Auto Resize | O auto resize calcula o scrollHeight diretamente no DOM sem limites de `minRows` e `maxRows` |
| ⚠️ MÉDIO | Over Limit | Quando `maxLength` é ultrapassado o contador fica vermelho mas o usuário pode continuar digitando |
| ✅ BAIXO | Limpeza Auto Resize | Não existe limpeza do estilo height quando o autoResize é desabilitado dinâmicamente |

### 💡 Sugestões:
1. Implementar respeito aos valores `minRows` e `maxRows` no auto resize
2. Adicionar opção de bloquear digitação quando ultrapassa o limite
3. Limpar estilo inline quando autoResize = false

---

### 🔔 Toast
| Nível | Item | Descrição |
|-------|------|-----------|
| ⚠️ MÉDIO | useToast ID Generation | Utiliza `Math.random()` para geração de ids que não tem garantia de unicidade |
| ⚠️ MÉDIO | Position Animation | A animação slideIn é sempre da direita, independente da posição escolhida |
| ✅ BAIXO | Ícones Duplicados | Ícones são duplicados com o componente Alert |

### 💡 Sugestões:
1. Utilizar gerador de id único mais confiável (crypto.randomUUID)
2. Implementar animações diferentes para cada posição
3. Reutilizar ícones do componente Alert

---

---

## 📌 Pontos Gerais Aplicaveis a Todos Componentes

### 🔴 Alto Impacto
1. **Consistência Acessibilidade**: Muitos componentes implementam parcialmente os requisitos ARIA. Existe padrão não aplicado em todos
2. **Gerenciamento de Eventos**: Vários componentes adicionam event listeners globais sem limpeza adequada em todos cenários

### ⚠️ Médio Impacto
1. **Duplicação de Código**: Ícones SVG, estilos e padrões são replicados múltiplas vezes entre componentes
2. **Documentação vs Implementação**: Várias propriedades estão documentadas no JSDoc mas não foram implementadas
3. **Responsividade**: Apenas alguns componentes tem tratamento especifico para mobile

### ✅ Baixo Impacto
1. **Consistência de Nomenclatura**: Existem inconsistências entre kebab-case e camelCase nas propriedades
2. **Tipos**: Nenhum componente tem validação de tipos ou Typescript
3. **Testes**: Cobertura de testes unitários em andamento (iniciado por Button e Toast).

---

## 🎯 Priorização Recomendada
1. 🔴 Correções de acessibilidade e bugs de comportamento (Foco em Modal e TextArea)
2. ⚠️ Ajustes de usabilidade e consistência
3. ✅ Refatorações, otimizações e melhorias de código

Nenhum destes itens é crítico ou impede o funcionamento dos componentes. Todos são melhorias incrementais para aumentar qualidade, manutenibilidade e padrões.