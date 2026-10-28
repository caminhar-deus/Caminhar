# ADR-0026: Scanners estáticos no gate de push e allowlist documentada por arquivo

- **Status:** Aceito
- **Data:** 2026-10-28
- **Decisores:** Dono do projeto (aprovou plano e sequência de implementação), orchestrator (detalhes técnicos)
- **Relacionados:** ADR-0025 (que criou o `scripts/reset-db.js`); cron "Load Tests (k6)" nº 25 — run [`40673567814`](https://github.com/caminhar-deus/Caminhar/actions/runs/40673567814), `failure` em 28/10/2026; `.github/workflows/test-base.yml`; `.github/workflows/test-coverage.yml`; `scripts/check-sql-injection.js`; `scripts/reset-db.js`; `tests/unit/scripts/check-sql-injection.test.js`; registro de execução em `docs/PROJECT_load-tests.md`

## Contexto

Os dois scanners estáticos de segurança — `security:check-sql` (`scripts/check-sql-injection.js`) e `security:check-credentials` (`scripts/check-hardcoded-credentials.js`) — tinham um único executor automático: o step `Security Checks` do `test-base.yml`, cujo único consumidor é o cron "Load Tests (k6)" (`load-tests.yml`). Nenhum gate de push rodava os scanners.

Em 28/10/2026 o cron (#25, run 40673567814, commit `bc8deb7` "ATT - A11y") falhou nesse step, 1m49s após o início do job: o `check-sql-injection` saiu com exit 1 apontando `scripts/reset-db.js:53` — "query() com interpolação e sem array de parâmetros" — para a instrução `DROP TABLE IF EXISTS ${table} CASCADE;` (executada por `await query(...)`). O arquivo nasceu do ADR-0025 (commit `fa5b836`, 27/10/2026): a variável `table` vem de `for (const table of TABLES_TO_DROP)`, e `TABLES_TO_DROP` é uma lista `const` de strings literais puras declarada no próprio arquivo — sem input externo. Identificador em DDL não é parametrizável no PostgreSQL (sem plpgsql). O código é seguro; o falso positivo é de uma classe que o scanner não cobria: já isentava whitelists de nomes e constantes locais, mas não a forma `for (const x of LISTA)` sobre lista fixa de literais. E o módulo não exportava nada — o script era inviável de testar, e nenhum teste o cobria.

Cronologia que ampliou o problema: o cron #24 (run 40483879235, 27/10, 09:50Z) rodou `80d16f1` — o último SHA sem o arquivo — e passou; o primeiro executor automático contendo o arquivo foi o #25, no dia seguinte. Os runs de push do mesmo SHA seguiram verdes: nenhum deles rodava os scanners. Não existe workflow de acessibilidade neste repositório — o rótulo "A11y" desta execução vem apenas do título do commit no topo da `main`.

## Decisão

1. **Os dois scanners passam a rodar a cada push:** novo step `Security Checks (SQL injection + credenciais hardcoded)` no job `lint` do `test-coverage.yml`, com os mesmos comandos do `test-base.yml` (`npm run security:check-sql` e `npm run security:check-credentials`). O step da cron permanece: `test-base.yml` segue canônico.
2. **Allowlist por nome de arquivo para o arquivo falso-positivo:** `reset-db.js` entra no `IGNORE_FILES` do scanner SQL com justificativa em comentário, no mesmo mecanismo do `check-hardcoded-credentials.js` (precedente: `clean-orphaned-images.js`). O contrato da `TABLES_TO_DROP` fica travado por `tests/unit/scripts/reset-db.test.js`.
3. **A classe do falso positivo passa a ser coberta pelo scanner e por testes:** variável interpolada é isenta quando vem de `for (const x of LISTA)` com LISTA sendo `const` array de strings literais puras declarado no próprio arquivo — novos exports `extractConstantLists()` e `findLoopVars()`, com `scanContent()` exportado como núcleo linha a linha e CLI somente sob guard de `process.argv[1]`. 17 testes unitários em `tests/unit/scripts/check-sql-injection.test.js` cobrem a isenção, as variantes perigosas (lista com identificador, template literal ou chamada; declaração `let`/`var`; fonte dinâmica de loop) e os true positives existentes; três mutações diferentes foram mortas pela suíte.
4. A entrada da allowlist e a regra nova coexistem de propósito: a entrada documenta a exceção por arquivo (revisável a baixo custo) e a regra cobre a classe para os próximos arquivos. Não há nova required check no GitHub — o scan vive no job `lint` já existente.

## Alternativas consideradas

- **Mudar o `reset-db.js` para eliminar a interpolação:** descartada — o SQL é seguro; moldar código de aplicação para satisfazer o scanner inverte o sinal do problema.
- **Só a allowlist, sem regra:** descartada como solução única — cada novo arquivo com o mesmo padrão exigiria outra entrada; a regra cobre a classe. A entrada foi mantida por ser o registro explícito do caso.
- **Só a regra, sem entrada:** descartada — a análise é por regex sobre linhas, não AST; a entrada por arquivo explicita a decisão e é guard adicional se a regra mudar.
- **Workflow separado de segurança com required check:** descartado nesta alteração — maior custo operacional para o mesmo sinal; o step no job `lint` existente é o mínimo suficiente (pode ser promovido depois, fora deste ADR).

## Consequências

### Positivas

- Push que ferir um scanner reprova no gate de push (~18min), em vez de falhar ~24h depois no cron de carga, num run alheio ao escopo do commit.
- O scanner SQL ganhou suíte que prova a isenção por estrutura e mantém os true positives existentes (mutações: matar a regra do loop, aceitar qualquer colchete como lista válida e deixar de ignorar comentários — todas reprovam testes).
- Gate e cron executam exatamente os mesmos comandos (`security:*`), sem divergência de comportamento entre os dois executores.

### Negativas e riscos

- A allowlist é por basename: qualquer arquivo `reset-db.js` em qualquer diretório sai do scan — mitigado pela justificativa no comentário, pelo contrato travado em teste e pela revisão da entrada a cada novo caso.
- A regra é por regex sobre linhas: não reconhece `for...of` multilinha, `.entries()`, `.values()` e destructuring no loop — variantes dessas formas devem continuar tratadas por allowlist manual.
- Os scanners agora podem reprovar qualquer push: é uma causa adicional de falha no gate — e é exatamente o efeito desejado de um gate.

## Revisão

- Se um novo arquivo gerar o mesmo padrão com fonte dinâmica (não literal), a regra do scanner deve ser reavaliada antes de acrescentar outra entrada manual na allowlist.
- A migração dos scanners para análise AST é a condição natural de substituição desta decisão (saiem a regra por regex e a necessidade de entrada manual para a classe).
- O cron #26 (29/10/2026) confirma o fechamento: o step `Security Checks` deve voltar a passar com os commits na `main`.
