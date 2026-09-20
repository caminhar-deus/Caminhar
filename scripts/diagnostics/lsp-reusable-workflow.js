#!/usr/bin/env node
/**
 * Diagnóstico do falso positivo "Unable to find reusable workflow".
 *
 * Sobe o language server empacotado da extensão `github.vscode-github-actions`
 * do VS Code e valida um workflow que referencia outro workflow por caminho
 * local (`uses: ./.github/workflows/x.yml`), imprimindo:
 *
 *   - os arquivos que o server pediu para ler (prova se ele conseguiu resolver
 *     a referência local);
 *   - os diagnósticos publicados para o documento.
 *
 * O server resolve referência local com o `workspaceUri` do repositório que
 * recebe na inicialização. Sem esse contexto (é o estado do editor quando o
 * servidor sobe antes de o repositório ser detectado) a leitura falha e o
 * parser converte a falha em "Unable to find reusable workflow" — falso
 * positivo, pois o workflow é válido e executa no GitHub. Use `--no-repos` para
 * reproduzir esse estado.
 *
 * Uso:
 *   node scripts/diagnostics/lsp-reusable-workflow.js [arquivo.yml] [opções]
 *
 * Opções:
 *   --workspace <dir>   raiz do repositório (padrão: diretório atual)
 *   --no-repos          inicializa SEM contexto de repositório (reproduz o
 *                       falso positivo). Usa um token de placeholder, então os
 *                       avisos de action remota não resolvida são esperados.
 *   --extension <dir>   diretório da extensão instalada (padrão: descobre a
 *                       versão mais recente em ~/.vscode/extensions)
 *   --timeout <ms>      espera máxima pelos diagnósticos (padrão: 20000)
 *   --help
 *
 * Sai com código 1 quando o documento recebe algum diagnóstico de erro.
 *
 * Requer o VS Code com a extensão instalada: é um diagnóstico local.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const NOME_EXTENSAO = 'github.vscode-github-actions-';

const AJUDA = `Uso: node scripts/diagnostics/lsp-reusable-workflow.js [arquivo.yml] [opções]

Opções:
  --workspace <dir>   raiz do repositório (padrão: diretório atual)
  --no-repos          inicializa SEM contexto de repositório (reproduz o falso positivo;
                      usa token de placeholder, então actions remotas não resolvem)
  --extension <dir>   diretório da extensão instalada
  --timeout <ms>      espera máxima pelos diagnósticos (padrão: 20000)
  --help              esta ajuda

Sai com código 1 quando o documento recebe algum diagnóstico de erro.`;

function lerArgumentos(argv) {
  const opcoes = {
    alvo: '.github/workflows/pr-coverage.yml',
    workspace: process.cwd(),
    repos: true,
    extensao: undefined,
    timeout: 20000,
    ajuda: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opcoes.ajuda = true;
    else if (arg === '--no-repos') opcoes.repos = false;
    else if (arg === '--workspace') {
      i += 1;
      opcoes.workspace = argv[i];
    } else if (arg === '--extension') {
      i += 1;
      opcoes.extensao = argv[i];
    } else if (arg === '--timeout') {
      i += 1;
      opcoes.timeout = Number(argv[i]);
    } else if (arg.startsWith('--')) {
      throw new Error(`argumento desconhecido: ${arg}`);
    } else {
      opcoes.alvo = arg;
    }
  }

  return opcoes;
}

/** Versão da extensão no nome da pasta, comparável numericamente. */
function versaoDaExtensao(nome) {
  return nome
    .slice(NOME_EXTENSAO.length)
    .split('.')
    .map(parte => Number.parseInt(parte, 10) || 0);
}

function compararVersoes(a, b) {
  const limite = Math.max(a.length, b.length);
  for (let i = 0; i < limite; i += 1) {
    const diferenca = (a[i] || 0) - (b[i] || 0);
    if (diferenca !== 0) return diferenca;
  }
  return 0;
}

function servidorDaExtensao(diretorio) {
  return path.join(diretorio, 'dist', 'server-node.js');
}

/** Descobre o `server-node.js` da extensão instalada mais recente. */
function procurarServidor() {
  const raizes = [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.vscode-insiders', 'extensions'),
    path.join(os.homedir(), '.vscode-oss', 'extensions'),
    path.join(os.homedir(), '.vscode-server', 'extensions')
  ];

  const encontrados = [];
  for (const raiz of raizes) {
    if (!fs.existsSync(raiz)) continue;
    for (const nome of fs.readdirSync(raiz)) {
      if (!nome.startsWith(NOME_EXTENSAO)) continue;
      const servidor = servidorDaExtensao(path.join(raiz, nome));
      if (fs.existsSync(servidor)) encontrados.push({ servidor, versao: versaoDaExtensao(nome) });
    }
  }

  encontrados.sort((a, b) => compararVersoes(a.versao, b.versao));
  return encontrados.length > 0 ? encontrados[encontrados.length - 1].servidor : undefined;
}

function enviar(processo, mensagem) {
  const corpo = JSON.stringify(mensagem);
  processo.stdin.write(`Content-Length: ${Buffer.byteLength(corpo)}\r\n\r\n${corpo}`);
}

/** Identidade `owner/repo` do remoto, usada no payload de repositórios. */
function identidadeDoRepositorio(workspace) {
  const padrao = /git@[^:]+:([^/]+)\/([^/\s]+?)(?:\.git)?$|https?:\/\/[^/]+\/([^/]+)\/([^/\s]+?)(?:\.git)?$/;
  try {
    const configuracao = fs.readFileSync(path.join(workspace, '.git', 'config'), 'utf8');
    const url = /url\s*=\s*(\S+)/.exec(configuracao);
    const partes = url ? padrao.exec(url[1]) : undefined;
    if (partes) return { owner: partes[1] || partes[3], name: partes[2] || partes[4] };
  } catch {
    // Sem repositório git: o server usa os repositórios apenas para resolver
    // referências remotas, então o nome é irrelevante para este diagnóstico.
  }

  return { owner: 'owner', name: path.basename(workspace) };
}

async function principal() {
  const opcoes = lerArgumentos(process.argv.slice(2));
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return 0;
  }

  const alvo = path.resolve(opcoes.alvo);
  if (!fs.existsSync(alvo)) throw new Error(`arquivo não encontrado: ${alvo}`);

  const workspace = path.resolve(opcoes.workspace);
  const servidor = opcoes.extensao
    ? servidorDaExtensao(path.resolve(opcoes.extensao))
    : procurarServidor();

  if (!servidor || !fs.existsSync(servidor)) {
    throw new Error(
      'language server da extensão GitHub Actions não encontrado. ' +
        'Instale a extensão no VS Code ou informe --extension <dir>.'
    );
  }

  const workspaceUri = pathToFileURL(workspace).toString().replace(/\/$/, '');
  const alvoUri = pathToFileURL(alvo).toString();
  const repositorio = identidadeDoRepositorio(workspace);

  console.log(`alvo:                    ${alvo}`);
  console.log(`workspace:               ${workspaceUri}`);
  console.log(`contexto de repositório: ${opcoes.repos ? 'sim' : 'NÃO (--no-repos)'}`);
  console.log(`servidor:                ${servidor}\n`);

  const processo = spawn(process.execPath, [servidor, '--stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });

  const leituras = [];
  const diagnosticos = [];
  let buffer = Buffer.alloc(0);
  let temporizadorEspera;
  let temporizadorLimite;
  let encerrado = false;

  function relatar(codigo) {
    if (encerrado) return;
    encerrado = true;
    clearTimeout(temporizadorEspera);
    clearTimeout(temporizadorLimite);
    processo.kill();

    console.log('=== arquivos lidos pelo server ===');
    if (leituras.length === 0) console.log('  (nenhum arquivo foi lido)');
    for (const leitura of leituras) console.log(`  ${leitura}`);

    console.log(`\n=== diagnósticos (${diagnosticos.length}) ===`);
    if (diagnosticos.length === 0) console.log('  (nenhum)');
    const niveis = { 1: 'Error', 2: 'Warning', 3: 'Info', 4: 'Hint' };
    for (const diagnostico of diagnosticos) {
      const nivel = niveis[diagnostico.severity] || diagnostico.severity;
      console.log(
        `  [${nivel}] linha ${diagnostico.range.start.line + 1}, col ${diagnostico.range.start.character + 1}: ${diagnostico.message}`
      );
    }

    const erros = diagnosticos.filter(diagnostico => diagnostico.severity === 1);
    const falsoPositivo = erros.some(erro => erro.message === 'Unable to find reusable workflow');
    if (falsoPositivo && !opcoes.repos) {
      console.log(
        '\nReproduzido: sem contexto de repositório o server não lê o workflow referenciado e o\n' +
          'parser converte a falha em "Unable to find reusable workflow" — falso positivo do editor\n' +
          '(github/vscode-github-actions#254). Rode sem --no-repos para ver o mesmo arquivo limpo.\n' +
          'Obs.: neste modo o token é um placeholder, então os diagnósticos "Unable to resolve action"\n' +
          'acima são efeito do 401 na busca de metadados das actions remotas, não deste cenário.'
      );
    } else if (falsoPositivo) {
      console.log(
        '\nATENÇÃO: o erro apareceu mesmo com contexto de repositório. Confira se o arquivo\n' +
          'referenciado existe no caminho indicado pelo `uses:`.'
      );
    }

    process.exit(typeof codigo === 'number' ? codigo : erros.length > 0 ? 1 : 0);
  }

  /** Espera o server terminar de publicar diagnósticos após o último recebido. */
  function agendarRelato() {
    clearTimeout(temporizadorEspera);
    temporizadorEspera = setTimeout(() => relatar(), 1000);
  }

  function tratar(mensagem) {
    const { method, id, params } = mensagem;

    if (method === 'actions/readFile' && id !== undefined) {
      try {
        const conteudo = fs.readFileSync(fileURLToPath(params.path), 'utf8');
        leituras.push(`OK    ${params.path} (${conteudo.length} chars)`);
        enviar(processo, { jsonrpc: '2.0', id, result: conteudo });
      } catch (erro) {
        leituras.push(`FALHA ${params.path} -> ${erro.message}`);
        enviar(processo, { jsonrpc: '2.0', id, error: { code: -32603, message: erro.message } });
      }
      return;
    }

    if (method === 'workspace/configuration' && id !== undefined) {
      enviar(processo, { jsonrpc: '2.0', id, result: (params.items || []).map(() => null) });
      return;
    }

    if (method === 'client/registerCapability' && id !== undefined) {
      enviar(processo, { jsonrpc: '2.0', id, result: null });
      return;
    }

    if (method === 'textDocument/publishDiagnostics') {
      if (params.uri === alvoUri) {
        diagnosticos.length = 0;
        diagnosticos.push(...params.diagnostics);
        agendarRelato();
      }
      return;
    }

    if (id === 1 && mensagem.result) {
      enviar(processo, { jsonrpc: '2.0', method: 'initialized', params: {} });
      enviar(processo, {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: alvoUri,
            languageId: 'github-actions-workflow',
            version: 1,
            text: fs.readFileSync(alvo, 'utf8')
          }
        }
      });
      return;
    }

    if (method && id !== undefined) {
      enviar(processo, { jsonrpc: '2.0', id, error: { code: -32601, message: `não implementado: ${method}` } });
    }
  }

  processo.stdout.on('data', pedaco => {
    buffer = Buffer.concat([buffer, pedaco]);
    for (;;) {
      const separador = buffer.indexOf('\r\n\r\n');
      if (separador === -1) break;

      const cabecalho = /Content-Length: (\d+)/i.exec(buffer.subarray(0, separador).toString());
      if (!cabecalho) {
        buffer = buffer.subarray(separador + 4);
        continue;
      }

      const tamanho = Number.parseInt(cabecalho[1], 10);
      if (buffer.length < separador + 4 + tamanho) break;

      const corpo = buffer.subarray(separador + 4, separador + 4 + tamanho).toString();
      buffer = buffer.subarray(separador + 4 + tamanho);

      let mensagem;
      try {
        mensagem = JSON.parse(corpo);
      } catch {
        continue;
      }
      tratar(mensagem);
    }
  });

  processo.on('exit', codigo => {
    if (!encerrado) {
      console.error(`\nO language server encerrou inesperadamente (código ${codigo}).`);
      relatar(2);
    }
  });

  processo.on('error', erro => {
    if (!encerrado) {
      console.error(`\nFalha ao iniciar o language server: ${erro.message}`);
      relatar(2);
    }
  });

  temporizadorLimite = setTimeout(
    () => {
      console.error(`\nTimeout de ${opcoes.timeout} ms aguardando diagnósticos.`);
      relatar(2);
    },
    Number.isFinite(opcoes.timeout) ? opcoes.timeout : 20000
  );

  enviar(processo, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: workspaceUri,
      workspaceFolders: [{ uri: workspaceUri, name: path.basename(workspace) }],
      capabilities: {
        workspace: { workspaceFolders: true, configuration: true },
        textDocument: { publishDiagnostics: { relatedInformation: true } }
      },
      initializationOptions: {
        // Com `--no-repos` o cenário reproduzido é o do editor logado (token
        // presente) mas sem contexto de repositório: é a combinação que cria o
        // file provider e faz a leitura local falhar. Sem token algum, o server
        // nem cria o provider e o parser ignora a referência em silêncio.
        ...(opcoes.repos
          ? { repos: [{ ...repositorio, workspaceUri }] }
          : { sessionToken: 'diagnostico-sem-contexto-de-repositorio' }),
        logLevel: 1
      }
    }
  });
}

principal().catch(erro => {
  console.error(`Erro: ${erro.message}`);
  process.exit(2);
});
