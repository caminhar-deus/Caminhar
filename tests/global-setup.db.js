/**
 * Global Setup para Testes com PostgreSQL Real via Testcontainers.
 * 
 * Inicializa um container PostgreSQL antes de todos os testes
 * e disponibiliza a string de conexão via process.env.TEST_DATABASE_URL.
 */
import { PostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Imagem padrão do PostgreSQL para os testes de container.
 *
 * `@testcontainers/postgresql@12` exige a imagem EXPLICITAMENTE no construtor
 * (`constructor(image: string)` — sem default): `new PostgreSqlContainer()`
 * passava `undefined` para `ImageName.fromString()` e explodia com
 * `TypeError: Cannot read properties of undefined (reading 'split')`, que o
 * catch abaixo convertia em "Docker indisponível" (diagnóstico falso — o
 * Docker existe e está rodando).
 *
 * Tag escolhida por paridade com o serviço `postgres` do CI
 * (`.github/workflows/test-base.yml` → `image: postgres:15`).
 */
const POSTGRES_IMAGE = 'postgres:15';

/**
 * Heurística para distinguir "Docker ausente/inacessível" de
 * "falha ao iniciar o container" (imagem, porta, healthcheck, etc.).
 *
 * @param {unknown} error
 * @returns {true|false}
 */
function isDockerUnavailable(error) {
  const code = error?.code || '';
  const message = String(error?.message || '');

  // Socket do daemon inacessível: docker parado ou não instalado
  if (code === 'ENOENT' || code === 'ECONNREFUSED') return true;

  return /cannot connect to docker|docker daemon|docker\.sock|docker: not found|docker desktop/i.test(message);
}

export default async function globalSetup() {
  // Verificar se Docker está disponível
  try {
    const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
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
    // `error.message` sozinho não diagnóstica: registra o stack completo.
    console.error('❌ Falha ao iniciar container PostgreSQL:', error?.stack || error);
    console.log(
      isDockerUnavailable(error)
        ? '⚠️ Testes com banco real serão ignorados (Docker ausente/inacessível)'
        : '⚠️ Testes com banco real serão ignorados (falha ao iniciar o container — ver stack acima)',
    );
    // Sentinela mantida: as suítes *.db.test.js se auto-skippam com este valor.
    process.env.TEST_DATABASE_URL = '__docker_unavailable__';
  }
}
