import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

/**
 * Teste de Carga — DDoS / Busca Massiva
 *
 * Propósito: Validar que a busca pública fica protegida sob ataque de busca em
 * massa, com requisições que de fato chegam ao servidor.
 *
 * ## Por que este teste só passa a medir algo real (09/10/2026)
 *
 * A versão anterior **não conseguia** exercitar a proteção, por duas causas
 * independentes — nenhuma delas visível no relatório, porque o teste saía verde
 * (100% de 200) enquanto prometia validar DDoS:
 *
 * **(1) O termo de busca era constante.** O cache de `pages/api/posts.js:46`
 * é indexado pelo termo (`posts:search:<page>:<limit>:<termo>`) com TTL de
 * 30 min, e o rate limit (`posts.js:58`) roda **dentro** do callback de cache
 * — logo, só em cache miss. Com 10 termos e ~16.000 requisições, havia ~10
 * verificações de rate limit: o limite (100/min para busca) era
 * estruturalmente inalcançável, e o check de 429 nunca podia passar. O
 * parâmetro `_t=<timestamp>` que o teste enviava **não** fazia parte da chave
 * de cache, então não bustava nada.
 *
 * Agora cada iteração usa um termo único (`<termo>-<VU>-<ITER>`), o que
 * garante cache miss e faz o rate limit rodar em **toda** requisição.
 *
 * **(2) O IP resolvido era loopback.** A CI sobe o app com `TRUST_PROXY: 'true'`
 * (1 hop) e o k6 roda no mesmo container, então sem `X-Forwarded-For` o app
 * resolve o socket — `127.0.0.1` — que está na whitelist permanente de
 * `lib/cache/cache.js:331` e **nunca** é rate-limited.
 *
 * Agora o teste envia `X-Forwarded-For` com um IP de cliente **constante**
 * (o mesmo atacante, não uma rotação — este teste mede bloqueio, o
 * `ip-spoofing-test` mede evasão por rotação). Sem o header, `resolveClientIP`
 * (`lib/api/helpers.js:141`) ignora o header e volta ao loopback.
 *
 * O callback de status esperado (`responseCallback`, com 200 e 429) é o que
 * impede o 429 de contar como falha: sem ele o k6 trata 429 como erro (o
 * default é 200–399) e `http_req_failed` marcaria ~100% mesmo com a proteção
 * funcionando.
 *
 * ## Interpretação dos Resultados
 *
 * | Cenário | Check que passa | Significado |
 * |---------|-----------------|-------------|
 * | Proteção funcionando | `🛡️ BLOQUEADO: Rate limit atuou (429)` em alta taxa | Busca pública protegida — o esperado |
 * | Servidor aguenta sem proteger | `✅ RESISTIU: Servidor respondeu (200)` em alta taxa | Rate limit **não** limitou: falha de proteção |
 * | App quebrado | `⚠️ VULNERÁVEL: Servidor caiu sob carga (5xx)` | App não sustenta a carga |
 *
 * Os três checks são **mutuamente exclusivos por status HTTP** (uma resposta tem
 * um único status), então a soma é 100% e a leitura de um percentual isolado
 * não significa falha — leia os três juntos.
 *
 * Por isso o agregado `checks` fica em 33,33% **por construção** (exatamente um
 * dos três passa por iteração): ele não é sinal de saúde. O veredito vem de
 * `search_block_rate` e `errors_500`. **Nunca** adicionar
 * `checks: ['rate==1.0']` neste script — reprovaria para sempre.
 *
 * ## Threshold que dá poder de reprovação
 *
 * `search_block_rate` exige `rate>0.50`: sob ataque com IP único e >100/min,
 * a maioria das requisições **tem** de ser bloqueada. Um servidor que degradas
 * a 200 reprova o job. Antes isso era impossível — o teste não tinha como
 * distinguir "protegido" de "sem proteção", porque nunca havia 429.
 *
 * `errors_500` mantém `rate<0.50` **sem** `abortOnFail`: 5xx é resultado a
 * medir num teste de resiliência. Um teste que aborta com 5s de 5xx destrói a
 * medição que existe para fazer.
 *
 * ## Efeito colateral conhecido (memória de cache)
 *
 * Termo único por iteração é o que faz o teste funcionar, mas cria uma chave de
 * cache por requisição: ~15.000 entradas em ~50 s, contra 10 antes. As chaves de
 * busca têm TTL de 30 min (`pages/api/posts.js:51`) e a limpeza periódica roda a
 * cada 60 s removendo **só** expiradas (`lib/cache/cache.js:73`) — logo, durante
 * a execução do teste nada é liberado. Estimativa: ~11 MB no cache L1 do processo
 * (`next start`), em ambiente de CI descartável.
 *
 * É o comportamento real de um ataque de busca (cada termo é uma chave nova), e é
 * o que o teste precisa exercitar. O cache é perdido no fim do job. **Se este
 * teste passar a rodar fora de ambiente descartável, considerar limitar o número
 * de iterações** para não segurar memória por 30 min.
 */

// IP do atacante: constante de propósito (RFC 5737, faixa de documentação).
// Este teste mede BLOQUEIO. A rotação de IP é medida pelo `ip-spoofing-test`.
// Com `TRUST_PROXY: 'true'` (1 hop), o app lê a última entrada da direita.
const ATTACKER_IP = '203.0.113.10';

// Termos base. O sufixo único por iteração é o que busta o cache e faz o
// rate limit ser verificado — sem ele o teste mede apenas 10 cache misses.
const SEARCH_TERMS = ['amor', 'paz', 'fé', 'luz', 'vida', 'caminho', 'verdade', 'esperança', 'coração', 'espírito'];

// Métricas: 5xx é resiliência (medida, não reprovação); block_rate dá poder
// de reprovação quando a proteção não atua.
const ErrorRate500 = new Rate('errors_500');
const SearchBlockRate = new Rate('search_block_rate');

// Status aceitos como "esperados": 200 = o servidor respondeu e o rate limit
// NÃO limitou; 429 = o rate limit agiu. Sem este callback o k6 trata 429 como
// falha (default é 200–399) e `http_req_failed` marca ~100% de falha mesmo
// com a proteção funcionando. A chave correta do param é `responseCallback` —
// `expectedStatuses` NÃO existe em Params e era ignorada em silêncio.
const RESPOSTAS_ESPERADAS = http.expectedStatuses(200, 429);

export const options = getProfile('heavy', {
  // Escape hatch deliberado: `errors_500: ['rate<0.50']` abaixo diz que até
  // 50% de 5xx é achado de capacidade (reportar, não reprovar) — se o
  // `http_req_failed: rate<0.10` do perfil `heavy` fosse mesclado, o job
  // reprovaria justamente o cenário parcialmente 5xx que este script precisa
  // sobreviver para conseguir reportá-lo.
  replaceThresholds: true,
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // Proteção funcionando: sob ataque sustentado com IP único, a maioria
    // tem de ser bloqueada. Este threshold é o que reprova o job quando o
    // rate limit não atua — antes não havia como detectar isso.
    'search_block_rate': ['rate>0.50'],
    // 50% separa o que é achado de capacidade (taxa parcial sob 500 VUs —
    // reportar, não reprovar) do app quebrado (maioria de 5xx — reprova).
    // Sem abortOnFail/delayAbortEval: 5xx é resultado a medir.
    'errors_500': ['rate<0.50'],
  },
});

export default function () {
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

  // Termo único por iteração: garante cache miss em `pages/api/posts.js`, logo
  // o rate limit (que roda dentro do callback de cache) é verificado aqui.
  const uniqueSearch = `${term}-${__VU}-${__ITER}`;

  const res = http.get(
    `${BASE_URL}/api/posts?search=${encodeURIComponent(uniqueSearch)}`,
    {
      headers: {
        // Sem este header o app resolve o socket (loopback na CI), que está na
        // whitelist permanente de `lib/cache/cache.js` e nunca é limitado.
        'X-Forwarded-For': ATTACKER_IP,
      },
      tags: { type: 'ddos_search', name: 'DDoS_Search' },
      responseCallback: RESPOSTAS_ESPERADAS,
    }
  );

  ErrorRate500.add(res.status >= 500);
  SearchBlockRate.add(res.status === 429);

  check(res, {
    '✅ RESISTIU: Servidor respondeu com sucesso (200)': (r) => r.status === 200,
    '🛡️ BLOQUEADO: Rate limit atuou na busca (429)': (r) => r.status === 429,
    '⚠️ VULNERÁVEL: Servidor caiu sob carga (5xx)': (r) => r.status >= 500,
  });

  // NOTA: Não usamos sleep() aqui intencionalmente.
  // O objetivo é fazer cada VU disparar requisições o mais rápido possível (loop infinito sem pausa).
}

export function handleSummary(data) {
  const errors500 = data.metrics.errors_500 ? data.metrics.errors_500.values.rate : 0;
  const blockRate = data.metrics.search_block_rate ? data.metrics.search_block_rate.values.rate : 0;
  const errorsPct = (errors500 * 100).toFixed(2);
  const blockPct = (blockRate * 100).toFixed(2);

  console.log(`\n📊 Resiliência (errors_500): ${errorsPct}% das respostas foram 5xx.` +
    (errors500 >= 0.5
      ? ' Maioria 5xx: sinal de app quebrado, não apenas subdimensionado.'
      : ' Taxa parcial: achado de capacidade, reportado sem reprovar o job.') +
    ' Threshold: rate<0.50, sem abortOnFail: o teste roda até o fim para medir.\n');

  console.log(`🛡️ Proteção da busca (search_block_rate): ${blockPct}% foram 429.` +
    (blockRate > 0.5
      ? ' Rate limit protegeu a busca — cenário esperado sob ataque com IP único.'
      : ' Poucos 429 sob ataque com IP único: o rate limit NÃO limitou a busca.') +
    ' Threshold: rate>0.50 (a maioria tem de ser bloqueada; se não for, o job reprova).\n');

  return generateReport(data, 'ddos_search_test');
}