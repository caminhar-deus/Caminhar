import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

// Métricas personalizadas para rastrear erros específicos
const CreateErrors = new Counter('create_errors');
const UpdateErrors = new Counter('update_errors');
const DeleteErrors = new Counter('delete_errors');

export const options = {
  stages: [
    { duration: '10s', target: 5 }, // Ramp-up para 5 usuários
    { duration: '20s', target: 5 }, // Mantém 5 usuários
    { duration: '10s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% das requisições devem ser menores que 800ms
    'create_errors': ['count==0'],    // Zero erros de criação permitidos
    'update_errors': ['count==0'],    // Zero erros de atualização permitidos
    'delete_errors': ['count==0'],    // Zero erros de deleção permitidos
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'password';

export function setup() {
  // 1. Autenticação para obter o token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 0) {
    exec.test.abort(`❌ Conexão recusada no login (${BASE_URL}). O servidor está rodando?`);
  }

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginRes.json('data.token');

  if (!token) {
    console.error(`Falha no login: ${loginRes.status} ${loginRes.body}`);
  }

  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // --- CREATE ---
  const createPayload = JSON.stringify({
    titulo: `Música Load Test ${Date.now()}`,
    artista: 'Artista K6',
    descricao: 'Teste de carga automatizado',
    url_spotify: 'https://open.spotify.com/track/testk6',
    publicado: true,
  });

  const createRes = http.post(`${BASE_URL}/api/admin/musicas`, createPayload, { headers });

  const createSuccess = check(createRes, {
    'CREATE: status é 201': (r) => r.status === 201,
    'CREATE: retorna o ID': (r) => r.json('id') !== undefined,
  });

  if (!createSuccess) {
    CreateErrors.add(1);
    console.error(`Falha ao criar música. Status: ${createRes.status}, Body: ${createRes.body}`);
    return; // Aborta iteração se falhar na criação
  }

  const musicaId = createRes.json('id');
  sleep(1);

  // --- UPDATE ---
  const updatePayload = JSON.stringify({
    id: musicaId,
    titulo: `Música Atualizada ${Date.now()}`,
    artista: 'Artista K6 Atualizado',
    descricao: 'Descrição atualizada pelo teste',
    url_spotify: 'https://open.spotify.com/track/updated',
    publicado: false,
  });

  const updateRes = http.put(`${BASE_URL}/api/admin/musicas`, updatePayload, { headers });

  if (!check(updateRes, { 'UPDATE: status é 200': (r) => r.status === 200 })) {
    UpdateErrors.add(1);
    console.error(`Falha ao atualizar música. Status: ${updateRes.status}, Body: ${updateRes.body}`);
  }

  sleep(1);

  // --- DELETE ---
  // A API espera o ID no corpo da requisição DELETE
  const deletePayload = JSON.stringify({ id: musicaId });
  const deleteRes = http.del(`${BASE_URL}/api/admin/musicas`, deletePayload, { headers });

  if (!check(deleteRes, { 'DELETE: status é 200': (r) => r.status === 200 })) {
    DeleteErrors.add(1);
    console.error(`Falha ao deletar música. Status: ${deleteRes.status}, Body: ${deleteRes.body}`);
  }
}