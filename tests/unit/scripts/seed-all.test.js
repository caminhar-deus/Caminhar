import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Substitui os 2 testes antigos, ambos tautológicos: um chamava
// `libDb.query('SELECT 1')` no PRÓPRIO teste contra o mock de
// `lib/infra/db.js` (módulo que `seed-all.js` nem importa), o outro comparava um
// array literal consigo mesmo — nenhum deles leu o script. E o antigo afirmava
// 3 seeds, enquanto o script tem 4 (`seed-settings.js` incluído).
//
// `pg`/`fs`/`dotenv` também não são mockados aqui (o antigo mockava os três):
// `scripts/db/connection.js` é substituído pelo mock, então o `pg` real nunca é
// carregado, e o `loadEnv()` do topo tem mock próprio.

// Os 4 módulos de seed, mockados ANTES de qualquer execução. Os guards de CLI
// dos próprios seeds (ex.: `seed-posts.js:89`) NÃO protegem aqui: `runSeed`
// importa o módulo e chama a função exportada explicitamente, então sem mock os
// seeds RODARIAM DE VERDADE. `__esModule: true` é obrigatório e não cosmético:
// o `await import(...)` dinâmico de `seed-all.js` é compilado pelo Babel para
// `interopRequireWildcard(require(...))`, e sem a flag o wrapper devolve
// `{ default: { default: fn } }` — `module.default` vira um objeto, o script
// lança "não exporta uma função de seed" e nenhum teste passa. (Provado
// empiricamente: com a flag, o mesmo `jest.fn` chega ao script e ao import
// estático do teste.) O mock SEMPRE é feito por caminho RELATIVO ao teste, que
// resolve para o MESMO arquivo que `path.join(process.cwd(), 'scripts', ...)`
// do script — por isso o `import()` dinâmico com caminho absoluto cai no mock.
jest.mock('../../../scripts/seed-posts.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../scripts/seed-musicas.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../scripts/seed-videos.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../scripts/seed-settings.js', () => ({ __esModule: true, default: jest.fn() }));

// `--clean` chama `execSync('npm run db:reset')` via `await import('child_process')`
// dinâmico — compilado para `require`, o `jest.mock` intercepta (mesma prova
// empírica do `lib/auth/auth.js` no teste de `reset-password.js`).
jest.mock('child_process', () => ({ execSync: jest.fn() }));

// Mock do módulo que o script REAL importa (`scripts/db/connection.js`). A
// factory cria os `jest.fn` nela mesma: referenciar um `const` externo falharia
// com TDZ porque o babel-plugin-jest-hoist move `jest.mock` acima das
// declarações. Os MESMOS objetos chegam ao teste pelo import com alias `mock*`.
jest.mock('../../../scripts/db/connection.js', () => ({
  query: jest.fn(),
  closePool: jest.fn(),
}));

// Mock do load-env (o `loadEnv()` roda no topo do módulo, no import).
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

// Import estático só é possível porque `seed-all.js` tem guarda de CLI: ao ser
// importado ele NÃO executa `main()`. Sem a guarda, o import dispararia
// `seedAll()` já no carregamento do módulo, com o argv do Jest (sem o mock de
// argv ainda aplicado por teste) — e o `closePool()` do `finally` rodaria fora
// de qualquer teste.
import { seedAll, main } from '../../../scripts/seed-all.js';
import {
  query as mockQuery,
  closePool as mockClosePool,
} from '../../../scripts/db/connection.js';
import { execSync as mockExecSync } from 'child_process';
import mockSeedPosts from '../../../scripts/seed-posts.js';
import mockSeedMusicas from '../../../scripts/seed-musicas.js';
import mockSeedVideos from '../../../scripts/seed-videos.js';
import mockSeedSettings from '../../../scripts/seed-settings.js';

// Os 4 seeds na ordem CONTRATADA pelo script (mutação "remover um da lista" ou
// "reordenar" precisa reprovar).
const SEEDS_NA_ORDEM = [
  'seed-posts.js',
  'seed-musicas.js',
  'seed-videos.js',
  'seed-settings.js',
];

// Ordem REAL de execução, derivada de `invocationCallOrder` (não de um array
// reescrito no teste). Um seed nunca chamado fica de fora da lista, o que faz a
// asserção de igualdade reprovar a mutação que o remove do script.
const ordemExecutada = () => {
  const chamados = [
    ['seed-posts.js', mockSeedPosts],
    ['seed-musicas.js', mockSeedMusicas],
    ['seed-videos.js', mockSeedVideos],
    ['seed-settings.js', mockSeedSettings],
  ].filter(([, fn]) => fn.mock.invocationCallOrder.length > 0);

  return chamados
    .sort(([, a], [, b]) => a.mock.invocationCallOrder[0] - b.mock.invocationCallOrder[0])
    .map(([name]) => name);
};

describe('seed-all.js — orquestrador de seeds', () => {
  let logSpy;
  let errorSpy;
  let originalArgv;
  let originalExitCode;

  const logLines = () => logSpy.mock.calls.map((args) => args.join(' '));

  beforeEach(() => {
    // `process.argv` FIXADO: `seedAll` lê `process.argv.includes('--clean')` e,
    // sem isto, um `--clean` acidental (ou um argumento qualquer do CLI do
    // Jest) dispararia o `execSync('npm run db:reset')` de verdade.
    originalArgv = process.argv;
    process.argv = [originalArgv[0], originalArgv[1]];
    // `main()` seta `process.exitCode = 1` no caminho de erro; sem restaurar, o
    // valor vazaría para os demais testes do worker.
    originalExitCode = process.exitCode;

    mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    mockClosePool.mockResolvedValue(undefined);

    // `clearMocks` (jest.config.base.js) zera os CALLS antes de cada teste, mas
    // NÃO zera as IMPLEMENTAÇÕES de um `jest.fn` (isso é `mockReset`; e
    // `restoreMocks` só cobre spies de `spyOn`). Sem o reset explícito abaixo, o
    // `mockExecSync.mockImplementation(throw)` do teste "--clean com execSync
    // falhando" persistiria para os testes seguintes — flakiness latente para
    // qualquer teste futuro que use `--clean`.
    mockExecSync.mockReset();
    mockExecSync.mockImplementation(() => undefined);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('caminho feliz: SELECT 1 uma vez, os 4 seeds na ordem e o pool fechado', async () => {
    await main();

    // Checagem de banco ANTES de semear: exatamente 1 chamada, e o SQL vem do
    // argumento RECEBIDO pelo mock — não é reescrito como literal executado no
    // teste (o teste antigo fazia isso e provava nada).
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/^\s*SELECT\s+1\s*$/i);

    // Contrato da ordem dos 4 seeds (inclui `seed-settings.js`, que o teste
    // antigo esquecia): os 4 chamados, uma vez cada, na sequência exata.
    expect(ordemExecutada()).toEqual(SEEDS_NA_ORDEM);
    expect(mockSeedPosts).toHaveBeenCalledTimes(1);
    expect(mockSeedMusicas).toHaveBeenCalledTimes(1);
    expect(mockSeedVideos).toHaveBeenCalledTimes(1);
    expect(mockSeedSettings).toHaveBeenCalledTimes(1);

    // `closePool` mora no `finally` de `main()` — 1× no caminho feliz.
    expect(mockClosePool).toHaveBeenCalledTimes(1);
    // Sem `--clean` fixado, o reset NÃO pode acontecer.
    expect(mockExecSync).not.toHaveBeenCalled();
    // Sucesso: `main()` não toca no exitCode.
    expect(process.exitCode).toBe(originalExitCode);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logLines().join('\n')).toContain('Todos os seeds foram executados');
  });

  it('banco indisponível: seedAll rejeita e NENHUM seed é chamado', async () => {
    mockQuery.mockRejectedValueOnce(new Error('pool indisponível'));

    await expect(seedAll()).rejects.toThrow('Abortando seeds devido a erro de conexão com o banco');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockSeedPosts).not.toHaveBeenCalled();
    expect(mockSeedMusicas).not.toHaveBeenCalled();
    expect(mockSeedVideos).not.toHaveBeenCalled();
    expect(mockSeedSettings).not.toHaveBeenCalled();
    // A checagem falhou ANTES de semear; o pool fecha só no `finally` de `main`.
    expect(mockClosePool).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.map((a) => a.join(' ')).join('\n')).toContain('não está acessível');
  });

  it("--clean: execSync reseta o banco e os seeds rodam DEPOIS do reset", async () => {
    process.argv.push('--clean');

    await seedAll();

    expect(mockExecSync).toHaveBeenCalledTimes(1);
    expect(mockExecSync).toHaveBeenCalledWith('npm run db:reset', { stdio: 'inherit' });
    // Os seeds rodam DEPOIS do reset — ordem real via invocationCallOrder, não
    // a mera presença das duas chamadas.
    expect(mockExecSync.mock.invocationCallOrder[0]).toBeLessThan(
      mockSeedPosts.mock.invocationCallOrder[0]
    );
    expect(ordemExecutada()).toEqual(SEEDS_NA_ORDEM);
    // Depois do reset, o fluxo segue normal: SELECT 1 + 4 seeds.
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/^\s*SELECT\s+1\s*$/i);
    expect(logLines().join('\n')).toContain('resetado com sucesso');
  });

  it('--clean com execSync falhando: o erro propaga com a mensagem correta e nenhum seed roda', async () => {
    process.argv.push('--clean');
    mockExecSync.mockImplementation(() => {
      throw new Error('npm ERR! lifecycle db:reset');
    });

    await expect(seedAll()).rejects.toThrow('Falha ao resetar o banco de dados');

    // O reset falhou ANTES da checagem de banco e da semeadura.
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSeedPosts).not.toHaveBeenCalled();
    expect(mockSeedMusicas).not.toHaveBeenCalled();
    expect(mockSeedVideos).not.toHaveBeenCalled();
    expect(mockSeedSettings).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.map((a) => a.join(' ')).join('\n')).toContain('Falha ao resetar');
  });

  it('um seed falhando: a rejeição propaga e o seed seguinte NÃO roda', async () => {
    mockSeedVideos.mockRejectedValueOnce(new Error('seed-videos explodiu'));

    await expect(seedAll()).rejects.toThrow('seed-videos explodiu');

    // A falha interrompe o laço: posts e musicas rodaram, videos tentou e
    // settings (o 4º) nunca é chamado.
    expect(ordemExecutada()).toEqual([
      'seed-posts.js',
      'seed-musicas.js',
      'seed-videos.js',
    ]);
    expect(mockSeedSettings).not.toHaveBeenCalled();
    expect(mockClosePool).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.map((a) => a.join(' ')).join('\n')).toContain(
      'Erro durante a execução dos seeds'
    );
  });

  it('main() com falha: loga, seta exitCode = 1 e AINDA fecha o pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('pool indisponível'));

    await main();

    expect(process.exitCode).toBe(1);
    // Semântica do `finally` em JS: roda quando o `try` completa ou lança. A
    // asserção cobre a mutação "remover o `closePool` do `finally` de `main`".
    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(mockSeedPosts).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.map((a) => a.join(' ')).join('\n')).toContain(
      'Erro durante a execução dos seeds'
    );
  });

  // -------------------------------------------------------------------------
  // Guarda de CLI — a OUTRA metade do contrato, que um teste de mutação
  // independente expôs como furo de cobertura (26 mutações; a única
  // sobrevivente era desligar a guarda).
  // -------------------------------------------------------------------------
  // O argv do Jest nunca termina em `seed-all.js`, então o import estático do
  // topo desta suíte só prova o lado NEGATIVO da guarda (ela NÃO dispara em
  // importação): sem a guarda, o import dispararia `seedAll()` já no
  // carregamento do módulo, fora de qualquer teste. Esse lado é implícito no
  // fato de a suíte entrar em verde — registrado aqui de propósito, não precisa
  // de teste próprio.
  // O lado POSITIVO é o teste abaixo: com `argv[1]` apontando para o script, a
  // guarda precisa DISPARAR `main()`. Sem ele, trocar a guarda por `if (false)`
  // transforma `npm run seed:all` num no-op silencioso (exit 0, nada semeado) e
  // nenhum teste reprova.
  it('guarda de CLI: argv[1] terminando em seed-all.js dispara main()', async () => {
    // `afterEach` restaura o argv original capturado no `beforeEach`; aqui ele
    // só é sobrescrito para simular a invocação CLI real (SEM `--clean`, para o
    // `execSync('npm run db:reset')` não ser nem tentado).
    process.argv = [process.argv[0], '/stub/cli/seed-all.js'];

    let isolatedQuery;
    let isolatedClosePool;
    let isolatedExecSync;
    let isolatedSeeds;

    // `jest.isolateModulesAsync` cria um registro de módulos NOVO: as factories
    // dos `jest.mock` rodam de novo e devolvem OUTRAS instâncias — os
    // `mock*` do topo deste arquivo NUNCA seriam tocados por `main()` rodando
    // isolado. Por isso os mocks são importados DENTRO do callback, antes do
    // script, e as asserções são sobre essas instâncias isoladas (mesmo padrão
    // de `validate-schema.test.js`).
    await jest.isolateModulesAsync(async () => {
      const connection = await import('../../../scripts/db/connection.js');
      isolatedQuery = connection.query;
      isolatedClosePool = connection.closePool;
      isolatedQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const childProcess = await import('child_process');
      isolatedExecSync = childProcess.execSync;

      // Os 4 seeds mockados, na ordem do script — o `runSeed` importa cada um
      // por caminho ABSOLUTO (`path.join(process.cwd(), 'scripts', …)`), que
      // resolve para o MESMO arquivo destes mocks relativos (o import dinâmico
      // com `__esModule: true` já é provado pelos testes acima).
      const seedPosts = await import('../../../scripts/seed-posts.js');
      const seedMusicas = await import('../../../scripts/seed-musicas.js');
      const seedVideos = await import('../../../scripts/seed-videos.js');
      const seedSettings = await import('../../../scripts/seed-settings.js');
      isolatedSeeds = [seedPosts.default, seedMusicas.default, seedVideos.default, seedSettings.default];

      // Importar o script É invocá-lo como CLI: a guarda chama `main()` sem
      // `await` (Babel/CJS não suporta top-level await), então a promise
      // flutuante é aguardada pelo flush de macrotask logo abaixo — todos os
      // microtasks do `main()` (SELECT 1 → 4 seeds → finally) rodam antes.
      await import('../../../scripts/seed-all.js');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // A guarda disparou: a checagem de banco e os 4 seeds saíram pelo registro
    // isolado, o pool fechou no `finally`, o exitCode intocado e o `--clean`
    // (ausente do argv acima) nunca foi tentado.
    expect(isolatedQuery).toHaveBeenCalledTimes(1);
    const [sql] = isolatedQuery.mock.calls[0];
    expect(sql).toMatch(/^\s*SELECT\s+1\s*$/i);
    for (const seedFn of isolatedSeeds) {
      expect(seedFn).toHaveBeenCalledTimes(1);
    }
    // Ordem real de execução (invocationCallOrder), não um array reescrito.
    const callOrder = isolatedSeeds.map((fn) => fn.mock.invocationCallOrder[0]);
    expect([...callOrder].sort((a, b) => a - b)).toEqual(callOrder);
    expect(isolatedClosePool).toHaveBeenCalledTimes(1);
    expect(isolatedExecSync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(originalExitCode);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logLines().join('\n')).toContain('Todos os seeds foram executados');
  });
});
