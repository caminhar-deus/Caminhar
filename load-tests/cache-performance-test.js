import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

export const options = {
  // Cenário de teste de cache:
  // 1. Warm-up: Poucos usuários para garantir que o cache foi populado
  // 2. High Load: Mais usuários para verificar a velocidade de leitura do cache
  stages: [
    { duration: '5s', target: 5 },   // Warm-up (popula o cache)
    { duration: '15s', target: 50 }, // Carga alta de leitura (50 VUs simultâneos)
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    // Latência deve ser muito baixa para respostas em cache (esperado < 100ms, ideal < 50ms)
    // p(95) significa que 95% das requisições devem ser mais rápidas que o valor definido
    'http_req_duration{type:cached_settings}': ['p(95)<100'], 
    'http_req_duration{type:cached_posts}': ['p(95)<100'],
    // Taxa de erro deve ser zero
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

export function setup() {
  const res = http.get(BASE_URL);
  if (res.status === 0) {
    exec.test.abort(`❌ Conexão recusada em ${BASE_URL}. O servidor está rodando?`);
  }

  // Login para obter token (necessário para /api/v1/settings)
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  }), {
    // Sem X-Forwarded-For aqui para evitar interferir no login que pode ter seu próprio rate limit
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    exec.test.abort(`Falha no login de setup: ${loginRes.status} ${loginRes.body}`);
  }

  return loginRes.json('data.token');
}

// Função auxiliar para gerar um endereço IPv4 aleatório
function getRandomIP() {
  const octet = () => Math.floor(Math.random() * 255);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

export default function (token) {
  const virtualIP = getRandomIP();
  const spoofedHeaders = {
    // Simula IP diferente para evitar rate limit
    'X-Forwarded-For': virtualIP,
  };

  // 1. Teste Settings (Autenticado + Cache)
  // Esta rota usa getOrSetCache com chave 'settings:v1:all' ou específica
  const settingsRes = http.get(`${BASE_URL}/api/v1/settings`, {
    headers: { Authorization: `Bearer ${token}`, ...spoofedHeaders },
    tags: { type: 'cached_settings' },
  });

  check(settingsRes, {
    'settings status 200': (r) => r.status === 200,
    'settings cache hit (<100ms)': (r) => r.timings.duration < 100,
    'settings response body is valid': (r) => {
      // Verifica se a resposta é um objeto JSON não vazio, que é o esperado para as configurações.
      return r.status === 200 && typeof r.json() === 'object' && Object.keys(r.json()).length > 0;
    },
  });

  // 2. Teste Posts (Público + Cache)
  // Esta rota usa getOrSetCache com chave 'posts:public:all'
  const postsRes = http.get(`${BASE_URL}/api/posts`, {
    headers: { ...spoofedHeaders }, // Adiciona o cabeçalho para evitar rate limit em rotas públicas
    tags: { type: 'cached_posts' },
  });

  check(postsRes, {
    'posts status 200': (r) => r.status === 200,
    'posts cache hit (<100ms)': (r) => r.timings.duration < 100,
    'posts response body is valid': (r) =>
      r.status === 200 && Array.isArray(r.json('data') || r.json()),
  });

  sleep(1);
}