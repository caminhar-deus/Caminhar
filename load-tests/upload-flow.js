import http from 'k6/http';
import { check, sleep } from 'k6';
import { b64decode } from 'k6/encoding';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// --- Opções do Teste de Upload ---
export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Ramp-up gradual para 5 usuários
    { duration: '30s', target: 5 },  // Mantém a carga (uploads são pesados)
    { duration: '10s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    // Uploads envolvem I/O de disco/rede, então o limite é maior (2s)
    'http_req_duration': ['p(95)<2000'], 
    'http_req_failed': ['rate<0.01'],    // Taxa de erro abaixo de 1%
  },
};

// --- Configuração ---
const BASE_URL = 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

// GIF 1x1 Transparente (Base64) para simular um arquivo de imagem válido sem dependências externas
const GIF_B64 = "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

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
  const token = data.token;
  
  // Decodifica o base64 para binário (ArrayBuffer)
  const fileData = b64decode(GIF_B64);
  
  // Usa prefixo 'post-image-' para ser compatível com scripts de limpeza existentes
  const fileName = `post-image-load-${__VU}-${__ITER}.gif`;
  
  // O k6 lida automaticamente com o boundary do multipart se passarmos um objeto com http.file
  const payload = {
    file: http.file(fileData, fileName, 'image/gif'),
  };

  const res = http.post(`${BASE_URL}/api/upload-image`, payload, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { flow: 'upload_image' },
  });

  const success = check(res, {
    'status é 200': (r) => r.status === 200,
    'retorna url': (r) => r.json('url') !== undefined || r.json('data.url') !== undefined || r.json('path') !== undefined,
  });

  // Verificação adicional: Tenta baixar a imagem recém-criada para garantir que foi salva no disco
  if (success) {
    const body = res.json();
    // Tenta encontrar a URL em diferentes formatos comuns (url, data.url ou path)
    const imageUrl = body.url || (body.data && body.data.url) || body.path;

    if (imageUrl) {
      const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
      const getRes = http.get(fullUrl);
      
      const saved = check(getRes, { 'arquivo salvo no disco (GET 200)': (r) => r.status === 200 });
      if (!saved) {
        exec.test.abort(`❌ Falha crítica: Upload reportou sucesso, mas arquivo não acessível em ${fullUrl}`);
      }
    }
  }

  sleep(1); // Pausa entre uploads
}

export function handleSummary(data) {
  if (data.setup_data && data.setup_data.token) {
    data.setup_data.token = "*** TOKEN OCULTO ***";
  }
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/upload-flow-summary.json': JSON.stringify(data, null, 4),
  };
}