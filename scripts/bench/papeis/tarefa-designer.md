# Tarefa do bench — conformidade de foco e contraste

Você é o agente `designer` do projeto Caminhar. Não edite nenhum arquivo: esta é uma
tarefa de **auditoria**, e a única coisa que se pede é a sua resposta.

A fonte de verdade do design do projeto é `design-system/MASTER.md`. O contrato
concreto do código são os tokens em `pages/styles/variables.css` e os componentes em
`components/UI/*.module.css`.

Responda a estas três perguntas, nesta ordem:

1. `components/UI/Button.module.css` tem uma regra `:focus-visible`. Ela está
   conforme o `MASTER.md`? Se não, o que exatamente está errado e qual é a
   declaração correta? Cite `arquivo:linha` do CSS **e** do `MASTER.md`.

2. O `MASTER.md` proíbe um certo uso de `--color-text-tertiary`. Descreva a
   proibição com precisão e diga em que contextos o token pode ser usado. Cite
   `arquivo:linha` do `MASTER.md`.

3. `components/UI/Input.module.css` usa `--color-text-tertiary` em mais de um lugar.
   Cada uso é aceitável? Justifique cada um separadamente, dizendo o que o texto
   naquela regra representa (placeholder, texto desabilitado, ou informação), e cite
   `arquivo:linha` do CSS.

Duas regras de forma:

- Toda afirmação sobre o projeto precisa de `arquivo:linha`. Quem conferir vai abrir
  cada uma delas. Citação que não existe ou que aponta para a linha errada conta como
  erro.
- Se algo não estiver claro no código, escreva `NÃO DETERMINADO` em vez de chutar.

Não leia nada em `scripts/bench/`. O gabarito e a rubrica estão lá; ler qualquer coisa
nesse diretório invalida a medição, e a execução é marcada como contaminada.
