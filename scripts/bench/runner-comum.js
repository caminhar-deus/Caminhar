/**
 * Utilidades comuns aos runners de bench (`orchestrator/rodar.js` e `papeis/rodar.js`).
 *
 * Só entra aqui o que é idêntico nos dois e não depende do modo de execução:
 * stdin fechado, representação curta dos argumentos e classificação de saídas
 * já existentes. O planejamento de jobs fica em cada runner porque o do
 * orchestrator tem turno/sessão e o de papéis tem agente/tarefa.
 */
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

/**
 * `stdio[0] = 'ignore'` não é detalhe: com 'pipe' o filho herda um stdin que
 * ninguém escreve nem fecha, e o `opencode run` trava lendo stdin antes de abrir
 * a sessão (medido em 19/10/2026: zero bytes, nenhum processo, nenhum erro).
 */
export const STDIO = ['ignore', 'pipe', 'pipe'];

/** Representação curta dos argumentos (meta e dry-run) sem despejar o prompt inteiro. */
export function resumirArgs(args) {
  return args.map((a) => (a.length > 40 ? `<prompt ${a.length} chars>` : a)).join(' ');
}

/** Marca o que já existe (pulado, como antes) sem tocar no disco. */
export async function classificarExistencia(jobs, sobrescrever) {
  for (const job of jobs) {
    job.existe = await access(job.arqSaida, constants.F_OK).then(() => true, () => false);
    job.pular = job.existe && !sobrescrever;
  }
}
