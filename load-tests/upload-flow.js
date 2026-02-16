import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 3 },   // Ramp-up para 3 usuários
    { duration: '10s', target: 3 },  // Mantém carga constante
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Uploads podem ser mais lentos, limite de 2s
    'checks{flow:upload}': ['rate>0.95'], // Taxa de sucesso > 95%
  },
};

const BASE_URL = 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

// Imagem PNG 1x1 pixel (binário) para teste de upload
const binFile = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 
  0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 
  120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 
  78, 68, 174, 66, 96, 130
]).buffer;

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status} ${loginRes.body}`);
  }

  return loginRes.json('data.token');
}

export default function (token) {
  // Prepara o payload multipart
  const data = {
    type: 'post', // Campo de texto
    image: http.file(binFile, 'test-image.png', 'image/png'), // Arquivo
  };

  const res = http.post(`${BASE_URL}/api/upload-image`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    tags: { flow: 'upload' },
  });

  check(res, {
    'status é 200': (r) => r.status === 200,
    'retornou path': (r) => r.json('path') !== undefined,
  }, { flow: 'upload' });

  sleep(1);
}
