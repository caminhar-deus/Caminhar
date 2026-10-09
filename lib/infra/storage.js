import path from 'path';

/**
 * Resolução única dos diretórios de upload.
 *
 * A expressão `path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(),
 * 'uploads'))` era repetida em quatro handlers de `pages/api/`, em três formatos
 * diferentes (funções locais, expressão inlined, array inline). Centralizar aqui
 * remove a duplicação e dá um único lugar para o comentário que explica o
 * comportamento esperado do build.
 *
 * ## Por que o acesso é dinamicamente resolvido (e o aviso do build é esperado)
 *
 * `UPLOADS_DIR` é intencionalmente uma variável de ambiente: ela aponta para o
 * volume persistente no deploy com disco (ver `docs/DEPLOY_proxy_e_IP.md` §10).
 * O filesystem de serverless é efêmero — um redeploy apagaria uploads e backups —
 * o que elimina Vercel e qualquer execução serverless. `UPLOADS_DIR` é o que
 * mantém essa porta aberta.
 *
 * O Turbopack não consegue resolver `process.env.UPLOADS_DIR` em build time e por
 * isso emite "Dynamic filesystem access causes tracing of the whole project". O
 * aviso **não** indica defeito aqui: o `.nft.json` resultante não é consumido por
 * nada. O projeto não define `output: 'standalone'` e o deploy roda `next start`
 * com disco persistente, ou seja, o trace é gerado e nunca lido. Remover o aviso
 * exigiria remover `UPLOADS_DIR`, o que destruiria o suporte a volume persistente.
 *
 * NÃO "simplifique" esta expressão removendo a variável de ambiente.
 */

/**
 * Diretório raiz dos uploads (configurável para volumes persistentes).
 * @returns {string} Caminho absoluto.
 */
export function uploadsRoot() {
  // `turbopackIgnore`: `UPLOADS_DIR` é volume persistente escolhido em runtime e
  // não é resolvível em build time. A marcação declara que o acesso é
  // intencional — ver a explicação completa no topo deste arquivo.
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
}

/**
 * Diretório legado, mantido apenas como fallback de leitura.
 * @returns {string} Caminho absoluto.
 */
export function legacyUploadsRoot() {
  return path.join(process.cwd(), 'public', 'uploads');
}

/**
 * Diretórios de busca, na ordem de precedência: ativo primeiro, legado depois.
 * O primeiro diretório com candidato vence.
 * @returns {string[]} Caminhos absolutos.
 */
export function uploadRoots() {
  return [uploadsRoot(), legacyUploadsRoot()];
}
