# Análise dos Testes de Carga — Orchestrator

> **Data da análise:** 27/05/2026  
> **Arquivos analisados:** `reports/k6-summaries/orchestrator-results.json` e `logs/load-tests.log`  
> **Execução original:** 27/05/2026, 07:03 — 07:20 (~17 minutos)

---

## Sumário

1. [Resumo Geral](#1-resumo-geral)
2. [Análise do orchestrator-results.json](#2-análise-do-orchestrator-resultsjson)
3. [Análise Detalhada do load-tests.log](#3-análise-detalhada-do-load-testslog)
   - [Performance Tests (17 scripts)](#31-performance-tests-17-scripts)
   - [Functional Tests (9 scripts)](#32-functional-tests-9-scripts)
   - [Security Tests (5 scripts)](#33-security-tests-5-scripts)
4. [Problemas Identificados](#4-problemas-identificados)
5. [Pontos de Melhoria](#5-pontos-de-melhoria)
6. [Plano de Ação](#6-plano-de-ação)

---

## 1. Resumo Geral

| Item | orchestrator-results.json | load-tests.log |
|------|---------------------------|----------------|
| Data da Execução | 27/05/2026 10:02:56 → 10:20:25 | 27/05/2026 07:03 → 07:20 |
| Total Scripts | 31 | 31 |
| Passados | 31 (100%) | 31 (100%) |
| Falhados | 0 | 0 |
| Categorias | 3 (Performance, Functional, Security) | 3 |

---

## 2. Análise do orchestrator-results.json

O JSON é bem estruturado, com três categorias listando cada script individualmente. Todos os 31 scripts reportam **"status": "pass"**.

**Inconsistência menor:** O log menciona "29 scripts" no banner do cabeçalho (linha 3), mas executou 31 de fato. Isso é um bug cosmético no script orquestrador.

---

## 3. Análise Detalhada do load-tests.log

### 3.1 Performance Tests (17 scripts)

| # | Script | Status | Checks | Observações |
|---|--------|--------|--------|-------------|
| 1 | musicas-load-test | ✅ PASS | **100%** (189/0) | **Perfeito**. Avg 14.26ms, p(95)=18.35ms, 64 requisições |
| 2 | **videos-load-test** | ✅ PASS | **56.65%** (230/176) | ⚠️ Pior taxa de checks. 4 verificações falham: `retornou objeto com videos` (0%), `está na página 2` (0%), `limite é 5` (0%), `página 1 tempo <300ms` (96%) |
| 3 | musicas-crud-test | ✅ PASS | **100%** (176/0) | Perfeito. Avg 10.92ms, 0 erros em create/update/delete |
| 4 | videos-crud-test | ✅ PASS | **100%** (92/0) | Perfeito. Avg 14.2ms, 0 erros |
| 5 | musicas-filter-test | ✅ PASS | **100%** (15/0) | Avg 37.45ms |
| 6 | videos-filter-test | ✅ PASS | **100%** (15/0) | Avg 34.52ms |
| 7 | musicas-pagination-test | ✅ PASS | **100%** (4/0) | ⚠️ Warning: "Página 2 vazia. Adicione mais músicas" |
| 8 | videos-pagination-test | ✅ PASS | **100%** (4/0) | ⚠️ Warning: "Página 2 vazia. Adicione mais vídeos" |
| 9 | musicas-sort-test | ✅ PASS | **100%** (3/0) | Avg 44.25ms |
| 10 | videos-sort-test | ✅ PASS | **100%** (3/0) | Avg 30.98ms |
| 11 | musicas-search-test | ✅ PASS | **100%** (15/0) | Avg 40.73ms |
| 12 | cache-warmup-test | ✅ PASS | **100%** (12/0) | Cache populado com sucesso após 12 requisições (3 rounds) |
| 13 | **cache-performance-test** | ✅ PASS | **99.87%** (1552/2) | ⚠️ **2 checks falharam**: 1x settings cache hit e 1x posts cache hit (>100ms). Threshold `p(95)<500` passou. |
| 14 | **pagination-test (posts)** | ✅ PASS | **100%** (5/0) | ⚠️ Warning: "Página 2 vazia. Adicione mais posts" |
| 15 | authenticated-flow-test | ✅ PASS | **100%** (48/0) | Avg 29.81ms, 49 requisições |
| 16 | **create-post-flow** | ✅ PASS | **100%** (37/0) | ⚠️ **71.94% de http_req_failed** (100 de 139 req falharam). Threshold `rate<0.80` permite. |
| 17 | **stress-test-combined** | ✅ PASS | **0%** (0/0) | ⚠️ **0 checks executados** em ambos cenários (stress_test + memory_monitor). |

### 3.2 Functional Tests (9 scripts)

| # | Script | Status | Checks | Observações |
|---|--------|--------|--------|-------------|
| 1 | health-check | ✅ PASS | **100%** (29.720/0) | Perfeito. 14.860 req em 20s com 20 VUs. Avg 20.23ms |
| 2 | cache-headers-test | ✅ PASS | **100%** (20/0) | Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600` |
| 3 | backup-verification-test | ✅ PASS | **100%** (4/0) | 2 backups encontrados |
| 4 | video-validation-test | ✅ PASS | **100%** (5/0) | 50% http_req_failed (esperado — URLs inválidas propositais) |
| 5 | posts-tags-test | ✅ PASS | **100%** (15/0) | Avg 24.79ms |
| 6 | posts-cursor-pagination-test | ✅ PASS | **100%** (5/0) | Resultados distintos entre página 1 e 2 confirmados |
| 7 | search-content-test | ✅ PASS | **100%** (30/0) | Avg 44.02ms |
| 8 | upload-flow-test | ✅ PASS | **100%** (300/0) | 201 requisições. Upload, URL e verificação de disco OK |
| 9 | recovery-test | ✅ PASS | **100%** (142/0) | Sistema estável durante 2min de monitoramento |

### 3.3 Security Tests (5 scripts)

| # | Script | Status | Checks | Observações |
|---|--------|--------|--------|-------------|
| 1 | **rate-limit-test** | ✅ PASS | **100%** (41.098/0) | 🔴 **CRÍTICO: "Rate Limit NÃO foi acionado"**. 41.098 reqs com 50 VUs sem nenhum bloqueio 429. |
| 2 | **ip-spoofing-test** | ✅ PASS | **33.33%** (817/1.634) | Falha intencional em 2 de 3 checks (espera-se proteção). Avg 1.75s |
| 3 | **ip-spoofing-deteccao-test** | ✅ PASS | **33.33%** (818/1.636) | Idem ao anterior. Mesmo padrão de 1 check passando e 2 falhando |
| 4 | **ddos-search-test** | ✅ PASS | **33.33%** (32.015/64.030) | 32.015 req. **0 bloqueios 429, 0 erros 5xx** com 500 VUs. Avg 377.94ms |
| 5 | login-negative-test | ✅ PASS | **100%** (236/0) | Senhas inválidas e usuários inexistentes rejeitados corretamente (401/429) |

---

## 4. Problemas Identificados

### 🔴 Críticos

| ID | Problema | Severidade | Detalhamento |
|----|----------|------------|--------------|
| P1 | **Rate Limit inoperante** | 🔴 Alta | 41.098 requisições simultâneas com 50 VUs — nenhuma resposta 429. O próprio script alerta: *"Verifique se o Redis está configurado corretamente"*. A aplicação fica exposta a ataques de força bruta. |
| P2 | **videos-load-test com 56.65% de checks** | 🔴 Alta | 4 verificações falham consistentemente: `retornou objeto com videos` (0% de acerto), `está na página 2` (0%), `limite é 5` (0%). O endpoint de vídeos pode ter mudado de schema ou há bug no retorno. |
| P3 | **create-post-flow com 71.94% de falhas HTTP** | 🔴 Alta | 100 de 139 requisições para criar posts falham. O threshold `rate<0.80` é muito permissivo e mascara o problema. Provável concorrência, validação ou colisão de dados. |

### 🟡 Médios

| ID | Problema | Severidade | Detalhamento |
|----|----------|------------|--------------|
| P4 | **Monitor de memória Node.js sem dados** | 🟡 Média | `nodejs_memory_heap_used_bytes` reporta avg=0, min=0, max=0 no stress-test. O k6 não conseguiu se conectar à métrica do Node.js. |
| P5 | **Banco com poucos registros** | 🟡 Média | 3 testes reportam "Página 2 vazia" (músicas, vídeos, posts). Testes de paginação executam apenas 1 iteração. |
| P6 | **Nenhum bloqueio DDoS validado** | 🟡 Média | ddos-search-test com 500 VUs e 32.015 requisições — 0 respostas 429 e 0 erros 5xx. Não foi possível confirmar se a proteção DDoS funciona ou se simplesmente não há limite. |
| P7 | **Cache hit rate com falhas pontuais** | 🟡 Média | 2 requisições de 520 excederam 100ms no cache-performance-test (99.87% de acerto vs 99.9% ideal). |
| P8 | **Stress-test sem validação (0 checks)** | 🟡 Média | Os cenários `stress_test` e `memory_monitor` não executaram nenhum check, apenas métricas de latência. |

### 🟢 Baixos / Cosméticos

| ID | Problema | Severidade | Detalhamento |
|----|----------|------------|--------------|
| P9 | **Contagem errada no banner** | 🟢 Baixa | Cabeçalho diz "29 scripts" mas executa 31. |
| P10 | **Nomenclatura confusa de checks de segurança** | 🟢 Baixa | Checks nomeados como "Vulnerável" (passa quando servidor permite spoofing — isso é o esperado?) e "Protegido" (falha porque servidor não bloqueou). A lógica parece invertida ou mal documentada. |

---

## 5. Pontos de Melhoria

### Taxa geral de aprovação enganosa

Todos os 31 scripts passam, mas alguns thresholds são muito permissivos:
- `rate<0.80` para http_req_failed no create-post-flow (permite até 80% de falhas)
- `rate>0.70` para checks no cache-performance-test
- Ausência de thresholds de latência mínima em vários cenários

### Cobertura de cenários

- **Stress test sem checks**: O cenário de pico com 100 VUs não valida nenhum comportamento funcional do sistema.
- **Testes de paginação limitados**: Banco de dados precisa de mais dados seed para páginas completas.
- **Testes de segurança sem validação real**: Rate limit, IP spoofing e DDoS não são efetivamente testados.

### Consistência do schema de resposta

Endpoint de vídeos parece retornar em formato diferente do esperado pelos testes. Pode ser evolução da API sem atualização dos testes, ou vice-versa.

---

## 6. Plano de Ação

### Fase 1 — Correções Críticas (Prioridade Máxima)

- [ ] P1 — Diagnóstico e correção do Rate Limit / Redis
  - Verificar se o Redis está rodando e configurado corretamente
  - Revisar `rate-limit-proxy.js` e integração com middleware
  - Testar manualmente se 429 é retornado após exceder limite
- [ ] P2 — Correção do endpoint de listagem de vídeos
  - Investigar schema de resposta: `retornou objeto com videos`, `limite é 5`, `está na página 2`
  - Alinhar contrato entre API e teste k6
- [ ] P3 — Redução da taxa de falha em criação de posts
  - Identificar causa das 100 falhas em 139 tentativas (concorrência? validação? duplicidade?)
  - Ajustar lógica de criação para cenários de carga concorrente

### Fase 2 — Melhorias na Cobertura (Prioridade Média)

- [ ] P5 — Seed de dados para testes de paginação
  - Adicionar registros suficientes no banco para gerar múltiplas páginas
- [ ] P4 — Configurar monitor de memória Node.js
  - Expor métricas em rota acessível pelo k6
- [ ] P8 — Adicionar checks no stress-test
  - Validar comportamento funcional durante pico de 100 VUs
- [ ] P6 — Investigar proteção DDoS
  - Entender por que 500 VUs simultâneos não causam degradação ou bloqueio
  - Decidir se a resiliência observada é desejada ou se há falta de proteção

### Fase 3 — Ajustes de Qualidade (Prioridade Baixa)

- [ ] P7 — Otimizar taxa de cache hit para >99.9%
- [ ] P9 — Corrigir contagem de scripts no banner do orquestrador
- [ ] P10 — Melhorar nomenclatura e documentação dos checks de segurança
- [ ] Revisar thresholds dos testes para serem menos permissivos
- [ ] Adicionar testes de latência mínima para endpoints críticos

---

## Checklist de Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `reports/k6-summaries/orchestrator-results.json` | Resumo estruturado dos resultados |
| `logs/load-tests.log` | Log completo da execução (4.891 linhas) |
| `load-tests.yml` | Pipeline CI/CD para testes de carga |
| `rate-limit-proxy.js` | Middleware de rate limit |
| `scripts/run-all-load-tests-sequentially.js` | Script orquestrador |
| `docs/PROJECT_load-tests.md` | Documentação existente dos load tests |

---

*Documento gerado em 27/05/2026 com base na análise dos arquivos de execução dos testes de carga.*