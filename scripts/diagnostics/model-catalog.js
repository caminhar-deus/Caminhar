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
