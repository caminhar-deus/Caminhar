/**
 * Higiene dos testes — `console.error` não pode ser reatribuído globalmente.
 *
 * Por que este teste existe (risco P3 real, eliminado em 22/10/2026):
 * `tests/setup.js` capturava a referência original do `console.error` e
 * reatribuía o método com um wrapper que descartava silenciosamente os logs já
 * conhecidos. O filtro vivia no setup — valia para TODOS os testes de uma vez —
 * e não deixava rastro: qualquer erro real de qualquer teste podia ser engolido
 * sem que a suíte falhasse. A supressão foi movida para os testes que realmente
 * provocam os logs, via filterConsoleError / suppressConsoleError de
 * tests/helpers/console.js (jest.spyOn + mockRestore, com restoreMocks: true em
 * jest.config.base.js): supressão local, declarada e reversível.
 *
 * Por que um teste de invariante: a ausência do filtro global não aparece em
 * nenhum outro teste; sem isto, um próximo ajuste "por conveniência" pode
 * reintroduzir a reatribuição global e a suíte volta a engolir erros reais em
 * silêncio. Aqui os `.js` de `tests/` são lidos do disco (fonte única de
 * verdade, mesmo estilo do teste do pin do k6 em
 * tests/unit/github-workflows/k6-version-pin.test.js) e a regressão falha
 * apontando arquivo, linha e trecho.
 *
 * Exceção documentada: `tests/helpers/console.js` é o ÚNICO lugar legítimo em
 * que o `console.error` é substituído — e o é via jest.spyOn (restaurável),
 * nunca por atribuição direta. Todo o resto de `tests/` é varrido, sem lista
 * fixa de arquivos.
 *
 * Limite conhecido: a detecção é textual e linha a linha; uma atribuição
 * quebrada entre linhas passaria. O padrão real do wrapper antigo — e qualquer
 * variação razoável dele — é escrito numa linha só.
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

/** Raiz varrida: todos os `.js` sob `tests/`, incluindo os arquivos de setup. */
const DIR_TESTS = path.resolve(process.cwd(), 'tests');

/**
 * Única exceção da varredura: `tests/helpers/console.js` centraliza o
 * `jest.spyOn(console, 'error')` legítimo (suppressConsoleError /
 * filterConsoleError). Spy é restaurável; não é atribuição global.
 */
const ARQUIVO_EXCEPCAO = 'tests/helpers/console.js';

/**
 * Nome do identificador que o wrapper global antigo usava para guardar a
 * referência original do console. Construído em duas partes de propósito:
 * este arquivo é varrido pelo próprio invariante (não há auto-exclusão) e o
 * nome completo escrito aqui reprovaria o próprio detector.
 */
const NOME_IDENTIFICADOR_WRAPPER = ['original', 'ConsoleError'].join('');

/**
 * Atribuição direta a `console.error`, nos formatos que o wrapper antigo
 * usava: atribuição ao método pelo ponto e pelas variantes de colchete com
 * aspas simples, duplas ou crase. O `(?!=)` no final evita confundir comparação
 * (`console.error == x`) com atribuição; uma chamada (`console.error(...)`) e
 * um `jest.spyOn(console, 'error')` não casam.
 */
const RE_ATRIBUICAO =
  /console\s*(?:\.\s*error|\[\s*['"`]error['"`]\s*\])\s*=(?!=)/;

/** O identificador do wrapper, como palavra inteira (palavra e só ele). */
const RE_IDENTIFICADOR_WRAPPER = new RegExp(`\\b${NOME_IDENTIFICADOR_WRAPPER}\\b`);

/**
 * Falsos positivos para os testes de SANIDADE do detector, montados por
 * concatenação de propósito: este arquivo é varrido pelo próprio invariante,
 * e o texto exato da regra reprovaria o detector aqui. Cada constante produz,
 * em tempo de execução, o texto que o detector DEVE reprovar.
 */
const FONTE_ATRIBUICAO_PONTO = ['console.error', ' = () => {};'].join('');
const FONTE_ATRIBUICAO_COLCHETES_SIMPLES = [
  'console[',
  "'error']",
  ' = () => {};',
].join('');
const FONTE_ATRIBUICAO_COLCHETES_DUPLAS = [
  'console[',
  '"error"]',
  ' = () => {};',
].join('');

/**
 * Lista recursivamente todos os `.js` sob `dir`, do disco. Recursão manual com
 * `withFileTypes` em vez de `fs.globSync` (existe no Node 24 do projeto) para
 * manter o comportamento explícito e a ordenação determinística.
 * @param {string} dir - Diretório a varrer
 * @param {string[]} [acumulados] - Acumulador da recursão
 * @returns {string[]} Caminhos absolutos dos `.js`, ordenados
 */
function listarArquivosJs(dir = DIR_TESTS, acumulados = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      listarArquivosJs(completo, acumulados);
    } else if (entrada.isFile() && entrada.name.endsWith('.js')) {
      acumulados.push(completo);
    }
  }
  return acumulados.sort();
}

/** Caminho relativo à raiz do projeto, sempre com `/` (mensagens estáveis). */
function caminhoRelativo(caminhoAbsoluto) {
  return path.relative(process.cwd(), caminhoAbsoluto).split(path.sep).join('/');
}

/**
 * Detector puro: recebe o CONTEÚDO de um arquivo e devolve as violações do
 * invariante, com número de linha e trecho. É a mesma função usada no scan
 * real e nos testes de sanidade — fonte única da regra.
 * @param {string} conteudo - Código-fonte do arquivo
 * @param {string} arquivo - Nome do arquivo (só para identificar a violação)
 * @returns {{regra: string, arquivo: string, numero: number, trecho: string}[]}
 */
function detectarViolacoes(conteudo, arquivo) {
  const violacoes = [];
  conteudo.split(/\r?\n/).forEach((linha, indice) => {
    const trecho = linha.trim();
    if (RE_ATRIBUICAO.test(linha)) {
      violacoes.push({ regra: 'atribuicao', arquivo, numero: indice + 1, trecho });
    }
    if (RE_IDENTIFICADOR_WRAPPER.test(linha)) {
      violacoes.push({ regra: 'identificador', arquivo, numero: indice + 1, trecho });
    }
  });
  return violacoes;
}

/** Lê um arquivo do disco e rora o detector nele. */
function violacoesDoArquivo(caminhoAbsoluto) {
  const conteudo = fs.readFileSync(caminhoAbsoluto, 'utf8');
  return detectarViolacoes(conteudo, caminhoRelativo(caminhoAbsoluto));
}

/**
 * Varre todos os `.js` de `tests/` (exceto a exceção documentada) e devolve
 * todas as violações do invariante.
 */
function todasAsViolacoes() {
  return listarArquivosJs()
    .filter(caminho => caminhoRelativo(caminho) !== ARQUIVO_EXCEPCAO)
    .flatMap(caminho => violacoesDoArquivo(caminho));
}

/** Trunca trechos longos para a mensagem de falha não virar um mural. */
function truncarTrecho(trecho) {
  return trecho.length > 120 ? `${trecho.slice(0, 117)}...` : trecho;
}

/** Mensagem de falha que aponta arquivo, linha, trecho e a correção. */
function formatarViolacao(violacao) {
  const trecho = truncarTrecho(violacao.trecho);
  if (violacao.regra === 'atribuicao') {
    return (
      `Atribuição global a console.error encontrada em ${violacao.arquivo}:${violacao.numero} — ` +
      'use filterConsoleError/suppressConsoleError de tests/helpers/console.js no teste que provoca o log\n' +
      `    trecho: ${trecho}`
    );
  }
  return (
    `Identificador "${NOME_IDENTIFICADOR_WRAPPER}" (truque do wrapper global antigo) ` +
    `encontrado em ${violacao.arquivo}:${violacao.numero} — supressão de console.error só via ` +
    'filterConsoleError/suppressConsoleError de tests/helpers/console.js, com mockRestore no afterEach\n' +
    `    trecho: ${trecho}`
  );
}

describe('tests-higiene — console.error não pode ser reatribuído globalmente', () => {
  const arquivos = listarArquivosJs().map(caminhoRelativo);
  const violacoes = todasAsViolacoes();

  it('varre recursivamente todos os .js sob tests/, sem lista fixa de arquivos', () => {
    // Guarda dos demais testes: se a varredura achar zero arquivos (diretório
    // errado, regex de extensão quebrada), tudo passaria sem verificar nada.
    expect(arquivos.length).toBeGreaterThan(0);
    // Prova a recursão: pelo menos um .js vive num subdiretório de tests/.
    expect(arquivos.some(arquivo => arquivo.includes('/'))).toBe(true);
    // A exceção documentada continua no disco e é reconhecida pelo caminho.
    expect(arquivos).toContain(ARQUIVO_EXCEPCAO);
  });

  it('nenhum arquivo sob tests/ faz atribuição direta a console.error', () => {
    // Esta asserção é a que falharia se a regressão voltar: a mensagem aponta
    // arquivo, linha, trecho e aponta a correção (helper local, por teste).
    const atribuicoes = violacoes
      .filter(violacao => violacao.regra === 'atribuicao')
      .map(formatarViolacao);
    expect(atribuicoes).toEqual([]);
  });

  it(`nenhum arquivo sob tests/ usa o identificador ${NOME_IDENTIFICADOR_WRAPPER} (wrapper global antigo)`, () => {
    const identificadores = violacoes
      .filter(violacao => violacao.regra === 'identificador')
      .map(formatarViolacao);
    expect(identificadores).toEqual([]);
  });

  /**
   * Sanidade do detector: um invariante que passa por estar quebrado é pior
   * que nenhum invariante. Os casos abaixo rodam a MESMA função usada no scan
   * real contra fontes sintéticas — provando que ele reprova o que deve
   * reprovar e aprova o que é legítimo.
   */
  describe('sanidade do detector — ele tem dentes (anti falso verde)', () => {
    it('acusa atribuição direta ao método: pelo ponto e pelas variantes de colchete', () => {
      const fonte = [
        // Guardar a referência numa variável NÃO é atribuição: não pode acusar.
        'const guardada = console.error;',
        FONTE_ATRIBUICAO_PONTO,
        FONTE_ATRIBUICAO_COLCHETES_SIMPLES,
        FONTE_ATRIBUICAO_COLCHETES_DUPLAS,
      ].join('\n');

      const achados = detectarViolacoes(fonte, 'fake.test.js');

      expect(achados).toHaveLength(3);
      expect(achados.every(achado => achado.regra === 'atribuicao')).toBe(true);
      // Cada acuso aponta a linha certa (2, 3 e 4 — a linha 1 é limpa).
      expect(achados.map(achado => achado.numero)).toEqual([2, 3, 4]);
    });

    it(`acusa o identificador ${NOME_IDENTIFICADOR_WRAPPER} (o wrapper que engolia logs)`, () => {
      const fonte = [
        'const guardada = console.error;',
        ['const wrapper = (...args) => { ', NOME_IDENTIFICADOR_WRAPPER, '(...args); };'].join(''),
        ['console.error', ' = wrapper;'].join(''),
      ].join('\n');

      const achados = detectarViolacoes(fonte, 'fake.test.js');

      expect(achados).toHaveLength(2);
      expect(achados.map(achado => achado.regra)).toEqual(['identificador', 'atribuicao']);
      expect(achados.map(achado => achado.numero)).toEqual([2, 3]);
    });

    it('NÃO acusa usos legítimos: chamada, spyOn, repasse ao original e comparação', () => {
      const fonte = [
        // Espionagem legítima (o que tests/helpers/console.js faz).
        "jest.spyOn(console, 'error').mockImplementation(() => {});",
        // Chamada normal do método.
        "console.error('uma mensagem real de um teste');",
        // Repasse da implementação original dentro de um mock (helper).
        'originalError.call(console, ...args);',
        // Guardar a referência e comparar (sem reatribuir).
        'const guardada = console.error;',
        'if (console.error === guardada) { /* nada */ }',
      ].join('\n');

      expect(detectarViolacoes(fonte, 'fake.test.js')).toEqual([]);
    });
  });
});
