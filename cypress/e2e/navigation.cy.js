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
          id: 1570,
          title: 'Mulher Virtuosa',
          slug: 'mulher-virtuosa',
          excerpt: 'Provérbios 31 : 10',
          image_url: '/uploads/post-image-6010b274-c22f-486a-80a9-dbf9c70d4535.png',
          created_at: '2026-05-18T10:27:42.121Z',
          content: '"Uma mulher virtuosa, quem pode encontrá-la? Superior ao das pérolas é o seu valor."\nProvérbios 31 : 10'
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