# ARQUITETURA DO SITE — ÁREA PRIVADA (PAINEL ADMINISTRATIVO)

> Escopo: painel administrativo em `/admin` (acesso só com login). A área pública está em `docs/ARQUITETURA_SITE_PUBLICO.md`.
> Fonte: 23 capturas de tela do painel (ambiente local `localhost:3000/admin`).
> Última atualização: 2026-10-27
> Legenda: [PLANEJADO] = alvo ainda não implementado, informado pelo dono | [OBSERVADO] = visto nas imagens | [HIPÓTESE] = inferido, confirmar antes de assumir.

---

## 1. Visão geral

- **Nome:** Painel Administrativo do "O Caminhar com Deus".
- **URL:** `localhost:3000/admin`. Todas as telas e abas mostram a mesma URL [OBSERVADO], então a navegação é interna (abas controladas no cliente). [HIPÓTESE] Next.js, com página única `/admin`.
- **Autenticação:** sessão logada. Cabeçalho mostra "Olá, **admin**" e botão vermelho "Sair / Logout".
- **Autorização:** por cargos (roles) com permissões por aba (seção 6). Cada aba do painel corresponde a uma permissão.
- **Infraestrutura vista na aba Segurança:** armazenamento de arquivos para uploads, backups criptografados (`.sql.gz.enc`), rate limiting por IP e log de auditoria. Banco de dados e cache: ver `docs/ARQUITETURA_SITE_PUBLICO.md` §1.
- **Layout:** cartão branco central (~1000 px) sobre fundo cinza claro; título "Painel Administrativo" à esquerda; usuário e logout à direita; abas com emoji e sublinhado azul na aba ativa; botões: azul (Exportar CSV, Atualizar), verde (criar/salvar), cinza (Cancelar), vermelho (Excluir, Logout, Limpar cache).

## 2. Navegação principal (10 abas)

A barra quebra em 3 linhas. A ordem abaixo é a ordem visual.

| # | Aba | Emoji | Função |
|---|---|---|---|
| 1 | Visão Geral | 📊 | Painel de contagens (aba padrão ao entrar) |
| 2 | Posts/Artigos | 📝 | CRUD de reflexões e estudos + CRUD de categorias (toggle "Posts \| Categorias") |
| 3 | Gestão de Músicas | 🎵 | CRUD de músicas (Spotify) |
| 4 | Gestão de Vídeos | 🎬 | CRUD de vídeos (YouTube) |
| 5 | Gestão de Produtos | 📦 | CRUD de produtos religiosos |
| 6 | Dicas do Dia | 💡 | CRUD de dicas |
| 7 | Configuração de Cabeçalho | 🎨 | Título, subtítulo e banner do site público |
| 8 | Segurança | 🔒 | Integridade, backup, rate limiting, cache |
| 9 | Usuários | 👥 | Usuários/admins e cargos |
| 10 | Auditoria | 📜 | Histórico global de ações |

Subabas internas existem em Segurança (4) e Usuários (2).

### 2.1 Mapeamento entre abas (site privado × site público)

A correspondência entre as abas administrativas e suas abas públicas de exibição é a seguinte:

| Site privado — aba administrativa | Site público — aba de exibição |
|---|---|
| Posts/Artigos | Reflexões & Estudos |
| Gestão de Músicas | Músicas |
| Gestão de Vídeos | Vídeos |
| Gestão de Produtos | Produtos Religiosos |
| Dicas do Dia | Dicas do Dia |

Esse mapeamento deve ser mantido de forma consistente em toda a documentação.

## 3. Padrão comum das telas de conteúdo (Posts, Músicas, Vídeos, Produtos, Dicas)

Todas seguem o mesmo modelo, com pequenas variações:

1. **Cabeçalho da seção:** título ("Gerenciar Posts", "Gestão de Músicas", etc.) + "Total: N itens cadastrados".
2. **Barra de ações (à direita):** campo "Buscar item..." (com lupa) → botão azul "Exportar CSV" → botão verde "+ Novo ...".
3. **Tabela de listagem:** primeira coluna com ícone ☰ (indica reordenação por arrastar [HIPÓTESE]), depois colunas específicas e coluna "Ações". Estado vazio em itálico.
4. **Formulário de criação/edição:** abre acima da tabela ao clicar em "+ Novo". O botão verde vira "Cancelar" (cinza) e o "Exportar CSV" permanece.
5. **Publicação:** checkbox de publicar + selo de status ("Rascunho" amarelo / "Publicado" verde). **Apenas registros com status Publicado são exibidos no site público. Registros com status Rascunho permanecem disponíveis no painel administrativo, mas não são exibidos nas abas públicas correspondentes.**
6. **Botão "⚡ Puxar Dados"** nos campos de link (Spotify, YouTube, Produto): preenche dados automaticamente a partir da URL [HIPÓTESE]. Cor do botão muda por tipo: verde (Spotify), vermelho (YouTube), amarelo (Produto).

### 3.1 Regras de cadastro e exibição

- **Quantidade ilimitada:** Nas abas **Posts/Artigos**, **Gestão de Músicas**, **Gestão de Vídeos**, **Gestão de Produtos** e **Dicas do Dia**, **não há limite de registros cadastrados**. É permitido cadastrar quantos registros forem necessários, independentemente de estarem com status **Rascunho** ou **Publicado**.
- **Exibição exclusiva por publicação:** Somente registros com status **Publicado** são exibidos na aba pública correspondente, conforme o mapeamento da seção 2.1. Registros em **Rascunho** não devem ser exibidos no site público.
- **Sem mistura de conteúdos:** Cada aba pública exibe exclusivamente os registros publicados de sua respectiva aba administrativa, sem misturar conteúdos entre diferentes categorias.
- **Reflexo da publicação:** Ao alterar um registro de **Rascunho** para **Publicado** (ou vice-versa), essa mudança deve refletir na aba pública correspondente, respeitando as regras acima.

## 4. Detalhe das abas de conteúdo

### 4.1 Visão Geral
- **Título:** "Visão Geral do Sistema".
- **6 cartões** (3 x 2) com ícone, número grande e rótulo:
  | Cartão | Detalhe exibido |
  |---|---|
  | Artigos | "✅ N Pub \| 📝 N Rasc" (publicados / rascunhos) |
  | Músicas | idem |
  | Vídeos | idem |
  | Produtos | idem |
  | Dicas | idem |
  | Usuários | "Ativos: Hoje (N) • Mês (N) • Ano (N)" |
- **Distribuição de Conteúdo:** barras horizontais por categoria, com cor própria: Artigos (azul), Músicas (verde), Vídeos (vermelho), Produtos (laranja), Dicas (roxo), Usuários (ciano). Mostra o valor dentro da barra quando maior que zero.
- **Estado observado:** tudo em 0, exceto Usuários = 1.

### 4.2 Posts/Artigos
- **Título:** "Gerenciar Posts". Botão: "+ Novo Post".
- **Toggle de visualização (desde 2026-10-27, ADR-0024):** no topo da aba, controle segmentado **"Posts | Categorias"** alterna entre o CRUD de posts e o CRUD de categorias (§4.2.1). Padrão: "Posts".
- **Tabela:** ☰ | ID | Título | Status | Data | Ações. Vazio: "Nenhum post encontrado."
- **Formulário:**
  | Campo | Obrigatório | Regra/dica |
  |---|---|---|
  | Título | Sim | "Título do post" |
  | Slug (URL amigável) | Sim | "Usado na URL do post. Ex: meusite.com/blog/exemplo-de-slug" |
  | Resumo | Não | até 500 caracteres, contador "0 / 500"; "Aparece na listagem do blog" |
  | Conteúdo | Não | área grande de texto livre ("Conteúdo completo do post...") |
  | Imagem de Capa | Não | URL (`https://...`) ou botão verde "Upload" |
  | Categorias | Não | grupo de checkboxes com as categorias cadastradas; "Opcional. Selecione uma ou mais categorias." Sem categorias cadastradas, exibe "Nenhuma categoria cadastrada. Crie na aba \"Categorias\"." |
  | Publicar post imediatamente | — | desmarcado por padrão → "Rascunho"; "Se desmarcado, o post será salvo como rascunho." |
  Botão final: "Salvar".
- **Ligação com o site público:** o Resumo alimenta o cartão de Reflexões & Estudos; a Imagem de Capa é a capa do cartão; o Slug forma a URL da leitura; as Categorias aparecem como chips no cartão público. [HIPÓTESE] o editor de Conteúdo é texto simples (sem editor rico visível).

### 4.2.1 Categorias (dentro da aba Posts/Artigos)
- **API:** `/api/admin/categories` (CRUD completo; permissão **Posts/Artigos**; mutações invalidam o cache `posts:*`). `GET /api/admin/categories?all=1` devolve a lista completa sem paginação (usado pelo campo de seleção do formulário de post).
- **Tabela:** ID (60px) | Nome | Slug. Vazio: "Nenhuma categoria cadastrada."
- **Formulário:**
  | Campo | Obrigatório | Regra/dica |
  |---|---|---|
  | Nome | Sim | "Nome da categoria"; ao sair do campo, gera o slug automaticamente (uma vez) se o slug estiver vazio |
  | Slug (URL amigável) | Sim | "Gerado automaticamente a partir do nome; pode ser editado."; apenas minúsculas, números e hífens |
- **Slug duplicado:** a API devolve **409** "Já existe uma categoria com esse slug"; o toast exibe a mensagem e o formulário permanece aberto.
- **Validações que devolvem 400:** `category_ids` com id de categoria inexistente é recusado antes do INSERT (o post não é criado/atualizado); nome sem nenhum caractere alfanumérico é recusado por não gerar slug.
- **Exclusão:** modal padrão de confirmação do painel; os vínculos post↔categoria são removidos em cascata (sem aviso adicional de posts afetados).
- **Decisão:** [ADR-0024](adr/0024-crud-categorias-posts-chips-display-only.md) — CRUD completo escolhido pelo dono; permissão reutilizada (sem permissão nova no RBAC); chips display-only na frente pública (links para arquivo por categoria ficam para evolução futura).

### 4.3 Gestão de Músicas
- **Botão:** "+ Nova Música".
- **Tabela:** ☰ | ID | Título | Artista | Spotify | Status | Ações. Vazio: "Nenhuma música cadastrada ainda."
- **Formulário:**
  - Título da Música * ("Nome da música")
  - Nome do Artista * ("Nome do artista")
  - Link do Spotify * (formato `https://open.spotify.com/track/...`) + botão "⚡ Puxar Dados"
  - Publicar música imediatamente (desmarcado → Rascunho)
  - Botão "Cadastrar Música"
- **Relação com o público:** o link Spotify gera o player incorporado e o botão "Ouvir no Spotify". Apenas **tracks** são suportados: o formulário, a API e o "⚡ Puxar Dados" recusam link não-track (playlist, álbum, episódio) com a mensagem "Apenas links de faixa (track) são suportados para embed." (decisão em [ADR-0023](adr/0023-spotify-embed-limitado-a-tracks-com-fallback.md)). No site público, URL não-track deixada de versões antigas exibe "Prévia indisponível" em vez de iframe quebrado (ver `docs/ARQUITETURA_SITE_PUBLICO.md` §3.3).

### 4.4 Gestão de Vídeos
- **Botão:** "+ Novo Vídeo".
- **Tabela:** ☰ | ID | Título | YouTube | Status | Ações. Vazio: "Nenhum vídeo cadastrado ainda."
- **Formulário:**
  - Título do Vídeo * ("Nome do vídeo")
  - Descrição (até 500 caracteres)
  - Link do YouTube * (`https://www.youtube.com/watch?v=...`) + botão "⚡ Puxar Dados"
  - Capa Personalizada (URL ou "Upload"): "Opcional. Se vazio, usará a miniatura padrão do YouTube."
  - Publicar vídeo imediatamente (desmarcado → Rascunho)
  - Botão "Cadastrar Vídeo"
- **Relação com o público:** a descrição aparece sob o título no cartão. O erro "Video unavailable" vem do vídeo em si (removido, privado, bloqueado por direitos autorais ou sem permissão de incorporação), não do formulário.

### 4.5 Gestão de Produtos
- **Botão:** "+ Novo Produto".
- **Tabela:** ☰ | ID | Status | Imagem | Produto | Valor | Link | Ações. Vazio: "Nenhum produto cadastrado. Comece adicionando um!"
- **Formulário:**
  - Nome do Produto * (ex.: "Bíblia de Estudo")
  - Valor * (ex.: "R$ 89,90") — campo de texto; [HIPÓTESE] o filtro Mín/Máx do site público precisa converter esse texto em número.
  - URLs das Imagens * (uma por linha; "A primeira imagem será a capa. Suporta carrossel.")
  - Descrição ("Detalhes sobre o produto...")
  - Link do Produto + botão amarelo "⚡ Puxar Dados" (Amazon, Mercado Livre, Shopee)
  - Produto Publicado — **marcado por padrão** (selo "Publicado"); "Desmarque para transformar o produto em um Rascunho (ocultar da vitrine pública)."
  - Botão "Salvar Produto"
- **Diferença importante:** Produtos e Dicas nascem publicados; Posts, Músicas e Vídeos nascem como rascunho.

### 4.6 Dicas do Dia
- **Título:** "Gerenciar Dicas do Dia". Botões: "Exportar CSV" e "+ Novo" (padrão §3, igual às demais telas de conteúdo). O CSV traz o **conteúdo integral** da dica (a coluna "Conteúdo" da tabela trunca a 80 caracteres apenas para exibição).
- **Tabela:** ID | Nome | Conteúdo | Status | Ações (sem coluna ☰). Vazio: "Nenhum item cadastrado ainda."
- **Formulário (2 colunas):**
  - Nome da Dica * (ex.: "Mensagem de fé")
  - Conteúdo da Mensagem * ("Digite a mensagem inspiradora...")
  - Status de Publicação — marcado por padrão; "Ative para exibir esta dica no site público."
  - Botão "Salvar"
- **Relação com o público:** "Nome da Dica" é o autor/fonte em negrito e "Conteúdo" é o texto entre aspas no bloco "Dicas do Dia" (ex.: a dica de teste "Teste 10").

### 4.7 Configuração de Cabeçalho
- **Campos:**
  - Título da Página (valor canônico em `docs/ARQUITETURA_SITE_PUBLICO.md` §1 e §2)
  - Subtítulo (valor canônico em `docs/ARQUITETURA_SITE_PUBLICO.md` §1 e §2)
  - Imagem Principal (1100×320) — seletor de arquivo ("Choose File")
- **Botões:** "Atualizar Imagem" (envia só a imagem) e "Salvar Configurações" (salva título e subtítulo).
- **Visualização:** prévia ao vivo com título e subtítulo (a imagem não aparece na prévia por enquanto).
- **Relação com o público:** controla o cabeçalho e o banner que aparecem em todas as abas do site. O público exibe o título em caixa alta, provavelmente por CSS. [HIPÓTESE]

## 5. Segurança, Usuários e Auditoria

### 5.1 Segurança — subabas
Barra interna com 4 subabas: 🛡️ Verificação de Integridade | 💾 Backup do Sistema | 🔒 Rate Limiting | ⚡ Cache do Sistema.

**Verificação de Integridade** (botão "🔄 Atualizar"; faixa verde "✅ Sistema Saudável"):
| Componente | Dados mostrados (valores observados) |
|---|---|
| Banco de Dados | Status Conectado; Latência 0 ms; Tamanho 9.3 MB; Conexões 5 |
| Cache/Redis | Status Conectado; Tipo Upstash Redis |
| Armazenamento | Arquivos 0; Tamanho 0 B (continua abaixo; possivelmente há mais componentes) |

**Backup do Sistema:**
- Texto: backups automáticos diários; backup manual possível.
- "Último Backup Realizado": arquivo `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`, data exibida 02/10/2026 20:53:04, tamanho 4367.31 KB.
- Botão azul "📥 Realizar Backup Agora".
- **Incoerência:** o nome do arquivo traz 2026-05-22 mas a data exibida é 02/10/2026. Verificar se a data vem do arquivo ou do carimbo do servidor.

**Rate Limiting:** botão "🔄 Atualizar"; filtros "🔒 Bloqueados (0)", "✅ Whitelist (0)", "📋 Auditoria". Vazio: "Nenhum IP bloqueado no momento. Todas as requisições estão dentro dos limites configurados." Rodapé: "Atualização automática a cada 15s".

**Cache do Sistema:** explica que limpar o cache força buscar dados novos do banco ("use se as alterações não estiverem aparecendo no site"). Botão vermelho "Limpar Cache Redis". Status: "✅ Redis Conectado", Erros 0, Fallbacks 0, Tamanho Local 0 entradas, Última Falha Nenhuma.

### 5.2 Usuários — subabas
**Gestão de Usuários e Admins:**
- **Finalidade:** é onde se controlam os usuários e as senhas com acesso ao Painel Administrativo. Cada usuário é vinculado a um cargo, e é o cargo que define o que ele pode usar.
- Botão "+ Novo Usuário"; "Total: 1 usuário cadastrado".
- Tabela: ID | Usuário | Cargo (selo) | Último Login (tempo relativo, ex. "há 7 minutos") | Ações (verde "Editar", vermelho "Excluir").
- Registro atual: ID 1, `admin`, cargo `admin`.
- **Usuário `admin`:** [PLANEJADO] é o administrador raiz. Nasce e permanece vinculado ao cargo `admin`, e não pode nem deve ser excluído.
- Formulário: Nome de Usuário / E-mail * (ex.: "novo.admin"); Senha (mínimo 6 caracteres, "armazenada com hash seguro"; em branco na edição mantém a atual); Cargo / Permissão (lista "Selecione um cargo", obrigatória — "O cargo define os níveis de acesso deste usuário no sistema"); botão "Salvar".

**Gestão de Cargos:**
- **Finalidade:** cada cargo reúne as permissões que liberam o acesso às ferramentas do Painel Administrativo. As permissões são as próprias abas do painel (seção 6): o que o cargo não listar, o usuário não vê.
- Título "Gestão de Cargos e Permissões"; botão "+ Novo Cargo"; "Total: 1 cargo cadastrado".
- Tabela: ID | Nome do Cargo | Permissões Vinculadas (etiquetas azuis) | Ações (Editar/Excluir).
- Registro atual: ID 3, `admin`, com as 10 permissões.
- **Cargo `admin`:** [PLANEJADO] é o único cargo que vem habilitado por padrão com todas as permissões existentes (as 10 da seção 6). Não pode nem deve ser excluído.
- Formulário: Nome do Cargo * (ex.: "Editor de Conteúdo") + 10 caixas de permissão (pelo menos uma é obrigatória): Visão Geral, Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos, Gestão de Dicas, Configuração de Cabeçalho, Segurança, Usuários, Auditoria. Botão "Salvar".
- O nome da permissão "Gestão de Dicas" corresponde à aba "Dicas do Dia".
- O ID 3 indica que os cargos 1 e 2 já existiram e foram removidos (a auditoria mostra a exclusão do cargo `user`).

### 5.3 Auditoria
- **Título:** "Histórico Global de Auditoria".
- **Filtros:** busca "Buscar ações, usuários ou detalhes...", data/hora inicial, data/hora final (inputs `datetime-local`, formato mm/dd/yyyy), botão verde "Exportar CSV", botão "Atualizar".
- **Tabela rolável:** Data/Hora | Usuário | Ação Executada | Detalhes.
- **Registros observados (20/10/2026):**
  | Hora | Usuário | Ação | Detalhes |
  |---|---|---|---|
  | 17:16:44 | admin | EXCLUIR CARGO | Removeu o cargo: user |
  | 17:13:10 | admin | EXCLUIR DICA | Removeu a dica: Teste 10 |
  | 17:13:05 até 17:12:56 | admin | EXCLUIR VÍDEO (6 registros) | Removeu o vídeo: undefined |
- **Bug:** o log de exclusão de vídeo grava `undefined` no lugar do título. O código de exclusão de vídeos deve passar o título ao log.
- **Padrão de ação:** `VERBO + OBJETO` em caixa alta (EXCLUIR CARGO/DICA/VÍDEO). Outras ações (criar, editar, login) provavelmente existem mais abaixo na lista. [HIPÓTESE]

## 6. Mapa permissão → aba
| Permissão | Aba do painel |
|---|---|
| Visão Geral | 📊 Visão Geral |
| Posts/Artigos | 📝 Posts/Artigos |
| Gestão de Músicas | 🎵 Gestão de Músicas |
| Gestão de Vídeos | 🎬 Gestão de Vídeos |
| Gestão de Produtos | 📦 Gestão de Produtos |
| Gestão de Dicas | 💡 Dicas do Dia |
| Configuração de Cabeçalho | 🎨 Configuração de Cabeçalho |
| Segurança | 🔒 Segurança |
| Usuários | 👥 Usuários |
| Auditoria | 📜 Auditoria |

## 7. Ligação entre painel e site público

| Site privado — aba administrativa | Site público — aba de exibição | Efeito no site público |
|---|---|---|
| Posts/Artigos | Reflexões & Estudos | Somente registros **publicados** aparecem em cartões/páginas da aba Reflexões & Estudos. Registros em **Rascunho** não são exibidos. |
| Gestão de Músicas | Músicas | Somente registros **publicados** aparecem na grade da aba Músicas. Registros em **Rascunho** não são exibidos. |
| Gestão de Vídeos | Vídeos | Somente registros **publicados** aparecem na grade da aba Vídeos. Registros em **Rascunho** não são exibidos. |
| Gestão de Produtos | Produtos Religiosos | Somente registros **publicados** aparecem na vitrine da aba Produtos Religiosos. Registros em **Rascunho** não são exibidos. |
| Dicas do Dia | Dicas do Dia | Somente registros **publicados** aparecem no bloco "Dicas do Dia" no fim de todas as abas. Registros em **Rascunho** não são exibidos. |
| Configuração de Cabeçalho | Todas as abas públicas | Título, subtítulo e banner 1100×320 de todas as abas |
| Cache do Sistema | Todas as abas públicas | Se uma alteração não aparecer no site, limpar o cache Redis |

**Regras gerais de exibição:**
- Não há limite de quantidade de registros cadastrados nas cinco abas administrativas acima, seja o status **Rascunho** ou **Publicado**.
- A quantidade de registros **publicados** exibidos no site público não está sujeita a um limite definido por essas regras — são exibidos todos os registros com status **Publicado** de cada respectiva aba.
- Cada aba pública apresenta exclusivamente os registros publicados de sua aba administrativa correspondente, sem mistura de conteúdos entre categorias diferentes.

A aba pública "Em Desenvolvimento" não tem gestão no painel.

## 8. Estado atual e inconsistências

**Bugs — corrigir no código**

| # | Item | Status |
|---|---|---|
| 2 | **Log de vídeos:** campo "undefined" nos registros de EXCLUIR VÍDEO. | **corrigido em 2026-10-21** — o log grava o título do vídeo excluído (`deletedVideo.titulo`, `pages/api/admin/videos.js:109`). |
| 3 | **Data do backup:** nome do arquivo (2026-05-22) divergia da data exibida (02/10/2026). | **corrigido em 2026-10-27** — a API `/api/admin/backups` passou a reutilizar a listagem do `scripts/backup.js` (`getAvailableBackups`), ordenada pela data de criação gravada no próprio nome do arquivo; o mtime (que cópias do diretório reescrevem) deixou de ser usado |
| 8 | **Exclusão do admin:** o botão "Excluir" existia no usuário `admin` e no cargo `admin`, e a API não tinha trava — a de usuário só impedia excluir a própria conta logada (`pages/api/admin/users.js`), e a de cargo não verificava nada (`pages/api/admin/roles.js`). | **corrigido em 2026-10-21** — a API recusa com 400 nomeado: excluir o usuário administrador (`process.env.ADMIN_USERNAME`, default `admin`), trocar o cargo dele para não-`admin` e excluir o cargo `admin`; o painel não renderiza mais o botão "Excluir" nas linhas protegidas (`canDelete` em `CrudTable`, repassado por `AdminUsersTab`/`AdminRolesTab`). Detalhes em `docs/PENDENCIAS_seguranca-rotas-api.md` (S10). |
| 9 | **Formatos regionais:** campos de data em mm/dd/yyyy e botão de arquivo em inglês, diferentes do pt-BR do restante. | **corrigido em 2026-10-27** — o upload do banner usa botão "Escolher arquivo" em pt-BR (input nativo oculto); os filtros de período da Auditoria usam campo com máscara dd/mm/aaaa hh:mm (`components/Admin/fields/DateTimeBRField.js`) no lugar do `datetime-local` nativo; valores exibidos (KB, economia, `R$`) usam separador decimal pt-BR. O campo de edição de preço mantém o formato de dado original. A revisão do checklist (27/10) acrescentou nomes acessíveis aos novos controles (`htmlFor`/`aria-label`), `aria-live` no nome do arquivo selecionado, mensagem de erro inline com `aria-invalid` no campo de data e foco `:focus-visible` tokenizado no botão e no campo |
| 11 | **Reordenação de posts sempre falhava:** o helper enviava `position = 0` (0-based) e o schema exige posição positiva → HTTP 400 e a curadoria nunca persistia. | **corrigido em 2026-10-21** — `utils/reorder.js` passou a enviar posições 1-based. |
| 12 | **Reordenação de produtos inexistente:** o painel chamava `PUT /api/products` com `action: "reorder"`, mas a rota pública não tratava essa ação → HTTP 400. | **corrigido em 2026-10-21** — branch de reordenação adicionado em `pages/api/products.js`, com invalidação de cache e registro de Auditoria. |
| 13 | **Reordenação sem registro de Auditoria:** reordenar posts, músicas ou vídeos não gerava registro na Auditoria, contra a regra de §9 ("toda ação de … configurar deve gerar um registro"); o reorder de vídeos ainda não validava `id`/`position`. | **corrigido em 2026-10-21** — os três endpoints registram a ação com identificador real; vídeos passaram a validar o payload. |

**A confirmar**

| # | Item | Status |
|---|---|---|
| 1 | **Painel vazio, site público com conteúdo:** nas capturas do site público havia 3 posts, 18 músicas, 18 vídeos e 1 dica; neste painel Artigos, Músicas, Vídeos, Produtos e Dicas aparecem com 0. A auditoria mostra exclusão de dica e de vídeos, então o painel provavelmente foi limpo depois. Se o site público ainda mostrar conteúdo antigo, usar "Limpar Cache Redis". Confirmar também se posts e músicas foram apagados. | **confirmado em 2026-10-27 — divergência transiente, já resolvida.** A auditoria do banco comprova a limpeza do painel entre 20 e 25/10 (9 EXCLUIR POST, 43 EXCLUIR MÚSICA, 19 EXCLUIR VÍDEO, 1 EXCLUIR DICA) — as capturas do site público retratavam o período anterior. Posts e músicas foram apagados e recriados: o conteúdo voltou entre 25 e 27/10 (41 músicas importadas via Spotify, posts, dicas e categorias), com "Limpar Cache" executado em 25/10. Estado atual do banco: 2 posts (2 publicados), 16 músicas (14 publicadas), 2 dicas (1 publicada), 0 vídeos e 0 produtos (vídeos e produtos vazios por exclusão deliberada — as abas públicas exibem mensagem de estado vazio adequada). **Validação em 27/10/2026 com o servidor no ar:** as APIs públicas retornam exatamente os registros publicados do banco (`/api/posts` 2, `/api/musicas` 14, `/api/videos` 0, `/api/dicas` 1, `/api/products` 0) — painel e site público estão consistentes. Painel e site público leem o mesmo banco (`DATABASE_URL` único) e a invalidação de cache Redis é automática nas mutações do painel (`cacheKeys` no handler admin); o cache CDN expira em até 5 min. Não há defeito de implementação |
| 5 | **Padrões de publicação divergentes:** Posts, Músicas e Vídeos nascem como rascunho; Produtos e Dicas nascem publicados. | **confirmado em 2026-10-27** — conferido no banco (`information_schema`) e no código: `posts.published`, `musicas.publicado` e `videos.publicado` têm `DEFAULT false` (nascem rascunho); `products.published` e `dicas.published` têm `DEFAULT true` (nascem publicados). Formulários e APIs coerentes (Dicas: `published ?? true`; Posts: `?? false`; toggle de Produto com `published: true`). Comportamento intencional por tipo de conteúdo, conforme §4.2 |
| 6 | **Dicas sem "Exportar CSV"**, diferente das outras seções de conteúdo. | **confirmado e corrigido em 2026-10-27** — a causa era o `AdminDicas` não passar `exportable={true}` ao `AdminCrudBase` (prop default `false`; as outras 4 telas de conteúdo passavam). Habilitado, com `exportColumns` própria no CSV para o conteúdo integral (o `format` da tabela trunca a 80 caracteres só para exibição). Mecanismo de export inalterado (`utils/csvExport.js`, client-side, dados da página atual) |
| 10 | **Confirmação de exclusão:** não observada nas imagens. Verificar se existe diálogo de confirmação. | **confirmado em 2026-10-27** — existe e é padronizado: todos os 8 CRUDs (Posts, Músicas, Vídeos, Produtos, Dicas, Categorias, Usuários, Cargos) usam o `AdminCrudBase`, cujo `useAdminCrud` chama `onConfirmDelete` antes de qualquer DELETE — um único modal com Cancelar/Excluir (`components/Admin/AdminCrudBase.js`). Não há `window.confirm` nativo em uso (só fallback no hook para usos futuros sem modal) |

**Decisões do dono**

| # | Item | Status |
|---|---|---|
| 4 | **Nomenclatura:** a permissão é "Gestão de Dicas" e a aba é "Dicas do Dia". | **decidido em 2026-10-27 — manter.** O mapeamento permissão ↔ aba já está documentado no §4.2 e segue o padrão do projeto (`Posts/Artigos` ↔ aba "Reflexões & Estudos" também difere); renomear a permissão exigiria migração dos valores gravados em `roles.permissions` sem ganho funcional |
| 7 | **Senha mínima de 6 caracteres:** fraca. Considerar elevar para pelo menos 10 a 12 e exigir senha forte para admin. | aberto |

## 9. Regras de proteção do painel administrativo
- Não renomear abas, permissões nem a ordem das abas sem pedido; renomear uma permissão exige migração dos cargos já salvos.
- Toda nova aba do painel deve ter uma permissão correspondente em Gestão de Cargos e aparecer na tabela da seção 6.
- **Proteção do `admin` (regras ainda não implementadas — ver §8, item 8):**
  - O usuário `admin` e o cargo `admin` não podem ser excluídos: a API deve recusar a exclusão e o painel não deve oferecer a ação.
  - O usuário `admin` vem e permanece vinculado ao cargo `admin`; esse vínculo não pode ser alterado.
  - O cargo `admin` é o único que vem habilitado por padrão com todas as permissões existentes; os demais cargos nascem com as permissões marcadas no formulário.
- Toda ação de criar, editar, excluir ou configurar deve gerar um registro de Auditoria com título/identificador real (nunca `undefined`).
- A reordenação por arrastar grava posições **1-based** (`utils/reorder.js`): a primeira posição da página 1 é `1`. Os schemas dos endpoints exigem `position` positiva — não voltar a 0-based.
- Manter o padrão visual e de fluxo da seção 3 em novas telas de conteúdo.
- Nunca expor senhas; manter o hash seguro. Não registrar senhas nos logs.
