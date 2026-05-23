describe('Página de Post Individual (/blog/[slug])', () => {
  const postMock = {
    id: 1570,
    title: 'Mulher Virtuosa',
    slug: 'mulher-virtuosa',
    excerpt: 'Provérbios 31 : 10',
    image_url: '/uploads/post-image-6010b274-c22f-486a-80a9-dbf9c70d4535.png',
    created_at: '2026-05-18T10:27:42.121Z',
    content: '"Uma mulher virtuosa, quem pode encontrá-la? Superior ao das pérolas é o seu valor."\nProvérbios 31 : 10'
  };

  it('deve carregar o post com imagem', () => {
    cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
      statusCode: 200,
      body: [postMock]
    }).as('getPost');

    cy.visit(`/blog/${postMock.slug}`);
    cy.wait('@getPost');

    cy.get('h1').should('contain', postMock.title);
    cy.get('[data-testid="image-zoom-container"]').should('exist');
  });

  it('deve exibir o conteúdo do post', () => {
    cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
      statusCode: 200,
      body: [postMock]
    }).as('getPostCompleto');

    cy.visit(`/blog/${postMock.slug}`);
    cy.wait('@getPostCompleto');

    cy.get('h1').should('contain', postMock.title);
    cy.get('[data-testid="image-zoom-container"]').should('exist');
    cy.get('article').should('contain', postMock.content.split('\n')[0]);
  });

  it('deve exibir botões de compartilhamento', () => {
    cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
      statusCode: 200,
      body: [postMock]
    }).as('getPostCompartilhar');

    cy.visit(`/blog/${postMock.slug}`);
    cy.wait('@getPostCompartilhar');

    cy.get('article').should('contain', 'Compartilhe');
    cy.get('a[href*="facebook.com/sharer"]').should('exist');
    cy.get('a[href*="whatsapp.com/send"]').should('exist');
  });
});
