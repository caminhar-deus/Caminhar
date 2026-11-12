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

## 22/10/2026: primeira observação de campo (dias 20–22) — durabilidade não foi falsificada

A ferida que a seção de 19/10 deixou em aberto ("sessão de uma tarefa vs um dia de
trabalho") recebeu o primeiro dado, e ele veio de graça: os dias 20–22/10/2026 foram
trabalho real do mantenedor conduzido pelo orchestrator, e a memória do projeto guardou o
percurso. Isto é **observação de campo**, não bateria — sem gabarito preparado (a Camada B
não é aplicável) e sem comparação (sem gabarito, e no campo quem roda é o primário em
função — o `minimax-m3.1-flash-free`, no cargo desde a saída do `space-bunny-free` em
19/10; `big-pickle` só entra como fallback). O campo mede exatamente o que o bench não
via: o comportamento do papel ao longo de dias e de sessões encadeadas.

**O que os três dias produziram** (commits conferidos no log do repositório; a memória
não prende cada commit à sessão que o produziu — as sessões se sobrepõem no tempo, e os
commits só ficam amarrados onde a página de origem os lista):

- **20/10** — harmonização dos dois documentos de arquitetura e do `AGENTS.md` (sessão
  com 21 prompts de revisão de documentação, atravessa 20→21/10).
- **21/10** — o dia mais pesado, cinco commits: ADR-0013, cron de carga com k6, design e
  arquitetura (`5f7ec24`, `5f6492a`, `8e460f9`, `b7950f1`), e a **passa de segurança das
  rotas de API** — 9 defeitos corrigidos na ordem aprovada pelo dono (A1 → B1+B2 →
  A2…A6 → C1), com o `docs/adr/0017`-checagem-de-permissao, testes de negação com mutação
  verificada, suite e lint verdes (194 suites / 1413 testes), nos commits `087d934` e
  `c6cef12` — estes dois listados explicitamente na página da decisão.
- **22/10** — avaliação dos ciclos de cron/k6 pelos links de CI (`699e112`, "AI-MEMORY
  and k6 Load Test").

**Sinal principal, de durabilidade.** As sessões atravessaram dias — a das baterias de
papel capturou de 19/10 13:28 até 22/10, a de cron/k6 de 18/10 até 22/10 — e a continuidade
foi reconstruída por handoff entre sessões ("foram feitos diversos outros ajustes em uma
outra sessão" foi reconciliado sem perder o fio). No dia mais pesado (21/10), a saída foi
trabalho que passou em teste e em lint: nenhuma evidência de degradação de fim de dia.

**Erro tipo-Camada-B pego no campo (com ressalva).** Uma auditoria de segurança por modelo
classificou o S8 como "escalada latente"; estava errado — o `docs/adr/0010` rejeita
explicitamente essa leitura, o código documenta o bypass do cargo `admin` como "POR
DESENHO" (`adminCrudHandler.js:186-190`) e teste deny/allow cobre o comportamento. O erro
sobreviveu à classificação inicial e foi pego na rodada de correção; virou gotcha com regra
operacional ("ler `docs/adr/` como fonte primária antes de classificar qualquer coisa em
`pages/api/admin/`"). É o tipo de erro verificável que o campo consegue medir — com a
ressalva de que a recuperação foi do dono, e o relatório não permite atribuir o erro a um
modelo específico do preset.

**Sinal de manutenção do instrumento.** A passa de segurança invalidou o ground truth do
bench, e o orchestrator recalibrou os **três** arquivos na mesma rodada — `gabarito.md`,
`pontuar.js` e `rubrica.md` (agora: 31 arquivos, todos rota; `adminCrudHandler.js:305`) —
e registrou a regra: toda mudança de superfície em `pages/api/` obriga a recalibração dos
três na mesma rodada. Conferido no disco. As seções datadas de 19/10 deste ADR descrevem o
gabarito **anterior** (32 arquivos, o helper não-rota, `:331`); elas continuam valendo como
histórico do dia delas.

**Limitações honestas.** Janela única, sem controle: não falsifica degradação sutil, e a
memória não captura cota, então requisições por dia não são mensuráveis por esse caminho. O
que a janela conclui é negativo no bom sentido: **nada no campo contradiz a decisão do
primário**. Gatilho para escalar ao bench de fila (duas sessões comparativas, fila de
tarefas encadeadas igual para os dois modelos): padrão suspeito no campo — degradação
visível, erro repetido junto ao fim de um dia longo, o primário caindo no meio do trabalho.
Até lá, não gastar cota com isso.

## 22/10/2026 (mais tarde): bateria do papel do `explorer` — o `deepseek` assume com 0 erros, o `flint` estreia sem operância

**Motivo da rodada.** O inventário reconferido neste dia (9 modelos free, `all:true`) mostrou
duas saídas e uma entrada: saíram `longcat-2.5-preview-free` — o modelo declarado do
`explorer` desde a fusão do librarian (3.0.5) — e `minimax-m3.1-flash-free` (primário morto do
`orchestrator`, já remaped para `big-pickle` + reserva `glm-5.3-flash-free`); entrou
`flint-40b-free` (21/10, nunca medido). Um id fora do catálogo não spawna: o `explorer`
estava parado.

**Recalibração obrigatória antes de medir.** O gabarito do papel novo de 19/10 estava
obsoleto — a passa de segurança de 21/10 mudou a superfície de `pages/api/`. Ground truth
reconstruído FORA do modelo, conferindo cada ponto no código: **6 pontos** (1 definição +
5 aplicações) — `lib/auth/auth.js:324`, `lib/api/adminCrudHandler.js:305`,
`pages/api/upload-image.js:170`, `pages/api/settings.js:129` e `:163`,
`pages/api/cleanup-test-data.js:26` — com armadilhas preservadas (imports, comentários
incluindo `status.js:32`, e a rota `status.js` que usa `verifyToken` por construção). Parte
B conferida na doc instalada (Next 16.4.2): `revalidate` como route segment config em
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:270-284`,
e **zero** ocorrências de `Cache-Control` no mesmo doc — receita manual só no `headers.md`
(Pages Router, `:395-399`, `:424`, `:431`).

**Candidatos e aparelho.** 2 candidatos (o instrumento novo do papel: `tarefa-explorer.md`,
`gabarito-explorer.md`; `rodar.js` restaura o repo entre execuções; contaminação também
detectada por tools `memory_*`), 1 execução cada, sequencial.

| Modelo | Erros verificáveis | Parte A | Parte B | Nota |
|---|---|---|---|---|
| `deepseek-v4.1-flash-free` | **0** | 6/6 pontos; armadilhas iludidas | citações conferidas no source | 98s; sem edição; sem memória |
| `flint-40b-free` | — (sem operância) | não entregou | não entregou | sessão caiu em 287s |

**`deepseek-v4.1-flash-free` — vencedor.** Parte A com as 7 citações locais batendo linha a
linha (inclui os points auxiliares: dispatch em `settings.js:26`/`:28`, wrapper de `requestId`
em `adminCrudHandler.js:313-326`) e mais dois extras não pedidos e verdadeiros: apontou o
`withAuth({ roles })` de `lib/api/middleware.js` como extinto (não há hit no repo) e citou o
padrão de `status.js` por dentro. Parte B usou **só** `context7` (docs pinadas v16.2.9) e
`gh_grep` (canary), conforme a tarefa; o validador local marcou 5 citações como inválidas e a
conferência fora do modelo mostrou que **todas são reais**: os caminhos apontam para o repo
externo `vercel/next.js` (a tarefa aceita URL da doc online) — `app-route.ts:461` e
`self-hosting.mdx:99` conferem linha a linha na canary, e os trechos de `cdn-caching.mdx`,
`cache-control.ts` e `15-route-handlers.mdx` existem com o texto citado. Honestidade
documental no padrão do papel: 6 lacunas declaradas `NÃO DETERMINADO` e ressalva explícita de
versão (docs v16.2.9 vs canary diferente). **Deixa de ser órfão** (a decisão de 19/10 o
mantinha sem dono por decisão medida — ela continua válida como histórico): assume o
`explorer`.

**`flint-40b-free` — primeira medição, sem operância.** 12 chamadas de tool (grep×4,
glob×2, read×6), 4 frases de plano e nenhuma parte entregue: a sessão morreu com
`provider.internal` (503, "Endpoint is unavailable") antes da resposta final. Não houve
contaminação (nenhum acesso a `scripts/bench/`, nenhum `memory_*`) nem edição de arquivo —
o que se mede é a entrega: zero pontos respondidos. É o estreante do dia 21/10; reavaliar
em rodada futura quando voltar a ser candidato. **Não confundir com o gatilho de fila** da
observação de campo: um crash isolado de um candidado em bench não é "erro repetido ao fim
de dia longo" nem "primário caindo no meio do trabalho" — não dispara o bench de fila.

**Cadeia do `explorer` depois da rodada:** `deepseek-v4.1-flash-free` único. Não há reserva
declarada para o papel; a reserva operacional continua sendo conferir `opencode models`
quando um agente não spawnar. Não medidos neste papel: `flint-40b-free` (sem operância
hoje), `glm-5.3-flash-free` e `nemotron-3-ultra-free`. RETENÇÃO: nenhum modelo novo do ciclo
(`flint-40b-free`, `nemotron-3-ultra-free`) tem zero-retention registrado no catálogo do
provider — tratar todo o free tier como sem garantia de retenção até conferir na fonte.

## 22/10/2026 (tarde): o `glm-5.3-flash-free` medido em TODOS os papéis — instrumento do `fixer` recalibrado com regressão plantada

A reserva do `orchestrator` nunca tinha sido medida no papel real, e a rodada da manhã
(seção "22/10 (mais tarde)") deixou três instrumentos desalinhados com o código do dia.
O mantenedor pediu a bateria completa: o glm medido nos **cinco** papéis, um por vez,
pontuado FORA do modelo pelo critério do ADR.

### Recalibração de instrumento (mesma rodada, como o hook exige)

- **`fixer` — regressão plantada.** O S1 (vazamento de `error.message` em
  `pages/api/status.js`) foi CORRIGIDO no HEAD em 21/10, o que deixou a tarefa de 19/10
  sem objeto: a primeira execução do glm (manhã) diagnosticou com honestidade que a
  correção já estava no disco e **não editou nada** — comportamento correto, medição sem
  objeto. A execução ficou registrada como `fixer-glm-5.3-flash-free-1-sem-objeto.ndjson`
  (não descartada, não pontuada). O instrumento novo: `scripts/bench/papeis/regressao-s1.js`
  devolve o disco ao estado do bug antes do spawn (`rodar.js`) e o conferidor
  (`conferir-fixer.js`) reaplica a mesma regressão antes de revalidar as edições —
  `pages/api/status.js` é rastreado, então a limpeza padrão desfaz. **Prova fora do
  modelo:** com a regressão aplicada, o teste existente
  `tests/integration/api/status.test.js:51-63` (`not.toContain('DB Offline')`) FALHA
  (1 failed / 7 passed); no HEAD, 8/8 verdes. Frágil por desenho: se o bloco de `catch`
  mudar, o helper falha alto em vez de plantar qualquer coisa.
- **`designer` — gabarito recalibrado.** O `design-system/MASTER.md` foi reescrito em
  21/10: a declaração exata do foco do botão está hoje em `MASTER.md:130` (antes `:104`),
  o anti-padrão "box-shadow como único indicador" em `:202-203` (antes `:149-150`),
  `outline: none` seco em `:201` (antes `:147-148`), a proibição do `#a3a3a3` em `:50-51`
  (antes `:49-51`), texto informativo em `:205-206`. Os quatro usos do token no `Input`
  (`:39/:49/:102/:167`) e a nota do `BaseCard.module.css:129` não mudaram.
- **`oracle` — instrumento novo.** Caso S8 real: um "achado" de escalada de privilégio
  cujo veredito correto é **não se sustentar** (tarefa + gabarito novos em
  `scripts/bench/papeis/tarefa-oracle.md` / `gabarito-oracle.md`).

### A rodada do glm (7 sessões de bench hoje; catálogo de 9 modelos free)

**Camada A (automática) — limpa nos 5 papéis:** 0 citação inválida, 0 contaminação no
`conferir.js`; duas exposições INCIDENTAIS declaradas de forma transparente (explorer e
fixer: o grep global vazou 2 linhas de preview de `scripts/bench/` sem leitura dirigida;
nenhum dos dois abriu ou procurou o diretório — mesma limitação que os candidatos de
19/10 tiveram, declarada e não invalidante).

- **`explorer` — PASSA (0 erros verificáveis).** Parte A: 6/6 pontos de `withAuth`
  (definição `lib/auth/auth.js:324` + 5 aplicações confirmadas uma a uma), armadilhas
  cobertas (imports, comentários, `status.js` com `verifyToken`, rota extinta), e
  verificação de que `app/` não existe. Parte B: declarou **zero** ocorrências de
  `Cache-Control` na página do Route Handler (conferido: 0 em `route.md`), apontou o
  `revalidate` como opção correta e marcou **NÃO DETERMINADO** o que os docs não
  documentam — com notas de versão (v16.2.9 vs canary). 35 tool calls.
- **`designer` — PASSA com ressalva.** P1 ✓ (`Button.module.css:21-24`, `outline: none`
  seco + halo como único indicador, correção com o par completo — e citou `MASTER.md:130`,
  a linha CERTA do MASTER de hoje, que o gabarito antigo ainda não via). P2 ✓ (proibido
  para informação, permitido para placeholder/decorativo, `:50-51`). P3 **parcial**:
  listou os quatro usos do `--color-text-tertiary` no `Input` — inclusive `helperText`
  `:167`, a violação — mas não atribuiu veredicto por uso. Dois off-by-one de linha
  (`:203-204` e `:206-207` vs `:202-203` e `:205-206`). Nenhum erro verificável de
  conteúdo; epílogo de fechamento confuso (nota de forma).
- **`fixer` (instrumento novo) — PASSA (3/3 verificações do conferidor).** Corrigiu
  `pages/api/status.js` (mensagem fixa pt-BR, `catch` sem binding, 200 preservado),
  criou `tests/integration/api/status.error-leak.test.js` com 3 casos; o teste novo
  FALHA no código original regredido, PASSA no corrigido, e a suíte inteira fica verde
  NA CÓPIA DO BENCH (1421 passed / 73 skipped = 1418 do repo + os 3 casos do teste
  novo; lint 0/0). NÃO editou teste existente (regra 1). Sob o
  instrumento novo, o glm é o único candidato com 3/3; as medições de 19/10 dos rivais
  partem do disco da época e NÃO são comparáveis sob o instrumento novo (as pontuações
  de 19/10 permanecem as oficiais da época).
- **`oracle` — PASSA (veredito correto, 0 erros verificáveis).** O "achado" de escalada
  **não se sustenta**: `role` é obrigatório no schema (`pages/api/admin/users.js:10-14`),
  validado contra `roles` (`:100-105`), o cargo `admin` é comum por DESENHO
  (`ADR-0010:15-17/:63-67/:90-92`), o bypass é intencional (`lib/api/permissions.js:55-58`)
  e a permissão é a unidade (`:60-63`); `requireAdmin = false` em
  `lib/api/adminCrudHandler.js:120` é consistente. Testes citados conferidos
  (`users.test.js:147/:169-179/:183-198/:200-213`) com ressalva honesta (o ator dos
  testes é admin). Divergências doc×código REAIS: o README não tem mais a tabela que o
  `ADR-0010:18-26` cita como referência; `docs/ARQUITETURA_SITE_PRIVADO.md:224`
  (exclusão do admin) está atrás do código. Citações conferidas fora do modelo
  (Camada A: nenhuma inválida).
- **`orchestrator` — Camada B: 7/8 (a melhor execução única da tabela do `pontuar.js`).
  Erro único: o item `proxy.js` não apareceu na resposta; os outros sete itens ok
  (31 arquivos, 31 rotas, ponto de aplicação, segurança no `next.config.js`, 405).
  Camada C: **NÃO ORQUESTROU** — nenhum tool `subagent` nas duas sessões; respondeu
  "na mão" com a auditoria inteira. Pela rubrica, sem delegação não houve condução:
  o glm mediu bem como ANALISTA, não como primário. Os rivais históricos
  (`minimax` 17/24, `space-bunny` 14/24 no instrumento antigo) não são comparáveis com
  o instrumento de 22/10 rodado no mesmo dia; a comparação válida está no instrumento de
  cada época.

### Decisão

Nenhuma troca de atribuição. `big-pickle` segue primário do `orchestrator` e o
`glm-5.3-flash-free` segue reserva — só que agora a reserva é **medida**: Camada B 7/8
no gabarito, Camada C sem orquestração (reserva cobre queda de modelo, não substitui a
condução; é o que a cadeia promete e o que ela cumpre). `mimo` segue `fixer` e
`nemotron-3.5-super-vl` segue `oracle` — o glm estreia como segundo candidato vivo em
ambos os papéis, com medição maior que zero. O preset registrou a medição nos blocos
do `orchestrator` (a reserva deixou de ser "nunca medida") e dos papéis onde o glm
também passou.

## Alternativas consideradas aqui (22/10/2026, tarde)

- **Trocar o `oracle`/`fixer` pelo glm, que acabou de passar.** Descartado: o critério do
  ADR é menos erros verificáveis E não repetir modelos entre agentes — trocar um primário
  medido por um que acabou de medir igualmente limpo não ganha nada e perde a redundância
  (o glm é a reserva do `orchestrator`; dar outro papel a ele consolida o mesmo id em
  duas cadeias).
- **Descartar a execução do glm no papel do `fixer` da manhã ("sem objeto").** Descartado:
  o ADR registra observação negativa como evidência — ela é o motivo direto da
  recalibração e previne a mesma leitura errada em rodada futura ("por que não editou?
  O instrumento estava rompelmente certo, o código é que estava corrigido").
- **Comparar rivais de 19/10 sob o instrumento novo.** Descartado: o "código original"
  de 19/10 é outro disco; reexecutar os candidatos antigos sob a regressão plantada mede
  o acoplamento entre as `oldString` que eles gravaram e o estado de hoje, não o modelo.



- **Aproveitar a saída do `longcat` para apontar o `explorer` direto no `flint-40b-free`
  (o estreante).** Descartado: contra a regra do próprio ADR — medição vale por papel, e
  medir vale mais do que nunca medir. A rodada de hoje mediu e ele não entregou.
- **Mandar o `oracle` na vaga interina e só depois bater candidatos.** Descartado: não
  há reserva de papel e o custo do bench é baixo (~3 min/execução no free tier); a
  cadeia de reserva do `orchestrator` não serve de jazz para outro papel (erros de
  failover são da cadeia do papél que os declarou).
- **Rerunner a bateria do `flint` com +1 repetição hoje.** Descartado: a execução caiu
  com 503 de provider e um rerun imediato mede mais o rate limit free-tier do que o
  papel; reavaliação fica para rodada futura, com cota própria.

## 03/11/2026: revisão de catálogo — uma saída, uma estreia, **nenhuma troca**

O mantenedor pediu a revisão dos modelos FREE disponíveis porque houve "pequenas
mudanças". O catálogo foi conferido no host **v2.2.5** com `opencode models` (sem
flag: a visão padrão já lista todas as versões de família desde o v2.0.32).

### Inventário (03/11/2026) — 9 modelos free

`beam-free`, `big-pickle`, `deepseek-v4.1-flash-free`, `flint-40b-free`,
`glm-5.3-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`,
`nemotron-3.5-super-vl-free`, **`pulse-alpha-free` (estreante)**.

Diferença exata contra o inventário de 22/10/2026:

- **saiu** `nemotron-3-ultra-free` (nunca teve dono; nenhuma atribuição afetada);
- **estreou** `pulse-alpha-free` (sem medição em nenhum papel).

### Os seis ids atribuídos continuam vivos

Conferido fora da config, com `opencode debug agents`: `orchestrator` resolve
`big-pickle`, `oracle` resolve `nemotron-3.5-super-vl-free`, `explorer` resolve
`deepseek-v4.1-flash-free`, `designer` resolve `beam-free`, `fixer` resolve
`mimo-v2.6-flash-free`; a reserva do `orchestrator`, `glm-5.3-flash-free`, aparece
no catálogo. Nenhum id atribuído saiu — o gatilho (a) da seção "Revisão" não
atingiu nenhum papel.

### Distribuição vigente (sem alteração)

| Agente | Ativo | Reserva |
|---|---|---|
| orchestrator | `opencode/big-pickle` | `opencode/glm-5.3-flash-free` |
| oracle | `opencode/nemotron-3.5-super-vl-free` | — |
| explorer | `opencode/deepseek-v4.1-flash-free` | — |
| designer | `opencode/beam-free` | — |
| fixer | `opencode/mimo-v2.6-flash-free` | — |

`big-pickle` segue sendo o único id do catálogo sem o sufixo `-free`; o custo zero
dele já foi confirmado (ver "Decisão"). A limitação da cadeia não mudou: ela cobre
rate limit, 401/403 e 5xx, **não** cobre "o primário saiu do catálogo"
(`provider.no-route`, `failover: false`). Contra isso, o mecanismo continua sendo
conferir `opencode models` — a revisão de hoje é justamente esse mecanismo.

### `pulse-alpha-free`: rodou limpo, mas **não pôde ser pontuado**

Uma execução no papel `designer` (`scripts/bench/papeis/rodar.js --agente
designer --modelo opencode/pulse-alpha-free`): 250 s, 9.189 caracteres de resposta,
**0 citação inválida e 0 contaminação** na Camada A do `conferir.js`.

A pontuação contra o gabarito, porém, é inválida: **o instrumento do papel está
desatualizado**. O `gabarito-designer.md` espera

- `Button.module.css:21-24` com `outline: none` + `box-shadow` sozinho — o código de
  hoje tem o par completo em `:21-25` (`outline: 2px solid var(--color-focus-primary)`
  + `outline-offset` + halo), conforme `MASTER.md:130`;
- `Input.module.css:49/:102/:167` — hoje os usos migraram para `:51`, `:104` e o
  `.helperText` (`:165-168`) usa `--color-text-secondary`, não o terciário;
- tokens em `variables.css:95/:110/:111` — hoje `:97`, `:112`, `:113` (e
  `--color-disabled-text` em `:115`).

O modelo respondeu "está conforme" e citou exatamente o estado atual do disco —
conferido linha a linha **fora do modelo**. Ou seja: a execução não mede o modelo
contra o gabarito, mede o gabarito contra o código. Antes de promover qualquer
candidato no papel `designer`, o gabarito precisa de recalibração (como foi feito
com o `fixer` em 22/10). Por isso `pulse-alpha` **não** recebeu papel: a regra do
ADR é medir por papel, e hoje não há instrumento válido para o único papel em que
ele rodou.

### Decisão

Nenhuma troca de atribuição e nenhum id novo promovido. O preset `zen` foi mantido;
só o bloco "INVENTÁRIO" do arquivo foi atualizado com a lista de 03/11 e com a
observação de que `pulse-alpha-free` é o único free sem medição. Config é comentário:
não exige restart do host.

### Alternativas descartadas nesta rodada

- **Apontar `pulse-alpha-free` para a reserva do `orchestrator` no lugar do `glm`.**
  Descartado: o glm tem medição no papel (Camada B 7/8) e o pulse-alpha não tem
  nenhuma; trocar evidência por entusiasmo com o estreante é o erro que a seção
  "Medir antes de pegar o próximo id da lista" já pagou uma vez.
- **Bater os quatro papéis restantes com o pulse-alpha hoje.** Descartado nesta
  rodada: o papel `designer` — o mais barato — acabou de expor instrumento
  desatualizado; rodar os outros antes de recalibrar produziria mais execuções
  inapontáveis e gastaria cota free-tier sem decisão possível no fim.
- **Remover `flint-40b-free` e `nemotron-3.5-lightning-free` do inventário do
  preset.** Descartado: continuam no catálogo. O primeiro segue candidato a uma
  segunda medição (a única caiu com 503 antes de entregar); o segundo continua
  excluído por histórico (derrubou o `explorer` em 09/10), não por ausência.

## 04/11/2026: bateria 9×5 fechada e redistribuição — `orchestrator`, `oracle` e `explorer` trocam

O mantenedor pediu os ajustes dos modelos FREE recomendados por agente, com a
condição explícita de que o `orchestrator` mantenha um modelo FREE como reserva.
A entrada da decisão foi a matriz 9×5 completa: **todos os 9 modelos free medidos
em todos os 5 papéis** (45 células com medição válida), rodada em 03–04/11/2026.

### Onde e como mediu

- **Todo o bench viveu numa cópia com baseline próprio e git próprio** (`/var/tmp/free-matrix`;
  histórico completo exportado de `opencode.db` em `.historicos/`). **O repositório real não foi
  alterado pela bateria** (conferido por mtime e `git status`).
- **A cota free derrubou 28 sessões** em 03/11 + 04/11 de manhã (`provider.free-limit`, 429). A
  janela reseta às **21:13 local (00:13 UTC)** e as re-medições correram depois do reset — em
  04/11, 10 pares de manhã e 5 pares à noite (21:24–21:52), **sem nenhum 429 novo**.
- **Todas as citações conferidas fora do modelo** (mesma regra das baterias anteriores), e a
  correção do papel `fixer` foi validada com **Jest real**: o teste novo falha no código
  original, passa no corrigido e a suíte inteira fica verde — 7/7 execuções (a única que violou
  regra de forma, `nemotron-lightning`, editou o teste existente em vez de criar teste novo).
- **Confundidores registrados**: (1) os modelos que morreram 2× por cota em janela larga foram
  `big-pickle`, `deepseek-v4.1-flash-free` e `mimo-v2.6-flash-free`; (2) três execução do papel
  `orchestrator` (`deepseek`, `mimo`, `pulse`) consultaram o `ai-memory` — decisões e gotchas
  reais do projeto, **nunca** a página-resposta da tarefa (o runner a apaga antes do spawn);
  comparação com modelo que não consultou não isola só o modelo; (3) subagentes herdados do
  preset também morreram por cota, e "degradar bem" virou sinal de qualidade; (4) falso
  positivos do instrumento (32 arquivos/32 rotas desde o ADR-0024; âncoras mudadas pela passe
  de segurança) foram recalibrados **só na cópia** — ver "Instrumentos" abaixo.

### Resultado por papel (o que decide a troca)

| Papel | Observação decidida |
|---|---|
| orchestrator | Camada B: `deepseek` **8/8**, `pulse` 8/8, `mimo` 7/8, `beam` 7/8, `flint`/`super-vl` 6/8, `lightning` 1/8; `big-pickle` H* (tarefa antiga); `glm` H (7/8 de 22/10). O `deepseek` foi o **único que delegou a revisão a @oracle e reconciliou** o retorno — comportamento de primário, não de analista. |
| explorer | 9/9 células com as 6/6 âncoras de `withAuth`. O que separa é a profundidade documental: `big-pickle`/`mimo`/`pulse`/`deepseek` trazem "o que a doc NÃO diz"; `beam`/`flint` o mínimo; `lightning` declara em prosa sem `arquivo:linha`. |
| oracle | 5 triagens completas do caso S8 (veredito certo + 3/3 âncoras): `beam`, `deepseek`, `flint`, `mimo`, `pulse`. O `flint` mapeou também o drift documental `users.js:161→206`. `lightning` 2/3; `super-vl`/`big-pickle` H*; `glm` H. |
| designer | 9/9 no conteúdo. Ressalva de forma para `lightning`/`super-vl`: sem citação `arquivo:linha`. |
| fixer | 7/7 com suíte Jest verde (verificação fora do modelo); 6 criaram teste novo. |

### Instrumentos (aplicados ao repo em 05/11/2026)

Os gabaritos e pontuadores foram recalibrados para a verdade do disco (32 arquivos/32 rotas
em `pages/api/` desde o ADR-0024; âncoras de linha exatas nos 4 gabaritos de papel) — durante
o bench, aplicados **somente na cópia**, com o diff em `/var/tmp/prop.patch`. O mantenedor
autorizou a aplicação no repo em 05/11/2026 (`git apply`, commit "bench: recalibrate
instruments to 32-route ground truth"), encerrando a pendência de reprodução: o repo agora
mede contra o MESMO ground truth da bateria de 03–04/11, e a numeração 31/31 do instrumento
de 22/10 deixou de ser válida.

Alcance exato do patch (185 linhas, 6 arquivos): `gabarito.md` + `pontuar.js` (contagem
31→32 em ambos) e as âncoras de linha dos 4 gabaritos de papel. **Fora do alcance**:
nenhum validador de citação foi alterado pelo patch — os `conferir.js` do `orchestrator`
e de `scripts/bench/papeis/` resolviam caminhos só pelas raízes do projeto, e as citações
à **doc externa do Next** (`node_modules/next/dist/docs/...`, `.mdx` do repo canônico)
continuavam marcadas "caminho não encontrado"; durante a bateria, compensadas conferindo
FORA do modelo (regra corrente). A correção **em código** do validador de papéis veio no
mesmo dia 05/11, depois da revisão do mantenedor — ver "Validador de citações dos papéis"
abaixo. Pendência estrutural registrada para a próxima rodada de bench: derivar a
contagem/âncoras do disco no runtime (em vez de hardcode) e fail-fast no `rodar.js`
conferindo as âncoras antes do spawn — a recalibração deixa de ser descoberta por gasto
de cota.

### Validador de citações dos papéis (corrigido em 05/11/2026)

Reprodução na cópia (`/var/tmp/free-matrix`, NDJSONs reais de 03–04/11) mostrou que as
reprovações de citação da Camada A eram, na maior parte, falso positivo do instrumento
— as mesmas classes já sanadas no `orchestrator/conferir.js`:

1. **Retomada da regra de 19/10 dentro do `papeis/`.** O "primeiro candidato achado"
   decidia, e a bateria repetiu o bug documentado no `orchestrator` (`dicas.js`):
   `roles.js:113` caiu no `tests/helpers/roles.js` (22 linhas) enquanto
   `pages/api/admin/roles.js` (133) tem a linha citada; `posts.js:152` caiu em
   `pages/api/posts.js` (85) com `pages/api/admin/posts.js` (171) e
   `lib/domain/posts.js` (181) no disco. Agora todos os candidatos entram e a citação
   é inválida **só quando nenhum deles tem a linha**.
2. **Reserva em `node_modules/next/dist`.** `route.md`, `headers.md`,
   `incremental-cache/index.js` são do Next instalado que os papéis citam de propósito
   (`AGENTS.md` manda ler o guia instalado). A colisão de 19/10 tinha punido a linha
   certa: `incremental-cache/index.js:73` era resolvida ao stub `tests/mocks/index.js`
   (13 linhas) em vez de `node_modules/next/dist/server/lib/incremental-cache/index.js`
   (555 linhas, linha 73 com o conteúdo exato citado). A reserva entra DEPOIS das
   raízes do projeto e nunca no mesmo índice — critério de `constroiIndice` mantido.
3. **Categorias de fonte, não de erro.** Citação **abreviada** ("...") resolve por
   padrão e é sinalizada (`node_modules/.../02-guides/cdn-caching.md → .../01-app/
   02-guides/cdn-caching.md`); citação **externa ao disco** (repo upstream
   `packages/next/...`, URLs `//github.com/...`, extensão `.mdx` — o dist só traz
   `.md` —, `.ts` com irmão `.js`/`.d.ts` no dist) é sinalizada, nunca reprovada.

Efeito verificado: de 8 execuções com citação reprovada para **2 sobrando** —
`gabarito-designer.md` no designer `beam` (deliberada: `scripts/bench/` fora do índice
por decisão de 19/10, e a linha citada 62 é vazia — o conteúdo citado está na 59;
comportamento do modelo, mantida a "exposição declarada" de 03/11) e
`docs/PROJECT_scripts.md:707` no explorer `super-vl` (documento com 308 linhas; o
modelo fabricou número). Nada mudou nas classes mecânicas de execução
(`citacoesPosArquivoEditado`, `criadasRemovidas`, fluxo `contaminada()`), nem no
`orchestrator/conferir.js`.

### Distribuição nova

| Agente | PRIMÁRIO (04/11/2026) | RESERVA |
|---|---|---|
| orchestrator | `opencode/deepseek-v4.1-flash-free` | `opencode/glm-5.3-flash-free` |
| oracle | `opencode/flint-40b-free` | — |
| explorer | `opencode/pulse-alpha-free` | — |
| designer | `opencode/beam-free` (mantém) | — |
| fixer | `opencode/mimo-v2.6-flash-free` (mantém) | — |

Nenhum id se repete entre os primários (cinco ids distintos; a reserva do `orchestrator`
não é primário de nenhum outro agente). O `small_model` da sessão (`opencode.jsonc`) segue
o `mimo-v2.6-flash-free`.

### Por que cada troca

- **`orchestrator`: `deepseek-v4.1-flash-free` entra, `big-pickle` sai; `glm-5.3-flash-free`
  segue reserva.** O `deepseek` é o único 8/8 da Camada B com a sessão inteira no papel:
  delegou a revisão a @oracle, reconciliou o retorno e escreveu a auditoria com `arquivo:linha`
  conferível. O `big-pickle` não voltou a ser medido no papel atual (H*: 3 execuções da tarefa
  antiga de 19/10), morreu 2× por cota em janela larga e **saiu do catálogo uma vez em 16/10** —
  primário que morre por cota arrasta a sessão inteira. A reserva continuou
  **obrigatoriamente FREE** (condição do mantenedor) e o `glm` é o candidato vivo com a melhor
  medição no nível da reserva (7/8 da Camada B em 22/10, medindo a sessão que entra, não a
  condução) e **nunca morreu por cota** nas observações. O `pulse` (8/8 também) fica mais
  valioso no `explorer` como primário do que como reserva esperando cadência.
- **`oracle`: `flint-40b-free` entra.** A evidência atual do `super-vl` no caso S8 é de tarefa
  anterior (H*, 16/10, gabarito diferente). O `flint` entregou o S8 completo HOJE e até agora
  nunca caiu por cota (a única execução que o condenava — 503 sem resposta — é de 22/10, antes
  da recalibração do instrumento). A troca também evita repetir id entre as cadeias.
- **`explorer`: `pulse-alpha-free` entra.** O `deepseek` sobe para o `orchestrator` — e a regra
  "sem repetição" manda liberar o id. O `pulse` estreou em 03/11 e hoje tem medição nos 5
  papéis: no `explorer`, 6/6 âncoras com Parte B que declara o que a próxima doc não documenta.
  A troca do `deepseek` **não é por falha**: 0 erros verificáveis em 22/10.
- **`designer` e `fixer` mantidos com reconfirmação.** `beam`: único 3/3 do papel com citação
  `arquivo:linha` em tudo. `mimo`: medições de 15/10 e 19/10 no papel (a célula da bateria é
  `H` — skip), nunca morreu por cota.
- **Catálogo: 10 free, `crouton-alpha-free` estreante sem medição** (reconferido em 04/11).
  Não promovido — regra "medir por papel antes de apontar".

### Decisão

Aplicado no preset `.opencode/oh-my-opencode-slim.json` (blocos `zen.orchestrator`,
`zen.oracle`, `zen.explorer` com comentários datados) e em `opencode.jsonc` (`"model"` da
sessão passa a apontar o `deepseek` — para a SESSÃO atual o valor vale no próximo start do
host; troca manual com `/model` se precisar agora). `CHANGELOG.md` registra a troca. As
regras de permissão/skills/MCP dos agentes não mudaram.

### Alternativas descartadas nesta rodada

- **`big-pickle` ou `deepseek` como `fixer` (eram os validados com Jest hoje).** Descartado:
  o `deepseek` já assume o `orchestrator` como primário — o mesmo id funcionaria em duas
  cadeias ao mesmo tempo, contra a regra "nenhum id se repete"; e `big-pickle` morreu 2× por
  cota no dia — fixer precisa completar correções, não morrer no meio.
- **`pulse-alpha-free` como reserva do `orchestrator`.** Descartado: o `glm` já tem a
  medição da função (7/8, 22/10) e nunca caiu por cota; mover o `pulse` para reserva deixaria
  o `explorer` sem dono medido e o `glm` sem uso — redundância sem ganho.
- **Manter o `super-vl` no `oracle`.** Descartado: a única evidência no papel atual era H*,
  e os 6/8 de hoje no papel do `orchestrator` não elevam a medida do papel do `oracle`.
- **Trocar `mimo` (`fixer`) por `flint`/`beam`.** Descartado: sem ganho verificável e quebra
  a regra "todo id medido no próprio papel" — o `mimo` tem o papel com mais medições
  vivas (15/10, 19/10).

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

### Ground truth do disco em runtime e fail-fast nos runners (06/11/2026)

A pendência estrutural deixada em 05/11 — o instrumento do bench ainda guardava
contagens e linhas fixas — foi fechada. `scripts/bench/ground-truth.js` deriva do
disco, a cada execução: inventário de `pages/api/` (arquivos e rotas), linhas de
âncora e cobertura das citações de `gabarito-*.md`/`rubrica.md`; `citacoes.js`
concentra a resolução `arquivo:linha` usada pelo conferidor e pelo ground truth, e
`runner-comum.js` fica com o plumbing idêntico dos dois runners (`STDIO`,
execução de comando/sessão, catálogo de modelos, classificação de saídas
existentes e resumo de argumentos).
Não há arquivo gerado nem cache: um número velho não sobrevive ao próximo `run`.

`verificarInstrumento()` roda como preflight em `orchestrator/rodar.js` e
`papeis/rodar.js` **antes de qualquer spawn** (`opencode models` incluído):
citação que não resolve, âncora ausente/não coberta, contagem divergente ou
afirmação de conteúdo que o disco desmente bloqueiam a bateria com a lista de
problemas. Os runners também planejam antes de executar (colisão de nome de
saída, `.meta.json` do turno 2), validam argumentos, imprimem os comandos reais
no `--dry-run` e abortam quando `restaurarArvore()` não devolve a árvore ao estado
anterior. O `fixer` ganhou `verificarRegressao()` read-only: `desconhecido` ou
`ausente` bloqueiam antes do spawn; `regredido` é aceito sem reaplicar.

Correções de instrumento encontradas no caminho: `gabarito.md`/`rubrica.md`
(32 arquivos/32 rotas; `settings.js:130/164`; `products.js:121` e usos
`:356,362,367,372`), `gabarito-oracle.md` (`adminCrudHandler.js:186-190` é a
resposta 403 do RBAC; o rate limiting começa em `:192`) e a rubrica B1 (32/32).
O `gabarito-designer.md` foi recalibrado em 06/11/2026: P1 passou a afirmar o
foco **conforme** do `Button` (`Button.module.css:21-25`, com `outline` e
`box-shadow`) e P3 descreve os **três** usos aceitáveis de
`--color-text-tertiary` no `Input` (`:39`, `:51`, `:104`), com o `.helperText`
em `--color-text-secondary` (`:167`). O bloqueio do bench do designer deixou de
existir; os cinco instrumentos conferem contra o disco.

Validação: `tests/unit/scripts/bench-ground-truth.test.js` (canário nos **cinco**
instrumentos, incluindo o designer), `tests/unit/scripts/bench-arvore.test.js`
(guarda e restauração num repo git temporário) e
`tests/unit/scripts/bench-runner.test.js` (`opencode` falso: catálogo, captura
de `sessionID` e timeout com `excedeu: true`); dry-runs dos dois runners (só
`opencode models` no `PATH` falso); execução real falsa do runner de papéis com
`sessionID`, `excedeuTimeout` e `repoRestaurado` no `.meta.json`; árvore suja
bloqueada antes de qualquer invocação; e gabarito do orchestrator corrompido
numa cópia da árvore sem invocação alguma. O default do bench do orchestrator
foi alinhado ao ADR (`deepseek-v4.1-flash-free`/`glm-5.3-flash-free`), porque
`space-bunny-free` saiu do catálogo.

Risco residual fechado em 06/11/2026: `restaurarArvore()` era destrutiva e
silenciosa — apagava trabalho não commitado fora de `scripts/bench` e errava
caminho citado/renomeação. Agora `scripts/bench/arvore.js` exige a árvore limpa
**antes** da execução real (`exigirArvoreLimpa`, isenta no `--dry-run`), lê o
status com `git status --porcelain=v1 -z` (espaço/acento deixam de ser
ambíguos), restaura só os caminhos reportados e falha fechada em
renomeação/cópia. O runner também unificou `executar`, `catalogo`,
`executarSessao` e `sessionIdDaLinha` em `runner-comum.js`: o timeout do runner
de papéis deixou de ser silencioso (`excedeuTimeout`) e o `sessionID` passou a
ser gravado no `.meta.json`.

Riscos residuais fechados em 06/11/2026 (segunda passada): (1) **commit ou
troca de branch do agente passavam como `ok: true`** — os dois deixam
`git status` limpo, então a restauração por caminho não tinha o que desfazer e
o commit ficava no histórico. Agora `exigirArvoreLimpa()` devolve o baseline
`{ head, branch }` e cada `restaurarArvore(raiz, { cabecaEsperada })` o
reencontra **antes** de qualquer escrita; HEAD ou branch diferentes abortam a
bateria com motivo explícito, e o commit do agente permanece para inspeção em
vez de ser mascarado. A restauração passou a rodar em `finally`: falha de
spawn ou de leitura do `.ndjson` também devolve a árvore ao estado anterior.
(2) **o caminho de timeout só era provado no teste unitário do runner comum.**
`--timeout-min` passou a aceitar fração positiva nos dois runners (`0.05` = 3 s,
sem mudar a semântica de inteiros) e
`tests/unit/scripts/bench-papeis-runner.test.js` executa o runner de papéis de
verdade numa fixture git mínima com `opencode` falso: o primeiro cenário
asserindo `TIMEOUT`, `sessionID`, `excedeuTimeout: true`, `repoRestaurado: true`,
arquivo rastreado restaurado e não rastreado removido; o segundo commitando e
provando o aborto fail-closed.

Riscos residuais fechados em 07/11/2026 (terceira passada): (1) **SIGINT/SIGTERM
deixavam a árvore suja e a sessão sem registro** — não havia handler, e a
restauração só acontecia no fluxo normal. O runner de papéis agora instala um
handler que aborta a sessão em curso via `AbortSignal`; a restauração roda no
`finally` e a saída parcial permanece. O primeiro sinal encerra com código 130;
o segundo sai na hora. (2) **o baseline `{ head, branch }` não sobrevivia entre
execuções** — depois de um aborto, só a mensagem do erro lembrava o HEAD de
origem. Uma trava em `scripts/bench/papeis/resultados/.execucao-pendente.json`
grava `{ head, branch, agente, modelos, iniciadoEm }` enquanto a bateria roda:
conclusão normal a remove; interrupção, commit ou falha a mantêm, e a próxima
execução recusa antes de qualquer spawn. O procedimento de recuperação fica no
LEIA-ME do bench, que é a fonte operacional.

Limite que permanece, por desenho: não há backup dos arquivos descartados. O
bench roda numa cópia descartável e a guarda exige a árvore limpa, então o que a
restauração remove é a sujeira criada pela própria sessão — backup automático
mascararia essa origem. A única perda possível é edição concorrente do operador
durante a sessão, e é por isso que a cópia é isolada.

## 07/11/2026: revisão de catálogo — `pulse-alpha-free` saiu, três estreantes medidos e `explorer`, `designer` e `fixer` trocam

O mantenedor pediu nova revisão dos modelos FREE por causa de "pequenas alterações
recentes na lista, incluindo a adição de novos modelos", com o objetivo de levantar o
catálogo, ver o que já foi medido, medir o que faltava e recomendar a distribuição. A
recomendação foi aprovada e aplicada nesta data.

### Inventário (07/11/2026) — 11 modelos free

`beam-free`, `big-pickle`, `crouton-alpha-free`, `deepseek-v4.1-flash-free`,
`flint-40b-free`, `glm-5.3-flash-free`, `iceman-free`, `inkling-2-small-free`,
`mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`
(conferido com `opencode models`).

Diferença exata contra o inventário de 04/11/2026:

- **saiu** `pulse-alpha-free`: o id não aparece mais em `opencode models`. Era o
  `explorer` desde 04/11; um id fora do catálogo não spawna, então o papel estava parado;
- **entraram** `iceman-free` e `inkling-2-small-free`, ambos sem medição;
- `crouton-alpha-free`, estreante de 04/11, continua no catálogo — seguia sem medição.

Os ids atribuídos antes da rodada (menos o `pulse`) continuam vivos: `deepseek` e `glm`
(orchestrator), `flint` (oracle), `beam` (designer) e `mimo` (fixer).

### Bateria de 07/11/2026 — os três novos nos 5 papéis

18 execuções válidas (3 modelos × 5 papéis, uma por célula), mais uma repetição de uma
execução que caiu com 503 e uma nova medição do `beam` no `designer` (incumbent, para
comparar no mesmo dia). Tudo sequencial; o runner restaurou a árvore entre execuções.
Citações e conteúdo foram conferidos **fora do modelo**, como nas baterias anteriores.

| Papel | `crouton-alpha-free` | `iceman-free` | `inkling-2-small-free` | Referência |
|---|---|---|---|---|
| `orchestrator` (Camada B) | 7/8 (errou o `405` e o Q4) | 7/8 (só o `405`) | 7/8 (só o `405`) | `deepseek` 8/8 em 04/11 (não remedido) |
| `oracle` (S8) | 0 erros | 0 erros | 2 citações de linha erradas | `flint` 0 erros em 04/11 (não remedido) |
| `explorer` | 6/6; zero `Cache-Control` declarado | 6/6 | 6/6; zero `Cache-Control` e 5 lacunas declaradas | `pulse` fora do catálogo |
| `designer` | **0 erros** (134 s) | correto, mas hedgeado (52 s) | 0 erros, 1 deslize de linha (51 s) | `beam` 1 erro (57 s) |
| `fixer` | 4/4 (293 s) | **4/4** (91 s) | 4/4 (25 s) | `mimo` não remedido (evidência de 15/10 e 19/10) |

**A leitura por papel:**

- **`orchestrator` — sem troca.** O `deepseek` continua o único 8/8 da Camada B no
  papel real (04/11); os três novos fizeram 7/8 e todos erram o mesmo item `405`, que
  já é lacuna conhecida da série. O `crouton` erra também o Q4. O `glm` segue reserva
  medida (7/8 em 22/10).
- **`oracle` — sem troca.** `crouton` e `iceman` deram o veredito correto do S8 com 0
  erros verificáveis; o `inkling` errou duas citações de linha (`permissions.js:47` e
  `:52-55`; o código está em `:60-63` e `:55-58`). Ninguém superou o `flint`, e os dois
  empatados têm papel próprio nesta distribuição — mantê-los separados preserva a regra
  de não repetir id entre primários.
- **`explorer` — `inkling` entra.** O `pulse` saiu do catálogo, então o papel precisava
  de dono de qualquer forma. Os três fizeram 6/6 âncoras de `withAuth`; `inkling` e
  `crouton` declararam explicitamente **zero** ocorrências de `Cache-Control` na doc do
  Route Handler, e o `inkling` foi o mais detalhado na Parte B (5 lacunas declaradas
  contra 3 do `crouton`).
- **`designer` — `crouton` entra.** 0 erros verificáveis: fechou os addons como
  decorativos citando `Input.js:97/125` (`aria-hidden`) e o foco do `Button` contra
  `MASTER.md:130`. O `inkling` também fez 0 erros (1 deslize de linha, 51 s) e o
  `iceman` ficou correto, mas hedgeado (dois `NÃO DETERMINADO` em usos que o gabarito
  aceita; 52 s). O `beam`, incumbent, errou 1 ponto: tratou o addon de `:104` como
  informação e reprovou um uso que o MASTER permite como decorativo. O `crouton` fica
  com o papel; `inkling` e `iceman` vão para `explorer`/`fixer`, sem repetição.
- **`fixer` — `iceman` entra.** Os três passaram 4/4 no conferidor (correção na
  produção; teste novo falha no código original regredido, passa no corrigido; suíte
  inteira verde; não editou teste existente). Tempos: `inkling` 25 s, `iceman` 91 s,
  `crouton` 293 s. O `iceman` fica por ser o mais rápido entre os dois que sobram depois
  de `inkling` (explorer) e `crouton` (designer) — a alocação preserva cinco primários
  distintos. O `mimo` não foi remedido nesta rodada; a evidência dele é de 15/10 e
  19/10, e os três novos têm medição no instrumento atual (regressão plantada).

### Um defeito de instrumento registrado (designer)

A cópia do bench (`/var/tmp/free-matrix`) está congelada em 04/11 e o
`gabarito-designer.md` dela é o de **22/10**, que ainda espera o `Button` fora do
padrão e o `.helperText` violando. O código do HEAD de 07/11 (`7955585`, "ATT - New
Design") tem o foco **conforme** (`Button.module.css:21-25`) e o `.helperText` em
`--color-text-secondary` (`Input.module.css:206-209`, cor em `:208` — o HEAD deslocou
as linhas com o bloco novo do `clearButton`). A pontuação do `designer` nesta rodada
foi feita **manualmente contra o conteúdo do HEAD**, não contra as linhas da cópia; os
três novos e o `beam` foram julgados pelo mesmo critério. O gabarito do repo foi
**recalibrado em 07/11/2026** para essas linhas (e para as faixas deslocadas do
`MASTER.md`: `:202-205`, `:213-215` e §9 em `:197-209`); a cópia congelada precisa ser
re-sincronizada a partir do repo antes da próxima execução, porque ela ainda tem o
gabarito de 22/10.

### Distribuição vigente (07/11/2026)

| Agente | PRIMÁRIO | RESERVA |
|---|---|---|
| `orchestrator` | `opencode/deepseek-v4.1-flash-free` | `opencode/glm-5.3-flash-free` |
| `oracle` | `opencode/flint-40b-free` | — |
| `explorer` | `opencode/inkling-2-small-free` | — |
| `designer` | `opencode/crouton-alpha-free` | — |
| `fixer` | `opencode/iceman-free` | — |

Nenhum id se repete entre os primários; a reserva do `orchestrator` não é primário de
nenhum outro agente. O `small_model` da sessão (`opencode.jsonc`) segue o
`mimo-v2.6-flash-free` (leve, inalterado).

### Decisão

Aplicado no preset `.opencode/oh-my-opencode-slim.json` (blocos `zen.explorer`,
`zen.designer` e `zen.fixer`, com comentários datados; `zen.orchestrator` e `zen.oracle`
ganharam a nota de confirmação de 07/11) e registrado no `CHANGELOG.md`. O `"model"` da
sessão em `opencode.jsonc` continua `opencode/deepseek-v4.1-flash-free`; a config do
slim é lida no start do host, então o `opencode debug agents` da sessão em curso ainda
mostra os modelos antigos até reiniciar. As regras de permissão/skills/MCP não mudaram.

### Alternativas descartadas nesta rodada

- **Manter o `pulse-alpha-free` no `explorer`.** Descartado por impossibilidade: o id
  não existe mais no catálogo e o host recusa o spawn (`provider.no-route`).
- **Trocar o `orchestrator` por um dos novos.** Descartado: o `deepseek` segue 8/8 e os
  três novos fizeram 7/8, todos com a mesma falha do `405`; trocar seria gastar cota e
  perder a única execução completa do papel.
- **Trocar o `oracle` por `crouton`/`iceman`.** Descartado: empataram com o `flint` em 0
  erros; sem ganho verificável, o incumbent fica, e os dois têm papel próprio — usá-los
  no `oracle` repetiria id entre primários.
- **Trocar o `designer` pelo `beam` mais uma vez.** Descartado: o `beam` errou 1 ponto
  no mesmo gabarito em que o `crouton` fez 0; a decisão de 04/11 (manter o `beam` por
  histórico) perdeu a base quando o incumbent foi medido no mesmo dia e ficou atrás.
- **Usar o `inkling` no `fixer` (25 s, mais rápido).** Descartado pela alocação: o
  `inkling` é o `explorer` (melhor Parte B entre os novos) e o `iceman` é o fixer mais
  rápido entre os que sobram (91 s contra 293 s do `crouton`), preservando cinco
  primários distintos.

## 11/11/2026: bateria 12×5 refeita — `oracle` e `designer` trocam, `orchestrator` mantém primário e reserva

O mantenedor pediu nova revisão do catálogo FREE, com **reexecução dos testes em todos os
modelos e em todos os agentes** (o processo de avaliação mudou desde 07/11), comparação com as
rodadas anteriores e a definição de **dois modelos FREE para o `orchestrator`** — principal
(ativo) e reserva. A recomendação foi aprovada e aplicada nesta data.

### Inventário (11/11/2026) — 12 modelos free

`beam-free`, `big-pickle`, `deepseek-v4.1-flash-free`, `flint-40b-free`,
`glm-5.3-flash-free`, `iceman-free`, `inkling-2-small-free`, `longcat-2.5-free`,
`mimo-v2.6-flash-free`, `minimax-m3.1-flash-free`, `nemotron-3.5-lightning-free`,
`nemotron-3.5-super-vl-free` (conferido com `opencode models`).

Diferença exata contra o inventário de 07/11/2026 (11 modelos):

- **saiu** `crouton-alpha-free` — o id não aparece mais em `opencode models`. Era o `designer`
  desde 07/11; como id fora do catálogo não spawna, **o papel estava parado** desde então;
- **voltou** `minimax-m3.1-flash-free`, que tinha saído em 22/10;
- **entrou** `longcat-2.5-free`, id novo — o `longcat-2.5-preview-free` havia saído em 22/10, e
  não é o mesmo id.

### Como mediu

- Todo o bench viveu na cópia isolada `/var/tmp/bench-2026-11-11` (git próprio; o repositório
  real não foi tocado pela bateria). Uma execução por célula: **12 modelos × 5 papéis**, sendo
  quatro papéis pelo bench de papel (`scripts/bench/papeis/`) e o `orchestrator` pelo bench de
  dois turnos (`scripts/bench/orchestrator/`). Repetição só de célula derrubada por
  infraestrutura.
- **Verificação fora do modelo** em todos os papéis: o conteúdo foi lido contra o gabarito; no
  `fixer`, a correção foi reaplicada e rodada com **Jest real** (o teste novo tem de falhar no
  código regredido, passar no corrigido e a suíte inteira ficar verde).
- **A cota FREE é por modelo** (`provider.free-limit`, 429, `retryAfterMs` de ~5,5 h), não por
  IP/dia: em 11/11, `flint` e `longcat` morreram enquanto os demais modelos respondiam. As 7
  células perdidas voltaram depois do reset das ~21:13 e foram remedidas — `flint`/`longcat`:
  oracle 334 s/185 s, explorer 528 s/319 s, fixer 383 s/timeout 600 s; `flint` no turno 2 do
  orchestrator: 265 s. O `mimo` estourou 600 s no explorer e foi remedido com 15 min (325 s).
- **Confundidores registrados**: (1) os subagentes do bench do orchestrator herdam o preset da
  cópia — `@oracle` = `flint` (cota morta) e `@designer` = `crouton` (id morto); quem delegou a
  `@oracle` no turno 1 estourou o timeout (`mimo`, `longcat`, `flint`), e o `deepseek` estourou
  com duas chamadas de `@explorer` (uma cancelada e refeita em foreground). A Camada C fica
  enviesada contra quem delega e **não foi usada como critério** nesta rodada; (2) o
  `big-pickle` teve saída de `grep` ecoando caminhos de `scripts/bench/**` no explorer; as
  chamadas de ferramenta não têm caminho de `scripts/bench/` (não abriu o gabarito), mas o
  bench de papel não detecta isso automaticamente — a decisão de não descartar a célula fica
  registrada, com o mesmo risco já documentado no `conferencia.md`; (3) modelos gravaram
  artefatos na raiz que a limpeza do runner não cobre (ex.: `AUDIT_FINAL.md` do `lightning`),
  bloqueando a bateria seguinte por "árvore suja fora de `scripts/bench`".

### Instrumentos corrigidos nesta rodada (aplicados ao repo; canário 14/14)

- `scripts/bench/orchestrator/pontuar.js`: o regex de "todos são rota" marcava erro quando a
  resposta correta usava "não-rota" como negação. Efeito: `iceman` 6→7/8, `mimo` 5→6/8,
  `minimax` 5→6/8.
- `scripts/bench/orchestrator/gabarito.md` §2: admin via factory é **17** (16 de
  `pages/api/admin/` + `ip-diagnostico.js:186`), e a autenticação **manual** é **6** (as 2 de
  `admin/` — `internal-products.js:62/98` e `orders.js:28/64` — não usam a factory).
- `scripts/bench/papeis/conferir-fixer.js`: caminho absoluto/fora da raiz passa a ser violação
  da regra 2 (antes quebrava com `ENOENT`); "suíte verde" ignora a suíte do próprio instrumento
  (`tests/unit/scripts/bench-ground-truth.test.js`, cujos 2 testes — canário do disco e
  regressão do S1 — falham por desenho com o bug plantado); execução sem teste novo marca
  `n/a` em "falha no original"; `write` em `status.js` conta como `mexeuNaProducao`.
- `scripts/bench/orchestrator/{rodar.js,rubrica.md,LEIA-ME.md}`: a mensagem "cota por IP/dia"
  foi corrigida para o comportamento observado (por modelo).

### Resultado por papel (11/11/2026)

Uma execução por célula; tempo entre parênteses é o da execução. No `explorer`, todos os 12
fizeram as **6/6 âncoras** de `withAuth` e declararam **zero** `Cache-Control` na doc do Route
Handler — a coluna mostra as âncoras, e o desempate está na leitura.

| Modelo | orchestrator (Camada B) | oracle (S8) | explorer (âncoras) | designer | fixer (Jest real) |
|---|---|---|---|---|---|
| `beam-free` | 5/8 (t2 10 s) | 6/6 (84 s) | 6/6 (108 s) | 2 erros (98 s) | 4/4 (45 s) |
| `big-pickle` | 6/8 (15 s) | 6/6 (150 s) | 6/6 (107 s) | **0 erros** (53 s) | 4/4 (32 s) |
| `deepseek-v4.1-flash-free` | **8/8** (28 s) | 4/6 (70 s) | 6/6 (420 s) | 0 erros (61 s) | 4/4 (37 s) |
| `flint-40b-free` | 6/8 (265 s) | 6/6 (334 s) | 6/6 (528 s) | 0 erros (414 s) | 3/4 (383 s) |
| `glm-5.3-flash-free` | 6/8 (47 s) | 5/6 (58 s) | 6/6 (307 s) | 0 erros (63 s) | reprovado (169 s) |
| `iceman-free` | 7/8 (84 s) | 6/6 (74 s) | 6/6 (119 s) | hedge (40 s) | **4/4** (114 s) |
| `inkling-2-small-free` | **8/8** (49 s) | 6/6 (68 s) | **6/6** (117 s) | 1 erro (100 s) | 4/4 (131 s) |
| `longcat-2.5-free` | 5/8 (122 s) | 5/6 (185 s) | 6/6 (319 s) | 0 erros (487 s) | 4/4, TIMEOUT (600 s) |
| `mimo-v2.6-flash-free` | 6/8 (553 s) | 5/6 (322 s) | 6/6 (325 s) | 0 erros (553 s) | 4/4, TIMEOUT (600 s) |
| `minimax-m3.1-flash-free` | 6/8 (29 s) | **6/6 (66 s)** | 6/6 (182 s) | 0 erros (174 s) | reprovado (600 s) |
| `nemotron-3.5-lightning-free` | 1/8 (129 s) | 4/6 (90 s) | 6/6 (360 s) | hedge (146 s) | reprovado (64 s) |
| `nemotron-3.5-super-vl-free` | 6/8 (101 s) | 6/6 (231 s) | 6/6 (484 s) | 1 erro (210 s) | reprovado (37 s) |

No `designer`, "erro" é afirmação falsa contra o gabarito (reprovar um uso aceito ou contar
quatro usos); "hedge" é resposta correta sem veredito firme nos usos aceitos. Omitir a cláusula
do `.helperText` não contou como erro — só o `flint` a fechou. No `fixer`, "reprovado" cobre:
teste que não prova o defeito e quebra na suíte completa (`glm`), ausência de teste novo
(`minimax`, `lightning`, `super-vl`; o `minimax` ainda escreveu 2 arquivos fora do repo) e
suíte final vermelha por causa do próprio teste novo (`flint`, 3/4).

### Leitura por papel

- **`orchestrator` — sem troca.** `deepseek` 8/8 (2ª medição viva; 28 s no turno 2) e `inkling`
  8/8 (49 s) são os únicos sem erro na Camada B. O `iceman` fez 7/8 (só o `405`). O `glm`
  repetiu 6/8 (47 s). Os demais 6/8 erram `ip-diagnostico:186` e o `405`; `beam`/`longcat` 5/8;
  `lightning` 1/8 (insiste em 36 arquivos; a verdade é 38). O `flint` fez 6/8 no retry, com
  turno 2 de 265 s (o mais lento). Primário e reserva ficam.
- **`oracle` — `minimax` entra.** Sete modelos fizeram 6/6: `minimax` (66 s), `inkling` (68 s),
  `iceman` (74 s), `beam` (84 s), `big-pickle` (150 s), `super-vl` (231 s) e `flint` (334 s).
  `glm` e `mimo` ficaram 5/6 (sem `permissions:55-63`); `longcat` 5/6 (sem o drift);
  `deepseek` e `lightning` 4/6. O `minimax` é o mais rápido do grupo 6/6 e voltou ao catálogo
  nesta data; `inkling` é o explorer, `iceman` o fixer. O que decide contra o `flint` não é a
  qualidade (6/6 de novo): é a cota — três quedas no mesmo dia para o papel usado em toda
  entrega — somada a ser o mais lento do grupo (334 s). O `deepseek` (4/6) mostra que capacidade
  de orchestrator não transfere para a triagem do S8.
- **`explorer` — sem troca.** Os 12 fizeram as 6/6 âncoras e declararam zero `Cache-Control`;
  nenhum caiu nas armadilhas. A profundidade da Parte B separa: `minimax` (16,7 mil
  caracteres), `big-pickle`, `iceman`, `longcat` e `deepseek` declaram o que a doc não
  documenta; `beam` e `flint` ficam no mínimo. O `inkling` repetiu 6/6 em 117 s com Parte B
  detalhada e fica; os outros finalistas têm papel próprio e a diferença de tempo é de ~10 s
  (`big-pickle` 107 s).
- **`designer` — `big-pickle` entra.** Com o `crouton` fora do catálogo, o papel precisava de
  dono. `big-pickle` fechou os três usos aceitos (`:39`, `:49-53`, `:98-106`) e o foco do
  `Button` em **0 erros**, no menor tempo do grupo (53 s). `deepseek` (61 s) e `glm` (63 s)
  também fizeram 0 erros, mas são orchestrator e reserva; `minimax` (174 s) é o oracle;
  `flint` (414 s), `longcat` (487 s) e `mimo` (553 s) fizeram 0 erros, com custo alto e/ou cota
  frágil. `inkling` (100 s) e `super-vl` (210 s) reprovaram o uso de `:51`; `beam` (98 s)
  reprovou `:51` **e** `:104`; `iceman` (40 s) e `lightning` (146 s) ficaram corretos, mas
  hedgeados.
- **`fixer` — sem troca.** `big-pickle` 32 s, `deepseek` 37 s, `beam` 45 s, `iceman` 114 s e
  `inkling` 131 s passaram 4/4; `mimo` (600 s) e `longcat` (600 s) fariam 4/4 no conteúdo, mas
  estouraram o timeout; `flint` fez 3/4 (o teste novo dele quebra na suíte completa); `glm`,
  `minimax`, `lightning` e `super-vl` reprovaram. O `iceman` fica: 4/4 de novo, rodou a suíte
  **completa** e relatou as 2 falhas conhecidas do instrumento (só ele e o `inkling` fizeram
  isso); o `beam` (45 s) parou na suíte da rota e não rodou a completa; `big-pickle` e
  `deepseek` têm papel próprio.

### Mudanças de comportamento contra 04/11 e 07/11

- **`inkling` subiu de 7/8 para 8/8** no papel de orchestrator (achou o `405` que faltava em
  07/11) e repetiu 6/6 no explorer — melhora real, não ruído de instrumento.
- **`flint` caiu do pedestal de 04/11.** Continua 6/6 no S8, mas ficou o mais lento do grupo
  (334 s) e morreu por cota 3× no dia. A justificativa de 04/11 ("até agora nunca caiu por
  cota") deixou de valer — e era o principal argumento para mantê-lo no `oracle`.
- **`crouton` saiu do catálogo.** A escolha de 07/11 para o `designer` ficou inválida; o papel
  estava parado. O `designer` agora aponta para um id vivo e medido.
- **`mimo` piorou em latência**: 7/8 em 04/11, 6/8 agora, e 553–600 s em designer/fixer (o
  conteúdo continua bom; o tempo o desqualifica para papéis com orçamento).
- **`minimax` voltou** ao catálogo e é o 6/6 mais rápido do `oracle` (66 s); em 22/10 tinha 7/8
  no orchestrator e hoje fez 6/8.
- **`deepseek` repetiu 8/8** (segunda medição viva), mas segue lento no explorer (420 s) e
  fraco no oracle (4/6).
- **`lightning` repetiu 1/8** e continua contando 36 arquivos em `pages/api/` (verdade: 38).
- **`big-pickle`** repetiu o perfil de 04/11 no orchestrator (6/8), mas foi o mais rápido no
  `fixer` (32 s) e no `designer` (53 s) — os papéis em que o modelo é mais útil.

### Distribuição vigente (11/11/2026)

| Agente | PRIMÁRIO | RESERVA |
|---|---|---|
| `orchestrator` | `opencode/deepseek-v4.1-flash-free` | `opencode/glm-5.3-flash-free` |
| `oracle` | `opencode/minimax-m3.1-flash-free` | — |
| `explorer` | `opencode/inkling-2-small-free` | — |
| `designer` | `opencode/big-pickle` | — |
| `fixer` | `opencode/iceman-free` | — |

Nenhum id se repete entre os primários; a reserva do `orchestrator` não é primário de nenhum
outro agente. O `small_model` da sessão (`opencode.jsonc`) segue o `mimo-v2.6-flash-free`.

### Decisão

Aplicado no preset `.opencode/oh-my-opencode-slim.json` (blocos `zen.orchestrator`,
`zen.oracle`, `zen.explorer`, `zen.designer` e `zen.fixer`, com comentários datados), em
`opencode.jsonc` (nota de reconfirmação do `deepseek`) e no `CHANGELOG.md`. As regras de
permissão/skills/MCP não mudaram. O host lê o preset no start: a sessão em curso só troca os
agentes depois de reiniciar.

### Alternativas descartadas nesta rodada

- **`inkling` como reserva do `orchestrator` (8/8, melhor que o `glm` 6/8).** Descartado: o
  `inkling` é o `explorer` (117 s, 2ª medição) e movê-lo deixaria o papel de uso diário com
  `minimax`/`iceman`, que têm 6/6 mas custam mais. A reserva só entra quando o primário morre;
  trocar qualidade diária por qualidade de exceção não se paga.
- **Manter o `flint` no `oracle`.** Descartado: 6/6, mas 334 s e 3 quedas de cota no dia; é o
  papel mais usado em revisão de entrega, e um modelo que esgota a cota depois de ~3 sessões
  não sustenta o dia.
- **`beam` no `fixer` (45 s, 4/4).** Descartado: mesmo 4/4, mas ele parou na suíte da rota e não
  rodou a completa (o `iceman` rodou e relatou as falhas conhecidas); e a evidência do `iceman`
  no papel é a 2ª medição (91 s em 07/11, 114 s hoje).
- **`big-pickle` no `fixer` (32 s, o mais rápido).** Descartado: o `big-pickle` é o `designer`
  (0 erros, 53 s) e é o único 0-erro rápido que não está ocupado; trocá-lo deixaria o `designer`
  com `flint`/`longcat`/`mimo` (414–553 s).
- **`minimax` no `designer` (174 s, 0 erros).** Descartado: é o oracle mais rápido do grupo 6/6
  (66 s); o `designer` tem um 0-erro mais rápido (`big-pickle`, 53 s).
- **`deepseek` no `oracle` (4/6).** Descartado por medição: capacidade de orchestrator não
  transfere para a triagem do S8.
- **Trocar o `explorer` por um 6/6 mais rápido.** Descartado: a diferença é de ~10 s
  (`big-pickle` 107 s), os candidatos mais rápidos têm papel próprio e o `inkling` tem duas
  medições no papel.

## 12/11/2026: retenção conferida na fonte e preflight de catálogo

Duas pendências do ciclo anterior fecharam nesta data: a privacidade dos primários
(reaberta em 07/11 e reconferida em 11/11 sem fonte) e o modo de falha "id saiu do
catálogo" (registrado em 19/10, sem mecanismo).

### Retenção por modelo (fonte: `opencode.ai/console/models`, lida em 12/11/2026)

A página declara zero-retention para todos os modelos **exceto** uma lista nominal,
em "Free models" e "Privacy". Conferido contra os ids em uso:

| Modelo | Papel | Política declarada |
|---|---|---|
| `deepseek-v4.1-flash-free` | `orchestrator` (primário) | zero-retention, sem treinamento |
| `glm-5.3-flash-free` | `orchestrator` (reserva) | zero-retention, sem treinamento |
| `minimax-m3.1-flash-free` | `oracle` e `small_model` | zero-retention, sem treinamento |
| `big-pickle` | `designer` | "collected data may be used to improve the model" |
| `inkling-2-small-free` | `explorer` | retido; "may be used for ... model training" (Thinking Machines) |
| `iceman-free` | `fixer` | "retained and used to improve the model" |
| `longcat-2.5-free` | sem papel | zero-retention, sem treinamento (hospedado na China, 100 req/dia) |
| `beam-free` | sem papel | não treina; retém 30 dias |
| `flint-40b-free`, `mimo-v2.6-flash-free`, `nemotron-*` | sem papel | retêm e/ou usam para melhorar o modelo |

Leitura: **três dos cinco papéis (`designer`, `explorer` e `fixer`) enviam código a
provedores que retêm e usam os dados para treinar.** A garantia é declaração do
fornecedor, não auditável neste repositório — o que muda é que agora está registrada
por id, em vez de "não verificado".

### Decisão

1. **`small_model` → `opencode/minimax-m3.1-flash-free`** (`opencode.jsonc`). Era o
   único ponto em que texto derivado do prompt (título de sessão) ia a um modelo que
   treina: o `mimo` caiu na lista de exceções. O minimax é zero-retention, está no
   catálogo e já é o `oracle` — não cria id novo e não fere a regra de não repetir id
   entre **primários** (o `small_model` não é papel).
2. **Papéis mantidos.** Só há três ids free zero-retention em uso (`deepseek`, `glm`,
   `minimax`) e um sem papel (`longcat`, sem medição e com 100 req/dia). Reatribuir
   `designer`/`explorer`/`fixer` exigiria promover `longcat` sem bateria — contra a
   regra central deste ADR — ou repetir id, contra a regra de distribuição. A
   pendência fica **resolvida como fato** e **aceita como risco** para código
   sensível: a mitigação que existe é não colar segredo em prompt.
3. **Preflight de catálogo: `npm run models:check`**
   (`scripts/diagnostics/check-model-catalog.js`). Lê `opencode debug agents` (config
   compilada, sem JSONC) e `opencode models`, compara e sai com código 1 listando os
   ids mortos. Cobre os **primários** e o `small_model`; a cadeia de reserva não
   aparece em `debug agents` (limite documentado no cabeçalho do script). Passa a ser
   o passo 6 do AGENTS.md §0.3.
4. **Reserva por papel não foi adotada como antídoto ao id morto.** A cadeia só
   aciona no hook `v2.session.retry` para erro de failover (429, 401/403, 5xx,
   timeout); `provider.no-route` chega com `failover: false`. Reserva cobre cota e
   transporte — não remoção do catálogo. Para esse modo de falha, o mecanismo é o
   preflight.

### Evidência da sessão

- `opencode debug agents` compilou `oracle → minimax-m3.1-flash-free` e
  `designer → big-pickle`; os cinco papéis e o `title` foram spawnados de verdade
  (`opencode run --agent <papel>`, sessões arquivadas) e o `modelID` lido do banco de
  sessões bateu com o preset — prova de que o restart aplicou o preset.
- `npm run models:check` → 13 ids no catálogo, 6 conferidos, `exit 0`.
- Com catálogo falso de 2 ids: 4 ids reportados, `exit 1`
  (`tests/unit/scripts/check-model-catalog.test.js` cobre as funções puras).

## 12/11/2026: `longcat-2.5-free` no papel — segunda medição, 2 de 5 células

O `longcat-2.5-free` é o único modelo free do catálogo **sem papel** e um dos poucos
zero-retention fora dos três já em uso. A regra central deste ADR — medir no papel antes
de promover — é o que impede apontá-lo para `designer`, `explorer` ou `fixer` sem bateria.
Em 11/11 ele tinha **uma** medição nos cinco papéis (5/8, 5/6, 6/6, 0 erros, 4/4 com
timeout). A medição desta data roda a segunda amostra, para decidir com duas em vez de uma.

### Como mediu

- Cópia isolada `/var/tmp/bench-2026-11-12` (git próprio; `.ai-memory.toml` com
  `workspace="default"`/`project="bench"` para não escrever na memória do projeto real).
  O repositório real não foi tocado pela bateria.
- Logs **fora** da cópia (`/var/tmp/bench-logs-2026-11-12/`): o runner restaura a árvore
  entre execuções e aborta com "árvore suja fora de `scripts/bench`" — um arquivo de log na
  raiz derrubou a primeira tentativa.
- Uma execução por célula. Papéis pelo bench de papel (`--timeout-min 15`); `orchestrator`
  pelo bench de dois turnos. Instrumentos validados antes do spawn: `--dry-run` dos cinco
  papéis passou e o `ground-truth` abriu todas as âncoras citadas.

### Resultado (12/11/2026)

| papel | resultado | tempo | observação |
|---|---|---|---|
| `designer` | **0 erros verificáveis** | 366 s | citações válidas, sem contaminação |
| `fixer` | **4/4** | 826 s | corrigiu produção e criou teste; `codigoSaida: 1` |
| `explorer` | **não medido** | 1 s | `provider.free-limit` 429 |
| `oracle` | **não medido** | 1 s | `provider.free-limit` 429 |
| `orchestrator` (t1+t2) | **não medido** | — | **não executado** — modelo já sem cota |

- **designer:** P1 conforme (`Button.module.css:21-25`, par `outline` + `box-shadow`
  idêntico a `MASTER.md:130`); P2 na proibição de `MASTER.md:50-52`; P3 nos três usos de
  `--color-text-tertiary` (`Input.module.css:39`/`:51`/`:104`) aceitos individualmente, com
  `.helperText` corretamente excluído (`:208`) e `aria-hidden` dos addons (`Input.js:97`,
  `:125`) como justificativa.
- **fixer:** `pages/api/status.js` corrigido e
  `tests/integration/api/status.leak.test.js` criado. Verificação fora do modelo
  (`conferir-fixer.js`, Jest real): teste novo **falha** no código original, **passa** no
  corrigido, suíte verde — a única falha é o canário
  `tests/unit/scripts/bench-ground-truth.test.js`, que falha por desenho.

### A cota cortou a bateria

Depois do `fixer`, toda célula nova do longcat morreu em ~1 s com `provider.free-limit`
(429, "Free usage limit reached", `retryAfterMs` 37 333 000 ≈ 10 h 22; reset ≈ 21:13
local) — `explorer` e `oracle` falharam assim. O bench do `orchestrator` nem chegou a
ser iniciado: com o modelo sem cota, a sessão morreria no mesmo 429. O limite é **por
modelo**: os outros ids e o host respondiam normalmente no mesmo minuto. Duas
consequências operacionais registradas:

1. O `fixer` entregou o trabalho **e só então** levou o 429 — a execução fecha com
   `codigoSaida: 1` mesmo com a correção completa. **Código de saída não é sinal de
   sucesso no `fixer`**; a nota vem do `conferir-fixer.js`.
2. Célula derrubada por cota não é medição: as três restantes ficam abertas, com a
   medição de 11/11 como a única amostra do papel.

### Leitura

- **Nenhuma troca é justificada** pelas duas células medidas, e as três restantes não
  mudam a distribuição por ausência de dado novo.
- Nas duas células fechadas o longcat é **mais lento que o titular**: `designer` 366 s
  contra 53 s do `big-pickle`; `fixer` 826 s contra 114 s do `iceman`. O acerto é igual
  (0 erros nos dois no designer; 4/4 nos dois no fixer).
- **Padrão de comportamento, não de tarefa:** no `fixer` o longcat gastou boa parte da
  sessão tentando "consertar" o canário `bench-ground-truth.test.js`, que falha por
  desenho — o mesmo vício que o derrubou no timeout de 600 s em 11/11. Duas amostras,
  mesmo comportamento.

### Decisão

1. **Distribuição inalterada** — nenhum papel aponta para o `longcat`, e nenhum papel
   muda de titular com a evidência de hoje.
2. **As três células restantes rodam em cota nova** (`explorer`, `oracle`,
   `orchestrator` t1+t2) e entram aqui como segunda amostra. Até lá, os valores de 11/11
   (oracle 5/6 em 185 s; explorer 6/6 em 319 s; orchestrator 5/8 em 122 s) seguem como a
   medição vigente do papel.
3. **Critério para promover o `longcat`** (se as três fecharem): vencer o titular em erro
   verificável no papel, não apenas empatar, já que ele é ~7× mais lento nas duas células
   medidas (6,9× no `designer`, 7,2× no `fixer`). A única razão extra seria privacidade —
   ele é zero-retention — e essa troca hoje custaria um id novo em papel sensível sem
   vantagem medida.

## Consequências

### Positivas

- Nenhum modelo é compartilhado entre agentes: a queda de um afeta um agente só.
- Cada agente recebe o modelo que foi medido na tarefa que ele executa, não um
  modelo genérico escolhido por conveniência.
- O critério é reproduzível — a bateria de medição é reexecutável, e o porquê de cada
  modelo está no comentário do próprio preset.

### Negativas e riscos

- **Três dos cinco papéis enviam código a provedor que retém e treina — conferido em
  12/11/2026.** `designer` (`big-pickle`), `explorer` (`inkling`) e `fixer` (`iceman`) estão
  na lista de exceções da política do provedor; `orchestrator` (`deepseek`/`glm`) e `oracle`
  (`minimax`) são zero-retention, e o `small_model` passou a `minimax` na mesma data. Ver
  "12/11/2026". A garantia é declaração do fornecedor, não auditável neste repositório; para
  código sensível, o risco está aceito e registrado.
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
  deles sair do catálogo, o agente fica sem modelo até re-benchmarkar. **Já aconteceu:**
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

Reavaliar quando: (a) algum dos modelos em uso sair do catálogo ou for marcado `deprecated`;
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
- **Durabilidade de um dia — EM OBSERVAÇÃO DE CAMPO desde 22/10/2026.** O bench mede o
  papel numa sessão de uma tarefa; o que falta medir é a fila de tarefas de um dia de
  trabalho. Primeira janela de campo: 20–22/10 (ver seção "22/10/2026" neste texto) —
  nenhuma evidência de degradação, mas janela única e sem controle. **Gatilho para escalar
  ao bench de fila** (duas sessões comparativas, a mesma fila de tarefas para os dois
  modelos): padrão suspeito no campo — degradação visível, erro repetido ao fim de dia
  longo, primário caindo no meio do trabalho. Até lá, não gastar cota.
- **Instrumento do `designer` desatualizado — RESOLVIDO em 06/11/2026.** O
  `gabarito-designer.md` foi recalibrado para o código atual: P1 afirma o foco
  **conforme** do `Button` (`Button.module.css:21-25`, par `outline` +
  `box-shadow`) e P3 descreve os três usos aceitáveis de `--color-text-tertiary`
  no `Input` (`:39`, `:51`, `:104`), com `.helperText` em
  `--color-text-secondary` (`:167`). O preflight de `papeis/rodar.js` voltou a
  aceitar o papel, e `tests/unit/scripts/bench-ground-truth.test.js` mantém os
  cinco instrumentos no canário. A execução
  `designer-pulse-alpha-free-1.ndjson` continua como evidência histórica da
  divergência de 03/11.
- **Privacidade dos primários — RESOLVIDA como fato em 12/11/2026 (risco aceito).**
  A pendência reaberta em 07/11 e reconferida em 11/11 sem fonte foi fechada contra a página
  de modelos do Console: `deepseek`/`glm`/`minimax` são zero-retention; `big-pickle`,
  `inkling` e `iceman` retêm e usam para treinar. Papéis mantidos e `small_model` trocado para
  o `minimax`. Ver "12/11/2026" — a verificação por id substitui "não verificado".
- **`longcat-2.5-free` com 2 de 5 células na segunda medição — ABERTA em 12/11/2026.**
  `designer` (0 erros, 366 s) e `fixer` (4/4, 826 s) fecharam; `explorer` e `oracle`
  morreram no `provider.free-limit` e o `orchestrator` (t1+t2) nem rodou, porque o modelo
  ficou sem cota. Sem as três, o longcat continua sem papel e a medição do papel é a de
  11/11. Ver "12/11/2026: `longcat-2.5-free` no papel".
- **Instrumento do `designer` com linhas desatualizadas no HEAD — RESOLVIDO em
  07/11/2026.** O conteúdo do `gabarito-designer.md` do repo (recalibrado em
  06/11/2026) estava correto, mas o HEAD `7955585` ("ATT - New Design") deslocou
  linhas: o `.helperText` foi para `Input.module.css:206-209` (cor em `:208`, antes
  `:167`) e duas faixas do `MASTER.md` andaram (+1). O gabarito foi recalibrado e o
  canário `tests/unit/scripts/bench-ground-truth.test.js` passa. A cópia congelada
  `/var/tmp/free-matrix` ainda tem o gabarito de 22/10 e precisa ser re-sincronizada
  do repo antes da próxima execução.
- **Ruído de formato do `oracle`.** Ele não complyou o formato pedido numa das execuções.
  Se isso aparecer em revisão real, o critério de troca precisa considerar acabamento, não só
  capacidade de achado.