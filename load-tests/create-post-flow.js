import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from './helpers/sleep.js';
import { setup } from './helpers/auth.js';
import { BASE_URL } from './helpers/config.js';

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

// Exporta setup do módulo compartilhado de autenticação
export { setup };

export default function (data) {
  const token = data && data.token;
  if (!token) return;

  // Gera dados únicos para cada iteração para evitar erros de constraint 'UNIQUE' no banco
  const timestamp = Date.now();
  const uniqueId = `${__VU}-${__ITER}-${timestamp}`;
  const postTitle = `Post de Carga K6 ${__VU}-${__ITER}`;
  const postSlug = `post-carga-k6-${uniqueId}`;

  const postPayload = {
    title: postTitle,
    slug: postSlug,
    excerpt: `Resumo do post de teste de carga ${uniqueId}.`,
    content: `Conteúdo completo do post de teste de carga gerado pelo k6.`,
    image_url: 'https://via.placeholder.com/800x400',
    published: false,
  };

  const createRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(postPayload),
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      tags: { flow: 'create_post' },
    }
  );

  const checkRes = check(createRes, { 'post criado com sucesso (201)': (r) => r.status === 201 }, { flow: 'create_post' });

  if (!checkRes) {
    console.error(`Falha ao criar post: Status ${createRes.status} - Body: ${createRes.body}`);
  }

  randomSleep(1, 3);
}

export function teardown(data) {
  if (!data || !data.token) return;

  const authHeaders = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Limpeza: apaga posts K6 fantasmas deixados por VUs interrompidos
  const res = http.get(`${BASE_URL}/api/posts?limit=100`, { headers: authHeaders });
  if (res.status === 200) {
    const body = res.json();
    const posts = body.posts || body.data || [];
    for (const post of posts) {
      if (post.title && post.title.includes('K6')) {
        http.del(`${BASE_URL}/api/posts`, JSON.stringify({ id: post.id }), { headers: authHeaders });
      }
    }
  }
}
