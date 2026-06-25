import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { b64decode } from 'k6/encoding';
import exec from 'k6/execution';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup } from '../helpers/auth.js';

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

// GIF 1x1 Transparente (Base64) para simular um arquivo de imagem válido sem dependências externas
const GIF_B64 = "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

export { setup };

export default function (data) {
  const token = data && data.token;
  if (!token) {
    exec.test.abort('❌ Abortando: Token de autenticação não disponível.');
  }

  // Decodifica o base64 para binário (ArrayBuffer)
  const fileData = b64decode(GIF_B64);

  // Usa prefixo 'post-image-' para ser compatível com scripts de limpeza existentes
  const fileName = `post-image-load-k6-${__VU}-${__ITER}.gif`;

  // O k6 lida automaticamente com o boundary do multipart se passarmos um objeto com http.file
  const payload = {
    image: http.file(fileData, fileName, 'image/gif'),
    type: 'post',
  };

  const res = http.post(`${BASE_URL}/api/upload-image`, payload, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { flow: 'upload_image' },
  });

  const success = check(res, {
    'status é 200': (r) => r.status === 200,
    'retorna url': (r) => {
      try {
        // API retorna { success: true, data: { url, path } }
        return r.json('data.url') !== undefined || r.json('url') !== undefined || r.json('path') !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success && __ITER === 0) {
    console.log(`❌ Falha no upload. Status: ${res.status}. Response: ${res.body}`);
  }

  // Verificação adicional: Tenta baixar a imagem recém-criada para garantir que foi salva no disco
  if (success) {
    let body;
    try {
      body = res.json();
    } catch {
      console.warn('⚠️ Não foi possível fazer parse da resposta do upload');
      randomSleep(1, 3);
      return;
    }

    // Tenta encontrar a URL em diferentes formatos comuns (url, data.url ou path)
    const imageUrl = body.url || (body.data && body.data.url) || body.path;

    if (imageUrl) {
      const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
      const getRes = http.get(fullUrl);

      check(getRes, { 'arquivo salvo no disco (GET 200)': (r) => r.status === 200 });
      if (getRes.status !== 200) {
        console.warn(`⚠️ Upload reportou sucesso, mas arquivo não acessível em ${fullUrl} (status: ${getRes.status})`);
      }
    }
  }

  randomSleep(1, 3); // Pausa entre uploads (uploads são mais pesados, requerem mais tempo)
}

export function handleSummary(data) {
  return generateReport(data, 'upload-flow-summary');
}