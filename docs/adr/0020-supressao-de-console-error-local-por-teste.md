# ADR-0020: Supressão de `console.error` é local ao teste que a provoca, nunca global no setup

- **Status:** Aceito
- **Data:** 2026-10-22
- **Decisores:** Dono do projeto (autorizou a execução)
- **Relacionados:** `tests/setup.js`, `tests/setup.db.js`, `tests/helpers/console.js`,
  `tests/unit/tests-hygiene/console-no-global-assignment.test.js`, `jest.config.base.js`,
  `docs/PLANO_ACAO_P3_FILTRO_CONSOLE.md`, `.github/workflows/test-coverage.yml`

## Contexto

`tests/setup.js` é carregado por todas as suítes de teste. Ele reassinava `console.error`
GLOBALMENTE com um wrapper que descartava silenciosamente mensagens que casassem uma lista de
padrões conhecidos (`ALL_FILTERS`). O wrapper guardava a referência original numa constante
(`originalConsoleError`) e chamava o original apenas para o que não casava.

Isso produzia um risco concreto (registrado como item **P3**): o filtro valia para TODOS os
testes de uma vez e **não deixava rastro**. Qualquer `console.error` real de qualquer teste
cuja mensagem contivesse um dos padrões era engolido sem que a suíte falhasse — podendo mascarar
uma falha real. Foi verificado por prova direta que o match é por **substring**: uma mensagem
que apenas *contivesse* o padrão desaparecia em silêncio.

Agregando ao problema, o mesmo bloco de filtro estava **duplicado** em `tests/setup.db.js`, com
padrões que pertenciam só a ele. Um levantamento de 2026-10-06 já havia adiado a correção, sob a
regra de que "o diff da asserção é o sinal; o console é o contexto" — ou seja, o sinal de
reprovação continua sendo a asserção, e o console é apenas contexto de diagnóstico.

Dos 6 padrões então no filtro, apenas 3 eram **vivos** (mensagens que o código ainda emite):

- `Erro ao inicializar sistema de autenticação` — `lib/auth/auth.js:409`
- `Falha ao armazenar refresh token` — `lib/auth/auth.js:314`
- `Encountered a script tag while rendering React component` — aviso do React 19 no teste de
  sanidade do mock de `next/script`

Os outros 3 estavam **mortos**: `ReactDOM.render` e `React.createFactory()` (API removida) e os
2 padrões de API que só existiam no `setup.db.js`.

Um levantamento de emissão (probe temporário, depois removido) mediu que **apenas 3 casos de
teste em 2 arquivos** emitem os padrões vivos:
`tests/unit/lib/auth.test.js` (3 testes) e `tests/mocks/next.test.js` (1 teste).

Durante a remoção, foi descoberto que `filterConsoleError` em `tests/helpers/console.js` tinha um
bug de **recursão infinita**: o ramo "não casado" chamava `console.error(...args)`, que é o
próprio mock instalado por `jest.spyOn` — qualquer log não previsto derrubava o teste com
`RangeError`. O helper era código morto até esta decisão (só um uso, que por coincidência só
via logs casados); a mudança o ativou e o bug foi corrigido capturando a referência original
**antes** do `spyOn`.

## Decisão

Vamos manter a supressão de `console.error` **local ao teste que a provoca**, e proibir a
reatribuição global de `console.error` (ou o truque `originalConsoleError`) nos arquivos sob
`tests/`.

- `tests/setup.js` não reassina `console.error`. O filtro global foi removido.
- O bloco duplicado em `tests/setup.db.js` foi removido.
- Cada teste que provoca um log o envolve com `filterConsoleError` / `suppressConsoleError`
  de `tests/helpers/console.js` (`jest.spyOn`, restaurado por `restoreMocks: true` em
  `jest.config.base.js`), **e adiciona uma asserção de que o log ocorreu**. A supressão deixa de
  ser cega: o teste também prova que o log intencional aconteceu.
- A supressão é por teste, declarada no próprio teste, e reversível.
- O invariante é guardado por teste dedicado
  (`tests/unit/tests-hygiene/console-no-global-assignment.test.js`), que lê os `.js` de `tests/`
  do disco (fonte única de verdade, sem lista fixa) e falha apontando arquivo, linha e trecho.
  `tests/helpers/console.js` é a única exceção documentada — e o é via `jest.spyOn`, não por
  atribuição.

## Alternativas consideradas

- **Manter o filtro global e apenas documentá-lo.** Descartada: não resolve o P3 — o risco é
  exatamente o silêncio sem rastro; documentar não torna o erro observável.
- **Trocar os padrões do filtro global pelos 3 vivos.** Descartada: reduz o ruído mas mantém o
  mecanismo cego (Fase 1 do plano removia apenas os mortos; a solução de fundo é a localização).
- **Usar `suppressConsoleError` (silencia tudo) nos testes que emitem.** Descartada em favor de
  `filterConsoleError`, que **repasa** o que não casa e permite assertar o conteúdo do log. O
  silêncio total cegaria o teste para um log inesperado.
- **Fase 0: medir com commit descartável antes.** Recusada pelo dono. A medição foi feita por
  probe temporário (removido), sem commit.
- **Não criar teste de invariante / ADR.** O dono decidiu fazer ambos: o invariante impede a
  regressão e o ADR fixa a regra.

## Consequências

### Positivas

- Erros reais de `console.error` voltam a ser visíveis globalmente; o P3 deixa de existir como
  categoria.
- A supressão passa a ser explícita e local: cada teste que silencia também **prova** que o log
  intencional ocorreu (troca ruído por asserção).
- Um invariante automatizado impede a reintrodução da reatribuição global, com mensagem que
  aponta arquivo/linha/trecho e a correção.
- O bug de recursão do `filterConsoleError` foi eliminado antes de virar armadilha.

### Negativas e riscos

- A detecção do invariante é **textual e linha a linha**: uma atribuição quebrada entre linhas
  escaparia. O padrão real do wrapper antigo — e variações razoáveis — cabe numa linha.
- Testes que passem a emitir um `console.error` não previsto ficam **mais ruidosos** (antes o
  filtro podia engolir). Isso é intencional: o ruído é o sinal.
- Novo padrão de log intencional exige envolver o teste com o helper e assertar — um passo a
  mais por teste afetado.

## Revisão

Reavaliar se: (a) surgir um caso legítimo de supressão que não seja local por teste; (b) o
invariante acusar falso positivo recorrente; ou (c) a detecção textual for contornada por um
padrão fragmentado entre linhas — nesse caso, considerar detecção por AST.
