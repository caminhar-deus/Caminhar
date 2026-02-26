describe('Funcionalidade de Zoom de Imagem (Lightbox) no Post', () => {
  beforeEach(() => {
    // Mock da API para garantir que temos um post com imagem para testar,
    // tornando o teste independente do estado do banco de dados.
    cy.intercept('GET', '/api/posts', {
      statusCode: 200,
      body: [
        {
          id: 1,
          title: 'Post de Teste com Imagem',
          slug: 'post-de-teste-com-imagem',
          excerpt: 'Este é um post para testar o zoom da imagem.',
          image_url: '/placeholder.jpg', // Pode ser qualquer imagem válida na pasta /public
          created_at: new Date().toISOString(),
          content: 'Conteúdo do post de teste.'
        }
      ]
    }).as('getPosts');

    // Visita a página do post que foi mockado
    cy.visit('/blog/post-de-teste-com-imagem');
    cy.wait('@getPosts');
  });

  it('deve abrir e fechar o lightbox da imagem com clique e com a tecla Esc', () => {
    // Seletores para os elementos da funcionalidade de zoom
    const imageContainer = 'div[style*="cursor: zoom-in"]';
    const lightbox = 'div[style*="position: fixed"]';

    // 1. Verifica se a imagem do post está visível
    cy.get(imageContainer).find('img').should('be.visible');

    // 2. Clica na imagem para abrir o lightbox
    cy.get(imageContainer).click();

    // 3. Verifica se o lightbox e a imagem ampliada estão visíveis
    cy.get(lightbox).should('be.visible').find('img').should('be.visible');

    // 4. Clica no fundo (overlay) para fechar o lightbox
    cy.get(lightbox).click('topLeft'); // Clica no canto para garantir que não é na imagem

    // 5. Verifica se o lightbox foi fechado
    cy.get(lightbox).should('not.exist');

    // --- Testa o fechamento com a tecla Esc ---

    // 6. Clica na imagem novamente para reabrir
    cy.get(imageContainer).click();
    cy.get(lightbox).should('be.visible');

    // 7. Pressiona a tecla 'Esc' no corpo da página
    cy.get('body').type('{esc}');

    // 8. Verifica se o lightbox foi fechado
    cy.get(lightbox).should('not.exist');
  });
});