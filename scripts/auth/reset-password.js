import 'dotenv/config';
import { hashPassword } from './auth.js';
import { query, closeDatabase } from './db.js';

async function resetAdminPassword() {
  const username = process.argv[2] || 'admin';
  const newPassword = process.argv[3] || '123456';

  console.log(`🔄 Redefinindo senha para o usuário: ${username}`);
  
  try {
    const hashedPassword = await hashPassword(newPassword);
    
    // Verifica se o usuário existe
    const checkUser = await query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (checkUser.rows.length === 0) {
      console.log(`⚠️ Usuário '${username}' não encontrado. Criando novo usuário...`);
      await query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, hashedPassword, 'admin']);
    } else {
      await query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);
    }

    console.log(`✅ Sucesso! A senha do usuário '${username}' foi alterada para: '${newPassword}'`);
    console.log('👉 Tente fazer login agora.');

  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
  } finally {
    await closeDatabase();
  }
}

resetAdminPassword();