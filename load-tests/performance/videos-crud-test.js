import { createCrudTest, generateReport } from '../helpers/resource-test-runner.js';
import { setup } from '../helpers/auth.js';
import { BASE_URL } from '../helpers/config.js';
import http from 'k6/http';
import { check } from 'k6';

const resourceConfig = {
  adminEndpoint: '/api/admin/videos',
  payloadTemplate: (uniqueId) => ({
    url_youtube: `https://www.youtube.com/watch?v=${String(Math.random()).padStart(11, '0').slice(-11)}`,
    titulo: `Video de Teste K6 ${uniqueId}`,
    descricao: 'Descrição do vídeo de teste automatizado.',
    publicado: false,
  }),
  resourceName: 'videos',
  uniqueIdGenerator: () => `${__VU}-${__ITER}-${Date.now()}`,
  profileName: 'light',
  optionsOverrides: {
    stages: [
      { duration: '10s', target: 3 },
      { duration: '20s', target: 3 },
      { duration: '5s', target: 0 },
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

  // Limpeza: apaga vídeos K6 fantasmas deixados por VUs interrompidos
  //
  // POR QUE check AQUI: o teardown não tinha `check` nenhum, então uma
  // limpeza que falhasse (listagem ou delete fora do esperado) deixaria lixo
  // "K6" no banco SEM reprovar a execução. O `checks: ['rate==1.0']` do
  // perfil `light` (via createCrudTest) já cobre as requisições do teardown.
  const res = http.get(`${BASE_URL}/api/admin/videos?limit=100`, { headers: authHeaders });
  check(res, {
    'Teardown (listagem de vídeos K6): status é 200': (r) => r.status === 200,
  });
  if (res.status === 200) {
    const body = res.json();
    // Schema real da API admin: { data: [...], pagination: {...} }
    const videos = body.data || body.videos || [];
    for (const video of videos) {
      if (video.titulo && video.titulo.includes('K6')) {
        // 200 = removido; 404 = já não existe (limpeza cumprida);
        // qualquer outro status reprova a execução.
        check(
          http.del(`${BASE_URL}/api/admin/videos`, JSON.stringify({ id: video.id }), { headers: authHeaders }),
          {
            'Teardown (delete de vídeo K6): status é 200 ou 404': (r) => r.status === 200 || r.status === 404,
          },
        );
      }
    }
  }
}

export function handleSummary(data) {
  return generateReport(data, crudTest.reportName);
}