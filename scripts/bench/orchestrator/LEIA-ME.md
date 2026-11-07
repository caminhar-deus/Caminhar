# Bench do `orchestrator`

Mede o **papel do orchestrator**: o agente primário da sessão. Nenhuma outra bateria
deste projeto mede esse papel — ele não existe como subagente, a tool `subagent` não o
alcança, e as baterias de 15/10 e 16/10/2026 o exercitaram **por proxy** (outro agente
fazendo o trabalho de orquestração). O `docs/adr/0008` registra essa medição por proxy
como a evidência mais fraca da pilha; o primário atual (`deepseek-v4.1-flash-free`) foi
medido no papel real em 04/11/2026, e o bench continua existindo para não apontar um id
novo sem medição — a regra "medir por papel antes de promover".

## Como rodar

```bash
# 1. Conferir o que vai rodar, sem gastar cota
npm run bench:orch:rodar -- --dry-run

# 2. Rodar (3 execuções por modelo, ~200 req/dia de cota Zen por IP — comece por -n 1)
npm run bench:orch:rodar -- --repeticoes 1

# 3. Camada A: sinais automáticos (delegou, citações, contaminação)
npm run bench:orch:conferir
```

Modelos específicos:

```bash
npm run bench:orch:rodar -- --modelo opencode/deepseek-v4.1-flash-free --repeticoes 3
```

Outras opções:

| Opção | Padrão | Para quê |
|---|---|---|
| `--turno 1\|2` | 1 | Turno 1 abre a sessão; turno 2 continua a sessão do turno 1 (ver abaixo). |
| `--timeout-min N` | 20 | Corta a execução e mantém o parcial. Uma sessão travada não pode segurar o bench inteiro. |
| `--sobrescrever` | — | Refaz uma execução já salva. |
| `--dry-run` | — | Roda o preflight e o planejamento, confere os modelos e imprime os comandos reais (com o `sessionID` do turno 2), sem gastar cota nem criar arquivo. |

A saída é gravada **em streaming**: uma execução morta no meio deixa no `.ndjson` o que
deu certo até ali, e o `.meta.json` registra `excedeuTimeout: true`.

Sem `-m`, roda `deepseek-v4.1-flash-free` e `glm-5.3-flash-free` (o primário e a reserva
do ADR-0008 em 04/11/2026). O runner confere cada id contra `opencode models` **antes** de
executar: um id fora do catálogo falha em silêncio no spawn e a execução vazia pareceria
uma falha do modelo. O default já esteve em `space-bunny-free`/`big-pickle`; os dois saíram
do catálogo e o preflight passou a acusar isso antes de qualquer sessão.

## Isolamento da memória (ai-memory)

O bench abre **sessões reais** do OpenCode, e o plugin do ai-memory grava cada sessão no
projeto do `.ai-memory.toml` mais próximo do cwd. Rodar direto na cópia de trabalho do
projeto enche o histórico real de sessões de medição — foi o que aconteceu na bateria 9×5:
o marcador de `/var/tmp/free-matrix` declarava `pessoal/caminhar`, e ~55 sessões de bench
entraram no histórico do projeto (15 avisos de título duplicado no lint).

Por isso o bench só roda numa **cópia isolada** cujo marcador aponta para o projeto de
medição:

```toml
workspace = "default"
project = "bench"
```

Preparar uma cópia nova:

```bash
cp -a /home/gus/projetos/Caminhar /var/tmp/bench-copy
cd /var/tmp/bench-copy
# edite .ai-memory.toml: workspace = "default" e project = "bench"
git add .ai-memory.toml
git commit -m "chore: isolate bench memory in default/bench"
```

O commit importa: `restaurarArvore()` devolve arquivo **rastreado** com `git checkout --`,
então um marcador só modificado voltaria ao valor do projeto real na primeira execução.
Os dois runners chamam `exigirMarcadorDeBench()` (em `scripts/bench/runner-comum.js`) antes
de qualquer spawn — inclusive do `opencode models` — e abortam com código 1 quando o
marcador não é `default/bench`. Rodar de `/home/gus/projetos/Caminhar` deixa de ser
possível, de propósito.

As sessões antigas da bateria 9×5 continuam em `pessoal/caminhar` como histórico — não
apague páginas de sessão só para zerar aviso de lint (decisão registrada no ADR-0035,
§"Isolamento do bench"). O `ai-memory audit-contamination` pode apontá-las depois da troca
de projeto da cópia: é falso positivo histórico esperado.

## Guarda de árvore do bench de papéis

O bench de papéis (`papeis/rodar.js`) restaura o repo ao HEAD depois de cada sessão: a
tarefa do `fixer` edita arquivos, e a execução seguinte precisa partir do mesmo estado.
A restauração é destrutiva por desenho, então o runner é **fail-closed** em
`scripts/bench/arvore.js`:

- antes de uma execução real, `exigirArvoreLimpa()` recusa a árvore com qualquer
  alteração **fora de `scripts/bench`** (commit ou stash antes de rodar); o `--dry-run`
  é isento porque não restaura nada;
- depois da sessão, só os caminhos reportados por `git status --porcelain=v1 -z` são
  restaurados (`git checkout HEAD --`) ou removidos (não rastreados); espaço, acento e
  caminho citado deixam de ser ambíguos;
- renomeação/cópia **falha fechada** em vez de adivinhar qual lado restaurar;
- `scripts/bench` inteiro é preservado: scripts, gabaritos e resultados são trabalho do
  projeto, não sujeira da execução.

O runner de papéis grava no `.meta.json` o `sessionID` e `excedeuTimeout` — um timeout
deixa de passar por execução normal e o turno seguinte tem a sessão para continuar.

## O que cada arquivo é

| Arquivo | Papel |
|---|---|
| `tarefa.md` | O prompt enviado ao modelo. Não edite durante uma série. |
| `gabarito.md` | Resposta conferida em `arquivo:linha`, linha a linha. **Não pode ser lido pelo modelo.** |
| `rubrica.md` | Como pontuar: Camada A (automática), B (acerto) e C (orquestração). |
| `rodar.js` | Executa e salva `resultados/<modelo>-<n>.ndjson` + `.meta.json`. |
| `conferir.js` | Camada A: delega, citações válidas, contaminação. |
| `../ground-truth.js` | Inventário de `pages/api/`, fatos do disco e verificação dos instrumentos (compartilhado com o bench de papéis). |
| `../citacoes.js` | Resolvedor de citação `arquivo:linha` compartilhado entre conferidores e ground truth. |
| `../runner-comum.js` | Execução de comando/sessão (streaming, timeout e `sessionID`), catálogo de modelos, `STDIO` e guarda do marcador — usado pelos dois runners. |
| `../arvore.js` | Guarda de árvore limpa e restauração do repo do bench de papéis (NUL-safe, preserva `scripts/bench`). |

## Fail-fast: o instrumento é conferido antes do spawn

Antes de chamar `opencode models` ou abrir qualquer sessão, `rodar.js` verifica o
instrumento deste bench contra a árvore de trabalho (`verificarInstrumento` em
`scripts/bench/ground-truth.js`). A bateria só começa se:

- toda citação `arquivo:linha` de `gabarito.md` e `rubrica.md` resolver no disco
  (projeto, `node_modules/next/dist`, abreviações e fontes externas pela mesma regra
  do conferidor);
- toda âncora declarada existir **e** estiver coberta por uma linha citada no
  documento correspondente;
- as contagens escritas baterem com o inventário real de `pages/api/` (arquivos e
  rotas com `export default`);
- as afirmações de conteúdo ainda descreverem o disco.

Se algo divergir, o runner imprime a lista de problemas e sai com código 1 — sem
gastar cota. A correção é recalibrar o instrumento na mesma rodada (ADR-0008), não
afrouxar a checagem. O planejamento também é read-only e falha antes do primeiro
`run` quando há colisão de nome de saída (dois modelos com o mesmo nome curto) ou,
no turno 2, quando falta o `.meta.json` com `sessionID` de alguma execução do turno 1.

Para ver o preflight sem executar:

```bash
npm run bench:orch:rodar -- --dry-run
```

## O que ele faz, tecnicamente

`opencode run --model <id> --format json --auto` abre uma **sessão real** com o host. O
`--model` troca **só o agente primário**: `explorer`, `oracle`, `designer` e `fixer`
continuam com os modelos do preset, o que isola a variável — o que muda entre execuções é
exatamente o modelo do orchestrator.

**Não precisa de `OPENCODE_API_KEY`.** O bench de 16/10/2026 exigia chave porque chamava a
API do Zen de fora, e o free tier recusa esse caminho ("can only be used from within
OpenCode", ver `docs/adr/0008`). Aqui a execução passa pelo host, que já tem credencial
guardada.

`--auto` aprova o que não estiver explicitamente `deny` no `opencode.jsonc` — sem ele o
orchestrator trava pedindo permissão para delegar. Leia as permissões antes: o bench não é
sandbox.

## Contaminação — a fraqueza conhecida

O gabarito precisa ficar no repositório (`/tmp` foi justamente o que perdeu o bench
anterior), e o modelo tem acesso de leitura ao repositório inteiro. A defesa é em três
camadas: a tarefa proíbe explicitamente, o runner reforça a proibição, e o `conferir.js`
marca a execução como contaminada quando alguma **tool** tentou abrir algo sob
`scripts/bench/`.

O detector olha os campos que representam arquivo (`path`, `pattern`, `command`, …), não
o texto. Isso não é detalhe: no smoke test o modelo **repassou ao subagente a própria
proibição** de ler o diretório, e uma busca em qualquer campo marcaria toda execução como
contaminada — inclusive as honestas.

**Contaminação não é "nota zero", é execução descartada** — um modelo que leu o gabarito
parece perfeito e não mediu nada.

## O `subagent` é SEMPRE assíncrono — isso invalida a execução de turno único

Achado que decide como este bench deve ser rodado (medido em 19/10/2026, série de 6
execuções).

A tool `subagent`, neste host, **ignora o parâmetro `background`**: tanto
`background: true` quanto a ausência dele devolvem a mesma coisa —

> The subagent is working in the background (sessionID: `ses_...`). You will be notified
> automatically when it finishes. DO NOT sleep, poll for progress…

O resultado chega depois, como notificação, e **`opencode run` já devolveu**. Nas 6
execuções da série, todas terminaram com a resposta final sendo só o aviso de que a
delegação tinha sido disparada. Nenhum modelo conseguiu reconciliar dentro do turno.

Consequência: **rodar `--repeticoes N` sozinho não mede o que este bench existe para
medir.** Um modelo que delega não tem como entregar a resposta final, e um que não delega
entrega a resposta sem orquestrar. Os dois lados do alvo ficam de fora.

O que resolve: **um segundo turno na mesma sessão**, com o resultado do subagente já
disponível.

```bash
# o sessionID de cada execução está no .meta.json
opencode run --session <sessionID> --model <modelo> --format json --auto \
  "Os agentes já terminaram. Reconcilie o que eles trouxeram e entregue a auditoria final, \
   no formato pedido na tarefa original."
```

Faça isso **igualmente para todos os modelos** — um com segundo turno e outro sem mede
metodologia, não modelo. E registre que a tarefa mudou, como diz a `rubrica.md`.

## Se a execução "não rodar" e o `.ndjson` ficar com 0 bytes

Quase sempre é o `opencode run` **travado lendo stdin**. Medido em 19/10/2026, custando
duas execuções: lançado via `spawn` do Node com o `stdio` padrão, o filho herda um stdin que
ninguém escreve nem fecha, e o comando trava **antes de abrir a sessão** — zero bytes,
nenhum processo, nenhum erro. Do bash o comando idêntico passa, porque o shell entrega
stdin já fechado.

```js
// ERRADO: stdin de pipe que ninguém fecha
spawn('opencode', args, { cwd: RAIZ });

// CERTO: stdin ignorado é stdin em EOF
spawn('opencode', args, { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] });
```

O `rodar.js` já faz certo. Se você chamar `opencode run` por script, copie a linha acima.

## O que NÃO medir

- **Velocidade.** A cota do Zen é por IP/dia e a latência varia por servidor.
- **Os outros agentes.** Eles ficam fixos no preset; só o primário muda.
- **Sessão longa.** Uma execução é uma sessão curta, de uma tarefa. A diferença entre isso
  e um dia de trabalho continua sem medição — e é parte do que o ADR-0008 já apontava.

## Depois de rodar

1. `npm run bench:orch:conferir` e abrir `resultados/conferencia.md`.
2. Julgar as Camadas B e C da `rubrica.md` — fora do modelo, como em toda bateria deste
   projeto. Use a **mediana** de 3 execuções; o que separa um modelo do outro é erro
   verificável na Camada B, e a Camada C é o desempate.
3. Registrar em `docs/adr/0008` (seção datada) e no `CHANGELOG.md`. Só mexer no primário do
   preset se a evidência sustentar — foi o critério que manteve o `space-bunny-free` no
   primário até ele sair do catálogo.