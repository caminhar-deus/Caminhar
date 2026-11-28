/**
 * Validação visual, responsiva (4 viewports), teclado e acessibilidade (PR-03).
 * Integrada ao `npm run test:e2e:isolated` (`.github/workflows/e2e.yml`), sem dependências externas.
 */

const VIEWPORTS = [
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
];

const EXPECT_TAB_LABELS = [
  'Reflexões & Estudos',
  'Em Desenvolvimento',
  'Músicas',
  'Vídeos',
  'Produtos Religiosos',
];

function assertNoHorizontalOverflow(contexto) {
  cy.window().then((win) => {
    const scrollWidth = win.document.documentElement.scrollWidth;
    expect(scrollWidth, `overflow horizontal em ${contexto}`).to.be.at.most(win.innerWidth + 1);
  });
}

function assertAcrossViewports(label, onViewport = null) {
  VIEWPORTS.forEach(([width, height]) => {
    cy.viewport(width, height);
    assertNoHorizontalOverflow(`${label} (${width}x${height})`);
    if (onViewport) {
      onViewport(width, height);
    }
  });
}

describe('Design System, Responsividade (4 viewports) e Acessibilidade (PR-03)', () => {
  it('Home (/), cabeçalho público e aba Produtos sem overflow nos 4 viewports', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: false },
    }).as('getCustomerAuth');

    cy.intercept('GET', '/api/products*', {
      statusCode: 200,
      body: {
        data: [
          {
            id: 1,
            name: 'Bíblia Sagrada Estudo',
            description: 'Edição com notas e concordância.',
            price: '89.90',
            formatted_price: 'R$ 89,90',
            modality: 'external',
            link_ml: 'https://mercadolivre.com.br/p/1',
            images: [],
          },
          {
            id: 2,
            name: 'Terço Artesanal São Bento',
            description: 'Contas em madeira nobre.',
            price: '49.90',
            formatted_price: 'R$ 49,90',
            modality: 'internal',
            stock: 5,
            shipping_type: 'free',
            shipping_cost: 0,
            images: [],
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 2 },
        categories: ['Bíblias', 'Terços'],
      },
    }).as('getProducts');

    cy.visit('/');
    cy.wait('@getCustomerAuth');

    // Ordem protegida das 5 abas e aba "Em Desenvolvimento" desabilitada
    cy.get('[role="tablist"] [role="tab"]').should(($tabs) => {
      const labels = [...$tabs].map((el) => el.textContent.trim());
      expect(labels).to.deep.equal(EXPECT_TAB_LABELS);
    });
    cy.get('#projeto1-tab').should('be.disabled');

    // Ação de conta no cabeçalho com alvo clicável adequado
    cy.get('a[href="/entrar"]').first().should(($link) => {
      const rect = $link[0].getBoundingClientRect();
      expect(rect.height).to.be.at.least(40);
    });

    assertAcrossViewports('Home /');

    // Aba Produtos Religiosos: barra desktop e sem overflow nos 4 viewports
    cy.get('#produtos-tab').click();
    cy.wait('@getProducts');
    cy.contains('Bíblia Sagrada Estudo').should('be.visible');
    cy.contains('Terço Artesanal São Bento').should('be.visible');

    assertAcrossViewports('Home Produtos', (width) => {
      if (width === 1440) {
        cy.get('input[placeholder="Buscar produtos por nome..."]').then(($search) => {
          cy.get('#sort-select-products').then(($sort) => {
            const searchTop = $search[0].getBoundingClientRect().top;
            const sortTop = $sort[0].getBoundingClientRect().top;
            expect(Math.abs(sortTop - searchTop), 'barra de filtros alinhada no desktop').to.be.lessThan(30);
          });
        });
      }
    });
  });

  it('Artigo público (/blog/mulher-virtuosa) acessível nos 4 viewports com zoom por botão e toque >= 44px', () => {
    cy.visit('/blog/mulher-virtuosa');

    cy.get('a.skip-link[href="#main-content"]').should('exist');
    cy.get('main#main-content').should('exist');
    cy.get('h1').should('be.visible');
    cy.get('h2').should('contain.text', 'Compartilhe esta reflexão:');
    cy.get('article h3').should('not.exist');

    // Alvos de toque >= 44px nos 3 botões de compartilhamento
    cy.contains('a', 'Facebook').should(($el) => {
      expect($el[0].getBoundingClientRect().height).to.be.at.least(44);
    });
    cy.contains('a', 'WhatsApp').should(($el) => {
      expect($el[0].getBoundingClientRect().height).to.be.at.least(44);
    });
    cy.contains('button', 'Instagram / Copiar Link').should(($el) => {
      expect($el[0].getBoundingClientRect().height).to.be.at.least(44);
    });

    assertAcrossViewports('Artigo /blog/mulher-virtuosa');

    // Zoom acessível via botão sem quebrar lightbox existente
    cy.get('button[data-testid="image-zoom-container"]').click();
    cy.get('[data-testid="image-lightbox"]').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="image-lightbox"]').should('not.exist');
  });

  it('Visitante (/entrar), Login (/login?reason=inactivity) e /404 nos 4 viewports com foco visível e reduced-motion', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: false },
    }).as('getCustomerAuthEntrar');

    cy.visit('/entrar');
    cy.wait('@getCustomerAuthEntrar');

    assertAcrossViewports('Visitante /entrar');

    // Verifica guard prefers-reduced-motion carregado nas folhas de estilo
    cy.document().then((doc) => {
      let hasReducedMotion = false;
      for (const sheet of doc.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          rules = null;
        }
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.conditionText && rule.conditionText.includes('prefers-reduced-motion') && rule.conditionText.includes('reduce')) {
            hasReducedMotion = true;
          }
        }
      }
      expect(hasReducedMotion, 'regra prefers-reduced-motion ativa').to.equal(true);
    });

    // Verifica foco duplo em controle interativo (sem encadear .should após .focus())
    cy.get('#customer-email').focus();
    cy.get('#customer-email').should(($input) => {
      const style = window.getComputedStyle($input[0]);
      expect(style.outlineStyle).to.not.equal('none');
      expect(style.boxShadow).to.not.equal('none');
    });

    cy.visit('/login?reason=inactivity');
    cy.get('[role="status"]').should('be.visible');
    assertAcrossViewports('Login /login?reason=inactivity');

    cy.visit('/rota-inexistente-design-check', { failOnStatusCode: false });
    cy.get('[data-testid="not-found-code"]').should('contain.text', '404');
    cy.get('a.skip-link[href="#main-content"]').should('exist');
    cy.get('[data-testid="not-found-home-link"]').should(($link) => {
      expect($link[0].getBoundingClientRect().height).to.be.at.least(44);
    });
    assertAcrossViewports('Página 404');
  });

  it('Painel Administrativo (/admin): empilha .statColumns em 375px e opera busca/limpar em AdminSales sem overflow', () => {
    const ALL_PERMISSIONS = [
      'Visão Geral',
      'Posts/Artigos',
      'Gestão de Músicas',
      'Gestão de Vídeos',
      'Gestão de Produtos',
      'Gestão de Vendas',
      'Gestão de Dicas',
      'Configuração de Cabeçalho',
      'Segurança',
      'Usuários',
      'Auditoria',
    ];

    cy.intercept('GET', '/api/auth/check', {
      statusCode: 200,
      body: {
        success: true,
        data: { user: { id: 1, username: 'admin', role: 'admin', permissions: ALL_PERMISSIONS } },
      },
    }).as('checkAdminAuth');

    cy.intercept('GET', '/api/settings', {
      statusCode: 200,
      body: { site_title: 'O Caminhar com Deus', site_subtitle: 'Reflexões' },
    }).as('getAdminSettings');

    cy.intercept('GET', '/api/admin/stats', {
      statusCode: 200,
      body: {
        posts: 10,
        postsPublished: 8,
        postsDraft: 2,
        musicas: 5,
        musicasPublished: 5,
        musicasDraft: 0,
        videos: 4,
        videosPublished: 4,
        videosDraft: 0,
        products: 6,
        productsPublished: 5,
        productsDraft: 1,
        sales: 3,
        salesPaymentPix: 2,
        salesPaymentCreditCard: 1,
        salesPaymentDebitCard: 0,
        salesPaymentTicket: 0,
        salesOrderAwaitingPayment: 1,
        salesOrderPaid: 1,
        salesOrderPreparing: 0,
        salesOrderShipped: 1,
        salesOrderDelivered: 0,
        salesOrderCancelled: 0,
        internalProducts: 2,
        internalProductsPublished: 2,
        internalProductsDraft: 0,
        dicas: 7,
        dicasPublished: 7,
        dicasDraft: 0,
        users: 1,
        usersToday: 1,
        usersMonth: 1,
        usersYear: 1,
      },
    }).as('getAdminStats');

    cy.intercept('GET', '/api/admin/orders*', {
      statusCode: 200,
      body: { data: [], pagination: { page: 1, totalPages: 1, total: 0 } },
    }).as('getAdminOrders');

    cy.intercept('GET', '/api/admin/internal-products*', {
      statusCode: 200,
      body: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } },
    }).as('getAdminInternalProducts');

    cy.visit('/admin');
    cy.wait(['@checkAdminAuth', '@getAdminStats']);

    cy.contains('Visão Geral do Sistema').should('be.visible');

    // No mobile 375px, .statColumns deve empilhar verticalmente (DS-06) sem overflow
    cy.viewport(375, 812);
    assertNoHorizontalOverflow('Admin Visão Geral (375x812)');
    cy.contains(/^Pagamento$/).then(($pag) => {
      cy.contains(/^Andamento$/).then(($and) => {
        const pagRect = $pag[0].getBoundingClientRect();
        const andRect = $and[0].getBoundingClientRect();
        expect(andRect.top, 'Andamento empilhado abaixo de Pagamento em 375px').to.be.at.least(pagRect.bottom - 2);
      });
    });

    assertAcrossViewports('Admin Visão Geral');

    // Navega para Gestão de Vendas e valida busca + limpar busca
    cy.viewport(1440, 900);
    cy.get('button[aria-label="Gestão de Vendas"]').first().click();
    cy.wait('@getAdminOrders');

    cy.get('input[aria-label="Buscar pedidos"]').type('Maria');
    cy.get('button[aria-label="Limpar busca"]').should('be.visible').click();
    cy.get('input[aria-label="Buscar pedidos"]').should('have.value', '');

    assertAcrossViewports('Admin Gestão de Vendas');
  });
});
