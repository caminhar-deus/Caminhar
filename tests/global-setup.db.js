/**
 * Global Setup para Testes com PostgreSQL Real via Testcontainers.
 * 
 * Inicializa um container PostgreSQL antes de todos os testes
 * e disponibiliza a string de conexão via process.env.TEST_DATABASE_URL.
 */
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalSetup() {
  // Verificar se Docker está disponível
  try {
    const container = await new PostgreSqlContainer()
      .withDatabase('caminhar_test')
      .withUsername('test')
      .withPassword('test')
      .withReuse(true) // Reutilizar container entre execuções para performance
      .start();

    const connectionString = container.getConnectionUri();

    // Disponibilizar a string para os testes via variável de ambiente
    process.env.TEST_DATABASE_URL = connectionString;

    // Salvar referência do container para teardown
    global.__TEST_DB_CONTAINER__ = container;

    console.log(`✅ Container PostgreSQL iniciado em: ${connectionString}`);
  } catch (error) {
    console.error('❌ Falha ao iniciar container PostgreSQL:', error.message);
    console.log('⚠️ Testes com banco real serão ignorados (Docker indisponível)');
    process.env.TEST_DATABASE_URL = '__docker_unavailable__';
  }
}