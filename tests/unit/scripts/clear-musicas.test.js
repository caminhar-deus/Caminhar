import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// NÃO há mocks de `pg`, `fs`, `dotenv` nem de `lib/infra/db.js` aqui (existiam
// nos testes antigos): o script não importa nenhum deles — eram mocks mortos.
// E os testes antigos chamavam `libDb.query('DELETE FROM musicas')` no PRÓPRIO
// teste, provando apenas que um `jest.fn` funciona; o SQL nunca passava pelo
// script. Nenhum sandbox de fs é necessário: `clear-musicas.js` não toca disco
// (diferente do `clear-db.js`, que apaga uploads de verdade).

// Mock do módulo que o script REAL importa (`scripts/db/connection.js`).
// A factory cria os `jest.fn` nela mesma: referenciar um `const` externo
// falharia com TDZ ("Cannot access 'mockQuery' before initialization") porque o
// babel-plugin-jest-hoist move `jest.mock` acima das declarações. Os MESMOS
// objetos chegam ao teste pelo import com alias `mock*` mais abaixo.
jest.mock('../../../scripts/db/connection.js', () => ({
  query: jest.fn(),
  closePool: jest.fn(),
}));

// Mock do readline: SEM `__esModule`, para ser compatível com o
// `import readline from 'readline'` do script (interop do Babel exige que o
// mock seja o próprio módulo). A resposta vem do `mockAnswer` de escopo de
// módulo, lido apenas quando o prompt é chamado (dentro dos testes), jamais na
// hora de a factory rodar.
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((_prompt, cb) => cb(mockAnswer)),
    close: jest.fn(),
  })),
}));

// Mock do load-env
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

// Import estático só é possível porque `clear-musicas.js` tem guarda de CLI: ao
// ser importado ele NÃO executa `askConfirmation()` nem `clearMusicRecords()`.
// Sem a guarda, `main()` rodaria já no import e, com o `readline` MOCKADO,
// leria `mockAnswer` (em TDZ) e daria `ReferenceError` — a suíte falharia por
// motivo incidental, não por prova intencional.
import {
  askConfirmation,
  clearMusicRecords,
  main,
} from '../../../scripts/clear-musicas.js';
import { query as mockQuery, closePool as mockClosePool } from '../../../scripts/db/connection.js';

// Resposta única devolvida pelo `readline` mockado ao próximo `question`.
let mockAnswer = 's';

// ---------------------------------------------------------------------------
// Testes REAIS de `askConfirmation` — exercitam o `readline` do próprio script.
// ---------------------------------------------------------------------------
describe('askConfirmation — leitura da resposta do prompt', () => {
  it.each([
    ['s', true],
    ['sim', true],
    ['  S  ', true], // caixa alta com espaços: `trim()` + `toLowerCase()`
    ['n', false],
    ['', false],
    ['x', false],
  ])('responde %j → %s', async (answer, expected) => {
    mockAnswer = answer;

    await expect(askConfirmation()).resolves.toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Testes REAIS de `clearMusicRecords`/`main` — mock de
// `scripts/db/connection.js` (o módulo que o script importa). Sem sandbox de
// fs: este script não toca disco.
// ---------------------------------------------------------------------------
describe('clearMusicRecords e main — confirmação, DELETE e cancelamento', () => {
  let logSpy;
  let errorSpy;
  let exitSpy;

  const logLines = () => logSpy.mock.calls.map((args) => args.join(' '));
  const errorLines = () => errorSpy.mock.calls.map((args) => args.join(' '));

  beforeEach(() => {
    mockAnswer = 's';
    mockQuery.mockResolvedValue({ rows: [], rowCount: 5 });
    mockClosePool.mockResolvedValue(undefined);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Um `process.exit` real encerraria a suíte inteira; um `exit` burro (noop)
    // deixaria o fluxo continuar de um jeito que em produção nunca aconteceria
    // (o caminho "cancelado" de `main()` prosseguiria para `clearMusicRecords()`).
    // Lançar um erro sentinela interrompe o fluxo no mesmo ponto do `exit` real
    // e mantém o teste determinístico — sem poll de microtasks.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("main com 's': executa o DELETE, fecha o pool e não chama process.exit", async () => {
    await main();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(logLines().join('\n')).toContain('Tabela de músicas limpa com sucesso');
  });

  it("main com 'n': não toca no banco nem no pool, loga o cancelamento e sai com 0", async () => {
    mockAnswer = 'n';

    await expect(main()).rejects.toThrow('process.exit(0)');

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockClosePool).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logLines().join('\n')).toContain('cancelada');
  });

  it('clearMusicRecords: o SQL capturado do mock é DELETE FROM musicas', async () => {
    await clearMusicRecords();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    // Asserção sobre o argumento RECEBIDO pelo mock — o SQL vive só no script,
    // não é reescrito como literal aqui (o teste antigo fazia isso e provava
    // nada).
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/^DELETE\s+FROM\s+musicas\b/i);

    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('clearMusicRecords com query rejeitada: loga o erro, sai com 1 e AINDA fecha o pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('pool indisponível'));

    await expect(clearMusicRecords()).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorLines()[0]).toContain('Erro ao limpar músicas');
    expect(errorLines()[0]).toContain('pool indisponível');
    expect(exitSpy).toHaveBeenCalledWith(1);
    // Semântica do `finally` em JS: o bloco roda quando o `try` lança, e o pool
    // é fechado. Em produção, `process.exit(1)` (clear-musicas.js) encerra o
    // processo sincronamente e o `finally` NUNCA executa — o pool morre junto
    // com o processo, encerrado pelo SO. A asserção passa porque o mock de
    // `process.exit` lança uma sentinel em vez de sair de verdade: ela cobre a
    // semântica do bloco `finally` (detectável pela mutação "remover o
    // finally"), não o comportamento do exit real.
    expect(mockClosePool).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Guarda de CLI — a OUTRA metade do contrato, que um teste de mutação
  // independente expôs como furo de cobertura (26 mutações; a única
  // sobrevivente era desligar a guarda).
  // -------------------------------------------------------------------------
  // O argv do Jest nunca termina em `clear-musicas.js`, então o import estático
  // do topo desta suíte só prova o lado NEGATIVO da guarda (ela NÃO dispara em
  // importação): se disparasse, `main()` rodaria já no import e a suíte
  // quebraria de forma incidental (`readline` lendo `mockAnswer` em TDZ, query
  // fora de teste). Esse lado é implícito no fato de a suíte entrar em verde —
  // registrado aqui de propósito, não precisa de teste próprio.
  // O lado POSITIVO é o teste abaixo: com `argv[1]` apontando para o script, a
  // guarda precisa DISPARAR `main()`. Sem ele, trocar a guarda por `if (false)`
  // transforma `npm run db:clear:musicas` num no-op silencioso (exit 0, nada
  // feito) e nenhum teste reprova.
  it('guarda de CLI: argv[1] terminando em clear-musicas.js dispara main()', async () => {
    const originalArgv = process.argv;
    try {
      // Caminho sintético: a guarda só faz `endsWith('clear-musicas.js')`, então
      // não é preciso apontar para o arquivo real do repositório.
      process.argv = [originalArgv[0], '/stub/cli/clear-musicas.js'];

      let isolatedQuery;
      let isolatedClosePool;

      // `jest.isolateModulesAsync` cria um registro de módulos NOVO: as
      // factories dos `jest.mock` rodam de novo e devolvem OUTRAS instâncias —
      // os `mockQuery`/`mockClosePool` do topo deste arquivo NUNCA seriam
      // tocados por `main()` rodando isolado. Por isso os mocks são importados
      // DENTRO do callback, antes do script, e as asserções são sobre essas
      // instâncias isoladas (mesmo padrão de `validate-schema.test.js`, que já
      // usa `isolateModulesAsync` nesta suíte).
      await jest.isolateModulesAsync(async () => {
        const connection = await import('../../../scripts/db/connection.js');
        isolatedQuery = connection.query;
        isolatedClosePool = connection.closePool;
        isolatedQuery.mockResolvedValue({ rows: [], rowCount: 5 });

        // Importar o script É invocá-lo como CLI: a guarda chama `main()` sem
        // `await` (o Babel compila como CommonJS e não há top-level await), então
        // a promise flutuante é aguardada pelo flush de macrotask logo abaixo —
        // todos os microtasks do `main()` (readline → query → log → finally)
        // rodam antes do `setTimeout(0)`. O `readline` isolado lê o MESMO
        // `mockAnswer` deste arquivo (closure da factory), que o `beforeEach`
        // fixou em `'s'` — logo o caminho é o da confirmação.
        await import('../../../scripts/clear-musicas.js');
        // `setTimeout(0)` (macrotask) garante que toda a cadeia de microtasks
        // do `main()` flutuante já terminou antes das asserções.
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // A guarda disparou: o DELETE saiu pelo mock do registro isolado, o pool
      // fechou no `finally` e ninguém chegou perto do `process.exit`.
      expect(isolatedQuery).toHaveBeenCalledTimes(1);
      const [sql] = isolatedQuery.mock.calls[0];
      expect(sql).toMatch(/^DELETE\s+FROM\s+musicas\b/i);
      expect(isolatedClosePool).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(logLines().join('\n')).toContain('Tabela de músicas limpa com sucesso');
    } finally {
      process.argv = originalArgv;
    }
  });
});
