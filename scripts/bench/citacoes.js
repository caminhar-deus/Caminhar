/**
 * Resolvedor de citações `arquivo:linha` das baterias de bench.
 *
 * Extraído de `scripts/bench/papeis/conferir.js` (Parte 1 da fonte de verdade
 * derivada do disco em runtime): a Camada A das baterias de papel e o
 * verificador de instrumentos (`scripts/bench/ground-truth.js`) precisam da
 * MESMA regra de resolução — se cada um tiver a sua, a verdade "deriva do
 * disco" num lugar e vira hardcoded no outro.
 *
 * Sem `import.meta` por decisão: este módulo é importado por teste
 * Jest/Babel-CJS, e `import.meta` quebra a compilação CJS. A raiz do
 * repositório entra como parâmetro (`raiz`), obrigatório.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Raízes da travessia do índice (mesma lista do conferidor original). */
const RAIZES_PADRAO = [
  'pages', 'lib', 'components', 'hooks', 'utils', 'data',
  'tests', 'docs', 'design-system', 'public',
];

/**
 * Fonte fora do disco: layout do repo upstream (`packages/next/...`) e caminhos
 * extraídos de URL (`//github.com/...`). A bateria empurra o papel a buscar fora
 * (gh_grep, guia do repo upstream); nada no disco poderia validar — sinaliza.
 */
export function externaAoDisco(alvo) {
  return alvo.startsWith('//') || alvo.includes('github.com') || alvo.startsWith('packages/');
}

/**
 * Fábrica de resolvedor com estado lazy por instância: o índice, a lista de
 * caminhos e o memo de linhas são construídos na primeira consulta de cada
 * instância e reutilizados nas seguintes (custo de travessia pago uma vez).
 *
 * @param {object} opcoes
 * @param {string} opcoes.raiz Caminho absoluto da raiz do repositório (obrigatório).
 * @param {string[]} [opcoes.raizes] Raízes relativas varridas pelo índice.
 * @param {boolean} [opcoes.incluirNextDist] Se `false`, não varre
 *   `node_modules/next/dist` (resolvedor de reserva desligado — útil para teste
 *   unitário que não quer depender do pacote instalado).
 */
export function criarResolvedor({ raiz, raizes = RAIZES_PADRAO, incluirNextDist = true }) {
  if (!raiz) {
    throw new Error('criarResolvedor: `raiz` é obrigatória (o módulo não lê `import.meta`, para continuar importável pelo Jest/Babel-CJS).');
  }

  let indicePorNome = null;
  let caminhosProjetoMemo = null;
  let caminhosDistMemo = null;
  const linhasMemo = new Map();
  const conteudoMemo = new Map();

  function ehArquivo(caminho) {
    try { return statSync(path.join(raiz, caminho)).isFile(); } catch { return false; }
  }

  /**
   * Índice basename -> caminhos do repositório que têm esse nome.
   *
   * O modelo escreve o caminho de forma relativa ao diretório que conhece: "MASTER.md"
   * para "design-system/MASTER.md", "Input.module.css" para
   * "components/UI/Input.module.css". Resolver por prefixo fixo erra — "MASTER.md"
   * resolveria para o gabarito do próprio bench, que fica em scripts/bench/, e a
   * citação boa seria marcada como inválida. Medido em 19/10/2026.
   */
  function constroiIndice() {
    const indice = new Map();
    const pilha = raizes.map((r) => path.join(raiz, r));
    while (pilha.length > 0) {
      const atual = pilha.pop();
      let entradas;
      try { entradas = readdirSync(atual, { withFileTypes: true }); } catch { continue; }
      for (const entrada of entradas) {
        const completo = path.join(atual, entrada.name);
        if (entrada.isDirectory()) { pilha.push(completo); continue; }
        const chave = entrada.name;
        if (!indice.has(chave)) indice.set(chave, []);
        indice.get(chave).push(path.relative(raiz, completo));
      }
    }
    return indice;
  }

  function sufixosPorNome(alvo) {
    if (!indicePorNome) indicePorNome = constroiIndice();
    return indicePorNome.get(path.posix.basename(alvo)) ?? [];
  }

  /* ---------------------------------------------------------------
   * Citações sobre o Next instalado e sobre o repo upstream (ADR-0008, 05/11/2026).
   * Medido nas baterias 9×5: os papéis citam docs e código do Next de propósito
   * (o AGENTS.md manda ler o guia instalado em `node_modules/next/dist/docs/`), e
   * o índice — que cobre só este repositório — reprovou citações reais:
   * - `route.md`, `headers.md`, `self-hosting.md` existem em
   *   `node_modules/next/dist/docs/01-app/...`;
   * - `incremental-cache/index.js:73` é de
   *   `node_modules/next/dist/server/lib/incremental-cache/index.js` (555 linhas) —
   *   a colisão por nome com `tests/mocks/index.js` puniu a linha certa;
   * - `packages/next/src/...` e URLs `//github.com/...` têm fonte FORA do disco.
   *
   * O pacote é resolvedor de RESERVA: entra após as raízes do projeto, nunca no
   * mesmo índice — o critério do índice (comentários acima, 19/10/2026) não muda.
   */
  function caminhosProjeto() {
    if (caminhosProjetoMemo) return caminhosProjetoMemo;
    sufixosPorNome('-placeholder-'); // força a construção do índice
    caminhosProjetoMemo = [...new Set([...indicePorNome.values()].flat())].sort();
    return caminhosProjetoMemo;
  }

  function caminhosNextDist() {
    if (caminhosDistMemo) return caminhosDistMemo;
    const arquivos = [];
    if (incluirNextDist) {
      const pilha = [path.join(raiz, 'node_modules', 'next', 'dist')];
      while (pilha.length > 0) {
        const atual = pilha.pop();
        let entradas;
        try { entradas = readdirSync(atual, { withFileTypes: true }); } catch { continue; }
        for (const entrada of entradas) {
          const completo = path.join(atual, entrada.name);
          if (entrada.isDirectory()) { pilha.push(completo); continue; }
          arquivos.push(path.relative(raiz, completo).split(path.sep).join('/'));
        }
      }
    }
    caminhosDistMemo = arquivos.sort();
    return caminhosDistMemo;
  }

  function resolverEmNextDist(alvo) {
    const arquivos = caminhosNextDist();
    if (arquivos.length === 0) return [];
    const partes = alvo.split('/');
    for (let i = 0; i < partes.length; i += 1) {
      const sufixo = partes.slice(i).join('/');
      const achados = arquivos.filter((p) => p.endsWith(`/${sufixo}`));
      if (achados.length > 0) {
        // O mesmo módulo existe em build CJS (`server/lib/...`) e ESM (`esm/server/...`).
        // A CJS tem prioridade na ordem: foi o layout da citação real testada.
        const normais = achados.filter((p) => !p.includes('/esm/'));
        const esm = achados.filter((p) => p.includes('/esm/'));
        return [...normais, ...esm];
      }
    }
    return [];
  }

  // "..." no caminho é forma escrita, não endereço: `node_modules/.../02-guides/
  // cdn-caching.md`, `.../15-route-handlers.md`, `docs/adr/0010-...md`. Vira padrão
  // que casa com arquivos reais; os "..." representam o trecho que o modelo cortou.
  function padraoAbreviado(alvo) {
    if (!alvo.includes('...')) return null;
    const corpo = alvo.split('...').map((pedaco) => pedaco.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`${corpo}$`);
  }

  function resolverPorPadrao(padrao) {
    return caminhosProjeto().find((p) => padrao.test(p))
      ?? caminhosNextDist().find((p) => padrao.test(p))
      ?? null;
  }

  function linhasDe(caminhoRelativo) {
    if (!linhasMemo.has(caminhoRelativo)) {
      try {
        linhasMemo.set(caminhoRelativo, readFileSync(path.join(raiz, caminhoRelativo), 'utf8').split('\n').length);
      } catch {
        linhasMemo.set(caminhoRelativo, 0);
      }
    }
    return linhasMemo.get(caminhoRelativo);
  }

  /** Texto do arquivo (memoizado). `null` quando não existe/no disco. */
  function conteudoDe(caminhoRelativo) {
    if (!conteudoMemo.has(caminhoRelativo)) {
      try {
        conteudoMemo.set(caminhoRelativo, readFileSync(path.join(raiz, caminhoRelativo), 'utf8'));
      } catch {
        conteudoMemo.set(caminhoRelativo, null);
      }
    }
    return conteudoMemo.get(caminhoRelativo);
  }

  /**
   * Candidatos de um alvo no projeto: a união deduplicada de `alvo`,
   * `pages/api/<alvo>`, todos os sufixos de caminho (a partir de cada `/`) e
   * `pages/api/<sufixo>`, e depois os caminhos do índice por basename — só os
   * que existem no disco.
   *
   * `diretos` é o par `[alvo, pages/api/alvo]` SEM filtrar: o conferidor usa para
   * decidir se o serviço foi "abreviado" (o caminho servido não é o escrito).
   */
  function candidatosProjeto(alvo) {
    const diretos = [alvo, path.posix.join('pages/api', alvo)];
    const partes = alvo.split('/');
    const sufixos = [];
    for (let i = 1; i < partes.length; i += 1) {
      const sufixo = partes.slice(i).join('/');
      sufixos.push(sufixo, path.posix.join('pages/api', sufixo));
    }

    // TODOS os candidatos existentes entram — o primeiro achado NÃO é campeão. É a
    // regra que o conferidor do orchestrator consertou em 19/10/2026 (comentário de
    // `resolverCitacao` lá) e que estas baterias repetiram: `roles.js:113` caiu no
    // `tests/helpers/roles.js` (22 linhas) enquanto `pages/api/admin/roles.js` (133)
    // tem a linha; `posts.js:152` caiu em `pages/api/posts.js` (85) com
    // `pages/api/admin/posts.js` (171) e `lib/domain/posts.js` (181) no disco.
    const lista = [];
    for (const c of [...diretos, ...sufixos]) {
      if (ehArquivo(c) && !lista.includes(c)) lista.push(c);
    }
    for (const c of sufixosPorNome(alvo)) {
      if (ehArquivo(c) && !lista.includes(c)) lista.push(c);
    }
    return { lista, diretos };
  }

  /**
   * Reserva: primeiro o padrão abreviado ("...") quando o alvo tem "..."; quando
   * esse padrão não resolve (ou não há "..."), cai no `node_modules/next/dist`.
   * Devolve `[]` quando nada existe — mesma cadeia do bloco de reserva do
   * conferidor.
   */
  function resolverReserva(alvo) {
    const padrao = padraoAbreviado(alvo);
    if (padrao) {
      const encontrado = resolverPorPadrao(padrao);
      if (encontrado) return [encontrado];
    }
    return resolverEmNextDist(alvo);
  }

  /**
   * Origem pela extensão: docs do repo upstream só existem em .mdx — o pacote
   * instalado traz .md (a árvore instalada tem 0 .mdx) —, e fontes .ts do
   * upstream têm seu irmão .js/.d.ts no dist (`app-route.ts`). É fonte externa,
   * não citação inexistente — sinalizada, nunca reprovada.
   */
  function origemExternaPorExtensao(alvo) {
    const terminaTs = alvo.endsWith('.ts');
    const origemTs = terminaTs
      && (resolverEmNextDist(alvo.replace(/\.ts$/, '.js')).length > 0
        || resolverEmNextDist(alvo.replace(/\.ts$/, '.d.ts')).length > 0);
    return alvo.endsWith('.mdx') || origemTs;
  }

  return {
    ehArquivo,
    sufixosPorNome,
    caminhosProjeto,
    caminhosNextDist,
    resolverEmNextDist,
    padraoAbreviado,
    resolverPorPadrao,
    linhasDe,
    conteudoDe,
    candidatosProjeto,
    resolverReserva,
    origemExternaPorExtensao,
  };
}
