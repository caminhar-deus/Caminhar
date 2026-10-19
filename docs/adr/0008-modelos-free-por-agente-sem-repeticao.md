# ADR-0008: Um modelo FREE distinto por agente, medido, sem repetição

- **Status:** Aceito
- **Data:** 2026-10-15
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../../.opencode/oh-my-opencode-slim.json`](../../.opencode/oh-my-opencode-slim.json), [`../../opencode.jsonc`](../../opencode.jsonc), [`../../AGENTS.md`](../../AGENTS.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

> **Revisão 18/10/2026 — parcialmente superada pelo merge do slim 3.0.5.**
> O slim 3.0.5 fundiu o agente `librarian` no `explorer`
> (`MARKETPLACE_BUILTIN_RENAMES` em `dist/index.js`: `librarian -> explorer`) e o
> removeu de `SUBAGENT_NAMES`. O texto abaixo está preservado como registro do que
> foi medido em 15/10/2026, quando o librarian existia. O que mudou de fato:
> (1) a distribuição passou de seis agentes para cinco — a distinção
> librarian-vs-explorer que motivou o princípio de "um modelo por agente" **deixou de
> existir**, e o explorador ficou com o `longcat-2.5-preview-free`;
> (2) `deepseek-v4.1-flash-free`, medido aqui como o melhor modelo de doc externa,
> ficou **órfão** — está ativo no catálogo, mas nenhum agente o usa;
> (3) a garantia "nenhum modelo se repete entre os 6 agentes" continua válida por
> vacuidade, já que são 5.
>
> O princípio central deste ADR — medir em bateria real antes de promover, e
> verificar se o id ainda existe no catálogo — **continua valendo** e foi o que
> permitiu detectar o órfão. Para a decisão sobre o que fazer com o deepseek,
> ver a nota no preset `zen`. **A bateria que faltava rodou em 19/10/2026** —
> ver "19/10/2026" no fim do texto.

## Contexto

O projeto roda em **OpenCode Zen**, Provider `opencode`, cujos modelos são
gratuitos por tempo limitado. A distribuição dos modelos entre os seis agentes
vinha do preset `"zen"` em
[`.opencode/oh-my-opencode-slim.json`](../../.opencode/oh-my-opencode-slim.json)
e, até 15/10/2026, era: `space-bunny-free` no orchestrator, `mimo-v2.6-flash-free`
no oracle **e** no fixer, `muse-spark-1.3-contributor-free` no designer, e a cadeia
`[nemotron-3.5-lightning-free, mimo-v2.6-flash-free]` **idêntica** no librarian e
no explorer.

Essa distribuição tinha dois problemas estruturais:

1. **Acoplamento entre agentes.** `mimo-v2.6-flash-free` atendia oracle e fixer ao
   mesmo tempo, e librarian e explorer compartilhavam a mesma cadeia. Uma única
   indisponibilidade derrubava dois agentes de uma vez. O comentário do próprio
   preset registrava isso — *"ela NÃO separa explorer de librarian […] então uma
   indisponibilidade dele ainda atinge os dois ao mesmo tempo"* — mas a cadeia era
   apresentada como a mitigação, quando na verdade apenas mudava *como* os dois
   caíam (um no mimo em vez de morrer).
2. **A reserva não cobre o modo de falha mais provável.** A cadeia
   (`"model": [a, b]`) só age por meio do hook `v2.session.retry` do slim, e apenas
   para erros que ele classifica como failover: rate limit, 401/403, 502/503/504 e
   timeout. O erro de autenticação do free tier (*"can only be used from within
   OpenCode"*) **não casa com nenhum padrão** e pode não acionar a cadeia. Como o
   free tier é justamente o cenário em que o modelo desaparece, a cadeia é
   exatamente o mecanismo que tende a não ajudar.

Some-se a isso que a cota do Zen é por IP/dia (~200 requisições observadas), o
bloqueio é **por modelo**, e modelos free podem sumir — já houve um `deprecated` no
catálogo.

Nenhuma decisão anterior registra *por que* cada agente deveria receber aquele
modelo específico: a distribuição foi sendo acumulada por ajustes pontuais. Este ADR
registra a decisão como está em vigor, a partir de medição.

## Decisão

Vamos atribuir **um modelo FREE distinto a cada agente, sem repetição entre eles**,
escolhido por medição e não por conveniência.

| Agente | Modelo | Papel da medição |
|---|---|---|
| `orchestrator` | `minimax-m3.1-flash-free` (reserva: `big-pickle`) | 21/24 itens do Camada B em 3 execuções; 0 erros verificáveis — ver "19/10/2026 (mais tarde)" |
| `oracle` | `nemotron-3.5-super-vl-free` | achou a causa da escalada de privilégio, não o sintoma — ver "Saídas do catálogo" |
| `explorer` | `longcat-2.5-preview-free` | 10/10; localizou o `withAuth` em uso, que o rival errou |
| `designer` | `beam-free` | 3/3 no papel novo + 4/4 em 16/10; apontou o `--color-text-tertiary` como proibido para texto informativo |
| `fixer` | `mimo-v2.6-flash-free` | 9/9 testes; e em 19/10: correção reaplicada e suíte rodada de verdade, com o teste novo falhando no código original |

> A tabela é a de **19/10/2026, mais tarde**. Antes dela havia seis linhas: o `librarian`
> (`deepseek-v4.1-flash-free`) deixou de existir quando o slim 3.0.5 fundiu-o no
> `explorer`, e o `designer` trocou de modelo porque o `muse-spark-1.3-contributor-free`
> saiu do catálogo. Na mesma tarde o `space-bunny-free` — o primário do `orchestrator` —
> também saiu, e o primário passou a ser o `minimax-m3.1-flash-free` (medido hoje neste
> papel: 21/24 itens do Camada B, 0 erros verificáveis). O histórico fica em "Saídas do
> catálogo em 16/10/2026", em "Re-análise de 16/10/2026" e em "19/10/2026 (mais tarde)".

A escolha partiu de uma bateria de **15/10/2026**: uma tarefa real por modelo free,
com a resposta conferida em `arquivo:linha` antes de aceitar. A regra de escolha foi
"o modelo com menos erros verificáveis na tarefa que ele vai executar de fato", não
"o modelo mais rápido" nem "o mais capaz no geral".

A ausência de repetição **substitui** a cadeia como mecanismo de resiliência: como
não há modelo compartilhado, a queda de um atinge um agente só. O orchestrator
mantém reserva explícita porque é o único cujo modelo afeta toda a sessão.

### Ordem do orchestrator: primário adiado

A bateria favoreceu `big-pickle` no papel de orquestração, e a primeira versão deste
ADR o colocava como primário. **O mantenedor inverteu no mesmo dia**:
`space-bunny-free` é o primário e `big-pickle` a reserva.

O motivo é o peso da evidência, não um resultado novo: a bateria mediu o **modelo** numa
tarefa pontual, através de outro agente como proxy — não a sessão inteira, que é o que
o orchestrator de fato executa. Sem o `orchestrator-bench` rodado no papel real, a troca
de primário seria um salto de confiança que a medição não sustenta. Na ausência de
evidência nova, vale o modelo que já estava em produção.

Essa inversão também remove o risco de privacidade que a primeira versão carregava:
`space-bunny-free` tem `zero-retention` registrado, enquanto `big-pickle` não tem essa
propriedade verificada (ver "Negativas e riscos").

### Saídas do catálogo em 16/10/2026

Em menos de 24 h, **dois** dos seis modelos saíram do catálogo do Zen: `step-5-preview-free`
e `big-pickle`. Isso concretiza, num dia, a ressalva desta própria seção de Revisão.

**Oracle.** `step-5-preview-free` saiu, e a decisão do mantenedor foi **medir substituto, não
apontar para o modelo seguinte da lista**. Quatro candidatos livres foram testados com a mesma
tarefa de revisão de segurança, e as respostas foram conferidas em `arquivo:linha` antes de
aceitar. `nemotron-3.5-super-vl-free` venceu por um critério específico do papel: foi o único
que **contestou o contexto que o próprio prompt afirmava** e foi atrás da causa.

A diferença que decidiu:

- Três candidatos relataram `lib/api/adminCrudHandler.js:118` — o `role: 'admin'` pula a
  verificação de permissão específica. É comportamento **intencional** e não configura escalada.
- Só `nemotron-3.5-super-vl-free` achou `adminCrudHandler.js:53`: `requireAdmin = false` é o
  **default**, e só 2 das 15 rotas admin o ativam. Combinado com
  `pages/api/admin/users.js:10` — `role: z.string().optional().default('admin')` — um editor
  com a permissão "Usuários" **cria um admin**. Configuração, não comportamento: não há leitura
  intencional possível desse caminho.

O `oracle` existe para contestar (ver `AGENTS.md` §2). Os outros três aceitaram o contexto
como verdadeiro e trabalharam dentro dele; este foi atrás do porquê. **Custo registrado:** ele
é o único que falhou em complyar o formato pedido, escrevendo `CONFIÂNCIA`. Fine-tuning de
instrução mais frouxo — em revisão longa gera ruído, mas errar o sentido da instrução seria pior.

**Orchestrator.** `big-pickle` era a reserva e saiu. O orchestrator fica **sem reserva**:
funciona, mas uma queda do primário deixa a sessão sem orquestrador. É um estado
intermediário e conhecido como tal. Apontar a reserva para um id que saiu do catálogo seria
pior do que ficar sem reserva, porque falha em silêncio no momento em que mais importa. O
`orchestrator-bench` continua sendo a evidência que falta para escolher um substituto — ele
foi escrito para exatamente esse caso.

**Efeito colateral registrado:** `nemotron-3.5-super-vl-free` estava medido antes como candidato
a `designer` e reprovado (`docs/adr/0009` e a bateria de 15/10). Ele volta ao catálogo e o papel
que ganhou foi outro — a medição por papel não transfere entre papéis.

### Re-análise de 16/10/2026 (segunda medição do dia): inventário e reserva restaurada

A primeira análise de hoje montou **duas opções por agente** a partir de uma bateria de **cinco
execuções reais**, conferidas em `arquivo:linha`. O mantenedor manteve a distribuição já em
produção nos seis agentes. A única mudança resultante é a **restauração da reserva do
orchestrator**, suspensa horas antes porque `big-pickle` tinha saído do catálogo — e que voltou.

Esta seção é um acréscimo datado, não uma reescrita: a decisão (um modelo free distinto por agente)
não mudou. O que mudou foram fatos — o inventário e a disponibilidade.

**O inventário free é maior do que a visão padrão mostra.** `opencode models` esconde, na listagem
padrão, as versões anteriores de cada família. Com `all: true` são **11** modelos free `active` e
de custo 0, não 7:

| Fora da visão padrão | Lançamento | Observação |
|---|---|---|
| `deepseek-v4.1-flash-free` | 10/09/2026 | é o `librarian` de hoje; **não saiu** do catálogo |
| `glm-5.3-flash-free` | 26/08/2026 | nunca medido |
| `nemotron-3.5-lightning-free` | 11/08/2026 | foi o que derrubou o `explorer` em 09/10; fica de fora |
| `nemotron-3-ultra-free` | 04/06/2026 | nunca medido |

Consequência prática: a seção "Saídas do catálogo em 16/10/2026" acima registra `big-pickle` como
saído, e fica desatualizada no mesmo dia — ele voltou. **Inventário de catálogo free tem que ser
feito com `all: true`**, senão a decisão passa a "corrigir" ids que existem e continuam funcionando.

**Medições de 16/10/2026 (segunda bateria, 5 execuções, uma por papel):**

| Modelo | Papel | Resultado conferido |
|---|---|---|
| `beam-free` (05/10, estreante) | `explorer` | 7/7 — `lib/auth/auth.js:324` e as 6 aplicações, incluindo `adminCrudHandler.js:331` |
| `beam-free` | `librarian` | 8/8 — citaram a doc local e declararam "a doc não documenta" onde a doc cala (Cache-Control em Route Handlers do App Router) |
| `beam-free` | `designer` | 4/4 — `--color-text-tertiary` proibido para texto informativo (`MASTER.md:49-51`), que é exatamente o erro que reprovou o `nemotron` neste papel; zero token alucinado |
| `big-pickle` | `oracle` | Contestou a premissa: o `maxFileSize` do formidable (`upload-image.js:59`) aborta o parse e o cliente recebe **500** (`:127-129`), não 400; a branch `:83-86` é inalcançável; e o mock que fabricou a confiança está em `tests/integration/api/upload-image.test.js:148,168` |
| `space-bunny-free` | `fixer` | 5/7 → 6/7 com correção mínima; **recusou chutar** um par de testes contraditórios e não editou o arquivo de teste |

`beam-free` passou nos três papéis em que foi medido e é a primeira alternativa **fora** da
distribuição atual para `librarian`, `explorer` e `designer`. Não entrou: o mantenedor manteve as
seis escolhas já medidas. `big-pickle` passou hoje no papel de `oracle` e foi **melhor que o
`nemotron-3.5-super-vl-free`** no mesmo teste, ao descer até o código do `formidable` instalado.

**Reserva restaurada, ressalva mantida.** O orchestrator volta a
`["opencode/space-bunny-free", "opencode/big-pickle"]` — a decisão de 15/10, agora que o
`big-pickle` está de volta ao catálogo. Ela continua sendo mitigação e não garantia: a cadeia só
aciona no hook `v2.session.retry`, e o erro de autenticação do free tier não casa com nenhum padrão
de failover. E `big-pickle` **já demonstrou volatilidade** — saiu e voltou no mesmo dia. Conferir
`opencode models` antes de confiar na reserva; id fora do catálogo falha em silêncio.

**Limite imposto pela contagem.** Com seis primários distintos sobram **cinco** modelos free. Não
existe reserva distinta para os seis agentes: ou um fica sem, ou a reserva é compartilhada por dois
(e aí a queda dela derruba dois). O mantenedor escolheu **reserva só no orchestrator** — o único
agente cujo modelo afeta a sessão inteira — e os outros cinco sem reserva, preservando o isolamento
máximo que, nesta decisão, substitui a cadeia.

### 18/10/2026: o `designer` parou de funcionar — `muse-spark` saiu do catálogo

O gatilho (a) da seção "Revisão" disparou de novo, e desta vez **em silêncio para quem não
testou**: `muse-spark-1.3-contributor-free` (lançado em 02/09/2026) deixou o catálogo do Zen,
e só restou o `muse-spark-1.3` **pago**, a 1,25/4,25 por Mtok.

O `designer` estava apontando para o id que saiu. **Não foi hypothetical**: o host rejeita o
spawn na hora, com `Model "opencode/muse-spark-1.3-contributor-free" is not available`. O agente
ficou indisponível por completo — silenciosamente, do ponto de vista de quem só lê a config,
porque o preset continua válido para o schema e o `opencode debug config` passa.

A contagem de modelos free caiu de 11 para **10**.

**Substituto: `beam-free`, sem bateria nova.** Ele já tinha medição *deste mesmo papel*, em
16/10/2026: 4/4, e — o ponto decisivo — apontou `--color-text-tertiary` como proibido para
texto informativo (`MASTER.md:49-51`), que é exatamente o teste que reprovou o
`nemotron-3.5-super-vl-free` neste papel. Regerar a bateria só consumiria cota para reconfirmar o
mesmo id, que não mudou. Revalidado no dia, contra o catálogo atual: as três citações
(`MASTER.md:49-51`, `variables.css:93`, `variables.css:94`) conferem.

O `beam-free` não era primário de ninguém, então a troca não gerou repetição.

### 18/10/2026: `deepseek-v4.1-flash-free` segue órfão, e o papel que ele sabia fazer mudou

O slim 3.0.5 fundiu o `librarian` no `explorer` (mudança upstream, não do projeto). Com isso o
`deepseek-v4.1-flash-free` ficou sem dono: está **ativo e gratuito**, com variantes
`low`/`high`/`max`, e ninguém o usa.

**Não foi promovido por analogia, e essa é a parte que importa.** O `deepseek` foi medido no
papel de *librarian* (doc externa); o `longcat` foi medido no papel de *explorer antigo* (só
varredura de repositório, 10/10). O `explorer` de hoje é a **união dos dois** — herdou
`context7` e `gh_grep`. Pela regra desta mesma decisão, **medição vale por papel, e o papel
mudou**: nenhum dos dois candidatos foi medido na união. Trocar por argumento de histórico seria
repetir o erro que a seção "Saídas do catálogo" já registrou — apontar para o id disponível em
vez de medir o substituto.

## 19/10/2026: a bateria do papel novo rodou — `longcat` fica, e o órfão vira decisão

Fecha a pendência que a seção "18/10/2026: `deepseek-v4.1-flash-free` segue órfão"
deixou em aberto. Dois passes, **a mesma tarefa**, sequenciais, um por modelo — e
toda citação foi conferida em `arquivo:linha` pelo orquestrador, não pelo modelo.

**A tarefa é o papel novo inteiro, numa só:** (A) todos os pontos em que `withAuth`
é aplicado, em `arquivo:linha` — gabarito de 7 pontos: a definição mais 6
aplicações em produção; (B) **somente por `context7`/`gh_grep`**, como o Next.js 16
define o `Cache-Control` de um Route Handler do App Router e qual o papel do
`revalidate`, com a exigência de declarar explicitamente o que **não** está
documentado, sem preencher a lacuna de memória.

**Dois bloqueios da sessão anterior foram resolvidos antes de medir.** (a) Não havia
MCP nenhum — falso: `opencode.list_mcp_resources` devolve `[]` porque esses
servidores expõem **feramentas**, não **recursos**; `gh_grep` respondeu de verdade e
os dois passes usaram `context7` e `gh_grep`. (b) O inventário com
`opencode models --all` não roda mais no v2.0.32 (`Unrecognized flag: --all`); sem
a flag, `opencode models` lista **10** modelos free — o mesmo número do preset, com
`big-pickle` de volta e `muse-spark-1.3-contributor-free` fora, como esperado.

| | `longcat-2.5-preview-free` | `deepseek-v4.1-flash-free` |
|---|---|---|
| Parte A — os 7 pontos pedidos | **7/7** | **7/7** |
| Parte A — todas as aplicações em produção | **16/16** (incluiu `pages/api/ip-diagnostico.js:186`) | 15/16 (omitiu `pages/api/ip-diagnostico.js:186`) |
| Parte B — `revalidate` documentado, com trecho | ✓ | ✓ |
| Parte B — `Cache-Control` ausente do doc do App Router | ✓ | ✓ |
| Erros verificáveis | **0** | **0** |

A conclusão da Parte B foi conferida contra os docs do **16.4.2** instalados em
`node_modules/next/dist/docs/`: `revalidate` está em `01-app/03-api-reference/03-file-conventions/route.md:270-284`,
e `Cache-Control` tem **zero** ocorrência no doc de Route Handler do App Router — a
única receita oficial é do Pages Router (`next-config-js/headers.md:424`). Ambos os
modelos chegaram nisso, pelos dois caminhos.

**Veredito: empate no que foi pedido, e o incumbent mais completo.** A regra desta
decisão é "o modelo com menos erros verificáveis na tarefa que ele vai executar de
fato", e ninguém cometeu erro verificável. O critério de desempate que existe —
cobertura — favorece o `longcat`, que mapeou as 16 aplicações em produção contra 15.
**Não há evidência para trocar o `explorer`, e nenhuma troca foi feita.**

O `deepseek-v4.1-flash-free` deixa de ser órfão por acidente (slim 3.0.5) e passa a
ser **órfão por decisão medida**: ativo, gratuito, sem dono, e com a troca já
avaliada no papel certo. Reexaminar exige uma tarefa onde elevença — não a mesma,
de novo.

**Ressalva de versionamento:** os dois passes resolveram o `context7` para
`/vercel/next.js/v16.2.9`, enquanto o projeto roda **16.4.2** — o Context7 não tem a
versão exata indexada. Não é diferencial entre os dois, e as afirmações foram
conferidas na 16.4.2 antes de serem aceitas.

**O `orchestrator-bench` foi reescrito em 19/10/2026 e continua sem execução
comparativa.** O original vivia em `/tmp/opencode/bench-orch/` e morreu com a limpeza do
`/tmp`; ele exigia `OPENCODE_API_KEY` porque chamava a API do Zen de fora — caminho que o
free tier recusa (*"can only be used from within OpenCode"*). A versão nova está em
`scripts/bench/orchestrator/` e **não precisa de chave**: roda `opencode run --model ...
--format json`, que abre uma sessão real pelo host, com a credencial já guardada.

Isso é mais fiel, não menos: a medição por proxy era justamente a fraqueza apontada no
começo deste ADR, e uma sessão de verdade é o papel que o orchestrator exerce. O `--model`
troca só o agente primário, então `explorer`, `oracle`, `designer` e `fixer` seguem com os
modelos do preset e a variável fica isolada.

**Comparabilidade perdida, e registrada:** o bench novo **não é** o bench de 16/10/2026.
Não é a mesma implementação nem a mesma série, e qualquer número novo entra como medição
nova — não como continuação.

## 19/10/2026: o `orchestrator-bench` rodou — `space-bunny-free` se sustenta

A evidência que faltava desde 15/10/2026 foi medida. **Veredito: o primário atual se
sustenta, e nenhuma troca de primário é justificada.** A pergunta que este ADR mantinha
aberta — trocar `space-bunny-free` por um modelo medido — teve resposta, e a resposta foi
não trocar.

**A medição.** Seis execuções (3 por modelo), cada uma em dois turnos da **mesma sessão**,
com a tarefa de `scripts/bench/orchestrator/tarefa.md`: auditar a autenticação de
`pages/api/` com gabarito conferido em `arquivo:linha`. O `--model` troca só o agente
primário, então `explorer`, `oracle`, `designer` e `fixer` ficam nos modelos do preset e a
variável fica isolada. Todo o gabarito foi conferido **fora do modelo**, como nas baterias
anteriores.

**O desenho precisou de um segundo turno, e isso é o achado de método.** A tool `subagent`
ignora `background`: sempre devolve *"working in the background… you will be notified"*, e o
`opencode run` encerra ali. **Nenhuma das 6 execuções de turno único entregou resposta
final** — todas terminaram no aviso de que a delegação tinha sido disparada. Em turno
único o bench mede o *dispatcher*, não o orchestrator. O segundo turno continua a sessão,
com o resultado do subagente já disponível, e é o que produz a resposta final. **Sem ele a
série não teria medido nada** — e isso é defeito do desenho, não dos modelos.

**Camada A (automática).** 6/6 delegaram exatamente uma vez, todas para o `explorer`;
0/12 contaminações; **zero citações de arquivo/linha inválidas** nas 6 respostas finais, e
nenhum nome de arquivo alucinado. O único defeito de forma: `big-pickle` teve 5 citações
em caminho abreviado (`adminCrudHandler.js` em vez de
`lib/api/adminCrudHandler.js`), `space-bunny-free` 0.

**Camada B (acerto).** Os dois modelos acertaram 32 arquivos e nomearam o arquivo que não
é rota em 3/3, e os dois acharam os dois pontos de proteção externa. Divergiram no
detalhe:

| Item | `space-bunny-free` | `big-pickle` |
|---|---|---|
| 32 arquivos / nomeia o não-rota | 3/3 | 3/3 |
| 31 rotas (o `helper/pagination.js` não é rota) | 1/3 | 2/3 |
| `405` impede escrita anônima nas rotas de leitura | 1/3 | 0/3 |
| proteção externa em `next.config.js` (CSP do `/uploads`) | 3/3 | 3/3 |
| proteção externa em `proxy.js` (rate limit do login) | 2/3 | 2/3 |
| ponto de **aplicação** (`adminCrudHandler.js:331`, não o import) | 3/3 | 3/3 |

**Erro verificável: empate, e é o mesmo em ambos.** Cada modelo cometeu **um**, na mesma
fronteira: negar que existe proteção fora da rota depois de procurar o nome antigo. Duas
execuções afirmaram com segurança que não há `middleware.js`/`middleware.ts` — e `proxy.js`
existe e está ativo. `big-pickle-2` escreveu *"Não há proteção de outra natureza envolvida:
sem middleware global"*; `space-bunny-free-3` escreveu *"Não existe camada externa"* depois
de listar onde havia procurado. O critério desta decisão é "o modelo com menos erros
verificáveis", e com um para cada lado **não há base para trocar**.

**Camada C (orquestração) — o que realmente separou.** `big-pickle-3` recebeu do `@oracle`
a afirmação de que `proxy.js` era **código morto** por não se chamar `middleware.js`, e
**verificou contra a doc local do Next antes de aceitar**: em
`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` está escrito *"Starting
with Next.js 16, Middleware is now called Proxy"*. Rejeitou o `oracle`, manteve o `explorer`
e registrou o conflito na resposta. Conferido: a correção dele está certa e o `oracle`
errou — `proxy.js` é a convenção de middleware do Next 16. É exatamente o comportamento que
este ADR busca: contestação em vez de aceitação de contexto. `big-pickle-1` reconciliou
arquivo a arquivo, corrigiu citações contra o código, declarou não ter editado nada e
apontou uma anomalia real (PUT de `settings.js` sem checagem de role).
`space-bunny-free-3` usou `NÃO DETERMINADO` exatamente onde a evidência não sustenta
afirmar.

**Ressalva de confundidor, registrada:** `big-pickle` consultou o `ai-memory` antes de
delegar em 2 das 3 execuções e encontrou ali o registro do RBAC de `adminCrudHandler.js`. Em
produção isso é legítimo e útil; no bench encurta o trabalho de quem já tem a resposta
documentada em outra fonte. Comparar esse modelo com um que não consultou não isola o modelo.

**Conclusão.** `space-bunny-free` **se sustenta** como primário, agora com medição no papel
real em vez de por proxy — que era exatamente a ressalva que mantinha a troca em suspenso
desde 15/10. `big-pickle` volta ao que sempre foi aqui: **reserva**, que é o que a contagem
do inventário permite.

O resultado vale tanto pelo que mediu quanto pelo que descobriu de caminho: **o gabarito
do bench estava errado** — perguntava por "alguma" proteção externa e respondia só pelo
`next.config.js`, esquecendo o `proxy.js`. Erro meu, pego na conferência fora do modelo;
corrigido e datado no próprio gabarito.

**O que continua sem medição:** a diferença entre uma sessão de uma tarefa e um dia de
trabalho. Este bench fecha a lacuna do *papel*; não fecha a da *duração*.

## 19/10/2026 (mais tarde): `space-bunny-free` saiu do catálogo — e a reserva NÃO assumiu

**O que aconteceu.** `space-bunny-free` deixou de existir no catálogo do Zen. Três
provas independentes: `opencode models` não o lista mais; a busca por "space-bunny" na
API de modelos volta zero; e o spawn responde `provider.no-route: "Model
unavailable: opencode/space-bunny-free"`. Era o **primário** da cadeia do orchestrator.

**O achado que muda a leitura da cadeia.** A sessão **não** caiu na reserva
(`big-pickle`): caiu no **default do provider** (`minimax-m3.1-flash-free`). A
explicação está no log do slim (`oh-my-opencode-slim.*.log`), no hook
`v2.session.retry`:

```
[foreground-fallback] v2 retry hook observed {"agent":"orchestrator","from":"open…ee","failover":false,"steering":true}
```

`failover: false`. A cadeia só age quando `isFailoverError(error)` é verdadeiro, e o
erro de id fora do catálogo é `provider.no-route` — "Model unavailable" — que **não**
casa com nenhum padrão de failover (rate limit, 401/403, 502/503/504, timeout). O
código do slim confirma: `FAILOVER_ERROR_TYPES` tem `provider.rate-limit`,
`provider.quota`, `provider.auth`, `provider.internal` — e `provider.no-route` não
está lá.

**Consequência para o desenho desta decisão.** A reserva da cadeia protege contra
*rate limit* e *5xx*, que são os erros frequentes. Ela **não** protege contra "o
primário saiu do catálogo" — nesse caso o mecanismo é outro: conferir `opencode
models` e trocar o id apontado. Isto vale para as duas entradas do AGENTS.md que
mandam conferir o inventário: não é preciosismo, é o que impede a sessão de trocar de
modelo sem ninguém decidir.

**A medição que redecidiu o primário.** O bench do orchestrator rodou de novo, com
memória limpa entre execuções (ver "o que a bateria precisou corrigir" abaixo): 3
execuções por modelo, 2 turnos por sessão, gabarito conferido fora do modelo, e a
pontuação do Camada B conferida item a item por `scripts/bench/orchestrator/pontuar.js`.

| Modelo | Itens do Camada B | Execuções com ≥1 erro | Onde erra |
|---|---|---|---|
| `minimax-m3.1-flash-free` | **21/24** | 3/3 | o `405` (0/3) |
| `big-pickle` | 19/24 | 3/3 | o `405` (0/3) + a contagem de rotas em 1 execução |
| `space-bunny-free` | 20/24 | 2/3 | o `405` em 2 execuções + a contagem de rotas em 1 |

O desempate é o critério desta decisão — **menos erros verificáveis** — e o minimax
vence por 2 itens. Os três modelos erram o mesmo item: **o `405`** (o `MASTER` do
gabarito exige distinguir "só o GET responde" de "a escrita responde 405"). O
space-bunny, que era o primário, era o único que acertava o `405` em 1 de 3 execuções
— e o modelo saiu do catálogo. A lacuna do `405` é comum aos três e não é o que
separa.

**Verificação de um detalhe que mudou de lado.** O `minimax-2` afirmou "32 rotas
registradas pelo Next (`.next/routes-manifest.json`)" e deu como achado central que
`helper/pagination.js` é uma rota registrada que só devolve 500. Conferi no manifest:
ele registra **31** rotas em `/api/` — 30 arquivos com handler, mais o
`helper/pagination` (que não tem `export default`) — e o `uploads/[...path].js` é
catch-all, fora de `staticRoutes`. Ou seja: o gabarito está **certo** (32 arquivos,
31 com handler) e o modelo errou a contagem. O detalhe do `500` é real, mas a
contagem que ele.inventoryou estava errada, e é isso que conta.

**Decisão.** `minimax-m3.1-flash-free` vira o **primário** do orchestrator;
`big-pickle` segue como **reserva**, agora com o alcance declarado: cobre rate limit e
5xx, **não** cobre a saída do primário do catálogo.

### O que a bateria precisou corrigir — e por que isso é parte do resultado

Três defeitos de método apareceram nesta rodada, todos medidos, todos corrigidos. Eles
são registrados porque o próximo bench de qualquer papel vai esbarrar neles:

1. **A memória do projeto é uma via de contaminação do gabarito.** O modelo sob teste
   grava a RESPOSTA da tarefa na memória do projeto (`notes/auditoria-auth-pages-api-
   2026-10-19.md`) e a execução seguinte a lê de volta — o mesmo que ler o gabarito,
   por um caminho que o detector de `scripts/bench/` não via. O `rodar.js` agora apaga
   a página depois de cada execução, e o `conferir.js` marca a leitura dessa página
   como contaminação. Sem isso, a série mede quem consulta a memória, não quem
   orquestra.
2. **Falso positivo de contaminação por `ls`.** O detector tratava qualquer comando
   com `scripts/bench/` como leitura do gabarito. Uma execução que roda `ls
   scripts/bench/` — para confirmar que o diretório existe, sem abrir nada — era
   marcada como contaminada e descartada. Agora só conta leitura de **arquivo**.
3. **Falso positivo de citação por caminho relativo.** `MASTER.md` e
   `Input.module.css` são escritos pelo modelo na forma relativa ao diretório que ele
   conhece; resolvidos por prefixo fixo, apontavam para o arquivo errado (o do próprio
   bench) e a citação certa era reprovada. Agora o candidato é resolvido por **sufixo**
   no repositório inteiro.

## 19/10/2026: baterias de **papel** para `designer` e `fixer`

O bench do orchestrator mede o papel do agente primário, que é único. Para os outros
papéis, o mecanismo é o inverso: o papel é o **agente** (`--agent designer`) e o modelo
é o que se troca:

```
opencode run --agent designer --model opencode/beam-free --format json --auto "<tarefa>"
```

O `--model` sobrepõe o modelo que o preset define para o agente, sem mudar prompt,
skills nem permissões. Harness novo em `scripts/bench/papeis/`, com tarefa e gabarito
próprios por papel — as tarefas do orchestrator (auditoria de `pages/api/`) não têm
nada a ver com conformidade de token nem com correção de código.

**`designer` — conformidade de foco e contraste** (1 execução por modelo). Gabarito
com três pontos, todos conferidos contra `design-system/MASTER.md` e
`pages/styles/variables.css`: o `:focus-visible` do `Button` usa **só** o
`box-shadow` do anel (proibido por `MASTER.md:149-150`); a proibição do
`--color-text-tertiary` para texto informativo (`MASTER.md:49-51`); e os **quatro**
usos do token no `Input` (`:39` placeholder, `:49` desabilitado, `:102` ícone
decorativo — permitidos; `:167` `.helperText`, que é mensagem de erro e **viola**).

| Modelo | Acertos | Citações | Nota |
|---|---|---|---|
| `beam-free` | 3/3 | válidas | o mais curto (2.910 chars) |
| `minimax-m3.1-flash-free` | 3/3 | válidas | o mais longo (9.168 chars) |
| `longcat-2.5-preview-free` | 3/3 | válidas | |
| `deepseek-v4.1-flash-free` | 3/3 | válidas | |

Os quatro acertaram os três pontos — o que **não** discrimina. O desempate foi custo e
histórico: o `beam-free` fica, por ser o único com **duas** medições neste papel
(16/10 e hoje) e o mais barato em tokens. Nenhum dos quatro alucinou contraste ou hex:
todos os ratios citados batem com o `MASTER.md`.

**`fixer` — vazamento de `error.message` em rota pública** (1 execução por modelo). O
veredito aqui **não** é a resposta do modelo: a correção de cada execução foi
**reaplicada** a partir do que ela gravou e a suíte foi rodada de verdade
(`scripts/bench/papeis/conferir-fixer.js`): o teste novo tem de **falhar** no código
original, **passar** no corrigido, e a suíte inteira tem de ficar verde.

| Modelo | Corrigiu produção | Teste novo falha no original | Passa no corrigido | Suíte verde | Editou teste existente | Nota |
|---|---|---|---|---|---|---|
| `mimo-v2.6-flash-free` | sim | sim | sim | sim | não | 1.359 testes verdes |
| `minimax-m3.1-flash-free` | sim | sim | sim | sim | não | provou o teste contra o código **antes** de corrigir (falhou 3×) |
| `longcat-2.5-preview-free` | sim | — | sim | sim | **SIM** | editou `status.test.js` em vez de criar arquivo novo |
| `beam-free` | sim | sim | sim | sim | não | **contaminado**: leu `gabarito-fixer.md` |

O `longcat` é o único que **violou a regra 1** da tarefa (não editar o arquivo de
teste existente para fazê-lo passar) — e a consequência é mensurável: o teste novo
dele não é separável, porque mora dentro do arquivo editado, então não há como
prová-lo contra o código original. O `beam-free` foi descartado por contaminação: ele
leu o gabarito (`grep -n ... scripts/bench/papeis/gabarito-fixer.md`), o que anula a
medição. Os dois que sobraram — `mimo` e `minimax` — empataram no critério (erro
verificável zero). Desempate: o `mimo` **já estava em produção** e tem a medição de
15/10 somada; o `minimax` provou o teste contra o código antigo, o que é um plus de
rigor, não um erro. Mantido o `mimo`.

**Um defeito de método que só a bateria de papel revelou.** A tarefa do `fixer` é
corrigir um defeito **real** do código. Na primeira rodada, o primeiro fixer corrigiu
`pages/api/status.js` e as execuções seguintes **herdaram o arquivo já corrigido**: o
bench deixou de medir o papel e passou a medir quem escreve teste para um arquivo
pronto. O `rodar.js` agora restaura o repositório entre execuções. A restauração é
`git checkout --` em arquivo rastreado e remoção em não rastreado — **nunca**
`git reset --hard`, que apagaria trabalho do usuário — e ela **preserva** o que é do
bench, que por definição não é rastreado. (Na primeira tentativa dessa restauração o
diretório do bench foi apagado, e foi reconstruído.)

## Alternativas consideradas

- **Manter o preset anterior, com as cadeias.** Descartado: preservava o acoplamento
  descrito no contexto, e a cadeia não cobre o erro de autenticação do free tier —
  o modo de falha mais provável. Há registro da avaliação em 09/10/2026 no comentário
  do próprio preset; a justificativa original para o `mimo` como reserva ("a opção
  reversível e sem custo") continua válida, mas não para a conclusão de que a
  cadeia bastava.
- **Um único modelo para todos os agentes.** Descartado: maximiza o acoplamento — uma
  queda única derrubaria a sessão inteira — e não aproveita que os papéis pedem
  capacidades diferentes. O `nemotron-3.5-super-vl-free`, medido no papel de designer,
  por exemplo, atendia 7/7 tokens existentes mas colocava data e tag em
  `--color-text-tertiary`, que o `design-system/MASTER.md` proíbe explicitamente para
  texto informativo.
- **Manter 100% local (preset `"local"`, `ollama/qwen3-coder:30b`).** Descartado por
  decisão do mantenedor em 15/10/2026: **o preset local não será usado no momento e não
  há previsão de quando será**; o caminho de trabalho é o preset `"zen"`. Isso é uma
  escolha de operação, não um veredito de qualidade — o `qwen3-coder:30b` **nunca chegou a
  ser medido**, porque o servidor Ollama estava desligado (sem processo na porta 11434)
  na única janela em que se tentou. O preset foi mantido no arquivo intacto, de propósito:
  se um dia for retomado, precisa de bateria de medição própria, não de herança desta
  decisão.
- **Modelo pago para o orchestrator.** Não avaliada. Fora de escopo: a decisão aqui é
  sobre a distribuição gratuita, e o custo é uma escolha do mantenedor que este ADR
  não presume.
- **Quando `step-5-preview-free` saiu do catálogo (16/10/2026), apontar o `oracle`
  para o próximo id da lista.** Descartado — foi o que a medida documental mostrou
  ser errado: os três candidatos apontados acharam o mesmo sintoma
  (`adminCrudHandler.js:118`, comportamento intencional) e nenhum achou a causa
  (`:53`, `requireAdmin = false` só em 2 de 15 rotas). Pegar o id seguinte teria
  escolhido um modelo que não encontraria a escalada de privilégio real.

## Consequências

### Positivas

- Nenhum modelo é compartilhado entre agentes: a queda de um afeta um agente só.
- Cada agente recebe o modelo que foi medido na tarefa que ele executa, não um
  modelo genérico escolhido por conveniência.
- O critério é reproduzível — a bateria de medição é reexecutável, e o porquê de cada
  modelo está no comentário do próprio preset.

### Negativas e riscos

- **A garantia de privacidade vale só para o orchestrator.** `space-bunny-free` tem
  `zero-retention` registrado (Cenário 3, pesquisa de 03/10/2026) — é por isso que ele é
  o primário dele. **`nemotron-3.5-super-vl-free`, que o `oracle` passou a usar, não tem
  essa propriedade verificada**: a bateria não a confirma, e ele é o único dos seis sem
  garantia registrada. Tratar como free tier comum. Em qualquer dos casos, prompts e
  código do projeto vão a servidores remotos (EUA) e podem ser usados para melhorar o
  modelo — o aviso permanece em `opencode.jsonc`.
- **O orchestrator ficou sem reserva em 16/10/2026 até a segunda medição do dia.** Registrado
  assim porque `big-pickle` tinha saído do catálogo; a reserva foi **restaurada** no mesmo dia,
  quando o modelo voltou (ver "Re-análise de 16/10/2026"). A ressalva do parágrafo anterior
  continua valendo: a cadeia não cobre o erro de autenticação do free tier.
- **`nemotron-3.5-super-vl-free` reprovou no papel de `designer`** (usava
  `--color-text-tertiary` para texto informativo, proibido pelo `design-system/MASTER.md`
  §2) e foi aprovado no de `oracle`. A medição vale **por papel**, não por modelo: um
  resultado não transfere para outro papel, e a mesma conclusão vale para os outros cinco.
- **`big-pickle` foi medido por proxy, não no papel real.** Não existe subagente
  `orchestrator`; ele foi exercitado no papel de orquestração através de outro
  agente. O veredito é mais fraco que o dos demais.
- **Cota Zen por IP/dia.** A bateria consumiu parte dela; execuções longas em paralelo
  podem esgotá-la.
- **Modelos free podem desaparecer sem aviso.** Não há substituto automático: se um
  dos seis sair do catálogo, o agente fica sem modelo até re-benchmarkar. **Já aconteceu:**
  `step-5-preview-free` e `big-pickle` saíram em menos de 24 h (16/10/2026).
- **A cadeia do orchestrator é uma mitigação estreita, e a medição de 19/10 delimitou
  o alcance.** Ela cobre rate limit, 401/403, 502/503/504 e timeout — os erros
  frequentes. Ela **não** cobre a saída do primário do catálogo: o `provider.no-route`
  ("Model unavailable") não é classificado como failover (`failover: false` no log do
  slim), e a sessão cai no default do provider em vez da reserva. O que protege contra
  esse modo de falha é conferir `opencode models` e trocar o id apontado — não a cadeia.
- **A reserva é do orchestrator porque o modelo dele afeta a sessão inteira.** Vale
  registrar que a reserva só é acionada em erro de *transporte*, e que ela é por
  definição um modelo que o orchestrator não usa como primário.
- **Todos os três modelos medidos erram o `405`** no Camada B do bench do
  orchestrator (o `space-bunny` errou em 2 de 3 execuções, o `big-pickle` e o
  `minimax` em 3 de 3). É lacuna comum, não é o que separa — mas o `space-bunny` era
  o único que acertava, e saiu do catálogo. O item segue no gabarito.
- **O benchmark não é reprodutível ao longo do tempo**: modelos do catálogo Zen são
  atualizados, e o mesmo id pode passar a responder diferente.

## Revisão

Reavaliar quando: (a) algum dos seis sair do catálogo ou for marcado `deprecated`;
(b) a cota do Zen mudar de ordem de grandeza; (c) o mantenedor decidir investir em
modelo pago, o que muda a premissa de tudo; (d) o mantenedor **reconsiderar a decisão
de não usar o preset `"local"`** — hoje declarada sem previsão de retomada, mas que
exigiria subir o Ollama e rodar bateria própria. Qualquer uma delas exige nova bateria
de medição — não basta trocar o id.

O gatilho (a) já disparou: dois dos seis saíram em 16/10/2026. A decisão de medição
substituto antes de apontar para o catálogo — em vez de pegar o id seguinte — é a que
se pagou.

**Pendências conhecidas deste ADR:**

- **Orchestrator sem reserva — RESOLVIDO em 16/10/2026.** `big-pickle` voltou ao catálogo e a
  reserva foi restaurada (ver "Re-análise de 16/10/2026").
- **Orchestrator-bench — RESOLVIDO em 19/10/2026.** Era a evidência que faltava para decidir
  se `space-bunny-free` se sustenta como primário. Rodou (ver "19/10/2026" no fim do texto):
  **`space-bunny-free` se sustenta**, com um erro verificável por modelo no papel e empate, e
  nenhuma troca é justificada. O bench agora vive em `scripts/bench/orchestrator/` — o
  script antigo, em `/tmp/opencode/bench-orch/`, se foi com a limpeza do `/tmp` e exigia
  `OPENCODE_API_KEY`.
- **Primário do orchestrator — RESOLVIDO em 19/10/2026 (mais tarde).** `space-bunny-free`
  saiu do catálogo e a reserva **não** assumiu: a sessão caiu no default do provider, porque
  o erro `provider.no-route` não é classificado como failover (`failover: false` no log do
  slim). O primário passou a `minimax-m3.1-flash-free`, medido no mesmo papel (21/24 itens
  do Camada B, 0 erros verificáveis). A reserva (`big-pickle`) segue declarada, com o
  alcance delimitado: cobre rate limit e 5xx, **não** cobre a saída do primário do catálogo.
- **Papéis com só uma medição viva — PARCIALMENTE RESOLVIDO em 19/10/2026.** O `designer`
  tinha uma única medição viva (`beam-free`, desde 18/10) e o `fixer` tinha duas
  (`space-bunny-free` e `mimo`), das quais uma morreu. Rodaram baterias de papel novas
  (`scripts/bench/papeis/`): o `designer` tem **quatro** modelos medidos no papel e o
  `fixer` tem **três** (o quarto foi descartado por contaminação). A "medição vale por
  papel" continua valendo para quem quiser promover um quinto.
- **Privacidade do `oracle` não verificada.** `nemotron-3.5-super-vl-free` é hoje o único
  dos cinco sem garantia de retenção registrada. Se isso for requisito, verificar antes do
  próximo uso com código sensível.
- **Ruído de formato do `oracle`.** Ele não complyou o formato pedido numa das execuções.
  Se isso aparecer em revisão real, o critério de troca precisa considerar acabamento, não só
  capacidade de achado.