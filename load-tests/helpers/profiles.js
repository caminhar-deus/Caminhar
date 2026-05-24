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
      http_req_duration: ['p(95)<300'],
      http_req_failed: ['rate<0.01'],
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
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.05'],
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
      http_req_duration: ['p(95)<100'],
      http_req_failed: ['rate<0.01'],
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
  stress: {
    scenarios: {
      stress_test: {
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
        executor: 'constant-vus',
        vus: 1,
        duration: '5m',
      },
    },
    thresholds: {
      'http_req_duration{scenario:stress_test}': ['p(95)<500'],
      'http_req_failed{scenario:stress_test}': ['rate<0.01'],
      'checks{scenario:stress_test}': ['rate>0.98'],
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

  return {
    ...baseProfile,
    ...overrides,
    thresholds: {
      ...baseProfile.thresholds,
      ...(overrides.thresholds || {}),
    },
  };
}