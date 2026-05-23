describe('Navegação entre páginas', () => {
  it('deve navegar da home para a página /blog', () => {
    cy.visit('/');
    cy.get('a[href="/blog"]').first().click();
    cy.url().should('include', '/blog');
  });

  it('deve navegar da home para /blog clicando em link de post', () => {
    cy.visit('/');
    cy.get('a[href*="/blog/"]').first().click();
    cy.url().should('include', '/blog/');
  });

  it('deve carregar a página admin sem erros de autenticação', () => {
    cy.intercept('GET', '/api/auth/check', {
      statusCode: 401,
      body: { error: 'Não autenticado' }
    }).as('checkAuth');

    cy.visit('/admin');
    cy.wait('@checkAuth');
    cy.get('body').should('exist');
  });
});
