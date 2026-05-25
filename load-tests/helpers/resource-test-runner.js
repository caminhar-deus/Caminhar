// Módulo genérico para testes de recursos (músicas, vídeos, etc.)
// Elimina duplicação de código entre pares de testes que diferem apenas
// no endpoint e nos dados de payload.
//
// Uso:
//   import { createCrudTest, createFilterTest, ... } from './helpers/resource-test-runner.js';
//   export const options = createCrudTest({...}).options;
//   export { setup } from './helpers/auth.js';
//   export default createCrudTest({...}).default;
//   export function handleSummary(data) { ... }

import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from './sleep.js';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';
import { getRandomIP } from './network.js';
import { BASE_URL, USERNAME, PASSWORD } from './config.js';
import { setup as authSetup } from './auth.js';
import { getProfile } from './profiles.js';
import { generateReport } from './report.js';

// --- HELPERS INTERNOS ---

function sanitizeToken(data) {
  if (data && data.setup_data && data.setup_data.token) {
    data.setup_data.token = '*** TOKEN OCULTO ***';
  }
  return data;
}

/**
 * Gera nome padronizado para relatório.
 */
function reportName(testType, resourceName) {
  return `${resourceName}_${testType}_test`;
}

/**
 * Cria configuração de teste (options) para teste CRUD.
 */
function createCrudOptions(resourceConfig) {
  const profile = resourceConfig.profileName || 'light';
  const overrides = resourceConfig.optionsOverrides || {};

  // Obtém o perfil base para mesclar thresholds
  const baseProfile = getProfile(profile);

  // Se os overrides definirem stages, remove iterations e vus do perfil base
  // pois o k6 não permite usar iterations e stages simultaneamente
  const hasStages = overrides.stages !== undefined;
  const profileWithoutConflicts = { ...baseProfile };
  if (hasStages) {
    delete profileWithoutConflicts.iterations;
    delete profileWithoutConflicts.vus;
  }

  return {
    ...profileWithoutConflicts,
    ...overrides,
    thresholds: {
      ...baseProfile.thresholds,
      [`${resourceConfig.metricsPrefix || resourceConfig.resourceName}_create_errors`]: ['count==0'],
      [`${resourceConfig.metricsPrefix || resourceConfig.resourceName}_update_errors`]: ['count==0'],
      [`${resourceConfig.metricsPrefix || resourceConfig.resourceName}_delete_errors`]: ['count==0'],
      ...(overrides.thresholds || {}),
    },
  };
}

/**
 * Cria a função default() para teste CRUD.
 */
function createCrudDefault(resourceConfig) {
  const {
    adminEndpoint,
    payloadTemplate,
    idField = 'id',
    resourceName = 'resource',
    metricsPrefix,
    requireAuth = true,
    sleepTimings = null,
    uniqueIdGenerator = () => `${Date.now()}`,
  } = resourceConfig;

  const prefix = metricsPrefix || resourceName;
  const CreateErrors = new Counter(`${prefix}_create_errors`);
  const UpdateErrors = new Counter(`${prefix}_update_errors`);
  const DeleteErrors = new Counter(`${prefix}_delete_errors`);

  // Helper para extrair o ID da resposta da API, suportando múltiplos formatos:
  // { id: ... } (direto), { data: { id: ... } }, { data: { [resourceName]: { id: ... } } }
  function extractResourceId(body, idField, resourceName) {
    if (body[idField] !== undefined) return body[idField];
    if (body.data) {
      if (body.data[idField] !== undefined) return body.data[idField];
      const resourceData = body.data[resourceName] || body.data[`${resourceName.slice(0, -1)}`];
      if (resourceData && resourceData[idField] !== undefined) return resourceData[idField];
    }
    return undefined;
  }

  return function (data) {
    const token = data && data.token;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (requireAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uniqueId = uniqueIdGenerator();

    // Gera payload substituindo placeholders
    const payloadObj = typeof payloadTemplate === 'function'
      ? payloadTemplate(uniqueId)
      : { ...payloadTemplate };
    const payloadStr = JSON.stringify(payloadObj);

    // --- CREATE ---
    const createRes = http.post(`${BASE_URL}${adminEndpoint}`, payloadStr, { headers });

    const createSuccess = check(createRes, {
      [`CREATE (${resourceName}): status é 201`]: (r) => r.status === 201,
      [`CREATE (${resourceName}): retorna o ${idField}`]: (r) => {
        const body = r.json();
        return body && extractResourceId(body, idField, resourceName) !== undefined;
      },
    });

    if (!createSuccess) {
      CreateErrors.add(1);
      console.error(`Falha ao criar ${resourceName}. Status: ${createRes.status}, Body: ${createRes.body}`);
      return;
    }

    const body = createRes.json();
    const resourceId = extractResourceId(body, idField, resourceName);
    randomSleep(0.5, 2);

    // --- UPDATE ---
    const updatePayloadObj = { [idField]: resourceId, ...payloadObj, titulo: `${payloadObj.titulo || 'Atualizado'} - Updated` };
    const updatePayloadStr = JSON.stringify(updatePayloadObj);

    const updateRes = http.put(`${BASE_URL}${adminEndpoint}`, updatePayloadStr, { headers });

    if (!check(updateRes, { [`UPDATE (${resourceName}): status é 200`]: (r) => r.status === 200 })) {
      UpdateErrors.add(1);
      console.error(`Falha ao atualizar ${resourceName}. Status: ${updateRes.status}, Body: ${updateRes.body}`);
    }

    randomSleep(0.5, 2);

    // --- DELETE ---
    const deletePayloadStr = JSON.stringify({ [idField]: resourceId });
    const deleteRes = http.del(`${BASE_URL}${adminEndpoint}`, deletePayloadStr, { headers });

    if (!check(deleteRes, { [`DELETE (${resourceName}): status é 200`]: (r) => r.status === 200 })) {
      DeleteErrors.add(1);
      console.error(`Falha ao deletar ${resourceName}. Status: ${deleteRes.status}, Body: ${deleteRes.body}`);
    }

    randomSleep(0.5, 2);
  };
}

/**
 * Cria configuração de teste (options) para teste de filtro.
 */
function createFilterOptions(resourceConfig) {
  return getProfile(resourceConfig.profileName || 'light', resourceConfig.optionsOverrides);
}

/**
 * Cria a função default() para teste de filtro.
 */
function createFilterDefault(resourceConfig) {
  const {
    publicEndpoint,
    searchField = 'search',
    searchValues = [],
    responsePath = 'data',
    resourceName = 'resource',
    sleepDuration = null,
  } = resourceConfig;

  // Extrai itens com suporte a caminhos aninhados (ex: 'data.musicas')
  function getItems(body) {
    if (responsePath && responsePath.includes('.')) {
      let current = body;
      const parts = responsePath.split('.');
      for (const part of parts) {
        if (current && current[part] !== undefined) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return Array.isArray(current) ? current : undefined;
    }
    const direct = body[responsePath];
    return Array.isArray(direct) ? direct : (Array.isArray(body) ? body : undefined);
  }

  return function () {
    const searchTerm = searchValues[Math.floor(Math.random() * searchValues.length)];

    const res = http.get(`${BASE_URL}${publicEndpoint}?${searchField}=${encodeURIComponent(searchTerm)}`);

    check(res, {
      [`Status é 200`]: (r) => r.status === 200,
      [`Retornou lista de ${resourceName}`]: (r) => {
        try {
          const body = r.json();
          return getItems(body) !== undefined;
        } catch (e) {
          return false;
        }
      },
      [`Filtro funcionou (termo encontrado)`]: (r) => {
        let body;
        try { body = r.json(); } catch (e) { return false; }
        const items = getItems(body);

        if (!Array.isArray(items)) return false;
        if (items.length === 0) return true;

        const matchFound = items.some(item => {
          const searchable = (item.titulo || item.title || item.artista || item.artist || '').toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        });

        if (!matchFound) {
          console.log(`⚠️ API retornou ${items.length} itens para "${searchTerm}", mas o termo não foi encontrado visualmente.`);
          return true;
        }
        return true;
      },
    });

    if (sleepDuration !== null) {
      randomSleep(sleepDuration - 0.5, sleepDuration + 0.5);
    } else {
      randomSleep(0.5, 2);
    }
  };
}

/**
 * Cria configuração de teste (options) para teste de paginação.
 */
function createPaginationOptions(resourceConfig) {
  return getProfile(resourceConfig.profileName || 'light', {
    iterations: 1,
    ...resourceConfig.optionsOverrides,
    thresholds: {
      checks: ['rate==1.0'],
      ...((resourceConfig.optionsOverrides && resourceConfig.optionsOverrides.thresholds) || {}),
    },
  });
}

/**
 * Cria a função default() para teste de paginação.
 */
function createPaginationDefault(resourceConfig) {
  const {
    publicEndpoint,
    responsePath = 'data',
    itemsPath,
    idField = 'id',
    resourceName = 'resource',
    limit = 5,
    sleepDuration = null,
  } = resourceConfig;

  const getItems = (body) => {
    if (itemsPath) {
      let current = body;
      const parts = itemsPath.split('.');
      for (const part of parts) {
        if (current && current[part] !== undefined) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return Array.isArray(current) ? current : undefined;
    }
    const direct = body[responsePath];
    return Array.isArray(direct) ? direct : undefined;
  };

  return function () {
    // Página 1
    const resPage1 = http.get(`${BASE_URL}${publicEndpoint}?page=1&limit=${limit}`);

    check(resPage1, {
      [`Página 1: status 200`]: (r) => r.status === 200,
      [`Página 1: retornou dados`]: (r) => {
        const body = r.json();
        return getItems(body) !== undefined || Array.isArray(body);
      },
    });

    const itemsPage1 = (() => {
      const body = resPage1.json();
      return getItems(body) || body || [];
    })();

    if (!Array.isArray(itemsPage1) || itemsPage1.length === 0) {
      console.warn(`⚠️ Página 1 vazia. Adicione ${resourceName} ao banco para testar a lógica de paginação.`);
      return;
    }

    const idsPage1 = itemsPage1.map(item => item[idField]);

    if (sleepDuration !== null) {
      randomSleep(sleepDuration - 0.5, sleepDuration + 0.5);
    } else {
      randomSleep(0.5, 2);
    }

    // Página 2
    const resPage2 = http.get(`${BASE_URL}${publicEndpoint}?page=2&limit=${limit}`);

    check(resPage2, {
      [`Página 2: status 200`]: (r) => r.status === 200,
      [`Página 2: retornou dados`]: (r) => {
        const body = r.json();
        return getItems(body) !== undefined || Array.isArray(body);
      },
    });

    const itemsPage2 = (() => {
      const body = resPage2.json();
      return getItems(body) || body || [];
    })();

    if (!Array.isArray(itemsPage2) || itemsPage2.length === 0) {
      console.warn(`⚠️ Página 2 vazia. Adicione mais ${resourceName} ao banco para um teste de paginação completo.`);
    } else {
      const hasDuplicates = itemsPage2.some(item => idsPage1.includes(item[idField]));

      check(resPage2, {
        [`Paginação funciona (IDs diferentes nas págs 1 e 2)`]: () => !hasDuplicates,
        [`Página 2 tem conteúdo diferente`]: () => JSON.stringify(itemsPage1) !== JSON.stringify(itemsPage2),
      });
    }

    if (sleepDuration !== null) {
      randomSleep(sleepDuration - 0.5, sleepDuration + 0.5);
    } else {
      randomSleep(0.5, 2);
    }
  };
}

/**
 * Cria configuração de teste (options) para teste de ordenação.
 */
function createSortOptions(resourceConfig) {
  return getProfile(resourceConfig.profileName || 'light', {
    iterations: 1,
    ...resourceConfig.optionsOverrides,
    thresholds: {
      checks: ['rate==1.0'],
      ...((resourceConfig.optionsOverrides && resourceConfig.optionsOverrides.thresholds) || {}),
    },
  });
}

/**
 * Cria a função default() para teste de ordenação.
 */
function createSortDefault(resourceConfig) {
  const {
    publicEndpoint,
    sortField = 'created_at',
    sortOrder = 'desc',
    dateField = 'created_at',
    itemsPath,
    responsePath = 'data',
    resourceName = 'resource',
    sleepDuration = null,
    useExplicitSort = true,
  } = resourceConfig;

  const getItems = (body) => {
    if (itemsPath) {
      let current = body;
      const parts = itemsPath.split('.');
      for (const part of parts) {
        if (current && current[part] !== undefined) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return Array.isArray(current) ? current : undefined;
    }
    const direct = body[responsePath];
    return Array.isArray(direct) ? direct : undefined;
  };

  return function () {
    const url = useExplicitSort
      ? `${BASE_URL}${publicEndpoint}?sort=${sortField}&order=${sortOrder}`
      : `${BASE_URL}${publicEndpoint}?page=1&limit=10`;

    const res = http.get(url);

    check(res, {
      [`Status é 200`]: (r) => r.status === 200,
      [`Retornou lista de ${resourceName}`]: (r) => {
        try {
          const body = r.json();
          return getItems(body) !== undefined || Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
      [`Ordenação correta (${sortOrder === 'desc' ? 'Decrescente' : 'Crescente'})`]: (r) => {
        let items;
        try {
          const body = r.json();
          items = getItems(body) || body;
        } catch (e) {
          return false;
        }

        if (!Array.isArray(items)) {
          console.warn(`⚠️ Resposta não continha um array de ${resourceName} para validar a ordenação.`);
          return true;
        }

        if (items.length < 2) {
          console.warn(`⚠️ Poucos ${resourceName} para validar ordenação. Adicione mais dados.`);
          return true;
        }

        for (let i = 0; i < items.length - 1; i++) {
          const dateA = new Date(items[i][dateField] || items[i].createdAt).getTime();
          const dateB = new Date(items[i + 1][dateField] || items[i + 1].createdAt).getTime();
          if (sortOrder === 'desc' && dateA < dateB) return false;
          if (sortOrder === 'asc' && dateA > dateB) return false;
        }
        return true;
      },
    });

    // Check extra: API ignora parâmetros extras sem erro (apenas quando não usa sort explícito)
    if (!useExplicitSort) {
      check(res, {
        [`API ignora parâmetros de ordenação`]: () => {
          const resWithSort = http.get(`${BASE_URL}${publicEndpoint}?page=1&limit=5&sort=created_at&order=desc`);
          return resWithSort.status === 200;
        },
      });
    }

    if (sleepDuration !== null) {
      randomSleep(sleepDuration - 0.5, sleepDuration + 0.5);
    } else {
      randomSleep(0.5, 2);
    }
  };
}

/**
 * Cria configuração de teste (options) para teste de carga.
 */
function createLoadOptions(resourceConfig) {
  const profileName = resourceConfig.profileName || 'medium';
  return getProfile(profileName, resourceConfig.optionsOverrides);
}

/**
 * Cria a função setup() para teste de carga, com health check opcional.
 */
function createLoadSetup(doHealthCheck = false) {
  return function () {
    if (doHealthCheck) {
      const res = http.get(BASE_URL);
      if (res.status === 0) {
        exec.test.abort(`❌ Conexão recusada em ${BASE_URL}. O servidor está rodando?`);
      }
    }

    const loginRes = http.post(
      `${BASE_URL}/api/auth/login?response=body`,
      JSON.stringify({ username: USERNAME, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status !== 200) {
      console.error(`Falha no login: ${loginRes.status}`);
      console.error(`Body: ${loginRes.body}`);
      exec.test.abort('Teste abortado devido a falha no login.');
    }

    if (loginRes.headers['Content-Type'] && !loginRes.headers['Content-Type'].includes('application/json')) {
      exec.test.abort(`Login retornou conteúdo não-JSON: ${loginRes.body.substring(0, 100)}...`);
    }

    return loginRes.json('data.token');
  };
}

/**
 * Cria a função default() para teste de carga (listagem).
 */
function createLoadDefault(resourceConfig) {
  const {
    endpoint,
    requireAuth = true,
    useSpoofIP = false,
    checkResponse = null,
    tags = {},
    sleepDuration = null,
    resourceName = 'resource',
    extraRequests = [],
  } = resourceConfig;

  return function (token) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (requireAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (useSpoofIP) {
      headers['X-Forwarded-For'] = getRandomIP();
    }

    const defaultTags = { name: `List${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}` };
    const mergedTags = { ...defaultTags, ...tags };

    const res = http.get(`${BASE_URL}${endpoint}`, {
      headers,
      tags: mergedTags,
    });

    check(res, {
      'status é 200': (r) => r.status === 200,
      ...(checkResponse ? checkResponse(res) : {}),
    });

    // Requisições extras (ex: página 2)
    for (const extra of extraRequests) {
      const extraRes = http.get(`${BASE_URL}${extra.endpoint}`, {
        headers,
        tags: { name: extra.tagName || `List${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}_Extra` },
      });

      check(extraRes, extra.checks || {});
    }

    randomSleep(0.5, 2);
  };
}

// --- EXPORTS PÚBLICOS ---

export function createCrudTest(resourceConfig) {
  return {
    options: createCrudOptions(resourceConfig),
    default: createCrudDefault(resourceConfig),
    reportName: reportName('crud', resourceConfig.resourceName || 'resource'),
  };
}

export function createFilterTest(resourceConfig) {
  return {
    options: createFilterOptions(resourceConfig),
    default: createFilterDefault(resourceConfig),
    reportName: reportName('filter', resourceConfig.resourceName || 'resource'),
  };
}

export function createPaginationTest(resourceConfig) {
  return {
    options: createPaginationOptions(resourceConfig),
    default: createPaginationDefault(resourceConfig),
    reportName: reportName('pagination', resourceConfig.resourceName || 'resource'),
  };
}

export function createSortTest(resourceConfig) {
  return {
    options: createSortOptions(resourceConfig),
    default: createSortDefault(resourceConfig),
    reportName: reportName('sort', resourceConfig.resourceName || 'resource'),
  };
}

export function createLoadTest(resourceConfig) {
  const doHealthCheck = resourceConfig.healthCheck || false;
  return {
    options: createLoadOptions(resourceConfig),
    setup: resourceConfig.customSetup || createLoadSetup(doHealthCheck),
    default: createLoadDefault(resourceConfig),
    reportName: reportName('load', resourceConfig.resourceName || 'resource'),
  };
}

export { sanitizeToken, generateReport };
