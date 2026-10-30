import { jest, describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

// validate-schema.js chama loadEnv() no top-level — mockado para o import
// não tocar no ambiente real
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
  getPool: jest.fn(),
  closePool: jest.fn(),
}));

import { tableSchemas } from '../../../lib/crud/crud.js';
import { PUBLIC_SELECT_FIELDS } from '../../../lib/domain/shared-pagination.js';
import { EXPECTED_SCHEMA } from '../../../scripts/validate-schema.js';

const schemasDir = path.resolve(__dirname, '../../../scripts/schemas');

// Fonte da verdade da NOMENCLATURA da coluna de publicação por tabela.
// Divergência histórica entre tabelas (documentada em docs/PROJECT_data.md):
// qualquer mudança aqui exige migration + ripple em domínio/API/UI — nunca
// mudar uma fonte isoladamente.
const PUBLISHED_COLUMN = {
  posts: 'published',
  musicas: 'published',
  videos: 'published',
  products: 'published',
  dicas: 'published',
};

function columnsFromJson(table) {
  const schema = JSON.parse(readFileSync(path.join(schemasDir, `${table}.json`), 'utf-8'));
  return schema.columns.map((col) => col.name);
}

describe('Consistência das fontes de schema (JSONs × tableSchemas × PUBLIC_SELECT_FIELDS × EXPECTED_SCHEMA)', () => {
  const contentTables = ['posts', 'musicas', 'videos', 'products', 'dicas'];

  it('a coluna de publicação é a mesma em TODAS as fontes, por tabela', () => {
    for (const table of contentTables) {
      const expected = PUBLISHED_COLUMN[table];

      // 1. Schema JSON (fonte da criação via migration 000 / init-table)
      if (['posts', 'musicas', 'videos', 'dicas'].includes(table)) {
        expect(columnsFromJson(table)).toContain(expected);
      }

      // 2. tableSchemas do crud.js (filtro de campos das APIs)
      expect(tableSchemas[table]).toContain(expected);

      // 3. EXPECTED_SCHEMA do validate-schema.js (diagnóstico do banco)
      expect(EXPECTED_SCHEMA[table]).toContain(expected);
    }
  });

  it('PUBLIC_SELECT_FIELDS (quando a tabela o usa) declara a MESMA coluna de publicação', () => {
    // posts, musicas e videos usam o paginate; products/dicas têm SQL próprio
    // e NÃO devem ter entrada no mapa (duplicidade morta)
    expect(Object.keys(PUBLIC_SELECT_FIELDS).sort()).toEqual(['musicas', 'posts', 'videos']);

    for (const table of Object.keys(PUBLIC_SELECT_FIELDS)) {
      const fields = PUBLIC_SELECT_FIELDS[table].split(',').map((f) => f.trim());
      expect(fields).toContain(PUBLISHED_COLUMN[table]);
    }
  });

  it('tableSchemas e EXPECTED_SCHEMA não divergem em nenhuma coluna (drift zero)', () => {
    // Exceção DOCUMENTADA: `views` (posts) existe no banco e no EXPECTED_SCHEMA,
    // mas é excluída de tableSchemas DE PROPÓSITO — é incrementada por query
    // dedicada (contador de visualizações) e nunca deve entrar por payload CRUD.
    const KNOWN_VALIDATE_ONLY = { posts: ['views'] };

    for (const table of contentTables) {
      const crud = new Set(tableSchemas[table]);
      const validate = new Set(EXPECTED_SCHEMA[table]);
      const known = KNOWN_VALIDATE_ONLY[table] || [];

      const onlyInCrud = [...crud].filter((col) => !validate.has(col));
      const onlyInValidate = [...validate].filter((col) => !crud.has(col) && !known.includes(col));

      // qualquer diferença além da exceção documentada é drift e deve falhar aqui
      expect({ table, onlyInCrud, onlyInValidate }).toEqual({
        table,
        onlyInCrud: [],
        onlyInValidate: [],
      });
    }
  });

  it('schemas JSON declaram `position` em posts/musicas/videos (migrations 007/008/009) — protege o db:reset', () => {
    for (const table of ['posts', 'musicas', 'videos']) {
      expect(columnsFromJson(table)).toContain('position');
    }
    // dicas não usa position (listagem pública ordena por id ASC)
    expect(columnsFromJson('dicas')).not.toContain('position');
  });

  it('tableSchemas declara as colunas que o SELECT público usa (sem coluna fantasma)', () => {
    for (const [table, selectFields] of Object.entries(PUBLIC_SELECT_FIELDS)) {
      // Resolve alias ("X AS y" → y) e expressões ("LEFT(content, 10000)" → content)
      const fields = [
        ...new Set(
          selectFields
            .split(',')
            .map((piece) => piece.trim())
            .map((piece) => {
              const alias = piece.match(/\bAS (\w+)$/);
              if (alias) return alias[1];
              return piece.replace(/LEFT\(/, '').replace(/\)/, '').trim().split(' ')[0];
            })
            .filter(Boolean)
        ),
      ];

      for (const field of fields) {
        expect({ table, field, inTableSchemas: tableSchemas[table].includes(field) })
          .toEqual({ table, field, inTableSchemas: true });
      }
    }
  });
});
