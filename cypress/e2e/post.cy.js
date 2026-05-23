describe('Página de Post Individual (/blog/[slug])', () => {
  // Slug real que existe no banco PostgreSQL
  const SLUG = 'mulher-virtuosa';

  it('deve carregar o post com imagem', () => {
    cy.visit(`/blog/${SLUG}`);

    cy.get('h1').should('contain', 'Mulher Virtuosa');
    cy.get('[data-testid="image-zoom-container"]').should('exist');
  });

  it('deve exibir o conteúdo do post', () => {
    cy.visit(`/blog/${SLUG}`);

    cy.get('h1').should('contain', 'Mulher Virtuosa');
    cy.get('[data-testid="image-zoom-container"]').should('exist');
    cy.get('article').should('contain', 'Provérbios');
  });

  it('deve exibir botões de compartilhamento', () => {
    cy.visit(`/blog/${SLUG}`);

    cy.get('article').should('contain', 'Compartilhe');
    cy.get('a[href*="facebook.com/sharer"]').should('exist');
    cy.get('a[href*="whatsapp.com/send"]').should('exist');
  });
});
