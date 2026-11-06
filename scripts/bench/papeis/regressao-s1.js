#!/usr/bin/env node
/**
 * Regressão plantada do S1 — usada pelo bench do papel do `fixer`.
 *
 * Por que existe: o S1 (vazamento de `error.message` em `pages/api/status.js` na
 * rota pública de health check) foi RESOLVIDO no HEAD em 21/10, e a tarefa do fixer
 * é descrever justamente esse vazamento — sem a regressão, a tarefa fica sem objeto
 * e a medição perde o papel (foi o que aconteceu na primeira execução do glm em
 * 22/10: o modelo diagnosticou com honestidade que a correção já estava no HEAD e
 * não editou nada).
 *
 * O instrumento, então, devolve o disco ao estado do bug (19/10) antes do spawn e
 * o `restaurarArvore()` do runner (e a `restaurar()` do conferidor) volta ao HEAD
 * corrigido por `git checkout` depois — `pages/api/status.js` é rastreado, logo a
 * regressão se desfaz na limpeza padrão. Nada fica no repositório.
 *
 * Frágil por desenho: se o bloco de `catch` de `status.js` mudar, `aplicarRegressao()`
 * falha alto em vez de plantar qualquer coisa. Reanalisar/PENDÊNCIA: é a mesma regra do
 * ADR-0008 (mudança de superfície em `pages/api/` obriga recalibrar instrumento na
 * mesma rodada).
 *
 * Uso (fora deste módulo): `verificarRegressao()` como preflight em `rodar.js`,
 * `aplicarRegressao()` em `rodar.js` antes do spawn do fixer e em
 * `conferir-fixer.js` antes de reaplicar as edições do candidato.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ALVO_RELATIVO = path.join('pages', 'api', 'status.js');

/** Bloco corrigido do HEAD ( conferido em 22/10/2026, `pages/api/status.js:80-88`). */
const BLOCO_FIXADO = [
  '  } catch {',
  '    // A mensagem crua do driver pode expor host, porta e usuário do Postgres.',
  '    // Aqui vai uma mensagem fixa e genérica; o diagnóstico original continua',
  '    // registrado no servidor — a camada de banco (lib/infra/db.js) já loga o',
  '    // erro cru no logger.error. Status HTTP 200 e status \'error\' permanecem:',
  '    // é um health check.',
  "    status.data.database.status = 'error';",
  "    status.data.database.details.error = 'Falha ao conectar ao banco de dados';",
  '  }',
].join('\n');

/** O bug do S1 (estado de 19/10): mensagem crua do driver na resposta pública. */
const BLOCO_REGREDIDO = [
  '  } catch (error) {',
  "    status.data.database.status = 'error';",
  '    status.data.database.details.error = error.message;',
  '  }',
].join('\n');

/**
 * Devolve o `catch` do health check de `pages/api/status.js` ao bug do S1.
 * Falha alto se o bloco corrigido não for encontrado — nunca planta parcialmente.
 */
export async function aplicarRegressao(RAIZ = process.cwd()) {
  const caminho = path.join(RAIZ, ALVO_RELATIVO);
  const atual = await readFile(caminho, 'utf8');
  if (!atual.includes(BLOCO_FIXADO)) {
    throw new Error(
      `Bloco corrigido do S1 não encontrado em ${ALVO_RELATIVO}. ` +
      'A regressão não pode ser plantada — confira se o arquivo mudou ' +
      '(recalibração prevista no hook do ADR-0008).'
    );
  }
  await writeFile(caminho, atual.replace(BLOCO_FIXADO, BLOCO_REGREDIDO), 'utf8');
}

/**
 * Estado read-only da regressão do S1 no disco. **Não escreve nada.**
 *
 * O runner usa isto como preflight: só planta a regressão quando o disco está
 * `corrigido`; `desconhecido` (o bloco mudou) e `ausente` bloqueiam a execução
 * em vez de deixar `aplicarRegressao()` falhar no meio da bateria.
 *
 * @returns {{estado: 'corrigido'|'regredido'|'desconhecido'|'ausente', detalhe: string}}
 */
export async function verificarRegressao(RAIZ = process.cwd()) {
  const caminho = path.join(RAIZ, ALVO_RELATIVO);
  let atual;
  try {
    atual = await readFile(caminho, 'utf8');
  } catch {
    return { estado: 'ausente', detalhe: `${ALVO_RELATIVO} não existe no disco` };
  }
  const corrigido = atual.includes(BLOCO_FIXADO);
  const regredido = atual.includes(BLOCO_REGREDIDO);
  if (corrigido && !regredido) return { estado: 'corrigido', detalhe: '' };
  if (regredido && !corrigido) return { estado: 'regredido', detalhe: '' };
  return {
    estado: 'desconhecido',
    detalhe: `nem o bloco corrigido nem o bloco do bug foram encontrados em ${ALVO_RELATIVO}; recalibre a regressão (ADR-0008)`,
  };
}
