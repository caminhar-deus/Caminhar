# ADR-0018: Reescrever o histórico de um WIP antes de publicar, nunca depois do merge

- **Status:** Aceito
- **Data:** 2026-10-22
- **Decisores:** dono do projeto e agente orchestrator
- **Relacionados:** PR #2, ADR-0001, `CHANGELOG.md`, `.opencode/oh-my-opencode-slim.json`, `docs/adr/0008-modelos-free-por-agente-sem-repeticao.md`, `scripts/bench/papeis/rodar.js`

## Contexto

Em 22/10/2026 o commit `fdc29ac` ("WIP - bench role explorer instrument (amend later)")
foi empurrado para a `main`. O `git commit --amend` seguinte criou um irmão
(`348af62`) em vez de substituir o commit publicado, e o `git pull --rebase`
posterior usou `fdc29ac` como base: o resultado (`ae16132`) duplicou um bloco do
`CHANGELOG.md` e derrubou a entrada do explorer. As correções vieram em commits
separados (`6be27a6`, `3ac5a2c`, `46c01cc`, `f3c3bad`, `19c18cb`), que passaram a
ser o estado bom de referência.

Para remover o WIP do histórico, criou-se a branch `squash-wip` a partir de
`2993de7` com um único commit squashado (`327b18d`) — porém **sem** o passo de
reaplicar os commits posteriores (`git cherry-pick 6be27a6..main`). A branch
carregava, portanto, o texto **antigo** dos arquivos. Ela foi empurrada e
mergeada pelo PR #2, gerando `8f82791` e `3dc25b3`.

Como o `main` já tinha o texto novo e a branch squashada tinha o antigo, o merge
3-way não deu conflito: manteve **os dois lados** das mesmas linhas. O resultado
foi conteúdo duplicado em quatro arquivos — chave `"orchestrator"` repetida em
`.opencode/oh-my-opencode-slim.json` (reprovando `json/no-duplicate-keys`, run
#64 do gate de lint), dois bullets contraditórios no `CHANGELOG.md`, um heading
órfão no ADR-0008 e um `if (!opts.agente)` duplicado em
`scripts/bench/papeis/rodar.js`.

Esse merge reintroduziu o próprio `fdc29ac` na história, anulando o objetivo
original: a `main` publicada terminou com o WIP, dois merges e o lint vermelho.

## Decisão

Limpeza de histórico é feita **antes** de publicar a branch: reescrever/local,
reconciliar os commits que já existem na linha principal, provar que o resultado
é idêntico ao último estado bom conhecido e só então publicar com
`--force-with-lease`.

O procedimento passa a ser:

1. Construir a cadeia nova a partir da base publicada e reaplicar **todos** os
   commits intermediários (`git cherry-pick <primeiro>^..<último>`). Nunca deixar
   a branch squashada sobre uma base antiga.
2. Provar equivalência de conteúdo: `git diff --stat <sha-bom> <cadeia-nova>`
   tem de sair **vazio**, e `git rev-parse <sha-bom>^{tree}` igual ao `^{tree}`
   da cadeia nova.
3. Provar que o objetivo foi atingido: o commit indesejado não pode ser ancestral
   (`git merge-base --is-ancestor <commit> <cadeia-nova>` deve falhar) e não pode
   haver merges em `<base>..<cadeia-nova>`.
4. Rodar `npx eslint .` e a suíte antes de publicar.
5. Publicar com `git push --force-with-lease=<branch>:<sha-esperado-do-remoto>`,
   nunca `--force` puro.
6. Manter uma branch de backup (`backup/pre-<data>`) até o CI ficar verde.

Se a branch reescrita já estiver atrás de um PR aberto, ele deve ser fechado e
a branch reenviada, ou a reescrita deve acontecer antes do merge. **Não** se
mergeia uma branch squashada construída sobre base antiga: o merge 3-way mantém
os dois lados quando as mesmas linhas mudaram nos dois ramos, sem conflito.

## Alternativas consideradas

- **Opção A — Reverter o merge pelo botão "Revert" do PR #2:** devolveria o
  conteúdo de `19c18cb`, mas manteria o `fdc29ac` e os dois merges na história.
  Descartada por não cumprir o objetivo de remover o WIP.
- **Opção B — Corrigir o conteúdo em um commit novo sobre `3dc25b3`:** foi
  preparada e validada (branch `fix/post-merge-content`, `575b4ac`, árvore igual
  a `19c18cb`) e era o plano caso a `main` estivesse protegida contra
  force-push. Descartada como solução final porque preservaria o WIP na
  história; mantida apenas como fallback operacional.
- **Opção C — Aceitar o histórico append-only e só corrigir os arquivos:**
  descartada; foi exatamente o que produziu as duplicatas e o lint vermelho.

## Consequências

### Positivas

- A `main` ficou sem o commit `WIP ... amend later` e sem merge commits:
  `2993de7 → a7c6a59 (squash de WIP+amend) → 225fb1b → fa65789 → a4b0360 → 07924f7 → c829a2f`.
- O conteúdo publicado é bit a bit o estado bom conhecido: `git diff` contra
  `19c18cb` vazio, `eslint` exit 0, 195 suítes / 1418 testes passando / 73
  pulados, e CI verde no `c829a2f` (runs #65, #59 e #50).
- O critério de aceite é verificável por comparação de `tree`, não por inspeção
  visual de diff — o que teria pego o merge ruim antes do push.
- `--force-with-lease` ancorado no sha esperado impede sobrescrever um push de
  outra pessoa.

### Negativas e riscos

- Reescrever histórico publicado exige credencial de push com permissão de
  force; neste episódio o token foi criado só para o comando e revogado em
  seguida.
- Os commits do PR #2 (`327b18d`, `8f82791`, `3dc25b3`) deixam de estar na linha
  da `main`; continuam alcançáveis pelo PR e pelo reflog, mas o PR passa a
  apontar para commits fora da branch.
- Qualquer clone local atrasado que rode `git pull` depois do force
  reintroduz o merge antigo e o conteúdo duplicado. Clones atrasados devem
  realinhar com `git reset --hard origin/main` (ou `git branch -f`), nunca com
  `pull`.
- A branch remota do PR (`squash-wip`) precisa ser apagada à parte; enquanto
  existir, é um convite a remerge.

## Revisão

Reavaliar se o projeto passar a exigir PR obrigatório com `main` protegida
(nesse caso a reescrita tem de ocorrer antes de abrir o PR e o force-push deixa
de ser possível), se adotar merge queue, ou se passar a usar squash-merge
automático no GitHub — cenários em que a etapa 5 deste procedimento muda.
