/**
 * Helpers compartilhados para endpoints da API.
 * Centraliza a resolução da origem do IP do cliente.
 *
 * ## Modelo de confiança
 *
 * `X-Forwarded-For` é controlado pelo cliente: qualquer requisição pode definir
 * todas as entradas do header. Cada proxy confiável no caminho ACESENTA uma
 * entrada à direita. Portanto a entrada confiável é a que está `hops` posições
 * da direita, nunca a primeira. Ler a primeira deixa o cliente escolher a
 * própria identidade, o que zera o rate limit — basta rotacionar o header a
 * cada requisição.
 *
 * A quantidade de proxies confiáveis vem de `TRUST_PROXY` (ver
 * `getTrustedProxyHops`). Ausente ou invalido significa zero: o header é
 * ignorado e vale o IP do socket, que o cliente não consegue falsificar.
 */

/**
 * Valor usado quando não há como determinar o IP do cliente.
 *
 * Só pode aparecer no pages router, que expõe o socket. No middleware do Next
 * ele é o valor normal quando `TRUST_PROXY` não está configurado — e por isso
 * NÃO deve ser usado como chave de rate limit ali: um valor constante vira um
 * bucket único que qualquer visitante pode exhausting.
 */
export const UNKNOWN_IP = 'unknown';

/**
 * IP do socket a partir de um `req` do pages router.
 * O middleware do Next não expõe o socket — ver `fromMiddlewareRequest`.
 */
export function fromNodeRequest(req) {
  return {
    socketIP: req?.socket?.remoteAddress ?? null,
    forwardedFor: req?.headers?.['x-forwarded-for'] ?? null,
  };
}

/**
 * IP do socket a partir de um `NextRequest` do middleware.
 *
 * O middleware não tem acesso a `req.socket`, então o socket é sempre `null`.
 * Sem um proxy confiável configurado, isso significa que não existe IP de
 * cliente confiável neste runtime — quem aplica o limite por IP precisa
 * saber disso e ter um caminho alternativo.
 */
export function fromMiddlewareRequest(request) {
  return {
    socketIP: null,
    forwardedFor: request?.headers?.get('x-forwarded-for') ?? null,
  };
}

/**
 * Quantidade de proxies confiáveis no caminho, lida de `TRUST_PROXY`.
 *
 * Aceita:
 * - ausente, `false`, `0` -> 0 (padrão: o header é ignorado)
 * - `true` -> 1 (o caso de um único proxy reverso, o mais comum)
 * - inteiro N > 0 -> N
 * - qualquer outro valor -> 0 (fail-closed)
 *
 * `true` NÃO significa "confiar em todas as entradas" como no Express: ali a
 * leitura é a mais à esquerda, justamente a que o cliente escreve. Aqui `true`
 * vale 1 porque a leitura é sempre pela direita.
 */
export function getTrustedProxyHops() {
  const raw = process.env.TRUST_PROXY;
  if (!raw) return 0;

  const value = String(raw).trim().toLowerCase();
  if (value === 'false' || value === '0') return 0;
  if (value === 'true') return 1;

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Normaliza endereços IP de socket para formato IPv4 padrão.
 *
 * Lida com variações comuns do Node.js:
 * - `::1` -> `127.0.0.1` (localhost IPv6)
 * - `::ffff:127.0.0.1` -> `127.0.0.1` (IPv4-mapped IPv6)
 * - `::ffff:192.168.x.x` -> `192.168.x.x` (IPv4-mapped IPv6)
 *
 * @param {string|null|undefined} ip - Endereço IP
 * @returns {string|null} IP normalizado ou null se ausente
 */
function normalizeIP(ip) {
  if (!ip) return null;
  const value = String(ip).trim();
  if (!value) return null;
  if (value === '::1') return '127.0.0.1';
  if (value.startsWith('::ffff:')) return value.slice('::ffff:'.length);
  return value;
}

/**
 * Quebra `X-Forwarded-For` na lista de entradas, da mais antiga (esquerda) para
 * a mais recente (direita).
 *
 * @param {string|string[]|null|undefined} forwardedFor - Valor bruto do header
 * @returns {string[]} Entradas não vazias
 */
function parseForwardedChain(forwardedFor) {
  if (!forwardedFor) return [];
  const raw = Array.isArray(forwardedFor) ? forwardedFor.join(',') : String(forwardedFor);
  return raw
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

/**
 * Resolve a origem do IP do cliente aplicando o modelo de confiança.
 *
 * @param {Object} source
 * @param {string|null} [source.socketIP] - IP do socket, se o runtime o expõe
 * @param {string|string[]|null} [source.forwardedFor] - Valor bruto do header
 * @param {Object} [options]
 * @param {number} [options.hops] - Sobrescreve `TRUST_PROXY`
 * @returns {Object} Detalhes da resolução
 * @returns {string} clientIP - IP confiável do cliente
 * @returns {string|null} socketIP - IP do socket normalizado
 * @returns {string|null} forwardedIP - Entrada do header que foi confiável
 * @returns {boolean} trustedProxy - Se a identidade veio do header
 * @returns {number} hops - Quantidade de proxies confiáveis configurada
 * @returns {boolean} untrustedForwarded - Há header divergente sem proxy confiável
 */
export function resolveClientIP(source = {}, options = {}) {
  const { socketIP: rawSocketIP = null, forwardedFor = null } = source ?? {};
  const hops = options.hops ?? getTrustedProxyHops();

  const socketIP = normalizeIP(rawSocketIP);
  const chain = parseForwardedChain(forwardedFor);

  // Só há entrada confiável se o header tiver proxies suficientes à direita.
  let forwardedIP = null;
  if (hops > 0 && chain.length >= hops) {
    forwardedIP = normalizeIP(chain[chain.length - hops]);
  }

  // Um header presente e divergente do socket, sem proxy confiável
  // configurado, quase sempre significa topologia não declarada.
  const lastForwarded = normalizeIP(chain[chain.length - 1] ?? null);
  const untrustedForwarded =
    hops === 0 && Boolean(lastForwarded) && Boolean(socketIP) && lastForwarded !== socketIP;

  return {
    clientIP: forwardedIP || socketIP || UNKNOWN_IP,
    socketIP,
    forwardedIP,
    trustedProxy: Boolean(forwardedIP),
    hops,
    untrustedForwarded,
  };
}

/**
 * Extrai o IP confiável do cliente de um `req` do pages router.
 *
 * Mantido como atalho sobre `resolveClientIP`. O parâmetro `trustProxy` foi
 * removido de proposito: a confiança deixou de ser uma escolha do call site e
 * passou a ser uma propriedade declarada da topologia (`TRUST_PROXY`), para
 * que nenhum endpoint possa confiar no header por acidente.
 *
 * @param {Object} req - Requisição do pages router
 * @param {Object} [options] - repassado a `resolveClientIP`
 * @returns {string} IP do cliente
 */
export function getClientIP(req, options = {}) {
  return resolveClientIP(fromNodeRequest(req), options).clientIP;
}
