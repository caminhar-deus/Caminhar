#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

async function resetPassword() {
  const { hashPassword } = await import('../lib/auth.js');

  const targetUser = process.argv[2] || 'admin';
  const newPassword = process.argv[3];

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

resetPassword();