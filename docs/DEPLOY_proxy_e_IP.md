# Deploy: proxy reverso, `X-Forwarded-For` e `TRUST_PROXY`

> Topologia de produção do Caminhar. Define como o IP do cliente é resolvido
> para rate limit, log de auditoria e registros de segurança.
>
> Código de referência: `lib/api/helpers.js` (`getTrustedProxyHops`,
> `resolveClientIP`, `getClientIP`), `proxy.js` (middleware) e
> `pages/api/ip-diagnostico.js` (rota de diagnóstico, admin-only).

## 0. Estado atual: topologia de produção indefinida

A topologia de produção **ainda não foi definida**. Enquanto isso:

- `TRUST_PROXY` fica em **`0`** (ausente, `false` ou `0`): fail-closed — o
  `X-Forwarded-For` é ignorado e a identidade vem do socket.
- Justificativa: sem saber quantos proxies existem, confiar no header seria
  assumir que o cliente não pode forjar — e ele pode. Errar para **0** custa o
  rate limit por IP colapsar no bucket do proxy (§5); errar para **cima** custa
  a proteção inteira (§6.3). Só o segundo anula o brute force.
- O número correto de hops **não é dedutível de uma requisição**: o cliente
  escreve as entradas à esquerda da cadeia, então o comprimento dela é dado
  controlável pelo cliente e não serve para calibrar `TRUST_PROXY`.
- A decisão é tomada com evidência, pelo procedimento da §6.

## 1. O que é `TRUST_PROXY`

`TRUST_PROXY` é uma **variável de ambiente** que declara quantos proxies
confiáveis existem à frente da aplicação. Ela é a única fonte de confiança em
`X-Forwarded-For`: sem ela, o header é ignorado.

| Valor | Hops | Efeito |
|---|---|---|
| ausente (default) | 0 | `X-Forwarded-For` **ignorado**; vale o IP do socket |
| `false` ou `0` | 0 | igual ao default |
| `true` | 1 | lê a última entrada do header (1 proxy reverso) |
| inteiro `N` > 0 (`2`, `3`, ...) | N | lê a N-ésima entrada contando da direita |
| lixo (`banana`, `-1`) | 0 | fail-closed: ignora o header |

Leitura em `getTrustedProxyHops()` (`lib/api/helpers.js`).

**Default seguro:** sem a variável, o header nunca muda a identidade do
cliente. O preço é não haver IP real atrás de proxy — ver §5 e §6.

## 2. Por que a leitura é sempre pela direita

`X-Forwarded-For` é controlado pelo cliente no primeiro salto: ele pode escrever
qualquer coisa. Cada proxy confiável no caminho **acrescenta** uma entrada à
**direita**. Então, com `TRUST_PROXY=N`, a entrada confiável é a que está `N`
posições contando da direita — nunca a primeira.

```
cliente envia:            X-Forwarded-For: 1.2.3.4
proxy (nginx) acrescenta:  X-Forwarded-For: 1.2.3.4, 203.0.113.10
                                                              ^── lido com TRUST_PROXY=1
```

Ler da esquerda (`split(',')[0]`) deixa o cliente escolher a própria
identidade: bastaria rotacionar o header a cada requisição para ganhar um bucket
novo de rate limit e zerar a proteção contra brute force.

## 3. Configuração exigida do proxy reverso (o ponto que mais quebra deploy)

O proxy **DEVE sobrescrever** o header, e não acrescentar:

```nginx
# CORRETO — uma entrada só, escrita pelo proxy
proxy_set_header X-Forwarded-For $remote_addr;
```

```nginx
# ERRADO para o único proxy da frente: acrescenta $remote_addr ao que o
# cliente já mandou, então a cadeia tem entradas forjadas e a contagem de
# hops não bate com TRUST_PROXY
proxy_add_x_forwarded_for;
```

Se o proxy acumular entradas em vez de sobrescrever, o tamanho da cadeia deixa
de refletir o número de hops declarados: as entradas forjadas pelo cliente
permanecem ao lado das escritas pelo proxy, e qualquer salto não contado desloca
a leitura para uma entrada que o cliente escreveu. Se acumular for intencional
(há um CDN na frente), declare o total de hops em `TRUST_PROXY` (§4).

Confirme também que o proxy **não** repassa `X-Forwarded-For` vindo de outro
lado (CDN, balanceador) sem você contar esse salto em `TRUST_PROXY`.

## 4. Exemplos de `nginx.conf`

### 4.1 Um único hop (nginx direto na frente da aplicação)

```nginx
server {
  listen 443 ssl;
  server_name caminhar.exemplo.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;

    # Sobrescreve: o app vê exatamente 1 entrada confiável
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
TRUST_PROXY=1   # ou TRUST_PROXY=true
```

### 4.2 Dois hops (CDN + nginx local)

```
cliente → CDN (Cloudflare, Fastly, ...) → nginx local → aplicação
```

Cada salto acrescenta uma entrada:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # CDN + nginx
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Aqui `proxy_add_x_forwarded_for` é correto porque **ele é o segundo hop**: a
entrada da direita é o IP do CDN visto pelo nginx, e a do meio é o IP real do
cliente, escrito pelo CDN. Com `TRUST_PROXY=2` a leitura cai no IP real.

```bash
TRUST_PROXY=2
```

### 4.3 Cloudflare

Com o tráfego passando pela Cloudflare e depois pelo nginx local são 2 hops:

```bash
TRUST_PROXY=2
```

Se o origin aceitar tráfego **direto** da Cloudflare sem nginx intermediário
(ex.: tunnel), vira 1 hop: `TRUST_PROXY=1`.

Ajuste de caso comum: regra de firewall da Cloudflare restringindo o origin às
faixas oficiais não substitui o `TRUST_PROXY` — são proteções diferentes.

## 5. Sintomas de configuração errada

| Sintoma | Causa provável |
|---|---|
| Log `X-Forwarded-For divergente do socket sem TRUST_PROXY \| socket=... \| forwarded=...` (`pages/api/auth/login.js`) | Há header, mas `TRUST_PROXY` está ausente/0 — a topologia não foi declarada |
| Log `X-Forwarded-For divergente do socket sem TRUST_PROXY configurado (hops=0)` (`proxy.js`) | idem, no middleware |
| Log `Rate limit de /api/auth/login não aplicado: sem IP confiável no middleware (TRUST_PROXY=não configurado). Defina TRUST_PROXY para o limite valer aqui.` | Middleware não tem socket; sem hops declarados não existe IP de cliente ali |
| Rate limit por IP "anda" atrás do proxy (todo mundo no mesmo bucket) | `TRUST_PROXY` ausente e o app atrás de proxy: só o socket do proxy é visível |
| Logs de auditoria com o IP do proxy em vez do do cliente | `TRUST_PROXY` menor que o número real de hops |

Diagnóstico rápido: mande uma requisição com `X-Forwarded-For` diferente do
socket e veja se aparece o aviso de divergência. Aparecendo, o header está
sendo ignorado; não aparecendo com hops > 0, conte as entradas reais da cadeia.

Diagnóstico estruturado (fatos, sinais e orientação em JSON): a rota
`/api/ip-diagnostico`, admin-only e GET — ver procedimento na §6.

## 6. Procedimento para decidir a topologia

A decisão não é dedutível de uma requisição: o cliente escreve as entradas à
esquerda da cadeia, então `chainLength` é dado controlável pelo cliente. O que
dá para coletar são **fatos** — e é isso que `/api/ip-diagnostico` reporta
(`pages/api/ip-diagnostico.js`, admin-only, GET, sem efeito colateral).

### 6.1 Passos

1. Subir a aplicação com `TRUST_PROXY=0` (default, fail-closed) e o proxy já
   configurado (§3).
2. Chamar a rota como admin **de um shell fora do host, sem enviar nenhum
   `X-Forwarded-For` próprio**, para que a cadeia observada seja só a que o
   proxy produziu:

   ```bash
   curl -sS -H "Authorization: Bearer $TOKEN" \
     https://SEU-HOST/api/ip-diagnostico | jq
   ```

3. Repetir de dentro da rede (e pela rede pública, se houver CDN) e comparar
   `fatos.socketIP`, `fatos.forwardedChain` e `fatos.identityFromHeader` nas
   duas saídas.
4. Ler `sinais` e aplicar a tabela §6.2.
5. Gravar o valor decidido em `TRUST_PROXY`, reiniciar e chamar de novo:
   `fatos.identityFromHeader` deve ser `true` e
   `sinais.cadeiaConsistente.ok` deve ser `true`.

O número de hops sai do **inventário do caminho** (quantos proxies existem
entre a internet e a aplicação, conferidos no CDN/nginx), nunca do comprimento
da cadeia reportada.

### 6.2 Tabela `sinal observado → TRUST_PROXY correto`

| Sinal observado | Leitura | `TRUST_PROXY` |
|---|---|---|
| `sinais.rateLimitColapsaNoSocket.ok = false` (socket loopback/privado com hops 0) | Há proxy local e ele não está declarado: todos os clientes compartilham o bucket do proxy | O número real de saltos (`1` para nginx único; `2` para CDN + nginx) |
| `sinais.headerNaoConfiavelIgnorado.ok = false` + socket loopback/privado | O XFF chega e é descartado: proxy existente não declarado | O número real de saltos |
| `sinais.headerNaoConfiavelIgnorado.ok = false` + socket público, sem proxy no caminho | Cliente forjando header por conta própria | Mantenha `0` |
| `fatos.socketIP` público e `fatos.chainLength = 0` | Acesso direto à aplicação, sem proxy | Mantenha `0` |
| `sinais.cadeiaConsistente.ok = false` com hops > 0 | O proxy não repassa `X-Forwarded-For` (§3) ou os hops declarados maiores que os reais | Corrija o proxy ou reduza para o nº real de saltos |
| `fatos.identityFromHeader = true` e o IP resolvido bate com o que o proxy vê do cliente | Topologia coerente | Mantenha o valor atual |

### 6.3 Risco de super-confiança

`TRUST_PROXY` **acima** do número real de hops faz a aplicação aceitar como
confiável uma entrada escrita pelo cliente: o cliente escolhe a própria
identidade (rotaciona o header a cada requisição e ganha bucket novo de rate
limit) e o rate limit por IP vira decorativo — a proteção contra brute force
some sem nenhum aviso no log. Por isso o default é `0` e o valor só sobe
depois do inventário do caminho.

## 7. O que NÃO fazer

- **Não** defina `TRUST_PROXY=true` achando que isso confia em "todas as
  entradas" como no Express (`trust proxy: true`). Aqui `true` vale **1 hop** e
  a leitura é pela direita; confiar em toda a cadeia significaria confiar no que
  o cliente escreveu.
- **Não** conte com o middleware (`proxy.js`) como rate limit por IP do login.
  Ele roda no runtime do middleware, **sem socket**: sem `TRUST_PROXY` ele não
  tem IP confiável e pula o limite de propósito (para não criar um bucket global
  único). O backstop real é `pages/api/auth/login.js`, que tem socket e divide
  a mesma chave `api:auth:login` com o middleware (sem contagem em dobro).
- **Não** use `proxy_add_x_forwarded_for` no único proxy da frente (§3).
- **Não** registre `127.0.0.1` como IP de cliente por fallback: esse valor está
  na whitelist permanente do rate limit e desligaria a proteção silenciosamente.
  O fallback honesto é `unknown`, que é pulado como chave de rate limit.
- **Não** transforme o valor `unknown` em chave de rate limit no middleware: um
  valor constante vira um bucket único que qualquer visitante esgota e derruba o
  login de todos.

## 8. Checklist de deploy

1. `TRUST_PROXY` definido no ambiente, com o valor igual ao número real de hops
   (enquanto a topologia estiver indefinida, o valor é `0` — §0).
2. Proxy com `proxy_set_header X-Forwarded-For ...` coerente com esse valor.
3. Teste manual de login em excesso → resposta **429**.
4. Sem aviso de `X-Forwarded-For divergente` nem de `Rate limit ... não aplicado`
   nos logs após o deploy.
