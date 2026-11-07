/**
 * Espera assíncrona por um arquivo criado por processo filho.
 *
 * Usado nos testes dos runners do bench para sincronizar o envio de SIGINT com
 * o `opencode` falso já em execução, sem `sleep` fixo e sem corrida.
 */
import { existsSync } from 'node:fs';

export async function esperarArquivo(caminho, limiteMs = 10000) {
  const inicio = Date.now();
  while (!existsSync(caminho)) {
    if (Date.now() - inicio > limiteMs) throw new Error(`arquivo não apareceu: ${caminho}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
