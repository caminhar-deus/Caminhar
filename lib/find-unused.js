import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

// Configurações
const TARGET_DIRS = ['lib']; // Pastas para auditar (procurar arquivos órfãos)
const SCAN_DIRS = ['pages', 'components', 'lib', 'scripts']; // Pastas para escanear (procurar onde são usados)
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Arquivos especiais que o Next.js ou o sistema usam implicitamente
const WHITELIST = [
  'middleware.js',
  'instrumentation.js',
  'find-unused.js', // Este script
  'db.js',          // Core do sistema
  'auth.js',        // Core do sistema
  'redis.js'        // Core do sistema
];

// Ler package.json para verificar uso em scripts npm
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
const npmScripts = Object.values(packageJson.scripts || {}).join(' ');

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getAllFiles(filePath, fileList);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// 1. Identificar todos os arquivos alvo (candidatos a serem removidos)
const targetFiles = [];
TARGET_DIRS.forEach(dir => {
  getAllFiles(path.join(PROJECT_ROOT, dir), targetFiles);
});

// 2. Coletar todo o conteúdo de código do projeto para busca
const allCodeContent = [];
SCAN_DIRS.forEach(dir => {
  const files = [];
  getAllFiles(path.join(PROJECT_ROOT, dir), files);
  files.forEach(file => {
    try {
      // Não lemos o próprio arquivo que estamos verificando para evitar falso positivo de auto-referência
      allCodeContent.push({ path: file, content: fs.readFileSync(file, 'utf8') });
    } catch (e) {
      // Ignora erros de leitura
    }
  });
});

console.log(`🔍 Iniciando análise de arquivos não utilizados em: ${TARGET_DIRS.join(', ')}`);
console.log('---------------------------------------------------');

let unusedCount = 0;

targetFiles.forEach(filePath => {
  const filename = path.basename(filePath);
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  // Pula arquivos na whitelist
  if (WHITELIST.includes(filename)) return;

  // Verificação 1: Uso em scripts do package.json
  if (npmScripts.includes(relativePath) || npmScripts.includes(filename)) {
    return; 
  }

  // Verificação 2: Uso em imports no código
  // Heurística: procura pelo nome do arquivo sem extensão em imports (ex: from './arquivo')
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Regex simples para capturar menções ao arquivo
  // Procura por: /nome_arquivo' ou "nome_arquivo" ou /nome_arquivo.js
  const isUsedInCode = allCodeContent.some(file => {
    if (file.path === filePath) return false; // Ignora o próprio arquivo
    return file.content.includes(`/${nameWithoutExt}`) || 
           file.content.includes(`"${nameWithoutExt}"`) ||
           file.content.includes(`'${nameWithoutExt}'`);
  });

  if (isUsedInCode) {
    return;
  }

  console.log(`⚠️  Possível arquivo não utilizado: ${relativePath}`);
  unusedCount++;
});

console.log('---------------------------------------------------');
if (unusedCount === 0) {
  console.log('✅ Nenhum arquivo suspeito encontrado.');
} else {
  console.log(`Total: ${unusedCount} arquivos suspeitos.`);
  console.log('Nota: Verifique manualmente antes de excluir. Esta é uma análise heurística.');
}