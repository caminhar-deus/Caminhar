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

**Os dois erros não custam o mesmo.** Vale a assimetria ao escolher o valor:

| Erro | Efeito | Como aparece |
|---|---|---|
| `TRUST_PROXY` **abaixo** do real | Rate limit por IP colapsa (todos os clientes no bucket do proxy) | **Visível**: sintoma de §5 e sinais da §6.2 |
| `TRUST_PROXY` **acima** do real | Cliente escolhe a própria identidade; rate limit decorativo | **Silencioso**: nenhum aviso em log (§6.3) |

Na dúvida, configure para menos. O código também degrada nessa direção: quando a
cadeia tem menos entradas que os hops declarados, `resolveClientIP` volta para o
IP do socket (`chainLength >= hops` é a condição de leitura do header em
`lib/api/helpers.js`). Ou seja, sub-declarar nunca abre brecha — só degrada.

Material de apoio para a decisão: §9 (comportamento do XFF por plataforma),
§10 (restrição de disco), §11 (recomendação) e §12 (confiabilidade das fontes).

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

### 2.1 Caso completo: 2 hops com tentativa de forja

Caminho `cliente → CDN → nginx → aplicação`, com o cliente tentando escolher a
própria identidade:

```
atacante envia:              1.2.3.4
CDN acrescenta à direita:    1.2.3.4, <ip-real-do-atacante>
nginx acrescenta à direita:  1.2.3.4, <ip-real-do-atacante>, <ip-da-CDN>

app recebe:  socket = <ip-do-nginx>
             XFF    = 1.2.3.4 , <ip-real> , <ip-da-CDN>
                       forjado   Trusted=2     descartado
```

Os quatro valores possíveis, e o que cada um produz:

| `TRUST_PROXY` | Entrada lida | Resultado |
|---|---|---|
| `0` | — (usa o socket) | Rate limit no bucket do nginx: todos no mesmo |
| `1` | `<ip-da-CDN>` | Idem: rate limit colapsa |
| **`2`** | `<ip-real>` | **Correto** |
| `3` | `1.2.3.4` | **Falha grave**: o atacante escolhe a identidade |

O lado direito é o único que o cliente não alcança — por isso a contagem é a
âncora, e não a posição fixa na lista.

## 3. Configuração exigida do proxy reverso (o ponto que mais quebra deploy)

O proxy **DEVE sobrescrever** o header:

```nginx
# RECOMENDADO — uma entrada só, escrita pelo proxy
proxy_set_header X-Forwarded-For $remote_addr;
```

Isso torna o tamanho da cadeia **estruturalmente igual ao número de hops**,
independente do que o cliente tenha mandado. O header do cliente é descartado,
logo não existe superfície de forja para calibrar.

```nginx
# ACEITÁVEL, com contagem exata — exige disciplina
proxy_add_x_forwarded_for;   # equivale a proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for
```

**Precisão importante:** acrescentar não é "errado" por si só. Com a contagem
certa, `proxy_add_x_forwarded_for` funciona — verificado com `TRUST_PROXY=1` e
cabeça `1.2.3.4, 203.0.113.9`: a leitura pega `203.0.113.9`, que é a entrada que
o proxy escreveu. O perigo é outro e é mais sutil: ao acrescentar, a resposta passa
a depender **exatamente** da contagem. Com `TRUST_PROXY=2` na mesma situação, a
leitura cai em `1.2.3.4` — a entrada que o cliente forjou.

Ou seja, no modo append a segurança depende de acertar a contagem exatamente:
um a mais, e a leitura extrai um valor forjado. Por isso a recomendação é
sobrescrever — o append fica correto até o dia em que alguém acrescenta um CDN e
esquece de subir o `TRUST_PROXY`, e essa falha não gera log.

Se acumular for intencional (há um CDN na frente), declare o total de hops em
`TRUST_PROXY` (§4) — é obrigatório, não opcional.

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

A Cloudflare **preserva** o XFF do cliente e acrescenta à direita o endereço de
quem conectou nela. Por isso o `TRUST_PROXY=2` continua correto: a entrada do
meio é a que a Cloudflare escreveu. Se o nginx precisar do IP real para outras
coisas (log, `real_ip_module`), aponte para `CF-Connecting-IP`, que a Cloudflare
sempre preenche:

```nginx
set_real_ip_from 173.245.48.0/20;    # faixas oficiais da Cloudflare
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 141.101.64.0/18;
real_ip_header CF-Connecting-IP;
```

Cuidado com `real_ip_recursive on` combinado com `proxy_add_x_forwarded_for`: os
dois manipulam a mesma lista e a ordem de execução decide o resultado. Se usar o
módulo `real_ip`, não reacrescente o header em `proxy_set_header` — deixe um dos
dois responder pelo IP.

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
- **Não** use `proxy_add_x_forwarded_for` no único proxy da frente sem saber
  exatamente quantos hops declarar — ele funciona, mas a leitura passa a depender
  da contagem, e um CDN acrescentado depois sem atualizar `TRUST_PROXY` passa
  a ler entrada forjada sem gerar log (§3).
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

## 9. Comportamento do XFF por plataforma

Como cada plataforma reescreve o header é o dado que define o `TRUST_PROXY`. Só a
coluna **sobrescreve ou acrescenta** e o número de hops entram na conta; o resto
é consequência da §2.

| Plataforma | Modo | Cabeçalho preferido | `TRUST_PROXY` | Observação |
|---|---|---|---|---|
| **Nginx / Caddy próprio** | Sobrescreve (se configurado assim) | `X-Forwarded-For` | `1` | Recomendado — §3 e §11 |
| **Vercel** | Sobrescreve | interno da plataforma | `0` | Descarta o XFF do cliente; não há hop a contar |
| **Railway** | Acrescenta à direita | `X-Forwarded-For` | `1` | Preserva entrada falsificada à esquerda — seguro só pela leitura pela direita |
| **Render** | Acrescenta à direita | `X-Forwarded-For` | `1` | O IP real fica à direita |
| **Heroku** | Acrescenta à direita | `X-Forwarded-For` | `1` | O router garante que o originator é o último item |
| **Fly.io** | Acrescenta / header dedicado | `Fly-Client-IP` | `1` | Header dedicado é mais robusto que XFF |
| **AWS ALB** | Acrescenta (padrão) ou preserva/remove | `X-Forwarded-For` | `1` | Configurável — confirme o modo |
| **Cloudflare** | Acrescenta, **preservando** o do cliente | `CF-Connecting-IP` | `2` com nginx atrás | Nunca confie no XFF cru; §4.3 |

Duas leituras que importam:

- **Plataformas que acrescentam preservam a entrada falsificada do cliente.** Isso
  não é uma falha delas nem nossa: é exatamente o caso que a leitura pela direita
  resolve. Com `TRUST_PROXY` correto, a entrada forjada é ignorada.
- **Plataformas que sobrescrevem (Vercel) dispensam `TRUST_PROXY`**, porque não há
  entrada do cliente a confundir. Não configure hops que não existem.

O número de proxies internos de uma plataforma gerenciada **não é contrato
estável** e pode mudar sem aviso. Se escolher uma delas, registre `TRUST_PROXY`
como configuração de deploy versionada — não como valor fixo esquecido no
`.env`, e confira com a §6 depois de cada atualização da plataforma.

## 10. Restrição de disco: o que elimina serverless

Antes de escolher a plataforma, há uma restrição do próprio código que vale mais
que qualquer comparação de suporte a `next start`. O Caminhar grava em disco:

| Local | O quê |
|---|---|
| `scripts/backup.js:21` | `BACKUP_DIR = path.join(process.cwd(), 'data', 'backups')` |
| `scripts/backup.js:27` | Backup diário às 02:00 (cron) |
| `scripts/backup.js:104` | `fs.createWriteStream(outputPath)` |
| `scripts/maintenance/backup-posts.js:34,42` | `mkdirSync` + `writeFileSync` de dump |
| `pages/api/upload-image.js:43` | `fs.mkdirSync(uploadDir)` — upload de imagem |

Filesystem de serverless é **efêmero**: um redeploy apaga uploads e o histórico de
backups. Isso elimina Vercel e qualquer execução serverless, independentemente de
o `next start` ser suportado.

Restam, com disco persistente: VPS próprio com nginx, ou Railway / Render / Fly.io
/ Heroku **com volume persistente**. Todos rodam `next start` com Node persistente.

O `next.config.js` não define `output: standalone`, o que é irrelevante aqui: a
decisão é de disco, não de build.

## 11. Recomendação

**VPS com nginx sobrescrevendo, `TRUST_PROXY=1`.** Três razões:

1. **Cadeia com uma entrada, sempre.** Sobrescrever torna o número de hops igual
   ao tamanho da cadeia por construção, então o valor de `TRUST_PROXY` não depende
   de contagem manual.
2. **O header do cliente é descartado no proxy.** Não existe superfície de forja a
   calibrar — o problema da §2.1 simplesmente não se materializa.
3. **A VPS já é o que o projeto exige** por causa da §10. Não é um passo extra.

A principal vantagem sobre as alternativas é o **modo de falha**: com
sobrescrita, um `TRUST_PROXY` superestimado esbarra em `chainLength >= hops`
falso e o código volta para o socket — degrada em vez de abrir brecha (§0).
Com append (§3), o mesmo erro de contagem lê a entrada forjada.

Plataforma gerenciada é a segunda opção, desde que você versione o
`TRUST_PROXY` como parte da configuração de deploy e reconfirme pela §6 quando a
plataforma mudar.

> Esta seção é uma recomendação, **não uma decisão**. Enquanto a topologia
> continuar indefinida (§0), o valor em produção permanece `0`.

## 12. Confiabilidade das fontes

Os dados da §9 vieram de pesquisa em documentação de cada plataforma e do nginx.
Parte do material é documentação oficial; parte vem de fórum, Reddit e Q&A de
comunidade. A separação:

| Confiança | Onde se aplica |
|---|---|
| **Alta** — verifiquei no código do projeto | `next dev`/build injeta XFF por `??=` (`base-server.js`), normalização `::ffff:`, degradação `chainLength >= hops` (§0, §2, §3) |
| **Alta** — comportamento padrão documentado | nginx sobrescreve vs. acrescenta (§3); Cloudflare preserva o XFF do cliente (§9) |
| **Média** — documentação oficial, sujeito a mudança | número de proxies internos por plataforma gerenciada (§9) |
| **Baixa** — fórum/Reddit/Stack Overflow | afirmação de que Vercel não suporta `next start`; **não usada** na §10, cuja conclusão vem do disco |

Nenhuma decisão da §11 depende da linha de confiança baixa. Se em algum momento
uma delas for necessária, confirme na documentação oficial da plataforma antes de
gravar o valor em `TRUST_PROXY`.
