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
> ver a nota no preset `zen`.

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
| `orchestrator` | `space-bunny-free` | sem reserva — ver "Saídas do catálogo" |
| `oracle` | `nemotron-3.5-super-vl-free` | achou a causa da escalada de privilégio, não o sintoma — ver "Saídas do catálogo" |
| `explorer` | `longcat-2.5-preview-free` | 10/10; localizou o `withAuth` em uso, que o rival errou |
| `designer` | `beam-free` | 4/4; apontou o `--color-text-tertiary` como proibido para texto informativo — ver "18/10/2026" |
| `fixer` | `mimo-v2.6-flash-free` | 9/9 testes; formatação e não-mutação reconferidas fora do agente |

> A tabela é a de **18/10/2026**. Antes dela havia seis linhas: o `librarian`
> (`deepseek-v4.1-flash-free`) deixou de existir quando o slim 3.0.5 fundiu-o no
> `explorer`, e o `designer` trocou de modelo porque o `muse-spark-1.3-contributor-free`
> saiu do catálogo. As duas mudanças estão em "18/10/2026"; o histórico fica em
> "Saídas do catálogo em 16/10/2026" e em "Re-análise de 16/10/2026".

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
- **A cadeia do orchestrator é fraca pelo mesmo motivo das anteriores** — não cobre
  o erro de autenticação do free tier. Ela cobre rate limit e erros de rede, e é
  melhor do que nada, mas não deve ser tratada como garantia.
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
  reserva foi restaurada (ver "Re-análise de 16/10/2026"). O `orchestrator-bench` continua em
  aberto, porque é ele que decide se `space-bunny-free` se sustenta como primário — pergunta que
  a bateria por proxy não responde. O script existe em `/tmp/opencode/bench-orch/` e exige
  `OPENCODE_API_KEY` no ambiente de quem roda.
- **Privacidade do `oracle` não verificada.** `nemotron-3.5-super-vl-free` é hoje o único
  dos seis sem garantia de retenção registrada. Se isso for requisito, verificar antes do
  próximo uso com código sensível.
- **Ruído de formato do `oracle`.** Ele não complyou o formato pedido numa das execuções.
  Se isso aparecer em revisão real, o critério de troca precisa considerar acabamento, não só
  capacidade de achado.