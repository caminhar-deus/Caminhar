# Plano de Ação — P3: filtro global de `console.error` nos testes

> **Status:** proposta, aguardando aprovação. Nada foi alterado.
> **Data:** 2026-10-22
> **Área:** infraestrutura de testes (não é site público nem painel — regras do
> `AGENTS.md` §0.1 não se aplicam; ver "Classificação" ao final).

## 0. O que é o P3

Duas linhas do projeto substituem `console.error` por um wrapper que **descarta
silenciosamente** qualquer mensagem cujo **primeiro argumento, sendo string,
contenha um dos padrões da allowlist** — por substring, sem escopo de teste e
sem qualquer registro do que foi descartado:

- `tests/setup.js:173-181` — carregado por **todas** as 201 suítes (via
  `jest.config.js:78`, `setupFilesAfterEach`), com 6 padrões em `ALL_FILTERS`.
- `tests/setup.db.js:82-90` — segundo wrapper, duplicado, com 2 padrões
  próprios (`KNOWN_API_WARNINGS`), carregado só por `*.db.test.js`.

É o único ponto do projeto capaz de apagar um erro real com **rastro zero**: se
um teste futuro emitir uma mensagem que case com um padrão, o `console.error`
some da saída e nada indica que sumiu.

## 1. Estado validado (2026-10-22)

Tudo abaixo foi conferido no checkout atual, `main`, tree limpo, merge `3665e81`
contido no HEAD.

| Fato | Evidência |
|---|---|
| `tests/setup.js` não é tocado desde 2026-09-20 | `git log -- tests/setup.js` → último `72fa95d` (adicionou o padrão do `<script>`) |
| `tests/setup.db.js` não é tocado desde 2026-10-04 | `git log -- tests/setup.db.js` → último `dd2f2c6` |
| A suíte cresceu para **201** arquivos / 195 passando / 1418 testes | `npx jest` → `195 passed, 1418 passed, 1491 total`, 22,6 s |
| `console.error` na saída = **0** | `grep -c 'console\.error'` no log = 0 |
| Restam **146** blocos `console.log` (scripts de seed/setup) | `grep -c 'console\.log'` no log = 146 |
| Os mesmos 2 wrappers continuam idênticos ao inventário de 2026-10-06 | leitura direta das linhas |

### 1.1 Comportamento confirmado empiricamente (probe em scratch, removido)

Rodei três testes descartáveis (já apagados) contra o `setup.js` real:

1. `console.error('mensagem qualquer')` → **aparece** no relatório.
2. `console.error('prefixo API /api/posts retornou conteúdo inválido sufixo')` →
   **desaparece em silêncio**. Confirma: o match é **substring**, não igualdade,
   e basta a mensagem *conter* o padrão para o erro real ser engolido.
3. `console.error({ msg: 'API /api/posts retornou conteúdo inválido' })` →
   **aparece**. Confirma: só `args[0]` do tipo `string` é filtrado; um `Error`
   como primeiro argumento **nunca** é suprimido.

Conclusão do probe: o filtro é **mais estreito** do que "todo `console.error`"
(erros passados como objeto/Error passam), mas **mais largo** do que "só o log
intencional" (qualquer string que contenha o padrão some, mesmo num erro real).

### 1.2 Vivos × mortos: dos 6 padrões, 4 estão mortos

Verifiquei quais padrões têm **emissor** no código atual:

| Padrão (em `ALL_FILTERS`) | Emissor hoje | Situação |
|---|---|---|
| `Erro ao inicializar sistema de autenticação` | `lib/auth/auth.js:409` (`logger.error`) | **VIVO** |
| `Falha ao armazenar refresh token` | `lib/auth/auth.js:314` (`logger.error`) | **VIVO** (também citado em `tests/unit/lib/auth.test.js:58`, só comentário) |
| `Encountered a script tag while rendering React component` | runtime do React (`react-dom-client.development.js:13047`), disparado por `tests/mocks/next.test.js` | **VIVO** (emitido pela lib, não pelo projeto) |
| `ReactDOM.render is no longer supported` | nenhum | **MORTO** — React é `^19.3.1`; `ReactDOM.render` não existe mais |
| `React.createFactory()` | nenhum | **MORTO** — idem |
| `API /api/posts retornou conteúdo inválido` | nenhum | **MORTO** — nenhuma rota emite isso |
| `Isso geralmente significa que a rota API quebrou` | nenhum | **MORTO** — idem |

Os 2 padrões de API mortos continuam vivos **no `setup.db.js` também**
(`KNOWN_API_WARNINGS`, linhas 77-80) — ali são 2 de 2 mortos.

### 1.3 Terceiro ponto de silenciamento, até agora não catalogado no P3

`tests/setup.js:207-223` define `global.suppressWarnings(fn, patterns)`, que
substitui `console.warn` por substring durante a execução de `fn` e restaura no
`finally`. **Está definido e nunca é usado** (`grep -rn suppressWarnings` só
encontra a própria definição).

É o mesmo antipadrão do P3, na mesma classe de arquivo (`setup.js`), mas:
- silencia `console.warn`, não `console.error`;
- tem escopo (só durante `fn`) e restaura — **não vaza**;
- não tem chamador, então não esconde nada hoje.

Diferença de natureza: `suppressWarnings` é uma ferramenta com escopo correto,
apenas sem uso. O P3 é um wrapper **sem escopo** aplicado globalmente. Não
devem receber o mesmo tratamento.

### 1.4 O padrão correto já existe no projeto

`tests/helpers/console.js:34-42` — `filterConsoleError(suppressList)`:

```js
export const filterConsoleError = (suppressList = []) => {
  return jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args.join(' ');
    if (suppressList.some(pattern => msg.includes(pattern))) return;
    console.error(...args);
  });
};
```

Diferença que importa: é `jest.spyOn`, então `restoreMocks: true`
(`jest.config.base.js:25`) **restaura automaticamente** a cada teste — o
silenciamento morre junto com o teste que o pediu. É usado em exatamente 1
arquivo (`tests/unit/components/Performance/ImageOptimized.test.js:30`), com
lista local `['non-boolean attribute','jsx']`.

**Este é o modelo a generalizar** — não a remoção seca nem um `setup.js` global.

### 1.5 O outro vetor: `beforeAll` que zera o arquivo inteiro

Fora do P3, três arquivos anulam `console.error` no `beforeAll` e restauram no
`afterAll` — cegando o **arquivo inteiro**, com `restoreMocks: true` **não os
alcançando** (são atribuição direta, não spy):

- `tests/integration/api/admin/videos.test.js:30-31`
- `tests/integration/api/admin/backups.test.js:25-26`
- `tests/integration/api/admin/cache.test.js:45-46`

Some-se `tests/unit/components/Features/Testimonials/index.test.js:13` (mesmo
padrão, via `jest.fn()`). Eram 3 no inventário de 2026-10-06; hoje são 4.

### 1.6 Drift desde o inventário de 2026-10-06

| Métrica | 2026-10-06 | 2026-10-22 |
|---|---|---|
| Arquivos `*.test.js` | 191 | **201** |
| Arquivos que silenciam console | 45 | **51** |
| Arquivos que **assertam** sobre o spy | 14 | **18** |
| `beforeAll` zera arquivo inteiro | 3 | **4** |

O problema **cresceu**, não encolheu. Qualquer ação precisa ser mitigação
estrutural, não limpeza pontual.

## 2. O que já foi decidido antes (e por que isto não é "propor de novo")

A memória do projeto tem uma decisão explícita:
`decisions/2026-10-06-silenciamento-console-teste-adiado.md`.

**Decisão do usuário à época:** *"no momento não vou fazer nada... se algum
teste ficar vermelho e estiver silenciado, trataremos o caso mais específico
quando ocorrer."* Nada foi aplicado.

Fato verificado que ancorou aquela decisão, e que revalido aqui: **saída de
console não altera verde/vermelho.** O sinal é a **asserção**; o console é
**contexto**. Silenciar nunca torna verde algo que deveria ser vermelho.

Regra derivada, que continua válida e é o coração do plano:

> Quando um teste reprovar, o **diff da asserção é o sinal**; o console é
> contexto. Se um teste reprovar **e** estiver silenciado, o caminho é o **spy
> específico daquele teste**, não um `setup.js` global — que mascararia erro
> real nas 201 suítes.

Ou seja: **P3 nunca causou, e não pode causar, um falso verde.** A asserção é
que pega. O que ele causa é **perda de contexto de diagnóstico** — e é isso,
não um bug, que este plano endereça.

## 3. Plano

Ordem obrigatória: cada fase é pré-requisito da seguinte.

### Fase 1 — Reduzir a superfície morta (baixo risco, ganho imediato)

**Escopo:** `tests/setup.js:143-146, 148-151, 166-171` e
`tests/setup.db.js:77-80`.

Remover os **4 padrões mortos** (`ReactDOM.render`,
`React.createFactory()`, os 2 de API) e os arrays/constantes que ficarem
vazios. Manter os **2 padrões vivos** de auth e o do `<script>`, que continuam
necessários.

**Efeito:** o filtro global deixa de poder esconder 4 mensagens que não têm
emissor — encolhe a área cega sem tocar no que funciona. `setup.db.js` passa a
ter **zero** padrões, o que permite **remover o wrapper inteiro do arquivo**
(linhas 75-90), eliminando a duplicação.

**Verificação da fase:**
- `npx jest` → `195 passed / 1418 passed`, `console.error = 0`.
- `npx jest --config jest.config.db.js` (se o ambiente permitir) → inalterado.
- `npx eslint .` → exit 0.
- Confirmar com `grep` que nenhum dos 4 padrões removidos reaparece na saída.

**Risco:** se algum padrão estiver morto *por acidente* (um emissor que deveria
existir), removê-lo expõe o log — que é exatamente o comportamento desejado.
Achado, não regressão.

### Fase 2 — Tornar o silenciamento restante com escopo (o conserto estrutural)

**Escopo:** os 2 padrões vivos de auth (`lib/auth/auth.js:314,409`) e o aviso de
`<script>` do React 19.

Substituir o wrapper global por `filterConsoleError` (já existente em
`tests/helpers/console.js:34`) **no arquivo de teste que provoca cada caso** —
não em `setup.js`:

- os 2 logs de auth → nos testes que exercitam `lib/auth/auth.js` nesses
  caminhos (`tests/unit/lib/auth.test.js` já tem o cenário em `:58`);
- o aviso de `<script>` → no teste de sanidade que o produz
  (`tests/mocks/next.test.js`), que hoje depende de um filtro global para uma
  situação que só ele cria.

**Por que esta é a correção certa:** `filterConsoleError` usa `jest.spyOn`, então
`restoreMocks: true` garante que o silenciamento morre no fim do teste. O que é
suprimido fica **declarado no teste que suprime** — visível em code review, e
inexistente para as outras 200 suítes.

**Efeito:** `tests/setup.js` **deixa de substituir `console.error`**. O P3
desaparece como categoria. Um erro real em qualquer suíte futura volta a
aparecer por padrão.

**Verificação da fase:**
- `npx jest` → mesmo verde, **agora provando que nenhum filtro global é
  necessário** (se algo vazar para a saída, é um log sem cobertura).
- Cada supressão nova tem sua **própria asserção** de que o log ocorreu — não é
  silenciar, é trocar ruído por prova (mesmo padrão já usado nas 10 asserções
  sobre logs que entraram no commit `5cc86f2`).
- `npx eslint .` → exit 0.

### Fase 3 — Corrigir os `beforeAll` que cegam o arquivo inteiro

**Escopo:** os 4 arquivos do §1.5.

Trocar `beforeAll(() => { console.error = () => {}; })` por
`filterConsoleError([...])` no `beforeEach`, ou por
`suppressConsoleError()` (também em `helpers/console.js:19`) onde a intenção é
silenciar tudo — mas com spy, para que `restoreMocks` alcance.

**Ganho:** hoje um erro real **dentro desses 4 arquivos** é invisível, e — por
ser atribuição direta sem restauração confiável sob falha — o risco de vazar
para o arquivo seguinte existe. Spy resolve os dois.

**Verificação:** os 4 arquivos passam; a suíte inteira segue verde; e um
`console.error` plantado por probe dentro de um deles **aparece** (prova de que
não está mais cego). Probe descartável, removido depois.

### Fase 4 — Provação permanente contra regressão

**Escopo:** teste novo, em `tests/unit/` (infra de teste testando a si mesma).

Um teste que garanta o invariante do P3:

1. `tests/setup.js` **não** reassina `console.error` (leitura do arquivo ou
   verificação comportamental de que o filtro global não existe).
2. `tests/setup.db.js` **não** reassina `console.error`.
3. Nenhum arquivo novo adote `console.error = ` por atribuição direta em vez de
   spy (varredura, espelhando o que o inventário de 2026-10-06 fez à mão).

**Por que:** o problema passou de 45 → 51 arquivos e de 3 → 4 `beforeAll` em 16
dias, sem nenhum gate. Sem prova, volta. `tests/helpers/console.js` concentra 11
silenciadores e **não tem teste próprio** — este teste cobre esse buraco também.

**Verificação:** o teste novo passa; e falha se alguém reintroduzir um wrapper
global (provar por mutação: reintroduzir a linha e ver o teste reprovar).

### Fase 0 — Medição prévia (opcional, só com autorização)

Antes de qualquer fase, um probe descartável que **conta quantas vezes cada
padrão vivo dispara** durante a suíte inteira. Serve para confirmar que os 2
padrões de auth e o do `<script>` são realmente exercitados hoje — se algum
**nunca** disparar apesar de ter emissor, ele é candidato a remoção também.

**Exige commit descartável + reverter.** Não executar sem autorização explícita.
As Fases 1-4 **não dependem** dela; a Fase 0 só refina o escopo da Fase 1.

## 4. O que este plano NÃO faz

- **Não remove os 51 silenciadores** dos arquivos de teste. Aquele é o item
  histórico, de escopo muito maior, e a decisão de 2026-10-06 de não mexer
  continua valendo. Os 18 que **assertam** sobre o spy são prova, não ruído —
  removê-los perderia cobertura.
- **Não mexe nos 146 `console.log`** de scripts de seed/setup. É ruído de outra
  natureza (não pode esconder erro de asserção) e outro escopo.
- **Não toca em `global.suppressWarnings`** (§1.3). Tem escopo correto e não tem
  chamador. Se um dia for usado, aí sim entra na regra da Fase 2.
- **Não usa ferramentas de rede/MCP remoto.** Só skill local e `npx jest`.

## 5. Classificação e registro

**Área:** infraestrutura de testes — **não** site público nem painel. As regras
de proteção de `docs/ARQUITETURA_SITE_PUBLICO.md` §8 e
`docs/ARQUITETURA_SITE_PRIVADO.md` §9 não se aplicam, e `AGENTS.md` §0.1 cai no
caso "tarefa fora do site público e do painel".

**ADR:** P3 é **higiene de teste**, não decisão de arquitetura. Pelo
`docs/adr/README.md` ("Na dúvida, não crie"; ADR é para decisão duradoura, cara
de reverter, que afeta vários módulos), **não cabe ADR** para as Fases 1, 2 e 3.
**Cabe ADR** para a Fase 4, se ela fixar uma regra permanente do tipo "nenhum
`setup.js` pode substituir `console.error` globalmente" — isso é decisão
duradoura com pergunta futura de "por que assim?", exatamente o critério
1+4 do README.

**CHANGELOG:** cada fase entra no `CHANGELOG.md` como mudança.

**Documentos a atualizar:** `docs/PROJECT_tests.md` (descrição do
`setup.js`/`setup.db.js` nas linhas ~71 e ~75) quando as Fases 1-3 mudarem o
comportamento desses arquivos.

## 6. Resumo executivo

| Fase | O quê | Risco | Depende de |
|---|---|---|---|
| 0 | Medir disparo de cada padrão vivo | descartável, exige aval | — |
| 1 | Remover 4 padrões mortos; zerar `setup.db.js` | baixo | — |
| 2 | Trocar filtro global por `filterConsoleError` local | médio — toca `setup.js` | Fase 1 |
| 3 | Converter 4 `beforeAll` cegos em spy | baixo/médio | — |
| 4 | Teste de invariante + ADR | baixo | Fases 1-3 |

**A Fase 2 é o ponto de virada:** é a única que remove o P3 como categoria. As
outras reduzem superfície e impedem regressão.

**Ordem recomendada:** 1 → 3 → 2 → 4. As Fases 1 e 3 são independentes e podem
ir juntas; a 2 é a mais delicada (mexe no arquivo carregado pelas 201 suítes) e
só depois que o terreno está limpo.
