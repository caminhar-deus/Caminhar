#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
import { getPool, closePool } from '../db/connection.js';

loadEnv();

const CHECKS = [
  {
    id: '001',
    name: '001-add-views-to-posts',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views'`,
    expected: 'views',
    label: 'Coluna "views" em posts',
  },
  {
    id: '002',
    name: '002-create-products-table',
    check: `SELECT table_name FROM information_schema.tables WHERE table_name = 'products'`,
    expected: 'products',
    label: 'Tabela "products"',
  },
  {
    id: '003',
    name: '003-add-position-to-products',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'position'`,
    expected: 'position',
    label: 'Coluna "position" em products',
  },
  {
    id: '004',
    name: '004-add-published-to-products',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'published'`,
    expected: 'published',
    label: 'Coluna "published" em products',
  },
  {
    id: '005',
    name: '005-add-last-login-to-users',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at'`,
    expected: 'last_login_at',
    label: 'Coluna "last_login_at" em users',
  },
  {
    id: '006',
    name: '006-create-activity-logs',
    check: `SELECT table_name FROM information_schema.tables WHERE table_name = 'activity_logs'`,
    expected: 'activity_logs',
    label: 'Tabela "activity_logs"',
  },
  {
    id: '007',
    name: '007-add-position-to-musicas',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'musicas' AND column_name = 'position'`,
    expected: 'position',
    label: 'Coluna "position" em musicas',
  },
  {
    id: '008',
    name: '008-add-position-to-videos',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'position'`,
    expected: 'position',
    label: 'Coluna "position" em videos',
  },
  {
    id: '009',
    name: '009-add-position-to-posts',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'position'`,
    expected: 'position',
    label: 'Coluna "position" em posts',
  },
  {
    id: '011',
    name: '011-fix-entity-id-type',
    check: `SELECT data_type FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'entity_id'`,
    expectedType: 'bigint',
    label: 'entity_id como BIGINT em activity_logs',
  },
];

async function verify() {
  const pool = getPool();

  console.log('\n🔍 Verificando se as migrações já foram aplicadas no banco...\n');
  console.log('─'.repeat(65));

  let applied = 0;
  let pending = 0;
  const appliedMigrations = [];

  for (const check of CHECKS) {
    try {
      const result = await pool.query(check.check);

      let found = false;

      if (check.expectedType) {
        // Para migração 011: verificar o tipo da coluna
        found = result.rows.length > 0 && result.rows[0].data_type === check.expectedType;
      } else {
        // Para as demais: verificar se o registro existe
        found = result.rows.length > 0;
      }

      if (found) {
        console.log(`  ✅  ${check.id} | ${check.label.padEnd(40)} | Aplicada`);
        applied++;
        appliedMigrations.push(check.name);
      } else {
        console.log(`  ❌  ${check.id} | ${check.label.padEnd(40)} | Pendente`);
        pending++;
      }
    } catch (error) {
      console.log(`  ⚠️  ${check.id} | ${check.label.padEnd(40)} | Erro: ${error.message}`);
      pending++;
    }
  }

  console.log('─'.repeat(65));
  console.log(`\n📊 Resumo:`);
  console.log(`   Migrações verificadas: ${CHECKS.length}`);
  console.log(`   ✅ Aplicadas: ${applied}`);
  console.log(`   ❌ Pendentes: ${pending}`);

  if (applied === CHECKS.length) {
    console.log('\n🎉 Todas as migrações já estão aplicadas no banco!');
    console.log('\n📝 Sugestão: Popular a tabela _migrations com:');
    console.log('\n   node scripts/migrations/seed-migrations-table.js\n');
  } else if (applied > 0) {
    console.log('\n⚠️  Algumas migrações ainda não foram aplicadas.');
    console.log('   Você pode executar apenas as pendentes com: node scripts/migrate.js');
  } else {
    console.log('\n❌ Nenhuma migração encontrada no banco.');
    console.log('   Execute: node scripts/migrate.js');
  }

  await closePool();

  // Retorna o resultado para uso programático
  return { applied, pending, appliedMigrations };
}

verify();