import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🚀 Iniciando teste de Rate Limit...');
console.log('ℹ️  Configuração esperada: 5 tentativas permitidas, 6ª bloqueada.\n');

const runTest = async () => {
  for (let i = 1; i <= 7; i++) {
    await new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const isBlocked = res.statusCode === 429;
          const statusIcon = isBlocked ? '⛔' : '✅';
          
          console.log(`${statusIcon} Tentativa ${i}: Status ${res.statusCode}`);
          
          if (isBlocked) {
            console.log(`   Resposta: ${data}`);
          }
          resolve();
        });
      });
      
      req.on('error', (e) => console.error(`❌ Erro: ${e.message}`));
      req.end();
    });
  }
};

runTest();