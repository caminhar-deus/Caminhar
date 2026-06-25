import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import exec from 'k6/execution';
import { BASE_URL, USERNAME, PASSWORD } from '../helpers/config.js';

export const options = {
  // Cenário de teste de cache:
  // 1. Warm-up: Poucos usuários para garantir que o cache foi populado
  // 2. High Load: Mais usuários para verificar a velocidade de leitura do cache
  stages: [
    { duration: '5s', target: 1 },   // Warm-up inicial: 1 VU para povoar cache
    { duration: '5s', target: 5 },   // Warm-up gradual
    { duration: '10s', target: 50 }, // Carga alta de leitura (50 VUs simultâneos)
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    // Latência para respostas em cache (esperado < 300ms para cache quente)
    // p(95) significa que 95% das requisições devem ser mais rápidas que o valor definido
    // Valores ajustados para cenário real com cache funcionando:
    // - Com cache Redis/memória: <200ms é razoável
    // - p(95) tolera alguns outliers de cold-start
    'http_req_duration{type:cached_settings}': ['p(95)<500', 'avg<200'], 
    'http_req_duration{type:cached_posts}': ['p(95)<500', 'avg<200'],
    // Taxa de erro deve ser próxima de zero (tolerância para rate limit residual)
    'http_req_failed': ['rate<0.05'],
    // Thresholds específicos por check de cache hit (meta >99.9%)
    // Substitui o threshold genérico 'checks': ['rate>0.70'] que mascara o problema
    // Com cache L1 em memória, a grande maioria das requisições fica < 5ms.
    // Posts é público (sem auth) → mais leve. Settings tem auth + rate limit → ligeiramente mais pesado.
    'checks{check:posts cache hit (<100ms)}': ['rate>0.999'],
    'checks{check:settings cache hit (<100ms)}': ['rate>0.990'],
    // Threshold genérico permanece para os demais checks (status, validade body)
    'checks': ['rate>0.95'],
  },
};


export function setup() {
  const res = http.get(BASE_URL);
  if (res.status === 0) {
    exec.test.abort(`❌ Conexão recusada em ${BASE_URL}. O servidor está rodando?`);
  }

  // Login para obter token (necessário para /api/settings)
  const loginRes = http.post(`${BASE_URL}/api/auth/login?response=body`, JSON.stringify({
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

export default function (token) {
  // NOTA: Não usamos spoofing de IP aqui pois:
  // 1. O IP local (127.0.0.1, ::1) está na whitelist de rate limit
  // 2. A detecção de spoofing bloquearia requisições com X-Forwarded-For diferente do socket
  // 3. Testes de cache devem testar cache, não evasão de rate limit

  // 1. Teste Settings (Autenticado + Cache)
  // Esta rota usa getOrSetCache com chave 'settings:v1:all' ou específica
  const settingsRes = http.get(`${BASE_URL}/api/settings`, {
    headers: { Authorization: `Bearer ${token}` },
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
    tags: { type: 'cached_posts' },
  });

  check(postsRes, {
    'posts status 200': (r) => r.status === 200,
    'posts cache hit (<100ms)': (r) => r.timings.duration < 100,
    'posts response body is valid': (r) =>
      r.status === 200 && Array.isArray(r.json('data') || r.json()),
  });

  randomSleep(0.5, 3);
}