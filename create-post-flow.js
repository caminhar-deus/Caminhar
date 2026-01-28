import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 3 }, // Ramp-up para 3 usuários (escrita é mais pesada)
    { duration: '15s', target: 3 }, // Mantém a carga
    { duration: '5s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    'http_req_duration{flow:create_post}': ['p(95)<800'], // Permite mais tempo para operações de escrita
    'checks{flow:create_post}': ['rate>0.98'], // Taxa de sucesso da criação de posts > 98%
  },
};

// --- Configuração do Teste ---
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'password';
const BASE_URL = 'http://localhost:3000';

// A função setup é executada uma vez antes do teste começar.
// É ideal para obter um token de autenticação que será reutilizado por todos os VUs.
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (loginRes.status !== 200) {
      throw new Error('Não foi possível fazer login para a configuração do teste. Verifique as credenciais.');
  }

  return loginRes.json('token');
}

export default function (token) {
  // --- Cria um novo post ---
  
  // Gera dados únicos para cada iteração para evitar erros de constraint 'UNIQUE' no banco
  const uniqueId = `${__VU}-${__ITER}`; // __VU = ID do Usuário Virtual, __ITER = número da iteração
  const postTitle = `Post de Carga ${uniqueId}`;
  const postSlug = `post-carga-${uniqueId}`;

  const postPayload = {
    title: postTitle,
    slug: postSlug,
    excerpt: `Resumo do post de teste de carga ${uniqueId}.`,
    content: `Conteúdo completo do post de teste de carga gerado pelo k6.`,
    published: false, // Cria como rascunho para não poluir o blog público
  };

  const createRes = http.post(
    `${BASE_URL}/api/admin/posts`,
    JSON.stringify(postPayload),
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      tags: { flow: 'create_post' },
    }
  );

  check(createRes, { 'post criado com sucesso (201)': (r) => r.status === 201 }, { flow: 'create_post' });

  sleep(3); // Simula um tempo maior de "pensamento" do usuário após uma ação de escrita
}