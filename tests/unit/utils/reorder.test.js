import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { handleReorder } from '../../../utils/reorder.js';
import { mockGlobalFetch } from '../../helpers/index.js';

/**
 * Regressão D-18 (PLANO_ACAO F4): o payload precisa usar posições 1-based,
 * porque os schemas de reordenação exigem `position` positiva (posts/vídeos)
 * e o restante do painel também grava posições a partir de 1.
 */
describe('utils/reorder - handleReorder', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    fetchMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  /** Opções enviadas ao fetch (endpoint, init) e corpo desserializado. */
  const getCall = () => {
    const [endpoint, init] = fetchMock.mock.calls[0];
    return { endpoint, init, body: JSON.parse(init.body) };
  };

  it('envia posições 1-based na página 1 (1, 2, 3...)', async () => {
    await handleReorder('/api/admin/posts', [{ id: 7 }, { id: 8 }, { id: 9 }], 1, 10);

    const { body } = getCall();
    expect(body.items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(body.items.map((item) => item.id)).toEqual([7, 8, 9]);
  });

  it('calcula o offset da página 2 com itemsPerPage=10 (11, 12...)', async () => {
    await handleReorder('/api/admin/musicas', [{ id: 21 }, { id: 22 }], 2, 10);

    const { body } = getCall();
    expect(body.items.map((item) => item.position)).toEqual([11, 12]);
    expect(body.items.map((item) => item.id)).toEqual([21, 22]);
  });

  it('usa os padrões página 1 / 10 por página quando os argumentos são omitidos', async () => {
    await handleReorder('/api/products', [{ id: 1 }, { id: 2 }]);

    const { body } = getCall();
    expect(body.items.map((item) => item.position)).toEqual([1, 2]);
  });

  it('faz PUT no endpoint informado com corpo { action: reorder, items }', async () => {
    await handleReorder('/api/products', [{ id: 4, position: 99 }], 1, 10);

    const { endpoint, init, body } = getCall();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(endpoint).toBe('/api/products');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    // `position` enviada pelo chamador é sobrescrito pelo cálculo 1-based
    expect(body).toEqual({
      action: 'reorder',
      items: [{ id: 4, position: 1 }],
    });
  });

  it('lança "Falha ao reordenar" quando a resposta não é ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    await expect(
      handleReorder('/api/admin/videos', [{ id: 1 }], 1, 10)
    ).rejects.toThrow('Falha ao reordenar');
  });
});
