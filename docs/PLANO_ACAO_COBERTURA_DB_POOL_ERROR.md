# Plano de Ação — Cobertura do handler de erro fatal do pool (`lib/infra/db.js:136`)

> Documento de análise e plano. **Nada foi implementado.** Este arquivo apenas relata
> o diagnóstico e propõe opções para decisão do dono.

## 1. Resumo executivo

A linha **`lib/infra/db.js:136`** é a primeira instrução de um handler de evento
**`.on('error')`** registrado no pool de conexões PostgreSQL. Ele é o "pára-quedas" do
sistema: dispara quando o banco cai, a conexão TCP morre ou o socket é perdido — situações
**fatais**, nas quais o pool inteiro precisa ser descartado e recriado. Sem ele, um erro
fatal assíncrono do driver `pg` se torna uma **exceção não capturada que derruba o processo**
(`unhandled 'error' event`), especialmente crítico em produção.

O handler **não está coberto por nenhum teste** e, com o mock atual do `pg`, é
**impossível** dispará-lo: o mock define `on: jest.fn()` — uma função vazia que nunca invoca
o callback registrado. Um `EventEmitter` real do `pg` invoca o handler quando emite o evento
`'error'`; o mock não emula esse comportamento. Por isso a cobertura mostra as linhas
`136-147` como descobertas.

**Natureza do item:** é uma **lacuna de cobertura**, não um bug conhecido. O código está
correto à leitura. O risco é *não ter prova de que ele funciona* — e é justamente o código que
só roda na pior hora.

## 2. O que exatamente está em `lib/infra/db.js:136`

O trecho real (linhas 134-148):

```js
  // Handler para erros fatais no pool (ex: banco caiu, conexão perdida)
  newPool.on('error', async (err) => {
    logger.error('DB', 'Erro fatal no pool de conexões PostgreSQL:', err.message);   // ← linha 136
    // Tenta recriar o pool automaticamente em caso de erro fatal
    try {
      await newPool.end();
    } catch {
      // Ignora erro ao tentar fechar pool já defeituoso
    }
    // Se o pool atual ainda for o mesmo que falhou, reseta a referência
    if (pool === newPool) {
      pool = null;
      logger.info('DB', 'Pool de conexões recriado após erro fatal');                  // ← linha 146
    }
  });
```

A linha 136 é parte de um handler de 3 efeitos em cadeia:

1. **Loga** o erro fatal (`logger.error`), com nível `error` — o único nível que o logger
   mantém ativo em ambiente de teste (`resolveLogLevel` em `lib/infra/logger.js:37`).
2. **Encerra** o pool defeituoso (`await newPool.end()`), **tolerando falha** no `end()`
   (o `catch {}` silencioso — um pool já quebrado pode não fechar).
3. **Reseta a referência global** `pool = null` (só se ainda for o mesmo pool), para que a
   próxima chamada a `getPool()` crie um pool novo, e loga em `info`.

É um **autociclo de recuperação**: o pool se recria sozinho após uma falha fatal.

## 3. Por que ele não é disparável hoje (análise profunda)

### 3.1 A cadeia completa

```
createPool()                       lib/infra/db.js:111
  └─ new Pool({...})               lib/infra/db.js:123    ← instância criada
  └─ newPool.on('error', cb)       lib/infra/db.js:135    ← handler registrado
       └─ cb(err) deveria ser invocado pelo EventEmitter do pool quando
          o driver pg detecta uma falha fatal de conexão.
```

O `cb` só é executado se **alguém emitir o evento `'error'`** na instância do pool. No `pg`
real, é o próprio driver que emite — a partir do socket/cliente interno — quando a conexão
morre de forma inesperada.

### 3.2 O bloqueio no mock

`__mocks__/pg.js:32-46` define a instância do Pool assim:

```js
function poolImplementation() {
  return {
    query: mockQuery,
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),                                 // ← não emite, não guarda, não invoca
    connect: jest.fn().mockResolvedValue({ query: mockQuery, release: jest.fn(), on: jest.fn() }),
    totalCount: 0, idleCount: 0, waitingCount: 0,
  };
}
```

`on: jest.fn()` é um **espião vazio**: registra que `on()` foi chamado (e com quais
argumentos), mas **descarta o callback**. Não há nenhum caminho pelo qual o teste consiga
fazer o handler rodar — porque o mock não é um `EventEmitter`.

Confirmado pela cobertura medida agora:

```
File    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
db.js   |   78.71 |    83.33 |   84.61 |   78.71 | 26-57,114-121,136-147,152-153,171,197-198,...
```

`136-147` = o handler inteiro, descoberto. **Nenhum teste do repositório** chama `.emit('error')`
nem cobre "Erro fatal no pool" (verificado por grep em `tests/`).

### 3.3 Por que isso passou despercebido

- O mock `on: jest.fn()` **aceita** a chamada de registro (`newPool.on('error', cb)`) sem
  erro — a linha 135 "executa" (é contada como coberta), mas o *corpo* do callback nunca roda.
- Não há threshold de cobertura específico para `lib/infra/` (só `lib/domain/` e
  `pages/api/admin/` têm thresholds próprios em `jest.config.js`). O arquivo cai na média
  global, que está acima do mínimo — então a lacuna não reprova o gate.
- O ambiente de teste desliga de propósito os caminhos de tempo real (`startHealthCheck`
  sai cedo se `NODE_ENV === 'test'`, `db.js:20`; o pré-aquecimento também é pulado, `db.js:160`).
  O handler de erro ficou no mesmo pacote de "coisas de produção" e nunca ganhou teste próprio.

## 4. Impacto e risco

| Dimensão | Avaliação |
|---|---|
| **Correção do código** | Nenhum bug identificado à leitura. O handler faz o que promete. |
| **Risco em produção** | **Alto se regredir silenciosamente.** É o único ponto que impede um erro fatal do pool de virar `unhandled error` e derrubar o processo. Um teste ausente significa que uma refatoração futura pode quebrá-lo sem ninguém notar. |
| **Risco hoje** | Baixo (o código está certo). O risco é *futuro*: regressão invisível. |
| **Impacto no gate de CI** | Nenhum direto — `lib/infra/` não tem threshold. Só puxa a média global para baixo. |
| **Custo de não fazer** | A linha mais crítica de resiliência do banco permanece a única sem prova. |

**Ponto de atenção adicional descoberto na análise:** o reset do pool (`pool = null`) e o
`logger.info` da linha 146 também estão descobertos, na mesma lacuna. E há uma sutilidade de
corrida: o handler só reseta `pool` **se `pool === newPool`** — se um `resetPool()` já tiver
trocado a referência, o handler **não** deve mexer nela. Isso é uma regra de negócio
(evitar "ressuscitar" um pool obsoleto) que merece asserção própria.

## 5. Grau de dificuldade de cobertura

**Baixo para os efeitos diretos, médio para a variante de corrida.** O handler é uma função
pura do ponto de vista de teste, desde que o teste possa **capturar o callback** e
**invocá-lo manualmente**. Duas abordagens viáveis, ambas baratas.

### 5.1 O que precisa ser provado (critérios de teste)

1. Ao receber um erro, o handler **loga** `logger.error('DB', 'Erro fatal no pool de conexões PostgreSQL:', <mensagem>)`.
2. O handler **chama `end()`** no pool que falhou.
3. Se `end()` **rejeitar**, o handler **não propaga** a exceção (o `catch {}` engole).
4. Se `pool === newPool`, o handler **zera a referência** (e loga em `info`).
5. Se `pool !== newPool` (pool já substituído), o handler **NÃO** altera a referência global.

Os itens 1-4 são cobertura direta. O item 5 é a **regra de corrida** citada em §4.

## 6. Opções (para decisão do dono)

### Opção A — Testar capturando o callback no mock do pool (sem tocar em `__mocks__/pg.js`)

O teste monta um `mockPoolInstance` cujo `on` **guarda** o callback:

```js
let handlerRegistrado;
mockPoolInstance.on = jest.fn((evento, cb) => { if (evento === 'error') handlerRegistrado = cb; });
// ... getPool() ...
await handlerRegistrado(new Error('Falha fatal'));
expect(logger.error).toHaveBeenCalledWith('DB', 'Erro fatal no pool de conexões PostgreSQL:', 'Falha fatal');
```

- **Prós:** zero mudança no mock compartilhado; o teste local controla tudo; cobertura dos
  itens 1-5; segue o estilo de `tests/unit/lib/db.test.js` (que já sobrescreve `mockPoolInstance`).
- **Contras:** o teste **reimplementa** a captura do evento — não prova que o mock `pg`
  *de verdade* emite `'error'`. É uma prova do *handler*, não do *driver*.
- **Esforço:** baixo (~30 linhas no `db.test.js` existente).

### Opção B — Tornar o mock do pool um EventEmitter real (`__mocks__/pg.js`)

O mock passa a emitter de verdade (`on` guarda listeners; expõe um `emit`), imitando o `pg`.

- **Prós:** mais fiel ao driver; habilita disparo "natural" do handler em qualquer suíte;
  reutilizável (outros testes que dependam de eventos do pool ganham a capacidade).
- **Contras:** mexe em **infra compartilhada de mock** (toca dezenas de testes que importam
  `pg`) — exige rodar a suíte inteira e cuidado para não mudar comportamento existente;
  risco de efeito colateral em `on: jest.fn()` que hoje é assertado em algum teste.
- **Esforço:** médio, com validação ampla.

### Opção C — Testar via `EventEmitter` de verdade, isolando `createPool`

O teste substitui a classe `Pool` do mock por um `EventEmitter` real (via
`Pool.mockImplementation`), emite `'error'` de fato e observa os efeitos.

- **Prós:** disparo real do evento (não captura manual de callback); sem tocar no mock global.
- **Contras:** o objeto emitido precisa também ter `connect`/`end`/`query` (senão
  `getPool`/`createPool` quebram antes); mais montagem no teste.
- **Esforço:** baixo-médio.

### Opção D — Não testar; registrar como risco aceito

Documentar a lacuna como risco conhecido (num ADR ou seção de pendências) e seguir.

- **Prós:** nenhum custo imediato.
- **Contras:** mantém a única linha crítica de resiliência do banco sem prova; uma regressão
  futura passa em silêncio (a suíte não a pegaria).
- **Esforço:** apenas documentação.

### Opção E — Testar + endurecer

Qualquer uma de A/B/C **mais** adicionar threshold de cobertura para `lib/infra/` em
`jest.config.js`, para que a lacuna não volte sem ser notada.

- **Prós:** trava a regressão na raiz — combina com a filosofia do trabalho P3 anterior
  (o invariante que impede o silêncio). É a opção mais alinhada ao que o projeto acabou de
  adotar: *não deixar buraco silencioso*.
- **Contras:** um threshold a mais para manter; precisa calibrar o número (não pode reprovar
  o CI hoje).
- **Esforço:** baixo, depois de A/B/C.

## 7. Recomendação

**Recomendo a Opção A + E** (testar capturando o callback **e** adicionar threshold para
`lib/infra/`):

- **A** resolve a lacuna com o menor risco (não toca infra compartilhada) e cobre os 5
  critérios de §5.1, inclusive a regra de corrida do item 5.
- **E** impede que outra lacuna silenciosa apareça em `lib/infra/` — o mesmo raciocínio que
  motivou o invariante de `console.error` da sessão anterior.
- A **Opção B** só vale a pena se você quiser fidelidade ao driver e tiver apetite para
  validar a suíte inteira após mexer em `__mocks__/pg.js`. A **D** é aceitável se o dono
  preferir não gastar agora, mas deixa a linha mais crítica sem prova.

## 8. Pendências relacionadas (não cobertas por este plano)

- `lib/infra/db.js` tem **outras** linhas descobertas além de 136-147: `26-57`
  (health check periódico — desligado em teste de propósito), `114-121` (limpeza de timer
  duplicada em `createPool`), `152-153`, `171`, `197-198`, `232-237`, `244-249`, `264-271`,
  `290`, `304-311`. Este plano mira **apenas** o handler de erro fatal (linha 136).
- O **health check** (`startHealthCheck`, `db.js:17`) é um candidato a teste separado
  (depende de timers — exige fake timers), mas tem risco menor que o handler de erro.
