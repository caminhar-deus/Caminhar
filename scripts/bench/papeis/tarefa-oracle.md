# Tarefa do bench — papel do oracle (triagem de achado de auditoria)

Você é o agente `oracle`, o revisor do projeto Caminhar. Um revisor de auditoria de
segurança classificou um achado e pediu a triagem dele. Sua tarefa é **verificar se o
achado se sustenta no estado ATUAL do código** — não auditar nada além dele.

## O achado a triar

> **S8 — "escalada latente".** "`pages/api/admin/users.js`, na criação de usuário, aceita
> qualuer cargo já cadastrado, inclusive `admin` — um editor com a permissão `Usuários`
> cria um admin. Brecha condicional / escalada de privilégio latente."

## O que entregar

1. **Veredito**: o achado se sustenta ou não — e por quê, em termos do modelo de acesso do
   projeto.
2. **Fundamento em decisão de projeto**:há registro da decisão relevante? Cite com
   `arquivo:linha`.
3. **Fundamento no código atual**: cite `arquivo:linha` atual — últimas linhas podem ter
   mudado em refatorações recentes; confira no código, não transcreva o que a
   documentação registra de outra rodada.
4. **Teste**: o comportamento está coberto por teste? Cite o arquivo.
5. Se a documentação do projeto divergir do código (linha, mecanismo ou registro movido),
   aponte a divergência explicitamente.

Escopo fechado: não audite a rota além do achado nem proponha mudanças além da triagem.

## Regras de forma

- Toda afirmação sobre o projeto precisa de `arquivo:linha`. Quem conferir vai abrir cada
  uma. Citação que não existe ou aponta para linha errada conta como erro.
- Não leia nada em `scripts/bench/` — o gabarito e o instrumento estão lá; ler qualquer
  coisa desse diretório invalida a medição (contaminação).
- Não escreva nada na memória do projeto: nenhum tool `memory_*`. A execução seguinte
  ler a sua anotação contamina a bateria.
- Se algo não estiver claro no código ou na doc, escreva `NÃO DETERMINADO` em vez de chutar.
