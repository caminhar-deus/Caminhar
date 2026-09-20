/**
 * Testes do step "Post PR Comment on Failure" de `.github/workflows/pr-coverage.yml`.
 *
 * O corpo do comentário é montado por um script embutido no YAML, que trunca
 * uma saída de `jest --coverage` com mais de 170 KB dentro do limite de 65536
 * caracteres da API de comentários do GitHub. Esses testes executam o script
 * exatamente como o `actions/github-script` executa — com `github` e `context`
 * simulados — e verificam o que precisa sobreviver ao corte:
 *
 *   1. o corpo cabe no limite da API;
 *   2. o conteúdo decisivo (tabela de cobertura, motivo do threshold, resumo)
 *      continua no comentário, porque é o FIM da saída que explica a reprovação;
 *   3. o ruído do começo (PASS + console.error de `act(...)`) é descartado;
 *   4. crases, `${` e barras invertidas do texto original não são corrompidos;
 *   5. o marcador pesquisado pelo step "Remove Old Coverage Comments" é publicado.
 *
 * O arquivo amostra é virtual: o `require('fs')` do script recebe um shim que
 * devolve a amostra em memória, então o teste não escreve nada em disco.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach } from '@jest/globals';
import YAML from 'yaml';

const CAMINHO_WORKFLOW = path.resolve(process.cwd(), '.github/workflows/pr-coverage.yml');
const JOB = 'coverage-report';
const NOME_STEP = 'Post PR Comment on Failure';
const ARQUIVO_AMOSTRA = 'coverage-output.txt';

/** Limite de caracteres da API de comentários do GitHub. */
const MAX_CHARS_API = 65536;

/** Precisa ser idêntico ao texto que o step de limpeza procura nos comentários. */
const MARCADOR_COMENTARIO = '### ❌ Cobertura de Testes Abaixo do Mínimo Exigido';

/** Trechos com crase, `${` e barras invertidas: provam que o texto não é corrompido. */
const LINHAS_SENSIVEIS = [
  '  console.error',
  '    expected path C:\\jest\\output\\dump.txt to exist',
  '    received template `suite-${nome}.test.js` com crase ` literal',
  '    full diff `${post.id}` !== ${esperado}',
  ''
].join('\n');

const TABELA_COBERTURA = [
  '----------------------------------|---------|----------|---------|---------|-----------------------',
  'File                              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s',
  '----------------------------------|---------|----------|---------|---------|-----------------------',
  'All files                         |   78.5  |   79.5   |   84.2  |   88.1  |',
  ' lib/domain                       |   77.1  |   77.9   |   94.0  |   93.2  |',
  '----------------------------------|---------|----------|---------|---------|-----------------------',
  ''
].join('\n');

const MOTIVO_THRESHOLD = [
  'Jest: "global" coverage threshold for branches (80%) not met: 79.5%',
  'Jest: "global" coverage threshold for functions (85%) not met: 84.2%',
  ''
].join('\n');

const RESUMO_JEST = [
  'Test Suites: 5 skipped, 180 passed, 180 of 185 total',
  'Tests:       70 skipped, 1209 passed, 1279 total',
  'Time:        72.455 s',
  'Ran all test suites.',
  ''
].join('\n');

/**
 * Ruído equivalente ao começo da saída real (PASS + `console.error` de `act`).
 * É gerado acima de 60 KB de propósito: força o corte de `MAX_CHARS`.
 */
function ruidoInicial() {
  const linhas = [];
  for (let indice = 0; indice < 900; indice += 1) {
    linhas.push(`  console.error`);
    linhas.push(`    An update to Suite${indice} inside a test was not wrapped in act(...).`);
  }
  return linhas.join('\n');
}

/** Cenário A: cobertura abaixo do mínimo — tabela, thresholds e resumo no fim. */
function amostraComTabela() {
  return `${LINHAS_SENSIVEIS}${ruidoInicial()}\n${TABELA_COBERTURA}${MOTIVO_THRESHOLD}${RESUMO_JEST}`;
}

/** Cenário B: suíte quebrada antes de a cobertura ser impressa. */
function amostraSemTabela() {
  const blocoFalha = [
    'FAIL tests/unit/foo.test.js',
    '  ● foo › deve somar',
    '',
    '    expect(received).toBe(expected)',
    '',
    LINHAS_SENSIVEIS,
    'Test Suites: 1 failed, 184 passed, 185 total',
    'Ran all test suites.',
    ''
  ].join('\n');

  return `${ruidoInicial()}\n${blocoFalha}`;
}

/** Script do step, lido do próprio workflow (fonte única de verdade). */
function scriptDoStep() {
  const workflow = YAML.parse(fs.readFileSync(CAMINHO_WORKFLOW, 'utf8'));
  const step = workflow.jobs[JOB].steps.find(candidato => candidato.name === NOME_STEP);
  if (!step || !step.with || typeof step.with.script !== 'string') {
    throw new Error(`step "${NOME_STEP}" com script não encontrado em ${CAMINHO_WORKFLOW}`);
  }
  return step.with.script;
}

/**
 * Executa o script do step com `github`/`context` simulados e devolve a chamada
 * de `createComment`, com `require('fs')` apontando a amostra para a memória.
 */
async function publicarComentario(amostra) {
  const chamadas = [];
  const github = {
    rest: {
      issues: {
        createComment: async argumentos => {
          chamadas.push(argumentos);
          return { data: {} };
        }
      }
    }
  };
  const context = { repo: { owner: 'caminhar-deus', repo: 'Caminhar' }, issue: { number: 42 } };
  const fsSimulado = {
    existsSync: caminho => caminho === ARQUIVO_AMOSTRA || fs.existsSync(caminho),
    readFileSync: (caminho, codificacao) =>
      caminho === ARQUIVO_AMOSTRA ? amostra : fs.readFileSync(caminho, codificacao)
  };
  const requireSimulado = nome => {
    if (nome === 'fs') return fsSimulado;
    throw new Error(`require('${nome}') não é suportado neste teste`);
  };

  const executar = new Function(
    'github',
    'context',
    'require',
    `return (async () => {\n${scriptDoStep()}\n})();`
  );
  await executar(github, context, requireSimulado);

  expect(chamadas).toHaveLength(1);
  return chamadas[0];
}

/** Preparo da revisão anterior: corte pelo começo + escape do texto. */
function preparoLegado(saida) {
  const LIMITE = 60000;
  const truncada = saida.length > LIMITE ? `${saida.slice(0, LIMITE)}\n... (saída truncada)` : saida;
  return truncada.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

describe('pr-coverage.yml — comentário de cobertura', () => {
  it('lê o script do step direto do workflow', () => {
    const script = scriptDoStep();

    expect(script).toContain('createComment');
    expect(script).toContain(MARCADOR_COMENTARIO);
  });

  describe('cenário A — cobertura abaixo do mínimo', () => {
    let comentario;

    beforeEach(async () => {
      comentario = await publicarComentario(amostraComTabela());
    });

    it('publica uma única vez, no PR do contexto', () => {
      expect(comentario).toMatchObject({ owner: 'caminhar-deus', repo: 'Caminhar', issue_number: 42 });
    });

    it('mantém o marcador que o step de limpeza pesquisa', () => {
      expect(comentario.body).toContain(MARCADOR_COMENTARIO);
    });

    it('respeita o limite de 65536 caracteres da API', () => {
      expect(comentario.body.length).toBeLessThanOrEqual(MAX_CHARS_API);
    });

    it('preserva a tabela de cobertura e o motivo do threshold', () => {
      expect(comentario.body).toContain('Uncovered Line #s');
      expect(comentario.body).toContain('% Stmts');
      expect(comentario.body).toContain('coverage threshold for branches (80%) not met');
    });

    it('preserva o resumo da execução', () => {
      expect(comentario.body).toContain('Ran all test suites.');
    });

    it('descarta o ruído do começo da saída', () => {
      expect(comentario.body).not.toContain('not wrapped in act(...)');
    });
  });

  describe('cenário B — suíte quebrada antes da cobertura', () => {
    let corpo;

    beforeEach(async () => {
      corpo = (await publicarComentario(amostraSemTabela())).body;
    });

    it('respeita o limite de 65536 caracteres da API', () => {
      expect(corpo.length).toBeLessThanOrEqual(MAX_CHARS_API);
    });

    it('marca o corte no começo da saída', () => {
      expect(corpo).toContain('(início da saída truncado)');
    });

    it('preserva o fim da saída, que explica a falha', () => {
      expect(corpo).toContain('FAIL tests/unit/foo.test.js');
      expect(corpo).toContain('Ran all test suites.');
    });
  });

  describe('caracteres sensíveis no trecho publicado', () => {
    it('não escapa crases, ${ nem barras invertidas do texto original', async () => {
      const amostra = `${TABELA_COBERTURA}${MOTIVO_THRESHOLD}${LINHAS_SENSIVEIS}${RESUMO_JEST}`;
      const { body } = await publicarComentario(amostra);

      expect(body).toContain('`suite-${nome}.test.js`');
      expect(body).toContain('${post.id}');
      expect(body).toContain('C:\\jest\\output\\dump.txt');
      expect(body).not.toContain('\\`');
      expect(body).not.toContain('\\${');
      expect(body.match(/```/g)).toHaveLength(2);
    });
  });

  describe('controle negativo do preparo anterior', () => {
    it('cortar pelo começo perde a tabela e o fim da saída', () => {
      const legado = preparoLegado(amostraComTabela());

      expect(legado).not.toContain('Uncovered Line #s');
      expect(legado).not.toContain('Ran all test suites.');
    });

    it('escapar o texto corrompe crases e ${', () => {
      const legado = preparoLegado(LINHAS_SENSIVEIS);

      expect(legado).toContain('\\`');
      expect(legado).toContain('\\${');
    });
  });
});
