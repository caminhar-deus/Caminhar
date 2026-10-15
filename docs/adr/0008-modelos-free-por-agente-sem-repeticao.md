# ADR-0008: Um modelo FREE distinto por agente, medido, sem repetição

- **Status:** Aceito
- **Data:** 2026-10-15
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../../.opencode/oh-my-opencode-slim.json`](../../.opencode/oh-my-opencode-slim.json), [`../../opencode.jsonc`](../../opencode.jsonc), [`../../AGENTS.md`](../../AGENTS.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

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
| `orchestrator` | `[space-bunny-free, big-pickle]` | único agente com reserva; primário é `space-bunny-free` |
| `oracle` | `step-5-preview-free` | 8/8 linhas citadas conferidas em `arquivo:linha` |
| `librarian` | `deepseek-v4.1-flash-free` | leu a doc **e** o código instalado do Next para fechar lacuna da doc |
| `explorer` | `longcat-2.5-preview-free` | 10/10; localizou o `withAuth` em uso, que o rival errou |
| `designer` | `muse-spark-1.3-contributor-free` | 12/12 tokens conferidos em `variables.css`; zero alucinação |
| `fixer` | `mimo-v2.6-flash-free` | 9/9 testes; formatação e não-mutação reconferidas fora do agente |

A escolha partiu de uma bateria de **15/10/2026**: uma tarefa real por modelo free,
com a resposta conferida em `arquivo:linha` antes de aceitar. A regra de escolha foi
"o modelo com menos erros verificáveis na tarefa que ele vai executar de fato", não
"o modelo mais rápido" nem "o mais capaz no geral".

A ausência de repetição **substitui** a cadeia como mecanismo de resiliência: como
não há modelo compartilhado, a queda de um atinge um agente só. O orchestrator
mantém reserva explícita porque é o único cujo modelo afeta toda a sessão.

### Ordem do orchestrator: primário adiado

A bateria favoreceu `big-pickle` no papel de orquestração, e a primeira versão deste
ADR o colocava como primário. **O mantenedor inverteu a mesma dia**: `space-bunny-free`
é o primário e `big-pickle` a reserva.

O motivo é o peso da evidência, não um resultado novo: a bateria mediu o **modelo** numa
tarefa pontual, através de outro agente como proxy — não a sessão inteira, que é o que
o orchestrator de fato executa. Sem o `orchestrator-bench` rodado no papel real, a troca
de primário seria um salto de confiança que a medição não sustenta. Na ausência de
evidência nova, vale o modelo que já estava em produção.

Essa inversão também remove o risco de privacidade que a primeira versão carregava:
`space-bunny-free` é o único dos dois com `zero-retention` registrado, enquanto
`big-pickle` não tem essa propriedade verificada (ver "Negativas e riscos").

Este ADR foi editado **antes de entrar em vigor** — o slim não recarrega config a quente
e `opencode debug agents` ainda mostrava a distribuição anterior. Não é, portanto, um
caso de mudar decisão aceita: é o registro da decisão final, já com a ordem correta.

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

## Consequências

### Positivas

- Nenhum modelo é compartilhado entre agentes: a queda de um afeta um agente só.
- Cada agente recebe o modelo que foi medido na tarefa que ele executa, não um
  modelo genérico escolhido por conveniência.
- O critério é reproduzível — a bateria de medição é reexecutável, e o porquê de cada
  modelo está no comentário do próprio preset.

### Negativas e riscos

- **A garantia de privacidade vale só para o primário.** `space-bunny-free` tem
  `zero-retention` registrado (Cenário 3, pesquisa de 03/10/2026) — é por isso que ele é
  o primário. `big-pickle`, agora reserva, **não tem essa propriedade verificada** e o
  benchmark não a confirma: se o primário cair e o turno for para ele, tratar como free
  tier comum. Em qualquer dos casos, prompts e código do projeto vão a servidores
  remotos (EUA) e podem ser usados para melhorar o modelo — o aviso permanece em
  `opencode.jsonc`.
- **`big-pickle` foi medido por proxy, não no papel real.** Não existe subagente
  `orchestrator`; ele foi exercitado no papel de orquestração através de outro
  agente. O veredito é mais fraco que o dos demais.
- **Cota Zen por IP/dia.** A bateria consumiu parte dela; execuções longas em paralelo
  podem esgotá-la.
- **Modelos free podem desaparecer sem aviso.** Não há substituto automático: se um
  dos seis sair do catálogo, o agente fica sem modelo até re-benchmarkar.
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

Em particular, a **ordem do orchestrator** deve ser revista quando o
`orchestrator-bench` rodar no papel real (comparando `big-pickle` e
`space-bunny-free` como primários). É essa evidência que está faltando para justificar
a troca — não uma nova medição pontual, que é o que a bateria de 15/10/2026 já fez.