import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminPosts from '../../../../components/Admin/AdminPosts.js';

let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

describe('Componente Front-End - AdminPosts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve renderizar e repassar as configurações para o AdminCrudBase', () => {
    render(<AdminPosts />);
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gerenciar Posts');
    expect(passedProps.apiEndpoint).toBe('/api/admin/posts');
  });

  it('deve fazer requisição PUT para reordenar posts e lidar com sucesso e falha', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<AdminPosts />);
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 1, 10);
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/posts', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ action: 'reorder', items: [{ id: 1, position: 0 }, { id: 2, position: 1 }] })
    }));
    
    global.fetch.mockResolvedValueOnce({ ok: false });
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 2, 10);
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao salvar reordenação:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('validatePost: deve lançar erro se publicado for true mas não houver imagem', () => {
    render(<AdminPosts />);
    expect(() => passedProps.validate({ published: true, image_url: '' })).toThrow('Para publicar um post, é necessário vincular uma imagem de capa.');
  });

  it('validatePost: não deve lançar erro em casos válidos', () => {
    render(<AdminPosts />);
    expect(() => passedProps.validate({ published: true, image_url: 'http://img.com/a.jpg' })).not.toThrow();
    expect(() => passedProps.validate({ published: false, image_url: '' })).not.toThrow();
  });

  it('renderCustomFormField: deve renderizar campo slug', () => {
    render(<AdminPosts />);
    const fieldConfig = { name: 'slug', component: (props) => <input data-testid="slug-input" {...props} /> };
    const CustomField = passedProps.renderCustomFormField(fieldConfig, { slug: 'meu-slug' }, jest.fn(), jest.fn(), { errors: { slug: ['Erro no slug'] } });
    
    render(CustomField);
    expect(screen.getByTestId('slug-input')).toHaveValue('meu-slug');
    expect(screen.getByTestId('slug-input')).toHaveAttribute('error', 'Erro no slug');
  });

  it('renderCustomFormField: deve renderizar campo title e gerar slug no blur', () => {
    render(<AdminPosts />);
    const fieldConfig = { name: 'title', label: 'Título', placeholder: 'Título' }; 
    
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField(fieldConfig, { title: 'Meu Título de Sucesso!' }, jest.fn(), setFieldValue, {});
    
    const { container } = render(CustomField);
    const input = container.querySelector('input[name="title"]');
    fireEvent.blur(input); // Tira o foco do input para disparar o onBlur
    
    expect(setFieldValue).toHaveBeenCalledWith('slug', 'meu-titulo-de-sucesso');
  });

  it('renderCustomFormField: não deve gerar slug no blur se o slug já existir preenchido', () => {
    render(<AdminPosts />);
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField({ name: 'title' }, { title: 'Meu Título', slug: 'slug-existente' }, jest.fn(), setFieldValue, {});
    
    const { container } = render(CustomField);
    fireEvent.blur(container.querySelector('input[name="title"]'));
    
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it('renderCustomFormField: não deve gerar slug no blur se o title for vazio', () => {
    render(<AdminPosts />);
    const setFieldValue = jest.fn();
    const CustomField = passedProps.renderCustomFormField({ name: 'title' }, { title: '', slug: '' }, jest.fn(), setFieldValue, {});
    const { container } = render(CustomField);
    fireEvent.blur(container.querySelector('input[name="title"]'));
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it('renderCustomFormField: deve ignorar outros campos e tratar fallbacks nulos', () => {
    render(<AdminPosts />);
    expect(passedProps.renderCustomFormField({ name: 'excerpt' }, {}, jest.fn(), jest.fn(), {})).toBeNull();
    
    const SlugField = passedProps.renderCustomFormField({ name: 'slug', component: (props) => <input {...props} /> }, {}, jest.fn(), jest.fn(), {});
    expect(render(SlugField).container.querySelector('input').value).toBe('');
  });

  it('renderCustomFormField: deve renderizar normalmente mesmo sem o objeto error (undefined)', () => {
    render(<AdminPosts />);
    const SlugField = passedProps.renderCustomFormField({ name: 'slug', component: (props) => <input {...props} /> }, { slug: 'teste' }, jest.fn(), jest.fn() /* sem o argumento error */);
    expect(render(SlugField).container.querySelector('input').value).toBe('teste');
  });

  it('deve formatar data corretamente e exibir miniatura da capa na listagem da tabela', () => {
    render(<AdminPosts />);
    
    const titleCol = passedProps.columns.find(c => c.key === 'title');
    render(titleCol.render({ title: 'Post com imagem', image_url: 'http://img.com/a.jpg' }));
    expect(screen.getByAltText('')).toHaveAttribute('src', 'http://img.com/a.jpg');

    const dateCol = passedProps.columns.find(c => c.key === 'created_at');
    expect(dateCol.format('2023-01-01T10:00:00Z')).toMatch(/01\/01\/2023|1\/1\/2023/);
  });

  it('deve renderizar a coluna title sem a imagem se image_url não existir', () => {
    render(<AdminPosts />);
    const titleCol = passedProps.columns.find(c => c.key === 'title');
    const { container } = render(titleCol.render({ title: 'Post sem imagem', image_url: null }));
    expect(screen.getByText('Post sem imagem')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});