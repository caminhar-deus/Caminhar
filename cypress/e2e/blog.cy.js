describe('Página de Blog (/blog)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/posts*', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'Post 1',
          slug: 'post-1',
          excerpt: 'Excerpt do post 1',
          image_url: '/placeholder.svg',
          created_at: '2026-01-01T00:00:00.000Z',
          content: 'Conteúdo do post 1'
        },
        {
          id: 2,
          title: 'Post 2',
          slug: 'post-2',
          excerpt: 'Excerpt do post 2',
          image_url: '/placeholder.svg',
          created_at: '2026-01-02T00:00:00.000Z',
          content: 'Conteúdo do post 2'
        }
      ]
    }).as('getPosts');
  });

  it('deve carregar a listagem de posts', () => {
    cy.visit('/blog');
    cy.wait('@getPosts');
    cy.get('h1').should('exist');
  });

  it('deve exibir o título da página', () => {
    cy.visit('/blog');
    cy.wait('@getPosts');
    cy.title().should('not.be.empty');
  });

  it('deve exibir links para posts individuais', () => {
    cy.visit('/blog');
    cy.wait('@getPosts');
    cy.get('a[href*="/blog/"]').should('have.length.at.least', 1);
  });
});