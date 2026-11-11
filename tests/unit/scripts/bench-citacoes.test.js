/** @jest-environment node */
/**
 * Testes unitários do resolvedor de citações dos benches (scripts/bench/citacoes.js).
 *
 * Cobre a validação de caminhos externos, indexação lazy por nome base,
 * resolução de alvos abreviados (com '...'), preservação de múltiplos candidatos
 * em colisão, busca de reserva no next/dist e memoização de linhas/conteúdo.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { criarResolvedor, externaAoDisco } from '../../../scripts/bench/citacoes.js';

let fixture;

beforeAll(() => {
  fixture = mkdtempSync(path.join(os.tmpdir(), 'bench-citacoes-'));

  // Cria estrutura de diretórios e arquivos para testes
  mkdirSync(path.join(fixture, 'pages', 'api', 'admin'), { recursive: true });
  mkdirSync(path.join(fixture, 'lib', 'domain'), { recursive: true });
  mkdirSync(path.join(fixture, 'components', 'UI'), { recursive: true });
  mkdirSync(path.join(fixture, 'design-system'), { recursive: true });
  mkdirSync(path.join(fixture, 'docs', 'adr'), { recursive: true });

  // Arquivos em diferentes raízes para testar resolução de colisões
  writeFileSync(
    path.join(fixture, 'pages', 'api', 'posts.js'),
    '// rota publica\nexport default function handler() {}\n'
  );
  writeFileSync(
    path.join(fixture, 'pages', 'api', 'admin', 'posts.js'),
    '// rota admin\nline 2\nline 3\nexport default function adminHandler() {}\n'
  );
  writeFileSync(
    path.join(fixture, 'lib', 'domain', 'posts.js'),
    '// domain posts\nconst posts = [];\n'
  );

  // Componentes e docs
  writeFileSync(
    path.join(fixture, 'components', 'UI', 'Input.module.css'),
    '.input { color: red; }\n'
  );
  writeFileSync(
    path.join(fixture, 'design-system', 'MASTER.md'),
    '# Design System Master\n'
  );
  writeFileSync(
    path.join(fixture, 'docs', 'adr', '0010-regras.md'),
    '# ADR 0010\n'
  );
});

afterAll(() => {
  rmSync(fixture, { recursive: true, force: true });
});

describe('externaAoDisco', () => {
  it('identifica alvos que começam com // ou apontam para o github', () => {
    expect(externaAoDisco('//github.com/caminhar-deus/Caminhar')).toBe(true);
    expect(externaAoDisco('//exemplo.com/doc.md')).toBe(true);
    expect(externaAoDisco('https://github.com/vercel/next.js')).toBe(true);
  });

  it('identifica alvos do layout upstream de packages/', () => {
    expect(externaAoDisco('packages/next/src/server/route.ts')).toBe(true);
  });

  it('rejeita caminhos relativos ou arquivos do projeto', () => {
    expect(externaAoDisco('pages/api/posts.js')).toBe(false);
    expect(externaAoDisco('design-system/MASTER.md')).toBe(false);
    expect(externaAoDisco('components/UI/Input.module.css')).toBe(false);
  });
});

describe('criarResolvedor — inicialização', () => {
  it('lança erro caso raiz não seja informada', () => {
    expect(() => criarResolvedor({})).toThrow(/raiz.*obrigatória/i);
    expect(() => criarResolvedor({ raiz: '' })).toThrow(/raiz.*obrigatória/i);
  });

  it('instancia resolvedor com raízes padrão e desativa nextDist quando solicitado', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    expect(resolvedor).toBeDefined();
    expect(typeof resolvedor.ehArquivo).toBe('function');
    expect(resolvedor.caminhosNextDist()).toEqual([]);
  });
});

describe('criarResolvedor — resolução de arquivos e candidatos', () => {
  it('ehArquivo verifica corretamente a existência física', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    expect(resolvedor.ehArquivo('pages/api/posts.js')).toBe(true);
    expect(resolvedor.ehArquivo('pages/api')).toBe(false); // diretório
    expect(resolvedor.ehArquivo('pages/api/inexistente.js')).toBe(false);
  });

  it('sufixosPorNome encontra caminhos pelo basename indexado', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const master = resolvedor.sufixosPorNome('MASTER.md');
    expect(master).toContain(path.normalize('design-system/MASTER.md'));

    const inputCss = resolvedor.sufixosPorNome('Input.module.css');
    expect(inputCss).toContain(path.normalize('components/UI/Input.module.css'));

    expect(resolvedor.sufixosPorNome('arquivo-nao-indexado.xyz')).toEqual([]);
  });

  it('candidatosProjeto preserva todos os candidatos existentes sem truncar', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const { lista, diretos } = resolvedor.candidatosProjeto('posts.js');

    expect(diretos).toEqual(['posts.js', 'pages/api/posts.js']);
    // Deve incluir tanto pages/api/posts.js quanto pages/api/admin/posts.js e lib/domain/posts.js
    expect(lista).toContain(path.normalize('pages/api/posts.js'));
    expect(lista).toContain(path.normalize('pages/api/admin/posts.js'));
    expect(lista).toContain(path.normalize('lib/domain/posts.js'));
  });

  it('candidatosProjeto resolve caminhos com prefixos parciais', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const { lista } = resolvedor.candidatosProjeto('admin/posts.js');

    expect(lista).toContain(path.normalize('pages/api/admin/posts.js'));
  });
});

describe('criarResolvedor — leitura, linhas e memoização', () => {
  it('linhasDe conta as linhas do arquivo e tolera inexistentes com zero', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const linhas = resolvedor.linhasDe('pages/api/admin/posts.js');
    expect(linhas).toBe(5);

    expect(resolvedor.linhasDe('arquivo-inexistente.js')).toBe(0);

    // Segundo acesso testa retorno do cache memoizado
    expect(resolvedor.linhasDe('pages/api/admin/posts.js')).toBe(5);
  });

  it('conteudoDe lê o conteúdo como string e memoiza', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const conteudo = resolvedor.conteudoDe('design-system/MASTER.md');
    expect(conteudo).toContain('# Design System Master');

    expect(resolvedor.conteudoDe('nao-existe.txt')).toBeNull();

    // Cache hit
    expect(resolvedor.conteudoDe('design-system/MASTER.md')).toContain('# Design System Master');
  });
});

describe('criarResolvedor — padrões abreviados com reticências (...) e reserva', () => {
  it('padraoAbreviado cria regex apropriada para alvos com ... e escapa caracteres', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    expect(resolvedor.padraoAbreviado('pages/api/posts.js')).toBeNull();

    const reg = resolvedor.padraoAbreviado('docs/.../0010-...md');
    expect(reg).toBeInstanceOf(RegExp);
    expect(reg.test('docs/adr/0010-regras.md')).toBe(true);
    expect(reg.test('outra/pasta/0010-regras.md')).toBe(false);
  });

  it('resolverPorPadrao localiza arquivo existente no projeto por padrão', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const padrao = resolvedor.padraoAbreviado('docs/.../0010-...md');
    const achado = resolvedor.resolverPorPadrao(padrao);
    expect(achado).toBe(path.normalize('docs/adr/0010-regras.md'));
  });

  it('resolverReserva resolve via padrão abreviado caso contenha ...', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    const achados = resolvedor.resolverReserva('docs/.../0010-...md');
    expect(achados).toEqual([path.normalize('docs/adr/0010-regras.md')]);
  });
});

describe('criarResolvedor — extensões especiais (origemExternaPorExtensao)', () => {
  it('trata arquivos .mdx como de origem externa', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    expect(resolvedor.origemExternaPorExtensao('docs/guia.mdx')).toBe(true);
    expect(resolvedor.origemExternaPorExtensao('docs/guia.md')).toBe(false);
    expect(resolvedor.origemExternaPorExtensao('pages/api/posts.js')).toBe(false);
  });

  it('retorna falso para .ts quando sem correspondente em next/dist', () => {
    const resolvedor = criarResolvedor({ raiz: fixture, incluirNextDist: false });
    expect(resolvedor.origemExternaPorExtensao('server/route.ts')).toBe(false);
  });
});
