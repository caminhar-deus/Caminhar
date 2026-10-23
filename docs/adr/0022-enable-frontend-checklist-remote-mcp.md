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
3. **Manter a skill local** `frontend-checklist-global` como caminho padrão para consulta de regra, porque cobre o mesmo corpus (386 regras) sem enviar código do projeto.
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
- **Disponibilidade de terceiro.** Se o servidor cair ou mudar o contrato, os dois papéis perdem a ferramenta; a skill local permanece como alternativa.
- **Não verificado nesta sessão:** a exposição de `prompts`/`resources`/MCP App ao modelo pelo host OpenCode v2.1.4. O que está garantido são as 11 ferramentas; o restante depende do cliente.
- **Reinício obrigatório do host.** O plugin slim não recarrega config a quente: `opencode debug agents` só mostra a matriz nova depois de reiniciar o host/service. Até lá, a permissão compilada continua em `deny` para todos os papéis (estado observado logo após a edição).

## Revisão

Reavaliar se: (a) o fornecedor passar a exigir autenticação ou mudar o tratamento de dados; (b) o custo de contexto das 11 ferramentas atrapalhar sessões reais; (c) a skill local e o servidor divergirem de conteúdo; (d) algum papel além de orchestrator/oracle precisar de auditoria de código ou URL.
