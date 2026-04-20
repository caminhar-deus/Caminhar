# Documentação dos Mocks do Projeto

Este documento descreve todos os mocks manuais existentes no diretório `/__mocks__/`, seu propósito, funcionamento e forma de utilização nos testes.

---

## Sumário
- [Mock Cookie (`cookie.js`)](#mock-cookie-cookiejs)
- [Mock PostgreSQL (`pg.js`)](#mock-postgresql-pgjs)
- [Mock Styles (`styleMock.js`)](#mock-styles-stylemockjs)

---

## Mock Cookie (`cookie.js`)

✅ **Arquivo:** `/__mocks__/cookie.js`

### Propósito
Mock da biblioteca `cookie` para uso exclusivo em testes Jest. Simula a serialização e parse de cookies HTTP com comportamento realista, permitindo validação de headers de cookie nos testes.

### Funcionamento
Implementa os mesmos métodos da biblioteca original:
| Método | Descrição |
|--------|-----------|
| `serialize(name, value, options)` | Gera string de cookie formatada com flags corretas |
| `parse(cookieHeader)` | Converte header de cookie em objeto JavaScript |

### Características
✅ Mantém a mesma API da biblioteca original
✅ Suporta todas as flags padrão: `HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Path`
✅ Faz decode URI correto nos valores
✅ Todos os métodos são funções Jest spy, permitindo assertivas como `toHaveBeenCalled()`
✅ Exporta tanto named exports quanto default export para máxima compatibilidade

### Uso nos testes
```javascript
import { serialize, parse } from 'cookie';

// Automaticamente utiliza o mock em vez da biblioteca real
test('cria cookie seguro', () => {
  serialize('session', 'abc123', { secure: true, httpOnly: true });
  
  expect(serialize).toHaveBeenCalled();
  expect(serialize.mock.results[0].value).toContain('Secure');
});
```

---

## Mock PostgreSQL (`pg.js`)

✅ **Arquivo:** `/__mocks__/pg.js`

### Propósito
Mock manual centralizado para a biblioteca `pg` (PostgreSQL Client). Este é um dos mocks mais importantes do projeto, evita duplicação de código e garante comportamento consistente em todos os testes que interagem com banco de dados.

### Funcionamento
Simula completamente o `Pool` de conexões do PostgreSQL, a interface mais utilizada na aplicação.

| Exportado | Descrição |
|-----------|-----------|
| `Pool` | Construtor mockado que retorna instância de pool simulada |
| `mockQuery` | Função Jest spy para todas as chamadas de query |
| `restorePoolImplementation()` | Função utilitária para restaurar implementação após reset de mocks |

### Características
✅ Automatioamente carregado pelo Jest quando `jest.mock('pg')` é chamado
✅ `mockQuery` é compartilhado globalmente, permitindo mockar respostas de qualquer lugar
✅ Implementa todos os métodos da interface Pool: `query`, `end`, `on`, `connect`
✅ Resolve corretamente promessas
✅ Possui função de restauração para evitar quebras após `jest.clearAllMocks()`

### Uso padrão nos testes
```javascript
import { mockQuery, restorePoolImplementation } from 'pg';

beforeEach(() => {
  jest.clearAllMocks();
  restorePoolImplementation(); // SEMPRE chamar após clearAllMocks
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 }); // Valor padrão
});

test('retorna usuários do banco', async () => {
  mockQuery.mockResolvedValueOnce({ 
    rows: [{ id: 1, nome: 'Teste' }], 
    rowCount: 1 
  });
  
  const resultado = await buscarUsuarios();
  
  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM usuarios'));
  expect(resultado).toHaveLength(1);
});
```

⚠️ **Aviso importante:** Sempre chamar `restorePoolImplementation()` após `jest.clearAllMocks()` ou `jest.resetAllMocks()`, pois esses comandos apagam a implementação do construtor Pool e quebram todos os testes.

---

## Mock Styles (`styleMock.js`)

✅ **Arquivo:** `/__mocks__/styleMock.js`

### Propósito
Mock vazio para arquivos de estilo (CSS, Modules, SCSS) utilizado pelo Jest durante testes. Evita erros de parse quando componentes importam arquivos de estilos.

### Funcionamento
Exporta simplesmente um objeto vazio. O Jest substitui todas as importações de arquivos CSS por este mock.

### Configuração
Este mock é configurado no `jest.config.js` na opção `moduleNameMapper`:
```javascript
moduleNameMapper: {
  "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js"
}
```

### Vantagens
✅ Elimina erros de compilação de CSS nos testes
✅ Não executa processamento de CSS, acelerando a execução dos testes
✅ Não impacta o comportamento dos componentes em testes unitários

---

## Informações Gerais

### Convenções
1. Todos os mocks estão centralizados no diretório `/__mocks__/` raiz
2. Mocks mantém a mesma API da biblioteca original
3. Todos os métodos são funções Jest para permitir assertivas
4. Documentação interna existente nos arquivos é preservada

### Boas Práticas
✅ Sempre utilize os mocks existentes ao invés de criar mocks locais nos arquivos de teste
✅ Não modifique comportamento global dos mocks dentro de testes individuais
✅ Sempre limpe os mocks no `beforeEach` para evitar vazamento de estado entre testes