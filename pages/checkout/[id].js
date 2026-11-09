import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import styles from '../styles/CustomerPages.module.css';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX (aprovação imediata)', icon: 'zap' },
  { id: 'credit_card', label: 'Cartão de crédito', icon: 'creditCard' },
  { id: 'debit_card', label: 'Cartão de débito', icon: 'creditCard' },
  { id: 'ticket', label: 'Boleto bancário', icon: 'fileText' },
];

function formatBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function estimateShipping(product, quantity) {
  if (!product || product.shipping_type === 'free') return 0;
  const base = Number(product.shipping_cost || 0);
  if (product.shipping_type === 'fixed') return base;
  if (product.shipping_type === 'calculated') {
    const start = base > 0 ? base : 19.9;
    return Number((start + Math.max(0, Number(quantity || 1) - 1) * 4.5).toFixed(2));
  }
  return 0;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { id } = router?.query || {};

  const [customer, setCustomer] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [installments, setInstallments] = useState('1');

  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let active = true;
    async function loadCheckoutContext() {
      setLoading(true);
      setError('');
      try {
        const authRes = await fetch('/api/customer/auth');
        const authData = await authRes.json();
        if (!authRes.ok || !authData.authenticated) {
          router.replace(`/entrar?next=${encodeURIComponent(`/checkout/${id}`)}`);
          return;
        }
        if (!active) return;
        setCustomer(authData.customer);

        const defaultAddr = authData.customer?.default_address;
        if (defaultAddr) {
          setCep(defaultAddr.cep || '');
          setStreet(defaultAddr.street || '');
          setNumber(defaultAddr.number || '');
          setComplement(defaultAddr.complement || '');
          setNeighborhood(defaultAddr.neighborhood || '');
          setCity(defaultAddr.city || '');
          setStateUf(defaultAddr.state || '');
        }

        const prodRes = await fetch(`/api/checkout?productId=${encodeURIComponent(id)}`);
        const prodData = await prodRes.json().catch(() => ({}));
        if (!prodRes.ok || !prodData.product) {
          setError(prodData.message || 'Produto indisponível para compra direta.');
          setLoading(false);
          return;
        }
        if (active) {
          setProduct(prodData.product);
        }
      } catch {
        if (active) {
          setError('Erro de conexão ao carregar o checkout.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCheckoutContext();
    return () => {
      active = false;
    };
  }, [id, router, router.isReady]);

  const shippingValue = useMemo(() => estimateShipping(product, quantity), [product, quantity]);
  const subtotalValue = useMemo(() => Number(product?.price || 0) * Number(quantity || 1), [product, quantity]);
  const totalValue = useMemo(() => subtotalValue + shippingValue, [subtotalValue, shippingValue]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          deliveryAddress: {
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateUf.toUpperCase(),
          },
          paymentMethod,
          paymentDetails: {
            cardHolderName,
            cardNumber,
            installments,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Não foi possível concluir o pedido. Verifique os campos informados.');
        setSubmitting(false);
        return;
      }

      setCompletedOrder(data.order);
    } catch {
      setError('Falha de comunicação ao processar o pagamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Head>
        <title>Finalizar Compra — O Caminhar com Deus</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main id="main-content" className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <AppIcon name="chevronLeft" size={16} />
            Voltar para Produtos Religiosos
          </Link>
          {customer && (
            <Link href="/minha-conta" className={styles.backLink}>
              Minha Conta ({customer.name})
            </Link>
          )}
        </div>

        {loading && (
          <div className={styles.sectionCard}>
            <p>Preparando seu checkout seguro...</p>
          </div>
        )}

        {!loading && error && !product && (
          <div className={styles.sectionCard}>
            <div className={styles.alertError} role="alert">
              {error}
            </div>
            <Link href="/" className={styles.backLink}>
              Voltar para a vitrine
            </Link>
          </div>
        )}

        {!loading && completedOrder && (
          <div className={styles.sectionCard}>
            <div className={styles.alertSuccess} role="status">
              <strong>Pedido #{completedOrder.id} registrado com sucesso!</strong>
            </div>

            <h1 className={styles.pageTitle}>Resumo do Pagamento (Mercado Pago)</h1>
            <p className={styles.pageSubtitle}>
              Produto: <strong>{completedOrder.product_name}</strong> ({completedOrder.quantity} un.) — Total:{' '}
              <strong>{completedOrder.formatted_total_amount}</strong>
            </p>

            {completedOrder.payment_method === 'pix' && completedOrder.payment_payload?.qr_code && (
              <div className={styles.pixBox}>
                <h2 className={styles.sectionTitle}>Pague via PIX</h2>
                <p className={styles.pageSubtitle}>
                  Copie o código PIX Copia e Cola abaixo e realize o pagamento no aplicativo do seu banco:
                </p>
                <div className={styles.codeBox}>{completedOrder.payment_payload.qr_code}</div>
              </div>
            )}

            {completedOrder.payment_method === 'ticket' && (
              <div className={styles.pixBox}>
                <h2 className={styles.sectionTitle}>Boleto Bancário Gerado</h2>
                {completedOrder.payment_payload?.digitable_line && (
                  <>
                    <p className={styles.pageSubtitle}>Linha digitável do boleto:</p>
                    <div className={styles.codeBox}>{completedOrder.payment_payload.digitable_line}</div>
                  </>
                )}
              </div>
            )}

            {(completedOrder.payment_method === 'credit_card' || completedOrder.payment_method === 'debit_card') && (
              <div className={styles.alertInfo}>
                Pagamento processado via cartão ({completedOrder.payment_status === 'approved' ? 'Aprovado' : 'Em análise'}).
              </div>
            )}

            <div style={{ marginTop: 'var(--spacing-6)' }}>
              <Link href="/minha-conta" className={styles.backLink}>
                Acompanhar meu pedido em Minha Conta
              </Link>
            </div>
          </div>
        )}

        {!loading && product && !completedOrder && (
          <form onSubmit={handleCheckoutSubmit} className={styles.checkoutGrid}>
            <div>
              {error && (
                <div className={styles.alertError} role="alert">
                  {error}
                </div>
              )}

              <section className={styles.sectionCard} aria-labelledby="shipping-heading">
                <h1 id="shipping-heading" className={styles.sectionTitle}>
                  1. Endereço de Entrega
                </h1>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-cep" className={styles.label}>
                      CEP
                    </label>
                    <input
                      id="checkout-cep"
                      type="text"
                      required
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="00000-000"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-state" className={styles.label}>
                      Estado (UF)
                    </label>
                    <input
                      id="checkout-state"
                      type="text"
                      required
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value)}
                      placeholder="SP"
                      className={styles.input}
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label htmlFor="checkout-street" className={styles.label}>
                      Rua / Logradouro
                    </label>
                    <input
                      id="checkout-street"
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua Exemplo"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-number" className={styles.label}>
                      Número
                    </label>
                    <input
                      id="checkout-number"
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-complement" className={styles.label}>
                      Complemento (opcional)
                    </label>
                    <input
                      id="checkout-complement"
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Bloco..."
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-neighborhood" className={styles.label}>
                      Bairro
                    </label>
                    <input
                      id="checkout-neighborhood"
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-city" className={styles.label}>
                      Cidade
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className={styles.input}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.sectionCard} aria-labelledby="payment-heading">
                <h2 id="payment-heading" className={styles.sectionTitle}>
                  2. Forma de Pagamento (Mercado Pago)
                </h2>

                <div className={styles.paymentMethodGrid} role="radiogroup" aria-label="Forma de pagamento">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === pm.id}
                      className={
                        paymentMethod === pm.id ? styles.paymentMethodOptionActive : styles.paymentMethodOption
                      }
                      onClick={() => setPaymentMethod(pm.id)}
                    >
                      <AppIcon name={pm.icon} size={18} />
                      {pm.label}
                    </button>
                  ))}
                </div>

                {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <label htmlFor="card-holder" className={styles.label}>
                        Nome impresso no cartão
                      </label>
                      <input
                        id="card-holder"
                        type="text"
                        required
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        className={styles.input}
                        placeholder="Como está no cartão"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="card-number" className={styles.label}>
                        Número do cartão
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className={styles.input}
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>
                    {paymentMethod === 'credit_card' && (
                      <div className={styles.formGroup}>
                        <label htmlFor="card-installments" className={styles.label}>
                          Parcelas
                        </label>
                        <select
                          id="card-installments"
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className={styles.select}
                        >
                          <option value="1">1x sem juros</option>
                          <option value="2">2x sem juros</option>
                          <option value="3">3x sem juros</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.sectionCard} aria-label="Resumo do pedido">
              <h2 className={styles.sectionTitle}>Resumo do Pedido</h2>
              <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-3)' }}>
                {product.name}
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="checkout-quantity" className={styles.label}>
                  Quantidade (Disponível: {product.stock})
                </label>
                <input
                  id="checkout-quantity"
                  type="number"
                  min={1}
                  max={Math.max(1, product.stock)}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), Math.max(1, product.stock)))
                  }
                  className={styles.input}
                />
              </div>

              <div className={styles.summaryRow}>
                <span>Valor unitário:</span>
                <span>{product.formatted_price}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Subtotal ({quantity} un.):</span>
                <span>{formatBrl(subtotalValue)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Frete ({product.shipping_type === 'free' ? 'Grátis' : 'Entrega'}):</span>
                <span>{shippingValue === 0 ? 'Grátis' : formatBrl(shippingValue)}</span>
              </div>

              <div className={styles.summaryTotal}>
                <span>Total a pagar:</span>
                <span>{formatBrl(totalValue)}</span>
              </div>

              <div style={{ marginTop: 'var(--spacing-6)' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={product.stock <= 0}
                >
                  Confirmar e Pagar
                </Button>
              </div>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
