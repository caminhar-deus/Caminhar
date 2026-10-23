# ADR-0012: Na suíte k6, reprovação vem de métrica própria com threshold; `checks` agregado é diagnóstico

- **Status:** Aceito
- **Data:** 2026-10-17
- **Decisores:** manutenção do projeto
- **Relacionados:** [`../PROJECT_load-tests.md`](../PROJECT_load-tests.md), [`../PENDENCIAS_scripts_testes.md`](../PENDENCIAS_scripts_testes.md) (itens AB e AD), [`../../load-tests/`](../../load-tests/), [`../../.github/workflows/test-base.yml`](../../.github/workflows/test-base.yml), [`../UPGRADE_load-tests.md`](../UPGRADE_load-tests.md)

## Contexto

A auditoria dos artifacts dos runs de cron #12, #13 e #14 (15–17/10/2026) expôs
três fatos medidos sobre como a suíte k6 decide se um teste passou.

**1. O agregado `checks` não é interpretável em parte da bateria.** Uma resposta
HTTP tem um único status, então checks mutuamente exclusivos funcionam como uma
moeda de dois lados: exatamente um passa por iteração. Medido:

| Script | Estrutura | `checks` medido |
|---|---|---|
| [`security/ip-spoofing-test.js`](../../load-tests/security/ip-spoofing-test.js) | 2 checks exclusivos (429 vs 401) | **50,00%** |
| [`security/ddos-search-test.js`](../../load-tests/security/ddos-search-test.js) | 3 checks exclusivos (200 / 429 / 5xx) | **33,33%** |
| [`functional/recovery-test.js`](../../load-tests/functional/recovery-test.js) | 1 check por ramo do `if`, e o ramo só executa o check que passa | **100%**, mesmo com o sistema caído |

O terceiro caso é o pior dos três: `checks: ['rate==1.0']` seria satisfeito por
um sistema que tivesse ficado indisponível o tempo todo. E `recovery-test` era o
único script da bateria **sem threshold algum** — o perfil `recovery` define
`thresholds: {}` e o script não acrescentava nada.

**2. `expectedStatuses` não existe na API do k6.** Dois scripts declaravam essa
chave em params de requisição. A chave correta é `responseCallback`, e
`http.expectedStatuses(...)` é uma *função* que constrói o callback. Como o
parse de params do k6 não tem ramo `default:`, a chave desconhecida era
descartada **em silêncio, sem warning**. O efeito medido em
`ddos-search-test.js` era grave em leitura: os 429 — que são justamente o sinal
de que a proteção funcionou — contavam como requisição falha, e o artifact
registrava `http_req_failed` em **99,94%** num teste cuja proteção estava de pé.

**3. A versão do k6 não era pinada.**
[`test-base.yml`](../../.github/workflows/test-base.yml) chamava
`grafana/setup-k6-action@v1` sem `k6-version`, ou seja, instalava a *latest* a
cada semana. Como a leitura de uma métrica de gate depende da versão que a
produziu, um job que troca de versão sozinho invalida a comparação entre runs —
e o projeto **já** Mediu que o ambienteHosted runner introduz variação maior que
muitos dos efeitos que tenta medir: o run #14 rodou em `mexicocentral` e o #13 em
`eastus`, com o mesmo código e o mesmo número de iterações, e o p95 do
`stress-test-combined` foi de 3,40 ms para 24,91 ms.

## Decisão

**A reprovação de um script k6 é decidida por uma métrica `Rate`/`Counter`
própria, com threshold explícito sobre essa métrica. O agregado `checks` é
diagnóstico, nunca gate.**

Consequências operacionais, todas aplicadas:

1. **Todo script precisa de pelo menos um threshold que o k6 consiga avaliar.** Onde
   o `checks` agregado não distingue o estado bom do ruim, a métrica própria é o
   gate — no padrão já existente de `search_block_rate` e
   `ip_rotation_evasion_rate`. `recovery-test` ganhou
   `recovery_unhealthy_rate` com `rate<0.10` (baseline medida no run #14:
   0,00%, em 145 iterações).
2. **Status HTTP esperado se declara com `responseCallback`.** Nunca com
   `expectedStatuses` em params: a chave não existe e o erro é silencioso.
3. **Nunca adicionar threshold em `checks` nos scripts de estado exclusivo.** Os
   três scripts envolvidos carregam isso em comentário no próprio código.
4. **A versão do k6 é pinada em `k6-version: '2.3.0'`** — a mesma dos runs
   #12–#14 (verificado nos logs: ambos imprimem
   `Downloading k6 version 2.3.0`), de modo que pinar não altera nenhum
   comportamento já medido e só impede a deriva. **O valor é sem o prefixo `v`:**
   a action monta a URL como `releases/download/v<k6-version>/…`, então passar
   `v2.3.0` produz `vv2.3.0` e 404 — erro cometido na primeira aplicação e
   detectado no run #15 (18/10/2026), que falhou no step de setup do k6.
5. **O instrumento é escolhido pela natureza da lacuna, não por padronização**
   (consequência acrescentada em 21/10/2026, com a Fase 2 do item AD).
   Onde o furo é "ninguém olha para esta requisição" (warm-up e teardown), a
   correção é `check` de status: é mais barato que um gate de taxa e aponta
   *qual* requisição falhou. Onde o furo é "o erro não é visível por nenhum
   check" (uma resposta 500 que o `check` engole porque o fallback ainda
   satisfaz a asserção), a correção é gate de taxa próprio. **Não se adiciona
   gate de taxa a script que espera 4xx por desenho** (6 deles) **nem a script
   cujo erro já é coberto por `check`** (14 deles): gate que nunca reprova
   nada é ruído que dá falsa sensação de cobertura.

## Alternativas consideradas

- **Manter o estado e só documentar** — não resolve a armadilha: o artifact segue
  exibindo `✗` em massa, `recovery-test` segue sem gate, e o próximo autor que
  adicionar `checks: ['rate==1.0']` reprova o cron sem entender por quê.
- **Inverter os checks de estado ruim** (ex.: trocar
  `EVASÃO CONFIRMADA (401)` por `(r) => r.status !== 401`) — descartado: o nome
  passaria a mentir ("Evasão confirmada" aprovando quando não há evasão) e o
  veredito se inverteria silenciosamente se alguém adicionasse threshold em
  `checks` depois. Em `ddos-search-test` não existe um check único "sempre bom":
  os três estados são legítimos e distintos, e nenhum threshold de
  latência-ou-aggregate os substitui.
- **Métrica própria apenas, removendo os `check()`** — Considerado e parcialmente
  adotado: os `check()` foram **mantidos** porque dão contagem granular por
  status no artifact, que é informação de diagnóstico útil. O que mudou é que
  eles deixaram de ser a fonte do veredito.
- **Não pinar a versão** — descartado pelo ponto 3 do contexto: sem pin, a
  comparação entre artifacts de runs diferentes deixa de ser válida, e a auditoria
  já precisou recorrer ao código-fonte do k6 para resolver uma divergência que a
  versão pinada teria eliminado.

## Consequências

### Validado em produção

A decisão foi aplicada e **validada em produção** no run [`39233955292`](https://github.com/caminhar-deus/Caminhar/actions/runs/39233955292) (cron nº 16, 19/10/2026, `success`, 30/30 passed), medindo o artifact e não o código:

| Consequência da decisão | Estado medido |
|---|---|
| `responseCallback` faz o 429 deixar de contar como falha | `ddos_search_test.json` com `http_req_failed` em **0,00%** (117231 amostras), contra **99,94%** medidos nos runs #12–#14 |
| `recovery-test` deixou de ser o script sem gate | `recovery_unhealthy_rate` presente, rate **0,00%** em 144 iterações, threshold `rate<0.10` com `ok: true` |
| O `checks` agregado não é lido como veredito | `ip-spoofing` em 50,00% e `ddos-search` em 33,33% no #16, e o run passou — a leitura correta é a das métricas próprias, que passaram com folga (`search_block_rate` 99,91%, `ip_rotation_evasion_rate` 0,0055%) |
| A versão pinada não altera comportamento medido | O log do #16 imprime `Downloading k6 version 2.3.0`, idêntico ao que os runs #13 e #14 instalavam sem pin |

**O pin foi validado pela via negativa primeiro.** O run [`39113170891`](https://github.com/caminhar-deus/Caminhar/actions/runs/39113170891) (nº 15, 18/10/2026) reprovou com `Unexpected HTTP response: 404` porque o valor foi escrito como `'v2.3.0'` e a action prefixa `v`, montando `vv2.3.0`. Nele, `Run Tests` ficou `skipped` e o artifact veio vazio — nenhuma das consequências acima chegou a ser exercitada, e é por isso que o registro é feito contra dois runs e não só contra o verde.

**Footprint verificado por diferença de thresholds entre artifacts:** entre os runs #14 e #16, o campo `metrics.*.thresholds` difere em **um único arquivo** — `recovery_test.json`, que passou de `[]` para `['rate<0.10']`. Nenhum outro threshold da suíte foi alterado, adicionado ou perdido.

**A Fase 1 (correção do `getProfile`, item AD) foi validada em produção pelo run [`39576629604`](https://github.com/caminhar-deus/Caminhar/actions/runs/39576629604) (nº 18, 21/10/2026, `success`, 30/30 passed):** os **13 thresholds recuperados** estão presentes no artifact e **80 thresholds avaliados, 80 `ok`, 0 falharam**; nenhum threshold foi removido; e a contagem de scripts com `http_req_failed` efetivo subiu de **7 para 9 de 30** — os 2 de carga, que passaram com **0,00%** de falha sobre 68 e 133 requisições. Esses 2 são o **piloto vivo** do gate de taxa que a Fase 2 usou para calibrar limites — mas o desfecho da Fase 2 **não foi** "levar o gate aos demais scripts" (ver o bloco abaixo).

**A Fase 2 (item AD) foi APLICADA em 21/10/2026 e VALIDADA em produção pelos crons #19 (22/10/2026) e #20 (23/10/2026):** no #19 os 5 scripts alterados passaram — o único reprovado foi o `musicas-sort-test`, por drift de contrato do `sort`, fora do escopo desta fase — e no #20 a suíte fechou **30/30**, com o inventário dos **81 thresholds efetivos** resolvido em Node puro (mesmo pipeline `script → factory → getProfile`): **0 scripts sem nenhum threshold** e **10 com gate de `http_req_failed`**, batendo com os **80** avaliados no artifact do #18 mais o único threshold que esta fase acrescentou. **O item AD está encerrado.** A auditoria dos 30 scripts mudou a premissa do plano original ("um gate de `http_req_failed` por script"): **depois da Fase 2, 10 dos 30 scripts têm `http_req_failed`** (os 9 da Fase 1 + `posts_tags`), **6 nunca podem tê-lo** (esperam 4xx/429 por desenho: `video-validation`, `ddos-search`, `ip-spoofing`, `rate-limit`, `recovery`, `login-negative`) **e 14 são cobertos por `check` de status** — o instrumento que esta ADR define como o certo para "a resposta foi a esperada?". O que faltava na maioria **não era gate de taxa, era `check` onde havia ponto cego**: o warm-up e o teardown.

| Arquivo | Mudança | Por quê |
|---|---|---|
| `performance/musicas-search-test.js` | URL do warm-up com `encodeURIComponent()` + `check` de status nos 2 warm-ups | **Bug real e determinístico**: `?search=Graça` mandava o byte UTF-8 cru no request target e o parser HTTP do Node respondia **400 antes de a aplicação** (`http_req_failed` = 0,142857 = 1/7, **idêntico** nos runs #15, #17 e #18, com a suíte reportando PASS) |
| `functional/search-content-test.js` | os 3 warm-ups capturados + `check` de status | mesmo furo: warm-up sem `check` é invisível para `checks: ['rate==1.0']` |
| `performance/musicas-crud-test.js` | `check` na listagem do teardown e em cada delete (200 ou 404) | limpeza que falha deixa lixo "K6" no banco **sem** reprovar a execução |
| `performance/videos-crud-test.js` | idem | idem |
| `functional/posts-tags-test.js` | `http_req_failed: ['rate<0.20']` | **único script que precisava de gate de taxa**: cada requisição roda 3 checks e, numa resposta 500, só 1 falha (o check de "lista de posts" cai no fallback `[]`, que passa no `Array.isArray`) — até 2 das 5 (40%) poderiam falhar e a execução ainda passaria com `checks: ['rate>0.80']`; com `rate<0.20` a **primeira** falha já reprova (1/5 = 20%) |

**Correção de uma recomendação errada, registrada para não voltar:** a calibragem de `http_req_failed` é **sempre por taxa** (`rate<…`). A ideia de "contagem absoluta" via `count<…` é **impossível** nessa métrica — no k6 v2.3.0, `js/modules/k6/metrics/metric_type.go` devolve `[]string{tokenRate}` para o tipo `Rate`: a métrica `Rate` **só** aceita o token `rate`, e `count` é token de `Counter`. Um `count<` ali **não produziria gate nenhum**, em vez de medir o que se propunha.

**Cobertura travada por teste:** `tests/unit/load-tests/error-gate-coverage.test.js` (11 testes) — ASCII na parte estática de toda URL de requisição da suíte; a lista de 6 scripts que esperam 4xx por desenho **sem** `http_req_failed`; os 4 marcadores de `check` do warm-up/teardown; o `rate<0.20` do `posts-tags`; quem declara `http_req_failed` entre os perfis; e o inventário de 30 scripts. **Prova de mutação executada:** as 5 mudanças revertidas uma a uma reprovaram o teste correspondente (5/5), com a suíte restaurada ao final.

### Positivas

- `recovery-test` deixa de ser o único script sem gate.
- O artifact deixa de reportar uma métrica de sistema (`http_req_failed`) que era
  essencialmente ruído: em `ddos-search-test` ela marcava 99,94% de falha num
  cenário de sucesso.
- Um gate passa a ter leitura inequívoca: ou a métrica própria passou do limite,
  ou não passou. Não existe o caso "o `checks` deu 33%, mas isso é o esperado?".

### Negativas e riscos

- **Métrica própria por script é mais verbosa que um threshold em `checks`.**
  Cada script de estado exclusivo precisa declarar sua `Rate` e seu threshold, e
  manter os dois em acordo.
- **Pin de versão exige manutenção.** Atualizar o k6 passa a ser uma decisão
  consciente, com comparação de artifact, em vez de acontecer sozinho.
- **A outra lacuna auditada foi corrigida em 20/10/2026 (Fase 1 do item AD).** O `getProfile` ([`helpers/profiles.js`](../../load-tests/helpers/profiles.js)) descartava o perfil inteiro quando o override trazia `thresholds`, o que deixava **23 dos 30 scripts sem qualquer threshold efetivo de `http_req_failed`**, já em produção. Agora ele **mescla por padrão, chave a chave**, e o descarte total só acontece de forma explícita, via `overrides.replaceThresholds: true` — usado onde o script declara uma tolerância incompatível com o gate do perfil base. A lista de scripts afetados e o plano restante (Fase 2) estão no **item AD** de [`../PENDENCIAS_scripts_testes.md`](../PENDENCIAS_scripts_testes.md), que é a fonte desse dado.

## Revisão

Reavaliar se:

- a suíte passar a usar um **threshold por tag de check**
  (`checks{type:evasion}`) em vez de métricas próprias, se o volume de métricas
  customizadas se mostrar difícil de manter;
- o gate deixar de caber em `Rate`/`Counter` e exigir outro tipo de assert;
- ou ao atualizar a versão pinada do k6, caso algum comportamento de
  `responseCallback` ou `http_req_failed` tenha mudado desde v2.3.0.