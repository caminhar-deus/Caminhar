import http from 'k6/http';
import { check } from 'k6';
import { createCrudTest, generateReport } from '../helpers/resource-test-runner.js';
import { setup } from '../helpers/auth.js';
import { BASE_URL } from '../helpers/config.js';

const resourceConfig = {
  adminEndpoint: '/api/admin/musicas',
  payloadTemplate: (uniqueId) => ({
    titulo: `Música Load Test K6 ${uniqueId}`,
    artista: 'Artista K6',
    descricao: 'Teste de carga automatizado',
    url_spotify: 'https://open.spotify.com/track/testk6',
    published: true,
  }),
  resourceName: 'musicas',
  uniqueIdGenerator: () => `${__VU}-${__ITER}-${Date.now()}`,
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
  //
  // POR QUE check AQUI: o teardown não tinha `check` nenhum, então uma
  // limpeza que falhasse (listagem ou delete fora do esperado) deixaria lixo
  // "K6" no banco SEM reprovar a execução. O `checks: ['rate==1.0']` do
  // perfil `light` (via createCrudTest) já cobre as requisições do teardown.
  const res = http.get(`${BASE_URL}/api/admin/musicas?limit=100`, { headers: authHeaders });
  check(res, {
    'Teardown (listagem de músicas K6): status é 200': (r) => r.status === 200,
  });
  if (res.status === 200) {
    const body = res.json();
    const musicas = body.musicas || body.data || [];
    for (const musica of musicas) {
      if (musica.titulo && musica.titulo.includes('K6')) {
        // 200 = removido; 404 = já não existe (limpeza cumprida);
        // qualquer outro status reprova a execução.
        check(
          http.del(`${BASE_URL}/api/admin/musicas`, JSON.stringify({ id: musica.id }), { headers: authHeaders }),
          {
            'Teardown (delete de música K6): status é 200 ou 404': (r) => r.status === 200 || r.status === 404,
          },
        );
      }
    }
  }
}

export function handleSummary(data) {
  return generateReport(data, crudTest.reportName);
}
