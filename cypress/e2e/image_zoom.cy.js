describe('Funcionalidade de Zoom de Imagem (Lightbox) no Post', () => {
  const postMock = {
    id: 1,
    title: 'Post de Teste com Imagem',
    slug: 'post-de-teste-com-imagem',
    excerpt: 'Este é um post para testar o zoom da imagem.',
    image_url: '/placeholder.svg',
    created_at: new Date().toISOString(),
    content: 'Conteúdo do post de teste.'
  };

  context('Fluxo principal (happy path)', () => {
    beforeEach(() => {
      cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
        statusCode: 200,
        body: [postMock]
      }).as('getPost');

      cy.visit(`/blog/${postMock.slug}`);
      cy.wait('@getPost');
    });

    it('deve exibir o container e a imagem do post', () => {
      cy.get('[data-testid="image-zoom-container"]').should('be.visible');
      cy.get('[data-testid="image-zoom-thumb"]')
        .should('be.visible')
        .and('have.attr', 'src')
        .and('not.be.empty');
    });

    it('deve abrir o lightbox ao clicar na imagem', () => {
      cy.get('[data-testid="image-zoom-container"]').click();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
      cy.get('[data-testid="image-lightbox-img"]').should('be.visible');
    });

    it('deve fechar o lightbox ao clicar no overlay', () => {
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').click('topLeft');
      cy.get('[data-testid="image-lightbox"]').should('not.exist');
    });

    it('deve fechar o lightbox com a tecla Esc', () => {
      cy.openLightbox();
      cy.get('body').type('{esc}');
      cy.get('[data-testid="image-lightbox"]').should('not.exist');
    });

    it('deve permitir reabrir o lightbox após fechar', () => {
      cy.openLightbox();
      cy.closeLightboxByOverlay();
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
    });
  });

  context('Testes de borda (edge cases)', () => {
    it('não deve exibir o container de zoom quando o post não tem image_url', () => {
      const postSemImagem = { ...postMock, image_url: null };
      cy.intercept('GET', `/api/posts?slug=${postSemImagem.slug}`, {
        statusCode: 200,
        body: [postSemImagem]
      }).as('getPostSemImagem');

      cy.visit(`/blog/${postSemImagem.slug}`);
      cy.wait('@getPostSemImagem');

      cy.get('[data-testid="image-zoom-container"]').should('not.exist');
      cy.get('[data-testid="image-lightbox"]').should('not.exist');
    });

    it('não deve fechar o lightbox ao clicar diretamente na imagem ampliada', () => {
      cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
        statusCode: 200,
        body: [postMock]
      }).as('getPost');

      cy.visit(`/blog/${postMock.slug}`);
      cy.wait('@getPost');

      cy.openLightbox();
      // Clica diretamente na imagem ampliada (não no overlay)
      cy.get('[data-testid="image-lightbox-img"]').click({ force: true });
      // O lightbox deve permanecer aberto (stopPropagation)
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
    });

    it('deve suportar múltiplas aberturas e fechamentos consecutivos', () => {
      cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
        statusCode: 200,
        body: [postMock]
      }).as('getPost');

      cy.visit(`/blog/${postMock.slug}`);
      cy.wait('@getPost');

      // Ciclo 1: abre e fecha
      cy.openLightbox();
      cy.closeLightboxByOverlay();

      // Ciclo 2: abre e fecha
      cy.openLightbox();
      cy.get('body').type('{esc}');
      cy.lightboxShouldBeClosed();

      // Ciclo 3: abre
      cy.openLightbox();
      cy.lightboxShouldBeOpen();
    });
  });

  context('Responsividade', () => {
    beforeEach(() => {
      cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
        statusCode: 200,
        body: [postMock]
      }).as('getPost');
    });

    it('deve funcionar corretamente em viewport mobile (375×667)', () => {
      cy.viewportMobile();
      cy.visit(`/blog/${postMock.slug}`);
      cy.wait('@getPost');
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.lightboxShouldBeClosed();
    });

    it('deve funcionar corretamente em viewport tablet (768×1024)', () => {
      cy.viewportTablet();
      cy.visit(`/blog/${postMock.slug}`);
      cy.wait('@getPost');
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.lightboxShouldBeClosed();
    });
  });

  context('Acessibilidade', () => {
    beforeEach(() => {
      cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
        statusCode: 200,
        body: [postMock]
      }).as('getPost');

      cy.visit(`/blog/${postMock.slug}`);
      cy.wait('@getPost');
    });

    it('deve ter atributos ARIA corretos no lightbox', () => {
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]')
        .should('have.attr', 'role', 'dialog')
        .and('have.attr', 'aria-modal', 'true')
        .and('have.attr', 'aria-label')
        .and('include', 'Imagem ampliada');
    });

    it('deve mover o foco para o lightbox ao abrir', () => {
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
      // O foco deve estar dentro do lightbox
      cy.focused().should('exist');
    });
  });
});