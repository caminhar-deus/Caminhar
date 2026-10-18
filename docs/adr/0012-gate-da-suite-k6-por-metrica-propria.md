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
- **Este ADR não cobre a causa-raiz da outra lacuna auditada.** O
  `getProfile` ([`helpers/profiles.js`](../../load-tests/helpers/profiles.js))
  descarta o perfil inteiro quando o override traz `thresholds`, e 4 dos 5
  factories reagem a isso de formas diferentes — o que faz 23 dos 30 scripts
  ficarem **sem qualquer threshold efetivo de `http_req_failed`**, já em
  produção. Essa correção está especificada e não aplicada: ver o **item AD** de
  [`../PENDENCIAS_scripts_testes.md`](../PENDENCIAS_scripts_testes.md).

## Revisão

Reavaliar se:

- a suíte passar a usar um **threshold por tag de check**
  (`checks{type:evasion}`) em vez de métricas próprias, se o volume de métricas
  customizadas se mostrar difícil de manter;
- o gate deixar de caber em `Rate`/`Counter` e exigir outro tipo de assert;
- ou ao atualizar a versão pinada do k6, caso algum comportamento de
  `responseCallback` ou `http_req_failed` tenha mudado desde v2.3.0.