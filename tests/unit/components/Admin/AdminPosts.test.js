import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminPosts from '../../../../components/Admin/AdminPosts.js';
import { mockGlobalFetch } from '../../../helpers/index.js';

let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

describe('Componente Front-End - AdminPosts', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    // Resposta padrão: o AdminPosts agora busca as categorias no mount
    // (`GET /api/admin/categories?all=1`) além das demais chamadas.
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve renderizar e repassar as configurações para o AdminCrudBase', () => {
    render(<AdminPosts />);
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gerenciar Posts');
    expect(passedProps.apiEndpoint).toBe('/api/admin/posts');
  });

  it('deve fazer requisição PUT para reordenar posts e lidar com sucesso e falha', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<AdminPosts />);
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 1, 10);
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/posts', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ action: 'reorder', items: [{ id: 1, position: 1 }, { id: 2, position: 2 }] })
    }));
    
    global.fetch.mockResolvedValueOnce({ ok: false });
    await expect(passedProps.onReorder([{ id: 1 }, { id: 2 }], 2, 10))
      .rejects.toThrow('Falha ao reordenar');
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

  // ── Toggle "Posts | Categorias" (spec posts.md §3.2–§3.3) ──────────
  it('deve iniciar na visão Posts e alternar para Categorias e voltar', () => {
    render(<AdminPosts />);

    const group = screen.getByRole('group', { name: 'Visualização da aba Posts/Artigos' });
    expect(group).toBeInTheDocument();

    const postsButton = screen.getByRole('button', { name: 'Posts' });
    const categoriesButton = screen.getByRole('button', { name: 'Categorias' });
    expect(postsButton).toHaveAttribute('aria-pressed', 'true');
    expect(categoriesButton).toHaveAttribute('aria-pressed', 'false');
    expect(passedProps.title).toBe('Gerenciar Posts');

    fireEvent.click(categoriesButton);
    expect(screen.getByRole('button', { name: 'Posts' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Categorias' })).toHaveAttribute('aria-pressed', 'true');
    // O AdminCrudBase está mockado: o mock recebe a config do AdminCategories
    expect(passedProps.title).toBe('Gerenciar Categorias');
    expect(passedProps.apiEndpoint).toBe('/api/admin/categories');

    fireEvent.click(screen.getByRole('button', { name: 'Posts' }));
    expect(passedProps.title).toBe('Gerenciar Posts');
    expect(passedProps.apiEndpoint).toBe('/api/admin/posts');
  });

  it('deve buscar as categorias no mount em /api/admin/categories?all=1', async () => {
    render(<AdminPosts />);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/categories?all=1',
        expect.objectContaining({ credentials: 'include' })
      )
    );
  });

  // ── Campo de atribuição de categorias (spec posts.md §2.2) ─────────
  it('deve configurar o campo category_ids conforme a spec', () => {
    render(<AdminPosts />);

    const field = passedProps.fields.find((f) => f.name === 'category_ids');
    expect(field).toBeDefined();
    expect(field.label).toBe('Categorias');
    expect(field.gridColumn).toBe('span 2');
    expect(field.hint).toBe('Opcional. Selecione uma ou mais categorias.');
    expect(typeof field.component).toBe('function');
    expect(passedProps.initialFormData.category_ids).toEqual([]);

    // Schema aceita post sem categoria
    expect(() => passedProps.validationSchema.parse({
      title: 'T', slug: 't', published: false,
    })).not.toThrow();
    expect(() => passedProps.validationSchema.parse({
      title: 'T', slug: 't', category_ids: [1, 2],
    })).not.toThrow();
  });

  it('validationSchema: aceita nulls do banco na edição full-row (excerpt/content/image_url)', () => {
    // createPost grava `?? null` — rows com null existem por design; o form
    // reenvia a row inteira na edição e o schema do cliente não pode rejeitá-la.
    expect(() => passedProps.validationSchema.parse({
      title: 'T', slug: 't', excerpt: null, content: null, image_url: null, published: false, category_ids: [],
    })).not.toThrow();
  });

  it('mapItemToFormData: deve preencher category_ids a partir de post.categories', () => {
    render(<AdminPosts />);

    expect(passedProps.mapItemToFormData({
      id: 7,
      title: 'Post',
      categories: [{ id: 1, name: 'Fé', slug: 'fe' }, { id: 3, name: 'Oração', slug: 'oracao' }],
    }).category_ids).toEqual([1, 3]);

    // Sem categories (payload antigo) vira array vazio, nunca undefined
    expect(passedProps.mapItemToFormData({ id: 7 }).category_ids).toEqual([]);
  });

  it('CategorySelectField: deve renderizar checkboxes e alternar a seleção', () => {
    render(<AdminPosts />);
    const CategoryField = passedProps.fields.find((f) => f.name === 'category_ids').component;
    const onChange = jest.fn();

    render(
      <CategoryField
        name="category_ids"
        value={[1]}
        onChange={onChange}
        label="Categorias"
        hint="Opcional. Selecione uma ou mais categorias."
        options={[{ id: 1, name: 'Fé', slug: 'fe' }, { id: 2, name: 'Oração', slug: 'oracao' }]}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();

    // Grupo acessível com rótulo visível
    expect(screen.getByRole('group', { name: 'Categorias' })).toBeInTheDocument();
    expect(screen.getByText('Opcional. Selecione uma ou mais categorias.')).toBeInTheDocument();

    fireEvent.click(checkboxes[1]);
    expect(onChange).toHaveBeenLastCalledWith({ target: { name: 'category_ids', value: [1, 2] } });

    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenLastCalledWith({ target: { name: 'category_ids', value: [] } });
  });

  it('CategorySelectField: deve exibir o estado vazio quando não há categorias', () => {
    render(<AdminPosts />);
    const CategoryField = passedProps.fields.find((f) => f.name === 'category_ids').component;

    const { container } = render(
      <CategoryField
        name="category_ids"
        value={[]}
        onChange={jest.fn()}
        label="Categorias"
        options={[]}
      />
    );

    expect(
      screen.getByText('Nenhuma categoria cadastrada. Crie na aba "Categorias".')
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    // O campo não some: o rótulo continua visível acima do grupo
    expect(container.querySelector('label')).toHaveTextContent('Categorias');
    expect(screen.getByRole('group', { name: 'Categorias' })).toBeInTheDocument();
  });
});