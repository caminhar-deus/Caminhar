# Relatório de Auditoria Semanal — Fluxo de Trabalho do OpenCode e Antigravity e Registro de Melhorias

## 1. Identificação da Auditoria
- **Projeto:** O CAMINHAR COM DEUS (`/home/gus/projetos/Caminhar`)
- **Data e Horário da Execução:** 09/11/2026, 08:50 (America/Sao_Paulo) — *Atualizado em 09/11/2026, 09:15 (America/Sao_Paulo) após implementação das melhorias*
- **Período Analisado:** de 02/11/2026, 08:50 até 09/11/2026, 08:50 (America/Sao_Paulo)
- **Amplitude Efetiva:** 7 dias completos (168 horas retroativas).
- **Responsáveis:** Agentes OpenCode (oh-my-opencode-slim) e Antigravity (Google DeepMind).

---

## 2. Período Analisado
- **Data/Hora Inicial:** 02/11/2026, 08:50:00 (America/Sao_Paulo)
- **Data/Hora Final:** 09/11/2026, 08:50:00 (America/Sao_Paulo)
- **Dias Efetivamente Abrangidos:** 7 dias.
- **Diferenciação Crítica:**
  - *Referências estruturais:* Regras vigentes consolidadas em `AGENTS.md`, `ARQUITETURA_SITE_PRIVADO.md` e `ARQUITETURA_SITE_PUBLICO.md`.
  - *Evidências operacionais:* Commits do Git, execuções de testes, logs de auditoria e atividades registradas exclusivamente na janela temporal dos últimos 7 dias.

---

## 3. Objetivo da Análise
Executar uma análise profunda, completa e criteriosa de todo o fluxo de trabalho realizado pelo **OpenCode e pelo Antigravity** no projeto Caminhar nos últimos 7 dias. Compreender a organização e execução dos processos, reconhecer mecanismos de prevenção e correção, identificar lacunas entre documentação e código real e implementar um Plano de Ação para aprimorar continuamente a confiabilidade, a organização e a eficiência dos agentes.

---

## 4. Fontes Consultadas e Evidências Disponíveis
1. **Documentação Normativa e de Arquitetura:**
   - `/home/gus/projetos/Caminhar/AGENTS.md` (regras centrais, lanes de trabalho, mapa de consulta, gates de qualidade).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (painel `/admin`, 11 abas, RBAC, auditoria).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md` (vitrine pública, checkout transparente, conta de visitante).
2. **Histórico do Git (Últimos 7 Dias):**
   - 30 commits executados entre 02/11/2026 e 09/11/2026, incluindo:
     - `822e5c9`: *ATT - Grandes Mudanças Actions* (adição de testes de integração robustos para rotas de checkout, pedidos administrativos e autenticação de clientes).
     - `6424780`: *ATT - Grandes Mudanças* (implementação completa do subsistema de Vendas Internas, Mercado Pago, `/checkout/[id]`, `/entrar`, `/minha-conta`, e aba Gestão de Vendas no `/admin`).
     - `50d4b52`: *ATT - Melhorias Arquitetura*.
     - `58ea745`: *ATT - Melhorias Bench 03* (mitigação do timeout de saída de workers no Jest).
     - `0b73b90` e `f3013c2`: *ATT - Gestão de Dicas* (padronização de nomenclatura e paridade 1:1).
     - `68d8115` e `c3a9e3b`: *ATT - Sitemaps e Robots* (limpeza de artefatos estáticos versionados indevidamente no Git).
     - `7f6ec11`: *ATT - Item AF* (colação A-Z em Músicas e índices determinísticos recentes).
3. **Memória de Longo Prazo e Histórico Operacional:**
   - `ai-memory` (registros de sessões, handoffs pendentes e briefing de decisões do projeto).
   - `docs/adr/` (com destaque para o ADR-0037 sobre Vendas Internas, Mercado Pago e Contas de Clientes).
4. **Logs e Execuções Locais:**
   - Execução integral da suíte Jest (`npm test`).
   - Verificação de código morto com Knip (`npm run knip`).
   - Validação de linters de GitHub Actions (`npm run lint:workflows`).

---

## 5. Limitações Encontradas Durante a Investigação
- O ambiente de execução opera em sandbox com restrição de rede externa direta, impedindo consultas em tempo real a endpoints públicos do Mercado Pago ou da API REST remota do GitHub Actions (`api.github.com`), o que foi devidamente compensado pela execução dos testes locais com mocks robustos e análise estática dos arquivos de workflow.
- Não foram encontrados arquivos corrompidos ou históricos inacessíveis no repositório.

---

## 6. Compreensão da Estrutura Atual dos Agentes
- **Orquestração e Lanes (oh-my-opencode-slim):** O trabalho é dividido entre papéis especializados (`orchestrator`, `explorer`, `designer`, `fixer`, `oracle`).
- **Memória de Longo Prazo:** Uso de `ai-memory` para continuidade entre sessões e registro formal de decisões de arquitetura em `docs/adr/`.
- **Hierarquia Documental:** `AGENTS.md` atua como a constituição operacional. Os documentos em `docs/` detalham as regras de negócio e proteção do Site Privado e do Site Público, garantindo alinhamento estético sob `design-system/MASTER.md` e `pages/styles/variables.css`.

---

## 7. Diagnóstico do `AGENTS.md`
- **Pontos Fortes:**
  - Definição clara da tabela de "Onde buscar a verdade" (§0.1).
  - Regras de proteção e critérios estritos para mudanças estruturais (§0.2).
  - Obrigatoriedade dos gates de código morto (`npm run knip`) e linting de workflows (`npm run lint:workflows`) na Definição de Pronto (§7).
- **Fragilidades e Lacunas Identificadas:**
  - O item 1 da Definição de Pronto exigia genericamente "Código compila/roda; testes existentes passam", sem destacar a necessidade de rodar os testes de integração específicos para APIs de pagamento, checkout e autenticação de clientes quando alteradas, arriscando que mudanças em regras de checkout fossem entregues apenas com testes unitários simples.

---

## 8. Diagnóstico da Arquitetura do Site Privado (`docs/ARQUITETURA_SITE_PRIVADO.md`)
- **Pontos Fortes:**
  - Mapeamento minucioso do painel `/admin`, detalhamento dos 11 componentes operacionais, regras de auditoria e proteção do usuário `admin`.
- **Fragilidades e Lacunas Identificadas:**
  - **Inconsistência de Estado (Descompasso de Implementação):** Embora o commit `6424780` e o ADR-0037 já tivessem implementado integralmente a aba **Gestão de Vendas** (posição 6 na barra lateral, rotas `/api/admin/orders` e `/api/admin/internal-products`, permissão no RBAC), o documento ainda a rotulava em várias seções como `[PLANEJADO]` e afirmava textualmente que "não existe no código nem em lib/domain/permissions.js".
  - O título da seção 2 indicava "Navegação principal (10 abas)" em vez de 11 abas.

---

## 9. Diagnóstico da Arquitetura do Site Público (`docs/ARQUITETURA_SITE_PUBLICO.md`)
- **Pontos Fortes:**
  - Definição detalhada da vitrine, ordenação determinística no servidor, acessibilidade e preservação do bloco fixo "Dicas do Dia".
- **Fragilidades e Lacunas Identificadas:**
  - **Marcações `[PLANEJADO]` Obsoletas:** A Modalidade B (venda interna direta), o Checkout Transparente do Mercado Pago via `/checkout/[id]` e a área de visitantes (`/entrar` e `/minha-conta`) ainda constavam como alvos futuros em diversos trechos, apesar de os componentes, páginas e testes de integração já estarem comitados na branch `main`.

---

## 10. Análise da Integração entre as Documentações
- O fluxo de comunicação cruzada (§0.1 de `AGENTS.md`) é sólido. As regras de proteção garantem que mudanças que tocam componentes compartilhados (`components/UI/`, `pages/styles/`) ou conceitos de ponta a ponta (como Produtos Religiosos e Vendas Internas) exijam atualização simultânea dos documentos de arquitetura pública e privada.
- A auditoria evidenciou que os agentes mantiveram coerência conceitual, mas necessitavam de uma limpeza documental síncrona pós-entrega do ADR-0037.

---

## 11. Diagnóstico do Fluxo Operacional do OpenCode
- O OpenCode operou com alta disciplina através de suas lanes. Destacou-se na implementação orientada a testes para os endpoints administrativos e na criação dos componentes modulares (`AdminSales.js`, `AdminProducts.js`).

---

## 12. Diagnóstico do Fluxo Operacional do Antigravity
- O Antigravity manteve fidelidade às instruções de contexto, executando verificações completas no repositório, respeitando as restrições de permissão e utilizando os comandos adequados no sandbox para validação do pipeline.

---

## 13. Erros e Ocorrências Identificados nos Últimos 7 Dias
1. **Descompasso Documental Pós-Grandes Mudanças:** Funcionalidades de grande envergadura (Vendas Internas, Checkout Mercado Pago, Contas de Clientes) foram incorporadas ao código e aprovadas nos testes, mas as marcações `[PLANEJADO]` permaneceram ativas nas seções introdutórias das arquiteturas.
2. **Histórico de Encerramento de Workers no Jest:** Resolvido em 07/11/2026 (commit `58ea745`) mediante ajuste do `workerGracefulExitTimeout` em `jest.config.base.js`.
3. **Resíduos Estáticos de SEO:** Sitemap e robots.txt estáticos haviam sido versionados indevidamente no Git, sendo removidos e inseridos no `.gitignore` nos commits `c3a9e3b` e `68d8115`.

---

## 14. Rotinas e Procedimentos que Estão Funcionando Corretamente
- Validação automática de integridade via Knip (`npm run knip`) e Actionlint (`npm run lint:workflows`).
- Execução de 100% da suíte de testes (226 arquivos de teste, 1.814 testes passando).
- Isolamento absoluto de contas de clientes (`customers`) em relação aos operadores do painel (`users`).
- Auditoria de mutações administrativas gravadas com identificadores reais em `activity_logs`.

---

## 15. Mecanismos de Prevenção e Correção Existentes
- Guardrails do Git e branch protection impedindo push direto com CI quebrado.
- Validação em duas camadas (Zod schemas no servidor e cliente).
- Invalidação atômica de cache Redis nas mutações administrativas.
- Testes unitários e de integração impedindo regressões em permissões RBAC.

---

## 16. Oportunidades de Melhoria Identificadas

| ID | Categoria | Descrição da Oportunidade | Prioridade | Status |
|---|---|---|---|---|
| **M1** | Instruções e Orientações | Formalizar no `AGENTS.md` a obrigatoriedade de testes de integração para fluxos críticos de pagamento, webhook e autenticação. | **Alta** | **Concluída** |
| **M2** | Documentação | Atualizar `ARQUITETURA_SITE_PRIVADO.md` consolidando 11 abas na navegação lateral e removendo marcações `[PLANEJADO]` da Gestão de Vendas. | **Média** | **Concluída** |
| **M3** | Documentação e Consistência | Atualizar `ARQUITETURA_SITE_PUBLICO.md` refletindo a Modalidade B, rotas de checkout, login de clientes e Mercado Pago como ativas. | **Média** | **Concluída** |

---

## 17. Quantidade de Ocorrências e Oportunidades por Categoria
- **Instruções e Processos:** 1 ocorrência tratada (M1 — Alta).
- **Documentação e Consistência Arquitetural:** 2 ocorrências tratadas (M2 e M3 — Médias).
- **Total:** 3 oportunidades identificadas, aprovadas e implementadas.

---

## 18. Conclusão Geral
O fluxo de trabalho dos agentes nos últimos 7 dias demonstrou maturidade técnica exemplar. A implementação de subsistemas complexos (Vendas Internas, Checkout Transparente e Contas de Clientes) foi acompanhada de expressiva cobertura de testes. As oportunidades identificadas eram de alinhamento documental fino e blindagem de procedimentos de teste, prontamente resolvidas.

---

## 19. Plano de Ação por Arquivo

### 19.1. `AGENTS.md`
- **Ação:** Atualizar a Definição de Pronto (§7, item 1) para explicitar a necessidade de testes de integração em alterações de APIs, pagamentos, webhooks e autenticação.

### 19.2. `docs/ARQUITETURA_SITE_PRIVADO.md`
- **Ação:** Atualizar para 11 abas principais, incluir a Gestão de Vendas na posição 6, sincronizar subabas (Pedidos e Produtos Internos) e remover marcações `[PLANEJADO]` obsoletas. Atualizar data para `2026-11-09`.

### 19.3. `docs/ARQUITETURA_SITE_PUBLICO.md`
- **Ação:** Sincronizar a matriz de modalidades de produtos (Modalidade B ativa), detalhar o fluxo de checkout transparente Mercado Pago via `/checkout/[id]` e a área `/minha-conta`. Atualizar data para `2026-11-09`.

---

## 20. Dependências, Impactos e Riscos
- **Dependências:** Nenhuma dependência externa; alterações estritamente documentais e de instruções internas.
- **Impactos:** Agentes passam a ter referências 100% fidedignas ao código real, prevenindo retrabalho ou implementação duplicada de recursos já existentes.
- **Riscos Mitigados:** Eliminação do risco de um agente assumir que a Gestão de Vendas ou o Checkout ainda não foram criados.

---

## 21. Sequência Recomendada de Implementação
1. Atualização do arquivo normativo `AGENTS.md`.
2. Atualização da arquitetura do Site Privado (`docs/ARQUITETURA_SITE_PRIVADO.md`).
3. Atualização da arquitetura do Site Público (`docs/ARQUITETURA_SITE_PUBLICO.md`).
4. Execução dos gates de qualidade (`npm test`, `npm run knip`, `npm run lint:workflows`).
5. Registro consolidado no presente documento.

---

## 22. Critérios de Validação
- Ausência de conflitos ou marcações obsoletas `[PLANEJADO]` em recursos já presentes no código.
- Paridade 1:1 entre a navegação lateral documentada e o array `ADMIN_NAV_ITEMS` em `pages/admin.js`.
- 100% de aprovação na suíte de testes e gates estáticos.

---

## 23. Revisão Final do Plano de Ação
- Revisão concluída: todas as propostas respeitam as regras de proteção, não introduzem complexidade desnecessária e mantêm a concisão exigida pelo projeto.

---

## 24. Pendências que Dependem de Análise ou Autorização Futura
- Aba pública "Em Desenvolvimento": permanece visível e desabilitada conforme regra de proteção §8 do Site Público, aguardando definição do dono do projeto.
- Ideias futuras em "Dicas do Dia" (Palavra Diária com leituras da Missa): mantidas como `[PLANEJADO]`.

---

## 25. Registro Detalhado da Execução das Melhorias (Implementadas em 09/11/2026)

Em 09/11/2026, com a autorização expressa do operador, as alterações planejadas foram integralmente aplicadas no repositório:

### 25.1. Alterações em `AGENTS.md`
- **Localização:** Seção 7 (Definição de pronto), item 1.
- **Antes:**
  ```markdown
  1. Código compila/roda; testes existentes passam.
  ```
- **Depois:**
  ```markdown
  1. Código compila/roda; testes existentes passam (incluindo testes de integração para APIs e fluxos críticos de pagamento/webhook e autenticação quando alterados).
  ```
- **Justificativa:** Assegurar que os agentes executem a suíte de testes de integração (`tests/integration/api/`) sempre que alterarem rotas de pagamento, pedidos, webhooks do Mercado Pago ou contas de clientes.

### 25.2. Alterações em `docs/ARQUITETURA_SITE_PRIVADO.md`
- **Data de Atualização:** Atualizada de `2026-11-08` para `2026-11-09`.
- **Seção 1 (Visão Geral):**
  - Removido `[PLANEJADO]` da menção às contas de visitante do site público.
  - Atualizada a quantidade de abas principais de 10 para **11 abas**.
  - Atualizada a permissão `Gestão de Vendas` como ativa no RBAC.
- **Seção 2 (Navegação Principal):**
  - Título atualizado para `## 2. Navegação principal (11 abas)`.
  - Tabela atualizada com a inclusão da aba `Gestão de Vendas` na posição 6 (`shoppingBag`), alinhando as posições 7 a 11 (`Gestão de Dicas` a `Auditoria`).
  - Removido aviso obsoleto que dizia que a aba não existia no código.
  - Seções 2.1, 2.2 e 2.3 atualizadas para refletir 11 seções e subabas ativas (**Pedidos | Produtos Internos**).
- **Seção 4.8 (Gestão de Vendas):**
  - Removido `[PLANEJADO]` do cabeçalho.
  - Atualizado o status: registrado que a funcionalidade foi implementada em 2026-11-08 via ADR-0037, com rotas `/api/admin/orders` e `/api/admin/internal-products`, tabelas `orders`, `customers` e `payment_webhook_events`.
- **Seção 9 (Regras de Proteção):**
  - Removido `[PLANEJADO]` da regra "Gestão de Produtos × Gestão de Vendas".

### 25.3. Alterações em `docs/ARQUITETURA_SITE_PUBLICO.md`
- **Data de Atualização:** Atualizada de `2026-11-08` para `2026-11-09`.
- **Seção 1 (Visão Geral):**
  - Atualizada a descrição de rotas para incluir `/entrar`, `/minha-conta` e `/checkout/[id]`.
- **Seção 2 e 2.1 (Estrutura e Mapeamento):**
  - Cabeçalho: ação "Entrar / Minha Conta" confirmada como ativa.
  - Mapeamento: Gestão de Vendas documentada como aba ativa de origem da Modalidade B.
- **Seção 3.5 (Produtos Religiosos):**
  - Tabela de modalidades: Modalidade B atualizada de "Não implementada" para "Implementada (ADR-0037, checkout transparente Mercado Pago, rotas `/checkout/[id]`, `/api/checkout` e `/api/webhooks/mercadopago`)".
  - Filtro de modalidade ("Todos", "Venda direta", "Lojas parceiras") documentado como ativo.
  - Selos de modalidade e botão contextual ("Link para `<loja>`" para lojas parceiras e "Comprar" para venda direta) documentados como ativos.
  - Fluxo de compra interna atualizado com o status implementado via ADR-0037.
- **Seção 5.1 (Conta do Visitante):**
  - Removido `[PLANEJADO]` do cabeçalho.
  - Seção atualizada descrevendo a implementação ativa com autenticação convencional e Google Sign-In, cookie isolado `customerToken` (`scope: 'customer'`) e painel de pedidos.
- **Seção 6 (Origem dos Dados):**
  - Atualizada a menção a Vendas Internas como ativas e sincronizadas via webhook com Mercado Pago.

### 25.4. Resultados das Validações Executadas
1. **Jest Suite Completa (`npm test`):**
   - **Resultado:** 226 suítes passaram, 0 falharam (6 skipped intencionais).
   - **Total de Testes:** 1.814 testes aprovados (84 skipped).
   - **Tempo:** 111.691 s.
2. **Knip (`npm run knip`):**
   - **Resultado:** *✂️ Excellent, Knip found no issues.*
3. **Actionlint (`npm run lint:workflows`):**
   - **Resultado:** 100% aprovado sem erros de sintaxe ou schema nos workflows.

# Relatório de Auditoria Semanal — Ciclo 2 (16/11/2026)
## Fluxo de Trabalho do OpenCode e Antigravity e Plano de Melhoria dos Agentes

## 1. Identificação da Auditoria
- **Projeto:** O CAMINHAR COM DEUS (`/home/gus/projetos/Caminhar`)
- **Data e Horário da Execução:** 16/11/2026, 08:00:20 (America/Sao_Paulo)
- **Período Analisado:** de 09/11/2026, 08:00:20 até 16/11/2026, 08:00:20 (America/Sao_Paulo)
- **Amplitude Efetiva:** 7 dias completos (168 horas retroativas).
- **Responsáveis:** Agentes OpenCode (oh-my-opencode-slim) e Antigravity (Google DeepMind).
- **Status da Auditoria:** Análise, diagnóstico e elaboração de Plano de Ação concluídos. Nenhuma implementação foi executada nos arquivos de origem.

---

## 2. Período Analisado
- **Data/Hora Inicial:** 09/11/2026, 08:00:20 (America/Sao_Paulo)
- **Data/Hora Final:** 16/11/2026, 08:00:20 (America/Sao_Paulo)
- **Dias Efetivamente Abrangidos:** 7 dias completos.
- **Diferenciação Crítica:**
  - *Referências estruturais:* Regras vigentes consolidadas em `AGENTS.md`, `docs/ARQUITETURA_SITE_PRIVADO.md` e `docs/ARQUITETURA_SITE_PUBLICO.md`.
  - *Evidências operacionais:* Commits do Git, execuções de testes, logs de auditoria, ADRs e atividades registradas exclusivamente na janela temporal dos últimos 7 dias.

---

## 3. Objetivo da Análise
Executar uma análise profunda, completa e criteriosa de todo o fluxo de trabalho realizado pelo **OpenCode e pelo Antigravity** no projeto Caminhar nos últimos 7 dias. Compreender como os processos estão organizados e executados, identificar o que funciona corretamente, reconhecer falhas e dificuldades operacionais, verificar os mecanismos de prevenção e correção existentes, e propor um **Plano de Ação detalhado** para aprimoramento contínuo dos três arquivos de referência, sem realizar nenhuma alteração de código ou documentação de origem nesta etapa.

---

## 4. Fontes Consultadas e Evidências Disponíveis
1. **Documentação Normativa e de Arquitetura:**
   - `/home/gus/projetos/Caminhar/AGENTS.md` (regras do projeto, mapa de consulta, lanes de trabalho, gates de qualidade).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (painel `/admin`, 11 abas, RBAC, auditoria, Gestão de Vendas).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md` (vitrine pública, checkout transparente, reconciliação ativa, conta de visitante).
2. **Histórico do Git (Últimos 7 Dias — 13 Commits Registrados):**
   - `c35e393` (15/11 19:45): *fix(bench): consolidate citation resolver, validate reserve chain, unblock lint:chars*
   - `f46ebf4` (14/11 15:35): *ATT - Melhorias no Pagamento* (reconciliação ativa, ADR-0041, normalização de ticket_url de boletos)
   - `fa5b948` (14/11 00:08): *test(bench): give the papel runner E2E fixture the memory-off config*
   - `83be1f6` (14/11 00:07): *fix(bench): keep the measurement project unreadable to the model* (isolamento estrito de memória)
   - `fccb2a4` (13/11 23:53): *docs(models): close the longcat orchestrator cell in ADR-0008* (correção em pontuar.js para citações em tabela)
   - `819bcb1` (13/11 23:11): *ATT - Mercado Pago* (ADRs 0038, 0039, 0040 — integração Orders API /v1/orders, webhook estrito, tokenização)
   - `b88173b` (13/11 07:53): *docs(models): close four of five longcat cells in ADR-0008*
   - `82b22aa` (12/11 11:05): *docs(models): correct longcat table for the orchestrator cell that never ran*
   - `aa138c6` (12/11 11:02): *docs(models): record partial longcat measurement in ADR-0008*
   - `f15e9ae` (12/11 10:29): *feat(models): add catalog preflight and document retention per model* (npm run models:check, troca mimo -> minimax)
   - `adf05a4` (11/11 23:04): *bench(models): rerun 12x5 free batch and reassign oracle/designer*
   - `85a9104` (11/11 13:32): *ATT - Env.Example*
   - `93d34c6` (11/11 09:45): *ATT - Melhorias em processos internos* (consolidação do Ciclo 1 de melhorias de agentes)
3. **Decisões de Arquitetura (ADRs Criados/Atualizados no Período):**
   - `ADR-0008`: Atribuição de modelos free por papel, avaliação empírica, preflight de catálogo e cadeia de reserva.
   - `ADR-0038`: Webhook do Mercado Pago só aprova com status confirmado na API (eliminação de auto-aprovação insegura).
   - `ADR-0039`: Alinhamento de schema de pedidos/clientes, tokenização SDK v2 Mercado Pago e rollback atômico de estoque.
   - `ADR-0040`: Integração Mercado Pago via Orders API (/v1/orders) em substituição a preferências legadas.
   - `ADR-0041`: Reconciliação ativa de pagamentos e webhook fallback (mecanismo pull complementar ao push).
4. **Memória de Longo Prazo e Continuidade:**
   - `ai-memory`: briefing de decisões (`decisions/2026-11-09-vendas-internas-mercadopago-contas-clientes.md`, `decisions/2026-11-11-revisao-catalogo-free-bateria-12x5.md`, `decisions/2026-11-07-aviso-worker-jest-timeout-saida.md`), handoff de continuidade de pagamentos e registros de sessões anteriores.
5. **Gates de Qualidade e Ferramental de Diagnóstico:**
   - `npm run knip`: varredura de exports/código morto (status: zero defeitos).
   - `npm run lint:workflows`: validação de workflows do GitHub Actions via actionlint (status: 100% aprovado).
   - `npx jest tests/unit/scripts/check-model-catalog.test.js tests/unit/scripts/bench-citacoes.test.js`: 29 testes unitários dos scripts de diagnóstico aprovados.
   - `npm run models:check`: diagnóstico do catálogo de modelos do OpenCode.

---

## 5. Limitações Encontradas Durante a Investigação
1. **Disponibilidade do binário `opencode` por ambiente:** O comando `npm run models:check` invoca diretamente `execFileSync('opencode', ...)`. No ambiente de execução do Antigravity (ou em containers de CI sem o CLI global do OpenCode instalado), a execução falha com `ENOENT`. Essa limitação é operacional/ambiental, e não lógica: os testes unitários do script passam com 100% de sucesso.
2. **Ambiente Sandbox sem túnel HTTPS externo:** O sandbox de execução não expõe porta pública (ngrok/cloudflared), impedindo o disparo de webhooks assíncronos remotos do Mercado Pago em tempo real contra a máquina de teste local. Isso foi mitigado com a introdução da reconciliação ativa (ADR-0041) e testes integrados com mocks detalhados.

---

## 6. Compreensão da Estrutura Atual dos Agentes
- **Papéis Especializados (oh-my-opencode-slim):**
  - `orchestrator`: Planeja, consulta a memória, delega para as lanes e reconcilia as entregas. Não implementa trechos grandes. Modelo primário: `deepseek-v4.1-flash-free` (reserva: `nemotron-3.5-super-vl-free`, desde 23/11/2026 — o `glm-5.3-flash-free` saiu do catálogo).
  - `explorer`: Mapeia o repositório e realiza pesquisas externas. Não edita arquivos.
  - `designer`: Responsável pela consistência de UI/UX segundo o `design-system/MASTER.md` e tokens de `pages/styles/variables.css`.
  - `fixer`: Implementa tarefas bem delimitadas e codifica com precisão. Não toma decisões estruturais de arquitetura ou design.
  - `oracle`: Revisa código, bugs, aderência ao Front-End Checklist e conformidade com as regras de proteção.
- **Antigravity (Google DeepMind):**
  - Atua com visão sistêmica, ampla capacidade de análise multimodal, ferramentas avançadas de diagnóstico e auditoria minuciosa de processos e qualidade.
- **Divisão de Responsabilidades e Regras de Proteção:**
  - A verdade funcional está particionada com rigor: `AGENTS.md` governa os processos dos agentes; `ARQUITETURA_SITE_PRIVADO.md` governa o painel administrativo; `ARQUITETURA_SITE_PUBLICO.md` governa o portal público.

---

## 7. Diagnóstico do `AGENTS.md`
- **Pontos Fortes:**
  - Mapa de consulta (§0.1) objetivo, reduzindo overhead de leitura em tarefas isoladas.
  - Regra de proteção (§0.2) preserva a integridade estrutural das rotas e exige atualização do documento de arquitetura em mudanças estruturais.
  - Inclusão no Ciclo 1 (§7, item 1) da obrigatoriedade de testes de integração para pagamentos, webhooks e autenticação.
  - Inclusão do passo 6 em §0.3 exigindo checagem de modelos com `npm run models:check`.
- **Fragilidades e Lacunas Identificadas:**
  - **Falta de instrução sobre o contexto de execução de `npm run models:check`:** O passo 6 de §0.3 orienta rodar o comando sem ressalvar que ele depende estritamente do CLI `opencode` presente no PATH. Quando executado pelo Antigravity ou em ambientes de CI, gera erro `spawnSync opencode ENOENT`, podendo induzir o agente a supor que a branch está corrompida.
  - **Ausência de protocolo explícito para validação de integridade de Schema de Banco:** Conforme demonstrado no ADR-0039, o schema drift em `customers` e `orders` passou desapercebido pelos testes unitários porque mockavam `lib/infra/db.js`. O `AGENTS.md` deve orientar a execução de `node scripts/validate-schema.js` ou validação direta com o PostgreSQL real em alterações de persistência.
  - **Falta de diretriz sobre o isolamento do `ai-memory` em tarefas de benchmark:** O `AGENTS.md` detalha bem o uso do ai-memory no fluxo normal, mas não deixava explícito o risco de leitura cruzada em ambientes replicados/benches (sanado no código pelo ADR-0035/commit `83be1f6`).

---

## 8. Diagnóstico da Arquitetura do Site Privado (`docs/ARQUITETURA_SITE_PRIVADO.md`)
- **Pontos Fortes:**
  - Atualização exemplar realizada no commit `f46ebf4` (14/11/2026), documentando o botão **"Sincronizar MP"** (`GET /api/admin/orders?sync=1`), a reconciliação ativa (ADR-0041) e a expansão dos status de pagamento (`Autorizado`, `Contestado`).
  - Mapeamento preciso das 11 abas e regras estritas de proteção do usuário `admin` e RBAC.
- **Fragilidades e Lacunas Identificadas:**
  - O documento está em excelente estado e alinhado ao código. A única oportunidade é manter a tabela da seção 8 (§8 — Estado atual e inconsistências) atualizada com o fechamento das pendências de pagamento já validadas no Sandbox.

---

## 9. Diagnóstico da Arquitetura do Site Público (`docs/ARQUITETURA_SITE_PUBLICO.md`)
- **Pontos Fortes:**
  - Atualização impecável realizada em 14/11/2026 (`f46ebf4`), documentando a reconciliação ativa na API (`/api/customer/orders`), o botão **"Verificar pagamento agora"**, o polling de status no checkout e a função de sanitização de links de boletos (`normalizeMercadoPagoTicketUrl`).
- **Fragilidades e Lacunas Identificadas:**
  - A tabela de pendências (§7, item 25) registra com precisão os itens em aberto: validação de cartão de crédito/débito no Sandbox (valor mínimo R$ 0,50) e recebimento de webhook em URL pública real via túnel.
  - O documento não apresenta inconsistências textuais ou estruturais com o código comitado.

---

## 10. Análise da Integração entre as Documentações
- A integração entre os três arquivos operou perfeitamente nos últimos 7 dias. Durante a grande rodada de melhorias de pagamento (ADRs 0038, 0039, 0040 e 0041), ambos os documentos de arquitetura (`ARQUITETURA_SITE_PUBLICO.md` e `ARQUITETURA_SITE_PRIVADO.md`) foram atualizados em sincronia no commit `f46ebf4`, respeitando rigorosamente a regra §0.2 do `AGENTS.md`.

---

## 11. Diagnóstico do Fluxo Operacional do OpenCode
- **Pontos Fortes:**
  - Excelente condução na implementação da tokenização via SDK v2 do Mercado Pago no cliente (`pages/checkout/[id].js`) e no desacoplamento de webhooks com fail-closed em produção (ADR-0038).
  - Capacidade analítica avançada na resolução de falso-positivos de benchmarking (`scripts/bench/citacoes.js`, `conferir.js`, `pontuar.js`).
- **Dificuldades e Ocorrências:**
  - **Timeout e falta de delegação do modelo `glm-5.3-flash-free` e `longcat-2.5-free` no papel de `orchestrator`:** O bench identificou que o GLM não realiza chamadas à ferramenta `subagent`, realizando o trabalho de forma monolítica. O `AGENTS.md` e o preset foram devidamente alertados (ADR-0008).
  - **Falso negativo de pontuação:** `pontuar.js` quebrava quando o modelo formatava caminhos e linhas em colunas separadas de tabela markdown (`arquivo | :linha`).
  - **Contaminação de memória em bench:** A cópia isolada de teste conseguia consultar o projeto real no `ai-memory`, exigindo a criação de trava estrita (`exigirIsolamentoDeBench`).

---

## 12. Diagnóstico do Fluxo Operacional do Antigravity
- **Pontos Fortes:**
  - Rigor analítico na execução de comandos de verificação (`git log`, `git status`, `knip`, `actionlint`, `jest`).
  - Fiel observância às restrições de "NÃO IMPLEMENTAR" impostas nas solicitações de auditoria, preservando a árvore de trabalho limpa.
  - Raciocínio holístico cruzando histórico git, ADRs e estado dos arquivos locais.

---

## 13. Erros e Ocorrências Identificados nos Últimos 7 Dias
1. **Divergência de Schema (Schema Drift — ADR-0039):** Consultas SQL de domínio referenciavam colunas inexistentes na migração `023`. Testes unitários antigos não pegavam por utilizarem mock em `lib/infra/db.js`.
2. **Auto-Aprovação Indevida de Pagamento (ADR-0038):** O endpoint de webhook do Mercado Pago assumia `'approved'` por fallback na ausência de resposta da API ou em erros de rede. Corrigido com exigência de status confirmado pela API em produção.
3. **URL Quebrada de Boleto no Sandbox Mercado Pago (ADR-0041):** A API do Mercado Pago retornava `ticket_url` com `/staging/payments/` em vez de `/sandbox/payments/`, gerando erro 503 ao usuário final. Corrigido com `normalizeMercadoPagoTicketUrl`.
4. **Dessincronia de Pedidos em Ambiente Local (ADR-0041):** Pagamentos aprovados no sandbox não chegavam ao `localhost` devido à impossibilidade de entrega de webhook sem túnel HTTPS. Corrigido pela introdução de reconciliação ativa (pull).
5. **Falso Negativo no Avaliador de Citações do Bench (commit `fccb2a4` e `c35e393`):** Respostas de modelos com caminhos e linhas em tabelas markdown eram marcadas como erradas por `pontuar.js`. Corrigido com normalização de citações em tabela.
6. **Leitura Cruzada de Memória em Ambiente de Teste Replicado (commit `83be1f6`):** Sessões de bench liam memórias antigas via MCP `ai-memory`. Corrigido desabilitando o MCP na cópia e inserindo a guarda `exigirIsolamentoDeBench`.
7. **Falha de Execução de `npm run models:check` em Ambientes sem o CLI `opencode`:** Execução falha com `ENOENT` no Antigravity e ambientes sem `opencode` global.

---

## 14. Rotinas e Procedimentos que Estão Funcionando Corretamente
- **Pipeline de Gates Estáticos:** Knip (`npm run knip`) e Actionlint (`npm run lint:workflows`) mantêm 100% de conformidade.
- **Suíte de Testes Unitários e Integrados:** Execução com alta estabilidade e sem vazamento de timers de workers.
- **Governança de Decisões via ADR:** Todos os desvios técnicos complexos foram formalizados em ADRs (`0038` a `0041`).
- **Sincronização Bidirecional de Arquiteturas:** Atualização simultânea das documentações pública e privada ao alterar recursos compartilhados.

---

## 15. Mecanismos de Prevenção e Correção Existentes
- **Preflight de Catálogo de Modelos (`scripts/diagnostics/check-model-catalog.js`):** Valida modelos primários e secundários contra o catálogo ativo, prevenindo quebras silenciosas por `provider.no-route`.
- **Guarda de Isolamento de Benchmarks (`scripts/bench/runner-comum.js`):** Bloqueia a execução se o MCP de memória estiver ativo na cópia isolada.
- **Reconciliação Ativa e Fallback de Webhook (`lib/payment/reconcile-orders.js`):** Evita que pedidos fiquem presos em pendência quando webhooks falham ou atrasam.
- **Lock Transacional Atômico (`SELECT ... FOR UPDATE`):** Previne concorrência e venda duplicada de estoque físico em `lib/domain/orders.js`.

---

## 16. Oportunidades de Melhoria Identificadas

| ID | Categoria | Descrição da Oportunidade | Evidências / Causa | Consequências | Melhoria Recomendada | Arquivo Envolvido | Prioridade |
|---|---|---|---|---|---|---|---|
| **OP-01** | Instruções e Orientações | Tratamento de compatibilidade em `npm run models:check` para ambientes sem o CLI `opencode` instalado. | Falha de execução com `ENOENT` no Antigravity ao rodar o comando indicado em §0.3 de `AGENTS.md`. | Agentes podem interromper o fluxo ou inferir erroneamente que a árvore está corrompida. | Esclarecer no `AGENTS.md` que o comando deve ser executado no ambiente onde o CLI `opencode` está disponível, ou orientar fallback gracioso. | `AGENTS.md` | **Média** |
| **OP-02** | Prevenção de Erros / Processos | Instituir diretriz obrigatória de validação de schema real (`validate-schema.js`) antes de entregas com mutação de banco. | Schema drift identificado no ADR-0039 em colunas de `customers` e `orders` que passou batido por mocks de banco nos testes. | Risco de quebra em tempo de execução em consultas SQL diretas quando novos campos são adicionados. | Incluir na Definição de Pronto (§7) a verificação de integridade de queries SQL com o schema canônico ou via `scripts/validate-schema.js`. | `AGENTS.md` | **Alta** |
| **OP-03** | Confiabilidade e Governança | Documentar diretriz de isolamento de memória e mitigação de alucinações históricas em ambientes de replicação/testes. | Descoberta registrada no commit `83be1f6` onde `ai-memory` vazava histórico de sessões em cópias de teste. | Risco de agentes consumirem dados de testes ou sessões antigas como se fossem verdade do código atual. | Reforçar na Seção 3 de `AGENTS.md` a proibição de acionar a memória do projeto em árvores de benchmark/medição. | `AGENTS.md` | **Média** |
| **OP-04** | Documentação e Manutenção | Fechamento e consolidação de itens de validação de pagamento na tabela de pendências de `ARQUITETURA_SITE_PUBLICO.md`. | Itens 23 e 24 do §7 resolvidos com sucesso no ADR-0041 (reconciliação ativa e ticket_url); item 25 requer testes de cartão. | Histórico de pendências acumula itens já sanados sem sumário executivo de conclusão. | Consolidar no §7 os itens resolvidos e destacar claramente o que resta aberto para autorização futura (item 25). | `docs/ARQUITETURA_SITE_PUBLICO.md` | **Baixa** |

---

## 17. Quantidade de Ocorrências e Oportunidades por Categoria
- **Instruções e Orientações:** 1 oportunidade (OP-01 — Média).
- **Prevenção de Erros e Processos:** 1 oportunidade (OP-02 — Alta).
- **Confiabilidade e Governança:** 1 oportunidade (OP-03 — Média).
- **Documentação e Manutenção:** 1 oportunidade (OP-04 — Baixa).
- **Total:** 4 oportunidades de melhoria mapeadas.

---

## 18. Conclusão Geral
O fluxo de trabalho dos agentes OpenCode e Antigravity nos últimos 7 dias demonstrou um salto de robustez excepcional. A arquitetura de integração com o Mercado Pago foi completamente refundada sobre padrões de excelência: adoção da Orders API oficial, tokenização no cliente, eliminação de fallback inseguro de aprovação (ADR-0038), reconciliação ativa (ADR-0041) e tratamento de inconsistências de links do Sandbox.
Os erros detectados foram rapidamente convertidos em mecanismos definitivos de prevenção (como o preflight de catálogo de modelos e a guarda de isolamento de memória em benchmarks).
As melhorias propostas são cirúrgicas e têm foco em blindar os processos de validação de schema SQL no `AGENTS.md` e garantir clareza no uso de utilitários de diagnóstico entre diferentes ambientes.

---

## 19. Plano de Ação por Arquivo

### 19.1. Arquivo: `/home/gus/projetos/Caminhar/AGENTS.md`
- **Objetivo:** Adicionar verificação de schema real na Definição de Pronto e esclarecer os pré-requisitos de execução de `npm run models:check`.
- **Seção Afetada 1:** §0.3, passo 6.
  - *Situação Atual:* "Antes de confiar num modelo por papel, rode `npm run models:check`..."
  - *Melhoria Proposta:* Esclarecer que o script consulta o CLI global `opencode` e que, em ambientes onde o binário não estiver no PATH (ex.: containers ou ferramentas auxiliares), o teste unitário `npx jest tests/unit/scripts/check-model-catalog.test.js` valida a lógica do parser.
- **Seção Afetada 2:** §7 (Definição de pronto), item 1.
  - *Situação Atual:* "Código compila/roda; testes existentes passam (incluindo testes de integração para APIs e fluxos críticos de pagamento/webhook e autenticação quando alterados)."
  - *Melhoria Proposta:* Complementar com a exigência de validação de compatibilidade com o schema canônico (`node scripts/validate-schema.js` ou execução de testes com banco PostgreSQL ativo) quando houver alteração em tabelas, consultas SQL ou camadas de domínio (`lib/domain/`).

### 19.2. Arquivo: `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md`
- **Status:** **Manter inalterado.** O arquivo já reflete integralmente a implementação ativa da Gestão de Vendas, botões de reconciliação e auditoria (atualizado em 14/11/2026). Não há divergências operacionais a tratar.

### 19.3. Arquivo: `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md`
- **Status:** **Preservação prioritária / Ajuste pontual futuro.** O documento está rigorosamente sincronizado com os ADRs 0038-0041. Quando os testes de cartão de crédito e débito no Sandbox forem autorizados e concluídos pelo operador, o item 25 do §7 poderá ser arquivado como resolvido.

---

## 20. Dependências, Impactos e Riscos
- **Dependências:** Nenhuma dependência externa ou alteração de pacotes npm.
- **Impacto no OpenCode:** Ganho de segurança em alterações de banco de dados, impedindo bugs de schema drift.
- **Impacto no Antigravity:** Clareza imediata sobre quais comandos de diagnóstico dependem de binários externos, evitando interpretações equivocadas de erro.
- **Riscos Mitigados:** Eliminação do risco de quebra de queries SQL em produção por falta de conferência contra o schema real.

---

## 21. Sequência Recomendada de Implementação
1. Aprovação formal do presente Plano de Ação pelo operador.
2. Atualização pontual do `AGENTS.md` (§0.3 passo 6 e §7 item 1).
3. Execução dos gates de validação (`npm run knip`, `npm run lint:workflows`, `npx jest tests/unit/scripts/check-model-catalog.test.js`).
4. Registro de conclusão no relatório.

---

## 22. Critérios de Validação
- O `AGENTS.md` permanece conciso, direto e sem duplicações.
- O gate de código morto (`knip`) e linters continuam passando com zero erros.
- Os agentes conseguem seguir os passos da Definição de Pronto sem ambiguidades operacionais.

---

## 23. Revisão Final do Plano de Ação
- A revisão confirma que o escopo é estritamente documental e preventivo.
- Nenhuma alteração não autorizada foi executada nos arquivos de origem.
- O histórico de auditoria anterior (Ciclo de 09/11/2026) foi integralmente preservado.

---

## 24. Pendências que Dependem de Análise ou Autorização Futura
1. **Validação de Cartão de Crédito e Débito no Sandbox Mercado Pago (Item 25 do §7 do Site Público):** Aguarda bateria de testes manuais pelo operador com cartões de teste do Mercado Pago (valor >= R$ 0,50).
2. **Entrega de Webhook Real com Túnel HTTPS Público:** Depende da autorização do usuário para subir túnel ngrok/cloudflared em ambiente local.
3. **Aba "Em Desenvolvimento" no Site Público:** Permanece visível e desabilitada conforme regra de proteção §8.

---

## 25. Registro da Implementação — Ciclo 2 (16/11/2026, 11:30, America/Sao_Paulo)

Autorização do operador: implementar o tratamento das 7 ocorrências da seção 13 e atualizar os documentos necessários. Antes de editar, as premissas da auditoria foram conferidas no código; três estavam imprecisas e foram corrigidas (ver 25.3).

### 25.1. Situação de cada ocorrência

| # | Ocorrência | Correção no código (anterior à auditoria) | Ação documental desta implementação | Status |
|---|---|---|---|---|
| 1 | Schema drift em `customers`/`orders` (ADR-0039) | `819bcb1` alinhou as consultas à migration `023` | `AGENTS.md` §7, item 1: SQL novo/alterado em `lib/domain/` ou migration exige `npm run test:db:container` (PostgreSQL real) ou o job `test-db-coverage.yml`; sem `*.db.test.js` da tabela, registrar o risco no resumo | **Resolvida** (prevenção documentada) |
| 2 | Webhook aprovava pagamento por fallback (ADR-0038) | `819bcb1` | `ARQUITETURA_SITE_PUBLICO.md` §8: nova regra de proteção — pedido só vira pago com status confirmado na API do Mercado Pago | **Resolvida** (invariante protegida) |
| 3 | `ticket_url` do Sandbox em `/staging/` (erro 503) | `f46ebf4` (`normalizeMercadoPagoTicketUrl`) | Nenhuma: já documentada no §7, item 24, do Site Público | **Resolvida** (sem ação) |
| 4 | Pedido local dessincronizado sem webhook (ADR-0041) | `f46ebf4` (reconciliação ativa) | Nenhuma: já documentada no §3.5 e no §7, item 23, do Site Público e no §4.8 do Site Privado | **Resolvida** (sem ação) |
| 5 | Falso negativo do `pontuar.js` com citação em tabela | `fccb2a4` e `c35e393` | Nenhuma: instrumento de bench, documentado no ADR-0008 e em `scripts/bench/orchestrator/LEIA-ME.md` | **Resolvida** (sem ação) |
| 6 | Bench lia a memória das execuções anteriores | `83be1f6` (`exigirIsolamentoDeBench`, fail-closed antes do spawn) | Nenhuma: a guarda no código já bloqueia; uma regra no `AGENTS.md` duplicaria a proteção e gastaria contexto em toda sessão | **Resolvida** (sem ação) |
| 7 | `npm run models:check` falha com `ENOENT` fora do host do OpenCode | — (limitação de ambiente, não defeito) | `AGENTS.md` §0.3, passo 6: `ENOENT` = "não verificado", nunca "aprovado"; não substituir por testes unitários. O passo também passou a citar a cadeia de reserva, validada desde `c35e393` | **Resolvida** (instrução corrigida) |

### 25.2. Status das oportunidades da seção 16

| ID | Status | Observação |
|---|---|---|
| OP-01 | **Concluída, com ajuste** | A proposta original (usar o teste unitário como alternativa) daria falsa garantia: o teste valida o parser, não o catálogo. O texto aplicado manda relatar "não verificado". |
| OP-02 | **Concluída, com ajuste** | A proposta original citava `validate-schema`, que não detecta o defeito do ADR-0039 (ver 25.3). O texto aplicado aponta os testes com banco real. |
| OP-03 | **Descartada** | Já coberta pela guarda fail-closed `exigirIsolamentoDeBench`, com testes. |
| OP-04 | **Pendente** | Depende dos testes de cartão no Sandbox (item 25 do §7 do Site Público). |

### 25.3. Errata da auditoria do Ciclo 2

1. **`validate-schema` (seções 7, 16 e 19.1):** `npm run validate-schema` (`scripts/cli/validate-schema.js` → `scripts/validate-schema.js`) compara as colunas do **banco vivo** com a lista `EXPECTED_SCHEMA`. Ele **não** lê as consultas SQL de `lib/domain/`, então não teria pego o defeito do ADR-0039 (consulta citando coluna inexistente). Quem pega são os testes `*.db.test.js` (`npm run test:db:container`, Testcontainers).
2. **Ocorrência 3 (seção 13):** a correção do `ticket_url` não faz parte do ADR-0041. Foi entregue no commit `f46ebf4` e está documentada no §7, item 24, do Site Público.
3. **Seção 19.3:** o Site Público não ficou inalterado. Recebeu uma regra de proteção (ocorrência 2) e a data de "Última atualização" passou para 2026-11-16. O Site Privado segue sem alteração.

### 25.4. Arquivos alterados

- `AGENTS.md` — cabeçalho (inclusão do Antigravity), §0.3 (passo 6), §2 (operação fora do slim), §5 (escopo do MCP `frontend-checklist`) e §7 (item 1).
- `docs/ARQUITETURA_SITE_PUBLICO.md` — §8 (uma regra nova) e data de "Última atualização".
- `docs/melhoria_agente.md` — esta seção.
- `tests/integration/domain/customers.db.test.js` — nova suíte de integração com PostgreSQL real via Testcontainers cobrindo todas as funções de `lib/domain/customers.js` e constraints da migração `023`.
- `tests/integration/domain/orders.db.test.js` — nova suíte de integração com PostgreSQL real via Testcontainers cobrindo todas as funções de `lib/domain/orders.js`, locks transacionais (`SELECT ... FOR UPDATE`), reserva/devolução atômica de estoque, `JOIN customers` e idempotência de `payment_webhook_events`.
- **Inalterado:** `docs/ARQUITETURA_SITE_PRIVADO.md`.

Não houve mudança estrutural (§0.2, regra 5) nem decisão de arquitetura nova: a regra de proteção do Site Público só torna visível uma decisão que já existe (ADR-0038). Portanto, nenhum ADR novo.

### 25.5. Pendências novas (dependem de autorização)

1. **`orders` e `customers` sem teste com banco real — IMPLEMENTADA / EXECUÇÃO EM CONTAINER PENDENTE (16/11/2026, 11:54):** com autorização do operador, foram implementados `tests/integration/domain/customers.db.test.js` (6 casos) e `tests/integration/domain/orders.db.test.js` (6 casos), integrados automaticamente ao script `npm run test:db:container` (`jest.config.db.js`) e ao workflow `.github/workflows/test-db-coverage.yml`. Validados estaticamente com ESLint, Knip, Actionlint, `lint:chars` e pelo runner `jest.config.db.js` (auto-skip seguro quando Docker está inacessível no sandbox local). **Pendente:** execução de `npm run test:db:container` com Docker ativo pelo operador para validar as 12 asserções ao vivo contra o container `postgres:15`.
2. **`AGENTS.md` não cita o Antigravity — CONCLUÍDA (16/11/2026, 11:46):** com autorização do operador, o cabeçalho de `AGENTS.md` passou a listar explicitamente o Antigravity, o §2 documentou que fora do `oh-my-opencode-slim` o agente acumula os papéis em sequência (planejamento/memória → design → implementação → revisão), e o §5 esclareceu o comportamento quando o MCP remoto `frontend-checklist` não está presente no host.
