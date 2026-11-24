import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { exportToCSV } from '../../../utils/csvExport.js';

describe('Utilitário - exportToCSV (utils/csvExport.js)', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;
  const originalBlob = global.Blob;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/csv-test');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    global.Blob = originalBlob;
    process.env.NODE_ENV = originalNodeEnv;
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('chama onEmpty e não cria Blob/URL quando data está vazia ou nula', () => {
    const onEmpty = jest.fn();
    exportToCSV({ data: [], columns: [{ key: 'id', header: 'ID' }], filename: 'vazio', onEmpty });
    exportToCSV({ data: null, columns: [{ key: 'id', header: 'ID' }], filename: 'nulo', onEmpty });

    expect(onEmpty).toHaveBeenCalledTimes(2);
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('chama onEmpty e não cria Blob/URL quando columns está vazia ou inválida', () => {
    const onEmpty = jest.fn();
    exportToCSV({ data: [{ id: 1 }], columns: [], filename: 'sem-colunas', onEmpty });
    exportToCSV({ data: [{ id: 1 }], columns: null, filename: 'colunas-nulas', onEmpty });

    expect(onEmpty).toHaveBeenCalledTimes(2);
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('gera CSV com BOM UTF-8, escape de vírgulas/aspas/quebras, formatadores, booleanos e nulos', () => {
    const createdParts = [];
    const createdOptions = [];
    global.Blob = jest.fn((parts, options) => {
      createdParts.push(parts);
      createdOptions.push(options);
      return new originalBlob(parts, options);
    });

    const appendedLinks = [];
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      appendedLinks.push(node);
      return originalAppendChild(node);
    });

    try {
      exportToCSV({
        data: [
          {
            id: 1,
            name: 'Bíblia, "Edição"\nEspecial\r\nCapa Dura',
            published: true,
            notes: null,
            optional: undefined,
            custom: 'bruto',
          },
          {
            id: 2,
            name: 'Terço Simples',
            published: false,
            notes: 'ok',
            optional: '',
            custom: 'valor',
          },
        ],
        columns: [
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Nome' },
          { key: 'published', header: 'Status' },
          { key: 'notes', header: 'Obs' },
          { key: 'optional', header: 'Extra' },
          { key: 'custom', header: 'Custom', format: (val, item) => `${item.id}:${val}` },
        ],
        filename: 'relatorio_itens',
      });

      expect(createdOptions[0]).toEqual({ type: 'text/csv;charset=utf-8;' });
      const csvText = createdParts[0][0];
      expect(csvText.startsWith('\uFEFF')).toBe(true);

      const expectedBody = [
        'ID,Nome,Status,Obs,Extra,Custom',
        '1,"Bíblia, ""Edição""\nEspecial\r\nCapa Dura",Publicado,,,1:bruto',
        '2,Terço Simples,Rascunho,ok,,2:valor',
      ].join('\n');
      expect(csvText.slice(1)).toBe(expectedBody);

      expect(appendedLinks).toHaveLength(1);
      expect(appendedLinks[0].getAttribute('download')).toBe('relatorio_itens.csv');
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/csv-test');
    } finally {
      appendSpy.mockRestore();
    }
  });

  it('agenda URL.revokeObjectURL após 1000ms fora de ambiente test (ex.: production)', () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'production';

    exportToCSV({
      data: [{ id: 1, name: 'Item' }],
      columns: [{ key: 'id', header: 'ID' }, { key: 'name', header: 'Nome' }],
      filename: 'prod_export',
    });

    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/csv-test');
  });

  it('não emite erro jsdom 31 (Not implemented: navigation) ao clicar em <a> real sem mock de click', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      exportToCSV({
        data: [{ id: 10, name: 'Produto Teste' }],
        columns: [{ key: 'id', header: 'ID' }, { key: 'name', header: 'Produto' }],
        filename: 'jsdom_safe_export',
      });

      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
