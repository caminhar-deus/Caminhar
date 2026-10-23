# AGENTS_OPERACAO.md — operação do oh-my-opencode-slim

> Detalhes de operação que só importam quando a tarefa envolve **pesquisa externa (MCP/web)** ou **delegação entre agentes**.
> O `AGENTS.md` guarda as regras que valem em toda sessão; este arquivo guarda o resto, para não pesar o contexto.
> Leia este arquivo antes de habilitar, negar ou depurar ferramentas de rede ou de mudar a matriz de agentes.

## 1. Notas do slim

**Sem `librarian` desde 18/10/2026.** O slim 3.0.5 fundiu o librarian no explorer (`MARKETPLACE_BUILTIN_RENAMES` em `dist/index.js`: `librarian -> explorer`), removendo-o de `SUBAGENT_NAMES`. Delegar doc externa é, agora, uma tarefa de **explorer** — peça explicitamente por context7/gh_grep quando for o caso. As regras de conduta estão em `.opencode/oh-my-opencode-slim/explorer_append.md`.

"Não edita" é imposto pelo bloco `agent` do `opencode.jsonc` (`edit` e `ast_grep_replace` em `deny` para explorer e oracle) — o `permission` do `.opencode/oh-my-opencode-slim.json` NÃO é aplicado aos papéis built-in neste host; conferir com `opencode debug agents`. O terminal desses dois NÃO pode ser negado: com `bash` em `deny` eles caem com erro de free tier.

## 2. Matriz de pesquisa (websearch, webfetch, gh_grep, context7, ai-memory, frontend-checklist)

Definida em 13/10/2026, com `webfetch` acrescentado em 14/10/2026, a coluna `librarian` removida em 18/10/2026 (merge do slim 3.0.5) e `frontend-checklist` ligado em 23/10/2026 (ADR-0022). São três mecanismos diferentes, em três lugares diferentes:

| Recurso | Tipo | Onde é controlado | orchestrator | explorer | designer/fixer | oracle |
|---|---|---|---|---|---|---|
| `context7` | MCP remoto (plugin slim) | `agents.<agente>.mcps` em `.opencode/oh-my-opencode-slim.json` | deny | allow | deny | deny |
| `gh_grep` | MCP remoto (plugin slim) | idem | allow | allow | deny | deny |
| `ai-memory` | MCP remoto (host) | idem | allow | deny | deny | deny |
| `frontend-checklist` | MCP remoto (host) | idem | allow | deny | deny | allow |
| `websearch` | **ferramenta nativa do host** (não é MCP) | bloco `agent.permission` do `opencode.jsonc` | allow | allow | deny | deny |
| `webfetch` | **ferramenta nativa do host** (não é MCP) | idem | ask | ask | deny | deny |

### Regras que evitam erro

- `websearch` NÃO é MCP. A entrada `"websearch"` em `disabled_mcps` do slim era inerte (o MCP Exa foi removido no slim 2.2.x) e por isso **essa lista está vazia**; o acesso ao websearch é permissão de ferramenta.
- O slim transforma cada lista `mcps` em permissões `<mcp>_*` (`allow` para os nomeados, `deny` para o resto). Listas explícitas, sem `"*"`, para a matriz não depender do padrão do plugin.
- `disabled_mcps` do slim é global: para negar a um agente, mexa em `agents.<agente>.mcps`, nunca lá.
- O slim **não recarrega config a quente**: `opencode debug agents` só mostra a matriz nova depois de reiniciar o host/service. Mudança em `opencode.jsonc` aparece na hora.
- Onde a **chave** fica: `CONTEXT7_API_KEY` e `EXA_API_KEY` vão no **`~/.bashrc`** (bloco próprio, fora do trecho gerenciado pelo slim), nunca no `.env` do projeto nem no `.env.example` — o Next.js lê `.env`, o processo do OpenCode não. A chave só entra em uso depois de `opencode service restart` (o service herda o ambiente do shell que o iniciou); sem chave, Context7 e Exa funcionam em modo anônimo/cota gratuita.
- Permitir `websearch` não a liga de fato: o host ainda precisa de provedor com chave no ambiente (`TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `EXA_API_KEY` ou `PARALLEL_API_KEY`) e de `websearch:provider` != `false` (estado guardado em `~/.local/share/opencode/opencode.db`, chave `kv.websearch:provider`). Sem isso a chamada falha com `WebSearch.ProviderRequired`.
- `webfetch` (14/10/2026): era `ask` para todos os agentes porque nenhum override o tocava — buraco de uma linha nesta matriz, já que os outros três recursos de rede eram negados aos mesmos quatro agentes. Passou a ser `deny` para explorer/designer/fixer/oracle. Três diferenças que evitam erro: o recurso da permissão é a **URL**, não a query (dá para allowlist por domínio, ex. `webfetch` + `https://opencode.ai/*` → `allow`); **não depende de provedor com chave**, ao contrário do `websearch`, então funciona mesmo sem nenhuma chave de busca; e o parâmetro `prompt` da ferramenta delega a um modelo secundário que falha no free tier (retorna 200 e não extrai nada) — busque a página e leia você mesmo.
