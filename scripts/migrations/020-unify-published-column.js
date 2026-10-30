#!/usr/bin/env node

const MIGRATION_NAME = '020-unify-published-column';

/**
 * Unifica a nomenclatura da coluna de publicação e o default de nascimento
 * (ADR-0029, decisão do dono de 29/10/2026).
 *
 * Por que: `posts`, `dicas` e `products` sempre usaram `published`, enquanto
 * `musicas` e `videos` carregavam `publicado` — divergência histórica mantida
 * pelo ADR-0025 como "evolução futura". Este caso executa a evolução:
 *
 * 1. RENAME `publicado` → `published` em `musicas` e `videos`. Rename
 *    preserva dados (nenhum valor é tocado). Nenhuma view/função no banco
 *    referenciava `publicado` (conferido em 29/10/2026 via pg_views/pg_proc).
 *    Os índices `idx_musicas_pagination`/`idx_videos_pagination` (migration
 *    012) não precisam de rename: o PostgreSQL segue a coluna renomeada na
 *    definição do índice e os nomes são neutros.
 * 2. `SET DEFAULT false` em musicas, videos, dicas e products — nada nasce
 *    publicado; o operador publica conscientemente. Dicas e products, que
 *    nasciam `true`, passam a rascunho (mudança de comportamento aprovada).
 *
 * Idempotente: cada passo é guardado por `information_schema`. Em um banco
 * recriado do zero (schemas JSON já com `published DEFAULT false`), o rename
 * é pulado e o SET DEFAULT é no-op declarativo.
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Unificando coluna de publicação para "published"...`);

  for (const table of ['musicas', 'videos']) {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '${table}'
         AND column_name IN ('publicado', 'published')`
    );

    const hasOld = rows.some((row) => row.column_name === 'publicado');
    const hasNew = rows.some((row) => row.column_name === 'published');

    if (hasOld && hasNew) {
      throw new Error(
        `Tabela ${table} tem BOTH publicado e published — estado inesperado; investigar antes de migrar.`
      );
    }

    if (hasOld) {
      await client.query(`ALTER TABLE ${table} RENAME COLUMN publicado TO published`);
      console.log(`   ✅ ${table}: publicado → published (dados preservados).`);
    } else if (hasNew) {
      console.log(`   ↷ ${table}: coluna já é "published" — rename pulado.`);
    } else {
      throw new Error(`Tabela ${table} sem coluna de publicação — rode as migrations anteriores.`);
    }
  }

  // Default único: nada nasce publicado. musicas/videos já eram false
  // (no-op); dicas/products saem de true. SET DEFAULT é idempotente.
  for (const table of ['musicas', 'videos', 'dicas', 'products']) {
    await client.query(`ALTER TABLE ${table} ALTER COLUMN published SET DEFAULT false`);
  }
  console.log('   ✅ DEFAULT false aplicado a musicas, videos, dicas e products.');

  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Revertendo unificação de nomenclatura...`);

  for (const table of ['musicas', 'videos']) {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '${table}'
         AND column_name IN ('publicado', 'published')`
    );
    const hasOld = rows.some((row) => row.column_name === 'publicado');
    const hasNew = rows.some((row) => row.column_name === 'published');

    if (hasNew && !hasOld) {
      await client.query(`ALTER TABLE ${table} RENAME COLUMN published TO publicado`);
      console.log(`   ✅ ${table}: published → publicado.`);
    }
  }

  // Defaults anteriores: dicas e products nasciam publicados.
  await client.query(`ALTER TABLE dicas ALTER COLUMN published SET DEFAULT true`);
  await client.query(`ALTER TABLE products ALTER COLUMN published SET DEFAULT true`);
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}
