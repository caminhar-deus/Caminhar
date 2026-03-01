import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Este é um teste funcional, não de carga. Executa apenas 1 vez com 1 usuário.
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status} ${loginRes.body}`);
  }

  return { token: loginRes.json('data.token') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
  };

  console.log('📥 Verificando listagem de backups...');

  // A API atual suporta apenas listagem, não download direto via parâmetro GET
  const res = http.get(`${BASE_URL}/api/admin/backups`, {
    headers: headers,
    tags: { type: 'backup_list' },
  });

  // Validação da resposta JSON
  let hasBackups = false;
  let hasLatest = false;
  
  try {
    const body = res.json();
    hasBackups = Array.isArray(body.backups);
    hasLatest = body.latest === null || (typeof body.latest === 'object' && body.latest.name);
    
    if (hasBackups && body.backups.length > 0) {
      console.log(`✅ Encontrados ${body.backups.length} backups. Último: ${body.latest ? body.latest.name : 'Nenhum'}`);
    }
  } catch (e) {
    console.error('Erro ao fazer parse do JSON:', e);
  }

  const success = check(res, {
    'Status é 200': (r) => r.status === 200,
    'Header Content-Type correto': (r) => {
      const cType = r.headers['Content-Type'] || r.headers['content-type'];
      return cType && cType.includes('application/json');
    },
    'Retornou lista de backups': () => hasBackups,
    'Estrutura de "latest" válida': () => hasLatest,
  });

  if (!success) {
    console.log(`❌ Falha na verificação. Status: ${res.status}. Body: ${res.body}`);
  }
}

export function handleSummary(data) {
  if (data.setup_data && data.setup_data.token) {
    data.setup_data.token = "*** TOKEN OCULTO ***";
  }
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/backup_verification_test.json': JSON.stringify(data, null, 4),
  };
}