import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminProducts from '../../../../components/Admin/AdminProducts.js';
import toast from 'react-hot-toast';
import { mockGlobalFetch } from '../../../helpers/index.js';

jest.mock('react-hot-toast', () => {
  // O default export é chamável (toast('msg')) e também tem os helpers.
  const toast = jest.fn();
  toast.error = jest.fn();
  toast.success = jest.fn();
  toast.loading = jest.fn().mockReturnValue('toast-id');
  return { __esModule: true, default: toast };
});

let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

describe('Componente Front-End - AdminProducts', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve renderizar e repassar as configurações para o AdminCrudBase', () => {
    render(<AdminProducts />);
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gestão de Produtos');
  });

  it('deve fazer requisição PUT para reordenar produtos', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<AdminProducts />);
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 1, 10);
    expect(global.fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'PUT' }));
    
    global.fetch.mockResolvedValueOnce({ ok: false });
    await expect(passedProps.onReorder([{ id: 1 }, { id: 2 }], 2, 10))
      .rejects.toThrow('Falha ao reordenar');
  });

  it('renderCustomFormField: deve renderizar campo link com botão Puxar Dados', () => {
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link', component: (props) => <input data-testid="link-input" {...props} /> }, 
      { link: 'https://ml.com' }, 
      jest.fn(), 
      jest.fn()
    );
    render(CustomField);
    expect(screen.getByText('⚡ Puxar Dados')).toBeInTheDocument();
    expect(screen.getByTestId('link-input')).toHaveValue('https://ml.com');
  });

  it('renderCustomFormField: deve ignorar outros campos e tratar fallbacks nulos', () => {
    render(<AdminProducts />);
    expect(passedProps.renderCustomFormField({ name: 'name' }, {}, jest.fn(), jest.fn())).toBeNull();

    const CustomField = passedProps.renderCustomFormField(
      { name: 'link', component: (props) => <input data-testid="link-input" {...props} /> }, {}, jest.fn(), jest.fn()
    );
    const { container } = render(CustomField);
    expect(container.firstChild).toHaveStyle('grid-column: span 1');
    expect(screen.getByTestId('link-input')).toHaveValue('');
  });

  it('handleFetchML: não deve buscar se a URL estiver vazia', () => {
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link', component: (props) => <input {...props} /> }, { link: '' }, jest.fn(), jest.fn()
    );
    render(CustomField);
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.error).toHaveBeenCalledWith('Cole o link do produto no campo primeiro!');
  });

  it('handleFetchML: deve buscar dados e atualizar campos com sucesso', async () => {
    global.fetch.mockResolvedValueOnce({ 
      ok: true, 
      json: async () => ({ title: 'Produto', price: 99.9, images: 'img1.jpg\nimg2.jpg', description: 'Desc' }) 
    });
    
    render(<AdminProducts />);
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link', component: (props) => <input {...props} /> }, { link: 'https://ml.com' }, jest.fn(), setFieldValue
    );
    render(CustomField);
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.loading).toHaveBeenCalledWith('Puxando dados da loja...');
    
    await waitFor(() => {
      expect(setFieldValue).toHaveBeenCalledWith('name', 'Produto');
      expect(setFieldValue).toHaveBeenCalledWith('price', '99.90');
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
      { name: 'link', component: (props) => <input {...props} /> }, { link: 'https://ml.com' }, jest.fn(), setFieldValue
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
      { name: 'link', component: (props) => <input {...props} /> }, { link: 'https://ml.com' }, jest.fn(), jest.fn()
    );
    render(CustomField);
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro do ML', expect.any(Object)));
  });

  it('handleFetchML: deve exibir notificação de erro genérico se a API falhar sem mensagem', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<AdminProducts />);
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link', component: (props) => <input {...props} /> }, { link: 'https://ml.com' }, jest.fn(), jest.fn()
    );
    render(CustomField);
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha na busca.', expect.any(Object)));
  });

  it('deve exibir o botão em estado de loading durante a requisição', async () => {
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));
    
    render(<AdminProducts />);
    render(passedProps.renderCustomFormField({ name: 'link', component: 'input' }, { link: 'https://ml.com' }, jest.fn(), jest.fn()));
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    
    const LoadingField = passedProps.renderCustomFormField({ name: 'link', component: 'input' }, { link: 'https://ml.com' }, jest.fn(), jest.fn());
    render(LoadingField);
    
    expect(screen.getByText('⏳ Buscando...')).toBeInTheDocument();
    
    resolveApi({ ok: true, json: async () => ({ title: 'Teste', price: 10, images: 'img' }) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('coluna image_preview: deve renderizar imagem principal ou fallback se não houver', () => {
    render(<AdminProducts />);
    const imgCol = passedProps.columns.find(c => c.key === 'image_preview');
    
    const { getByAltText } = render(imgCol.render({ name: 'Prod', image_url: 'img1.jpg\nimg2.jpg' }));
    expect(getByAltText('Prod')).toHaveAttribute('src', 'img1.jpg');

    render(imgCol.render({ name: 'Prod', image_url: '' }));
    expect(screen.getByText('Sem foto')).toBeInTheDocument();
  });

  it('coluna link: sem render customizado — CrudTable renderiza link acessível "Abrir link" (correção A11y, sem emoji)', () => {
    render(<AdminProducts />);
    const linkCol = passedProps.columns.find(c => c.key === 'link');

    // A correção de acessibilidade removeu o render customizado com emoji 🔗:
    // a coluna cai no render padrão do CrudTable (link "Abrir link" com
    // target="_blank" e rel="noopener noreferrer"; "-" quando vazio).
    expect(linkCol.render).toBeUndefined();
  });

  it('CheckboxWrapper interno: deve simular ativação e desativação do Status do produto', () => {
    render(<AdminProducts />);
    const publishedField = passedProps.fields.find(f => f.name === 'published');
    const Checkbox = publishedField.component;
    
    const onChange = jest.fn();
    render(<Checkbox name="published" checked={true} onChange={onChange} label="Publicado" hint="Dica" />);
    
    const checkboxInput = screen.getByRole('checkbox');
    fireEvent.click(checkboxInput); // Alterna o checkbox
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].target.name).toBe('published');
  });

  it('handleFetchML: deve deixar o preço vazio e avisar quando a loja não informa o valor', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'Sem preço', price: null, images: 'img.jpg', description: 'Desc' })
    });

    render(<AdminProducts />);
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField(
      { name: 'link', component: (props) => <input {...props} /> }, { link: 'https://ml.com' }, jest.fn(), setFieldValue
    );
    render(CustomField);
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));

    await waitFor(() => {
      // Nunca "0.00": um produto de graça iria para a vitrine
      expect(setFieldValue).toHaveBeenCalledWith('price', '');
      expect(setFieldValue).not.toHaveBeenCalledWith('price', '0.00');
      expect(toast).toHaveBeenCalledWith('A loja não informou o preço — digite o valor antes de salvar.');
    });
  });
});
