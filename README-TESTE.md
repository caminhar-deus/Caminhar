# Documentação de Testes - O Caminhar com Deus

Este documento detalha a estratégia de testes, ferramentas utilizadas e procedimentos para garantir a qualidade e estabilidade do projeto.

## 🛠 Ferramentas Utilizadas

- **Jest**: Framework principal para testes unitários e de integração.
- **React Testing Library**: Para testar componentes React e interações do usuário.
- **node-mocks-http**: Para simular requisições e respostas HTTP em testes de API.
- **k6**: Para testes de carga e performance.
- **GitHub Actions**: Para Integração Contínua (CI).

---

## 🧪 Tipos de Testes

### 1. Testes Unitários e de Integração (Jest)

Estes testes verificam a lógica de componentes individuais e endpoints da API. Eles utilizam "mocks" para isolar dependências externas (como o banco de dados real).

**Localização:** Arquivos `*.test.js` ou na pasta `__tests__/`.

**Principais áreas cobertas:**
- **Componentes**: `AdminPostManager`, `BlogIndex`, `BlogPost`.
- **APIs**: `/api/admin/posts`, `/api/settings`, `/api/upload-image`, `/api/v1/status`.
- **Middleware**: Rate Limiting (com fallback Redis/Memória) e Whitelist.

#### Como Executar:

Rodar todos os testes:
```bash
npm test
```

Rodar em modo "watch" (durante desenvolvimento):
```bash
npm run test:watch
```

Rodar um arquivo específico:
```bash
npm test posts.test.js
```

---

### 2. Testes de Carga (k6)

Estes testes simulam múltiplos usuários acessando o sistema simultaneamente para verificar performance, latência e estabilidade sob estresse.

**Localização:** Pasta `load-tests/`.

#### Cenários Disponíveis:

1. **Health Check (Básico)**:
   Verifica se a API responde rapidamente.
   ```bash
   npm run test:load
   ```

2. **Fluxo Autenticado (Leitura)**:
   Simula login e leitura de posts protegidos.
   ```bash
   npm run test:load:auth
   ```
   *Nota: Requer credenciais configuradas no `.env` ou passadas via linha de comando.*

3. **Fluxo de Escrita (Criação de Posts)**:
   Simula usuários criando novos posts intensivamente.
   ```bash
   npm run test:load:write
   ```

4. **Escrita com Limpeza Automática**:
   Executa o teste de escrita e limpa os dados gerados ao final.
   ```bash
   npm run test:load:write-and-clean
   ```

---

## ⚙️ Configuração do Ambiente de Teste

### Banco de Dados de Teste
Os testes de integração utilizam mocks do `pg` (PostgreSQL) para não poluir o banco de dados de desenvolvimento/produção. No entanto, para testes manuais ou scripts de carga, é importante garantir que o ambiente esteja limpo.

**Limpar dados de teste de carga:**
```bash
npm run clean:load-posts
```

### Variáveis de Ambiente para Testes
O Jest configura automaticamente o ambiente via `jest.setup.js` e `jest.config.js`. Para testes de carga (k6), as variáveis são lidas do sistema ou do arquivo `.env`.

---

## 🔄 Integração Contínua (CI)

O projeto possui um workflow do GitHub Actions configurado em `.github/workflows/ci.yml`.

**Gatilhos:**
- Push na branch `main` ou `master`.
- Pull Requests para `main` ou `master`.

**O que ele faz:**
1. Instala dependências (`npm install`).
2. Executa a suíte de testes completa (`npm test`).

---

## 📝 Guia de Interpretação de Resultados (k6)

Ao rodar testes de carga, observe as seguintes métricas no terminal:

- **http_req_duration**: Tempo total da requisição.
  - `p(95)`: 95% das requisições foram mais rápidas que este valor. Ideal: < 500ms.
- **http_req_failed**: Taxa de erros (status != 200). Ideal: 0.00%.
- **checks**: Validações de sucesso (ex: login funcionou). Ideal: 100%.

**Exemplo de Saída:**
```text
✓ status is 200
✓ response body is ok

http_req_duration..............: avg=45.2ms  min=2.1ms  med=35.4ms  max=150.2ms  p(95)=98.5ms
http_req_failed................: 0.00%   ✓ 0        ✗ 1500
```

---

## 🐛 Solução de Problemas Comuns

**Erro: `connect ECONNREFUSED` nos testes de carga**
- Verifique se o servidor está rodando (`npm run dev`) em outro terminal.

**Erro: `Too Many Requests (429)`**
- O Rate Limit está bloqueando seu teste. Adicione seu IP à whitelist no `.env` (`ADMIN_IP_WHITELIST`) ou desabilite temporariamente o Redis.

**Erro: Falha nos testes do Jest após migração**
- Certifique-se de que os mocks em `__tests__` refletem a nova estrutura do PostgreSQL (retorno `rows` em vez de array direto).