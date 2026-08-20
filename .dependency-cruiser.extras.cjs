/** @type {import('dependency-cruiser').IConfiguration} */
// CONTEXTO: EXTRAS
// Valida: pages, components, lib, hooks, data, utils, mocks, tests, cypress, load-tests, scripts
// Objetivo: garantir que o app não seja "invadido" por dependências de teste/automação
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
    {
      name: 'no-duplicate-dep-types',
      comment:
        "Likely this module depends on an external ('npm') package that occurs more than once " +
        "in your package.json (both in devDependencies and dependencies).",
      severity: 'warn',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        dependencyTypesNot: ["type-only"]
      }
    },

    // ---------------------------------------------------------------------
    // Regras de proteção do app contra os "extras"
    // ---------------------------------------------------------------------
    {
      name: 'no-app-importing-cypress',
      severity: 'error',
      comment: 'Código de produção nunca pode depender de Cypress.',
      from: { pathNot: '^cypress' },
      to: { path: '^cypress' }
    },
    {
      name: 'no-app-importing-load-tests',
      severity: 'error',
      comment: 'Código de produção nunca pode depender de Load-Tests.',
      from: { pathNot: '^load-tests' },
      to: { path: '^load-tests' }
    },
    {
      name: 'no-app-importing-scripts',
      severity: 'error',
      comment: 'Código de produção nunca pode depender de Scripts de automação.',
      from: { pathNot: '^scripts' },
      to: { path: '^scripts' }
    },
    {
      name: 'no-mocks-in-production-code',
      severity: 'error',
      comment:
        'Mocks só podem ser usados por tests, mocks ou cypress (fixtures/E2E). ' +
        'Nunca por components, pages, lib ou hooks.',
      from: { pathNot: '^(tests|mocks|cypress)' },
      to: { path: '^mocks' }
    },
    {
      name: 'not-to-spec',
      comment: 'This module depends on a spec (test) file.',
      severity: 'error',
      from: { pathNot: '^(cypress|tests)' },
      to: { path: '[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$' }
    },

    // ---------------------------------------------------------------------
    // Regras de camadas (arquitetura do projeto)
    // ---------------------------------------------------------------------
    {
      name: 'no-utils-importing-upper-layers',
      severity: 'error',
      comment: 'Utils deve ser a camada mais isolada — não pode depender de nada acima.',
      from: { path: '^utils' },
      to: { path: '^(components|pages|hooks|lib)' }
    },
    {
      name: 'no-hooks-importing-ui',
      severity: 'error',
      comment: 'Hooks não deve depender de Components ou Pages.',
      from: { path: '^hooks' },
      to: { path: '^(components|pages)' }
    },
    {
      name: 'no-lib-importing-ui',
      severity: 'error',
      comment: 'Lib é infraestrutura — não pode depender de UI.',
      from: { path: '^lib' },
      to: { path: '^(components|pages|hooks)' }
    }
  ],
  options: {
    doNotFollow: {
      path: ['node_modules']
    },

    includeOnly: '^(pages|components|lib|hooks|data|utils|mocks|tests|cypress|load-tests|scripts)',

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
      archi: {
        collapsePattern: '^(?:packages|src|lib(s?)|app(s?)|bin|test(s?)|spec(s?))/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)'
      },
      text: {
        highlightFocused: true
      }
    }
  }
};
