import { JSDOM } from 'jsdom';
import chalk from 'chalk';

// Configuração
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_DEPTH = 5; // Profundidade máxima de navegação
const CONCURRENCY = 5; // Requisições simultâneas

// Estado
const visited = new Set();
const brokenLinks = [];
const queue = [{ url: BASE_URL, source: 'Root', depth: 0 }];
let activeRequests = 0;

console.log(chalk.blue(`🔍 Iniciando verificação de links em: ${BASE_URL}`));

async function processQueue() {
  if (queue.length === 0 && activeRequests === 0) {
    printReport();
    return;
  }

  while (queue.length > 0 && activeRequests < CONCURRENCY) {
    const item = queue.shift();
    
    // Normaliza a URL para evitar duplicatas (remove hash e trailing slash)
    const normalizedUrl = item.url.split('#')[0].replace(/\/$/, '');
    
    if (visited.has(normalizedUrl)) {
      processQueue();
      continue;
    }

    visited.add(normalizedUrl);
    activeRequests++;
    checkLink(item).then(() => {
      activeRequests--;
      processQueue();
    });
  }
}

async function checkLink({ url, source, depth }) {
  try {
    const isInternal = url.startsWith(BASE_URL);
    
    // Para links externos, usamos HEAD para ser mais rápido e leve
    // Para internos, usamos GET para poder fazer o parse do HTML
    const method = isInternal ? 'GET' : 'HEAD';
    
    const res = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'Caminhar-Link-Checker/1.0',
      },
    });

    const status = res.status;

    if (status >= 400) {
      console.log(chalk.red(`❌ [${status}] ${url} (via ${source})`));
      brokenLinks.push({ url, source, status });
    } else {
      process.stdout.write(chalk.green('.')); // Feedback visual de progresso
    }

    // Se for link interno, HTML e não atingiu profundidade máxima, fazemos o crawl
    if (
      isInternal && 
      res.ok && 
      depth < MAX_DEPTH && 
      res.headers.get('content-type')?.includes('text/html')
    ) {
      const html = await res.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const anchors = doc.querySelectorAll('a[href]');

      anchors.forEach((a) => {
        const href = a.getAttribute('href');
        
        // Ignora links especiais
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return;
        }

        try {
          // Resolve URLs relativas
          const nextUrl = new URL(href, url).href;
          
          // Adiciona à fila se ainda não visitado (verificação rápida, a real é no processQueue)
          const normalizedNext = nextUrl.split('#')[0].replace(/\/$/, '');
          if (!visited.has(normalizedNext)) {
            queue.push({ url: nextUrl, source: url, depth: depth + 1 });
          }
        } catch (e) {
          // Ignora URLs inválidas
        }
      });
    }

  } catch (error) {
    console.log(chalk.red(`\n❌ [ERRO] ${url} (via ${source}): ${error.message}`));
    brokenLinks.push({ url, source, status: 'NETWORK_ERROR' });
  }
}

function printReport() {
  console.log('\n\n' + chalk.bold('📊 Relatório de Links Quebrados'));
  console.log('================================');
  console.log(`Total de links verificados: ${visited.size}`);
  console.log(`Total de links quebrados: ${brokenLinks.length}`);
  console.log('================================');

  if (brokenLinks.length > 0) {
    console.log(chalk.red('\nLista de Falhas:'));
    brokenLinks.forEach((item) => {
      console.log(`${chalk.bold(item.status)} - ${item.url}`);
      console.log(`   Encontrado em: ${item.source}`);
    });
    process.exit(1); // Falha no CI se houver links quebrados
  } else {
    console.log(chalk.green('✅ Nenhum link quebrado encontrado!'));
    process.exit(0);
  }
}

// Verifica se o servidor está rodando antes de começar
fetch(BASE_URL).then(() => {
  processQueue();
}).catch(() => {
  console.error(chalk.red(`\n⛔ Erro: Não foi possível conectar a ${BASE_URL}.`));
  console.error(chalk.yellow('Certifique-se de que o servidor está rodando (npm run dev ou npm start) em outro terminal.'));
  process.exit(1);
});