import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminMusicas from '../../../../components/Admin/AdminMusicas.js';
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

describe('Componente Front-End - AdminMusicas', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve renderizar e repassar as configurações para o AdminCrudBase', () => {
    render(<AdminMusicas />);
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gestão de Músicas');
    expect(passedProps.apiEndpoint).toBe('/api/admin/musicas');
  });

  it('deve renderizar a coluna de Spotify customizada contendo link e Iframe HTML', () => {
    render(<AdminMusicas />);
    const spotifyCol = passedProps.columns.find(c => c.key === 'url_spotify');
    
    render(spotifyCol.render({ url_spotify: 'https://open.spotify.com/track/12345?si=abc' }));
    
    expect(screen.getByText('🎵 Abrir no Spotify')).toHaveAttribute('href', 'https://open.spotify.com/track/12345?si=abc');
    expect(screen.getByTestId('embed-iframe')).toHaveAttribute('src', expect.stringContaining('embed/track/12345'));
  });

  it('deve fazer requisição PUT para reordenar músicas e lidar com sucesso e falha', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Teste de SUCESSO
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<AdminMusicas />);
    await passedProps.onReorder([{ id: 1 }, { id: 2 }], 1, 10); // página 1, offset 0
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/musicas', expect.objectContaining({
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
    render(<AdminMusicas />);
    const result = passedProps.renderCustomFormField({ name: 'titulo' }, {}, jest.fn(), jest.fn());
    expect(result).toBeNull();
  });

  it('renderCustomFormField: deve renderizar o botão "Puxar Dados" para url_spotify e mostrar erro se o link for inválido', () => {
    render(<AdminMusicas />);
    
    const CustomField = passedProps.renderCustomFormField(
      { name: 'url_spotify', component: 'input' }, 
      { url_spotify: 'link_invalido' }, 
      jest.fn(), 
      jest.fn()
    );
    render(CustomField);
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.error).toHaveBeenCalledWith('Cole um link válido do Spotify primeiro!');
  });

  it('renderCustomFormField: deve usar gridColumn padrão se não for especificado no campo', () => {
    render(<AdminMusicas />);
    
    const CustomField = passedProps.renderCustomFormField(
      // Simulando um campo customizado sem a propriedade gridColumn
      { name: 'url_spotify', component: 'input' }, 
      { url_spotify: 'https://spotify.com/track/abc' }, 
      jest.fn(), 
      jest.fn()
    );
    const { container } = render(CustomField);
    
    expect(container.firstChild).toHaveStyle('grid-column: span 1');
  });

  it('deve exibir o botão em estado de loading durante a requisição', async () => {
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));
    
    render(<AdminMusicas />);
    
    render(passedProps.renderCustomFormField({ name: 'url_spotify', component: 'input' }, { url_spotify: 'https://spotify.com/track/abc' }, jest.fn(), jest.fn()));
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    
    const LoadingField = passedProps.renderCustomFormField({ name: 'url_spotify', component: 'input' }, { url_spotify: 'https://spotify.com/track/abc' }, jest.fn(), jest.fn());
    render(LoadingField);
    
    expect(screen.getByText('⏳ Buscando...')).toBeInTheDocument();
    
    resolveApi({ ok: true, json: async () => ({ title: 'Teste', artist: 'Teste' }) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('renderCustomFormField: deve usar string vazia caso o campo não exista no formData', () => {
    render(<AdminMusicas />);
    const CustomField = passedProps.renderCustomFormField({ name: 'url_spotify', component: 'input' }, {}, jest.fn(), jest.fn());
    const { container } = render(CustomField);
    expect(container.querySelector('input').value).toBe('');
  });

  it('handleFetchSpotify: deve buscar dados na API administrativa e preencher o formulário em caso de sucesso', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Música Pop', artist: 'Cantor X' }) });
    
    render(<AdminMusicas />);
    const setFieldValue = jest.fn();
    
    render(passedProps.renderCustomFormField({ name: 'url_spotify', component: 'input' }, { url_spotify: 'https://spotify.com/track/abc' }, jest.fn(), setFieldValue));
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    expect(toast.loading).toHaveBeenCalledWith('Buscando dados no Spotify...');
    
    await waitFor(() => {
      expect(setFieldValue).toHaveBeenCalledWith('titulo', 'Música Pop');
      expect(setFieldValue).toHaveBeenCalledWith('artista', 'Cantor X');
      expect(toast.success).toHaveBeenCalledWith('Música encontrada!', expect.any(Object));
    });
  });

  it('handleFetchSpotify: deve exibir notificação de erro se a API do Spotify falhar', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Música privada' }) });
    
    render(<AdminMusicas />);
    render(passedProps.renderCustomFormField({ name: 'url_spotify', component: 'input' }, { url_spotify: 'https://spotify.com/track/abc' }, jest.fn(), jest.fn()));
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Música privada', expect.any(Object)));
  });

  it('handleFetchSpotify: deve exibir notificação de erro genérico se a API falhar sem mensagem', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    
    render(<AdminMusicas />);
    render(passedProps.renderCustomFormField({ name: 'url_spotify', component: 'input' }, { url_spotify: 'https://spotify.com/track/abc' }, jest.fn(), jest.fn()));
    
    fireEvent.click(screen.getByText('⚡ Puxar Dados'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha na busca.', expect.any(Object)));
  });
});