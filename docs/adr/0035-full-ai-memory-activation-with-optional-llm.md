# ADR-0035: Ativação completa do ai-memory no projeto, com LLM opcional por chave de ambiente

- **Status:** Aceito
- **Data:** 2026-11-06
- **Decisores:** dono do projeto (pacote de ações aprovado em sessão)
- **Relacionados:** página de memória `decisions/2026-10-04-llm-provider-desativado.md` (decisão anterior, revertida aqui); `AGENTS.md` §3; `.ai-memory.toml`; `~/.config/opencode/plugins/ai-memory-opencode2.ts`; `~/.config/opencode/opencode.json`; `docs/ai-memory-error.md`

## Contexto

O ai-memory já estava instalado no projeto (servidor HTTP em `127.0.0.1:49374`, banco local, MCP registrado no OpenCode, hooks de captura), mas funcionava em modo parcial. Uma auditoria feita em 2026-11-06 encontrou cinco lacunas:

1. **Captura de subagentes descartada** — `drop_subagent_captures = "true"` no `.ai-memory.toml` fazia as sessões dos subagentes do slim não serem gravadas.
2. **Briefing desligado** — o bloco `[briefing]` não injetava o resumo do projeto no início da sessão, obrigando recalls manuais.
3. **Captura do assistente desligada** — o plugin do OpenCode gravava só prompts/tool calls, sem as respostas do assistente, e rodava fora do modo allowlist.
4. **LLM desativado** — o servidor respondia `no LLM provider configured` para `memory_query(answer=true)` e `memory_consolidate`, por decisão anterior registrada em `decisions/2026-10-04-llm-provider-desativado.md`.
5. **Higiene pendente** — projetos órfãos (`Caminhar/Caminhar`, `default/chain-test`, `default/scratch`), sessões abertas antigas, handoffs vencidos e 43 achados de lint (duplicatas de sessões de bench, páginas frias) acumulados.

Também foi observado *drift* de versão: servidor/container em **3.4.2** e cliente nativo em **3.4.3**. O `docker pull` da imagem `latest` informa "up to date", ou seja, o client mais novo ainda não tem imagem correspondente publicada — a compatibilidade de protocolo foi verificada e não bloqueia a captura.

## Decisão

Ativar o ai-memory por completo no projeto, com estas escolhas:

1. **Gravar capturas de subagentes**: `drop_subagent_captures = "false"` no `.ai-memory.toml` (subagentes passam a gerar sessões/observações; o custo é mais volume, avaliado como aceitável para o slim).
2. **Injetar briefing no início da sessão**: `[briefing] inject_on_session_start = "true"` com `max_chars = 4000`.
3. **Captura do assistente e allowlist**: reinstalar os hooks do OpenCode no modo `allowlist` com `--capture-assistant`, e manter `AI_MEMORY_CAPTURE_ASSISTANT=true` no ambiente do container. Repositórios sem marcador `.ai-memory.toml` não enviam nada.
4. **Habilitar LLM via provedor compatível com OpenAI** (`openai-compat`) apontando para o endpoint compatível do Google Gemini (`https://generativelanguage.googleapis.com/v1beta/openai`), com o modelo **`gemini-3.5-flash`** (validado por `ai-memory llm-test`), e a chave fornecida **apenas por arquivo de ambiente protegido** (`~/.config/ai-memory/llm.env`, `chmod 600`), nunca em linha de comando, prompt, `.env` versionado ou página de memória. Esta decisão **substitui** a de 2026-10-04 que mantinha o LLM desligado.
5. **Manter `AI_MEMORY_CONSOLIDATE_ON_SESSION_END` desligado** (padrão): a consolidação automática ao fim da sessão fica sob demanda, para não gerar custo de LLM sem intenção explícita.
6. **Higiene única**: encerrar sessões antigas, cancelar handoffs vencidos e remover projetos órfãos por `purge-project --confirm` (delete lógico). Não apagar páginas de sessão de bench só para zerar avisos de lint; elas são mantidas como histórico e o lint é informativo.
7. **Manter o servidor em loopback** (`127.0.0.1:49374`), sem autenticação, por ser acesso local de um único operador. Expor a porta exigirá `ai-memory auth enable` antes.

## Alternativas consideradas

- **Manter o LLM desligado** (decisão de 2026-10-04): descartada pelo dono; sem LLM não há `answer=true` nem consolidação automática, e o objetivo é usar o recall completo.
- **Consolidar automaticamente ao fim de cada sessão** (`AI_MEMORY_CONSOLIDATE_ON_SESSION_END=true`): descartada por custo e por gerar páginas sem revisão; a consolidação continua explícita.
- **Apagar as páginas duplicadas de sessões de bench**: descartada. Os 15 avisos de título duplicado vêm de execuções repetidas do mesmo benchmark; apagar ~200 páginas de sessão para limpar avisos informativos destrói histórico sem ganho funcional. O lint segue como sinal, não como gate.
- **Reinstalar o servidor em 3.4.3**: não há imagem publicada; a tentativa de `docker pull` não trouxe versão nova. Ficou registrado o *drift* e a decisão de não recompilar a imagem localmente.

## Consequências

### Positivas

- Recall de sessões e subagentes fica completo, incluindo o texto do assistente.
- O briefing automático reduz idas manuais à memória no começo de cada sessão.
- `memory_query(answer=true)` e consolidação passam a funcionar quando a chave for configurada.
- Estado limpo: 1 sessão aberta (a corrente), 0 handoffs pendentes, 2 projetos (`pessoal/caminhar` e `default/_global`).
- Índices verificados: FTS 1078/1078 páginas e 25790/25790 observações; embeddings 1078 linhas, 0 páginas sem vetor; spool vazio.

### Negativas e riscos

- **Custo de LLM**: consultas com `answer=true` e consolidações passam a consumir tokens do provedor escolhido.
- **Privacidade**: trechos de memória serão enviados ao provedor de LLM; a chave fica em arquivo protegido, mas o conteúdo sai da máquina. Não usar provedor sem contrato de dados adequado.
- **Contexto**: o briefing consome até 4000 caracteres em toda sessão; se o modelo local ficar apertado, reduzir ou desligar no marcador.
- **Drift de versão** 3.4.2 (servidor) × 3.4.3 (cliente) permanece até o upstream publicar a imagem; monitorar o changelog.
- **Sem backup automático**: o backup do banco é manual (`ai-memory backup --to`); não há agendamento.
- **Delete lógico**: os projetos purgados somem da API e da busca, mas os bytes permanecem no arquivo SQLite até um `VACUUM`/`--compact`.

## Revisão

- Reavaliar quando a imagem 3.4.3 (ou superior) for publicada e o container puder ser atualizado.
- Reavaliar custo/benefício do LLM após algumas semanas de uso real; se o custo ou a política de dados do provedor forem inaceitáveis, voltar ao modo sem LLM e registrar novo ADR.
- Reavaliar `max_chars` do briefing se o contexto do modelo principal ficar apertado.
- Se a porta deixar de ser loopback, habilitar autenticação antes de expor.
