// Módulo compartilhado para perfis de carga padronizados
// Define matriz de perfis (leve, médio, pesado) com thresholds consistentes

export const PROFILES = {
  // Perfil leve: testes funcionais e validações rápidas
  light: {
    vus: 1,
    iterations: 5,
    thresholds: {
      checks: ['rate==1.0'],
      http_req_duration: ['p(95)<500'],
    },
  },

  // Perfil médio: testes de carga moderada
  medium: {
    stages: [
      { duration: '5s', target: 5 },
      { duration: '10s', target: 5 },
      { duration: '5s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.05'],
    },
  },

  // Perfil pesado: testes de estresse
  heavy: {
    stages: [
      { duration: '10s', target: 50 },
      { duration: '30s', target: 50 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      http_req_failed: ['rate<0.10'],
    },
  },

  // Perfil para health check (SLA rigoroso)
  health: {
    stages: [
      { duration: '5s', target: 20 },
      { duration: '10s', target: 20 },
      { duration: '5s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.02'],
    },
  },

  // Perfil para testes de recuperação (monitoramento longo)
  recovery: {
    scenarios: {
      chaos_monitor: {
        executor: 'constant-vus',
        vus: 1,
        duration: '2m',
      },
    },
    thresholds: {},
  },

  // Perfil para stress test combinado (cenários paralelos)
  //
  // `exec:` é OBRIGATÓRIO aqui e sua ausência foi um bug silencioso. Um cenário
  // k6 sem `exec:` executa a função `default` do script — e a `default()` de
  // `stress-test-combined.js` é um no-op vazio, porque a lógica do teste está
  // nas funções nomeadas. Resultado medido nos runs 38246676774 (12/10/2026) e
  // 38393117376 (13/10/2026), ambos verdes: 4m50s de ramp-up com 100 VUs e
  // ~200–320 milhões de iterações, ZERO requisições feitas pelos cenários,
  // `checks` com 0 passes e `stress_iterations`/métricas de memória AUSENTES do
  // artifact. Os thresholds (`checks{scenario:stress_test}` entre eles) passavam
  // por não terem amostras, não por desempenho — e o script reportava PASS.
  //
  // NÃO replicar este `exec:` para os outros dois perfis com `scenarios:`
  // (`recovery`/`chaos_monitor` e `rateLimit`/`brute_force`). A lógica deles está
  // na `export default function()` dos respectivos scripts, então o cenário já
  // executa a função certa; declarar `exec:` com o nome do cenário passaria a
  // procurar uma função que não existe e o k6 abortaria o teste. A regra real:
  // quando a lógica está em funções nomeadas, o cenário precisa de `exec:`;
  // quando está na `default`, não deve ter.
  stress: {
    scenarios: {
      stress_test: {
        exec: 'stress_test',
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '30s', target: 20 },
          { duration: '1m', target: 20 },
          { duration: '30s', target: 50 },
          { duration: '1m', target: 50 },
          { duration: '30s', target: 100 },
          { duration: '1m', target: 100 },
          { duration: '20s', target: 0 },
        ],
        gracefulRampDown: '30s',
      },
      memory_monitor: {
        exec: 'memory_monitor',
        executor: 'constant-vus',
        vus: 1,
        duration: '5m',
      },
    },
    thresholds: {
      'http_req_duration{scenario:stress_test}': ['p(95)<3000'],
      'http_req_failed{scenario:stress_test}': ['rate<0.10'],
      'checks{scenario:stress_test}': ['rate>0.95'],
      nodejs_memory_heap_used_bytes: ['max<1073741824'],
    },
  },

  // Perfil para rate limit (carga pesada, thresholds flexíveis)
  rateLimit: {
    scenarios: {
      brute_force: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '10s', target: 20 },
          { duration: '30s', target: 50 },
          { duration: '10s', target: 0 },
        ],
        gracefulRampDown: '10s',
      },
    },
    thresholds: {},
  },
};

/**
 * Retorna um perfil de carga mesclado com configurações personalizadas.
 * @param {string} profileName - Nome do perfil ('light', 'medium', 'heavy', 'health', 'recovery', 'rateLimit')
 * @param {Object} overrides - Configurações para sobrescrever/mesclar com o perfil base
 * @returns {Object} Configuração mesclada
 */
export function getProfile(profileName, overrides = {}) {
  const baseProfile = PROFILES[profileName];
  if (!baseProfile) {
    throw new Error(`Perfil desconhecido: "${profileName}". Use um dos: ${Object.keys(PROFILES).join(', ')}`);
  }

  // Se overrides incluir thresholds explicitamente, sobrescreve completamente
  // Se não, faz merge com o perfil base
  const hasExplicitThresholds = overrides && overrides.thresholds !== undefined;
  
  return {
    ...baseProfile,
    ...overrides,
    thresholds: hasExplicitThresholds
      ? overrides.thresholds
      : {
          ...baseProfile.thresholds,
          ...(overrides.thresholds || {}),
        },
  };
}