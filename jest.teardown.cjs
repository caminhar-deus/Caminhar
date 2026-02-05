// Este arquivo é usado para limpar recursos após a execução de todos os testes.
module.exports = async () => {
  // Usamos um import() dinâmico aqui porque lib/db.js é um módulo ES,
  // e os arquivos de configuração globais do Jest são executados como módulos CommonJS.
  const { closeDatabase } = await import('./lib/db.js');
  await closeDatabase();
  console.log('\n[Teardown] Pool de conexões com o banco de dados fechado.');
};