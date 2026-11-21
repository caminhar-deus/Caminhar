# ADR-0043: Expiração automática por 1h de inatividade no `/admin` e guarda unificada de HTTP 401

- **Status:** Aceito
- **Data:** 2026-11-21
- **Decisores:** Dono do projeto
- **Relacionados:** [ADR-0005](0005-jwt-http-only-rbac.md), [`../../pages/admin.js`](../../pages/admin.js), [`../../pages/login.js`](../../pages/login.js), [`../../hooks/useAdminInactivityTimeout.js`](../../hooks/useAdminInactivityTimeout.js), [`../../utils/adminSession.js`](../../utils/adminSession.js)

## Contexto

O painel administrativo (`/admin`) autentica operadores por meio de JWT com validade de 1 hora (`ACCESS_TOKEN_EXPIRY = '1h'` em [`../../lib/auth/auth.js`](../../lib/auth/auth.js)) armazenado em cookie `httpOnly`, enquanto toda a navegação entre as 11 áreas principais e suas subabas ocorre no cliente dentro de [`../../pages/admin.js`](../../pages/admin.js).

Antes desta mudança, havia três lacunas acopladas no ciclo de vida da sessão do painel:

1. **Verificação única na montagem:** `pages/admin.js` consultava `GET /api/auth/check` apenas no `useEffect` inicial e nunca monitorava inatividade do operador nem renovava o access token durante uso contínuo.
2. **Erro cru após 1 hora de inatividade:** quando a aba `/admin` permanecia aberta e ociosa por 1 hora ou mais, o cookie expirava silenciosamente. Ao clicar em outra área ou executar uma ação, as chamadas fetch falhavam com HTTP `401`, exibindo toasts/alertas de erro dentro do painel (ou sucesso falso em `handleSaveSettings`, que não verificava `response.ok`) em vez de voltar à tela de login.
3. **Tratamento fragmentado de `401`:** apenas quatro pontos isolados (`AdminAudit`, `RoleSelectField` em `AdminUsersTab`, `IntegrityCheck` e `RateLimitViewer`) tratavam HTTP `401` recarregando a página; os hooks compartilhados (`useApiFetch`, `useAdminCrud`) e componentes como `AdminDashboard`, `AdminSales`, `BackupManager`, `CacheManager`, `ExternalDataButton`, `ImageUploadField` e `utils/reorder.js` não redirecionavam.

## Decisão

Implementar controle unificado de inatividade e expiração de sessão no cliente para todas as áreas do `/admin`:

1. **Monitoramento de 1 hora de inatividade (`hooks/useAdminInactivityTimeout.js`):**
   - Considera apenas eventos reais de interação do operador (`pointerdown`, `mousedown`, `keydown`, `touchstart`, `scroll`, `mousemove`), com *throttle* de gravação em `localStorage` e verificação ao vivo ao retomar visibilidade/foco da aba, após suspensão/hibernação do navegador e antes de trocar de aba/subaba (`checkNow()`).
   - Pollings automáticos internos (`IntegrityCheck` a cada 30s e `RateLimitViewer` a cada 15s) **não** reiniciam o relógio de inatividade.
   - Ao atingir 1 hora (`60 * 60 * 1000` ms) sem atividade real, o painel limpa o armazenamento local da sessão, chama `POST /api/auth/logout`, exibe feedback ao operador e redireciona para `/login?next=/admin&reason=inactivity`.
2. **Renovação condicionada exclusivamente a uso ativo (`POST /api/auth/refresh`):**
   - Se o operador estiver ativo após pelo menos 45 minutos da última emissão (`effectiveLastActivity > lastRefresh`), o painel renova o cookie silenciosamente para evitar logout inesperado durante trabalho contínuo.
   - O instante do último refresh é sincronizado em `localStorage` (`admin_last_refresh_at`) com trava curta (`15s`) entre abas para evitar corrida na rotação de uso único do refresh token e preservar a renovação após recarregamento (`F5`) durante uso ativo.
   - Sessões ociosas **nunca** disparam `/api/auth/refresh`, e `pages/admin.js` **não** executa auto-refresh na montagem inicial de `checkAuth`, preservando a regra de encerramento após 1 hora de inatividade mesmo quando o navegador é reaberto depois do vencimento.
3. **Barramento leve de eventos para HTTP `401` (`utils/adminSession.js`):**
   - `notifyAdminUnauthorized('expired')` e `subscribeAdminUnauthorized(handler)` coordenam os 401 recebidos em qualquer hook, componente ou utilitário administrativo sem realizar *monkey-patch* global em `window.fetch` e sem violar o isolamento de camadas (`utils/` sem imports de `hooks/`, `components/` ou `pages/`).
   - Quando o controlador em `pages/admin.js` está inscrito, `notifyAdminUnauthorized` retorna `true` para suprimir toasts de erro espúrios e executar logout + redirecionamento único (com guarda de reentrância) para `/login?next=/admin&reason=expired`; em renderizações isoladas fora de `/admin`, retorna `false` mantendo o fallback local.
4. **Aviso claro na tela de login (`pages/login.js`):**
   - Lê `?reason=inactivity` e `?reason=expired` para exibir banner informativo (`role="status"`) no topo do formulário e atualiza o marcador de atividade ao autenticar com sucesso.

## Alternativas consideradas

- **Interceptar `window.fetch` globalmente (monkey-patching):** descartada por fragilizar testes, misturar rotas públicas com chamadas administrativas e dificultar rastreamento estático de dependências.
- **Renovar token automaticamente na montagem de `pages/admin.js` (`checkAuth` com fallback em `/api/auth/refresh`):** descartada porque manteria um operador logado por até 30 dias (duração do refresh token) mesmo após passar mais de 1 hora inativo.
- **Reduzir a validade do `refreshToken` para 1 hora no servidor:** descartada porque impediria a renovação silenciosa de sessões em uso contínuo além de 1 hora (que precisam de refresh válido quando há atividade real).

## Consequências

### Positivas

- Todas as 11 abas e subabas do `/admin` voltam automaticamente para a tela de login após 1 hora de inatividade ou diante de HTTP `401`, sem exibir erros crus nem estados inconsistentes.
- Múltiplas abas abertas em `/admin` compartilham atividade e logout via `localStorage`.
- Operadores ativos continuamente não sofrem desconexão abrupta ao completar 1 hora de trabalho.

### Negativas e riscos

- O encerramento proativo por inatividade depende de JavaScript rodando no cliente (como toda detecção de ociosidade em SPA); caso o navegador congele a aba sem retornar ao foco, a expiração ocorre no servidor pelo `maxAge` de 1 hora do JWT e é capturada pela guarda de `401` na primeira interação seguinte.

## Revisão

Reavaliar se o projeto adotar autenticação administrativa com sessões persistidas em servidor ou exigir tempo de inatividade configurável por ambiente/cargo.
