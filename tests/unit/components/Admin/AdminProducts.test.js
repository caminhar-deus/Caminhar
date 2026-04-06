import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminProducts from '../../../../components/Admin/AdminProducts.js';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
  loading: jest.fn().mockReturnValue('toast-id'),
}));

let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

describe('Componente Front-End - AdminProducts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve renderizar e repassar as configurações para o AdminCrudBase', () => {
    render(<AdminProducts />);
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gestão de Produtos');
  });

  it('deve fazer requisição PUT para reordenar produtos', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<AdminProducts />);
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 1, 10);
    expect(global.fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'PUT' }));
    
    global.fetch.mockResolvedValueOnce({ ok: false });
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 2, 10);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('renderCustomFormField: deve renderizar campo link_ml com botão Puxar Dados', () => {
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input data-testid="ml-input" {...props} /> }, 
      { link_ml: 'https://ml.com' }, 
      jest.fn(), 
      jest.fn()
    );
    render(CustomField);
    expect(screen.getByText('⚡ Puxar Dados')).toBeInTheDocument();
    expect(screen.getByTestId('ml-input')).toHaveValue('https://ml.com');
  });

  it('renderCustomFormField: deve ignorar outros campos e tratar fallbacks nulos', () => {
    render(<AdminProducts />);
    expect(passedProps.renderCustomFormField({ name: 'title' }, {}, jest.fn(), jest.fn())).toBeNull();

    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input data-testid="ml-input" {...props} /> }, {}, jest.fn(), jest.fn()
    );
    const { container } = render(CustomField);
    expect(container.firstChild).toHaveStyle('grid-column: span 1');
    expect(screen.getByTestId('ml-input')).toHaveValue('');
  });

  it('handleFetchML: não deve buscar se a URL estiver vazia', () => {
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input {...props} /> }, { link_ml: '' }, jest.fn(), jest.fn()
    );
    render(CustomField);
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.error).toHaveBeenCalledWith('Cole o link do Mercado Livre no campo primeiro!');
  });

  it('handleFetchML: deve buscar dados e atualizar campos com sucesso', async () => {
    global.fetch.mockResolvedValueOnce({ 
      ok: true, 
      json: async () => ({ title: 'Produto', price: 99.9, images: 'img1.jpg\nimg2.jpg', description: 'Desc' }) 
    });
    
    render(<AdminProducts />);
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input {...props} /> }, { link_ml: 'https://ml.com' }, jest.fn(), setFieldValue
    );
    render(CustomField);
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.loading).toHaveBeenCalledWith('Pescando dados no Mercado Livre...');
    
    await waitFor(() => {
      expect(setFieldValue).toHaveBeenCalledWith('title', 'Produto');
      expect(setFieldValue).toHaveBeenCalledWith('price', 'R$ 99,90');
      expect(setFieldValue).toHaveBeenCalledWith('description', 'Desc');
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('handleFetchML: deve buscar dados e atualizar campos omitindo a descrição se ela não for retornada', async () => {
    global.fetch.mockResolvedValueOnce({ 
      ok: true, 
      json: async () => ({ title: 'Produto S/ Desc', price: 50.0, images: 'img.jpg' }) 
    });
    render(<AdminProducts />);
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input {...props} /> }, { link_ml: 'https://ml.com' }, jest.fn(), setFieldValue
    );
    render(CustomField);
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    
    await waitFor(() => {
      expect(setFieldValue).not.toHaveBeenCalledWith('description', expect.anything());
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('handleFetchML: deve tratar erro da API graciosamente', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Erro do ML' }) });
    
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input {...props} /> }, { link_ml: 'https://ml.com' }, jest.fn(), jest.fn()
    );
    render(CustomField);
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro do ML', expect.any(Object)));
  });

  it('handleFetchML: deve exibir notificação de erro genérico se a API falhar sem mensagem', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link_ml', component: (props) => <input {...props} /> }, { link_ml: 'https://ml.com' }, jest.fn(), jest.fn()
    );
    render(CustomField);
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha na busca.', expect.any(Object)));
  });

  it('deve exibir o botão em estado de loading durante a requisição', async () => {
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));
    
    render(<AdminProducts />);
    render(passedProps.renderCustomFormField({ name: 'link_ml', component: 'input' }, { link_ml: 'https://ml.com' }, jest.fn(), jest.fn()));
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    
    const LoadingField = passedProps.renderCustomFormField({ name: 'link_ml', component: 'input' }, { link_ml: 'https://ml.com' }, jest.fn(), jest.fn());
    render(LoadingField);
    
    expect(screen.getByText('⏳ Buscando...')).toBeInTheDocument();
    
    resolveApi({ ok: true, json: async () => ({ title: 'Teste', price: 10, images: 'img' }) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('coluna image_preview: deve renderizar imagem principal ou fallback se não houver', () => {
    render(<AdminProducts />);
    const imgCol = passedProps.columns.find(c => c.key === 'image_preview');
    
    const { getByAltText } = render(imgCol.render({ title: 'Prod', images: 'img1.jpg\nimg2.jpg' }));
    expect(getByAltText('Prod')).toHaveAttribute('src', 'img1.jpg'); // Renderizou a primeira imagem do arranjo multilinhas

    render(imgCol.render({ title: 'Prod', images: '' }));
    expect(screen.getByText('Sem foto')).toBeInTheDocument();
  });

  it('coluna links: deve exibir icones de plataformas de venda se houverem', () => {
    render(<AdminProducts />);
    const linksCol = passedProps.columns.find(c => c.key === 'links');
    
    render(linksCol.render({ link_ml: 'a', link_shopee: 'b', link_amazon: 'c' }));
    expect(screen.getByTitle('Mercado Livre')).toBeInTheDocument();
    expect(screen.getByTitle('Shopee')).toBeInTheDocument();
    expect(screen.getByTitle('Amazon')).toBeInTheDocument();

    render(linksCol.render({ link_ml: '', link_shopee: '', link_amazon: '' }));
    expect(screen.queryAllByTitle('Mercado Livre').length).toBe(1); // Manteve apenas o do primeiro teste
  });

  it('CheckboxWrapper interno: deve simular ativação e desativação do Status do produto', () => {
    render(<AdminProducts />);
    const publishedField = passedProps.fields.find(f => f.name === 'published');
    const Checkbox = publishedField.component;
    
    const onChange = jest.fn();
    render(<Checkbox name="published" value={true} onChange={onChange} label="Publicado" hint="Dica" />);
    
    const checkboxInput = screen.getByRole('checkbox');
    fireEvent.click(checkboxInput); // Alterna o checkbox
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'published', value: false } });
  });
});