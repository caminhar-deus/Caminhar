/**
 * Comandos customizados do Cypress
 * 
 * Este arquivo define comandos reutilizáveis para os testes E2E.
 */

// Comando para logar como admin (simulado via API)
Cypress.Commands.add('login', (email = 'admin@caminhar.com', password = 'senha123') => {
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 200,
    body: { token: 'fake-jwt-token', user: { id: 1, email, role: 'admin' } }
  }).as('loginRequest');

  cy.visit('/admin');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.wait('@loginRequest');
});

// Comando para criar um post via API mockada
Cypress.Commands.add('createPost', (post) => {
  cy.intercept('POST', '/api/posts', {
    statusCode: 201,
    body: { ...post, id: Date.now() }
  }).as('createPost');
});

// Comando para definir viewport mobile
Cypress.Commands.add('viewportMobile', () => {
  cy.viewport(375, 667);
});

// Comando para definir viewport tablet
Cypress.Commands.add('viewportTablet', () => {
  cy.viewport(768, 1024);
});

// Comando para verificar se o lightbox está aberto
Cypress.Commands.add('lightboxShouldBeOpen', () => {
  cy.get('[data-testid="image-lightbox"]').should('be.visible');
  cy.get('[data-testid="image-lightbox-img"]').should('be.visible');
});

// Comando para verificar se o lightbox está fechado
Cypress.Commands.add('lightboxShouldBeClosed', () => {
  cy.get('[data-testid="image-lightbox"]').should('not.exist');
});

// Comando para abrir o lightbox clicando na imagem
Cypress.Commands.add('openLightbox', () => {
  cy.get('[data-testid="image-zoom-container"]').click();
  cy.lightboxShouldBeOpen();
});

// Comando para fechar o lightbox clicando no overlay
Cypress.Commands.add('closeLightboxByOverlay', () => {
  cy.get('[data-testid="image-lightbox"]').click('topLeft');
  cy.lightboxShouldBeClosed();
});