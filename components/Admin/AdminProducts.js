import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
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

/** Componente customizado simples de Checkbox (para reaproveitamento do base CRUD) */
const CheckboxWrapper = ({ name, value, onChange, label, hint }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>
      <input 
        type="checkbox" 
        name={name} 
        checked={!!value} 
        onChange={(e) => onChange({ target: { name, value: e.target.checked } })}
        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
      />
      {label}
    </label>
    {hint && <span style={{ fontSize: '12px', color: '#6c757d' }}>{hint}</span>}
  </div>
);

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
    name: 'published', component: CheckboxWrapper, label: 'Produto Publicado',
    hint: 'Desmarque para transformar o produto em um Rascunho (ocultar da vitrine pública).', gridColumn: 'span 2'
  }
];

/** Configuração das colunas da tabela do Admin */
const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'published', header: 'Status', width: '100px' },
  { key: 'title', header: 'Produto', render: (item) => <strong>{item.title}</strong> },
  { key: 'price', header: 'Valor' },
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

  // Função responsável por calcular o offset em relação à página e salvar no DB de forma silenciosa
  const handleReorder = async (reorderedItems, currentPage = 1, itemsPerPage = 10) => {
    const offset = (currentPage - 1) * itemsPerPage;
    const payload = reorderedItems.map((item, index) => ({ id: item.id, position: offset + index }));
    
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', items: payload })
      });
      if (!response.ok) throw new Error('Falha ao reordenar');
    } catch (error) {
      console.error('Erro ao salvar reordenação:', error);
    }
  };

export default function AdminProducts() {
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
      onReorder={handleReorder}
      exportable={true}
    />
  );
}