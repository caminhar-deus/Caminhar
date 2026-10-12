#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

// Os parâmetros têm os MESMOS defaults do comportamento antigo (leitura direta
// de `process.argv`), o que torna a função testável sem depender de como o
// Jest foi invocado: `main()` continua sem argumentos e lê o argv como antes.
export async function resetPassword(
  targetUser = process.argv[2] || 'admin',
  newPassword = process.argv[3]
) {
  const { hashPassword } = await import('../lib/auth/auth.js');

  if (!newPassword) {
    console.error('❌ Por favor, forneça a nova senha.');
    console.log('Uso: node scripts/reset-password.js <usuario> <nova_senha>');
    console.log('Exemplo: node scripts/reset-password.js admin minha_senha_segura');
    process.exit(1);
  }

  try {
    console.log(`🔐 Gerando hash para o usuário '${targetUser}'...`);
    const hashedPassword = await hashPassword(newPassword);

    console.log('💾 Atualizando banco de dados...');
    const result = await query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id',
      [hashedPassword, targetUser]
    );

    if (result.rowCount === 0) {
      console.log(`⚠️  Usuário '${targetUser}' não encontrado. Criando novo admin...`);
      await query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        [targetUser, hashedPassword, 'admin']
      );
      console.log(`✅ Usuário '${targetUser}' criado com sucesso!`);
    } else {
      console.log(`✅ Senha de '${targetUser}' atualizada com sucesso!`);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar senha:', error);
  } finally {
    await closePool();
  }
}

// Execução principal — só quando invocado como CLI
// (`node scripts/reset-password.js <usuario> <senha>`), no mesmo estilo de
// `clear-db.js`/`clear-musicas.js`. Importar o módulo (ex.: nos testes) não pode
// tocar no banco nem chamar `process.exit(1)` de verdade — sem a guarda, o
// import dispararia `resetPassword()` e mataria o worker do Jest.
// A guarda chama `main()` sem `await` porque o Babel compila o script como
// CommonJS e não há suporte a top-level `await` nessa transformação.
export async function main() {
  await resetPassword();
}

if (process.argv[1] && process.argv[1].endsWith('reset-password.js')) {
  main();
}
