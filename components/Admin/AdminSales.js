import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { z } from 'zod';
import toast from 'react-hot-toast';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import ToggleField from './fields/ToggleField';
import ImageUploadField from './fields/ImageUploadField';
import { Button, Modal, Pagination } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import { handleReorder } from '@/utils/reorder';
import { exportToCSV } from '@/utils/csvExport';
import { normalizePrice } from '@/lib/api/utils';
import crudStyles from './styles/crud.module.css';
import salesStyles from './styles/AdminSales.module.css';

function ShippingTypeSelect({ name, label, value, onChange, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1_5)' }}>
      <label htmlFor={name} style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value || 'free'}
        onChange={onChange}
        className={salesStyles.filterSelect}
      >
        <option value="free">Frete grátis</option>
        <option value="fixed">Valor fixo</option>
        <option value="calculated">Calculado no checkout</option>
      </select>
      {hint && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{hint}</span>}
    </div>
  );
}

ShippingTypeSelect.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string,
};

const internalProductSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  image_url: z.string().min(1, 'Ao menos uma imagem é obrigatória'),
  description: z.string().optional(),
  price: z.preprocess(
    (value) => normalizePrice(value),
    z
      .number({ required_error: 'Valor é obrigatório', invalid_type_error: 'Valor inválido — use um preço como 89,90' })
      .positive('Valor deve ser maior que zero')
  ),
  stock: z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? 0 : Number(value)),
    z.number({ invalid_type_error: 'Estoque inválido' }).int('Estoque deve ser inteiro').min(0, 'Estoque não pode ser negativo')
  ),
  shipping_type: z.enum(['free', 'fixed', 'calculated']).optional(),
  shipping_cost: z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? 0 : normalizePrice(value) ?? 0),
    z.number().min(0, 'Custo de frete não pode ser negativo')
  ),
  category: z.string().optional(),
  published: z.boolean().optional(),
});

const internalProductFields = [
  {
    name: 'name',
    component: TextField,
    label: 'Nome do Produto (Venda Interna)',
    required: true,
    placeholder: 'Ex: Terço de Madeira Artesanal',
    gridColumn: 'span 2',
  },
  {
    name: 'price',
    component: TextField,
    label: 'Valor Unitário (R$)',
    required: true,
    placeholder: 'Ex: R$ 49,90',
    gridColumn: 'span 1',
  },
  {
    name: 'stock',
    component: TextField,
    type: 'number',
    label: 'Estoque Disponível',
    required: true,
    placeholder: 'Ex: 10',
    gridColumn: 'span 1',
  },
  {
    name: 'shipping_type',
    component: ShippingTypeSelect,
    label: 'Modalidade de Frete',
    hint: 'Define como o frete é calculado no checkout do site público.',
    gridColumn: 'span 1',
  },
  {
    name: 'shipping_cost',
    component: TextField,
    label: 'Valor Base de Frete (R$)',
    placeholder: 'Ex: R$ 15,00 (0 para grátis)',
    gridColumn: 'span 1',
  },
  {
    name: 'image_url',
    component: ImageUploadField,
    label: 'Imagens do Produto',
    required: true,
    multiple: true,
    uploadType: 'product',
    placeholder: 'Cole as URLs (uma por linha) ou envie imagens pelo botão',
    hint: 'A primeira imagem será a capa na vitrine.',
    gridColumn: 'span 2',
  },
  {
    name: 'description',
    component: TextAreaField,
    label: 'Descrição',
    rows: 4,
    placeholder: 'Detalhes sobre o produto vendido pelo site...',
    gridColumn: 'span 2',
  },
  {
    name: 'category',
    component: TextField,
    label: 'Categoria',
    placeholder: 'Ex: geral, livros, terços',
    gridColumn: 'span 2',
  },
  {
    name: 'published',
    component: ToggleField,
    label: 'Produto Publicado',
    description: 'Desmarque para manter o produto como Rascunho (oculto da vitrine pública).',
    activeLabel: 'Publicado',
    inactiveLabel: 'Rascunho',
    gridColumn: 'span 2',
  },
];

const internalProductColumns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'published', header: 'Status', width: '120px' },
  {
    key: 'image_preview',
    header: 'Imagem',
    width: '80px',
    render: (item) => {
      const firstImage = item.image_url ? item.image_url.split('\n')[0].trim() : null;
      return firstImage ? (
        <img src={firstImage} alt={item.name} className={crudStyles.cellThumb} />
      ) : (
        <span className={crudStyles.mutedText}>Sem foto</span>
      );
    },
  },
  { key: 'name', header: 'Produto Interno', render: (item) => <strong>{item.name}</strong> },
  {
    key: 'price',
    header: 'Valor',
    format: (value) =>
      value ? `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
  },
  {
    key: 'stock',
    header: 'Estoque',
    render: (item) => (
      <span className={Number(item.stock) > 0 ? salesStyles.badgeApproved : salesStyles.badgeRejected}>
        {Number(item.stock || 0)} un.
      </span>
    ),
  },
  {
    key: 'shipping_type',
    header: 'Frete',
    format: (value) => {
      if (value === 'fixed') return 'Fixo';
      if (value === 'calculated') return 'Calculado';
      return 'Grátis';
    },
  },
];

const initialInternalProductFormData = {
  name: '',
  image_url: '',
  description: '',
  price: '',
  stock: '0',
  shipping_type: 'free',
  shipping_cost: '0,00',
  category: '',
  published: false,
};

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Todos os pagamentos' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'pending', label: 'Aguardando pagamento' },
  { value: 'in_process', label: 'Em análise' },
  { value: 'rejected', label: 'Recusado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'refunded', label: 'Reembolsado' },
];

const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'Todas as situações' },
  { value: 'awaiting_payment', label: 'Aguardando pagamento' },
  { value: 'paid', label: 'Pago' },
  { value: 'preparing', label: 'Em separação' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Todas as formas' },
  { value: 'pix', label: 'PIX' },
  { value: 'debit_card', label: 'Cartão de débito' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'ticket', label: 'Boleto bancário' },
];

function getPaymentBadge(status) {
  if (status === 'approved') return { label: 'Aprovado', cls: salesStyles.badgeApproved };
  if (status === 'pending') return { label: 'Pendente', cls: salesStyles.badgePending };
  if (status === 'in_process') return { label: 'Em análise', cls: salesStyles.badgeInfo };
  if (status === 'rejected' || status === 'cancelled') return { label: 'Recusado/Canc.', cls: salesStyles.badgeRejected };
  if (status === 'refunded') return { label: 'Reembolsado', cls: salesStyles.badgeInfo };
  return { label: status || '-', cls: salesStyles.badgeInfo };
}

function getOrderBadge(status) {
  const found = ORDER_STATUS_OPTIONS.find((o) => o.value === status);
  const label = found ? found.label : status || '-';
  if (status === 'paid' || status === 'delivered') return { label, cls: salesStyles.badgeApproved };
  if (status === 'awaiting_payment') return { label, cls: salesStyles.badgePending };
  if (status === 'cancelled') return { label, cls: salesStyles.badgeRejected };
  return { label, cls: salesStyles.badgeInfo };
}

export default function AdminSales({ readOnly = false }) {
  const [activeSubTab, setActiveSubTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOrderStatus, setModalOrderStatus] = useState('awaiting_payment');
  const [modalTrackingCode, setModalTrackingCode] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (orderStatus) params.set('orderStatus', orderStatus);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalOrders(data.pagination?.total || 0);
      } else {
        toast.error('Erro ao carregar os pedidos internos.');
      }
    } catch {
      toast.error('Falha de conexão ao buscar pedidos.');
    } finally {
      setLoadingOrders(false);
    }
  }, [page, search, paymentStatus, orderStatus, paymentMethod]);

  useEffect(() => {
    if (activeSubTab === 'orders') {
      fetchOrders();
    }
  }, [activeSubTab, fetchOrders]);

  const openManageOrder = (order) => {
    setSelectedOrder(order);
    setModalOrderStatus(order.order_status || 'awaiting_payment');
    setModalTrackingCode(order.tracking_code || '');
  };

  const handleSaveOrderUpdate = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOrder.id,
          order_status: modalOrderStatus,
          tracking_code: modalTrackingCode,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Não foi possível atualizar o pedido.');
        setSavingOrder(false);
        return;
      }
      toast.success(`Pedido #${selectedOrder.id} atualizado com sucesso!`);
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast.error('Erro ao salvar alterações do pedido.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleExportOrdersCsv = () => {
    if (orders.length === 0) {
      toast.error('Não há pedidos para exportar.');
      return;
    }
    const exportColumns = [
      { key: 'id', header: 'ID' },
      { key: 'customer_name', header: 'Cliente' },
      { key: 'customer_email', header: 'E-mail' },
      { key: 'product_name', header: 'Produto' },
      { key: 'quantity', header: 'Quantidade' },
      { key: 'formatted_total_amount', header: 'Total' },
      { key: 'payment_method', header: 'Forma Pagto' },
      { key: 'payment_status', header: 'Status Pagto' },
      { key: 'order_status', header: 'Status Pedido' },
      { key: 'tracking_code', header: 'Rastreio' },
    ];
    exportToCSV(orders, exportColumns, 'pedidos_vendas_internas');
  };

  return (
    <div className={salesStyles.salesContainer}>
      <div className={salesStyles.subTabsBar} role="tablist" aria-label="Subabas de Gestão de Vendas">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'orders'}
          className={activeSubTab === 'orders' ? salesStyles.subTabButtonActive : salesStyles.subTabButton}
          onClick={() => setActiveSubTab('orders')}
        >
          <AppIcon name="shoppingBag" size={16} />
          Pedidos ({totalOrders})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'internal-products'}
          className={activeSubTab === 'internal-products' ? salesStyles.subTabButtonActive : salesStyles.subTabButton}
          onClick={() => setActiveSubTab('internal-products')}
        >
          <AppIcon name="products" size={16} />
          Produtos Internos
        </button>
      </div>

      {activeSubTab === 'orders' ? (
        <div>
          <div className={crudStyles.headerRow}>
            <div>
              <h2 className={crudStyles.title}>Gestão de Vendas — Pedidos Internos</h2>
              <p className={crudStyles.itemCount}>
                Acompanhamento de compras diretas realizadas no Site Público e processadas via Mercado Pago.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExportOrdersCsv}>
              <AppIcon name="download" size={16} />
              Exportar CSV
            </Button>
          </div>

          <div className={salesStyles.filtersRow}>
            <div className={salesStyles.filterInputsGroup}>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por cliente, e-mail, produto, pagamento ou rastreio..."
                aria-label="Buscar pedidos"
                className={salesStyles.searchInput}
              />
              <select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filtrar por status do pagamento"
                className={salesStyles.filterSelect}
              >
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filtrar por situação do pedido"
                className={salesStyles.filterSelect}
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
                aria-label="Filtrar por forma de pagamento"
                className={salesStyles.filterSelect}
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={crudStyles.tableContainer} style={{ marginTop: 'var(--spacing-4)' }}>
            {loadingOrders ? (
              <p style={{ padding: 'var(--spacing-6)' }}>Carregando pedidos...</p>
            ) : orders.length === 0 ? (
              <p style={{ padding: 'var(--spacing-6)', color: 'var(--color-text-secondary)' }}>
                Nenhum pedido interno encontrado para os filtros selecionados.
              </p>
            ) : (
              <table className={crudStyles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                    <th>Status Pagto</th>
                    <th>Andamento</th>
                    <th>Rastreio</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const payBadge = getPaymentBadge(order.payment_status);
                    const ordBadge = getOrderBadge(order.order_status);
                    return (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>
                          <strong>{order.customer_name}</strong>
                          <div className={crudStyles.mutedText}>{order.customer_email}</div>
                        </td>
                        <td>{order.product_name}</td>
                        <td>{order.quantity}</td>
                        <td>{order.formatted_total_amount}</td>
                        <td>{order.payment_method}</td>
                        <td>
                          <span className={payBadge.cls}>{payBadge.label}</span>
                        </td>
                        <td>
                          <span className={ordBadge.cls}>{ordBadge.label}</span>
                        </td>
                        <td>{order.tracking_code || '-'}</td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={readOnly}
                            onClick={() => openManageOrder(order)}
                          >
                            Gerenciar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalOrders}
            itemLabel="pedido"
            onPageChange={setPage}
          />

          <Modal
            isOpen={Boolean(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
            title={selectedOrder ? `Gerenciar Pedido #${selectedOrder.id}` : 'Gerenciar Pedido'}
          >
            {selectedOrder && (
              <form onSubmit={handleSaveOrderUpdate}>
                <div className={salesStyles.modalSection}>
                  <div>
                    <strong>Cliente:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_email})
                  </div>
                  <div>
                    <strong>Produto:</strong> {selectedOrder.product_name} ({selectedOrder.quantity} un.)
                  </div>
                  <div>
                    <strong>Total:</strong> {selectedOrder.formatted_total_amount} (Frete:{' '}
                    {selectedOrder.formatted_shipping_cost})
                  </div>
                  <div>
                    <strong>ID Pagamento Mercado Pago:</strong> {selectedOrder.mp_payment_id || 'Aguardando geração'}
                  </div>
                  {selectedOrder.delivery_address?.street && (
                    <div>
                      <strong>Endereço de entrega:</strong> {selectedOrder.delivery_address.street},{' '}
                      {selectedOrder.delivery_address.number} — {selectedOrder.delivery_address.neighborhood},{' '}
                      {selectedOrder.delivery_address.city}/{selectedOrder.delivery_address.state} — CEP{' '}
                      {selectedOrder.delivery_address.cep}
                    </div>
                  )}
                </div>

                <div className={salesStyles.modalFieldGroup}>
                  <label htmlFor="modal-order-status" className={salesStyles.modalLabel}>
                    Situação Logística do Pedido
                  </label>
                  <select
                    id="modal-order-status"
                    value={modalOrderStatus}
                    onChange={(e) => setModalOrderStatus(e.target.value)}
                    className={salesStyles.filterSelect}
                    style={{ width: '100%' }}
                  >
                    {ORDER_STATUS_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={salesStyles.modalFieldGroup}>
                  <label htmlFor="modal-tracking-code" className={salesStyles.modalLabel}>
                    Código de Rastreio
                  </label>
                  <input
                    id="modal-tracking-code"
                    type="text"
                    value={modalTrackingCode}
                    onChange={(e) => setModalTrackingCode(e.target.value)}
                    placeholder="Ex.: BR123456789BR"
                    className={salesStyles.searchInput}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className={salesStyles.modalActions}>
                  <Button type="button" variant="secondary" onClick={() => setSelectedOrder(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" loading={savingOrder}>
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            )}
          </Modal>
        </div>
      ) : (
        <AdminCrudBase
          apiEndpoint="/api/admin/internal-products"
          title="Produtos Internos (Venda Direta)"
          fields={internalProductFields}
          columns={internalProductColumns}
          initialFormData={initialInternalProductFormData}
          validationSchema={internalProductSchema}
          usePagination={true}
          itemsPerPage={10}
          mapItemToFormData={(item) => ({
            ...item,
            price:
              item.price !== null && item.price !== undefined && item.price !== ''
                ? `R$ ${Number(item.price).toFixed(2).replace('.', ',')}`
                : '',
            stock: String(item.stock ?? 0),
            shipping_type: item.shipping_type || 'free',
            shipping_cost:
              item.shipping_cost !== null && item.shipping_cost !== undefined && item.shipping_cost !== ''
                ? `R$ ${Number(item.shipping_cost).toFixed(2).replace('.', ',')}`
                : '0,00',
          })}
          newButtonText="+ Novo Produto Interno"
          saveButtonText="Salvar Produto Interno"
          updateButtonText="Atualizar Produto Interno"
          emptyMessage="Nenhum produto de venda interna cadastrado ainda."
          searchable={true}
          reorderable={true}
          onReorder={(items, p, perPage) => handleReorder('/api/admin/internal-products', items, p, perPage)}
          exportable={true}
          showItemCount={true}
          itemNameSingular="produto interno"
          itemNamePlural="produtos internos"
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

AdminSales.propTypes = {
  readOnly: PropTypes.bool,
};
