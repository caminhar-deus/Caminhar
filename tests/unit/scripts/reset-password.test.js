import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// NÃO há mocks de `pg`, `fs`, `dotenv/config` nem de `lib/infra/db.js` aqui
// (existiam nos testes antigos): o script não importa nenhum deles — eram mocks
// mortos. E os testes antigos reescreviam o UPDATE/INSERT como literais e
// chamavam `libDb.query(...)` no PRÓPRIO teste, provando apenas que um
// `jest.fn` funciona; o SQL nunca passava pelo script. Nenhum sandbox de fs é
// necessário: `reset-password.js` não toca disco, e não há prompt (logo, nenhum
// mock de `readline`).

// Mock do módulo que o script REAL importa (`scripts/db/connection.js`).
// A factory cria os `jest.fn` nela mesma: referenciar um `const` externo
// falharia com TDZ ("Cannot access 'mockQuery' before initialization") porque o
// babel-plugin-jest-hoist move `jest.mock` acima das declarações. Os MESMOS
// objetos chegam ao teste pelo import com alias `mock*` mais abaixo.
jest.mock('../../../scripts/db/connection.js', () => ({
  query: jest.fn(),
  closePool: jest.fn(),
}));

// Mock de `lib/auth/auth.js`, importado pelo script com `await import(...)`
// DINÂMICO. O Babel compila esse import para `require`, então o `jest.mock`
// continua interceptando (prova empírica da rodada anterior). A implementação
// (hash fixo) é definida no `beforeEach`, para não duplicar a string mágica
// dentro da factory hoistada.
jest.mock('../../../lib/auth/auth.js', () => ({
  hashPassword: jest.fn(),
}));

// Mock do load-env
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

// Import estático só é possível porque `reset-password.js` tem guarda de CLI: ao
// ser importado ele NÃO executa `resetPassword()` nem `main()`. Sem a guarda, a
// chamada top-level antiga rodaria já no import e, com o argv do Jest (sem
// senha), chamaria `process.exit(1)` DE VERDADE e mataria o worker do Jest.
// O mock de `lib/auth/auth.js` é acessado por `await import(...)` DINÂMICO no
// `beforeEach` (mesma forma do teste antigo), e não por um import estático.
import { resetPassword, main } from '../../../scripts/reset-password.js';
import {
  query as mockQuery,
  closePool as mockClosePool,
} from '../../../scripts/db/connection.js';

// Hash fixo devolvido pelo `hashPassword` mockado.
const HASHED = '$2b$10$hashed_password_string';

describe('reset-password.js — redefinição de senha', () => {
  let logSpy;
  let errorSpy;
  let exitSpy;
  let originalArgv;
  // Mesmo `jest.fn` da factory do `jest.mock` acima — obtido por import dinâmico.
  let mockHashPassword;

  const logLines = () => logSpy.mock.calls.map((args) => args.join(' '));
  const errorLines = () => errorSpy.mock.calls.map((args) => args.join(' '));

  beforeEach(async () => {
    ({ hashPassword: mockHashPassword } = await import('../../../lib/auth/auth.js'));
    // Argumentos posicionais ZERADOS: os defaults de `resetPassword` leem
    // `process.argv[2]/[3]` e, sem isto, o teste dependeria de como o Jest foi
    // invocado (ex.: `jest a.test.js b.test.js` colocaria um caminho de arquivo
    // em `argv[3]` e a senha deixaria de ser "ausente").
    originalArgv = process.argv;
    process.argv = [originalArgv[0], originalArgv[1]];

    mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    mockClosePool.mockResolvedValue(undefined);
    mockHashPassword.mockResolvedValue(HASHED);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Um `process.exit` real encerraria a suíte inteira; um `exit` burro (noop)
    // deixaria o fluxo continuar de um jeito que em produção nunca aconteceria.
    // Lançar um erro sentinela interrompe o fluxo no mesmo ponto do `exit` real
    // e mantém o teste determinístico — sem poll de microtasks.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('sem senha: loga o uso, sai com 1 e NEM query nem closePool são chamados', async () => {
    // `newPassword` cai no default `process.argv[3]` (zerado acima) → indefinido.
    await expect(resetPassword('admin')).rejects.toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorLines().join('\n')).toContain('nova senha');
    expect(logLines().join('\n')).toContain('Uso:');
    expect(mockQuery).not.toHaveBeenCalled();
    // O `process.exit(1)` da senha ausente ocorre ANTES do `try`: o `finally`
    // (único lugar que chama `closePool`) NUNCA roda neste ramo. Diferente do
    // caminho de erro do `catch`, que sim fecha o pool no teste lá embaixo.
    expect(mockClosePool).not.toHaveBeenCalled();
  });

  it('senha + rowCount > 0: UPDATE uma vez (sem INSERT), fecha o pool e não sai', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    await resetPassword('jose', 'senha-segura');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    // Asserções sobre o argumento RECEBIDO pelo mock — o SQL vive só no script,
    // não é reescrito como literal aqui (o teste antigo fazia isso e provava
    // nada).
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/^UPDATE\s+users\b/i);
    expect(sql).toContain('password = $1');
    expect(sql).toContain('username = $2');
    expect(params).toEqual([HASHED, 'jose']);
    expect(sql).not.toMatch(/INSERT/i);

    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('senha + rowCount === 0: UPDATE seguido de INSERT com role admin', async () => {
    // 1ª chamada (UPDATE) não afeta linha; a 2ª (INSERT) usa o default acima.
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await resetPassword('user', 'senha-segura');

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [updateSql] = mockQuery.mock.calls[0];
    expect(updateSql).toMatch(/^UPDATE\s+users\b/i);

    // Contrato do teste: o fallback cria o usuário com role `'admin'`.
    // Os valores vêm dos `mock.calls` capturados, não de um literal reescrito.
    const [insertSql, insertParams] = mockQuery.mock.calls[1];
    expect(insertSql).toMatch(/^INSERT\s+INTO\s+users\b/i);
    expect(insertParams).toEqual(['user', HASHED, 'admin']);

    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('query rejeitada: loga o erro, NÃO chama process.exit e AINDA fecha o pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('pool indisponível'));

    // Fidelidade ao script: o `catch` SÓ loga (diferente dos clear-*.js, que
    // chamam `process.exit(1)`) — a promise resolve normalmente.
    await expect(resetPassword('jose', 'senha-segura')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorLines()[0]).toContain('Erro ao atualizar senha');
    expect(errorLines()[0]).toContain('pool indisponível');
    expect(exitSpy).not.toHaveBeenCalled();

    // Semântica do `finally` em JS: o bloco roda MESMO quando o `try` LANÇOU —
    // e foi o caso exato deste teste (o `query` rejeitou logo acima) —, e o
    // pool é fechado. A asserção cobre a mutação "remover o
    // `finally { await closePool(); }`".
    expect(mockClosePool).toHaveBeenCalledTimes(1);
  });

  it('hashPassword recebe a senha CRUA e o hash resultante vai para o banco', async () => {
    await resetPassword('maria', 'minha_senha');

    expect(mockHashPassword).toHaveBeenCalledTimes(1);
    expect(mockHashPassword).toHaveBeenCalledWith('minha_senha');

    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(HASHED);
  });

  it("main() sem argumentos: usuário cai no default 'admin' e a senha vem do argv", async () => {
    // `argv[2]` indefinido → `|| 'admin'`; `argv[3]` fornecido para passar da
    // guarda de senha ausente. O índice 2 é pulado de propósito (hole → undefined).
    process.argv[3] = 'senha_do_argv';

    await main();

    expect(mockHashPassword).toHaveBeenCalledWith('senha_do_argv');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/^UPDATE\s+users\b/i);
    expect(params).toEqual([HASHED, 'admin']);
    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Guarda de CLI — a OUTRA metade do contrato, que um teste de mutação
  // independente expôs como furo de cobertura (26 mutações; a única
  // sobrevivente era desligar a guarda).
  // -------------------------------------------------------------------------
  // O argv do Jest nunca termina em `reset-password.js`, então o import estático
  // do topo desta suíte só prova o lado NEGATIVO da guarda (ela NÃO dispara em
  // importação): sem a guarda, o import antigo dispararia `resetPassword()` e o
  // `process.exit(1)` DE VERDADE (argv do Jest sem senha) mataria o worker — a
  // suíte só existe porque isso não acontece. Esse lado é implícito no fato de
  // a suíte entrar em verde — registrado aqui de propósito, não precisa de
  // teste próprio.
  // O lado POSITIVO é o teste abaixo: com `argv[1]` apontando para o script, a
  // guarda precisa DISPARAR `main()`. Sem ele, trocar a guarda por `if (false)`
  // transforma `npm run db:reset:password` num no-op silencioso (exit 0, senha
  // não trocada) e nenhum teste reprova.
  it('guarda de CLI: argv[1] terminando em reset-password.js dispara main()', async () => {
    // `afterEach` restaura o argv original capturado no `beforeEach`; aqui ele
    // só é sobrescrito para simular a invocação CLI real.
    process.argv = [process.argv[0], '/stub/cli/reset-password.js', 'joana', 'senha_do_cli'];

    let isolatedQuery;
    let isolatedClosePool;
    let isolatedHashPassword;

    // `jest.isolateModulesAsync` cria um registro de módulos NOVO: as factories
    // dos `jest.mock` rodam de novo e devolvem OUTRAS instâncias — os
    // `mockQuery`/`mockClosePool`/`mockHashPassword` do topo deste arquivo
    // NUNCA seriam tocados por `main()` rodando isolado. Por isso os mocks são
    // importados DENTRO do callback, antes do script, e as asserções são sobre
    // essas instâncias isoladas (mesmo padrão de `validate-schema.test.js`).
    await jest.isolateModulesAsync(async () => {
      const connection = await import('../../../scripts/db/connection.js');
      isolatedQuery = connection.query;
      isolatedClosePool = connection.closePool;
      isolatedQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      // Mesmo `lib/auth/auth.js` que o script carrega por `await import(...)`
      // dinâmico: compilado para `require`, o `jest.mock` intercepta, e dentro
      // do registro isolado o script enxerga ESTA instância.
      const auth = await import('../../../lib/auth/auth.js');
      isolatedHashPassword = auth.hashPassword;
      isolatedHashPassword.mockResolvedValue(HASHED);

      // Importar o script É invocá-lo como CLI: a guarda chama `main()` sem
      // `await` (Babel/CJS não suporta top-level await), então a promise
      // flutuante é aguardada pelo flush de macrotask logo abaixo — todos os
      // microtasks do `main()` (import do auth → hash → query → finally) rodam
      // antes do `setTimeout`.
      await import('../../../scripts/reset-password.js');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // A guarda disparou: o argv acima chegou ao `resetPassword()` (defaults da
    // assinatura), o hash foi gerado, o UPDATE saiu pelo mock isolado e o pool
    // fechou no `finally` — sem `process.exit`.
    expect(isolatedHashPassword).toHaveBeenCalledTimes(1);
    expect(isolatedHashPassword).toHaveBeenCalledWith('senha_do_cli');
    expect(isolatedQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = isolatedQuery.mock.calls[0];
    expect(sql).toMatch(/^UPDATE\s+users\b/i);
    expect(params).toEqual([HASHED, 'joana']);
    expect(isolatedClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
