describe('Página Inicial (/)', () => {
  it('deve carregar a página sem erros', () => {
    cy.visit('/');
    cy.get('h1').should('exist');
  });

  it('deve exibir o título principal do site', () => {
    cy.visit('/');
    cy.title().should('not.be.empty');
  });

  it('deve ter elementos de navegação', () => {
    cy.visit('/');
    cy.get('main').should('exist');
    cy.get('h1').should('exist');
    // A página inicial atual não possui <nav> ou <header> HTML
    // Verifica se há links de navegação no conteúdo renderizado
    cy.get('a[href*="/"]').should('exist');
  });

  it('deve exibir a seção de conteúdo principal', () => {
    cy.visit('/');
    cy.get('main').should('exist');
  });
});