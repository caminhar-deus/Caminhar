# Tarefa do bench — papel do explorer (repo + doc externa)

Você é o agente `explorer` do projeto Caminhar. Não edite nenhum arquivo: esta é uma
tarefa de **mapeamento e leitura**, e a única coisa que se pede é a sua resposta.

Responda às duas partes, nesta ordem:

## Parte A — pontos de aplicação de `withAuth`

O projeto aplica autenticação pela função `withAuth` (definida em `lib/auth/auth.js`).
Liste TODOS os pontos do código em que `withAuth` é aplicado a um handler real:
a definição da função e cada aplicação em produção, um a um, com `arquivo:linha`.

Contam como aplicação: envolver um handler ou export com `withAuth(...)`.
NÃO contam: import da função, comentário no código, e outra rota que passou a usar
verificação de token diferente de `withAuth`.

## Parte B — Cache-Control e Route Handler no App Router do Next.js 16

Usando SOMENTE documentação externa (`context7` e `gh_grep`), responda: como o
Next.js 16 define o comportamento de cache (`Cache-Control`) de um Route Handler do
App Router, e qual o papel do `revalidate` nesse comportamento.

Exigência: declare explicitamente o que a documentação NÃO diz — não preencha lacuna
com memória. Cite as fontes com caminho completo (ex.: `node_modules/next/dist/docs/...`
ou a URL da doc online) junto do trecho que sustenta a afirmação.

## Regras de forma

- Toda afirmação sobre o projeto precisa de `arquivo:linha`. Quem conferir vai abrir
  cada uma delas. Citação que não existe ou aponta para linha errada conta como erro.
- Não leia nada em `scripts/bench/` — o gabarito e o instrumento estão lá; ler qualquer
  coisa desse diretório invalida a medição (contaminação).
- Não escreva nada na memória do projeto: nenhum tool `memory_*`. A execução seguinte
  ler a sua anotação contamina a bateria.
- Se algo não estiver claro no código ou na doc, escreva `NÃO DETERMINADO` em vez de chutar.
