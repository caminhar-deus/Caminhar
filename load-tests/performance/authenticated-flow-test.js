import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { setup } from '../helpers/auth.js';
import { BASE_URL } from '../helpers/config.js';
import { generateReport } from '../helpers/report.js';

export const options = {
  stages: [
    { duration: '10s', target: 3 },
    { duration: '20s', target: 3 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'checks{flow:get_settings}': ['rate>0.90'],
    'http_req_failed': ['rate<0.15'],
  },
};

export { setup };

export default function (data) {
  const token = data && data.token;
  if (!token) {
    console.error('Token não disponível — setup pode ter falhado');
    return;
  }

  // Endpoint /api/settings?key=site_name existe e requer autenticação JWT
  const settingsRes = http.get(`${BASE_URL}/api/settings?key=site_name`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { flow: 'get_settings' },
  });

  check(settingsRes, {
    'acesso à rota protegida bem-sucedido (200)': (r) => r.status === 200,
  }, { flow: 'get_settings' });

  if (settingsRes.status !== 200) {
    console.error(`Falha ao acessar settings: Status ${settingsRes.status} - Body: ${settingsRes.body.substring(0, 200)}`);
  }

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'authenticated_flow_test');
}