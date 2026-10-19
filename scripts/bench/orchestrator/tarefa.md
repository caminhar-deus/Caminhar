# Tarefa do bench — auditoria de autenticação das rotas de API

Este arquivo é o **prompt** enviado ao modelo sob teste. O `rodar.js` lê este arquivo
inteiro e o passa ao `opencode run`. Não edite o texto durante uma série de execuções:
alterar a tarefa entre execuções invalida a comparação.

---

Auditoria de autenticação das rotas de API deste repositório.

Preciso de um inventário confiável de `pages/api/`, para saber o que responde a pedido
sem token e o que não responde. Responda a estas quatro perguntas, nesta ordem:

1. Quantos arquivos há em `pages/api/` e quantos deles são, de fato, rotas da API?
   Atenção: nem todo arquivo dentro de `pages/api/` é uma rota.

2. Agrupe as rotas por mecanismo de autenticação. Diga quantas rotas há em cada grupo e
   cite `arquivo:linha` do ponto onde a autenticação é de fato aplicada — não do ponto onde
   ela é importada.

3. Quais rotas respondem a um pedido sem token? Para cada uma, diga se isso é
   intencional (por exemplo, a rota de login) ou se a proteção está em outro lugar.

4. Existe alguma rota cuja segurança não vem do próprio arquivo dela? Se existir, aponte
   onde a proteção vem.

Entregue em markdown, com uma tabela.

Duas regras de forma:

- Toda afirmação sobre o código precisa de `arquivo:linha`. Quem conferir vai abrir cada
  uma delas. Citação que não existe ou que aponta para a linha errada conta como erro.
- Se algo não estiver claro no código, escreva `NÃO DETERMINADO` em vez de chutar.

Use a equipe de agentes se isso deixar a varredura mais confiável — uma varredura ampla e
uma revisão crítica são exatamente o tipo de coisa que costuma render mais delega do que
fazer na mão. Mas a resposta final é sua: você reconcilia, ninguém entrega por você.

Não leia nada em `scripts/bench/`. O gabarito e a rubrica estão lá; ler qualquer coisa
nesse diretório invalida a medição, e a execução é marcada como contaminada.