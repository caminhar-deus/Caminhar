describe('Página de Blog (/blog)', () => {
  it('deve carregar a listagem de posts', () => {
    cy.visit('/blog');
    cy.get('h1').should('exist');
  });

  it('deve exibir o título da página', () => {
    cy.visit('/blog');
    cy.title().should('not.be.empty');
  });

  it('deve exibir links para posts individuais', () => {
    cy.visit('/blog');
    cy.get('a[href*="/blog/"]').should('have.length.at.least', 1);
  });
});
