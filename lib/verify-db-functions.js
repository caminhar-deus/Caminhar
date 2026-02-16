import * as db from './db.js';

console.log('🔍 Verificando funções exportadas por lib/db.js...');

const exports = Object.keys(db);
console.log('📋 Funções encontradas:', exports.join(', '));

if (typeof db.getSetting === 'function') {
  console.log('\n✅ A função "getSetting" existe e está pronta para uso!');
} else {
  console.log('\n❌ A função "getSetting" NÃO foi encontrada.');
  console.log('   Você precisará adicioná-la ao arquivo lib/db.js.');
}