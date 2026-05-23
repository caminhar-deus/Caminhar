import { createCrudTest, generateReport } from './helpers/resource-test-runner.js';
import { setup } from './helpers/auth.js';
import { BASE_URL } from './helpers/config.js';
import http from 'k6/http';

const resourceConfig = {
  adminEndpoint: '/api/admin/videos',
  payloadTemplate: () => ({
    url_youtube: `https://www.youtube.com/watch?v=${String(Math.random()).padStart(11, '0').slice(-11)}`,
    titulo: `Video de Teste K6 ${__VU}-${__ITER}`,
    descricao: 'Descrição do vídeo de teste automatizado.',
    publicado: false,
  }),
  resourceName: 'videos',
  uniqueIdGenerator: () => `${__VU}-${__ITER}`,
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
  const res = http.get(`${BASE_URL}/api/admin/videos?limit=100`, { headers: authHeaders });
  if (res.status === 200) {
    const body = res.json();
    const videos = body.videos || body.data || [];
    for (const video of videos) {
      if (video.titulo && video.titulo.includes('K6')) {
        http.del(`${BASE_URL}/api/admin/videos`, JSON.stringify({ id: video.id }), { headers: authHeaders });
      }
    }
  }
}

export function handleSummary(data) {
  return generateReport(data, crudTest.reportName);
}