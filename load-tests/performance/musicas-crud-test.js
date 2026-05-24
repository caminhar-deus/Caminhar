import http from 'k6/http';
import { createCrudTest, generateReport } from '../helpers/resource-test-runner.js';
import { setup } from '../helpers/auth.js';
import { BASE_URL } from '../helpers/config.js';

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

export function teardown(data) {
  if (!data || !data.token) return;

  const authHeaders = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Limpeza: apaga músicas K6 fantasmas deixadas por VUs interrompidos
  const res = http.get(`${BASE_URL}/api/admin/musicas?limit=100`, { headers: authHeaders });
  if (res.status === 200) {
    const body = res.json();
    const musicas = body.musicas || body.data || [];
    for (const musica of musicas) {
      if (musica.titulo && musica.titulo.includes('K6')) {
        http.del(`${BASE_URL}/api/admin/musicas`, JSON.stringify({ id: musica.id }), { headers: authHeaders });
      }
    }
  }
}

export function handleSummary(data) {
  return generateReport(data, crudTest.reportName);
}
