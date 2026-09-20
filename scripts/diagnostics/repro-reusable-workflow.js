#!/usr/bin/env node
/**
 * Valida um workflow com o mesmo motor do language server da extensão GitHub
 * Actions e demonstra por que referências locais a workflows reutilizáveis
 * (`uses: ./.github/workflows/x.yml`) viram "Unable to find reusable workflow"
 * no editor.
 *
 * Cenários executados:
 *   A) workspace conhecido            -> o arquivo deve validar limpo
 *   B) só client (logado, sem repo)   -> reproduz o falso positivo
 *   C) sem client e sem workspace     -> o parser ignora a referência em silêncio
 *   D) workspace + leitura falhando   -> mesma mensagem do cenário B
 *
 * B e D só se aplicam quando o arquivo chama um workflow reutilizável local
 * (`jobs.<id>.uses: ./...`); sem isso eles são pulados, e a referência a action
 * local (`uses: ./.github/actions/x`, dentro de um step) não entra nessa conta.
 *
 * O cenário A é uma asserção: se ele acusar qualquer diagnóstico, há um problema
 * de verdade no workflow (schema, expressão, input inexistente etc.) e o script
 * sai com código 1 — é a validação offline usável em automação. Os cenários B, C
 * e D são informativos (documentam o mecanismo do falso positivo).
 *
 * Uso:
 *   npm run diag:reusable-workflow                    # usa pr-coverage.yml
 *   npm run diag:reusable-workflow -- load-tests.yml
 *   npm run diag:reusable-workflow -- --workspace <dir> <arquivo.yml>
 *
 * Não rode com `node scripts/diagnostics/repro-reusable-workflow.js`: o pacote
 * @actions/workflow-parser importa JSON sem `with { type: 'json' }` e o Node 22+
 * recusa o módulo (ERR_IMPORT_ATTRIBUTE_MISSING). O script do npm empacota com
 * esbuild antes de executar.
 */
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import * as uri from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validate } from '@actions/languageservice';
import { clearCache } from '@actions/languageservice/utils/workflow-cache';
import { parseFileReference } from '@actions/workflow-parser/workflows/file-reference';

const MENSAGEM_FALSO_POSITIVO = 'Unable to find reusable workflow';

function lerArgumentos(argv) {
  const opcoes = {
    alvo: '.github/workflows/pr-coverage.yml',
    workspace: process.cwd(),
    ajuda: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opcoes.ajuda = true;
    else if (arg === '--workspace') {
      i += 1;
      opcoes.workspace = argv[i];
    } else if (arg.startsWith('--')) {
      throw new Error(`argumento desconhecido: ${arg}`);
    } else {
      opcoes.alvo = arg;
    }
  }

  return opcoes;
}

/**
 * Cópia fiel de `languageserver/src/file-provider.ts`: é o provider que decide
 * se a referência local resolve ou falha, conforme os argumentos recebidos.
 */
function criarFileProvider({ client, workspace, lerArquivo }) {
  if (!client && !workspace) return undefined;

  return {
    getFileContent: async ref => {
      if ('repository' in ref) {
        if (!client) throw new Error('Remote file references are not supported with this configuration');
        throw new Error('Referência remota não exercitada por este diagnóstico');
      }

      if (!workspace) throw new Error('Local file references are not supported with this configuration');

      const workspaceUri = uri.URI.parse(workspace);
      const refUri = uri.Utils.joinPath(workspaceUri, ref.path);
      const conteudo = await lerArquivo(refUri.toString());
      if (!conteudo) throw new Error(`File not found: ${ref.path}`);

      return { name: ref.path, content: conteudo };
    }
  };
}

/**
 * Referência a workflow reutilizável local no nível do job (`jobs.<id>.uses`).
 *
 * A checagem é feita no YAML parseado, e não por regex no texto: `uses` de
 * *steps* apontam para actions (`./.github/actions/x`) e não passam pelo
 * caminho do parser que produz o falso positivo.
 */
function referenciaLocalDeWorkflow(conteudo) {
  const documento = YAML.parse(conteudo);
  const jobs = documento && typeof documento === 'object' ? documento.jobs : undefined;
  if (!jobs || typeof jobs !== 'object') return undefined;

  for (const job of Object.values(jobs)) {
    if (job && typeof job === 'object' && typeof job.uses === 'string' && job.uses.startsWith('./')) {
      return job.uses;
    }
  }

  return undefined;
}

const AJUDA = `Uso: npm run diag:reusable-workflow -- [arquivo.yml] [--workspace <dir>]

Valida o workflow com o motor do language server e demonstra o falso positivo
"Unable to find reusable workflow" das referências locais.

Opções:
  --workspace <dir>   raiz do repositório (padrão: diretório atual)
  --help              esta ajuda

O cenário A (com contexto de repositório) reprova o script quando o arquivo tem
qualquer diagnóstico real: schema, expressão ou input inexistente.`;

const VERIFICACOES = {
  limpo: diagnosticos => diagnosticos.length === 0,
  falsoPositivo: diagnosticos => diagnosticos.some(d => d.message === MENSAGEM_FALSO_POSITIVO)
};

function nivelDe(severidade) {
  return { 1: 'Error', 2: 'Warning', 3: 'Info', 4: 'Hint' }[severidade] || severidade;
}

async function validar(documento, fileProvider) {
  clearCache();
  return await validate(documento, { fileProvider });
}

async function principal() {
  const opcoes = lerArgumentos(process.argv.slice(2));
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }

  const alvo = path.resolve(opcoes.alvo);
  if (!fs.existsSync(alvo)) throw new Error(`arquivo não encontrado: ${alvo}`);

  const raizWorkspace = path.resolve(opcoes.workspace);
  if (!fs.existsSync(path.join(raizWorkspace, '.git'))) {
    console.warn(`aviso: ${raizWorkspace} não parece ser a raiz do repositório.\n`);
  }

  const workspaceUri = uri.URI.file(raizWorkspace).toString();
  const conteudo = fs.readFileSync(alvo, 'utf8');
  const documento = TextDocument.create(uri.URI.file(alvo).toString(), 'yaml', 1, conteudo);
  const lerArquivo = async caminho => fs.readFileSync(uri.URI.parse(caminho).fsPath, 'utf8');
  const lerArquivoFalhando = async () => {
    throw new Error('ENOENT: arquivo inexistente no caminho resolvido');
  };

  const referenciaLocal = referenciaLocalDeWorkflow(conteudo);

  console.log(`arquivo:   ${alvo}`);
  console.log(`workspace: ${workspaceUri}`);
  console.log(`workflow reutilizável local: ${referenciaLocal || 'nenhum'}\n`);

  const cenarios = [
    {
      rotulo: 'A — workspace conhecido (editor com contexto de repositório)',
      esperar: 'limpo',
      critico: true,
      provider: criarFileProvider({ client: {}, workspace: workspaceUri, lerArquivo })
    },
    {
      rotulo: 'B — só client (logado, sem contexto de repositório)',
      esperar: 'falsoPositivo',
      requerReferenciaLocal: true,
      provider: criarFileProvider({ client: {}, workspace: undefined, lerArquivo })
    },
    {
      rotulo: 'C — sem client e sem workspace (provider inexistente)',
      esperar: 'limpo',
      provider: undefined
    },
    {
      rotulo: 'D — workspace com leitura do arquivo falhando',
      esperar: 'falsoPositivo',
      requerReferenciaLocal: true,
      provider: criarFileProvider({ client: {}, workspace: workspaceUri, lerArquivo: lerArquivoFalhando })
    }
  ];

  let falhas = 0;
  for (const cenario of cenarios) {
    if (cenario.requerReferenciaLocal && !referenciaLocal) {
      console.log(`=== ${cenario.rotulo} ===`);
      console.log('  não se aplica: o arquivo não chama workflow reutilizável local\n');
      continue;
    }

    const diagnosticos = await validar(documento, cenario.provider);
    const atendeu = VERIFICACOES[cenario.esperar](diagnosticos);

    console.log(`=== ${cenario.rotulo} ===`);
    console.log(
      `  esperado: ${cenario.esperar === 'limpo' ? 'nenhum diagnóstico' : `"${MENSAGEM_FALSO_POSITIVO}"`}`
    );
    if (diagnosticos.length === 0) console.log('  diagnósticos: nenhum');
    for (const diagnostico of diagnosticos) {
      console.log(
        `  [${nivelDe(diagnostico.severity)}] linha ${diagnostico.range.start.line + 1}, col ${diagnostico.range.start.character + 1}: ${diagnostico.message}`
      );
    }

    if (atendeu) {
      console.log('  resultado: como esperado\n');
    } else {
      console.log(`  resultado: INESPERADO (esperava ${cenario.esperar})\n`);
      if (cenario.critico) falhas += 1;
    }
  }

  if (referenciaLocal) {
    const referencia = parseFileReference(referenciaLocal);
    console.log('=== como o parser resolve a referência local ===');
    console.log(`  parseFileReference(${referenciaLocal}) -> ${JSON.stringify(referencia)}`);
    console.log(
      `  joinPath(workspace, path) -> ${uri.Utils.joinPath(uri.URI.parse(workspaceUri), referencia.path).toString()}\n`
    );
  }

  if (falhas > 0) {
    console.error(
      `RESULTADO: ${falhas} cenário(s) crítico(s) inesperado(s) — o cenário A aponta problema real no\n` +
        'workflow (schema, expressão, input inexistente ou referência remota, que este diagnóstico\n' +
        'não exercita).'
    );
    process.exitCode = 1;
    return;
  }

  console.log('RESULTADO: ok');
}

principal().catch(erro => {
  console.error(`Erro: ${erro.message}`);
  process.exit(2);
});
