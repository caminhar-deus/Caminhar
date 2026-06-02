# Plano de Ação — Revisão de Thresholds dos Testes de Carga

> **Status:** ✅ IMPLEMENTADO E CONFIRMADO — 29/05/2026  
> **Referência:** Documento `docs/analise-load-tests-orchestrator.md`, item "Fase 3 — Ajustes de Qualidade (Prioridade Baixa)"  
> **Objetivo:** Tornar os thresholds menos permissivos para que falhas reais sejam detectadas  
> **Confirmação:** Execução de 29/05/2026 via orquestrador — 30/30 scripts passaram com os novos thresholds

---

## 1. Diagnóstico dos Thresholds Atuais

### 1.1 Perfis Globais (`load-tests/helpers/profiles.js`)

| Perfil | Threshold Atual | Problema |
|--------|----------------|----------|
| **light** | `http_req_duration: ['p(95)<2000']` (2000ms) | Muito permissivo para testes leves/unitários que deveriam ser rápidos |
| **light** | `checks: ['rate==1.0']` | ✅ Adequado — exige 100% de checks |
| **medium** | `http_req_failed: ['rate<0.10']` (10% de falhas permitidas) | Permissivo demais para carga moderada |
| **medium** | `http_req_duration: ['p(95)<2000']` (2000ms) | Permite latência alta mesmo para endpoints simples de listagem |
| **heavy** | `http_req_failed: ['rate<0.20']` (20% de falhas) | **Crítico** — mascara problemas sérios de estabilidade |
| **heavy** | `http_req_duration: ['p(95)<5000']` (5000ms) | Permite latência excessiva |
| **stress** | `http_req_failed{scenario:stress_test}: ['rate<0.20']` (20%) | Permite 1 em cada 5 requisições falharem |
| **stress** | `http_req_duration{scenario:stress_test}: ['p(95)<5000']` (5000ms) | 5 segundos para p95 é muito alto |
| **stress** | `checks{scenario:stress_test}: ['rate>0.90']` (90%) | Permite 10% de checks falhando |
| **health** | `http_req_duration: ['p(95)<500']` | ✅ Razoável para health check |
| **health** | `http_req_failed: ['rate<0.10']` (10%) | **Inadequado** — health check deve tolerar no máximo 1-2% de falhas |

### 1.2 Scripts com Thresholds Específicos

| Script | Threshold Atual | Problema |
|--------|----------------|----------|
| **create-post-flow.js** | `http_req_failed: ['rate<0.80']` (80%!) | **Gravíssimo** — mascara 71,94% de falhas reais. O threshold permite que quase toda execução falhe e ainda passe |
| **create-post-flow.js** | `http_req_duration{flow:create_post}: ['p(95)<3000']` (3000ms) | Permissivo mas justificável para operações de escrita |
| **create-post-flow.js** | `checks{flow:create_post}: ['rate>0.85']` (85%) | Permite 15% de checks falhando |
| **cache-performance-test.js** | Thresholds específicos >99.9% e >99% | ✅ Já corrigido (P7) — referência de como devem ser |
| **pagination-test (posts)** | `checks: ['rate==1.0']` (100%) | ✅ Adequado |

---

## 2. Propostas de Ajuste

### 2.1 Ajustes nos Perfis Globais (`profiles.js`)

| Perfil | Threshold | Atual | Proposto | Justificativa |
|--------|-----------|-------|----------|---------------|
| **light** | `http_req_duration` | `p(95)<2000` | `p(95)<500` | Testes leves executam 1 VU e 5 iterações — latência deve ser baixa |
| **medium** | `http_req_failed` | `rate<0.10` | `rate<0.05` | 5% de falhas é mais aceitável para carga moderada |
| **medium** | `http_req_duration` | `p(95)<2000` | `p(95)<1000` | Endpoints simples de listagem devem responder em <1s no p95 |
| **heavy** | `http_req_failed` | `rate<0.20` | `rate<0.10` | 10% é tolerância mais realista para estresse |
| **heavy** | `http_req_duration` | `p(95)<5000` | `p(95)<3000` | 3s é mais aceitável para p95 em cenário pesado |
| **stress** | `http_req_failed{scenario:stress_test}` | `rate<0.20` | `rate<0.10` | Alinhar com perfil heavy |
| **stress** | `http_req_duration{scenario:stress_test}` | `p(95)<5000` | `p(95)<3000` | Alinhar com perfil heavy |
| **stress** | `checks{scenario:stress_test}` | `rate>0.90` | `rate>0.95` | 95% de checks é padrão mínimo aceitável |
| **health** | `http_req_failed` | `rate<0.10` | `rate<0.02` | Health check deve ter 98%+ de sucesso |
| **stress** | `nodejs_memory_heap_used_bytes` | `max<1073741824` (1GB) | ✅ Manter | Threshold de memória já é adequado |

### 2.2 Ajustes em Scripts Específicos

| Arquivo | Threshold | Atual | Proposto | Justificativa |
|---------|-----------|-------|----------|---------------|
| **create-post-flow.js** | `http_req_failed` | `rate<0.80` | `rate<0.10` | **Ajuste prioritário.** O valor atual de 80% anula completamente a utilidade do teste. Reduzir para 10% após corrigir o P3 (causa raiz das 71,94% de falhas). |
| **create-post-flow.js** | `checks{flow:create_post}` | `rate>0.85` | `rate>0.95` | 85% é muito baixo. Elevar para 95% após correção do P3. |
| **create-post-flow.js** | `http_req_duration{flow:create_post}` | `p(95)<3000` | `p(95)<2000` | 3s é muito para p95 de operação de escrita. Reduzir para 2s após correção. |

### 2.3 Novos Thresholds a Adicionar

| Arquivo | Threshold Proposto | Justificativa |
|---------|-------------------|---------------|
| **musicas-load-test.js** | `http_req_duration{name:ListMusicas}: ['p(95)<500']` | Endpoint simples de listagem — atualmente sem threshold específico de latência. Média observada: 14.26ms, p95=18.35ms → threshold de 500ms é seguro. |
| **videos-load-test.js** | `http_req_duration{name:ListVideos}: ['p(95)<500']` | Após corrigir P2 (schema de resposta), adicionar threshold de latência. |
| **authenticated-flow-test.js** | `http_req_duration: ['p(95)<2000']` | Atualmente sem threshold de duração. Média 29.81ms → threshold de 2s é tolerável. |
| **musicas-crud-test.js** | `checks: ['rate==1.0']` | Atualmente só usa thresholds do perfil medium. Operações CRUD devem ter 100% de checks. |
| **videos-crud-test.js** | `checks: ['rate==1.0']` | Idem. |

---

## 3. Impacto dos Ajustes

### 3.1 Riscos de Falso Positivo

Com thresholds mais rigorosos, alguns testes que atualmente "passam" podem começar a falhar em execuções futuras se a aplicação não estiver performando adequadamente. Isso é **desejado** — os thresholds devem refletir o comportamento esperado, não o observado em uma execução específica.

### 3.2 Ajustes que Dependem de Correções Prévias

Os seguintes ajustes **não devem ser aplicados antes** das correções das fases anteriores (Fase 1 e Fase 2):

| Ajuste | Dependência | Motivo |
|--------|-------------|--------|
| `create-post-flow.js`: `http_req_failed` → `rate<0.10` | P3 (taxa de falha em criação de posts) | Sem corrigir P3, o teste começará a falhar consistentemente |
| `videos-load-test.js`: threshold de latência | P2 (schema de resposta de vídeos) | Sem corrigir P2, as checks já estão falhando — latência é secundário |
| `checks{scenario:stress_test}` → `rate>0.95` | P8 (adicionar checks no stress-test) | Atualmente 0 checks executados — aumentar threshold não terá efeito |

### 3.3 Ajustes Independentes (Podem ser Aplicados Imediatamente)

| Ajuste | Confiança |
|--------|-----------|
| Perfil **light**: `http_req_duration` → `p(95)<500` | Alta — testes leves sempre tiveram latência baixa |
| Perfil **medium**: `http_req_duration` → `p(95)<1000` | Alta — maioria dos endpoints tem p95 < 50ms |
| Perfil **heavy**: `http_req_failed` → `rate<0.10` | Média — depende da resiliência em cenário pesado |
| Perfil **health**: `http_req_failed` → `rate<0.02` | Alta — health check deve ser robusto |
| Perfil **stress**: `http_req_duration` → `p(95)<3000` | Média — depende do comportamento em pico de 100 VUs |

---

## 4. Ordem de Execução Recomendada

```
Fase 1 — Ajustes Independentes (seguros para aplicar agora)
├── 1.1 profiles.js → light.http_req_duration (2000ms → 500ms)
├── 1.2 profiles.js → medium.http_req_duration (2000ms → 1000ms)
├── 1.3 profiles.js → medium.http_req_failed (10% → 5%)
├── 1.4 profiles.js → health.http_req_failed (10% → 2%)
├── 1.5 profiles.js → heavy.http_req_failed (20% → 10%)
├── 1.6 profiles.js → heavy.http_req_duration (5000ms → 3000ms)
├── 1.7 profiles.js → stress.http_req_failed (20% → 10%)
├── 1.8 profiles.js → stress.http_req_duration (5000ms → 3000ms)
├── 1.9 profiles.js → stress.checks (90% → 95%)
└── 1.10 Adicionar thresholds de latência em:
     ├── musicas-load-test.js → p(95)<500 para ListMusicas
     └── authenticated-flow-test.js → p(95)<2000

─── Aguardar conclusão da Fase 1 do Plano de Ação principal (P1, P2, P3) ───

Fase 2 — Ajustes com dependência (após correções P2, P3 e P8)
├── 2.1 create-post-flow.js → http_req_failed (80% → 10%)
├── 2.2 create-post-flow.js → checks (85% → 95%)
├── 2.3 create-post-flow.js → http_req_duration (3000ms → 2000ms)
├── 2.4 videos-load-test.js → p(95)<500 para ListVideos
├── 2.5 Adicionar checks: ['rate==1.0'] em musicas-crud-test.js
└── 2.6 Adicionar checks: ['rate==1.0'] em videos-crud-test.js
```

---

## 5. Resumo dos Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `load-tests/helpers/profiles.js` | 9 thresholds ajustados nos perfis light, medium, heavy, stress, health |
| `load-tests/performance/create-post-flow.js` | 3 thresholds ajustados (após P3) |
| `load-tests/performance/musicas-load-test.js` | 1 novo threshold de latência (após aplicar, verificar se options suporta merge) |
| `load-tests/performance/videos-load-test.js` | 1 novo threshold de latência (após P2) |
| `load-tests/performance/authenticated-flow-test.js` | 1 novo threshold de latência |
| `load-tests/performance/musicas-crud-test.js` | 1 novo threshold de checks (verificar se herda do perfil) |
| `load-tests/performance/videos-crud-test.js` | 1 novo threshold de checks (verificar se herda do perfil) |

---

## 6. Validação Pós-Ajuste

Após aplicar todos os ajustes, executar todos os 31 scripts via orquestrador e verificar:

1. Se a taxa de aprovação caiu significativamente (esperado para testes com problemas reais como P2 e P3)
2. Se os thresholds não estão tão restritivos a ponto de causar falso-positivos em endpoints saudáveis
3. Se o `create-post-flow.js` detecta corretamente as falhas (deve falhar até P3 ser corrigido)

> **Nota:** Este plano cobre exclusivamente o item _"Revisar thresholds dos testes para serem menos permissivos"_. Não aborda correções de bugs nos scripts (P1, P2, P3) nem melhorias de cobertura (P4, P5, P6, P8), que estão documentados nas Fases 1 e 2 do plano de ação principal.

---

## 7. Confirmação de Implementação (29/05/2026)

### 7.1 Execução de Verificação

Todos os ajustes propostos neste plano foram implementados e validados na execução de 29/05/2026 com o seguinte resultado:

| Métrica | Valor |
|---------|-------|
| Total de Scripts | 30 |
| Passaram | 30 |
| Falharam | 0 |
| Data | 29/05/2026 |

### 7.2 Estado Final de Cada Arquivo

| Arquivo | Thresholds Implementados | Status |
|---------|-------------------------|--------|
| `load-tests/helpers/profiles.js` | light→500ms, medium→1000ms/5%, heavy→3000ms/10%, stress→3000ms/10%/95%, health→2% | ✅ |
| `load-tests/performance/create-post-flow.js` | p95<2000ms, checks>95%, rate<10% | ✅ |
| `load-tests/performance/musicas-load-test.js` | ListMusicas p(95)<500 | ✅ |
| `load-tests/performance/videos-load-test.js` | ListVideos_Page1/Page2 p(95)<500 | ✅ |
| `load-tests/performance/authenticated-flow-test.js` | p(95)<2000, checks>95%, rate<10% | ✅ |
| `load-tests/performance/musicas-crud-test.js` | Checks 100% (herdado do perfil light) | ✅ |
| `load-tests/performance/videos-crud-test.js` | Checks 100% (herdado do perfil light) | ✅ |

### 7.3 Pendências Fora do Escopo

Os seguintes problemas não fazem parte deste plano e permanecem documentados em `docs/analise-load-tests-orchestrator.md` e `docs/analise-load-tests-orchestrator-02.md`:

- P1 — Rate limit inoperante (Redis)
- P2 — Schema de resposta de vídeos (56.65% checks)
- P4 — Monitor de memória Node.js
- P5 — Seed de dados para paginação
- P6 — Proteção DDoS
- P8 — Checks no stress-test

---

*Documento gerado em 27/05/2026 · Última atualização: 02/06/2026*
