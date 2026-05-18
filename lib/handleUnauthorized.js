/**
 * Lida com resposta 401 (não autorizado) de forma padronizada no cliente.
 * Exibe toast de sessão expirada e recarrega a página para redirecionar ao login.
 *
 * Este arquivo NÃO deve importar módulos de servidor (ex: pg, jwt, bcryptjs)
 * para evitar erros de build no Next.js/Turbopack ao ser importado por componentes cliente.
 *
 * @param {Object} router - Router do Next.js (useRouter())
 * @param {number} [delay=0] - Delay em ms antes do reload (útil para o toast aparecer)
 * @param {string} [message='Sessão expirada. Faça login novamente.'] - Mensagem do toast
 * @returns {Promise<never>} Nunca retorna (dispara reload e lança erro)
 * @throws {Error} Sempre lança 'Acesso não autorizado' para interromper o fluxo
 *
 * @example
 * if (res.status === 401) {
 *   return handleUnauthorized(router);
 * }
 */
export async function handleUnauthorized(router, delay = 0, message = 'Sessão expirada. Faça login novamente.') {
  const { default: toast } = await import('react-hot-toast');
  toast.error(message);
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  router.reload();
  // Aguarda indefinidamente para evitar continuação do fluxo (o reload interrompe a execução)
  await new Promise(() => {});
  throw new Error('Acesso não autorizado');
}