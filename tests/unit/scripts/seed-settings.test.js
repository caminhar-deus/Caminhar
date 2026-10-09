import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// `loadEnv()` roda no topo do módulo, antes de qualquer teste: sem este mock,
// o import real tentaria ler/validar os arquivos .env e poluiria (ou quebraria)
// o ambiente do Jest. Por isso o mock é obrigatório aqui.
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

// O script NÃO usa lib/infra/db.js — ele importa { query, closePool } de
// scripts/db/connection.js (caminho relativo ao próprio script). Mockar esse
// módulo exato evita abrir um pool de verdade contra o banco; `closePool`
// precisa existir porque o script o importa, mesmo que o guard de CLI não
// dispare dentro do Jest.
jest.mock('../../../scripts/db/connection.js', () => ({
  query: mockQuery,
  closePool: jest.fn(),
}));

// Prefixo `mock` é o único que o babel-plugin-jest-hoist permite referenciar
// dentro do factory do jest.mock. A mesma instância é reutilizada mesmo após
// os `jest.resetModules()` de cada teste, e o histórico é limpo no afterEach.
const mockQuery = jest.fn();

// Mesma ordem do DEFAULT_SETTINGS no script — usada para provar que SELECT e
// INSERT acontecem chave por chave, na sequência esperada.
const CHAVES_ESPERADAS = [
  'site_name',
  'site_description',
  'posts_per_page',
  'videos_per_page',
  'musicas_per_page',
];

const chavesConsultadas = () =>
  mockQuery.mock.calls
    .filter(([sql]) => sql.includes('SELECT'))
    .map(([, params]) => params[0]);

const chavesInseridas = () =>
  mockQuery.mock.calls
    .filter(([sql]) => sql.includes('INSERT'))
    .map(([, params]) => params[0]);

describe('seed-settings.js — Seed de configurações padrão', () => {
  let seedSettings;

  beforeEach(async () => {
    // resetModules + import dinâmico DENTRO do beforeEach: cada teste recarrega
    // o módulo limpo, sem arrastar estado (ex.: `falhas` acumuladas) do teste
    // anterior. O guard de CLI não dispara no Jest (argv[1] não termina em
    // seed-settings.js), então só a função exportada é executada.
    jest.resetModules();

    ({ default: seedSettings } = await import('../../../scripts/seed-settings.js'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve consultar e inserir as 5 chaves na ordem quando a tabela está vazia', async () => {
    // Tabela vazia: todo SELECT volta sem linhas → o script insere tudo.
    mockQuery.mockResolvedValue({ rows: [] });

    await seedSettings();

    expect(chavesConsultadas()).toEqual(CHAVES_ESPERADAS);
    expect(chavesInseridas()).toEqual(CHAVES_ESPERADAS);
    expect(mockQuery).toHaveBeenCalledTimes(10); // 5 SELECT + 5 INSERT
  });

  it('deve ser idempotente: não insere nada quando as chaves já existem', async () => {
    // SELECT retornando linha = configuração já existe → nenhum INSERT.
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    await seedSettings();

    expect(chavesConsultadas()).toEqual(CHAVES_ESPERADAS);
    expect(chavesInseridas()).toEqual([]);
    expect(mockQuery).toHaveBeenCalledTimes(5); // só os 5 SELECTs
  });

  it('deve rejeitar reportando a falha parcial e ainda consultar as demais chaves', async () => {
    // Só o INSERT de site_description falha. O catch por item acumula a falha
    // e o erro final precisa ser LANÇADO — se voltar a ser engolido, a promise
    // resolve e os asserts abaixo derrubam o teste.
    mockQuery.mockImplementation(async (sql, params) => {
      if (sql.includes('INSERT') && params[0] === 'site_description') {
        throw new Error('connection timeout');
      }
      return { rows: [] };
    });

    const erro = await seedSettings().catch((e) => e);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toContain('Falha ao criar 1 de 5 configurações');
    expect(erro.message).toContain('site_description');
    // As 5 chaves passaram pelo SELECT (inclusive a que falhou no INSERT),
    // ou seja, as outras 4 chegaram a ser consultadas.
    expect(chavesConsultadas()).toEqual(CHAVES_ESPERADAS);
  });

  it('deve rejeitar listando as 5 chaves quando todos os INSERTs falham', async () => {
    // Falha total: todo INSERT rejeita; o resumo final deve citar todas as chaves.
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('INSERT')) {
        throw new Error('banco indisponível');
      }
      return { rows: [] };
    });

    const erro = await seedSettings().catch((e) => e);

    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toContain('Falha ao criar 5 de 5');
    for (const chave of CHAVES_ESPERADAS) {
      expect(erro.message).toContain(chave);
    }
    expect(chavesConsultadas()).toEqual(CHAVES_ESPERADAS);
  });

  it('deve resolver sem lançar no caminho feliz (o catch não pode engolir o erro)', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    // Asserção negativa explícita: no caminho feliz a promise DEVE resolver.
    // Aqui trava o contrato do caminho feliz; a regressão do catch que engolia
    // o erro é derrubada pelos testes de falha parcial e falha total acima.
    await expect(seedSettings()).resolves.not.toThrow();
  });
});
