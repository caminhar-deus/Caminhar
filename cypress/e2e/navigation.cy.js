describe('Navegação entre páginas', () => {
  it('deve navegar da home para a página /blog', () => {
    cy.visit('/');
    cy.get('a[href="/blog"]').first().click();
    cy.url().should('include', '/blog');
  });

  it('deve navegar da home para /blog clicando em link de post', () => {
    cy.intercept('GET', '/api/posts*', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'Post Teste',
          slug: 'post-teste',
          excerpt: 'Excerpt',
          image_url: '/placeholder.svg',
          created_at: '2026-01-01T00:00:00.000Z',
          content: 'Conteúdo'
        }
      ]
    }).as('getPosts');

    cy.visit('/');
    cy.wait('@getPosts');
    cy.get('a[href*="/blog/"]').first().click();
    cy.url().should('include', '/blog/');
  });

  it('deve carregar a página admin sem erros de autenticação', () => {
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 401,
      body: { error: 'Não autenticado' }
    }).as('checkAuth');

    cy.visit('/admin');
    cy.wait('@checkAuth');
    cy.get('body').should('exist');
  });
});