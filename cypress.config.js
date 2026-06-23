import { defineConfig } from 'cypress';

export default defineConfig({
  // Timeout padrão para comandos (ms)
  defaultCommandTimeout: 10000,

  // Timeout para requisições (ms)
  requestTimeout: 10000,

  // Timeout para a página carregar (ms)
  pageLoadTimeout: 30000,

  // Quantidade de tentativas em caso de falha
  retries: {
    runMode: 2,
    openMode: 0,
  },

  // Tamanho da viewport para os testes
  viewportWidth: 1280,
  viewportHeight: 720,

  e2e: {
    // A URL base da sua aplicação em desenvolvimento.
    // O Cypress usará isso para comandos como cy.visit('/').
    baseUrl: 'http://localhost:3000',

    // Grava vídeos das execuções de teste (útil para CI).
    video: true,

    // Tira screenshots automaticamente quando um teste falha.
    screenshotOnRunFailure: true,

    // Desabilita o acesso inseguro a Cypress.env() no navegador.
    allowCypressEnv: false,

    // Informa ao Cypress que não há um arquivo de suporte global.
    supportFile: 'cypress/support/e2e.js',

    setupNodeEvents(_on, _config) {
      // Este é o lugar para registrar plugins do Cypress
      // ou tarefas customizadas que rodam no ambiente Node.
    },
  },
});
