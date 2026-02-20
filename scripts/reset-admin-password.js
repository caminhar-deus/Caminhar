import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function resetPassword() {
  // Importa dependências dinamicamente após carregar variáveis de ambiente
  const { hashPassword } = await import('../lib/auth.js');
  const { query, closeDatabase } = await import('../lib/db.js');

  // Pega argumentos da linha de comando: node scripts/reset-admin-password.js <user> <pass>
  const targetUser = process.argv[2] || 'admin';
  const newPassword = process.argv[3];

  if (!newPassword) {
    console.error('❌ Por favor, forneça a nova senha.');
    console.log('Uso: node scripts/reset-admin-password.js <usuario> <nova_senha>');
    console.log('Exemplo: node scripts/reset-admin-password.js admin 123456');
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
      console.log(`⚠️ Usuário '${targetUser}' não encontrado. Criando novo admin...`);
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
    await closeDatabase();
  }
}

resetPassword();