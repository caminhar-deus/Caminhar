#!/usr/bin/env node

const MIGRATION_NAME = '019-products-price-numeric';

/**
 * Converte products.price de VARCHAR para NUMERIC(10,2).
 *
 * Por que: o filtro Mín/Máx e a ordenação por preço da vitrine comparavam
 * strings (lexicográfico — "100.00" < "50.00"), e valores digitados como
 * "R$ 89,90" viravam NaN na formatação de moeda. Confirmação da [HIPÓTESE]
 * do doc privado §4.5 (análise 28/10/2026).
 *
 * Normalização no USING (idempotente por natureza: após a conversão a coluna
 * é numeric e o UPDATE não casa mais):
 * - remove "R$", espaços e caracteres não numéricos (exceto dígitos, vírgula e ponto);
 * - se houver vírgula, assume formato pt-BR ("1.234,56"): remove pontos de
 *   milhar e troca vírgula por ponto;
 * - se não houver vírgula, mantém o ponto decimal já válido ("89.90");
 * - lixo não numérico vira NULL (preço ausente é preferível a preço falso).
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Convertendo products.price de VARCHAR para NUMERIC(10,2)...`);

  const { rows } = await client.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price'`
  );

  if (rows.length === 0) {
    throw new Error('Tabela products não encontrada — rode as migrations anteriores.');
  }

  if (rows[0].data_type !== 'character varying') {
    console.log(`   ✅ ${MIGRATION_NAME}: coluna já é ${rows[0].data_type} — nada a fazer.`);
    return;
  }

  await client.query(`
    UPDATE products SET price = CASE
      WHEN price IS NULL OR trim(price) = '' THEN NULL
      ELSE
        CASE
          WHEN position(',' in price) > 0
            THEN regexp_replace(regexp_replace(price, '[^0-9,]', '', 'g'), '\\.', '', 'g')
          ELSE regexp_replace(price, '[^0-9.]', '', 'g')
        END
    END
    WHERE price IS NOT NULL AND price !~ '^[0-9]+(\\.[0-9]+)?$';
  `);

  await client.query(`
    UPDATE products
    SET price = replace(regexp_replace(price, '[^0-9,]', '', 'g'), ',', '.')
    WHERE price ~ ',';
  `);

  // Defesa final: qualquer resíduo que não seja um número limpo vira NULL —
  // garante que o cast do ALTER nunca falhe (preço ausente é preferível a
  // derrubar a migration). Decimais além de 2 casas são arredondados pelo
  // NUMERIC(10,2) no ALTER.
  await client.query(`
    UPDATE products SET price = NULL WHERE price !~ '^[0-9]+(\\.[0-9]+)?$';
  `);

  await client.query(`
    ALTER TABLE products
      ALTER COLUMN price TYPE NUMERIC(10,2)
      USING NULLIF(trim(price), '')::numeric;
  `);

  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Revertendo products.price para VARCHAR...`);
  await client.query(`ALTER TABLE products ALTER COLUMN price TYPE VARCHAR USING price::text;`);
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}
