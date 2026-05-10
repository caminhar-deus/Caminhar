# Documento de Melhorias — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Este documento lista correções, melhorias de performance, inconsistências e duplicidades identificadas nos arquivos localizados na raiz do projeto. Nenhuma correção foi aplicada, apenas reportada.

---

## 1. `babel.jest.config.js`

### 🔴 Redundância: Plugin duplicado `@babel/plugin-transform-modules-commonjs`

O plugin `@babel/plugin-transform-modules-commonjs` aparece duas vezes:
- Na lista de `plugins` principal (linha 11)
- Na seção `env.test.plugins` (linha 17)

**Impacto:** Configuração redundante e desnecessária. O preset-env com `modules: 'auto'` já gerencia a transformação de módulos quando necessário.

**Sugestão:** Remover uma das ocorrências, mantendo apenas na raiz.

---

## 2. `jest.config.js`

### 🟡 Performance: `maxWorkers: 1` muito restritivo

O `maxWorkers: 1` foi comentado como "melhor estabilidade com módulos ESM", porém isso torna a execução dos testes sequencial e mais lenta.

**Impacto:** Testes demoram mais do que o necessário, especialmente em CI.

**Sugestão:** Avaliar se `maxWorkers: '50%'` ou `maxWorkers: 2` funcionaria de forma estável, reduzindo o tempo de execução.

### 🟡 Thresholds de cobertura muito elevados

Os thresholds atuais são muito altos (branches 92%, functions 95%, lines 98%, statements 98%).

**Impacto:** Pode causar falhas em CI mesmo com pequenas alterações no código, gerando falsos positivos ou bloqueios desnecessários.

**Sugestão:** Reavaliar se esses thresholds são realistas para o estado atual do projeto, ajustando para valores mais factíveis se necessário.

---

## 3. `rate-limit-proxy.js`

### 🔴 Duplicação de variáveis (Shadowing)

Nas linhas 76-80, as variáveis `now` e `windowMs` são declaradas novamente dentro do bloco de limpeza do Map de rate limit em memória, mesmo já tendo sido declaradas nas linhas 74-75. Isso cria shadowing desnecessário e confunde a leitura.

```javascript
// Linhas 73-85 (trecho afetado)
if (ipRateLimit.size > 10000) {
  const now = Date.now();       // REDECLARADA
  const windowMs = RATE_LIMIT_WINDOW * 1000; // REDECLARADA

  for (const [ip, record] of ipRateLimit) {
    if (now - record.startTime > windowMs) {
      ipRateLimit.delete(ip);
    }
  }
}
```

**Sugestão:** Remover as declarações duplicadas (`const now = Date.now()` e `const windowMs = RATE_LIMIT_WINDOW * 1000`) de dentro do bloco `if`, pois elas já existem no escopo externo (linhas 74-75).

### 🟡 Import com caminho relativo inconsistente

O arquivo está na raiz mas importa `{ redis }` de `'../redis.js'`. Isso sugere que espera-se que este arquivo seja executado de dentro de um diretório `lib/middleware/` ou similar, mas está posicionado na raiz.

**Sugestão:** Verificar se o caminho de import está correto para a localização atual do arquivo ou mover o arquivo para a localização apropriada dentro da estrutura do projeto (ex: `lib/middleware/`).

---

## 4. `package.json`

### 🔴 Manutenibilidade: Script `test:load:all` extremamente longo

O script `test:load:all` (linha 56) contém mais de 30 comandos encadeados com `&&`, formando uma linha de script extremamente longa e difícil de manter.

**Impacto:** Difícil leitura, edição e manutenção. Qualquer alteração exige localizar o comando específico dentro da string gigante.

**Sugestão:** Criar um script separado em `scripts/run-all-load-tests.js` que execute cada teste programaticamente, tornando a manutenção mais simples e legível.

### 🟡 Versões de Node.js inconsistentes

O `package.json` define `"node": "24.15.0"` como engine, mas:
- `ci.yml` usa `node-version: [24.15.0]`
- `load-tests.yml` usa `node-version: '24.14.1'`
- `pr-coverage.yml` usa `node-version: '24.14.1'`
- `security-tests.yml` usa `node-version: '20'`

**Impacto:** Inconsistência entre ambientes. Testes de segurança rodam em Node.js 20 enquanto o resto do projeto espera Node.js 24.

**Sugestão:** Padronizar a versão do Node.js em todos os workflows do GitHub Actions para a mesma versão definida em `package.json` (`24.15.0`).

---

## 5. GitHub Actions Workflows (`*.yml`)

### 🔴 Duplicação de Configuração entre Workflows

Os quatro workflows (`ci.yml`, `load-tests.yml`, `pr-coverage.yml`, `security-tests.yml`) compartilham significativa duplicação:

- **Serviços PostgreSQL e Redis:** Repetidos em 3 workflows (`load-tests.yml`, `pr-coverage.yml`, `security-tests.yml`)
- **Setup do Node.js:** Repetido em todos os 4 workflows
- **Instalação de dependências (`npm ci` ou `npm install`):** Repetido em todos os 4 workflows
- **Setup do banco de dados de teste:** Repetido em 3 workflows

**Impacto:** Manutenção difícil e propensa a erros. Qualquer alteração precisa ser replicada em múltiplos arquivos.

**Sugestão:** Extrair os passos comuns para um Composite Action do GitHub Actions reutilizável, ou criar um workflow reutilizável chamado por outros workflows.

### 🟡 Caching diferente em cada workflow

- `ci.yml`: usa `cache: 'npm'` do `setup-node`
- `load-tests.yml`: usa `actions/cache@v4` para `node_modules` + cache do Next.js
- `pr-coverage.yml`: usa `cache: 'npm'` do `setup-node`
- `security-tests.yml`: não usa cache

**Impacto:** Perda de oportunidade de acelerar a execução dos workflows que não usam cache.

**Sugestão:** Padronizar a estratégia de cache entre todos os workflows.

---

## 6. `next-sitemap.config.js`

### 🟡 Import não utilizado

A linha 2 importa `siteConfig` de `'./lib/seo/config.js'`, mas a variável `siteConfig` nunca é utilizada no restante do arquivo.

**Impacto:** Import morto que pode ser removido para limpeza de código.

**Sugestão:** Remover o import não utilizado.

---

## 7. `next.config.js`

### 🟡 CORS com `Access-Control-Allow-Origin` muito permissivo

A configuração de CORS usa `'*'` como fallback quando `ALLOWED_ORIGINS` não está definida (linha 40).

```javascript
value: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : '*',
```

**Impacto:** Risco de segurança em ambientes de produção se a variável `ALLOWED_ORIGINS` não for configurada.

**Sugestão:** Remover o fallback `'*'` e exigir que `ALLOWED_ORIGINS` seja configurada explicitamente.

---

## 8. `schema.knip.json`

### 🟡 Arquivo muito grande na raiz (943 linhas)

Este arquivo contém todo o JSON Schema de validação do Knip embutido localmente.

**Impacto:** Polui a raiz do projeto com 943 linhas de schema que raramente são consultadas.

**Sugestão:** Substituir pela referência ao schema oficial do Knip hospedado online, ou mover para um diretório de schemas.

---

## 9. `skills-lock.json`

### 🟡 Arquivo muito grande na raiz (945 linhas)

Este arquivo contém o lock de todas as skills instaladas, com mais de 80 skills registradas.

**Impacto:** Polui a raiz do projeto com quase 1000 linhas de dados de configuração.

**Sugestão:** Mover para um diretório oculto como `.agents/` ou `config/`.

---

## 10. `GEMINI.md`

### 🟡 Caminhos absolutos não portáveis

O arquivo referencia caminhos absolutos (`/home/qa/Projeto/Caminhar/.agents/skills/...`) que não funcionarão em outros ambientes ou máquinas.

**Impacto:** O documento não é portável entre desenvolvedores ou ambientes de CI/CD.

**Sugestão:** Usar caminhos relativos em vez de caminhos absolutos.

---

## 11. `tree.txt`

### 🟡 Arquivo estático desatualizado

O arquivo `tree.txt` contém um snapshot da estrutura de diretórios. Este tipo de arquivo tende a ficar desatualizado rapidamente conforme o projeto evolui.

**Impacto:** Pode induzir a erros se alguém confiar na estrutura listada.

**Sugestão:** Remover o arquivo ou adicionar um script que gere dinamicamente a estrutura de diretórios quando necessário.

---

## 12. `styleMock.js`

### 🔴 Duplicidade com `__mocks__/styleMock.js`

Existem dois arquivos com o mesmo propósito e conteúdo:
- `/styleMock.js` (raiz) → `export default {};`
- `/__mocks__/styleMock.js` → mesmo conteúdo

**Impacto:** Duplicação desnecessária. Ambos servem para mockar CSS nos testes.

**Sugestão:** Manter apenas um dos arquivos e ajustar a referência no `jest.config.js` conforme necessário.

---

## Resumo

| Prioridade | Arquivo | Problema |
|---|---|---|
| 🔴 Alta | `babel.jest.config.js` | Plugin duplicado |
| 🔴 Alta | `rate-limit-proxy.js` | Shadowing de variáveis |
| 🔴 Alta | `rate-limit-proxy.js` | Import com caminho inconsistente |
| 🔴 Alta | `package.json` | Script `test:load:all` gigante |
| 🔴 Alta | `docs/*.yml` | Duplicação entre workflows |
| 🔴 Alta | `styleMock.js` | Duplicidade com `__mocks__/styleMock.js` |
| 🟡 Média | `jest.config.js` | `maxWorkers: 1` lento |
| 🟡 Média | `jest.config.js` | Thresholds elevados |
| 🟡 Média | `package.json` | Versões Node.js inconsistentes |
| 🟡 Média | `next-sitemap.config.js` | Import não utilizado |
| 🟡 Média | `next.config.js` | CORS com fallback `'*'` |
| 🟡 Média | `GEMINI.md` | Caminhos absolutos |
| 🟡 Média | `tree.txt` | Snapshot estático desatualizado |
| 🟡 Média | `schema.knip.json` | 943 linhas na raiz |
| 🟡 Média | `skills-lock.json` | 945 linhas na raiz |