/**
 * Funções puras da conferência do bench do orchestrator (Camada A).
 *
 * Separadas do CLI (`conferir.js`) pelo mesmo motivo de `model-catalog.js`:
 * `conferir.js` usa `import.meta`, que o Jest/Babel-CJS não transpila, então o
 * que precisa de teste vive aqui — sem I/O, sem `import.meta` e sem ler disco.
 */

/**
 * Turno da execução pelo nome do arquivo.
 *
 * O `.t2.ndjson` é o turno de reconciliação: ele existe justamente para o modelo
 * fechar a resposta com o que já delegou. Tratar o silêncio dele como "não
 * orquestrou" gerou 11 de 13 falsos negativos na conferência de 11–13/11/2026.
 */
export function turnoDaExecucao(nomeArquivo) {
  return /\.t2\.ndjson$/.test(nomeArquivo) ? 2 : 1;
}

/** Rótulo da coluna "delegou". No turno 2 a expectativa é não delegar. */
export function rotuloDelegacao(turno, quantidade) {
  if (turno === 2) return quantidade > 0 ? `n/a — t2 (${quantidade})` : 'n/a (turno 2)';
  return quantidade > 0 ? `sim (${quantidade})` : '**não**';
}

/**
 * Marca de execução cortada, lida do `.meta.json` gravado pelo runner.
 *
 * Sem isso a conferência atribuía toda resposta final vazia a "delegação em
 * background encerrou o turno" — mas as duas execuções vazias de 11–13/11/2026
 * (deepseek 905 s, longcat 900 s) tinham `excedeuTimeout: true` no meta.
 */
export function rotuloTimeout(excedeuTimeout) {
  return excedeuTimeout === true ? '**execução incompleta (timeout)**' : null;
}

/**
 * Classifica as linhas citadas de um alvo contra os candidatos que existem no disco.
 *
 * As camadas são resolvidas em ordem e só descem quando a anterior não tem a linha:
 *
 * 1. `escritos` — o caminho como o modelo escreveu, e ele resolvido a partir do
 *    diretório auditado (`dicas.js` -> `pages/api/dicas.js`). É a leitura natural de
 *    quem fala de "as rotas" e, quando a linha existe aqui, não há o que desambiguar.
 * 2. `sufixos` — sufixos do caminho escrito (`admin/users.js` -> `users.js`).
 * 3. `porNome` — todos os arquivos do repositório com o mesmo nome-base. É a última
 *    instância: `dicas.js:97` só aponta para `pages/api/admin/dicas.js` quando o
 *    `pages/api/dicas.js` (53 linhas) não tem a linha, e é o que o ADR-0008 registrou.
 *
 * - **inválida**: nenhuma camada tem um candidato com a linha citada;
 * - **ambígua**: a camada que tem a linha tem mais de um candidato. Não é erro do
 *   modelo e também não pode ser declarada "válida" com um arquivo escolhido a esmo;
 * - **alvoReal**: o candidato inequívoco, quando existe.
 *
 * Misturar as camadas numa lista só produzia falso positivo em massa: uma citação de
 * caminho completo (`pages/api/dicas.js:3`) era acusada de ambígua porque o irmão
 * `pages/api/admin/dicas.js` também tem a linha 3. Em 14/11/2026 isso marcou 13 das 20
 * execuções, todas com caminho escrito — o caminho já respondia a pergunta.
 *
 * @param {string} alvo Caminho como o modelo escreveu.
 * @param {Iterable<number>} linhas Linhas citadas para esse alvo.
 * @param {{escritos?: Array<{caminho: string, linhas: number}>, sufixos?: Array<{caminho: string, linhas: number}>, porNome?: Array<{caminho: string, linhas: number}>}} camadas
 */
export function avaliarCitacao(alvo, linhas, { escritos = [], sufixos = [], porNome = [] } = {}) {
  const invalidas = [];
  const ambiguas = [];
  let alvoReal = null;
  // O mesmo arquivo pode chegar em mais de uma camada (o caminho escrito também está no
  // índice por nome). Vale a primeira camada que o alcança — e ele aparece uma vez só na
  // mensagem de detalhe.
  const vistos = new Set();
  const unica = (camada) => camada.filter((c) => {
    if (vistos.has(c.caminho)) return false;
    vistos.add(c.caminho);
    return true;
  });
  const camadas = [unica(escritos), unica(sufixos), unica(porNome)];
  const todos = camadas.flat();

  for (const linha of [...linhas].sort((a, b) => a - b)) {
    if (todos.length === 0) {
      invalidas.push(`${alvo}:${linha} (nenhum arquivo do repositório tem esse nome)`);
      continue;
    }
    const cabem = (grupo) => grupo.filter((c) => linha <= c.linhas);
    // `pages/api/posts.js:152` num arquivo que acaba antes: o caminho escrito existe e o
    // modelo errou a linha. Não se desce para o homônimo — foi assim que o conferidor
    // declarou "válida" uma citação apontando para o arquivo errado (ADR-0008, 13/11).
    const literal = camadas[0].find((c) => c.caminho === alvo);
    if (literal && linha > literal.linhas) {
      invalidas.push(`${alvo}:${linha} (o arquivo escrito tem ${literal.linhas} linha(s))`);
      continue;
    }
    const camada = camadas.map(cabem).find((g) => g.length > 0);
    if (!camada) {
      const detalhe = todos.map((c) => `${c.caminho} (${c.linhas} linhas)`).join(' ou ');
      invalidas.push(`${alvo}:${linha} (nenhum candidato tem a linha: ${detalhe})`);
      continue;
    }
    if (camada.length > 1) {
      ambiguas.push(`${alvo}:${linha} (cabe em ${camada.map((c) => c.caminho).join(', ')})`);
      continue;
    }
    alvoReal ??= camada[0].caminho;
  }

  return { invalidas, ambiguas, alvoReal };
}
