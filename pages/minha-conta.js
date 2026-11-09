import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import styles from './styles/CustomerPages.module.css';

const PAYMENT_STATUS_LABELS = {
  approved: { label: 'Pagamento aprovado', badgeClass: 'badgeSuccess' },
  pending: { label: 'Aguardando pagamento', badgeClass: 'badgeWarning' },
  in_process: { label: 'Em análise', badgeClass: 'badgeInfo' },
  rejected: { label: 'Pagamento recusado', badgeClass: 'badgeError' },
  cancelled: { label: 'Cancelado', badgeClass: 'badgeError' },
  refunded: { label: 'Reembolsado', badgeClass: 'badgeInfo' },
};

const ORDER_STATUS_LABELS = {
  awaiting_payment: { label: 'Aguardando pagamento', badgeClass: 'badgeWarning' },
  paid: { label: 'Pago', badgeClass: 'badgeSuccess' },
  preparing: { label: 'Em separação', badgeClass: 'badgeInfo' },
  shipped: { label: 'Enviado', badgeClass: 'badgeInfo' },
  delivered: { label: 'Entregue', badgeClass: 'badgeSuccess' },
  cancelled: { label: 'Cancelado', badgeClass: 'badgeError' },
};

const PAYMENT_METHOD_LABELS = {
  pix: 'PIX',
  debit_card: 'Cartão de débito',
  credit_card: 'Cartão de crédito',
  ticket: 'Boleto bancário',
};

export default function MinhaContaPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAccountData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const authRes = await fetch('/api/customer/auth');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.replace('/entrar?next=/minha-conta');
        return;
      }
      setCustomer(authData.customer);

      const ordersRes = await fetch('/api/customer/orders');
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      } else {
        setError('Não foi possível carregar o histórico de compras.');
      }
    } catch {
      setError('Sem conexão ao consultar seus pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  const handleLogout = async () => {
    await fetch('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/');
  };

  return (
    <div className={styles.pageWrapper}>
      <Head>
        <title>Minha Conta — O Caminhar com Deus</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main id="main-content" className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <AppIcon name="chevronLeft" size={16} />
            Voltar ao site
          </Link>
          {customer && (
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <AppIcon name="logout" size={16} />
              Sair da conta
            </Button>
          )}
        </div>

        <div className={styles.sectionCard}>
          <h1 className={styles.pageTitle}>Minha Conta</h1>
          {customer ? (
            <p className={styles.pageSubtitle}>
              Olá, <strong>{customer.name}</strong> ({customer.email}). Aqui você acompanha suas compras diretas realizadas no site.
            </p>
          ) : (
            <p className={styles.pageSubtitle}>Carregando informações da sua conta...</p>
          )}

          <div className={styles.alertInfo}>
            <strong>Importante:</strong> Esta área exibe exclusivamente as compras internas realizadas diretamente na modalidade{' '}
            <strong>Venda direta</strong> da aba Produtos Religiosos (processadas via Mercado Pago). Compras realizadas por links de lojas parceiras (Mercado Livre, Shopee e Amazon) são administradas e rastreadas diretamente nas respectivas plataformas.
          </div>
        </div>

        <section className={styles.sectionCard} aria-labelledby="orders-heading">
          <h2 id="orders-heading" className={styles.sectionTitle}>
            Minhas Compras Internas
          </h2>

          {loading && <p>Carregando seus pedidos...</p>}
          {error && <div className={styles.alertError}>{error}</div>}

          {!loading && !error && orders.length === 0 && (
            <p className={styles.pageSubtitle}>
              Você ainda não possui compras internas registradas. Visite a aba{' '}
              <Link href="/">Produtos Religiosos</Link> para conhecer nossos itens de venda direta.
            </p>
          )}

          {!loading &&
            orders.map((order) => {
              const payBadge = PAYMENT_STATUS_LABELS[order.payment_status] || {
                label: order.payment_status,
                badgeClass: 'badgeInfo',
              };
              const orderBadge = ORDER_STATUS_LABELS[order.order_status] || {
                label: order.order_status,
                badgeClass: 'badgeInfo',
              };
              const addr = order.delivery_address || {};
              const payload = order.payment_payload || {};

              return (
                <article key={order.id} className={styles.orderCard} aria-label={`Pedido #${order.id}`}>
                  <div className={styles.orderHeader}>
                    <div>
                      <strong>Pedido #{order.id}</strong> — {order.product_name}
                    </div>
                    <div className={styles.badgeGroup}>
                      <span className={styles[payBadge.badgeClass]}>{payBadge.label}</span>
                      <span className={styles[orderBadge.badgeClass]}>{orderBadge.label}</span>
                    </div>
                  </div>

                  <div className={styles.orderDetailsGrid}>
                    <div>
                      <strong>Quantidade:</strong> {order.quantity} un. ({order.formatted_unit_price} cada)
                    </div>
                    <div>
                      <strong>Frete:</strong> {order.formatted_shipping_cost}
                    </div>
                    <div>
                      <strong>Total:</strong> {order.formatted_total_amount}
                    </div>
                    <div>
                      <strong>Forma de pagamento:</strong>{' '}
                      {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
                    </div>
                    <div>
                      <strong>Data do pedido:</strong>{' '}
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '-'}
                    </div>
                    <div>
                      <strong>Código de rastreio:</strong>{' '}
                      {order.tracking_code || 'Aguardando postagem'}
                    </div>
                  </div>

                  {addr.street && (
                    <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      <strong>Endereço de entrega:</strong> {addr.street}, {addr.number}
                      {addr.complement ? ` (${addr.complement})` : ''} — {addr.neighborhood}, {addr.city}/{addr.state} — CEP {addr.cep}
                    </p>
                  )}

                  {order.payment_status === 'pending' && payload.qr_code && (
                    <div className={styles.pixBox}>
                      <strong>PIX Copia e Cola (pendente):</strong>
                      <div className={styles.codeBox}>{payload.qr_code}</div>
                    </div>
                  )}

                  {order.payment_status === 'pending' && payload.ticket_url && (
                    <div className={styles.pixBox}>
                      <strong>Boleto bancário:</strong>{' '}
                      <a href={payload.ticket_url} target="_blank" rel="noreferrer">
                        Abrir boleto para pagamento
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
        </section>
      </main>
    </div>
  );
}
