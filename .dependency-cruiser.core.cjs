/** @type {import('dependency-cruiser').IConfiguration} */
// CONTEXTO: CORE
// Valida: pages, components, lib, hooks, data, utils, mocks, tests
// Objetivo: garantir a hierarquia de camadas da aplicação (regras rígidas)
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
      name: 'no-deprecated-core',
      comment:
        'A module depends on a node core module that has been deprecated. Find an alternative.',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^v8/tools/codemap$', '^v8/tools/consarray$', '^v8/tools/csvparser$',
          '^v8/tools/logreader$', '^v8/tools/profile_view$', '^v8/tools/profile$',
          '^v8/tools/SourceMap$', '^v8/tools/splaytree$', '^v8/tools/tickprocessor-driver$',
          '^v8/tools/tickprocessor$', '^node-inspect/lib/_inspect$',
          '^node-inspect/lib/internal/inspect_client$', '^node-inspect/lib/internal/inspect_repl$',
          '^async_hooks$', '^punycode$', '^domain$', '^constants$', '^sys$',
          '^_linklist$', '^_stream_wrap$'
        ]
      }
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
    // Regras de testes/mocks (ajustadas ao projeto)
    // ---------------------------------------------------------------------
    {
      name: 'not-to-test',
      comment:
        "Código de produção não pode depender de arquivos dentro de tests/. " +
        "Testes não implementam funcionalidade.",
      severity: 'error',
      from: { pathNot: '^(tests)' },
      to: { path: '^(tests)' }
    },
    {
      name: 'not-to-spec',
      comment:
        'This module depends on a spec (test) file. Fatore o que for reutilizável ' +
        'para utils/mocks em vez de importar direto de um .spec/.test.',
      severity: 'error',
      from: {},
      to: { path: '[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$' }
    },
    {
      name: 'no-mocks-in-production-code',
      severity: 'error',
      comment:
        'Mocks nunca devem ser importados fora de tests/mocks. Um mock vazando para ' +
        'components/pages/lib é um erro grave de arquitetura.',
      from: { pathNot: '^(tests|mocks)' },
      to: { path: '^mocks' }
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment:
        "This module depends on an npm package from 'devDependencies' mas parece " +
        "código que vai pra produção (lib/).",
      from: {
        path: '^(lib)',
        pathNot: '[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$'
      },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
        pathNot: ['node_modules/@types/']
      }
    },
    {
      name: 'optional-deps-used',
      severity: 'info',
      comment: "This module depends on an npm package declared as optional.",
      from: {},
      to: { dependencyTypes: ['npm-optional'] }
    },
    {
      name: 'peer-deps-used',
      comment: "This module depends on an npm package declared as a peer dependency.",
      severity: 'warn',
      from: {},
      to: { dependencyTypes: ['npm-peer'] }
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
    },
    {
      name: 'no-components-importing-pages',
      severity: 'error',
      comment: 'Components não pode depender de Pages (inversão de hierarquia).',
      from: { path: '^components' },
      to: { path: '^pages' }
    },
    {
      name: 'no-data-importing-ui',
      severity: 'warn',
      comment: 'Data deveria ser consumido pela UI, não o contrário.',
      from: { path: '^data' },
      to: { path: '^(components|pages|hooks)' }
    }
  ],
  options: {
    doNotFollow: {
      path: ['node_modules']
    },

    includeOnly: '^(pages|components|lib|hooks|data|utils|mocks|tests)',

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
