import { createCrudTest, sanitizeToken, generateReport } from './helpers/resource-test-runner.js';
import { setup } from './helpers/auth.js';

const resourceConfig = {
  adminEndpoint: '/api/admin/musicas',
  payloadTemplate: () => ({
    titulo: `Música Load Test ${Date.now()}`,
    artista: 'Artista K6',
    descricao: 'Teste de carga automatizado',
    url_spotify: 'https://open.spotify.com/track/testk6',
    publicado: true,
  }),
  resourceName: 'musicas',
  uniqueIdGenerator: () => `${Date.now()}`,
  profileName: 'light',
  optionsOverrides: {
    stages: [
      { duration: '10s', target: 5 },
      { duration: '20s', target: 5 },
      { duration: '10s', target: 0 },
    ],
  },
};

const crudTest = createCrudTest(resourceConfig);

export const options = crudTest.options;
export { setup };

export default crudTest.default;

export function handleSummary(data) {
  return generateReport(sanitizeToken(data), crudTest.reportName);
}