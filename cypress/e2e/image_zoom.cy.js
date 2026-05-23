describe('Funcionalidade de Zoom de Imagem (Lightbox) no Post', () => {
  // Slugs reais que existem no banco PostgreSQL
  const SLUG_COM_IMAGEM = 'mulher-virtuosa'; // publicado com image_url
  const SLUG_SEM_IMAGEM = 'post-inexistente'; // slug que não existe → retorna 404

  context('Fluxo principal (happy path)', () => {
    beforeEach(() => {
      cy.visit(`/blog/${SLUG_COM_IMAGEM}`);
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
    it('não deve exibir o container de zoom para slug inexistente', () => {
      // Slug que não existe no banco → SSR retorna 404 (notFound: true)
      // failOnStatusCode: false permite visitar página 404 sem lançar erro
      cy.visit(`/blog/${SLUG_SEM_IMAGEM}`, { failOnStatusCode: false });
      cy.get('[data-testid="image-zoom-container"]').should('not.exist');
      cy.get('[data-testid="image-lightbox"]').should('not.exist');
    });

    it('deve fechar o lightbox ao clicar diretamente na imagem ampliada', () => {
      cy.visit(`/blog/${SLUG_COM_IMAGEM}`);
      cy.openLightbox();
      // A imagem está dentro do div do lightbox. O onClick do div pai
      // executa setIsImageZoomed(false) via propagação de evento.
      cy.get('[data-testid="image-lightbox-img"]').click({ force: true });
      // O comportamento da aplicação é fechar o lightbox (sem stopPropagation)
      cy.get('[data-testid="image-lightbox"]').should('not.exist');
    });

    it('deve suportar múltiplas aberturas e fechamentos consecutivos', () => {
      cy.visit(`/blog/${SLUG_COM_IMAGEM}`);

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
    it('deve funcionar corretamente em viewport mobile (375×667)', () => {
      cy.viewportMobile();
      cy.visit(`/blog/${SLUG_COM_IMAGEM}`);
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.lightboxShouldBeClosed();
    });

    it('deve funcionar corretamente em viewport tablet (768×1024)', () => {
      cy.viewportTablet();
      cy.visit(`/blog/${SLUG_COM_IMAGEM}`);
      cy.openLightbox();
      cy.get('[data-testid="image-lightbox"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.lightboxShouldBeClosed();
    });
  });

  context('Acessibilidade', () => {
    beforeEach(() => {
      cy.visit(`/blog/${SLUG_COM_IMAGEM}`);
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
      // O foco deve estar no lightbox (agora gerenciado via useRef + useEffect + tabIndex)
      cy.focused().should('have.attr', 'data-testid', 'image-lightbox');
    });
  });
});
