import React, { useState } from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import ToggleField from './fields/ToggleField';
import ExternalDataButton from './fields/ExternalDataButton';
import { handleReorder } from '@/lib/reorder';
import { z } from 'zod';

/** Schema de validação Zod para os produtos */
const productSchema = z.object({
  title: z.string().min(1, 'Nome do produto é obrigatório'),
  images: z.string().min(1, 'Ao menos uma imagem é obrigatória'),
  description: z.string().optional(),
  price: z.string().min(1, 'Valor é obrigatório'),
  link_ml: z.string().url('URL inválida').optional().or(z.literal('')),
  link_shopee: z.string().url('URL inválida').optional().or(z.literal('')),
  link_amazon: z.string().url('URL inválida').optional().or(z.literal('')),
  published: z.boolean().optional()
});

/** Configuração dos campos do Admin */
const fields = [
  {
    name: 'title', component: TextField, label: 'Nome do Produto',
    required: true, placeholder: 'Ex: Bíblia de Estudo', gridColumn: 'span 2'
  },
  {
    name: 'price', component: TextField, label: 'Valor',
    required: true, placeholder: 'Ex: R$ 89,90', gridColumn: 'span 2'
  },
  {
    name: 'images', component: TextAreaField, label: 'URLs das Imagens',
    required: true, rows: 4, placeholder: 'Insira as URLs das imagens (uma por linha)',
    hint: 'A primeira imagem será a capa. Suporta carrossel.', gridColumn: 'span 2'
  },
  {
    name: 'description', component: TextAreaField, label: 'Descrição',
    rows: 4, placeholder: 'Detalhes sobre o produto...', gridColumn: 'span 2'
  },
  {
    name: 'link_ml', component: TextField, label: 'Link Mercado Livre',
    placeholder: 'https://produto.mercadolivre.com.br/...', gridColumn: 'span 2'
  },
  {
    name: 'link_shopee', component: TextField, label: 'Link Shopee',
    placeholder: 'https://shopee.com.br/...', gridColumn: 'span 2'
  },
  {
    name: 'link_amazon', component: TextField, label: 'Link Amazon',
    placeholder: 'https://amazon.com.br/...', gridColumn: 'span 2'
  },
  {
    name: 'published', component: ToggleField, label: 'Produto Publicado',
    description: 'Desmarque para transformar o produto em um Rascunho (ocultar da vitrine pública).',
    activeLabel: 'Publicado',
    inactiveLabel: 'Rascunho',
    gridColumn: 'span 2'
  }
];

/** Configuração das colunas da tabela do Admin */
const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { 
    key: 'published', 
    header: 'Status', 
    width: '120px',
    activeBgColor: '#fef3c7', // Fundo amarelo/laranja claro
    activeColor: '#92400e', // Texto laranja escuro
    activeIcon: '🛒',
    inactiveBgColor: '#f3f4f6',
    inactiveIcon: '📦'
  },
  { 
    key: 'image_preview', 
    header: 'Imagem', 
    width: '80px',
    render: (item) => {
      const firstImage = item.images ? item.images.split('\n')[0].trim() : null;
      return firstImage ? (
        <img 
          src={firstImage} 
          alt={item.title} 
          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
        />
      ) : (
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Sem foto</span>
      );
    }
  },
  { key: 'title', header: 'Produto', render: (item) => <strong>{item.title}</strong> },
  { key: 'price', header: 'Valor', format: (value) => value ? `R$ ${value}` : '-' },
  { 
    key: 'links', header: 'Links Cadastrados',
    render: (item) => (
      <div style={{ display: 'flex', gap: '5px' }}>
        {item.link_ml && <span title="Mercado Livre">🟨</span>}
        {item.link_shopee && <span title="Shopee">🟧</span>}
        {item.link_amazon && <span title="Amazon">⬛</span>}
      </div>
    )
  }
];

const initialFormData = {
  title: '',
  images: '',
  description: '',
  price: '',
  link_ml: '',
  link_shopee: '',
  link_amazon: '',
  published: true
};

export default function AdminProducts() {
  const [isFetchingML, setIsFetchingML] = useState(false);

  // Configuração do botão "Puxar Dados" do Mercado Livre
  const mlButtonConfig = {
    endpoint: '/api/admin/fetch-ml',
    buttonColor: '#ffe600',
    buttonTextColor: '#333',
    loadingMessage: 'Pescando dados no Mercado Livre...',
    successMessage: 'Mágica concluída! Revise os dados.',
    validateUrl: (url) => !!url,
    invalidUrlMessage: 'Cole o link do Mercado Livre no campo primeiro!'
  };

  // Função para processar dados do Mercado Livre (com lógica extra de formatação)
  const handleFetchMLSuccess = (data, setFieldValue) => {
    setFieldValue('title', data.title);
    setFieldValue('price', data.price.toFixed(2));
    setFieldValue('images', data.images);
    if (data.description) {
      setFieldValue('description', data.description);
    }
  };

  // Intercepta a renderização do campo para adicionar o botão
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    if (fieldConfig.name === 'link_ml') {
      const { name, component: Component, gridColumn, ...props } = fieldConfig;
      return (
        <ExternalDataButton
          key={name}
          fieldName={name}
          gridColumn={gridColumn || 'span 1'}
          url={formData[name]}
          setFieldValue={setFieldValue}
          isFetching={isFetchingML}
          setIsFetching={setIsFetchingML}
          config={mlButtonConfig}
          onSuccess={handleFetchMLSuccess}
        >
          <Component name={name} value={formData[name] ?? ''} onChange={handleInputChange} {...props} />
        </ExternalDataButton>
      );
    }
    return null;
  };

  return (
    <AdminCrudBase
      // Aponta para a API que criamos no próximo passo
      apiEndpoint="/api/products"
      title="Gestão de Produtos"
      fields={fields}
      columns={columns}
      initialFormData={initialFormData}
      validationSchema={productSchema}
      newButtonText="+ Novo Produto"
      saveButtonText="Salvar Produto"
      updateButtonText="Atualizar Produto"
      emptyMessage="Nenhum produto cadastrado. Comece adicionando um!"
      searchable={true}
      reorderable={true}
      onReorder={(items, page, perPage) => handleReorder('/api/products', items, page, perPage)}
      exportable={true}
      renderCustomFormField={renderCustomFormField}
      showItemCount={true}
      itemNameSingular="produto cadastrado"
      itemNamePlural="produtos cadastrados"
    />
  );
}