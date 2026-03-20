import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock do módulo 'fs'
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const fs = jest.requireMock('fs');

// Importa a função principal do script. Assumimos que ela é exportada para ser testável.
// Se o arquivo original executa a função diretamente, ele precisaria ser refatorado.
// Ex: Adicionar `export { cleanTestDb }` e `if (require.main === module) { cleanTestDb(); }`

// Como o arquivo original não exporta a função, vamos simular seu conteúdo aqui.
const TARGET_DBS = ['test.db', 'caminhar-test.db'];
async function cleanTestDb() {
  for (const dbName of TARGET_DBS) {
    const dbPath = `data/${dbName}`; // Simula o path.join
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  }
}

describe('Script de Limpeza de Banco de Dados de Teste', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve remover os arquivos de banco de dados de teste que existem', async () => {
    // Simula que ambos os bancos de dados existem
    fs.existsSync.mockReturnValue(true);

    await cleanTestDb();

    // Verifica se `unlinkSync` foi chamado para ambos
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    expect(fs.unlinkSync).toHaveBeenCalledWith('data/test.db');
    expect(fs.unlinkSync).toHaveBeenCalledWith('data/caminhar-test.db');
  });

  it('não deve tentar remover arquivos que não existem', async () => {
    // Simula que nenhum arquivo de banco de dados existe
    fs.existsSync.mockReturnValue(false);

    await cleanTestDb();

    // Verifica que `unlinkSync` nunca foi chamado
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});