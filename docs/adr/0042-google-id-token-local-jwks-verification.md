# ADR-0042: Validação local de ID tokens do Google via JWKS (`RS256`)

- **Status:** Aceito
- **Data:** 2026-11-19
- **Decisores:** Dono do projeto
- **Relacionados:** [ADR-0037](0037-internal-sales-mercadopago-and-customer-accounts.md), `lib/auth/google-id-token.js`, `pages/api/customer/auth.js`, `docs/ARQUITETURA_SITE_PUBLICO.md`

## Contexto

O fluxo de login de visitantes com **Sign in with Google** em `pages/api/customer/auth.js` validava o `id_token` recebido do Google Identity Services chamando `GET https://oauth2.googleapis.com/tokeninfo?id_token=...` a cada tentativa de autenticação. Embora funcional para desenvolvimento e baixo volume, essa abordagem apresentava restrições para escala em produção:

1. **Dependência de rede síncrona por login:** cada autenticação exigia um round-trip HTTP ao endpoint `/tokeninfo`, que o próprio Google documenta como voltado a depuração e sujeito a latência e limites de taxa (*rate limit*).
2. **Mapeamento incompleto de indisponibilidade:** apenas `TimeoutError` e `AbortError` devolviam `503`; falhas de rede (`TypeError` no `fetch`) ou respostas HTTP `5xx` do Google caíam no `catch` genérico devolvendo `401 Unauthorized`.

## Decisão

Vamos substituir a chamada por requisição ao `/tokeninfo` pela **verificação criptográfica local de ID tokens `RS256` via JWKS** no módulo `lib/auth/google-id-token.js`, consumido por `pages/api/customer/auth.js`, com zero novas dependências npm:

1. **Criptografia nativa + `jsonwebtoken`:** usar `node:crypto.createPublicKey({ key: jwk, format: 'jwk' })` (Node 24) e `jsonwebtoken` (já presente em `package.json` e `serverExternalPackages`) travado em `algorithms: ['RS256']`, rejeitando `alg: 'none'` e tentativas de *algorithm confusion* (`HS256`).
2. **Cache JWKS em memória com *single-flight* e rotação segura:** buscar `https://www.googleapis.com/oauth2/v3/certs` com `AbortSignal.timeout(8000)`, respeitar `Cache-Control: max-age` (ignorando `s-maxage`) dentro do intervalo `[5 min, 24 h]` (fallback `1 h`), usar expiração *lazy* sem `setInterval`, coalescer buscas simultâneas via *single-flight* (evitando fetch duplo em cache frio ou TTL expirado) e forçar 1 atualização quando surgir `kid` desconhecido, protegido por cooldown mínimo de `60 s` preservado mesmo após falha upstream.
3. **Validação fail-closed das claims e normalização de entrada:** exigir `GOOGLE_CLIENT_ID` (ou fallback `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, emitindo aviso sem expor valores quando divergirem) antes de consultar o JWKS; normalizar erros de decode malformado como `INVALID_GOOGLE_TOKEN`; validar `aud` escalar exato (ou array contendo o Client ID com `azp` correspondente), `iss` (`https://accounts.google.com` ou `accounts.google.com`), `exp` finito e não expirado, `email_verified`, e tipos estritamente `string` para `kid`, `sub`, `email` e `name`.
4. **Separação estrita entre credencial inválida (`401`), falha upstream (`503`) e erro interno de banco (`500`):** timeouts, aborts, `TypeError` de rede, HTTP não-OK do JWKS e payload JWKS inválido lançam `GOOGLE_UPSTREAM_UNAVAILABLE`, que `pages/api/customer/auth.js` traduz para HTTP `503`; apenas `verifyGoogleCredential` fica dentro desse `try/catch`, permitindo que erros em `upsertGoogleCustomer` propaguem como HTTP `500`.

## Alternativas consideradas

- **Manter `oauth2.googleapis.com/tokeninfo`:** descartada porque mantém um round-trip síncrono por login e depende de um endpoint não recomendado para carga de produção.
- **Instalar `google-auth-library`:** descartada pelo dono para evitar dezenas de dependências transitivas e superfície extra de manutenção/CVEs quando `node:crypto` + `jsonwebtoken` já atendem ao padrão OIDC `RS256` do Google.

## Consequências

### Positivas

- Verificação local instantânea após o aquecimento inicial do cache JWKS, sem round-trip por login e com suporte automático à rotação de chaves (`kid`).
- Zero novas dependências em `package.json` / `package-lock.json`.
- Separação clara entre erro de credencial do cliente (`401`) e indisponibilidade transitória do provedor Google (`503`).

### Negativas e riscos

- Em deploy com múltiplas instâncias, cada processo mantém seu próprio cache JWKS em memória (~1 requisição inicial + renovações conforme `max-age`).
- Se algum dia o Google anunciar novos algoritmos além de `RS256` para ID tokens do GSI, será necessário ampliar explicitamente a lista `algorithms` em `lib/auth/google-id-token.js`.

## Revisão

Reavaliar caso a plataforma passe a exigir validação multi-algoritmo além de `RS256` ou suporte a fluxos OAuth server-side com `code` / refresh tokens do Google (onde `google-auth-library` ou cache compartilhado em Redis passariam a agregar valor).

## Operação e Configuração (Runbook)

1. **Google Cloud Console:** criar credencial **ID do cliente OAuth 2.0** do tipo **Aplicativo da Web** (não há `client_secret` usado no fluxo GIS). Configurar **Origens JavaScript autorizadas** incluindo `http://localhost:3000` (desenvolvimento) e o domínio HTTPS de produção; nenhuma URI de redirecionamento é exigida no `ux_mode: 'popup'`. Manter a **Tela de permissão OAuth** publicada em produção (o status *Em teste* restringe o login a usuários de teste cadastrados).
2. **Variáveis de ambiente e rebuild:** definir `NEXT_PUBLIC_GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID` com o **mesmo** Client ID. Alterações em `NEXT_PUBLIC_GOOGLE_CLIENT_ID` são embutidas no bundle do cliente e exigem reiniciar `npm run dev` ou gerar novo build (`npm run build`). O script `npm run check-env` alerta divergências sem exibir os valores.
3. **Cabeçalhos de navegador (CSP, Referrer e COOP):** `pages/_document.js` define `<meta name="referrer" content="strict-origin-when-cross-origin" />` (alinhado ao header `Referrer-Policy` em `next.config.js`) e libera exclusivamente as origens do GIS (`https://accounts.google.com/gsi/client` em `script-src`, `https://accounts.google.com/gsi/style` em `style-src` e `https://accounts.google.com/gsi/` em `frame-src` e `connect-src`), enquanto `next.config.js` envia `Cross-Origin-Opener-Policy: same-origin-allow-popups` restrito à rota `/entrar` para permitir a comunicação com o popup sem relaxar as demais rotas.
4. **Vínculo de contas e atalho de desenvolvimento:** ao vincular uma conta existente pelo e-mail pela primeira vez, `upsertGoogleCustomer` (`lib/domain/customers.js`) anula `password_hash` para impedir pré-sequestro por cadastro local sem verificação de e-mail e rejeita troca de `google_id` com `GOOGLE_ACCOUNT_CONFLICT` (`HTTP 409`). O atalho sem `credential` em `pages/api/customer/auth.js` só funciona fora de produção **e** com `ALLOW_GOOGLE_DEV_BYPASS=true`.
