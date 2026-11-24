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
| 7 | `npm run models:check` falha com `ENOENT` fora do host do OpenCode | `--standalone` como padrão + código de saída `2` (23/11/2026) | `AGENTS.md` §0.3, passo 6: `ENOENT` = "não verificado" (saída `2`, distinta de falha real `1`), nunca "aprovado"; não substituir por testes unitários. O preflight lê a config **do disco** (`--standalone`, padrão) e `--service` mostra o host em execução. O passo também cita a cadeia de reserva, validada desde `c35e393` | **Resolvida** (instrução e código) |

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


---

# Relatório de Auditoria Semanal — Ciclo 3 (23/11/2026)
## Fluxo de Trabalho do OpenCode e Antigravity e Plano de Melhoria dos Agentes

## 1. Identificação da Auditoria
- **Projeto:** O CAMINHAR COM DEUS (`/home/gus/projetos/Caminhar`)
- **Data e Horário da Execução:** 23/11/2026, 08:00:43 (America/Sao_Paulo / BRT, `-03:00`)
- **Período Analisado:** de 16/11/2026, 08:00:43 até 23/11/2026, 08:00:43 (America/Sao_Paulo / BRT)
- **Amplitude Efetiva:** 7 dias completos (168 horas retroativas).
- **Agentes Auditados:** OpenCode (`oh-my-opencode-slim`) e Antigravity (Google DeepMind).
- **Executor desta Auditoria:** Antigravity (rotina semanal de diagnóstico — modo exclusivamente analítico).
- **Status da Auditoria:** Análise, diagnóstico e Plano de Ação concluídos e revisados. **Nenhuma implementação ou alteração nos arquivos de origem foi executada.**

---

## 2. Período Analisado
- **Data/Hora Inicial:** 16/11/2026, 08:00:43 `-03:00` (`America/Sao_Paulo`)
- **Data/Hora Final:** 23/11/2026, 08:00:43 `-03:00` (`America/Sao_Paulo`)
- **Quantidade de Dias Efetivamente Abrangidos:** 7 dias.
- **Diferenciação Estrita entre Referências e Evidências:**
  - **Referências estruturais (lidas integralmente, independentemente da data de modificação):** `AGENTS.md` (264 linhas), `docs/ARQUITETURA_SITE_PRIVADO.md` (446 linhas; última atualização `2026-11-22`) e `docs/ARQUITETURA_SITE_PUBLICO.md` (251 linhas; última atualização `2026-11-22`), complementadas por `docs/AGENTS_OPERACAO.md`, `CLAUDE.md`, `.ai-memory.toml`, `opencode.jsonc` e `.opencode/oh-my-opencode-slim/*_append.md`.
  - **Evidências operacionais (estritamente da janela de 7 dias):** 40 commits no Git (de `b37c9f1` em 16/11/2026 11:58:44 `-0300` até `ee4ed2e` em 22/11/2026 17:18:50 `-0300`), ADRs criados ou atualizados no período (`0042`, `0043`, atualizações em `0037` e `0041`), auditorias produzidas na janela (`docs/retorno_da_semana.md`, `docs/melhoria_mercadopago.md`, `docs/melhoria_google.md`, `docs/melhoria_design.md` e §25 do Ciclo 2 em `docs/melhoria_agente.md`), logs locais de teste/cobertura de 22/11/2026 (17:16–17:18), gates estáticos rodados em modo somente leitura em 23/11/2026 e o contexto passivo injetado pelo hook `SessionStart` do `ai-memory` em 23/11/2026.

### Atualização de Status dos Itens Abertos do Ciclo 2 (16/11/2026)

| Item do Ciclo 2 | Situação anterior (16/11) | Status atualizado em 23/11/2026 | Evidência na janela |
|---|---|---|---|
| **OP-04** (`ARQUITETURA_SITE_PUBLICO.md` §7 item 25) | Pendente | **Resolvida (17–18/11/2026)** | Pedidos #22–#31 validados no Sandbox e webhook real via `cloudflared` gravado em `payment_webhook_events` (`id` 14, 16, 17, 19, 21, 23, 25, 27, 29, 31); `debit_card` direto mantido como decisão comercial opcional do recebedor (commits `dbcbbc0`, `6b69224`, `554c056`–`feb768a`). |
| **§24 item 1** (cartões Sandbox) | Pendente | **Resolvida (16–18/11/2026)** | Homologação completa documentada em `docs/melhoria_mercadopago.md` e `ARQUITETURA_SITE_PUBLICO.md` §7 item 25. |
| **§24 item 2** (webhook real via túnel HTTPS) | Pendente | **Resolvida (17/11/2026)** | Túnel `cloudflared` + Simulador de Notificações do Mercado Pago gravado no banco (`dbcbbc0`, `6b69224`). |
| **§24 item 3** (aba "Em Desenvolvimento") | Pendente | **Permanece pendente** | Mantida visível e desabilitada conforme regra de proteção §8 do Site Público. |
| **§25.5 item 1** (`.db.test.js` no Docker) | Pendente de execução | **Parcialmente reaberta** | Validada no CI `test-db-coverage.yml` (Runs `#128`, `#129`, `#132` para o código de 16/11), mas `lib/domain/customers.js` e `customers.db.test.js` receberam novo SQL em 19/11 (`f161227`), ainda pendente de confirmação com Docker/CI (`docs/melhoria_google.md` Ciclo 2 §3). |
| **§25.5 item 2** (`AGENTS.md` citar Antigravity) | Concluída | **Concluída (16/11/2026)** | Aplicada no cabeçalho, §2 e §5 de `AGENTS.md` (commit `b37c9f1`). |

---

## 3. Objetivo da Análise
Executar uma investigação profunda, completa e baseada em evidências de todo o fluxo operacional realizado pelo **OpenCode** e pelo **Antigravity** no projeto Caminhar nos últimos 7 dias, avaliando aderência às regras de `AGENTS.md`, `docs/ARQUITETURA_SITE_PRIVADO.md` e `docs/ARQUITETURA_SITE_PUBLICO.md`, identificando falhas, recorrências, acertos e mecanismos de prevenção, para elaborar um **Plano de Ação detalhado** sem alterar nenhum arquivo de origem nesta execução.

---

## 4. Fontes Consultadas e Evidências Disponíveis
1. **Documentos de referência estrutural (lidos na íntegra):**
   - `/home/gus/projetos/Caminhar/AGENTS.md` (L1–264).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (L1–446).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md` (L1–251).
2. **Documentos operacionais e configurações dos agentes:**
   - `docs/AGENTS_OPERACAO.md`, `CLAUDE.md` (`@AGENTS.md`), `.ai-memory.toml`, `opencode.jsonc`, `.opencode/oh-my-opencode-slim/{orchestrator,explorer,designer,fixer,oracle}_append.md` e `.agents/skills/ai-memory-retrieval/SKILL.md`.
3. **Histórico Git (40 commits de 16/11 11:58 a 22/11 17:18 BRT):**
   - **16/11:** `b37c9f1` (implementação Ciclo 2 + `.db.test.js`), `dc77185` (Retorno da Semana + `NÃO VERIFICADO` em `models:check` + guarda SQL estática + `checkout.cy.js`), `905712e` (`melhoria_mercadopago.md`), `01a4a3f` (fix overload `cy.intercept`), `9289fb0` (estrutura), `dbcbbc0` (Ação 03 webhook/túnel).
   - **17/11:** `6b69224` (validação real de webhook via `cloudflared` + Pedido #22).
   - **18/11:** `8b5da20` (bump `jsdom` 31 / `next` 16.4.6 / `eslint` 10.15 / `cypress` 16.3 / `knip` 6.45 + fix `LazyIframe.test.js`), `b3e06eb` (Docs/CHANGELOG), `6e94332` (performance `/uploads/[...path].js` `ETag` + `res.end`), `eaeb298` (recalibração do gabarito do bench), e 9 commits incrementais de homologação Sandbox Mercado Pago (`554c056`, `711813c`, `c1c7219`, `2d425db`, `f28b4c3`, `fa8d2a9`, `6f1a785`, `6762b05`, `feb768a` — Pedidos #23–#31).
   - **19/11:** `60acbc2` (`.vscode/settings.json` `python.terminal.useEnvFile: true`), `80478dd` (Google GIS + CSP + COOP), `75fb1cb` (Standards CSS `CustomerPages`), `fad08f6` (ADR-0042 JWKS local), `7d68032` (isolamento env Jest `tests/setup-env.js` + `melhoria_google.md`), `3946444` (Docs), `cca0956` (skill `ai-memory`), `f161227` (implementação Ciclo 2 `melhoria_google.md`).
   - **20/11:** `a681cc5` (implementação `melhoria_design.md` — 24 tokens CSS, contraste AA, remoção de inline, `customer.md`, guard global `css-tokens.test.js`).
   - **21/11:** `c1dd831` (ajuste ordenação Produtos), `c64424a` (fix rolagem `ProductList`), `54ed1f3` (ajuste botão Voltar blog), `25081d9` (Visão Geral com 8 cards incluindo Gestão de Vendas e Produtos Internos), `00758a7` (filtro `modality=external` em Gestão de Produtos), `e934811` (ADR-0043 timeout de 1h no `/admin` + guarda 401 unificada), `c676098` (alinhamento botões/ícone/`exportToCSV` em `AdminSales`), `3547934` (Estrutura).
   - **22/11:** `28b6b17` (endurecimento de segurança em 13 rotas de API + atualização de `AGENTS.md`, `ARQUITETURA_*` e gabaritos de bench), `0091855` (integração `rate_limit:whitelist` em `lib/cache/cache.js`), `ee4ed2e` (pré-carregamento da contagem `Pedidos (0)` em `AdminSales`).
4. **ADRs e Relatórios produzidos/atualizados na janela:** `docs/adr/0041`, `0042`, `0043`, `0037`, `docs/adr/README.md`, `docs/retorno_da_semana.md`, `docs/melhoria_mercadopago.md`, `docs/melhoria_google.md`, `docs/melhoria_design.md`, `CHANGELOG.md`.
5. **Confronto direto no código-fonte:** `pages/admin.js`, `pages/minha-conta.js`, `components/Admin/AdminSales.js`, `components/Admin/AdminProducts.js`, `pages/api/products.js`, `pages/api/admin/fetch-ml.js`, `scripts/bench/ground-truth.js`, `package.json`.
6. **Logs locais e gates estáticos executados em modo somente leitura (23/11/2026):**
   - `logs/tests-output.log` (22/11 17:16) e `logs/coverage-output.log` (22/11 17:18): `241 passed, 8 skipped (249 total)` suítes; `2.090 passed, 96 skipped (2.186 total)` testes; `6 snapshots`.
   - `logs/eslint.log` (21/11 18:09): 0 bytes (0 erros/warnings).
   - Executados em 23/11/2026: `npm run knip` (`0 issues`), `npm run lint:workflows` (`actionlint 1.7.12`, OK), `npm run security:check-sql` (264 arquivos, OK), `npm run security:check-credentials` (102 arquivos, OK), `npm run lint:chars` (785 arquivos, OK), `npx jest tests/unit/scripts/bench-ground-truth.test.js tests/unit/tests-hygiene/css-tokens.test.js tests/unit/scripts/schema-sources.test.js` (`3 passed, 28 passed`), `npm run models:check` (`EXIT=1`, `status: NÃO VERIFICADO`, `spawnSync opencode ENOENT`, preset `zen` válido com 6 modelos e 1 reserva).
7. **Contexto passivo injetado pelo hook `SessionStart` do `ai-memory` (23/11/2026):** handoff pendente de `antigravity-cli` (23/11 00:17:10 BRT) relatando dúvida sobre `"Puxar Dados"` do Mercado Livre trazer apenas a primeira imagem; alerta de `_lint/report.md` (23/11 07:48:42 BRT) listando **20 warnings** na wiki; briefing de decisões pinadas.

---

## 5. Limitações Encontradas Durante a Investigação
1. **MCP `ai-memory` negado por permissão:** as chamadas `memory_briefing`, `memory_recent`, `memory_handoff_list`, `memory_read_page` e `memory_status` foram bloqueadas por negativa de permissão no MCP; não houve contorno. Por isso, não foi possível inspecionar a lista completa de sessões dos últimos 7 dias nem os 20 warnings de `_lint/report.md`.
2. **Histórico nativo de sessões anteriores indisponível:** no sandbox, `/home/gus/.gemini/antigravity/brain/` contém apenas a conversa atual, e não há acesso a logs locais de sessões do OpenCode (`~/.local/share/opencode`). Como todos os 40 commits têm autor único (`caminhar`), é **`NÃO DETERMINADO`** qual agente executou individualmente cada commit fora dos relatórios em `docs/` que identificam explicitamente o executor.
3. **Catálogo vivo do OpenCode não verificado:** `npm run models:check` sai com `ENOENT` fora do host do OpenCode (`status: NÃO VERIFICADO`), impedindo atestar em 23/11 que os 6 modelos + 1 reserva do preset `zen` permanecem disponíveis em `opencode models`.
4. **Sem Docker nem rede externa no sandbox:** `npm run test:db:container` (8 suítes `*.db.test.js`, 96 testes) e a API remota do GitHub Actions não puderam ser executados/consultados ao vivo.
5. **`.env*` não inspecionado (`AGENTS.md` §6):** valores reais de credenciais e chaves (como `ML_ACCESS_TOKEN` ou Client IDs do Google) não foram lidos.

---

## 6. Compreensão da Estrutura Atual dos Agentes
- **OpenCode (`oh-my-opencode-slim`):** opera com 5 papéis especializados (`orchestrator`, `explorer`, `designer`, `fixer`, `oracle`; com o antigo `librarian` fundido ao `explorer` desde 18/10/2026). Regras gerais ficam em `AGENTS.md`; matriz de pesquisa e regras de MCP ficam em `docs/AGENTS_OPERACAO.md` e `opencode.jsonc`; complementos por papel ficam em `.opencode/oh-my-opencode-slim/*_append.md`. Tem acesso ao CLI `opencode` (`models:check`), ao MCP remoto `frontend-checklist` (`orchestrator` e `oracle`) e ao `ai-memory`.
- **Antigravity:** explicitamente documentado em `AGENTS.md` (cabeçalho, §2 e §5) desde 16/11 (`b37c9f1`). Executa o ciclo de ponta a ponta acumulando os papéis em sequência (`planejamento/memória → design → implementação → revisão`), aplicando integralmente §0, §1 e §3–§7, usando os guardrails locais (`frontend-checklist-global` + `design-system/MASTER.md`) em vez do MCP remoto `frontend-checklist`, e relatando `"não verificado"` quando comandos dependem de `opencode` ou Docker ausentes no sandbox.
- **Hierarquia documental e acionamento:** `AGENTS.md` (§0.1–§0.3) atua como roteador central: mudanças no site público obrigam leitura integral de `ARQUITETURA_SITE_PUBLICO.md` + §7 (pendências) + §8 (proteção); mudanças no painel `/admin` obrigam leitura integral de `ARQUITETURA_SITE_PRIVADO.md` + §8 + §9; mudanças cruzadas ou em `components/UI/`, `pages/styles/` e rotas compartilhadas (`/api/settings`, `/api/products`, `/api/upload-image`, `/api/status`, `/api/uploads/[...path]`) exigem leitura dos dois documentos. Decisões arquiteturais oficiais vão para `docs/adr/` (`template.md`); recall e handoffs ficam no `ai-memory`.

---

## 7. Diagnóstico do `AGENTS.md`
- **Pontos Fortes (preservar):**
  - Mantido enxuto (98 linhas próprias fora dos blocos gerenciados `ai-memory` e `nextjs-agent-rules`) e atualizado com rigor em duas rodadas da semana (`b37c9f1` em 16/11 e `28b6b17` em 22/11).
  - Mapa "Onde buscar a verdade" (§0.1), regras de mudança estrutural (§0.2), roteiro de execução (§0.3), adaptação para Antigravity (§2 e §5), padrão de segurança em `pages/api/` (§6) e inclusão dos gates estáticos de segurança (`security:check-sql`, `security:check-credentials`) em §7.8 são claros e aplicáveis.
- **Fragilidades e Lacunas Identificadas (com evidências da semana):**
  1. **Escopo restrito do alerta do canário `bench-ground-truth.test.js` (§7 item 1):** atualmente menciona apenas rotas em `pages/api/` que adicionem/removam rotas ou desloquem `withAuth`/`requireAuth`/`createAdminHandler`. Na realidade (`scripts/bench/ground-truth.js`), o canário falha também ao deslocar âncoras em rotas sem auth como `pages/api/uploads/[...path].js` (o que ocorreu em `6e94332` → `eaeb298`), além de `next.config.js`, `proxy.js`, `lib/auth/auth.js`, `lib/api/permissions.js`, `design-system/MASTER.md`, `pages/styles/variables.css` e `components/UI/{Button,Input,BaseCard}.module.css`.
  2. **Ausência de verificação de specs E2E Cypress novos/alterados (§7 item 1):** `cypress/e2e/checkout.cy.js` (`dc77185`) quebrou o CI `e2e.yml` (`#137–#138`) por erro de overload em `cy.intercept`, corrigido em `01a4a3f` após rodar `npx cypress run --spec`.
  3. **Falta de referência ao guard global de CSS e aos overrides de página (§4 e §7 item 2):** a passada "Standards" (`75fb1cb`) corrigiu só `CustomerPages.module.css` e deixou 24 declarações inválidas em 3 arquivos irmãos (`OC-06`), além da falta do override `design-system/pages/customer.md` e da seção em `admin.md`. O guard `tests/unit/tests-hygiene/css-tokens.test.js` foi criado em `a681cc5`, mas `AGENTS.md` ainda não orienta usá-lo nem proíbe correções isoladas sem varrer arquivos irmãos.
  4. **Ausência de protocolo quando o MCP `ai-memory` é negado/indisponível (§3):** em 3 auditorias da semana (19/11 Google, 19/11 Design, 23/11 Agentes), as chamadas `ai-memory` foram negadas por permissão; `AGENTS.md` §3 manda consultar `memory_query`, mas não diz como degradar com honestidade (usar hook + código/Git, não contornar a negativa e registrar a limitação).
  5. **Ausência de regra explícita de precedência sobre os anexos de papel do OpenCode (§2):** `.opencode/oh-my-opencode-slim/designer_append.md` e `orchestrator_append.md` conflitam com `AGENTS.md` §3 e §4 (caminhos `design-system/<projeto>/`, `"HTML + Tailwind"`, gravar decisão na memória em vez de ADR).
  6. **Falta de lembrete para rodar `npm test` ao alterar configs de editor/ambiente (§7 item 1):** o commit `60acbc2` alterou `.vscode/settings.json` (`python.terminal.useEnvFile: true`) sem validar os testes e derrubou 13 suítes / 27 testes (`7d68032`).

---

## 8. Diagnóstico da Arquitetura do Site Privado (`docs/ARQUITETURA_SITE_PRIVADO.md`)
- **Pontos Fortes (preservar):**
  - Sincronizado ativamente em múltiplos commits da semana (`25081d9`, `00758a7`, `e934811`, `28b6b17`, `0091855`; data `2026-11-22`), documentando os 8 cartões/barras da Visão Geral, o isolamento `modality=external` na Gestão de Produtos, o timeout de 1h + guarda 401 unificada (ADR-0043), controles detalhados de `/api/auth/*`, `/api/settings`, `/api/upload-image`, `rate_limit:whitelist` e novas regras de proteção em §9 (autorização fail-closed e anti-SSRF/erros seguros).
- **Inconsistências e Lacunas Confirmadas no Código:**
  1. **Contradição interna em §4.5 (L241 vs L245) e divergência real formulário × API:** L241 afirma `Link do Produto * (obrigatório no schema e no formulário — ADR-0037)`, porém L245 ainda mantém o trecho antigo de 28–29/10 `"(paridade: nome, imagem e preço > 0 obrigatórios; link opcional válido)"`. No código real, `components/Admin/AdminProducts.js:28` exige `link` obrigatório (`min(1)` + `.url()`), mas `pages/api/products.js:42` aceita `link: z.string().url('URL inválida').optional().or(z.literal(''))` — configurando **divergência real entre documento/formulário e schema da API** (reportada para decisão do dono conforme `AGENTS.md` §0.2 regra 4).
  2. **Divergência de nomenclatura em §4.8 (L287):** o status logístico aparece como **`Em preparo`**, enquanto §4.1 (L165) e o código real (`components/Admin/AdminSales.js:218`, `components/Admin/AdminDashboard.js:162`, `pages/minha-conta.js:27`) usam **`Em separação`**.
  3. **Categorização imprecisa em §8 (L423–428):** o item 23 (`Endurecimento de Segurança das APIs`) foi adicionado em `28b6b17` abaixo do subtítulo **`Vendas internas`**, embora trate de `/api/settings`, `/api/upload-image`, `fetch-ml`, `fetch-spotify`, `fetch-youtube`, `rate-limit` e `dicas`.
  4. **Lacunas de precisão em §4.5 e §4.8:**
     - Em §4.5 L241, merece explicitação mais direta que, **sem `ML_ACCESS_TOKEN`**, o `"Puxar Dados"` do Mercado Livre lê `og:image` do preview HTML (`pages/api/admin/fetch-ml.js:227,244`) e traz **apenas a primeira imagem** — o carrossel completo vem somente da API oficial com token (`:324,351`). Essa clareza teria prevenido a dúvida registrada no handoff pendente de 23/11 00:17 BRT.
     - Em §4.8 L283/L286, os 8 badges exibidos na tabela (`getPaymentBadge` em `AdminSales.js:232-245`) diferem das 6 opções de filtro no `<select>` (`PAYMENT_STATUS_OPTIONS` em `:204-212`, sem `authorized` e `charged_back`), e em `ee4ed2e` foi adicionado pré-carregamento silencioso da contagem da subaba `Pedidos` ao abrir diretamente em `Produtos Internos`.

---

## 9. Diagnóstico da Arquitetura do Site Público (`docs/ARQUITETURA_SITE_PUBLICO.md`)
- **Pontos Fortes (preservar):**
  - Atualizado em todas as mudanças relevantes da semana (`b37c9f1`, `dbcbbc0`, `6b69224`, `554c056`–`feb768a`, `80478dd`, `fad08f6`, `28b6b17`; data `2026-11-22`), incorporando ADR-0038 em §8, ativação e validação JWKS local do Google Sign-In (ADR-0042), homologação no Sandbox Mercado Pago e a regra de proteção de segurança das APIs públicas e de visitantes em §8.
- **Inconsistências e Lacunas Confirmadas no Código:**
  1. **Contradição interna em §3.5 (L145):** preserva a frase residual pré-ADR-0037 `"Os itens de 'Fonte de dados' até o aviso de afiliados descrevem a vitrine implementada hoje, que tem só a Modalidade A."`, contradizendo a tabela logo abaixo (L149: Modalidade B implementada), L157 (filtro `"Todos", "Venda direta", "Lojas parceiras"`) e L164–171 (fluxo ativo de compra interna).
  2. **Divergência código × documento em §5.1 (L199–200):**
     - L199 lista apenas 5 status de pagamento (`Pendente`, `Aprovado`, `Recusado`, `Cancelado`, `Reembolsado`), omitindo **`Em análise`**, **`Autorizado`** e **`Contestado`**, implementados em `pages/minha-conta.js:13-22` (e listados no Site Privado §4.8 L286).
     - L200 lista o andamento do pedido omitindo **`Pago`** e usando **`Em preparo`** em vez de **`Em separação`**, enquanto `pages/minha-conta.js:24-31` implementa os 6 status: `Aguardando pagamento`, `Pago`, `Em separação`, `Enviado`, `Entregue`, `Cancelado`.
  3. **Inchaço e duplicação em §7 item 25 (L237):** durante os 9 commits de 18/11, a célula única do item 25 atingiu ~4.300 caracteres repetindo todos os IDs `ORDTST...`, `PAY...` e `payment_webhook_events.id` já registrados em `docs/melhoria_mercadopago.md`. Isso infla o arquivo (60 KB) e consome contexto em toda sessão que consulta a área pública.

---

## 10. Análise da Integração entre as Documentações
- **Fluxo de acionamento cruzado:** a regra de `AGENTS.md` §0.1 para mudanças que cruzam público/privado ou tocam rotas compartilhadas foi bem aplicada em `28b6b17` (atualizando simultaneamente `AGENTS.md`, `ARQUITETURA_SITE_PRIVADO.md` e `ARQUITETURA_SITE_PUBLICO.md` com divisão clara entre leitura pública e mutação/RBAC/auditoria no painel) e em `e934811` / `fad08f6` / `0091855`.
- **Desalinhamentos entre arquivos identificados:**
  1. **Vocabulário desalinhado entre Público e Privado:** status de pedido (`Em separação` vs `Em preparo`, omissão de `Pago` no Público §5.1) e contagem de status de pagamento (8 no código/Privado vs 5 no Público §5.1).
  2. **Sobreposição de escopo entre `ARQUITETURA_SITE_PUBLICO.md` §7 e `docs/melhoria_mercadopago.md`:** evidências operacionais granulares de testes Sandbox (IDs de transação e webhook) foram replicadas integralmente na tabela de pendências da arquitetura pública.
  3. **Conflito entre `AGENTS.md` (canônico) e anexos do OpenCode:** `.opencode/oh-my-opencode-slim/designer_append.md` ainda orienta `design-system/<projeto>/MASTER.md` e `"HTML + Tailwind"` (contra `design-system/MASTER.md` e CSS Modules sem Tailwind em `AGENTS.md` §4 e `ARQUITETURA_SITE_PUBLICO.md` §1); `orchestrator_append.md` orienta registrar decisão relevante na memória (contra ADR em `docs/adr/` e não duplicação em `AGENTS.md` §3); e `docs/AGENTS_OPERACAO.md` L34 afirma que `webfetch` passou a ser `deny` para `explorer`, contradizendo a própria tabela da L24 e `opencode.jsonc:162` (que definem `ask`).
  4. **Fronteira de registro de entregas (`CHANGELOG.md` × `ARQUITETURA_*`):** `CHANGELOG.md` foi atualizado até `f161227` (19/11), mas as entregas de 20–22/11 (`a681cc5`, `25081d9`, `00758a7`, `e934811`, `c676098`, `28b6b17`, `0091855`, `ee4ed2e`) não foram lançadas nele.

---

## 11. Diagnóstico do Fluxo Operacional do OpenCode
> *Nota de transparência:* todos os 40 commits da janela possuem autor Git único (`caminhar`) e não há histórico local de sessões do OpenCode acessível no sandbox (Limitação 2). Portanto, a atribuição individual por commit é `NÃO DETERMINADO`; a avaliação abaixo se apoia nos artefatos, configurações e calibrações verificáveis no repositório.

- **Pontos Fortes Verificados:**
  - **Segurança e privacidade de configuração (`opencode.jsonc`):** `share: "disabled"`, bloqueio de leitura para `.env*`/`*.pem`/`*.key`, negação de comandos destrutivos e escapes em `bash`, e separação estrita de edição (`edit` e `ast_grep_replace` em `deny` para `explorer` e `oracle`).
  - **Evolução do preflight de modelos (`dc77185`):** `scripts/diagnostics/model-catalog.js` e `check-model-catalog.js` passaram a pré-validar sintaticamente `.opencode/oh-my-opencode-slim.json` (preset `zen`, 6 modelos e 1 reserva) e distinguir `NÃO VERIFICADO` (`ENOENT`) de erro real do catálogo.
  - **Instrumentos de bench calibrados (`eaeb298`, `28b6b17`):** `tests/unit/scripts/bench-ground-truth.test.js` passa integralmente em 23/11 (`13/13` testes, todos os 5 papéis com `ok: true` e `0` problemas).
- **Fragilidades Detectadas:**
  - **Anexos de papel desatualizados (`.opencode/oh-my-opencode-slim/*_append.md`):** datados de `01/10/2026` (`designer`, `orchestrator`, `fixer`, `oracle`), antes da criação de `AGENTS.md` moderno e dos ADRs `0013`–`0043`, gerando instruções contraditórias se não houver precedência explícita de `AGENTS.md`. Há também pequeno erro de digitação (`"duas duas"`) em `explorer_append.md`.
  - **Nota defasada em `docs/AGENTS_OPERACAO.md` L34:** diz que `webfetch` é `deny` para `explorer`, enquanto a tabela da L24 e `opencode.jsonc:162` aplicam `ask`.
  - **Catálogo vivo pendente de checagem no host:** `npm run models:check` não pôde consultar `opencode models` a partir do ambiente Antigravity.

---

## 12. Diagnóstico do Fluxo Operacional do Antigravity
- **Pontos Fortes Confirmados:**
  - **Formalização no fluxo do projeto (`b37c9f1`, 16/11):** cabeçalho, §2 (execução sequencial dos papéis fora do slim) e §5 (guardrails locais sem MCP remoto) incorporados em `AGENTS.md`.
  - **Qualidade investigativa e honestidade técnica:** nas auditorias da semana (`retorno_da_semana.md`, `melhoria_mercadopago.md`, `melhoria_google.md`, `melhoria_design.md`), houve rigoroso respeito à restrição `"NÃO IMPLEMENTAR"`, diferenciação explícita entre fato confirmado, indício e hipótese, e **confronto prévio de premissas antes de editar** — como nas erratas do Ciclo 2 de `melhoria_agente.md` (§25.3) e do Ciclo 2 de `melhoria_google.md` (§1.1, descartando `MG-05` e `MG-09` ao validar o código real).
  - **Conversão de falhas em guardas permanentes:** criou na semana `tests/unit/tests-hygiene/css-tokens.test.js` (7 invariantes), ampliou `schema-sources.test.js` e criou `tests/setup-env.js`.
- **Dificuldades Operacionais Observadas na Janela:**
  1. **Bloqueio recorrente do MCP `ai-memory`:** negado nas auditorias de 19/11 (Google e Design) e em 23/11 (Agentes), limitando a continuidade ao hook `SessionStart`.
  2. **Limitações de ambiente no sandbox:** ausência do CLI `opencode` (`models:check` → `NÃO VERIFICADO`) e de daemon Docker (`8` suítes `.db.test.js` em auto-skip local, dependendo do CI `test-db-coverage.yml`).
  3. **Bloqueio de inspeção visual em navegador (`20/11`):** em `melhoria_design.md` §6.8, tentativa de validar visualmente `localhost:3000` nos 4 viewports falhou por permissão `execute_url` negada.
  4. **Handoff de sessão interrompida (`antigravity-cli`, 23/11 00:17 BRT):** dúvida operacional sobre múltiplas imagens em `"Puxar Dados"` do Mercado Livre deixou handoff aberto por falta de destaque explícito no §4.5 da arquitetura privada quanto à dependência de `ML_ACCESS_TOKEN`.

---

## 13. Erros e Ocorrências Identificados (Últimos 7 Dias)

| ID | Tipo | Data / Commits | Ocorrência | Origem / Causa Raiz | Status em 23/11 |
|---|---|---|---|---|---|
| **OC-01** | Nova | 16/11 (`dc77185` → `01a4a3f`) | 4º cenário de `cypress/e2e/checkout.cy.js` falhou no CI `e2e.yml` (`#137–#138`). | Erro de overload em `cy.intercept('GET', { pathname, query }, ...)` interpretado pelo Cypress como `url: 'GET'`; spec não havia sido rodada ao vivo antes do commit inicial. | **Resolvida** |
| **OC-02** | Recorrência | 18/11 (`6e94332` → `eaeb298`) | Descalibração de linhas em `scripts/bench/orchestrator/gabarito.md` ao alterar `pages/api/uploads/[...path].js`. | Rota alterada não usava `withAuth` e `AGENTS.md` §7.1 ainda não alertava sobre o canário `bench-ground-truth.test.js` (regra entrou só em 22/11, mas ainda incompleta — ver `OP-05`). | **Resolvida** (parcial na prevenção) |
| **OC-03** | Nova | 18/11 (`6e94332`) | `[Performance] Slow resource` ao servir `/uploads/*` e bloqueio de rotas concorrentes como `/api/products`. | `res.send(buffer)` no Next 16.4.6 executava `JSON.stringify(buffer)` + hash síncrono travando o event loop (~90–117 ms/imagem). Corrigido com `ETag` fraco, `304` e `res.end(buffer)`. | **Resolvida** |
| **OC-04** | Nova | 19/11 (`60acbc2` → `7d68032`) | 13 suítes (27 testes) quebraram + erro `redisInstance.quit is not a function` no `globalTeardown` do Jest. | `.vscode/settings.json` ativou `python.terminal.useEnvFile: true`, vazando `.env` local para os testes, somado à ausência de `tests/setup-env.js` e ao `.quit()` incompatível com `@upstash/redis`. | **Resolvida** |
| **OC-05** | Nova | 19/11 (`80478dd` → `75fb1cb` → `fad08f6` → `f161227`) | Retrabalho em 4 rodadas no Google Sign-In (`tokeninfo` → `JWKS` → endurecimento: atalho dev sem opt-in, risco de pré-sequestro, exposição de `NEXT_PUBLIC_GOOGLE_CLIENT_ID` em botão morto, ausência de runbook). | Implementação inicial priorizou fazer funcionar no navegador antes de fechar modelagem de ameaça e operação; sanada após ADR-0042 e auditoria `melhoria_google.md`. | **Resolvida** (DB real pendente de CI) |
| **OC-06** | Recorrência | 19–20/11 (`75fb1cb` → `a681cc5`) | Passada "Standards" corrigiu tokens CSS inexistentes em 1 arquivo (`CustomerPages.module.css`), mantendo 24 declarações inválidas em 3 arquivos irmãos, contraste < 4,5:1 em Shopee/Amazon, `style={{` inline e falta de `customer.md`. | Revisão restrita ao arquivo da tarefa sem varredura global nem guard automatizado para todos os `.css`. Sanada em `a681cc5` com guard de 7 invariantes (`css-tokens.test.js`). | **Resolvida** |
| **OC-07** | Nova | 21–22/11 (`00758a7`, `c676098`, `ee4ed2e`) | Três defeitos sequenciais de paridade/acabamento em Produtos e Vendas (`AdminProducts` sem `modality=external`; `AdminSales` com ícone `"products"` inexistente, classes erradas e `exportToCSV` com assinatura antiga; contagem falsa `Pedidos (0)` ao abrir em `Produtos Internos`). | Alterações anteriores entre `AdminProducts`, `AdminSales` e `AdminDashboard` não verificaram filtros cruzados, assinaturas de helpers compartilhados nem estado inicial de atalhos. | **Resolvida** |
| **OC-08** | Nova | 21/11 (`e934811`, ADR-0043) | Erro cru / sucesso falso ao navegar entre abas do `/admin` após 1h de inatividade. | JWT de 1h expirava na SPA sem monitoramento de ociosidade e com tratamento de `401` em apenas 4 pontos isolados. | **Resolvida** |
| **OC-09** | Recorrência | 22/11 (`28b6b17`, `0091855`) | Lacunas de segurança em rotas compartilhadas e admin (`settings`/`upload-image` sem RBAC/rate limit/auditoria, SSRF em `fetch-ml`/`fetch-spotify`, `checkRateLimit` ignorado em `GET /api/settings`, `X-Forwarded-For` cru em `rate-limit`, `DELETE dicas` sem `id` obrigatório, `rate_limit:whitelist` ignorada). | Endurecimentos anteriores cobriram rotas isoladas sem checagem uniforme de todas as rotas compartilhadas e auxiliares. Corrigida em `28b6b17`/`0091855` e documentada em `AGENTS.md` §6. | **Resolvida** |
| **OC-10** | Recorrência | **Ativa em 23/11/2026** | Inconsistências ativas entre documentação, código e anexos de agentes: (a) contradições em `ARQUITETURA_SITE_PRIVADO.md` (§4.5 L241 vs L245 + divergência real com `pages/api/products.js:42`, §4.8 L287 `"Em preparo"`, §8 item 23 sob "Vendas internas"); (b) contradições em `ARQUITETURA_SITE_PUBLICO.md` (§3.5 L145, §5.1 L199–200, §7 L237 inchado); (c) conflito entre `AGENTS.md` e `.opencode/*_append.md` + `AGENTS_OPERACAO.md:34`; (d) MCP `ai-memory` negado + 20 warnings em `_lint/report.md`; (e) `CHANGELOG.md` sem registros de 20–22/11. | Atualizações incrementais rápidas na janela sem revisão cruzada final contra os trechos legados das arquiteturas e anexos antigos de 01/10. | **Ativa** (tratada no Plano de Ação e §24) |

---

## 14. Rotinas e Procedimentos que Estão Funcionando Corretamente
1. **Gates estáticos e de segurança automatizados:** `knip` (0 issues), `lint:workflows` (`actionlint 1.7.12`), `security:check-sql` (264 arquivos), `security:check-credentials` (102 arquivos), `lint:chars` (785 arquivos) e `eslint` (0 erros) — todos aprovados em 23/11/2026.
2. **Estabilidade e expansão da suíte Jest:** cresceu de 232 suítes / 1.926 testes (16/11) para **241 suítes / 2.090 testes aprovados** (+8 suítes / 96 testes `.db.test.js`, 6 snapshots) em 22/11, sem aviso de saída de worker e com ambiente isolado em `tests/setup-env.js`.
3. **Novos guardas permanentes criados na semana:** `tests/unit/tests-hygiene/css-tokens.test.js` (7 invariantes sobre todos os 43 `.css`), `tests/unit/scripts/schema-sources.test.js` (drift zero + colunas SQL de `customers`/`orders`), `tests/setup-env.js` e classificação clara `NÃO VERIFICADO` em `scripts/diagnostics/model-catalog.js`.
4. **Canário do bench (`tests/unit/scripts/bench-ground-truth.test.js`):** 13/13 testes passando em 23/11, garantindo alinhamento exato dos 5 instrumentos contra o disco.
5. **Confronto de premissas antes da execução:** praticado com rigor no Ciclo 2 de `melhoria_agente.md` (§25.3) e no Ciclo 2 de `melhoria_google.md` (§1.1), evitando edições baseadas em hipóteses falsas ou desatualizadas.
6. **Governança de ADRs e atualização cruzada:** ADRs `0042` e `0043` seguiram `docs/adr/template.md` e atualizaram `docs/adr/README.md` no mesmo commit; em `28b6b17`, os 3 documentos principais foram atualizados em conjunto.
7. **Homologação de ponta a ponta:** Sandbox completo do Mercado Pago (Pedidos #20–#31 + webhook via `cloudflared` HMAC-SHA256 v2) e Google Sign-In local via JWKS `RS256` validados na janela.

---

## 15. Mecanismos de Prevenção e Correção Existentes
- **Ativos e eficazes na prática:**
  - Segurança centralizada de rotas (`createAdminHandler`, `checkRolePermission` fail-closed, `getClientIP(req)` com `TRUST_PROXY`, Zod, `logActivity`, bloqueio anti-SSRF em `fetch-ml`/`fetch-spotify`, `checkRateLimit` integrado com `rate_limit:whitelist` em `lib/cache/cache.js`).
  - Guardas estáticos no Jest (`schema-sources.test.js`, `css-tokens.test.js`, `bench-ground-truth.test.js`) e `tests/setup-env.js`.
  - Preflight fail-closed de catálogo de modelos (`models:check` diferenciando `NÃO VERIFICADO`).
  - Proteção de sessão administrativa (`useAdminInactivityTimeout` + `utils/adminSession.js` + ADR-0043).
  - Gates de CI/push (`knip`, `lint:workflows`, `security:check-sql`, `security:check-credentials`, `lint:chars`).
- **Lacunas preventivas identificadas na janela:**
  1. Falta de checklist em `AGENTS.md` cobrindo **todos** os alvos do canário `bench-ground-truth.test.js` (não apenas rotas com `withAuth`/`requireAuth`/`createAdminHandler`), specs Cypress (`npx cypress run --spec`) e alterações em configs de ambiente (`.vscode/settings.json`, `jest.config*`).
  2. Ausência de alerta explícito contra correções visuais em arquivo único sem conferir irmãos e overrides em `design-system/pages/` (já mitigado no CSS pelo novo guard `css-tokens.test.js`, mas ainda ausente do texto normativo de `AGENTS.md`).
  3. Falta de checagem automatizada ou lembrete de paridade de schemas Zod cliente × API (permitiu a divergência atual `AdminProducts.js:28` vs `pages/api/products.js:42`).
  4. Anexos antigos do OpenCode (`.opencode/oh-my-opencode-slim/*_append.md`) sem verificação de alinhamento frente ao `AGENTS.md`.

---

## 16. Oportunidades de Melhoria Identificadas

| ID | Categoria | Descrição Resumida | Arquivo(s) Envolvido(s) | Prioridade |
|---|---|---|---|---|
| **OP-05** | Prevenção de erros | Ampliar escopo do canário do bench, gate Cypress e proteção de CSS/overrides no `AGENTS.md` | `AGENTS.md` (§7 itens 1 e 2) | **Alta** |
| **OP-06** | Documentação | Resolver contradição em §4.5, apontar divergência real de `link` em `products.js` e corrigir `"Em preparo"` em §4.8 | `docs/ARQUITETURA_SITE_PRIVADO.md` (+ decisão sobre `pages/api/products.js:42`) | **Alta** |
| **OP-07** | Documentação | Remover frase pré-ADR-0037 em §3.5 e alinhar os 8 status de pagamento e 6 de pedido em §5.1 ao código real | `docs/ARQUITETURA_SITE_PUBLICO.md` (§3.5 L145, §5.1 L199–200) | **Alta** |
| **OP-08** | Integração entre agentes | Definir protocolo de degradação honesta quando MCP `ai-memory` é negado ou `_lint/report.md` traz warnings | `AGENTS.md` (§3) | **Média** |
| **OP-09** | Eficiência e organização | Compactar item 25 inchado do Site Público (remetendo IDs a `melhoria_mercadopago.md`) e realocar item 23 do Site Privado fora de "Vendas internas" | `docs/ARQUITETURA_SITE_PUBLICO.md` (§7 L237) e `docs/ARQUITETURA_SITE_PRIVADO.md` (§8 L423–428) | **Média** |
| **OP-10** | Integração entre agentes | Declarar precedência explícita de `AGENTS.md` sobre anexos `*_append.md` do OpenCode (e registrar saneamento futuro desses anexos e de `AGENTS_OPERACAO.md:34`) | `AGENTS.md` (§2) + pendência futura em `.opencode/oh-my-opencode-slim/` e `docs/AGENTS_OPERACAO.md` | **Média** |
| **OP-11** | Prevenção de erros | Exigir `npm test` ao alterar configs de ambiente/editor e conferir paridade/atalhos ao ajustar telas administrativas cruzadas | `AGENTS.md` (§0.3 passo 5 e §7 item 1) | **Média** |
| **OP-12** | Identificação e investigação | Explicitar em §4.5 que sem `ML_ACCESS_TOKEN` o "Puxar Dados" traz apenas 1 imagem (`og:image`), e documentar filtros vs badges e pré-contagem de Pedidos em §4.8 | `docs/ARQUITETURA_SITE_PRIVADO.md` (§4.5 L241, §4.8 L283/L286) | **Baixa** |
| **OP-13** | Documentação | Avaliar inclusão opcional de lembrete de `CHANGELOG.md` em `AGENTS.md` §7 item 6 (preservando padrão de commits `ATT - ...`) | `AGENTS.md` (§7 item 6 — opcional) + pendência `CHANGELOG.md` | **Baixa** |

### Detalhamento Completo das Oportunidades

#### OP-05 — Completar escopo do canário do bench, gate Cypress e guarda visual no `AGENTS.md`
- **Identificação única:** `OP-05`
- **Categoria:** Prevenção de erros
- **Descrição:** Em `AGENTS.md` §7 item 1, o aviso sobre `tests/unit/scripts/bench-ground-truth.test.js` cobre apenas `pages/api/` com `withAuth`/`requireAuth`/`createAdminHandler`, não citando rotas sem auth (`pages/api/uploads/[...path].js`), `next.config.js`, `proxy.js`, `design-system/MASTER.md`, `pages/styles/variables.css` nem `components/UI/{Button,Input,BaseCard}.module.css`. Além disso, §7 item 1 não menciona validação de specs Cypress novas/alteradas, e §7 item 2 não referencia o guard global `css-tokens.test.js` nem os overrides em `design-system/pages/`.
- **Evidências encontradas:** `eaeb298` (18/11) precisou recalibrar `gabarito.md` após `6e94332` mexer em `pages/api/uploads/[...path].js`; `01a4a3f` (16/11) corrigiu `cypress/e2e/checkout.cy.js` após falha no CI `e2e.yml`; `a681cc5` (20/11) corrigiu `OC-06` criando `css-tokens.test.js` e `design-system/pages/customer.md` após falha de revisão parcial em `75fb1cb`.
- **Origem ou causa:** Inclusões incrementais em `AGENTS.md` §7 focaram o incidente imediato de cada semana sem generalizar a superfície real dos instrumentos (`scripts/bench/ground-truth.js`) e das novas suítes de higiene.
- **Consequências:** Novas quebras evitáveis de gabarito em edições de design/config, falhas de E2E descobertas só no GitHub Actions e risco de ajustes visuais sem override documentado.
- **Melhoria recomendada:** Em §7 item 1, resumir o escopo real do canário (`pages/api/`, `proxy.js`, `next.config.js`, `design-system/MASTER.md`, `pages/styles/variables.css`, `components/UI/*.module.css`) e orientar validar specs Cypress alteradas (`npx cypress run --spec` ou registrar pendência se sem display/servidor); em §7 item 2, citar `design-system/pages/<pagina>.md`, varredura de arquivos irmãos e o guard `tests/unit/tests-hygiene/css-tokens.test.js`.
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/AGENTS.md` (§7 itens 1 e 2).
- **Prioridade sugerida:** **Alta**
- **Justificativa da prioridade:** Evita retrabalho recorrente em CI/bench (`OC-01`, `OC-02`) e protege diretamente a consistência visual garantida em `OC-06`.

#### OP-06 — Eliminar contradição em §4.5, apontar divergência real de `products.js` e corrigir nomenclatura em §4.8 do Site Privado
- **Identificação única:** `OP-06`
- **Categoria:** Documentação
- **Descrição:** `docs/ARQUITETURA_SITE_PRIVADO.md` possui duas contradições confirmadas no código: (1) §4.5 L241 declara `Link do Produto * (obrigatório no schema e no formulário — ADR-0037)`, mas §4.5 L245 ainda afirma `"link opcional válido"`, sendo que `AdminProducts.js:28` exige `link` obrigatório enquanto `pages/api/products.js:42` aceita opcional/vazio; (2) §4.8 L287 chama o status logístico de `"Em preparo"`, divergindo de §4.1 L165 (`"Em separação (N)"`), `AdminSales.js:218`, `AdminDashboard.js:162` e `pages/minha-conta.js:27` (`"Em separação"`).
- **Evidências encontradas:** Leitura direta de `docs/ARQUITETURA_SITE_PRIVADO.md` L165, L241, L245, L287 confrontada com `components/Admin/AdminProducts.js:28`, `pages/api/products.js:42`, `components/Admin/AdminSales.js:218`, `components/Admin/AdminDashboard.js:162` e `pages/minha-conta.js:27`.
- **Origem ou causa:** Atualizações de ADR-0037 (08/11) e ADR-0041 (14/11) alteraram trechos pontuais mantendo frases legadas de 28–29/10 e rótulos prévios sem busca global no arquivo.
- **Consequências:** Agentes podem reverter erroneamente a obrigatoriedade do `link` na UI ou criar mismatch de rótulo/schema em filtros e testes de pedidos.
- **Melhoria recomendada:** (a) Apontar ao dono a divergência `AdminProducts.js:28` × `pages/api/products.js:42` (`AGENTS.md` §0.2 regra 4) para decidir se a API também exigirá `link` em produtos externos; (b) atualizar §4.5 L245 alinhando ao contrato decidido (removendo `"link opcional válido"` caso obrigatório para Modalidade A); (c) substituir `"Em preparo"` por `"Em separação"` em §4.8 L287.
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (§4.5 L241/L245 e §4.8 L287) + decisão prévia sobre `pages/api/products.js:42`.
- **Prioridade sugerida:** **Alta**
- **Justificativa da prioridade:** Contradição ativa dentro do documento de arquitetura e divergência real entre formulário Zod e API Zod em área comercial crítica.

#### OP-07 — Remover resíduo pré-ADR-0037 e sincronizar status em `/minha-conta` no Site Público
- **Identificação única:** `OP-07`
- **Categoria:** Documentação
- **Descrição:** Em `docs/ARQUITETURA_SITE_PUBLICO.md`, §3.5 L145 afirma que a vitrine implementada `"tem só a Modalidade A"`, contradizendo a própria tabela da L149 (Modalidade B implementada); além disso, §5.1 L199–200 lista apenas 5 status de pagamento (omitindo `Em análise`, `Autorizado`, `Contestado`) e 5 status de pedido (omitindo `Pago` e grafando `Em preparo` em vez de `Em separação`).
- **Evidências encontradas:** `docs/ARQUITETURA_SITE_PUBLICO.md` L145, L149, L199–200 comparado com `pages/minha-conta.js:13-31` e `docs/ARQUITETURA_SITE_PRIVADO.md` L165 e L286.
- **Origem ou causa:** Quando a Modalidade B (ADR-0037) e os status adicionais (ADR-0041 / `554c056`–`feb768a`) foram implementados, §3.5 L145 e §5.1 L199–200 não foram revisados por inteiro.
- **Consequências:** Agentes que consultam apenas o Site Público para ajustes em `/minha-conta` recebem lista incompleta de badges e nomenclatura divergente do código.
- **Melhoria recomendada:** Remover a frase residual de §3.5 L145 e atualizar §5.1 L199–200 com os 8 status de pagamento (`Pendente`, `Em análise`, `Autorizado`, `Aprovado`, `Recusado`, `Cancelado`, `Reembolsado`, `Contestado`) e os 6 status de pedido (`Aguardando pagamento`, `Pago`, `Em separação`, `Enviado`, `Entregue`, `Cancelado`) de `pages/minha-conta.js`.
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md` (§3.5 L145 e §5.1 L199–200).
- **Prioridade sugerida:** **Alta**
- **Justificativa da prioridade:** Contradição ativa sobre funcionalidade central (Modalidades A/B) e especificação incorreta de status visíveis ao cliente final.

#### OP-08 — Definir protocolo de degradação honesta quando `ai-memory` (MCP) é negado ou indisponível
- **Identificação única:** `OP-08`
- **Categoria:** Integração entre agentes
- **Descrição:** `AGENTS.md` §3 determina consultar `memory_query` antes de propor arquitetura, mas não define como o agente deve proceder quando o MCP `ai-memory` é negado pelo usuário ou indisponível no host, nem orienta sobre alertas de `_lint/report.md` injetados no `SessionStart`.
- **Evidências encontradas:** MCP `ai-memory` negado por permissão nas auditorias de 19/11 (`melhoria_google.md` §1 limitação 1, `melhoria_design.md` §6.1 limitação 1) e nesta execução de 23/11/2026; hook `SessionStart` reportou 20 warnings em `_lint/report.md` em 23/11.
- **Origem ou causa:** A regra foi escrita assumindo MCP `ai-memory` sempre liberado para chamadas ativas.
- **Consequências:** Sem orientação explícita, um agente pode ficar travado ou tentar alternativas fora do caminho permitido; quando aceita sem protocolo, deixa de registrar a limitação no diagnóstico.
- **Melhoria recomendada:** Acrescentar 1–2 linhas em `AGENTS.md` §3 indicando que, se o MCP `ai-memory` estiver negado ou indisponível, o agente **não** deve contornar a negativa nem acessar arquivos internos da memória via shell: prossegue com o resumo injetado no `SessionStart` + código/Git/ADRs e registra explicitamente a limitação (sinalizando também ao operador quando `_lint/report.md` acumular warnings).
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/AGENTS.md` (§3).
- **Prioridade sugerida:** **Média**
- **Justificativa da prioridade:** Ocorreu em 3 sessões de auditoria na mesma semana; garante comportamento previsível, seguro e transparente sem depender de tentativa e erro.

#### OP-09 — Reduzir duplicação de evidências no Site Público (§7) e corrigir agrupamento no Site Privado (§8)
- **Identificação única:** `OP-09`
- **Categoria:** Eficiência e organização
- **Descrição:** Em `ARQUITETURA_SITE_PUBLICO.md` §7 item 25 (L237), todos os IDs brutos dos Pedidos #22–#31 e de `payment_webhook_events` estão duplicados em uma célula única de ~4.300 caracteres, embora já constem em `docs/melhoria_mercadopago.md`. Em `ARQUITETURA_SITE_PRIVADO.md` §8 (L423–428), o item 23 (`Endurecimento de Segurança das APIs`) foi colocado sob a subtabela `**Vendas internas**`, apesar de abranger `settings`, `upload-image`, `fetch-ml`, `fetch-spotify`, `fetch-youtube`, `rate-limit` e `dicas`.
- **Evidências encontradas:** Contagem direta de `ARQUITETURA_SITE_PUBLICO.md` L237 (~4.300 chars, commits `554c056`–`feb768a`) vs `docs/melhoria_mercadopago.md` §4 e §6; e `ARQUITETURA_SITE_PRIVADO.md` L423–428 (commit `28b6b17`).
- **Origem ou causa:** Acréscimos sucessivos em linhas já existentes sem mover evidências de homologação para o relatório próprio nem abrir subtabela temática em §8.
- **Consequências:** Consumo elevado de tokens toda vez que o Site Público é lido na íntegra (conforme obrigatório por `AGENTS.md` §0.1) e dificuldade para localizar o histórico de segurança de APIs no Site Privado.
- **Melhoria recomendada:** Compactar a célula do item 25 em `ARQUITETURA_SITE_PUBLICO.md` mantendo o resumo objetivo dos fluxos homologados (PIX, boleto, cartão aprovado/recusado/em análise, pré-pago, boleto expirado, webhook via `cloudflared` + nota sobre `debit_card`) com referência direta a `docs/melhoria_mercadopago.md`; e separar o item 23 em `ARQUITETURA_SITE_PRIVADO.md` §8 sob subtabela própria (`**Segurança de APIs**`).
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md` (§7 L237) e `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (§8 L423–428).
- **Prioridade sugerida:** **Média**
- **Justificativa da prioridade:** Reduz ruído e gasto de contexto em leituras obrigatórias sem perda de rastreabilidade histórica.

#### OP-10 — Estabelecer precedência de `AGENTS.md` sobre anexos de papel do OpenCode
- **Identificação única:** `OP-10`
- **Categoria:** Integração entre agentes
- **Descrição:** Os arquivos `.opencode/oh-my-opencode-slim/designer_append.md` e `orchestrator_append.md` (não editados desde 01/10/2026) contêm instruções incompatíveis com `AGENTS.md` §3 e §4 (`design-system/<projeto>/MASTER.md`, `"HTML + Tailwind"`, gravar decisões na memória em vez de ADR), enquanto `docs/AGENTS_OPERACAO.md` L34 diverge da própria tabela L24 e de `opencode.jsonc:162` sobre `webfetch` do `explorer`.
- **Evidências encontradas:** Leitura direta de `.opencode/oh-my-opencode-slim/*.md`, `docs/AGENTS_OPERACAO.md` L24 vs L34, `opencode.jsonc:162` e `AGENTS.md` §3–§4.
- **Origem ou causa:** Os anexos de papel foram criados na configuração inicial do slim em outubro e não acompanharam a consolidação de `AGENTS.md` e dos ADRs `0013`–`0043`.
- **Consequências:** Agentes subinvocados no OpenCode recebem instruções conflitantes sobre onde persistir arquivos do design system, qual stack usar e onde registrar decisões arquiteturais.
- **Melhoria recomendada:** Adicionar uma linha objetiva em `AGENTS.md` §2 declarando que `AGENTS.md` prevalece sobre qualquer anexo local em `.opencode/oh-my-opencode-slim/` em caso de conflito, e programar (em §24) o saneamento futuro dos anexos e de `docs/AGENTS_OPERACAO.md` L34.
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/AGENTS.md` (§2) + pendência futura em `.opencode/oh-my-opencode-slim/*_append.md` e `docs/AGENTS_OPERACAO.md`.
- **Prioridade sugerida:** **Média**
- **Justificativa da prioridade:** Elimina ambiguidade real entre a constituição do projeto e os prompts injetados nos subagentes do OpenCode com apenas 1 frase no `AGENTS.md`.

#### OP-11 — Incluir guarda para alterações de config de editor/ambiente e verificação de paridade em telas administrativas cruzadas
- **Identificação única:** `OP-11`
- **Categoria:** Prevenção de erros
- **Descrição:** Alterações de configuração de ambiente/IDE (`.vscode/settings.json` em `60acbc2`) não dispararam suíte de testes e derrubaram 13 suítes (`7d68032`); além disso, ajustes pontuais em abas administrativas (`00758a7`, `c676098`, `ee4ed2e`) revelaram desalinhamentos de filtro de modalidade, assinatura de helper compartilhado (`exportToCSV`) e contagem inicial ao navegar por atalho.
- **Evidências encontradas:** Commits `60acbc2`, `7d68032`, `00758a7`, `c676098`, `ee4ed2e`.
- **Origem ou causa:** Mudanças vistas como "apenas de editor" ou "apenas visuais em um componente" não incluíram conferência dos consumidores nem reexecução mínima de `npm test`.
- **Consequências:** Regressões silenciosas na suíte de testes local ou na coerência entre cartões da Visão Geral, Gestão de Produtos e Gestão de Vendas.
- **Melhoria recomendada:** Em `AGENTS.md` §7 item 1, deixar claro que alterações em configs de tooling/IDE/testes (`.vscode/settings.json`, `jest.config*`, `next.config.js`) também exigem rodar `npm test`; e em §0.3 passo 5, lembrar de conferir consumidores/atalhos cruzados e assinaturas de helpers compartilhados (`AdminCrudBase`, `exportToCSV`, `AppIcon`) ao editar telas de `/admin`.
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/AGENTS.md` (§0.3 passo 5 e §7 item 1).
- **Prioridade sugerida:** **Média**
- **Justificativa da prioridade:** Trata diretamente as causas de `OC-04` e `OC-07` com mínimo acréscimo textual.

#### OP-12 — Detalhar limite de 1 imagem sem `ML_ACCESS_TOKEN` e diferenças de filtros/pré-contagem em Gestão de Vendas
- **Identificação única:** `OP-12`
- **Categoria:** Identificação e investigação
- **Descrição:** Em `docs/ARQUITETURA_SITE_PRIVADO.md` §4.5 L241, o comportamento de `Puxar Dados` no Mercado Livre sem `ML_ACCESS_TOKEN` já diz que o carrossel depende do token, mas não deixa explícito que sem ele vem **somente a primeira imagem (`og:image`)**; e §4.8 L283/L286 não registra que o `<select>` de filtro de pagamento oferece 6 opções (contra 8 badges na tabela) nem o pré-carregamento da contagem da subaba `Pedidos` ao abrir diretamente em `Produtos Internos` (`ee4ed2e`).
- **Evidências encontradas:** Handoff pendente de 23/11 00:17 BRT (operador questionando por que apenas a primeira imagem veio no link MLBU), `pages/api/admin/fetch-ml.js:227,244,324,351`, `components/Admin/AdminSales.js:204-245` e commit `ee4ed2e`.
- **Origem ou causa:** Detalhe de comportamento de fallback (`og:image` unitária) e ajuste fino de UI (`ee4ed2e`) não explicitados na documentação.
- **Consequências:** Sessões futuras investigam do zero por que apenas 1 imagem foi importada ou por que o select de filtro não lista `Autorizado`/`Contestado`.
- **Melhoria recomendada:** Acrescentar 1 frase em §4.5 L241 explicitando o retorno apenas da imagem principal (`og:image`) sem `ML_ACCESS_TOKEN`, e atualizar §4.8 L283/L286 sobre as opções do filtro de pagamento e a pré-contagem de `Pedidos`.
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (§4.5 L241 e §4.8 L283/L286).
- **Prioridade sugerida:** **Baixa**
- **Justificativa da prioridade:** Melhora a velocidade de diagnóstico em atendimento ao operador sem impactar contratos críticos de segurança.

#### OP-13 — Avaliar lembrete opcional de atualização do `CHANGELOG.md` na Definição de Pronto
- **Identificação única:** `OP-13`
- **Categoria:** Documentação
- **Descrição:** Durante a janela, o `CHANGELOG.md` recebeu entradas detalhadas até 19/11 (`f161227`), mas os commits relevantes de 20–22/11 (`a681cc5`, `25081d9`, `00758a7`, `e934811` / ADR-0043, `28b6b17`, `0091855`, `ee4ed2e`) não foram registrados nele.
- **Evidências encontradas:** `git log` de 20–22/11 vs `CHANGELOG.md` L1–130.
- **Origem ou causa:** `AGENTS.md` §7 (Definição de pronto) exige ADR quando aplicável e atualização dos documentos de arquitetura em mudanças estruturais, mas não menciona `CHANGELOG.md`.
- **Consequências:** Histórico cronológico de alterações notáveis fica parcial quando comparado aos ADRs e documentos de arquitetura.
- **Melhoria recomendada:** Submeter à avaliação do dono se deseja acrescentar menção curta ao `CHANGELOG.md` em `AGENTS.md` §7 item 6 para entregas funcionais ou de segurança notáveis (mantendo intacto o padrão de mensagens de commit `ATT - ...` já escolhido pelo dono em 20/11).
- **Arquivo ou procedimento envolvido:** `/home/gus/projetos/Caminhar/AGENTS.md` (§7 item 6 — opcional) + pendência futura em `CHANGELOG.md`.
- **Prioridade sugerida:** **Baixa**
- **Justificativa da prioridade:** Desejável para continuidade histórica, sem risco operacional imediato e sujeito à preferência do dono para não gerar burocracia excessiva.

---

## 17. Quantidade de Ocorrências e Oportunidades por Categoria

### Ocorrências nos Últimos 7 Dias (`OC-01` a `OC-10`)
- **Total identificado:** **10 ocorrências** (7 novas, 3 recorrências; **9 resolvidas** dentro da janela e **1 ativa** [`OC-10`] endereçada no Plano de Ação e em §24).

### Oportunidades de Melhoria Identificadas (`OP-05` a `OP-13`)
- **Total de oportunidades no Ciclo 3:** **9 oportunidades** (sem duplicidade entre categorias):

| Categoria | Quantidade | IDs e Prioridades |
|---|---|---|
| **Documentação** | **3** | `OP-06` (Alta), `OP-07` (Alta), `OP-13` (Baixa) |
| **Prevenção de erros** | **2** | `OP-05` (Alta), `OP-11` (Média) |
| **Integração entre agentes** | **2** | `OP-08` (Média), `OP-10` (Média) |
| **Eficiência e organização** | **1** | `OP-09` (Média) |
| **Identificação e investigação** | **1** | `OP-12` (Baixa) |
| **Instruções e orientações / Rotinas e processos / Correções e validações / Confiabilidade e segurança / Outras** | **0** | *(aspectos preventivos e processuais agrupados sem duplicidade nas categorias primárias acima)* |

- **Distribuição por Prioridade:**
  - **Crítica:** **0**
  - **Alta:** **3** (`OP-05`, `OP-06`, `OP-07`)
  - **Média:** **4** (`OP-08`, `OP-09`, `OP-10`, `OP-11`)
  - **Baixa:** **2** (`OP-12`, `OP-13`)

---

## 18. Conclusão Geral
- **Como está funcionando o fluxo do OpenCode e do Antigravity:** O fluxo opera com alto nível de maturidade técnica e disciplina de verificação. Nos últimos 7 dias foram entregues 40 commits com evolução expressiva de qualidade: homologação completa de pagamentos no Sandbox Mercado Pago + webhook real via `cloudflared`, validação local JWKS de Google Sign-In (ADR-0042), controle de inatividade de 1h no `/admin` (ADR-0043), endurecimento amplo de segurança em rotas de API (`28b6b17`, `0091855`) e criação de novos guardas automatizados (`css-tokens.test.js`, ampliação de `schema-sources.test.js`, `tests/setup-env.js`).
- **O que está funcionando e deve ser preservado:** A arquitetura documental enxuta (um `AGENTS.md` curto como constituição de processo + dois documentos de arquitetura por área + ADRs oficiais), o acionamento cruzado em mudanças compartilhadas, a cultura de confrontar premissas no código antes de editar, a suíte Jest de 241 suítes / 2.090 testes e todos os gates estáticos (`knip`, `lint:workflows`, `security:check-sql`, `security:check-credentials`, `lint:chars`, `bench-ground-truth.test.js`).
- **Principais dificuldades e ocorrências evitáveis:** Três incidentes da semana (`OC-01` E2E Cypress, `OC-04` vazamento de `.env` por `.vscode/settings.json`, `OC-06` revisão de CSS restrita a 1 de 4 arquivos) mostraram brechas preventivas na Definição de Pronto, enquanto atualizações sucessivas nas duas documentações de arquitetura deixaram contradições internas pontuais (`OC-10`, como `"Em preparo"` vs `"Em separação"`, frase residual pré-ADR-0037 e `link` obrigatório vs opcional em `products.js`) e inflaram a tabela §7 do Site Público.
- **Distribuição de responsabilidades e melhorias necessárias:** Não há necessidade de reestruturar os arquivos nem alterar o padrão de commits `ATT - ...` já decidido pelo dono. Ajustes cirúrgicos e pontuais nos três documentos de referência — somados à decisão do dono sobre o contrato de `link` em `pages/api/products.js:42` e ao saneamento futuro dos anexos antigos do OpenCode — resolvem 100% das fragilidades identificadas preservando tudo o que já funciona.

---

## 19. Plano de Ação por Arquivo

### 19.0 Objetivo das Melhorias e Escopo Exato
- **Objetivo:** Eliminar contradições reais entre documentos e código-fonte, reduzir gasto desnecessário de contexto por duplicação, explicitar a precedência de `AGENTS.md` sobre anexos locais e fechar as lacunas preventivas reveladas pelos incidentes de 16/11–23/11.
- **Dentro do escopo futuro de alteração:** apenas ajustes pontuais nas seções identificadas de `AGENTS.md`, `docs/ARQUITETURA_SITE_PRIVADO.md` e `docs/ARQUITETURA_SITE_PUBLICO.md` (mediante autorização expressa do operador).
- **Fora do escopo desta etapa (permanecem intactos até autorização separada):** código-fonte (inclusive `pages/api/products.js`), testes, `.opencode/oh-my-opencode-slim/*_append.md`, `docs/AGENTS_OPERACAO.md`, `CHANGELOG.md` e páginas do `ai-memory` (listados em §24).

---

### 19.1 Arquivo: `/home/gus/projetos/Caminhar/AGENTS.md`
- **Por que precisa ser alterado:** Fechar as lacunas preventivas evidenciadas em `OC-01`, `OC-02`, `OC-04`, `OC-06`, `OC-07`, falta de protocolo para `ai-memory` negado e conflitos com anexos de 01/10 (`OP-05`, `OP-08`, `OP-10`, `OP-11`, e opcionalmente `OP-13`).
- **Alterações propostas por seção:**
  1. **§0.3 passo 5 (`OP-11`):**
     - *Como está:* `"Implemente e feche pelo §7 (Definição de pronto): atualize o documento e a data se a mudança foi estrutural."`
     - *Problema:* Alterações em uma aba administrativa ou helper compartilhado ocasionalmente deixam de checar filtros cruzados e consumidores no painel (`OC-07`).
     - *O que melhorar:* Acrescentar orientação curta para conferir assinaturas e consumidores compartilhados (ex.: `AdminCrudBase`, `exportToCSV`, filtros de modalidade entre Visão Geral/Produtos/Vendas) antes de finalizar edições no `/admin`.
     - *Comportamento esperado:* Menos defeitos sequenciais de acabamento e paridade entre abas administrativas.
  2. **§2 (`OP-10`):**
     - *Como está:* Tabela de papéis do `oh-my-opencode-slim`, regra para agentes fora do slim e ponteiro para `docs/AGENTS_OPERACAO.md`.
     - *Problema:* Anexos `.opencode/oh-my-opencode-slim/*_append.md` contêm instruções conflitantes de outubro/2026 sem regra clara de hierarquia.
     - *O que melhorar:* Inserir uma frase objetiva determinando que `AGENTS.md` e os documentos em `docs/` prevalecem sobre anexos locais em `.opencode/oh-my-opencode-slim/` em caso de conflito.
     - *Comportamento esperado:* Subagentes no OpenCode seguem `design-system/MASTER.md` (sem Tailwind) e `docs/adr/` sem hesitação.
  3. **§3 (`OP-08`):**
     - *Como está:* Exige consultar `memory_query` antes de propor arquitetura e registra regras de ADR e não confiança.
     - *Problema:* Quando o MCP `ai-memory` é negado por permissão (3 vezes na semana), não há regra clara de degradação honesta.
     - *O que melhorar:* Incluir 1 linha orientando: se o MCP `ai-memory` estiver negado ou indisponível, nunca contornar por shell/arquivos locais; apoiar-se no contexto do hook `SessionStart` + código/Git/ADRs e relatar a limitação (sinalizando também warnings de `_lint/report.md` quando houver).
     - *Comportamento esperado:* Comportamento uniforme, seguro e transparente sob restrição de permissão.
  4. **§7 item 1 (`OP-05`, `OP-11`):**
     - *Como está:* Cita testes de integração de pagamento/webhook/auth, `test:db:container` e o canário `bench-ground-truth.test.js` restrito a linhas `withAuth`/`requireAuth`/`createAdminHandler` em `pages/api/`.
     - *Problema:* Omite os demais arquivos vigiados pelo canário (`uploads/[...path].js`, `next.config.js`, `proxy.js`, `MASTER.md`, `variables.css`, `components/UI/*.module.css`), specs Cypress alteradas (`OC-01`) e alterações em configs de tooling/IDE (`.vscode/settings.json`, `OC-04`).
     - *O que melhorar:* Ampliar a frase do canário para citar explicitamente rotas de API, `proxy.js`, `next.config.js` e arquivos base de design vigiados por `scripts/bench/ground-truth.js`; orientar validar specs Cypress novas/alteradas (`npx cypress run --spec` ou registrar pendência se indisponível) e rodar `npm test` após alterações em arquivos de config/ambiente (`.vscode/settings.json`, `jest.config*`).
     - *Comportamento esperado:* Zero surpresas pós-push em gabaritos, E2E ou quebra silenciosa do Jest por variáveis de editor.
  5. **§7 item 2 (`OP-05`):**
     - *Como está:* `"2. Design segue o MASTER (e o override da página)."`
     - *Problema:* Não previne correção isolada de 1 arquivo CSS ignorando arquivos irmãos (`OC-06`), nem lembra de atualizar `design-system/pages/` ou de citar o guard global criado em 20/11.
     - *O que melhorar:* Expandir para: `"2. Design segue o MASTER (e o override da página em design-system/pages/); ao alterar CSS ou tokens, verificar arquivos irmãos, manter overrides sincronizados e garantir tests/unit/tests-hygiene/css-tokens.test.js verde."`
     - *Comportamento esperado:* Prevenção explícita contra reincidência de `DS-01/PR-01`.
  6. **§7 item 6 — Opcional (`OP-13`, sujeito à decisão do dono):**
     - *Avaliação:* Acrescentar ou não breve menção a atualizar `CHANGELOG.md` em entregas notáveis de produto/segurança, sem alterar o padrão de commit `ATT - ...`.
- **O que deve ser preservado:** Todo o restante das seções próprias (§0.1, §0.2, §1, §4, §5, §6, §7.3–7.8) e **integralmente** os blocos gerenciados `<!-- ai-memory:start/end -->` e `<!-- BEGIN/END:nextjs-agent-rules -->`.
- **Impacto nos demais arquivos:** Nenhum efeito quebrante; reforça a leitura e validação cruzada dos dois documentos de arquitetura e de `design-system/`.

---

### 19.2 Arquivo: `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md`
- **Por que precisa ser alterado:** Eliminar contradição interna em §4.5 e erro de nomenclatura em §4.8 (`OP-06`), reorganizar item 23 em §8 (`OP-09`) e precisar o comportamento de `Puxar Dados` e filtros em Gestão de Vendas (`OP-12`).
- **Alterações propostas por seção:**
  1. **§4.5 L241 e L245 (`OP-06`, `OP-12`):**
     - *Como está:* L241 informa que `link` é obrigatório no schema e no formulário (ADR-0037) e que `ML_ACCESS_TOKEN` traz carrossel e preço; L245 mantém `"paridade: nome, imagem e preço > 0 obrigatórios; link opcional válido"`. No código, `AdminProducts.js:28` exige `link`, mas `pages/api/products.js:42` aceita opcional.
     - *O que melhorar:* (a) Sob decisão do dono quanto a `pages/api/products.js:42`, atualizar L245 para alinhar com L241 (removendo `"link opcional válido"` caso obrigatório para Modalidade A, ou registrando explicitamente a regra escolhida); (b) em L241, deixar explícito que sem `ML_ACCESS_TOKEN` o `"Puxar Dados"` do Mercado Livre extrai `og:image` do preview HTML e traz **apenas a primeira imagem** (o carrossel completo exige o token).
  2. **§4.8 L283, L286 e L287 (`OP-06`, `OP-12`):**
     - *Como está:* L287 lista o status logístico **`Em preparo`**; L283/L286 não distinguem os 8 badges exibidos na tabela das 6 opções de filtro no `<select>` (`PAYMENT_STATUS_OPTIONS`) nem a pré-contagem silenciosa da subaba `Pedidos`.
     - *O que melhorar:* Trocar **`Em preparo`** por **`Em separação`** em L287 (alinhado a §4.1 L165 e `AdminSales.js:218`) e adicionar nota curta em L283/L286 sobre a diferença entre badges da tabela e opções do filtro `<select>`, além da pré-contagem silenciosa de `Pedidos` ao abrir diretamente em `Produtos Internos`.
  3. **§8 L423–428 (`OP-09`):**
     - *Como está:* O item 23 (`Endurecimento de Segurança das APIs`) aparece dentro da subtabela `**Vendas internas**`.
     - *O que melhorar:* Mover o item 23 para uma subtabela própria `**Segurança de APIs**` (logo abaixo de `**Vendas internas**`), preservando integralmente seu texto técnico.
- **O que deve ser preservado:** Todas as 11 abas, ordem e tabela da §2, barra lateral esquerda recolhível exclusiva (§2.2), subabas (§2.3), regras de proteção (§9), permissões (§6) e demais históricos de §8.
- **Impacto nos demais arquivos:** Alinha 1:1 vocabulário e status logístico com `docs/ARQUITETURA_SITE_PUBLICO.md` §5.1.

---

### 19.3 Arquivo: `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md`
- **Por que precisa ser alterado:** Remover frase obsoleta em §3.5 (`OP-07`), alinhar os status em §5.1 ao código real e ao Site Privado (`OP-07`), e compactar o item 25 de §7 removendo duplicação de IDs brutos já guardados em `docs/melhoria_mercadopago.md` (`OP-09`).
- **Alterações propostas por seção:**
  1. **§3.5 L145 (`OP-07`):**
     - *Como está:* `"Os itens de 'Fonte de dados' até o aviso de afiliados descrevem a vitrine implementada hoje, que tem só a Modalidade A."`
     - *O que melhorar:* Remover essa frase residual pré-ADR-0037 (a tabela L147–153 e os itens L155–171 já distinguem claramente Modalidade A e Modalidade B implementadas).
  2. **§5.1 L199–200 (`OP-07`):**
     - *Como está:* L199 lista 5 status de pagamento (`Pendente`, `Aprovado`, `Recusado`, `Cancelado`, `Reembolsado`); L200 lista 5 status de pedido (`Aguardando pagamento`, `Em preparo`, `Enviado`..., `Entregue`, `Cancelado`).
     - *O que melhorar:* Alinhar exatamente a `pages/minha-conta.js:13-31` e `ARQUITETURA_SITE_PRIVADO.md`: 8 status de pagamento (`Pendente`, `Em análise`, `Autorizado`, `Aprovado`, `Recusado`, `Cancelado`, `Reembolsado`, `Contestado`) e 6 status de andamento (`Aguardando pagamento`, `Pago`, `Em separação`, `Enviado` com código de rastreio e endereço de entrega, `Entregue`, `Cancelado`).
  3. **§7 item 25 L237 (`OP-09`):**
     - *Como está:* Célula única com ~4.300 caracteres detalhando cada `ORDTST...`, `PAY...` e `payment_webhook_events.id` dos Pedidos #22–#31.
     - *O que melhorar:* Compactar mantendo o sumário objetivo de todos os cenários validados (PIX Pedido #20, boleto aprovado #21 e expirado #31, crédito aprovado #22, recusas #23/#25–#29, em análise #24, pré-pago #30, webhook real via `cloudflared` com HMAC-SHA256 v2 e idempotência, mais nota sobre `debit_card` opcional), remetendo os identificadores detalhados a `docs/melhoria_mercadopago.md`.
- **O que deve ser preservado:** Ordem das 5 abas, navegação horizontal pública, "Dicas do Dia", "Em Desenvolvimento" visível e desabilitada, regras de proteção (§8) e demais itens de §7.

---

### 19.4 Itens que NÃO Devem ser Modificados (Preservação Obrigatória)
1. Blocos gerenciados `<!-- ai-memory:start/end -->` e `<!-- BEGIN/END:nextjs-agent-rules -->` em `AGENTS.md`.
2. `CLAUDE.md` (`@AGENTS.md`).
3. Regras de proteção em `docs/ARQUITETURA_SITE_PUBLICO.md` §8 e `docs/ARQUITETURA_SITE_PRIVADO.md` §9, ordem e nomenclatura das 5 abas públicas e 11 abas administrativas, navegação horizontal pública e barra lateral esquerda recolhível do painel.
4. Padrão de mensagens de commit `ATT - ...` (decisão expressa do dono em 20/11 — Opção 1A registrada em `docs/melhoria_design.md`).
5. Conteúdo histórico dos Ciclos 1 e 2 em `docs/melhoria_agente.md` e ADRs aceitos em `docs/adr/` (exceto eventual atualização de status se o dono aprovar novo ADR).

---

## 20. Dependências, Impactos e Riscos
- **Dependências:**
  - `OP-06` em `ARQUITETURA_SITE_PRIVADO.md` §4.5 (L245) depende de decisão prévia do dono sobre a divergência `AdminProducts.js:28` × `pages/api/products.js:42`.
  - `OP-06` (§4.8 L287) e `OP-07` (§5.1 L199–200) devem ser aplicados juntos para manter sincronismo 1:1 do vocabulário de pedidos e pagamentos entre Site Privado e Site Público.
  - `OP-05`, `OP-08`, `OP-10` e `OP-11` em `AGENTS.md` são independentes e podem ser aplicados em paralelo ou antes das atualizações nas arquiteturas.
- **Impactos Avaliados:**
  - **No OpenCode:** elimina conflito silencioso entre `AGENTS.md` e anexos `*_append.md`, reforça checagem do canário do bench e previne regressões em CSS/E2E/editor.
  - **No Antigravity:** formaliza o protocolo diante de negativa do MCP `ai-memory`, reforça verificação cruzada de abas administrativas e evita investigações repetidas sobre imagens do Mercado Livre.
  - **Na interpretação e acionamento das documentações:** zera as contradições internas de §3.5/§4.5/§4.8/§5.1 e reduz o custo de tokens na leitura de `ARQUITETURA_SITE_PUBLICO.md` mantendo os mesmos fatos.
- **Riscos e Cuidados na Implementação Futura:**
  - **Inchaço do `AGENTS.md`:** o arquivo é carregado em toda sessão; as inclusões de `OP-05`, `OP-08`, `OP-10` e `OP-11` devem ser formuladas de forma ultra-concisa (acréscimo líquido estimado de 5–8 linhas na seção própria).
  - **Perda de rastreabilidade ao compactar `OP-09`:** manter link explícito e nomes dos arquivos/cenários no resumo do item 25, preservando os IDs completos em `docs/melhoria_mercadopago.md`.
  - **Edição não autorizada de código:** não alterar `pages/api/products.js` durante a atualização documental sem aval explícito do dono para a divergência apontada.

---

## 21. Sequência Recomendada de Implementação
1. **Decisão do dono sobre pendências abertas:** (a) definir se `pages/api/products.js:42` deve exigir `link` obrigatório para Modalidade A em paridade com `AdminProducts.js:28`; (b) decidir se inclui lembrete de `CHANGELOG.md` em `AGENTS.md` §7.6 (`OP-13`); (c) indicar se deseja incluir na mesma rodada o saneamento dos itens operacionais de §24 (`.opencode/*_append.md`, `docs/AGENTS_OPERACAO.md`).
2. **Atualização de `AGENTS.md`:** aplicar `OP-05`, `OP-08`, `OP-10`, `OP-11` (e `OP-13` se aprovado), mantendo intocados os blocos gerenciados.
3. **Atualização sincronizada das arquiteturas:** aplicar juntos `OP-06`, `OP-09` e `OP-12` em `docs/ARQUITETURA_SITE_PRIVADO.md` e `OP-07` e `OP-09` em `docs/ARQUITETURA_SITE_PUBLICO.md`, atualizando a data de `"Última atualização"` nos documentos alterados.
4. **Execução integral dos critérios de validação (§22).**
5. **Registro do resumo de implementação no final de `docs/melhoria_agente.md`** (seguindo o padrão de §25 dos Ciclos 1 e 2).

---

## 22. Critérios de Validação
1. **Clareza e concisão:** `AGENTS.md` permanece enxuto (seção própria antes de `<!-- ai-memory:start -->` ≤ 115 linhas) e seus dois blocos gerenciados permanecem idênticos byte a byte.
2. **Coerência código × documentação:**
   - Busca por `"Em preparo"` e `"que tem só a Modalidade A"` retorna **0 ocorrências** em `docs/ARQUITETURA_SITE_PRIVADO.md` e `docs/ARQUITETURA_SITE_PUBLICO.md`.
   - Status de pagamento (8) e de pedido (6) em `ARQUITETURA_SITE_PUBLICO.md` §5.1 e `ARQUITETURA_SITE_PRIVADO.md` §4.8 conferem 1:1 com `pages/minha-conta.js:13-31` e `components/Admin/AdminSales.js:214-245`.
   - `ARQUITETURA_SITE_PRIVADO.md` §4.5 L241 e L245 concordam entre si e refletem exatamente a decisão do dono para `pages/api/products.js`.
3. **Eliminação de duplicação e organização:**
   - Célula do item 25 em `ARQUITETURA_SITE_PUBLICO.md` §7 fica resumida (< 800 caracteres) preservando link para `docs/melhoria_mercadopago.md`.
   - Item 23 em `ARQUITETURA_SITE_PRIVADO.md` §8 aparece em subtabela própria fora de `"Vendas internas"`.
4. **Gates e testes sem regressão:** `npm run lint`, `npm run lint:chars`, `npm run knip`, `npm run lint:workflows`, `npm run security:check-sql`, `npm run security:check-credentials` e `npx jest tests/unit/scripts/bench-ground-truth.test.js` executados e aprovados com 0 erros após as edições.
5. **Aplicabilidade para os dois agentes:** OpenCode e Antigravity têm comportamento explícito e sem conflito para MCP `ai-memory` negado, canário do bench, specs Cypress, guard `css-tokens.test.js` e precedência sobre `*_append.md`.

---

## 23. Revisão Final do Plano de Ação
Revisão crítica executada conforme a Seção 9 da solicitação:
- **Cobertura completa da janela:** todas as 40 entregas de 16/11–22/11, os 4 relatórios semanais da janela, os ADRs recentes e os 3 documentos de referência completos foram confrontados diretamente com o código atual.
- **Zero duplicação ou inflação indevida:** as propostas mantêm o `AGENTS.md` enxuto, reduzem redundância no Site Público (`OP-09`) e removem contradições internas sem propor reestruturações amplas onde ajustes pontuais resolvem.
- **Compatibilidade com regras e decisões do dono:** todas as regras de proteção (§8 Público e §9 Privado) e a decisão de 20/11 sobre mensagens de commit (`ATT - ...`) foram preservadas; divergências código × doc (`pages/api/products.js:42`) foram separadas explicitamente para decisão do dono antes de qualquer edição.
- **Restrição de escrita verificada:** nenhuma alteração foi realizada em `AGENTS.md`, `ARQUITETURA_SITE_PRIVADO.md`, `ARQUITETURA_SITE_PUBLICO.md`, código, testes ou configs durante esta auditoria.

---

## 24. Pendências que Dependem de Análise ou Autorização Futura
1. **Divergência `AdminProducts.js:28` × `pages/api/products.js:42` (`AGENTS.md` §0.2 regra 4):** decidir se `pages/api/products.js` passará a exigir `link` obrigatório na criação (e não vazio na atualização) para produtos externos (`modality = 'external'`), alinhando servidor, formulário e ADR-0037.
2. **Saneamento dos anexos do OpenCode e `docs/AGENTS_OPERACAO.md`:** autorizar atualização de `.opencode/oh-my-opencode-slim/designer_append.md` (trocar `design-system/<projeto>/` e `"HTML + Tailwind"` por `design-system/` + tokens de `variables.css`), `orchestrator_append.md` (alinhar decisões oficiais para `docs/adr/`), `explorer_append.md` (corrigir `"duas duas"`) e `docs/AGENTS_OPERACAO.md` L34 (alinhar nota de `webfetch` do `explorer` com `ask`).
3. **Execução de `npm run models:check` no host do OpenCode:** validar o catálogo vivo (`opencode models`) para os 6 modelos + 1 reserva do preset `zen`.
4. **Validação em PostgreSQL real (`test-db-coverage.yml` ou Docker local) pós-`f161227`:** confirmar a execução das novas asserções de `tests/integration/domain/customers.db.test.js` (`password_hash = NULL` e `GOOGLE_ACCOUNT_CONFLICT`).
5. **Limpeza dos 20 warnings em `_lint/report.md` da wiki do `ai-memory` (23/11 07:48 BRT):** requer sessão com permissão liberada no MCP `ai-memory`.
6. **Handoff pendente (`23/11 00:17 BRT`, `antigravity-cli`):** avaliar com o operador se deseja configurar `ML_ACCESS_TOKEN` para importar todas as imagens do carrossel do Mercado Livre no `"Puxar Dados"` (`pages/api/admin/fetch-ml.js`).
7. **Atualização retroativa opcional de `CHANGELOG.md` (20–22/11):** registrar ou consolidar as entregas de `a681cc5`, `25081d9`, `00758a7`, `e934811` (ADR-0043), `c676098`, `28b6b17`, `0091855` e `ee4ed2e`.
8. **Pendências de ciclos anteriores aguardando definição do dono/ambiente:** (a) aba pública `"Em Desenvolvimento"`; (b) `Opção 2B` de `docs/melhoria_design.md` (`axe-core` + `cypress-axe`) e inspeção visual ao vivo em `localhost:3000` nos 4 viewports; (c) habilitação comercial opcional de `debit_card` direto no Mercado Pago.


---

## 25. Registro da Implementação — OC-10 e Oportunidades do Ciclo 3 (23/11/2026)

Com autorização do operador (`"ajuste o que é necessário para ficar ok"` sobre o caso `OC-10`, seguida da aprovação para incluir `OP-05`, `OP-11`, `OP-12` e `OP-13`), foram aplicadas todas as correções e oportunidades do Ciclo 3 (9/9 oportunidades concluídas), preservando integralmente o histórico dos Ciclos 1, 2 e 3 e os blocos gerenciados de `AGENTS.md`.

### 25.1. Situação dos Subitens do OC-10

| Subitem | Escopo | Ação aplicada | Status |
|---|---|---|---|
| **(a)** Privado + `/api/products` | `pages/api/products.js:42` e `docs/ARQUITETURA_SITE_PRIVADO.md` | `productFieldSchemas.link` passou a exigir string não vazia e URL válida (paridade com `AdminProducts.js:28` e ADR-0037), com 2 novos casos e payloads atualizados em `tests/integration/api/products.test.js`; `ARQUITETURA_SITE_PRIVADO.md` atualizado para `2026-11-23` (§4.5 L241 explicitando 1 imagem via `og:image` sem `ML_ACCESS_TOKEN`; §4.5 L245 alinhado; §4.8 L287 corrigido de `"Em preparo"` para `"Em separação"`; §8 item 23 movido para subtabela `Segurança de APIs`). | **Resolvido** |
| **(b)** Site Público | `docs/ARQUITETURA_SITE_PUBLICO.md` | Atualizado para `2026-11-23`: removida a frase residual pré-ADR-0037 em §3.5 L145; §5.1 L199–200 sincronizado com os 8 status de pagamento e 6 de andamento de `pages/minha-conta.js`; §7 item 25 compactado mantendo resumo completo e ponteiro para `docs/melhoria_mercadopago.md`. | **Resolvido** |
| **(c)** `AGENTS.md` × OpenCode | `AGENTS.md`, `.opencode/oh-my-opencode-slim/{designer,orchestrator,explorer}_append.md`, `docs/AGENTS_OPERACAO.md` | Explicitada em `AGENTS.md` §2 a prevalência de `AGENTS.md` e `docs/` sobre anexos locais; `designer_append.md` alinhado a `design-system/MASTER.md` e CSS Modules + `variables.css` (sem Tailwind); `orchestrator_append.md` alinhado a ADRs em `docs/adr/`; corrigido typo `"duas duas"` em `explorer_append.md`; corrigida nota de `webfetch` do `explorer` (`ask`) em `docs/AGENTS_OPERACAO.md:34`. | **Resolvido** |
| **(d)** MCP `ai-memory` + lint | `AGENTS.md` §3 e wiki `_lint/report.md` | Adicionado protocolo de degradação honesta em `AGENTS.md` §3 quando o MCP `ai-memory` estiver negado ou indisponível. Os **20 warnings** de `_lint/report.md` permanecem pendentes porque o MCP `ai-memory` continuou negado por permissão nesta execução e não foi contornado. | **Parcialmente resolvido** |
| **(e)** `CHANGELOG.md` | `CHANGELOG.md` (`## [Não publicado]`) | Registradas as alterações relevantes de 20–22/11 (`a681cc5`, `25081d9`, `00758a7`, `e934811` / ADR-0043, `c676098`, `c1dd831`, `c64424a`, `54ed1f3`, `28b6b17`, `0091855`, `ee4ed2e`) e a paridade/alinhamento de 23/11. | **Resolvido** |

### 25.2. Status Atualizado das Oportunidades do Ciclo 3 (§16)

| ID | Status | Observação |
|---|---|---|
| **OP-05** | **Concluída** | Ampliado `AGENTS.md` §7 item 1 com todos os alvos do canário `bench-ground-truth.test.js` e gate para specs Cypress novas/alteradas; atualizado §7 item 2 com sincronização de `design-system/pages/`, varredura de arquivos irmãos e guard `css-tokens.test.js`. |
| **OP-06** | **Concluída** | Paridade de `link` aplicada em `pages/api/products.js` e `ARQUITETURA_SITE_PRIVADO.md` §4.5/§4.8 corrigido. |
| **OP-07** | **Concluída** | `ARQUITETURA_SITE_PUBLICO.md` §3.5 L145 e §5.1 L199–200 sincronizados ao código. |
| **OP-08** | **Concluída** | Protocolo de degradação honesta para `ai-memory` indisponível/negado adicionado em `AGENTS.md` §3. |
| **OP-09** | **Concluída** | Item 25 do Site Público compactado e item 23 do Site Privado movido para subtabela `Segurança de APIs`. |
| **OP-10** | **Concluída** | Regra de prevalência em `AGENTS.md` §2 + saneamento de `*_append.md` e `AGENTS_OPERACAO.md`. |
| **OP-11** | **Concluída** | Incluído em `AGENTS.md` §0.3 passo 5 o checklist de paridade/helpers/atalhos em telas administrativas e em §7 item 1 a obrigatoriedade de `npm test` ao alterar configs de ambiente/ferramentas. |
| **OP-12** | **Concluída** | §4.5 L241 (`og:image` única sem `ML_ACCESS_TOKEN`) e §4.8 L283 (`PAYMENT_STATUS_OPTIONS` com 6 opções vs 8 badges e pré-carregamento da contagem de `Pedidos`) documentados integralmente. |
| **OP-13** | **Concluída** | Adicionado em `AGENTS.md` §7 item 6 o registro de entregas funcionais ou de segurança notáveis em `CHANGELOG.md`, mantendo intacto o padrão de commits `ATT - ...`. |

### 25.3. Arquivos Alterados e Validações
- **Arquivos modificados:** `pages/api/products.js`, `tests/integration/api/products.test.js`, `AGENTS.md`, `docs/ARQUITETURA_SITE_PRIVADO.md`, `docs/ARQUITETURA_SITE_PUBLICO.md`, `docs/AGENTS_OPERACAO.md`, `.opencode/oh-my-opencode-slim/designer_append.md`, `.opencode/oh-my-opencode-slim/orchestrator_append.md`, `.opencode/oh-my-opencode-slim/explorer_append.md`, `CHANGELOG.md` e `docs/melhoria_agente.md`.
- **Validação executada sobre o código e documentos:**
  - `npm test -- --silent` (após as alterações em `pages/api/products.js` e `tests/integration/api/products.test.js`): `241 passed, 8 skipped (249 total)` suítes (`2.092 passed, 96 skipped`, `6 snapshots`), incluindo `tests/integration/api/products.test.js` (`39/39`) e `tests/unit/scripts/schema-sources.test.js` (`7/7`). *(As 8 suítes `*.db.test.js` seguem aguardando Docker/CI `test-db-coverage.yml`, sem alteração em `lib/domain/`).*
  - `npx jest tests/unit/scripts/bench-ground-truth.test.js tests/unit/tests-hygiene/css-tokens.test.js --silent` (após as atualizações finais em `AGENTS.md` e `docs/`): `2/2` suítes (`21/21` testes aprovados).
  - `npm run lint`, `npm run knip`, `npm run lint:workflows` e `npm run lint:chars` (após a última edição): todos com `0` erros/avisos (`security:check-sql` e `security:check-credentials` também verdes sobre a base JS inalterada desde o passo anterior).
  - Conferência de ausência de termos legados em `ARQUITETURA_SITE_PRIVADO.md` e `ARQUITETURA_SITE_PUBLICO.md` (`"Em preparo"`, `"que tem só a Modalidade A"`, `"link opcional válido"`): `0` ocorrências; blocos gerenciados de `AGENTS.md` intactos e seção própria antes de `<!-- ai-memory:start -->` dentro do limite de concisão.
