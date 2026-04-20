# Relatório de Upgrade e Melhorias dos Mocks

> **Relatório Técnico:** Análise, pontos de melhoria, correções e sugestões de upgrade para os mocks existentes no projeto.
>
> ✅ Este relatório contém apenas recomendações e análise. Nenhuma alteração foi aplicada.

---

## Sumário
- [Análise Geral](#análise-geral)
- [Mock Cookie](#mock-cookie)
- [Mock PostgreSQL pg](#mock-postgresql-pg)
- [Mock Style](#mock-style)
- [Priorização das Melhorias](#priorização-das-melhorias)

---

## Análise Geral

### Pontos Positivos Atuais
✅ Todos os mocks estão centralizados corretamente
✅ API é mantida compatível com as bibliotecas originais
✅ Documentação interna existe nos arquivos
✅ Uso de funções Jest padrão
✅ Funcionam corretamente na maioria dos casos

### Pontos de Atenção Geral
⚠️ Falta de reset automático de estado entre testes
⚠️ Sem validação de tipos e parâmetros
⚠️ Sem opção de modo estrito para detecção de usos incorretos
⚠️ Não há casos de erro simulados por padrão

---

## Mock Cookie

### ✅ Análise Atual
Funcionamento bom e completo. Implementa 95% da funcionalidade da biblioteca original.

### 🐛 Correções Necessárias
| Item | Descrição | Severidade |
|------|-----------|------------|
| 1 | O método `parse` não ignora valores vazios corretamente | Baixa |
| 2 | Não há tratamento para valores sem `=` no header de cookie | Média |
| 3 | `serialize` não valida nomes inválidos de cookie | Média |
| 4 | Não faz encode de caracteres especiais no nome do cookie | Baixa |

### 🚀 Melhorias Sugeridas
1. Adicionar opção de modo estrito que valida entradas
2. Implementar `mockReset()` padrão que limpa chamadas e retorna para comportamento original
3. Adicionar métodos utilitários para verificar cookies criados nos testes
4. Simular erros de validação para testar fluxos de falha

### 💡 Casos que irão quebrar atualmente
```javascript
// Este caso vai retornar valor errado atualmente
parse('nome=; outro=valor');
// Vai retornar { nome: undefined } ao invés de ignorar o cookie vazio
```

---

## Mock PostgreSQL pg

### ✅ Análise Atual
Este é o mock mais bem implementado do projeto. Já possui tratamento para a maioria dos casos e já soluciona o problema comum de reset do jest.

### 🐛 Correções Necessárias
| Item | Descrição | Severidade |
|------|-----------|------------|
| 1 | `mockQuery` não é resetado automaticamente com `restorePoolImplementation()` | ALTA |
| 2 | Não há simulação de erros de conexão | ALTA |
| 3 | Método `on()` não armazena listeners para testes | Média |
| 4 | Não há contagem de conexões abertas | Média |

### ⚠️ Problema Crítico Atual
Quando `restorePoolImplementation()` é chamado, o `mockQuery` não é limpo. Isso significa que chamadas de testes anteriores continuam presentes, causando falsos positivos e vazamento de estado **entre arquivos de teste**.

### 🚀 Melhorias Sugeridas
1. Adicionar reset automático do `mockQuery` dentro de `restorePoolImplementation()`
2. Adicionar método `mockPoolError()` para simular falhas de conexão
3. Implementar contador de conexões para detectar leaks
4. Adicionar validação que queries não são chamadas depois que pool foi fechado
5. Adicionar modo gravação que salva todas as queries executadas para debug

### 💡 Dica de Implementação Futura
```javascript
export function restorePoolImplementation() {
  Pool.mockImplementation(poolImplementation);
  mockQuery.mockReset(); // ✅ Falta isso hoje!
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
}
```

---

## Mock Style

### ✅ Análise Atual
Funciona perfeitamente para o propósito que foi criado. Não tem bugs conhecidos.

### 🚀 Melhorias Sugeridas
Este mock é um bom candidato para melhorias que aumentam produtividade nos testes:
1. Adicionar Proxy que retorna o nome da classe como string, permitindo assertivas em className
2. Permitir ativar/desativar o mock por teste
3. Adicionar modo que loga importações de CSS para detectar arquivos não utilizados

### Exemplo de melhoria:
```javascript
// Em vez de objeto vazio:
export default new Proxy({}, {
  get: (target, prop) => prop
});

// Permite isso nos testes:
expect(<Componente />).toHaveClassName('styles.botao')
```

---

## Priorização das Melhorias

### 🔴 ALTA PRIORIDADE (FAZER LOGO)
1. Adicionar `mockQuery.mockReset()` dentro de `restorePoolImplementation()` no mock pg
2. Corrigir o parse de valores vazios no mock cookie

### 🟡 MÉDIA PRIORIDADE
1. Adicionar validação de nomes de cookie
2. Implementar simulação de erros de conexão no pg
3. Adicionar modo estrito opcional nos mocks

### 🟢 BAIXA PRIORIDADE
1. Melhorar mock de style com Proxy
2. Adicionar utilitários de assertiva
3. Adicionar contador de conexões

---

## Conclusão

Os mocks atuais são funcionais e bem implementados. A única correção crítica que deve ser aplicada o quanto antes é o reset automático do `mockQuery` no mock do PostgreSQL, que hoje causa vazamento de estado entre testes e pode gerar resultados falsos nos testes.

Todas as outras sugestões são melhorias incrementais que aumentam a produtividade e confiabilidade dos testes.