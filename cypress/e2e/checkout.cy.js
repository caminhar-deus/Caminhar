describe('Checkout Transparente e Minha Conta (Modalidade B)', () => {
  const MOCK_CUSTOMER = {
    id: 42,
    name: 'Maria Peregrina',
    email: 'maria@exemplo.com',
    default_address: {
      cep: '01001-000',
      street: 'Praça da Sé',
      number: '100',
      complement: 'Apto 12',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    },
  };

  const MOCK_PRODUCT = {
    id: 101,
    name: 'Terço de Madeira São Bento',
    price: 45,
    formatted_price: 'R$ 45,00',
    modality: 'internal',
    stock: 5,
    shipping_type: 'free',
    shipping_cost: 0,
  };

  const PENDING_PIX_ORDER = {
    id: 501,
    product_id: 101,
    product_name: 'Terço de Madeira São Bento',
    quantity: 1,
    formatted_unit_price: 'R$ 45,00',
    formatted_shipping_cost: 'Grátis',
    formatted_total_amount: 'R$ 45,00',
    payment_method: 'pix',
    payment_status: 'pending',
    order_status: 'awaiting_payment',
    created_at: '2026-11-16T12:00:00.000Z',
    tracking_code: null,
    delivery_address: MOCK_CUSTOMER.default_address,
    payment_payload: {
      qr_code: '00020126580014BR.GOV.BCB.PIX0136caminhar-teste-pix-501',
    },
  };

  it('deve redirecionar visitante não autenticado para /entrar com retorno ao checkout', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: false },
    }).as('getCustomerAuth');

    cy.visit('/checkout/101');
    cy.wait('@getCustomerAuth');

    cy.url().should('include', '/entrar?next=%2Fcheckout%2F101');
    cy.get('h1').should('contain.text', 'Acesse sua conta');
  });

  it('deve carregar checkout transparente com endereço padrão e opções de pagamento', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: true, customer: MOCK_CUSTOMER },
    }).as('getCustomerAuth');

    cy.intercept('GET', '/api/checkout?productId=101', {
      statusCode: 200,
      body: { product: MOCK_PRODUCT },
    }).as('getCheckoutProduct');

    cy.visit('/checkout/101');
    cy.wait(['@getCustomerAuth', '@getCheckoutProduct']);

    cy.get('#checkout-cep').should('have.value', '01001-000');
    cy.get('#checkout-street').should('have.value', 'Praça da Sé');
    cy.get('#checkout-city').should('have.value', 'São Paulo');
    cy.get('#checkout-state').should('have.value', 'SP');

    cy.contains('Terço de Madeira São Bento').should('be.visible');
    cy.contains('R$ 45,00').should('be.visible');
    cy.get('[role="radiogroup"]').within(() => {
      cy.contains('PIX (aprovação imediata)').should('have.attr', 'aria-checked', 'true');
      cy.contains('Cartão de crédito').should('exist');
      cy.contains('Boleto bancário').should('exist');
    });
  });

  it('deve finalizar pedido via PIX e reconciliar confirmação de pagamento', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: true, customer: MOCK_CUSTOMER },
    }).as('getCustomerAuth');

    cy.intercept('GET', '/api/checkout?productId=101', {
      statusCode: 200,
      body: { product: MOCK_PRODUCT },
    }).as('getCheckoutProduct');

    cy.intercept('POST', '/api/checkout', {
      statusCode: 201,
      body: { order: PENDING_PIX_ORDER },
    }).as('createOrder');

    cy.intercept('GET', '/api/customer/orders?orderId=501*', {
      statusCode: 200,
      body: {
        order: {
          ...PENDING_PIX_ORDER,
          payment_status: 'approved',
          order_status: 'paid',
        },
      },
    }).as('reconcileOrder');

    cy.visit('/checkout/101');
    cy.wait(['@getCustomerAuth', '@getCheckoutProduct']);

    cy.get('#payer-document').type('12345678909');
    cy.contains('button', 'Confirmar e Pagar').click();
    cy.wait('@createOrder');

    cy.contains('Pedido #501 aguardando pagamento via PIX').should('be.visible');
    cy.contains(PENDING_PIX_ORDER.payment_payload.qr_code).should('be.visible');

    cy.contains('button', 'Verificar pagamento agora').click();
    cy.wait('@reconcileOrder');

    cy.contains('Pedido #501 confirmado e pago!').should('be.visible');
  });

  it('deve exibir compras internas e aviso de separação em /minha-conta', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: true, customer: MOCK_CUSTOMER },
    }).as('getCustomerAuth');

    cy.intercept('GET', '/api/customer/orders', {
      statusCode: 200,
      body: {
        orders: [
          {
            ...PENDING_PIX_ORDER,
            payment_status: 'approved',
            order_status: 'paid',
          },
        ],
      },
    }).as('getCustomerOrders');

    cy.visit('/minha-conta');
    cy.wait(['@getCustomerAuth', '@getCustomerOrders']);

    cy.contains('h2', 'Minhas Compras Internas').should('be.visible');
    cy.contains('Venda direta').should('be.visible');
    cy.contains('Pedido #501').should('be.visible');
    cy.contains('Pagamento aprovado').should('be.visible');
    cy.contains('Pago').should('be.visible');
  });

  function stubMercadoPagoSdk(win) {
    win.MercadoPago = function MercadoPagoMock() {
      return {
        getPaymentMethods: () =>
          Promise.resolve({
            results: [{ id: 'master', name: 'Mastercard', payment_type_id: 'credit_card', issuer: { id: 24 } }],
          }),
        getInstallments: () =>
          Promise.resolve([
            { payer_costs: [{ installments: 1, recommended_message: '1x de R$ 45,00 sem juros' }] },
          ]),
        createCardToken: () => Promise.resolve({ id: 'tok_e2e_master_123' }),
      };
    };
  }

  it('deve concluir compra via cartão de crédito com tokenização SDK e limpar dados sensíveis do cartão', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: true, customer: MOCK_CUSTOMER },
    }).as('getCustomerAuth');

    cy.intercept('GET', '/api/checkout?productId=101', {
      statusCode: 200,
      body: { product: MOCK_PRODUCT },
    }).as('getCheckoutProduct');

    cy.intercept('POST', '/api/checkout', {
      statusCode: 201,
      body: {
        order: {
          ...PENDING_PIX_ORDER,
          id: 502,
          payment_method: 'credit_card',
          payment_status: 'approved',
          order_status: 'paid',
          payment_payload: { status_detail: 'accredited', mp_order_status: 'processed' },
        },
      },
    }).as('createCardOrder');

    cy.visit('/checkout/101', {
      onBeforeLoad: stubMercadoPagoSdk,
    });
    cy.wait(['@getCustomerAuth', '@getCheckoutProduct']);

    cy.get('#payer-document').type('12345678909');
    cy.contains('[role="radio"]', 'Cartão de crédito').click();
    cy.get('#card-holder').type('MARIA PEREGRINA');
    cy.get('#card-number').type('5031433225206379');
    cy.get('#card-expiry').type('1130');
    cy.get('#card-cvv').type('123');
    cy.contains('button', 'Confirmar e Pagar').click();

    cy.wait('@createCardOrder').then((interception) => {
      expect(interception.request.headers).to.have.property('x-idempotency-key');
      expect(interception.request.body?.paymentDetails).to.not.have.property('cardNumber');
    });
    cy.contains('Pedido #502 confirmado e pago!').should('be.visible');
  });

  it('deve exibir feedback de recusa de cartão e permitir tentar outro meio de pagamento e gerar boleto normalizado', () => {
    cy.intercept('GET', '/api/customer/auth', {
      statusCode: 200,
      body: { authenticated: true, customer: MOCK_CUSTOMER },
    }).as('getCustomerAuth');

    cy.intercept('GET', '/api/checkout?productId=101', {
      statusCode: 200,
      body: { product: MOCK_PRODUCT },
    }).as('getCheckoutProduct');

    cy.intercept('POST', '/api/checkout', (req) => {
      if (req.body?.paymentMethod === 'credit_card') {
        req.reply({
          statusCode: 201,
          body: {
            order: {
              ...PENDING_PIX_ORDER,
              id: 503,
              payment_method: 'credit_card',
              payment_status: 'rejected',
              order_status: 'cancelled',
              payment_payload: { status_detail: 'insufficient_amount' },
            },
          },
        });
      } else {
        req.reply({
          statusCode: 201,
          body: {
            order: {
              ...PENDING_PIX_ORDER,
              id: 504,
              payment_method: 'ticket',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
              payment_payload: {
                digitable_line: '23793380296060108770738006333306316330000004500',
                ticket_url: 'https://www.mercadopago.com.br/staging/payments/999/ticket',
              },
            },
          },
        });
      }
    }).as('checkoutAttempt');

    cy.visit('/checkout/101', {
      onBeforeLoad: stubMercadoPagoSdk,
    });
    cy.wait(['@getCustomerAuth', '@getCheckoutProduct']);

    cy.get('#payer-document').type('12345678909');
    cy.contains('[role="radio"]', 'Cartão de crédito').click();
    cy.get('#card-holder').type('APRO');
    cy.get('#card-number').type('5031433225206379');
    cy.get('#card-expiry').type('1130');
    cy.get('#card-cvv').type('123');
    cy.contains('button', 'Confirmar e Pagar').click();
    cy.wait('@checkoutAttempt');

    cy.contains('Pagamento recusado no Pedido #503').should('be.visible');
    cy.contains(/saldo ou limite insuficiente/i).should('be.visible');
    cy.contains('button', 'Tentar outro meio de pagamento').click();

    cy.get('#card-number').should('have.value', '');
    cy.get('#card-expiry').should('have.value', '');
    cy.get('#card-cvv').should('have.value', '');

    cy.contains('[role="radio"]', 'Boleto bancário').click();
    cy.contains('button', 'Confirmar e Pagar').click();
    cy.wait('@checkoutAttempt');

    cy.contains('Boleto gerado para o Pedido #504').should('be.visible');
    cy.contains('a', 'Abrir boleto para pagamento')
      .should('have.attr', 'href', 'https://www.mercadopago.com.br/sandbox/payments/999/ticket');
  });
});
