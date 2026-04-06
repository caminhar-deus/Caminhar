import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminVideos from '../../../../components/Admin/AdminVideos.js';
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

describe('Componente Front-End - AdminVideos', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve renderizar e repassar as configurações para o AdminCrudBase', () => {
    render(<AdminVideos />);
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gestão de Vídeos');
    expect(passedProps.apiEndpoint).toBe('/api/admin/videos');
  });

  it('deve renderizar a coluna de YouTube customizada com link e iframe', () => {
    render(<AdminVideos />);
    const youtubeCol = passedProps.columns.find(c => c.key === 'url_youtube');
    
    render(youtubeCol.render({ url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', titulo: 'Video Teste' }));
    
    expect(screen.getByText('📺 Abrir no YouTube')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByTestId('embed-iframe')).toHaveAttribute('src', expect.stringContaining('embed/dQw4w9WgXcQ'));
  });

  it('não deve renderizar o iframe se a URL do YouTube for inválida', () => {
    render(<AdminVideos />);
    const youtubeCol = passedProps.columns.find(c => c.key === 'url_youtube');
    
    render(youtubeCol.render({ url_youtube: 'https://invalid-url.com', titulo: 'Inválido' }));
    
    expect(screen.queryByTestId('embed-iframe')).not.toBeInTheDocument();
  });

  it('não deve renderizar o iframe se a URL do YouTube for nula ou vazia', () => {
    render(<AdminVideos />);
    const youtubeCol = passedProps.columns.find(c => c.key === 'url_youtube');
    
    const { unmount } = render(youtubeCol.render({ url_youtube: null, titulo: 'Nulo' }));
    expect(screen.queryByTestId('embed-iframe')).not.toBeInTheDocument();
    unmount();

    render(youtubeCol.render({ url_youtube: '', titulo: 'Vazio' }));
    expect(screen.queryByTestId('embed-iframe')).not.toBeInTheDocument();
  });

  it('deve renderizar a capa (thumbnail) customizada na coluna de título, caso exista', () => {
    render(<AdminVideos />);
    const tituloCol = passedProps.columns.find(c => c.key === 'titulo');
    
    render(tituloCol.render({ titulo: 'Título com Thumb', thumbnail: 'thumb.jpg' }));
    
    expect(screen.getByAltText('Capa')).toHaveAttribute('src', 'thumb.jpg');
    expect(screen.getByText('Título com Thumb')).toBeInTheDocument();
  });

  it('deve fazer requisição PUT para reordenar vídeos e lidar com sucesso e falha', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Teste de SUCESSO
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<AdminVideos />);
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 1, 10); // página 1, offset 0
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/videos', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ action: 'reorder', items: [{ id: 1, position: 0 }, { id: 2, position: 1 }] })
    }));
    
    // Teste de FALHA
    global.fetch.mockResolvedValueOnce({ ok: false });
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 2, 10); // página 2, limite 10 = offset 10
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao salvar reordenação:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('renderCustomFormField: deve ignorar campos padrão e retornar null', () => {
    render(<AdminVideos />);
    const result = passedProps.renderCustomFormField({ name: 'titulo' }, {}, jest.fn(), jest.fn());
    expect(result).toBeNull();
  });

  it('renderCustomFormField: deve renderizar o botão "Puxar Dados" para url_youtube e mostrar erro se o link for inválido', () => {
    render(<AdminVideos />);
    
    const CustomField = passedProps.renderCustomFormField(
      { name: 'url_youtube', component: 'input' }, 
      { url_youtube: 'link_invalido' }, 
      jest.fn(), 
      jest.fn()
    );
    render(CustomField);
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.error).toHaveBeenCalledWith('Cole um link válido do YouTube primeiro!');
  });

  it('renderCustomFormField: deve usar gridColumn padrão se não for especificado no campo', () => {
    render(<AdminVideos />);
    
    const CustomField = passedProps.renderCustomFormField(
      // Simulando um campo customizado sem a propriedade gridColumn
      { name: 'url_youtube', component: 'input' }, 
      { url_youtube: 'https://youtube.com/watch?v=123' }, 
      jest.fn(), 
      jest.fn()
    );
    const { container } = render(CustomField);
    
    expect(container.firstChild).toHaveStyle('grid-column: span 1');
  });

  it('deve exibir o botão em estado de loading durante a requisição', async () => {
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));
    
    render(<AdminVideos />);
    
    render(passedProps.renderCustomFormField({ name: 'url_youtube', component: 'input' }, { url_youtube: 'https://youtube.com/watch?v=123' }, jest.fn(), jest.fn()));
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    
    const LoadingField = passedProps.renderCustomFormField({ name: 'url_youtube', component: 'input' }, { url_youtube: 'https://youtube.com/watch?v=123' }, jest.fn(), jest.fn());
    render(LoadingField);
    
    expect(screen.getByText('⏳ Buscando...')).toBeInTheDocument();
    
    resolveApi({ ok: true, json: async () => ({ title: 'Teste' }) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('renderCustomFormField: deve usar string vazia caso o campo não exista no formData', () => {
    render(<AdminVideos />);
    const CustomField = passedProps.renderCustomFormField({ name: 'url_youtube', component: 'input' }, {}, jest.fn(), jest.fn());
    const { container } = render(CustomField);
    expect(container.querySelector('input').value).toBe('');
  });

  it('handleFetchYoutube: deve buscar dados na API administrativa e preencher o formulário em caso de sucesso', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Vídeo do YouTube' }) });
    
    render(<AdminVideos />);
    const setFieldValue = jest.fn();
    
    render(passedProps.renderCustomFormField({ name: 'url_youtube', component: 'input' }, { url_youtube: 'https://youtube.com/watch?v=123' }, jest.fn(), setFieldValue));
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.loading).toHaveBeenCalledWith('Buscando dados no YouTube...');
    
    await waitFor(() => {
      expect(setFieldValue).toHaveBeenCalledWith('titulo', 'Vídeo do YouTube');
      expect(toast.success).toHaveBeenCalledWith('Vídeo encontrado!', expect.any(Object));
    });
  });

  it('handleFetchYoutube: deve exibir notificação de erro se a API do YouTube falhar', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Vídeo privado' }) });
    
    render(<AdminVideos />);
    render(passedProps.renderCustomFormField({ name: 'url_youtube', component: 'input' }, { url_youtube: 'https://youtube.com/watch?v=123' }, jest.fn(), jest.fn()));
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Vídeo privado', expect.any(Object)));
  });

  it('handleFetchYoutube: deve exibir notificação de erro genérico se a API falhar sem mensagem', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    
    render(<AdminVideos />);
    render(passedProps.renderCustomFormField({ name: 'url_youtube', component: 'input' }, { url_youtube: 'https://youtube.com/watch?v=123' }, jest.fn(), jest.fn()));
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha na busca.', expect.any(Object)));
  });
});