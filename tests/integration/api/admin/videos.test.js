import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/videos.js';
import { getPaginatedVideos, createVideo, updateVideo, deleteVideo, reorderVideos } from '../../../../lib/domain/videos.js';
import { invalidateCache } from '../../../../lib/cache.js';

jest.mock('../../../../lib/auth.js', () => ({
  withAuth: (handler) => async (req, res) => {
    if (!req.user) req.user = { role: 'admin' };
    return handler(req, res);
  }
}));

jest.mock('../../../../lib/domain/videos.js', () => ({
  getPaginatedVideos: jest.fn(),
  createVideo: jest.fn(),
  updateVideo: jest.fn(),
  deleteVideo: jest.fn(),
  reorderVideos: jest.fn()
}));

jest.mock('../../../../lib/cache.js', () => ({
  invalidateCache: jest.fn()
}));

describe('API Admin - Vídeos (/api/admin/videos)', () => {
  const originalConsoleError = console.error;

  beforeAll(() => { console.error = () => {}; });
  afterAll(() => { console.error = originalConsoleError; });
  beforeEach(() => { jest.clearAllMocks(); });

  it('deve retornar 403 se o usuário não for admin', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    req.user = { role: 'user' }; 
    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('GET: deve retornar vídeos paginados', async () => {
    getPaginatedVideos.mockResolvedValueOnce({ data: [] });
    const { req, res } = createMocks({ method: 'GET', query: { page: '2', limit: '5', search: 'x' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(getPaginatedVideos).toHaveBeenCalledWith(2, 5, 'x');
  });

  it('POST: deve criar vídeo e invalidar cache', async () => {
    const body = { titulo: 'Novo', url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
    createVideo.mockResolvedValueOnce({ id: 1, ...body });
    const { req, res } = createMocks({ method: 'POST', body });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    expect(createVideo).toHaveBeenCalledWith(body);
    expect(invalidateCache).toHaveBeenCalledWith('public_videos:*');
  });

  it('POST: deve retornar 400 se validação falhar ou URL for inválida', async () => {
    const { req: reqVazia, res: resVazia } = createMocks({ method: 'POST', body: { url_youtube: 'url' } });
    await handler(reqVazia, resVazia);
    expect(resVazia._getStatusCode()).toBe(400);
    
    const { req: reqUrlInvalida, res: resUrlInvalida } = createMocks({ method: 'POST', body: { titulo: 'T', url_youtube: 'xxx' } });
    await handler(reqUrlInvalida, resUrlInvalida);
    expect(resUrlInvalida._getStatusCode()).toBe(400);
  });

  it('PUT: deve reordenar vídeos', async () => {
    const body = { action: 'reorder', items: [{ id: 1, position: 2 }] };
    const { req, res } = createMocks({ method: 'PUT', body });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(reorderVideos).toHaveBeenCalledWith(body.items);
  });

  it('PUT: deve retornar 400 se faltar ID ou se a url for inválida', async () => {
    const { req, res } = createMocks({ method: 'PUT', body: { titulo: 'Editado' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);

    const { req: reqUrl, res: resUrl } = createMocks({ method: 'PUT', body: { id: 1, titulo: 'T', url_youtube: 'xxx' } });
    await handler(reqUrl, resUrl);
    expect(resUrl._getStatusCode()).toBe(400);
  });

  it('PUT: deve atualizar vídeo com sucesso', async () => {
    const body = { id: 1, titulo: 'Editado' };
    updateVideo.mockResolvedValueOnce({ id: 1, titulo: 'Editado' });
    const { req, res } = createMocks({ method: 'PUT', body });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(updateVideo).toHaveBeenCalledWith(1, { titulo: 'Editado' });
  });

  it('PUT: deve retornar 404 se não encontrar vídeo para atualizar', async () => {
    updateVideo.mockResolvedValueOnce(null);
    const { req, res } = createMocks({ method: 'PUT', body: { id: 1, titulo: 'T' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('DELETE: deve excluir vídeo por query ou body', async () => {
    deleteVideo.mockResolvedValueOnce({ id: 1 });
    const { req, res } = createMocks({ method: 'DELETE', query: { id: '1' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(deleteVideo).toHaveBeenCalledWith(1);
    
    deleteVideo.mockResolvedValueOnce({ id: 2 });
    const { req: reqBody, res: resBody } = createMocks({ method: 'DELETE', body: { id: 2 } });
    await handler(reqBody, resBody);
    expect(deleteVideo).toHaveBeenCalledWith(2);
  });

  it('DELETE: deve retornar 404 se não encontrar e 400 se ID faltar', async () => {
    const { req: reqVazio, res: resVazia } = createMocks({ method: 'DELETE' });
    await handler(reqVazio, resVazia);
    expect(resVazia._getStatusCode()).toBe(400);

    deleteVideo.mockResolvedValueOnce(null);
    const { req: reqFail, res: resFail } = createMocks({ method: 'DELETE', query: { id: '1' } });
    await handler(reqFail, resFail);
    expect(resFail._getStatusCode()).toBe(404);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'PATCH' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
  
  it('POST e PUT: deve retornar fallback de erro desconhecido se fieldErrors estiver vazio', async () => {
    const originalValues = Object.values;
    Object.values = jest.fn(() => []); // Força o fieldErrors a parecer vazio

    const { req: reqPost, res: resPost } = createMocks({ method: 'POST', body: { titulo: '' } });
    await handler(reqPost, resPost);
    expect(resPost._getStatusCode()).toBe(400);
    expect(resPost._getJSONData().message).toBe('Erro de validação desconhecido.');

    const { req: reqPut, res: resPut } = createMocks({ method: 'PUT', body: { id: 1, titulo: '' } });
    await handler(reqPut, resPut);
    expect(resPut._getStatusCode()).toBe(400);

    Object.values = originalValues; // Restaura
  });

  it('deve capturar erros globais (unique constraint ou DB default) e retornar 500', async () => {
    getPaginatedVideos.mockRejectedValueOnce(new Error('unique constraint failed'));
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData().message).toContain('Já existe');
    
    getPaginatedVideos.mockRejectedValueOnce(new Error('Generic'));
    const { req: req2, res: res2 } = createMocks({ method: 'GET' });
    await handler(req2, res2);
    expect(res2._getStatusCode()).toBe(500);
  });
});