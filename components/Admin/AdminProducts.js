import React, { useState } from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import ToggleField from './fields/ToggleField';
import ImageUploadField from './fields/ImageUploadField';
import ExternalDataButton from './fields/ExternalDataButton';
import { handleReorder } from '@/utils/reorder';
import { normalizePrice } from '@/lib/api/utils';
import toast from 'react-hot-toast';
import { z } from 'zod';

/** Schema de validação Zod para os produtos */
const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  image_url: z.string().min(1, 'Ao menos uma imagem é obrigatória'),
  description: z.string().optional(),
  // Aceita "R$ 89,90", "89,90", "89.90" e números — normaliza para número
  // antes de validar (mesma regra da API, lib/api/utils.normalizePrice).
  price: z.preprocess(
    (value) => normalizePrice(value),
    z.number({ required_error: 'Valor é obrigatório', invalid_type_error: 'Valor inválido — use um preço como 89,90' })
      // Preço zero não é preço: evita publicar R$ 0,00 quando a leitura
      // automática da loja não devolve o valor (preview do ML).
      .positive('Valor deve ser maior que zero')
  ),
  link: z.string().url('URL inválida').optional().or(z.literal('')),
  // Paridade com a API: opcional; string vazia é aceita aqui e o servidor
  // aplica o default "geral" (o campo sempre existe no formulário).
  category: z.string().optional(),
  published: z.boolean().optional()
});

/** Configuração dos campos do Admin */
const fields = [
  {
    name: 'name', component: TextField, label: 'Nome do Produto',
    required: true, placeholder: 'Ex: Bíblia de Estudo', gridColumn: 'span 2'
  },
  {
    name: 'price', component: TextField, label: 'Valor',
    required: true, placeholder: 'Ex: R$ 89,90', gridColumn: 'span 2'
  },
  {
    name: 'image_url', component: ImageUploadField, label: 'Imagens do Produto',
    required: true,
    multiple: true,
    uploadType: 'product',
    placeholder: 'Cole as URLs (uma por linha) ou envie imagens pelo botão',
    hint: 'A primeira imagem será a capa. As demais formam o carrossel.',
    gridColumn: 'span 2'
  },
  {
    name: 'description', component: TextAreaField, label: 'Descrição',
    rows: 4, placeholder: 'Detalhes sobre o produto...', gridColumn: 'span 2'
  },
  {
    name: 'link', component: TextField, label: 'Link do Produto',
    placeholder: 'https://...', gridColumn: 'span 2'
  },
  {
    name: 'category', component: TextField, label: 'Categoria',
    placeholder: 'Ex: geral, livros, terços',
    hint: 'Usada pelo filtro de categoria da vitrine. Sem categoria, o produto fica em "geral".',
    gridColumn: 'span 2'
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
      const firstImage = item.image_url ? item.image_url.split('\n')[0].trim() : null;
      return firstImage ? (
        <img 
          src={firstImage} 
          alt={item.name} 
          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
        />
      ) : (
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Sem foto</span>
      );
    }
  },
  { key: 'name', header: 'Produto', render: (item) => <strong>{item.name}</strong> },
  { key: 'price', header: 'Valor', format: (value) => value ? `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-' },
  { key: 'link', header: 'Link' }
  // Sem render customizado: o CrudTable renderiza URLs como link acessível
  // "Abrir link" (target="_blank", rel="noopener noreferrer") e "-" quando vazio.
];

const initialFormData = {
  name: '',
  image_url: '',
  description: '',
  price: '',
  link: '',
  category: '',
  // Rascunho por padrão (ADR-0029): nada nasce publicado; o operador
  // publica conscientemente pelo toggle.
  published: false
};

export default function AdminProducts() {
  const [isFetchingML, setIsFetchingML] = useState(false);

  // Configuração do botão "Puxar Dados" (Mercado Livre, Amazon e Shopee)
  const mlButtonConfig = {
    endpoint: '/api/admin/fetch-ml',
    buttonColor: '#ffe600',
    buttonTextColor: '#333',
    loadingMessage: 'Puxando dados da loja...',
    successMessage: 'Dados importados! Revise antes de salvar.',
    validateUrl: (url) => !!url,
    invalidUrlMessage: 'Cole o link do produto no campo primeiro!'
  };

  // Função para processar os dados vindos da loja (com lógica extra de formatação)
  const handleFetchMLSuccess = (data, setFieldValue) => {
    setFieldValue('name', data.title);
    setFieldValue('image_url', data.images);

    // O preço pode vir nulo: o preview do Mercado Livre entrega título, imagem
    // e descrição, mas não o valor. Gravar "0.00" criaria um produto de graça;
    // o campo fica vazio e o operador digita antes de salvar.
    const price = Number(data.price);
    if (Number.isFinite(price) && price > 0) {
      setFieldValue('price', price.toFixed(2));
    } else {
      setFieldValue('price', '');
      toast('A loja não informou o preço — digite o valor antes de salvar.');
    }

    if (data.description) {
      setFieldValue('description', data.description);
    }
  };

  // Intercepta a renderização do campo para adicionar o botão
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    if (fieldConfig.name === 'link') {
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
      // Na edição, exibe o preço no formato pt-BR ("R$ 89,90") — decisão do
      // dono (§8.9): o campo mantém a UX de formato regional. Na gravação,
      // o schema normaliza de volta para número.
      mapItemToFormData={(item) => ({
        ...item,
        price:
          item.price !== null && item.price !== undefined && item.price !== ''
            ? `R$ ${Number(item.price).toFixed(2).replace('.', ',')}`
            : '',
      })}
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