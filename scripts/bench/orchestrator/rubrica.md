# Rubrica — como pontuar uma execução

O que separa este bench dos outros do projeto é o alvo: **não estamos medindo quem acha o
gabarito, e sim quem conduz**. Um modelo pode acertar as quatro perguntas sem orquestrar
nada, e isso não interessa aqui.

Por isso a pontuação tem duas camadas: o que o `conferir.js` mede sozinho, sem juízo, e o
que só uma pessoa (ou um `oracle`) julga depois, contra o `gabarito.md`.

**Regra que vale para as duas camadas: a conferência é feita fora do modelo.** Nenhuma
nota do próprio modelo entra na conta. É o mesmo critério das baterias de 15/10, 16/10 e
19/10/2026.

## Camada A — automática (`npm run bench:orch:conferir`)

| Sinal | Como é medido | Por que importa |
|---|---|---|
| **Delegou** | A saída crua menciona a tool `subagent` | Sem delegação não houve orquestração, por definição |
| **Citações válidas** | De cada `arquivo:linha` citado, o arquivo existe e tem a linha | Citação que não abre é erro verificável, o mesmo critério das outras baterias |
| **Citações inventadas** | O inverso | O erro mais caro de um modelo free é o `arquivo:linha` que não existe |
| **Contaminação** | A saída menciona `scripts/bench/` | Leitura do gabarito invalida a execução |

Contaminação não é "nota zero": é **execução descartada**. Um modelo que leu o gabarito
parece perfeito e não mediu nada.

## Camada B — julgamento humano, contra o `gabarito.md`

**B1. Pergunta 1 — contagem de rotas.** Acertou 32 arquivos e 31 rotas, e nomeou o arquivo
que não é rota? Se disse 32 rotas sem ressalva, é erro.

**B2. Pergunta 2 — grupos e ponto de aplicação.** Os quatro grupos estão lá, com as
contagens certas? As citações apontam para onde a autenticação é **aplicada**
(`adminCrudHandler.js:331`) e não para o import? `settings.js` aparece nos dois grupos a que
pertence?

**B3. Pergunta 3 — o que responde sem token.** Separou o que é intencional do que é leitura
pública? Citou o `405` que impede escrita anônima nas rotas de leitura, ou apenas disse que
"o GET é público" — essa é a diferença entre saber e supor?

**B4. Pergunta 4 — a rota sem proteção própria.** Achou `pages/api/uploads/[...path].js` e
apontou de onde vem a proteção (`next.config.js`)? Só isso já vale o ponto: o gabarito
aceita que o modelo não chegue ao porquê de a regra estar no `headers()` e não na rota.

## Camada C — o que realmente diferencia (o papel do orchestrator)

Esta camada vale mais que as outras três juntas. Um modelo pode acertar B1-B4 e ser um
orchestrator ruim.

| # | Pergunta | Sim / Não |
|---|---|---|
| C1 | Delegou a **varredura ampla** a quem varre bem, e a **revisão crítica** a quem contesta? | |
| C2 | As delegações foram úteis, ou houve subagente contratado para refazer o que ele já sabia? | |
| C3 | A resposta final **reconcilia** o que os subagentes trouxeram, ou apenas cola as saídas em sequência? | |
| C4 | Conferiu o que veio do subagente, ou repassou como está? | |
| C5 | Parou de delegar quando tinha resposta suficiente, ou continuesso? | |
| C6 | Um subagente deu errore timeout: a resposta final degrade bem, ou o modelo travou? | |

C6 só pontua se acontecer. Não provoque erro para testar isso: um bench que cria falha
artificial mede outra coisa.

## Delegação em background encerra o turno — leia antes de pontuar

Achado do primeiro smoke test (19/10/2026, `beam-free`): o modelo delegou a varredura com
`subagent(..., background: true)`, disse que aguardaria a notificação, e **o `opencode run`
devolveu em 8 segundos**, com a resposta final sendo só "lançei o agente, aguardo". O
resultado do subagente chega depois, na sessão — não dentro daquela execução.

Isso é comportamento do host, não defeito do bench, e tem duas leituras:

- **Se a resposta final é só o anúncio da delegação**, o modelo apontou o trabalho e não
  entregou o resultado: Camada B fica incompleta e Camada C perde o item C3 (reconciliar).
  Não é erro do modelo por não saber a resposta — é por ter parado antes de tê-la.
- **Se a resposta final veio completa**, o modelo resolveu na mão depois de delegar (ou
  esperou), e aí a Camada C é bem avaliada normalmente.

Quem quiser medir a reconciliação completa pode dar um segundo turno na mesma sessão:

```bash
opencode run --session <sessionID> --model <modelo> --format json --auto "Finalize a auditoria com o que os agentes trouxeram."
```

O `sessionID` está no `.meta.json` de cada execução. Isso muda a tarefa, então use ou
não use **igualmente para todos os modelos** — comparar um modelo com segundo turno contra
outro sem ele não mede modelo, mede metodologia.

## Como transformar em veredito

Anote os 6 sinais da Camada A, os 4 itens da Camada B e as 6 respostas da Camada C por
execução. Repita `--repeticoes 3` por modelo. O que interessa é a **mediana**, e o desvio
entre execuções do mesmo modelo: um modelo que acerta 4/4 uma vez e 1/4 outra vez está
medindo ruído, não capacidade.

Compare os modelos por **nenhum erro verificável na Camada B** primeiro, como nas outras
baterias. A Camada C é o desempate.

## O que este bench NÃO mede

- **Velocidade.** O tempo aparece no `.meta.json`, mas cota do Zen é por IP/dia e a latência
  varia por servidor; não use como critério.
- **A bateria completa dos outros agentes.** Aqui só o modelo primário muda; `explorer`,
  `oracle`, `designer` e `fixer` continuam com os modelos do preset.
- **Comportamento em sessão longa.** Uma execução é uma sessão curta. O ADR-0008 registra
  que a bateria de 15/10 mediu tarefa pontual por proxy e por isso não bastou — este bench
  cobre parte disso, não tudo. A diferença entre "sessão de uma tarefa" e "sessão de um dia
  de trabalho" continua sem medição.