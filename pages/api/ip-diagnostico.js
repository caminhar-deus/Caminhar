import { createAdminHandler } from '../../lib/api/adminCrudHandler.js';
import {
  fromNodeRequest,
  getTrustedProxyHops,
  resolveClientIP,
} from '../../lib/api/helpers.js';

/**
 * Diagnóstico de topologia (admin-only, GET).
 *
 * Reporta FATOS sobre como a requisição chegou (socket, cadeia crua,
 * hops efetivos, IP resolvido) e INCOERÊNCIAS verificáveis, para o
 * operador decidir o `TRUST_PROXY` com evidência.
 *
 * O que esta rota NÃO faz: sugerir um número de hops. O comprimento da
 * cadeia é controlável pelo cliente (ele escreve as entradas à esquerda),
 * então não é medida de quantos proxies existem. Hops é fato do deploy.
 */

/** Loopback após normalização (::1 e ::ffff:127.x já colapsam para 127.x). */
function isLoopback(ip) {
  return Boolean(ip) && (ip.startsWith('127.') || ip === '::1' || ip === 'localhost');
}

/** Faixas RFC1918 comuns de proxy na mesma rede. */
function isPrivate(ip) {
  if (!ip) return false;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

/** Quebra o header na ordem em que chegou (esquerda = mais antiga). */
function parseChain(forwardedFor) {
  if (!forwardedFor) return [];
  const raw = Array.isArray(forwardedFor) ? forwardedFor.join(',') : String(forwardedFor);
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

/** "1 entrada" / "2 entradas" sem sujeira na frase. */
function entradas(n) {
  return `${n} ${n === 1 ? 'entrada' : 'entradas'}`;
}

function montarOrientacao(fatos, sinais) {
  const p = [];

  p.push(
    'Cada sinal traz ok (true = sem achado nesta checagem; false = exige decisão ou ' +
    'verificação) e o texto do que fazer. O número de hops é um fato do deploy, não é ' +
    'dedutível de uma requisição: o cliente escreve as entradas à esquerda da cadeia, ' +
    'por isso o comprimento dela não serve para calibrar TRUST_PROXY.',
  );

  if (fatos.hopsConfigured === 0) {
    p.push(
      'TRUST_PROXY está em 0: o X-Forwarded-For está sendo ignorado e a identidade vem do ' +
      'socket (fail-closed). Essa é a posição correta enquanto a topologia de produção não ' +
      'estiver definida.',
    );
    if (!sinais.rateLimitColapsaNoSocket.ok) {
      p.push(
        'Problema a resolver: o socket é loopback/privado, ou seja, quem conecta é um proxy ' +
        'e não o cliente final. Com TRUST_PROXY=0 o rate limit por IP fica keyed no IP do ' +
        'proxy e todos os usuários compartilham o mesmo bucket — é o que derrubaria o limite ' +
        'de login. Decida o valor real de TRUST_PROXY assim que a topologia estiver definida.',
      );
    } else if (!sinais.headerNaoConfiavelIgnorado.ok) {
      p.push(
        'Há X-Forwarded-For divergente do socket sendo descartado. Pode ser um proxy não ' +
        'declarado (topologia a configurar) ou um cliente mandando header por conta própria ' +
        '(manter 0 é o correto). A resposta sozinha não distingue os dois casos: confirme na ' +
        'máquina do proxy quem escreve esse header.',
      );
    } else {
      p.push(
        'Sem sinal de proxy: acesso direto à aplicação. Se a produção for mesmo direta, ' +
        'mantenha TRUST_PROXY=0 e não há nada a configurar.',
      );
    }
  } else {
    p.push(
      `TRUST_PROXY está em ${fatos.hopsConfigured}: a identidade ${fatos.identityFromHeader ? 'veio' : 'NÃO veio'} ` +
      'da cadeia. Cuidado com super-confiança: hops maiores que os reais fazem a aplicação ' +
      'aceitar como confiável uma entrada escrita pelo cliente, e aí o cliente escolhe a ' +
      'própria identidade e o rate limit vira decorativo.',
    );
    if (!sinais.cadeiaConsistente.ok) {
      p.push(
        'A cadeia está mais curta que os hops declarados: ou o proxy não está repassando o ' +
        'header (use proxy_set_header X-Forwarded-For $remote_addr;) ou a chamada não passou ' +
        'por tantos proxies. Nesse caso a identidade volta a ser o socket.',
      );
    }
  }

  p.push(
    'Chamada conclusiva: faça a chamada de um shell fora do host, sem enviar nenhum ' +
    'X-Forwarded-For próprio, para que a cadeia observada seja só a que o proxy produziu. ' +
    'Exemplo: curl -sS -H "Authorization: Bearer <token-admin>" ' +
    'https://SEU-HOST/api/ip-diagnostico | jq .fatos ; repita de dentro da rede e compare ' +
    'as duas saídas antes de gravar TRUST_PROXY.',
  );

  return p.join('\n');
}

async function handleGet(req, res) {
  const source = fromNodeRequest(req);
  const hopsConfigured = getTrustedProxyHops();
  const resolved = resolveClientIP(source, { hops: hopsConfigured });
  const forwardedChain = parseChain(source.forwardedFor);
  const chainLength = forwardedChain.length;

  const socketEhLoopback = isLoopback(resolved.socketIP);
  const socketNaoLoopback = Boolean(resolved.socketIP) && !socketEhLoopback;
  const socketEhProxy = socketEhLoopback || isPrivate(resolved.socketIP);
  const proxyPresente = chainLength > 0 || socketNaoLoopback;

  const fatos = {
    socketIP: resolved.socketIP,
    socketIPRaw: req.socket?.remoteAddress ?? null,
    forwardedForRaw: source.forwardedFor ?? null,
    forwardedChain,
    chainLength,
    hopsConfigured,
    clientIPResolvido: resolved.clientIP,
    identityFromHeader: resolved.trustedProxy,
    untrustedForwarded: resolved.untrustedForwarded,
    userAgent: req.headers?.['user-agent'] ?? null,
  };

  const sinais = {
    // Vermelho só quando a evidência de proxy não está refletida em hops.
    proxyPresente: {
      ok: !proxyPresente || hopsConfigured > 0 || !socketEhProxy,
      texto: !proxyPresente
        ? 'Sem X-Forwarded-For e socket local: provavelmente não há proxy.'
        : hopsConfigured > 0
          ? `Há indício de proxy na frente (${entradas(chainLength)} na cadeia) e TRUST_PROXY está declarado: confirme se o número de hops bate com a topologia real.`
          : socketEhProxy
            ? 'Há indício de proxy local (socket loopback/privado) com TRUST_PROXY=0: a identidade de todos os clientes é a do proxy.'
            : 'Socket público e sem hops declarados: pode ser o IP direto do cliente ou um proxy/LB público. Sozinho não conclusivo.',
    },
    socketEhProxy: {
      ok: !socketEhProxy || hopsConfigured > 0,
      texto: socketEhProxy
        ? hopsConfigured > 0
          ? 'O socket é loopback/privado (quem conecta é um proxy) e TRUST_PROXY está declarado.'
          : 'O socket é loopback/privado: quem conecta é um proxy ou a própria aplicação, não o cliente. Com TRUST_PROXY=0 o rate limit por IP usa o IP do proxy.'
        : 'O socket é público: pode ser o IP real do cliente ou um proxy/LB público. Sozinho não conclusivo.',
    },
    cadeiaConsistente: {
      ok: chainLength >= hopsConfigured,
      texto:
        chainLength === 0 && hopsConfigured === 0
          ? 'Sem X-Forwarded-For e TRUST_PROXY=0: nada a ler no header, a identidade vem do socket.'
          : chainLength >= hopsConfigured
            ? `Cadeia com ${entradas(chainLength)} e TRUST_PROXY=${hopsConfigured}: a leitura pela direita encontra uma entrada.`
            : `Cadeia com ${entradas(chainLength)} e TRUST_PROXY=${hopsConfigured}: faltam ${hopsConfigured - chainLength} para os hops declarados — o proxy não repassa X-Forwarded-For (proxy_set_header X-Forwarded-For $remote_addr;) ou a chamada não passou por tantos proxies.`,
    },
    headerNaoConfiavelIgnorado: {
      ok: !resolved.untrustedForwarded,
      texto: resolved.untrustedForwarded
        ? 'Há X-Forwarded-For divergente do socket e TRUST_PROXY=0: o header está sendo descartado (fail-closed). Correto enquanto a topologia não for decidida; se houver proxy real, declare TRUST_PROXY.'
        : resolved.trustedProxy
          ? 'O header está sendo lido (TRUST_PROXY declarado): a identidade vem da cadeia, que o cliente pode influenciar à esquerda.'
          : 'Nada está sendo descartado: não há X-Forwarded-For divergente do socket.',
    },
    rateLimitColapsaNoSocket: {
      ok: !(hopsConfigured === 0 && socketEhProxy),
      texto:
        hopsConfigured === 0 && socketEhProxy
          ? 'TRUST_PROXY=0 com socket loopback/privado: o rate limit por IP é keyed no IP do proxy e todos os clientes compartilham o mesmo bucket (o limite de login cedo derruba o login de todos). Sintoma principal de sub-configuração.'
          : 'Sem colapso: ou há hops declarados ou o socket não é de proxy local, então os buckets por IP não são compartilhados.',
    },
  };

  return res.status(200).json({
    fatos,
    sinais,
    orientacao: montarOrientacao(fatos, sinais),
    timestamp: new Date().toISOString(),
  });
}

export default createAdminHandler({
  name: 'Diagnóstico de IP',
  requireAdmin: true,
  allowedMethods: ['GET'],
  handlers: { GET: handleGet },
  rateLimit: { max: 10, window: 60000 },
});
