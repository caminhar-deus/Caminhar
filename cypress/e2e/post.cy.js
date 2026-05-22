describe('Página de Post Individual (/blog/[slug])', () => {
  const postMock = {
    id: 1,
    title: 'Post de Teste',
    slug: 'post-de-teste',
    excerpt: 'Excerpt do post de teste',
    image_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    content: 'Conteúdo do post de teste.'
  };

  it('deve carregar o post mesmo sem imagem', () => {
    cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
      statusCode: 200,
      body: [postMock]
    }).as('getPost');

    cy.visit(`/blog/${postMock.slug}`);
    cy.wait('@getPost');

    cy.get('h1').should('contain', postMock.title);
    cy.get('[data-testid="image-zoom-container"]').should('not.exist');
  });

  it('deve exibir o conteúdo do post', () => {
    const postCompleto = { ...postMock, image_url: '/placeholder.svg' };

    cy.intercept('GET', `/api/posts?slug=${postCompleto.slug}`, {
      statusCode: 200,
      body: [postCompleto]
    }).as('getPostCompleto');

    cy.visit(`/blog/${postCompleto.slug}`);
    cy.wait('@getPostCompleto');

    cy.get('h1').should('contain', postCompleto.title);
    cy.get('[data-testid="image-zoom-container"]').should('exist');

    // Verifica se o conteúdo textual está presente
    cy.get('article').should('contain', postCompleto.content);
  });

  it('deve exibir botões de compartilhamento', () => {
    const postCompartilhar = { ...postMock, image_url: '/placeholder.svg' };

    cy.intercept('GET', `/api/posts?slug=${postCompartilhar.slug}`, {
      statusCode: 200,
      body: [postCompartilhar]
    }).as('getPostCompartilhar');

    cy.visit(`/blog/${postCompartilhar.slug}`);
    cy.wait('@getPostCompartilhar');

    cy.get('article').should('contain', 'Compartilhe');
    cy.get('a[href*="facebook.com/sharer"]').should('exist');
    cy.get('a[href*="whatsapp.com/send"]').should('exist');
  });
});