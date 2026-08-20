/** @type {import('dependency-cruiser').IConfiguration} */
// CONTEXTO: ISOLADOS
// Valida: cypress, load-tests, scripts (entre si, sem tocar o app core)
// Objetivo: evitar acoplamento indevido entre ferramentas auxiliares (regras mais leves - warn)
module.exports = {
  forbidden: [
    // ---------------------------------------------------------------------
    // Regras genéricas (padrão do dependency-cruiser init)
    // ---------------------------------------------------------------------
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        "This dependency is part of a circular relationship. You might want to revise " +
        "your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ",
      from: {},
      to: { circular: true }
    },
    {
      name: 'no-orphans',
      comment:
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it in your dependency-cruiser configuration.",
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig[.]json$',
          '(^|/)(?:babel|webpack)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$'
        ]
      },
      to: {}
    },
    {
      name: 'not-to-deprecated',
      comment: 'This module uses a (version of an) npm module that has been deprecated.',
      severity: 'warn',
      from: {},
      to: { dependencyTypes: ['deprecated'] }
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json.",
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] }
    },
    {
      name: 'not-to-unresolvable',
      comment: "This module depends on a module that cannot be found ('resolved to disk').",
      severity: 'error',
      from: {},
      to: { couldNotResolve: true }
    },

    // ---------------------------------------------------------------------
    // Regras de acoplamento entre ferramentas auxiliares
    // ---------------------------------------------------------------------
    {
      name: 'no-cypress-importing-load-tests',
      severity: 'warn',
      comment:
        'Cypress (E2E) e Load-Tests (performance) têm propósitos diferentes — ' +
        'evitar acoplamento entre eles.',
      from: { path: '^cypress' },
      to: { path: '^load-tests' }
    },
    {
      name: 'no-load-tests-importing-cypress',
      severity: 'warn',
      comment: 'Load-Tests não deveria depender de suporte/fixtures do Cypress.',
      from: { path: '^load-tests' },
      to: { path: '^cypress' }
    },
    {
      name: 'no-scripts-importing-cypress-or-load-tests',
      severity: 'warn',
      comment:
        'Scripts de automação (build/deploy/seed) não deveriam depender de ' +
        'testes de fluxo (cypress) ou de carga (load-tests).',
      from: { path: '^scripts' },
      to: { path: '^(cypress|load-tests)' }
    }
  ],
  options: {
    doNotFollow: {
      path: ['node_modules']
    },

    includeOnly: '^(cypress|load-tests|scripts)',

    detectProcessBuiltinModuleCalls: true,

    tsConfig: {
      fileName: 'jsconfig.json'
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ["module", "main", "types", "typings"]
    },

    skipAnalysisNotInRules: true,

    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)'
      },
      text: {
        highlightFocused: true
      }
    }
  }
};
