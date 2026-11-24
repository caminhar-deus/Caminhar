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

/** Aliases que o plugin canonicaliza antes de instanciar (`AGENT_ALIASES` do slim 3.0.8). */
const AGENT_ALIASES = {
  explore: 'explorer',
  librarian: 'explorer',
  'frontend-ui-ux-engineer': 'designer',
};

/** `disabled_agents` não consegue desligar estes papéis: o host os protege. */
const PROTECTED_AGENTS = new Set(['orchestrator', 'councillor']);

/** Chaves de um bloco de preset que não são nome de agente. */
const CAMPOS_DO_PRESET = new Set(['extends', 'agents', 'marketplace']);

function nomeCanonico(nome) {
  return AGENT_ALIASES[nome] ?? nome;
}

/**
 * Nomes de agente de UM bloco de preset, cobrindo as duas sintaxes que o host
 * normaliza (`normalizePreset`): a forma canônica `{ agents: {...} }` e a forma
 * plana legada (`{ oracle: {...} }`), inclusive quando as duas aparecem juntas.
 */
function nomesDaDefinicao(definicao) {
  if (!definicao || typeof definicao !== 'object' || Array.isArray(definicao)) return [];
  const nomes = new Set();

  for (const [chave, valor] of Object.entries(definicao)) {
    if (CAMPOS_DO_PRESET.has(chave)) continue;
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) nomes.add(nomeCanonico(chave));
  }

  const bloco = definicao.agents;
  if (bloco && typeof bloco === 'object' && !Array.isArray(bloco)) {
    for (const chave of Object.keys(bloco)) nomes.add(nomeCanonico(chave));
  }

  return [...nomes];
}

/**
 * Nomes do preset ATIVO somando a cadeia de `extends` (ancestral primeiro).
 *
 * O host resolve `extends` recursivamente e mescla os agentes; sem percorrer a
 * cadeia, um papel herdado do preset pai passava fora da checagem — o único jeito
 * de cobri-lo era repeti-lo no bloco `agents` raiz.
 *
 * Ciclo é tratado como fim de cadeia: o host aborta a resolução inteira
 * (`PresetResolutionError`), então nenhum papel do preset compila e a checagem de
 * "não compilaram" já reprova.
 */
function nomesDoPreset(nome, presets, visitados = new Set()) {
  if (visitados.has(nome)) return [];
  if (!presets || typeof presets !== 'object' || !Object.hasOwn(presets, nome)) return [];
  visitados.add(nome);

  const definicao = presets[nome];
  const ancestral =
    definicao && typeof definicao === 'object' && typeof definicao.extends === 'string'
      ? nomesDoPreset(definicao.extends, presets, visitados)
      : [];

  return [...ancestral, ...nomesDaDefinicao(definicao)];
}

/**
 * Agentes que o host NÃO instancia: `disabled_agents` (default `["observer"]`)
 * canonicalizado, menos os protegidos. Sem isso, um agente desligado de propósito
 * aparecia como "não compilou" e reprovava o preflight.
 */
function nomesDesabilitados(config) {
  const lista = Array.isArray(config?.disabled_agents) ? config.disabled_agents : ['observer'];
  const nomes = new Set();
  for (const nome of lista) {
    if (typeof nome !== 'string') continue;
    const alvo = nomeCanonico(nome);
    if (!PROTECTED_AGENTS.has(alvo)) nomes.add(alvo);
  }
  return nomes;
}

/**
 * Nomes dos agentes que o preset gerencia — bloco do preset ativo (com a cadeia
 * de `extends`) + `agents` raiz, menos `disabled_agents`.
 *
 * Serve para o caminho negativo que faltava: quando o plugin NÃO carrega, o host
 * compila só os agentes próprios e a checagem de primários vira uma varredura
 * vazia (em 23/11/2026 o slim abortou na carga da config e `debug agents` mostrou
 * apenas `build`/`plan`/`title`). Sem esta lista, o preflight podia sair 0 sem ter
 * conferido papel nenhum.
 *
 * `extends`/`marketplace` não são papéis e ficam fora; aliases são canonicalizados
 * porque o id compilado é o nome canônico.
 *
 * @param {object} config Objeto do preset já parseado (`parseJsonc`).
 * @returns {string[]} Nomes esperados de agentes compilados.
 */
export function expectedAgents(config) {
  const nomes = new Set();
  const preset = typeof config?.preset === 'string' ? config.preset : null;

  if (preset) {
    for (const nome of nomesDoPreset(preset, config?.presets)) nomes.add(nome);
  }

  const raiz = config?.agents;
  if (raiz && typeof raiz === 'object' && !Array.isArray(raiz)) {
    for (const chave of Object.keys(raiz)) nomes.add(nomeCanonico(chave));
  }

  for (const desabilitado of nomesDesabilitados(config)) nomes.delete(desabilitado);

  return [...nomes];
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
 * Modo de leitura da config compilada, escolhido na linha de comando.
 *
 * `standalone` (padrão) sobe um servidor privado e compila a config DO DISCO — é o
 * modo portátil: não depende do serviço em execução nem do restart, então funciona
 * logo depois de editar o preset e fora do host (CI, outra máquina).
 *
 * `service` lê a config que o serviço de fundo já compilou — só faz sentido para
 * confirmar o que o host está usando AGORA, depois do restart.
 *
 * @param {string[]} [argv] Argumentos depois do nome do script (`process.argv.slice(2)`).
 * @returns {{ modo: 'standalone'|'service'|null, erro: string|null }}
 */
export function parseModeArgs(argv = []) {
  const flags = argv.filter((arg) => arg.startsWith('-'));
  const desconhecidas = flags.filter((arg) => arg !== '--standalone' && arg !== '--service');
  if (desconhecidas.length > 0) {
    return { modo: null, erro: `argumento(s) desconhecido(s): ${desconhecidas.join(', ')}` };
  }
  if (flags.includes('--standalone') && flags.includes('--service')) {
    return { modo: null, erro: 'use --standalone OU --service, não os dois' };
  }
  return { modo: flags.includes('--service') ? 'service' : 'standalone', erro: null };
}

/** Argumentos de `opencode debug agents` para o modo escolhido. */
export function debugAgentsArgs(modo = 'standalone') {
  return modo === 'service' ? ['debug', 'agents'] : ['debug', 'agents', '--standalone'];
}

/** Código de saída de "não verificado" (CLI ausente), distinto de erro real (1). */
export const EXIT_NAO_VERIFICADO = 2;

/**
 * Código de saída por status da leitura do catálogo: `NAO_VERIFICADO` → 2 (o
 * ambiente não permite verificar, não é defeito do projeto) e qualquer outro → 1.
 */
export function exitCodeForReadStatus(status) {
  return status === 'NAO_VERIFICADO' ? EXIT_NAO_VERIFICADO : 1;
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
