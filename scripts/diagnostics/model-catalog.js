/**
 * Núcleo puro do preflight de catálogo (sem I/O): comparar os modelos que os
 * agentes vão usar com o catálogo do provedor.
 *
 * Separado do CLI (`check-model-catalog.js`) de propósito: assim as funções são
 * testáveis sem rodar `opencode` e sem `import.meta` (que o Babel do Jest não
 * transpila para CommonJS).
 */

/**
 * Converte a saída de `opencode models` (uma linha `provider/id` por modelo)
 * num Set. Linhas vazias e sem `/` são ignoradas.
 */
export function parseCatalog(stdout) {
  const ids = new Set();
  for (const line of String(stdout).split('\n')) {
    const id = line.trim();
    if (id && id.includes('/') && !id.includes(' ')) ids.add(id);
  }
  return ids;
}

/**
 * Extrai `{ agent, id }` de cada agente compilado que declara modelo.
 * Aceita o objeto `{ providerID, id }` do host v2 e a forma string antiga.
 */
export function agentModels(agents) {
  const out = [];
  for (const agent of agents) {
    const model = agent?.model;
    if (!model) continue;
    const id = typeof model === 'string' ? model : `${model.providerID}/${model.id}`;
    if (id.includes('undefined')) continue;
    out.push({ agent: agent.id, id });
  }
  return out;
}

/** Ids (por agente) que não existem no catálogo. */
export function missingModels(models, catalog) {
  return models.filter(({ id }) => !catalog.has(id));
}

/**
 * Converte o preset do slim (JSONC, com comentários e vírgula final) em objeto.
 *
 * O preset é a única fonte da CADEIA DE RESERVA: `opencode debug agents` expõe só o
 * primário compilado, e a reserva (`"model": [primário, reserva]`) não aparece em
 * lugar nenhum do host. Sem ler o arquivo, um id de reserva morto passa despercebido.
 *
 * Comentário e vírgula final são removidos fora das strings — `"https://..."` continua
 * intacto — e o JSON resultante é entregue ao `JSON.parse`, para erro de sintaxe
 * explodir em vez de virar um preset meio-lido.
 */
export function parseJsonc(texto) {
  let saida = '';
  let i = 0;
  let emString = false;
  const entrada = String(texto);

  while (i < entrada.length) {
    const caractere = entrada[i];
    const proximo = entrada[i + 1];

    if (emString) {
      saida += caractere;
      if (caractere === '\\') {
        saida += entrada[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (caractere === '"') emString = false;
      i += 1;
      continue;
    }

    if (caractere === '"') {
      emString = true;
      saida += caractere;
      i += 1;
      continue;
    }
    if (caractere === '/' && proximo === '/') {
      while (i < entrada.length && entrada[i] !== '\n') i += 1;
      continue;
    }
    if (caractere === '/' && proximo === '*') {
      i += 2;
      while (i < entrada.length && !(entrada[i] === '*' && entrada[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    saida += caractere;
    i += 1;
  }

  return JSON.parse(saida.replace(/,(\s*[}\]])/g, '$1'));
}

/**
 * Modelos do preset ATIVO, na ordem em que aparecem — primário primeiro, reserva depois.
 *
 * `posicao > 0` é reserva. O retorno é vazio quando o bloco do preset ativo não existe,
 * e é isso que o CLI trata como fail-closed: sem preset não há cadeia para conferir.
 *
 * @param {object} config Objeto do preset já parseado (`parseJsonc`).
 * @returns {{ preset: string|null, agentes: Array<{agent: string, id: string, posicao: number}> }}
 */
export function presetModels(config) {
  const preset = typeof config?.preset === 'string' ? config.preset : null;
  const bloco = preset ? config?.presets?.[preset] : null;
  if (!bloco || typeof bloco !== 'object') return { preset, agentes: [] };

  const agentes = [];
  for (const [agent, definicao] of Object.entries(bloco)) {
    const modelo = definicao?.model;
    if (!modelo) continue;
    const ids = Array.isArray(modelo) ? modelo : [modelo];
    ids.forEach((id, posicao) => {
      if (typeof id === 'string' && id.includes('/') && !id.includes('undefined')) {
        agentes.push({ agent, id, posicao });
      }
    });
  }
  return { preset, agentes };
}

/**
 * Formata a falha de leitura do catálogo vivo do OpenCode diferenciando
 * ausência do binário (`ENOENT` → `NAO_VERIFICADO`) de erros reais da CLI (`ERRO`).
 *
 * @param {Error|{code?: string, message?: string}} error Erro capturado ao invocar `opencode`.
 * @param {{preset?: string|null, total?: number, reservas?: number, error?: string}|null} [presetSummary]
 * @returns {{status: 'NAO_VERIFICADO'|'ERRO', lines: string[]}}
 */
export function formatCatalogReadError(error, presetSummary = null) {
  const rawMessage = String(error?.message || error || 'erro desconhecido');
  const reason = rawMessage.split('\n')[0];
  const isEnoent = error?.code === 'ENOENT' || /\bENOENT\b/.test(rawMessage);

  if (isEnoent) {
    const lines = [
      'models:check — não foi possível ler o catálogo do OpenCode (status: NÃO VERIFICADO).',
      `  motivo: ${reason}`,
    ];
    if (presetSummary?.error) {
      lines.push(`  preset local (.opencode/oh-my-opencode-slim.json): ERRO — ${presetSummary.error}`);
    } else if (presetSummary?.preset) {
      lines.push(
        `  preset local (.opencode/oh-my-opencode-slim.json): sintaxe válida (preset \`${presetSummary.preset}\`, ${presetSummary.total ?? 0} modelo(s), ${presetSummary.reservas ?? 0} reserva(s)), mas o catálogo vivo NÃO foi consultado.`
      );
    }
    lines.push('  conferir: `opencode debug agents` e `opencode models` respondem no host do OpenCode?');
    return { status: 'NAO_VERIFICADO', lines };
  }

  return {
    status: 'ERRO',
    lines: [
      'models:check — não foi possível ler o catálogo do OpenCode.',
      `  motivo: ${reason}`,
      '  conferir: `opencode debug agents` e `opencode models` respondem?',
    ],
  };
}
