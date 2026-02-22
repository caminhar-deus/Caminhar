import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Este é um teste funcional, não de carga. Executa apenas 1 vez com 1 usuário.
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
    http_req_duration: ['p(100)<10000'], // Backup pode ser lento, damos 10s de limite
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

  console.log('📥 Iniciando download do backup...');

  // responseType: 'binary' é crucial para manipularmos os bytes do arquivo
  const res = http.get(`${BASE_URL}/api/v1/backup`, {
    headers: headers,
    responseType: 'binary', 
    tags: { type: 'backup_download' },
  });

  // Verificação dos Magic Bytes do GZIP (0x1F 0x8B)
  let isGzip = false;
  if (res.body && res.body.byteLength >= 2) {
    const view = new Uint8Array(res.body);
    // 0x1F = 31, 0x8B = 139
    if (view[0] === 0x1f && view[1] === 0x8b) {
      isGzip = true;
    }
  }

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Header Content-Type correto': (r) => {
      const cType = r.headers['Content-Type'] || r.headers['content-type'];
      return cType && (cType.includes('gzip') || cType.includes('octet-stream'));
    },
    'Arquivo não está vazio': (r) => r.body && r.body.byteLength > 0,
    'Assinatura GZIP válida (Magic Bytes 1F 8B)': () => isGzip,
  });

  if (isGzip) {
    console.log(`✅ Backup validado! Tamanho: ${(res.body.byteLength / 1024).toFixed(2)} KB`);
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