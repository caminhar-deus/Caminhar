describe('Página Inicial (/)', () => {
  it('deve carregar a página sem erros', () => {
    cy.visit('/');
    cy.get('h1').should('exist');
  });

  it('deve exibir o título principal do site', () => {
    cy.visit('/');
    cy.title().should('not.be.empty');
  });

  it('deve ter links de navegação no header', () => {
    cy.visit('/');
    cy.get('nav').should('exist').or('header').should('exist');
    cy.get('a[href="/"]').should('exist');
  });

  it('deve exibir a seção de conteúdo principal', () => {
    cy.visit('/');
    cy.get('main').should('exist');
  });
});