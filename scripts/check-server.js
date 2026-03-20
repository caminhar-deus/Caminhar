import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

const checkServer = () => {
  return new Promise((resolve, reject) => {
    const client = URL.startsWith('https') ? https : http;
    const req = client.get(URL, (res) => {
      resolve();
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(2000, () => {
      req.abort();
      reject(new Error('Timeout'));
    });
  });
};

checkServer().then(() => {
  process.exit(0);
}).catch(() => {
  console.error(`\n❌ ERRO: O servidor não está respondendo em ${URL}`);
  console.error('👉 Por favor, inicie a aplicação com "npm run dev" ou "npm start" em outro terminal antes de rodar os testes de carga.\n');
  process.exit(1);
});