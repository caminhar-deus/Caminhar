# ADR-0013: Regras de processo do agente no `AGENTS.md`; regras de proteção de cada área no seu documento de arquitetura

- **Status:** Aceito
- **Data:** 2026-10-21
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../../AGENTS.md`](../../AGENTS.md), [`../ARQUITETURA_SITE_PUBLICO.md`](../ARQUITETURA_SITE_PUBLICO.md), [`../ARQUITETURA_SITE_PRIVADO.md`](../ARQUITETURA_SITE_PRIVADO.md), [`../AGENTS_OPERACAO.md`](../AGENTS_OPERACAO.md), [`0010-admin-como-cargo-e-validacao-de-nome.md`](0010-admin-como-cargo-e-validacao-de-nome.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O projeto tem três arquivos que a IA lê: o `AGENTS.md` (carregado em **toda**
sessão) e um documento de arquitetura por área — o site público e o painel
administrativo (lidos **por demanda**). O mantenedor mantém os três.

**A sobreposição que existia.** As mesmas regras apareciam em dois lugares:

- as regras de proteção do site público (ordem das abas, "Dicas do Dia",
  "Em Desenvolvimento", mídia externa, "atualizar o documento após mudança
  estrutural") estavam no `AGENTS.md` **e** no §8 do documento público;
- "itens `[HIPÓTESE]` devem ser conferidos no código" e "atualizar este arquivo
  e a data de 'Última atualização' após mudanças estruturais" estavam no
  `AGENTS.md` **e** no §9 do documento privado;
- o `AGENTS.md` do mantenedor (mantido fora do repositório) trazia as regras do
  site, o que forçava a repetição dentro do documento de arquitetura.

Isso nasce de uma ambiguidade de camada: "não altere a ordem das abas" é regra
**de conteúdo** (pertence à área do site), mas "leia o documento antes de alterar"
é regra **de processo** (vale para qualquer documento). Repetir as duas camadas
nos dois arquivos dobra o ponto de manutenção: cada regra alterada em um lugar
pode divergir do outro, e a IA recebe instrução ambígua sobre onde a regra
mora.

**A auditoria de 2026-10-21** sobre os três arquivos encontrou, além da
duplicação: uma referência a uma seção inexistente ("seção 5.9" no documento
privado, quando o mapa permissão→aba é a §6), uma afirmação obsoleta (o
documento público afirmava que o painel "ainda não documentado", depois de o
documento privado existir), "mudança estrutural" sem definição em lugar nenhum,
nenhum procedimento para o caso de pedido do dono que conflita com uma regra de
proteção, e a ausência de um vocabulário comum de estado entre os dois
documentos irmãos.

## Decisão

Cada regra mora em **um** lugar só, conforme a camada a que pertence.

1. **Regras de processo do agente ficam só no `AGENTS.md`**: idioma, quando e
   como ler cada documento, validação de `[HIPÓTESE]`, como tratar divergência
   entre documento e código, quando atualizar um documento e como agir quando o
   pedido do dono conflita com uma regra de proteção.

2. **Regras de proteção de uma área ficam só no documento de arquitetura dessa
   área**, numa seção final "Regras de proteção da área" (§8 no público, §9 no
   privado) — escritas em positivo, indicando o que não muda sem pedido
   explícito do dono.

3. **O `AGENTS.md` é mapa, não duplicador.** §0.1 mapeia área → arquivo → quando
   ler; §0.2 traz as regras de processo e ponteiros para a seção de regras de
   cada área; §0.3 traz o procedimento em 5 passos (identificar a área → ler as
   regras → ver as pendências conhecidas → confirmar `[HIPÓTESE]`/`[PLANEJADO]`
   no código → implementar e fechar). O mapa aponta; não repete.

4. **Cada documento de arquitetura descreve a área e suas pendências**:
   estrutura, telas, dados, tabela de pendências com coluna de status
   (público §7, privado §8) e a seção de regras de proteção.

5. **Vocabulário de estado unificado nos dois documentos:** `[PLANEJADO]` = alvo
   ainda não implementado, informado pelo dono; `[OBSERVADO]` = visto nas
   capturas; `[HIPÓTESE]` = inferido, a confirmar no código. A regra "confirmar
   no código" fica no `AGENTS.md`, não nos documentos.

6. **"Mudança estrutural" passa a ter definição:** a organização visível muda —
   aba, seção, campo de formulário, permissão, rota ou item de menu adicionado,
   removido ou renomeado. Nesse caso, o documento da área afetada e a data
   "Última atualização" são atualizados.

7. **Pedido do dono que conflita com uma regra de proteção:** o pedido vence, a
   regra correspondente é atualizada no documento no mesmo passo, e a decisão é
   registrada em `docs/adr/`.

8. **Regra de proteção ainda não implementada é marcada nos dois lados:** o
   documento privado aponta "ver §8, item 8" no §9, e o §8 marca a lacuna como
   "falta implementar" — assim a IA não confunde regra com estado.

9. **Detalhes de operação que não valem toda sessão** (matriz de pesquisa do
   slim, regras de `mcps`, origem do `librarian`) foram movidos para
   `docs/AGENTS_OPERACAO.md`, com ponteiro de uma linha no `AGENTS.md`.

## Alternativas consideradas

- **Manter as regras de proteção também no `AGENTS.md`** (defesa em profundidade:
  a regra estaria sempre no contexto, sem depender de leitura). Descartado
  porque duplica o ponto de manutenção e confunde as camadas — foi exatamente o
  defeito encontrado. A objeção é legítima e fica registrada: se a taxa de
  violação das regras de proteção subir na prática, reavaliar bringing de volta
  as regras como guardrail de uma linha.
- **Um único documento de arquitetura para as duas áreas.** Descartado: painel e
  site público têm áreas protegidas diferentes (abas, permissões, auditoria ×
  ordem das abas, "Dicas do Dia", "Em Desenvolvimento", mídia externa), e o
  mantenedor já os mantém separados.
- **Regras de processo replicadas em cada documento de arquitetura.** Descartado:
  seria a duplicação invertida — o processo é do agente e vale para qualquer
  documento, então pertence ao arquivo lido sempre.
- **Guardar a lista de pendências apenas no `CHANGELOG.md`/issue tracker.**
  Descartado: as pendências são parte do estado da área e precisam estar junto
  da descrição da área, para que a IA as veja ao ler o documento.

## Consequências

### Positivas

- Um ponto de manutenção por regra; a auditoria não encontra mais a mesma
  regra em dois arquivos.
- O `AGENTS.md` encolhe e fica só com o que vale em toda sessão (244 → 234
  linhas, com o grosso do conteúdo de operação movido para
  `docs/AGENTS_OPERACAO.md`).
- A IA tem um procedimento escrito (§0.3) em vez de reconstruir a ordem de
  leitura por dedução.
- Documentos irmãos simétricos: mesma legenda, mesmo título de seção de
  regras, mesma estrutura de pendências com status.
- Divergência entre documento e código passa a ter regra explícita ("aponte e
  aguarde a decisão") em vez de depender do bom senso do agente.

### Negativas e riscos

- **A regra de proteção só entra no contexto depois que a IA leu o documento.**
  O mecanismo depende do gatilho da §0.1 ser respeitado e da tabela ser lida
  antes de qualquer trabalho na área.
- **Mudança de processo exige atualizar mais de um arquivo** quando a regra
  também é específica de uma área (o `AGENTS.md` e o documento da área).
- **O backlog de `[PLANEJADO]` cresce** à medida que o alvo é implementado, e
  exige revisão periódica para não virar uma segunda lista de pendências
  paralela.
- **O procedimento do §0.3 é mais explícito que o comportamento anterior**, o
  que pode aumentar o número de turnos por tarefa (a IA agora lê e checa
  pendências antes de propor mudança).

## Revisão

Reavaliar se: (a) a IA violar regra de proteção sem ter lido o documento — aí
trazer a regra de volta ao `AGENTS.md` como guardrail de uma linha; (b) o
número de áreas documentadas passar de três, o que pede reavaliar o formato do
mapa da §0.1; (c) o `[PLANEJADO]` deixar de distinguir alvo de estado, o que
tornaria a legenda inútil; (d) um documento de área for criado fora do padrão
§1/§2/§3…/§8, o que pede um guia de estrutura para documentos de arquitetura.
