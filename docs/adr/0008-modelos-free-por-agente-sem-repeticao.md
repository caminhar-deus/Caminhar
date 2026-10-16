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
| `orchestrator` | `space-bunny-free` | sem reserva — ver "Saídas do catálogo" |
| `oracle` | `nemotron-3.5-super-vl-free` | achou a causa da escalada de privilégio, não o sintoma — ver "Saídas do catálogo" |
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
- **O orchestrator está sem reserva desde 16/10/2026.** Uma indisponibilidade do primário
  deixa a sessão sem orquestrador, sem recovery automático. Consequência direta de
  `big-pickle` ter saído do catálogo.
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

- **Orchestrator sem reserva.** Rodar o `orchestrator-bench` no papel real para escolher um
  substituto do `big-pickle`. O script existe e está em `/tmp/opencode/bench-orch/`; exige
  `OPENCODE_API_KEY` no ambiente de quem roda. Também decide se `space-bunny-free` se sustenta
  como primário.
- **Privacidade do `oracle` não verificada.** `nemotron-3.5-super-vl-free` é hoje o único
  dos seis sem garantia de retenção registrada. Se isso for requisito, verificar antes do
  próximo uso com código sensível.
- **Ruído de formato do `oracle`.** Ele não complyou o formato pedido numa das execuções.
  Se isso aparecer em revisão real, o critério de troca precisa considerar acabamento, não só
  capacidade de achado.