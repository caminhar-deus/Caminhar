import { defineConfig } from 'cypress';

export default defineConfig({
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
    supportFile: false,
    setupNodeEvents(on, config) {
      // Este é o lugar para registrar plugins do Cypress
      // ou tarefas customizadas que rodam no ambiente Node.
    },
  },
});