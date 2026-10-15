# ADR-0001: Registrar decisões de arquitetura em `docs/adr/`

- **Status:** Aceito
- **Data:** 2026-10-14
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`README.md`](README.md), [`template.md`](template.md), [`../../AGENTS.md`](../../AGENTS.md) (seções 3 e 7)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O projeto documenta o estado atual em `docs/PROJECT_*.md` e o que mudou em
`CHANGELOG.md`, mas o "por quê" das decisões não é versionado no repositório —
está diluído no `README.md` e em `docs/PENDENCIAS_*.md` /
`docs/UPGRADE_*.md` — sendo que `docs/UPGRADE_tests.md` sozinha passa de 16 mil
linhas — ou simplesmente não existe. O `AGENTS.md` §3
já pede registrar decisões com Status/Contexto/Decisão/Consequências, mas o
destino implícito é o ai-memory, que não é revisado nem versionado junto do
código. O bloco gerenciado do ai-memory no `AGENTS.md` (linha ~111) já prevê
que, havendo um diretório de ADR revisado no repositório, o registro oficial
fica nele.

## Decisão

1. Local `docs/adr/`, versionado no Git.
2. Formato conforme [`template.md`](template.md) e regras em [`README.md`](README.md).
3. Numeração sequencial de 4 dígitos, nomes de arquivo em inglês, conteúdo em
   PT-BR, um ADR por decisão.
4. Imutabilidade após aceito: alterar a decisão exige um novo ADR, e só o campo
   Status do antigo muda.
5. Fluxo: criado já `Aceito` no mesmo commit da decisão (o projeto faz push
   direto na `main`); `Proposto` só para decisão em aberto; PR é opcional.
6. A fonte oficial é o ADR no repositório — o ai-memory guarda recall e
   histórico de sessão e não duplica a decisão como página. Sem segredos em ADR.

## Alternativas consideradas

- **Registrar só no ai-memory:** descartada — não é versionado nem revisado
  junto do código.
- **Registrar no `README.md` ou nos `PROJECT_*.md`:** descartada — descrevem
  estado atual e são reescritos, apagando o histórico do porquê.
- **MADR completo:** descartado por ora — cerimônia extra.
- **`docs/decisions/` ou `adr/` na raiz:** descartadas em favor de `docs/adr/`.
- **adr-tools / Log4brains:** descartadas para não adicionar dependência.

## Consequências

### Positivas

- O porquê fica versionado e revisável ao lado do código.
- Facilita a entrada de pessoas e agentes de IA.
- Alinha o `AGENTS.md` com um destino único de registro de decisões.

### Negativas e riscos

- Custo de escrever e manter o índice.
- Risco de ADR raso.
- Risco de esquecer de criar o ADR — mitigado pela Definição de Pronto do
  `AGENTS.md` §7.

## Revisão

Reavaliar após os 10 primeiros ADRs ou em 3 meses, o que vier primeiro. Se ficar
pesado, simplificar; se ficar raso, avaliar MADR; se criar à mão atrapalhar,
considerar um script num ADR próprio.
