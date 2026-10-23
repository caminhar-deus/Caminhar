# ADR-0022: Ligar o MCP remoto Front-End-Checklist, restrito a orchestrator e oracle

- **Status:** Aceito
- **Data:** 2026-10-23
- **Decisores:** dono do projeto (pedido de ativação e uso pleno do recurso)
- **Relacionados:** `AGENTS.md` §5, `docs/AGENTS_OPERACAO.md` §2, `opencode.jsonc` (bloco `mcp`), `.opencode/oh-my-opencode-slim.json` (bloco `agents`), skill local `.agents/skills/frontend-checklist-global`, `skills-lock.json`

## Contexto

O MCP remoto `frontend-checklist` (`https://mcp.frontendchecklist.io`) existia no `opencode.jsonc` desde a auditoria da stack de 03/10/2026, mas com `"disabled": true`: o motivo registrado no próprio arquivo era que `review_code` envia o código revisado ao servidor do fornecedor. O acesso ao corpus do checklist vinha sendo feito pela skill local `frontend-checklist-global`, instalada junto com as demais skills do repositório `thedaviddias/Front-End-Checklist` (`.agents/skills/**`, rastreadas em `skills-lock.json`).

Em 23/10/2026 o dono pediu a ativação do MCP e o uso de tudo o que ele oferece. Antes de decidir, o servidor foi inspecionado diretamente por JSON-RPC (sem enviar código do projeto):

- `initialize` → `serverInfo` = `frontend-checklist-mcp` versão `2.0.1`, sem autenticação exigida.
- `tools/list` → 11 ferramentas, todas com `readOnlyHint: true`.
- `prompts/list` → 5 prompts prontos (`review_code_prompt`, `explain_rule_prompt`, `fix_rule_prompt`, `audit_url_prompt`, `workflow_prompt`).
- `resources/list` → 399 resources, sendo 386 regras (`frontendchecklist://rules/<slug>`) e 1 MCP App de relatório (`ui://frontend-checklist/review-report`).
- `tools/call get_rule` com `slug: "doctype"` → resposta válida, confirmando o servidor em funcionamento sem credencial.

A página oficial do fornecedor (`https://frontendchecklist.io/mcp`) declara: sem autenticação; `review_code` envia o código, mas "não armazena nem loga"; telemetria apenas anônima. São afirmações do fornecedor, não verificáveis a partir deste repositório.

## Decisão

1. **Ligar** o servidor no `opencode.jsonc`: `mcp.servers.frontend-checklist.disabled = false`, mantendo `type: "remote"` e a URL oficial.
2. **Restringir por agente** em `.opencode/oh-my-opencode-slim.json` (`agents.<papel>.mcps`), que o plugin compila em permissões `<mcp>_*`:
   - `orchestrator`: `allow` — consulta de regra isolada sem abrir lane;
   - `oracle`: `allow` — dono da revisão de checklist (é o papel que fecha a entrega);
   - `explorer`, `designer`, `fixer`: `deny` — não revisam entrega.
3. **Manter a skill local** `frontend-checklist-global` como caminho padrão para consulta de regra, porque cobre o mesmo corpus (386 regras) sem enviar código do projeto. *(Revisado no mesmo dia: a skill fica, mas o corpus de regras local foi podado — ver §Poda do corpus local.)*
4. **Regra de uso registrada** em `AGENTS.md` §5: `review_code` e `audit_url` só quando o pedido for revisar código/URL, nunca por iniciativa própria e nunca com código sensível (segredos, `.env`, credenciais). Ferramentas de consulta (`get_rule`, `search_rules`, `fix_rule`, `explain_rule`, `check_rule`, `list_categories`, `get_workflow`, `get_checklist_rules`, `get_quick_reference`) não enviam código e são sempre seguras.

## Alternativas consideradas

- **Manter desligado e usar só a skill local.** Descartada: a skill cobre o texto das regras, mas não tem `review_code` (passada heurística sobre o código colado) nem `audit_url` (busca e revisão de uma página pública), que são justamente o que o dono pediu para habilitar.
- **Ligar para todos os agentes.** Descartada: acrescenta 11 definições de ferramenta ao contexto de designer e fixer, que não fazem revisão de entrega, e amplia a superfície de envio de código sem ganho.
- **Ligar apenas no oracle.** Descartada: o orchestrator é quem recebe o pedido do dono e frequentemente precisa consultar uma regra isolada; negar isso forçaria abrir uma lane só para ler documentação estática.
- **Apontar `headers`/OAuth.** Não se aplica: o servidor não exige autenticação (verificado no `initialize`).

## Consequências

### Positivas

- As 11 ferramentas ficam disponíveis para os dois papéis que decidem e revisam, sem script, chave ou instalação adicional.
- O checklist passa a ter auditoria de código e de URL pública, que a skill local não oferece.
- A matriz de acesso continua num único lugar (`agents.<papel>.mcps`), como as demais pesquisas externas.

### Negativas e riscos

- **Envio de código a terceiro.** `review_code` transmite o trecho revisado; a garantia de "não armazenado/não logado" é declaração do fornecedor. Mitigação: só para orchestrator/oracle, com a regra de nunca usar em código sensível.
- **Custo de contexto.** 11 ferramentas a mais por sessão desses dois papéis, num modelo free de contexto curto.
- **Disponibilidade de terceiro.** Se o servidor cair ou mudar o contrato, os dois papéis perdem a ferramenta — e, desde a §Poda do corpus local, também perdem a consulta de regra; a `frontend-checklist-global` só mantém o roteamento e os guardrails.
- **O que o host expõe, verificado após o restart (23/10/2026):** as 11 ferramentas entram como tools; os 399 `resources` (+3 templates) **não** viram tools, mas são legíveis pelas ferramentas do host `opencode.list_mcp_resources` e `opencode.read_mcp_resource` (leitura de `frontendchecklist://rules/<slug>` confirmada). Os 5 `prompts` e o MCP App (`ui://`) não têm caminho de uso no OpenCode v2.1.4.
- **Reinício obrigatório do host.** O plugin slim não recarrega config a quente: `opencode debug agents` só mostra a matriz nova depois de reiniciar o host/service. Logo após a edição, a permissão compilada continuava em `deny` para todos os papéis; depois do restart de 23/10/2026, conferido: `allow` em orchestrator e oracle, `deny` nos demais. O `opencode mcp list` já mostrava `connected` antes do restart — conexão e permissão são camadas diferentes.

## Poda do corpus local (23/10/2026)

A decisão 3 foi revista no mesmo dia, depois de medir o custo real das skills locais:

- **Removidas** as 390 skills locais do repositório `thedaviddias/Front-End-Checklist` (388 de regra + `improve-rule` + `find-npm-packages`): 779 arquivos, 2,97 MB. Ficou apenas `frontend-checklist-global`.
- **`skills-lock.json`**: as 390 entradas correspondentes foram apagadas (614 → 224). Sem isso o lock passaria a descrever um disco que não existe.
- **Motivo (medido, não estimado):** as 391 entradas do corpus custavam ≈ 89,5 mil caracteres (≈ 22 mil tokens) de *listing* no bloco `<available_skills>` de **toda** sessão, em todos os papéis.
- **Equivalência de conteúdo conferida** numa regra-amostra: `get_rule("alt-text")` devolveu 8.544 caracteres estruturados contra 8.049 bytes do par local `SKILL.md` + `references/rule.md`. O MCP serve o mesmo texto.
- **A `frontend-checklist-global` é autossuficiente:** seus `references/categories.md` roteiam para as *ferramentas* do MCP e não referenciam nenhuma das 390 skills removidas.

**Por que apagar em vez de filtrar:** o bloco `<available_skills>` é montado pelo host varrendo os diretórios; o `skills_remove` do slim é por agente e seu efeito sobre esse bloco não foi verificado (`opencode debug agents` não expõe a lista de skills). A única forma verificável de tirar as entradas do prompt é o diretório não existir.

**Custo aceito:** a consulta de regra deixa de ser local/offline — passa a depender de rede e do servidor de terceiro. Sem MCP, a única fonte local é o resumo e os guardrails embutidos na `frontend-checklist-global`.

**Reversão:** `git revert` do commit da poda restaura diretórios e entradas do lock no mesmo passo.

## Revisão

Reavaliar se: (a) o fornecedor passar a exigir autenticação ou mudar o tratamento de dados; (b) o custo de contexto das 11 ferramentas atrapalhar sessões reais; (c) a skill local e o servidor divergirem de conteúdo; (d) algum papel além de orchestrator/oracle precisar de auditoria de código ou URL; (e) o MCP ficar indisponível com frequência — nesse caso, `git revert` da poda devolve o corpus local e o custo de contexto volta a ser o preço da autonomia.
