import { jest, describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { proxy as middleware } from './proxy.js';
import { NextResponse } from 'next/server';

// Mock do NextResponse do Next.js
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ status: 200, type: 'next' })),
    json: jest.fn((body, init) => ({ 
      status: init?.status || 200, 
      body,
      type: 'json'
    })),
  },
}));

// Mock do Redis para garantir que o teste use o fallback de memória (Map)
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

describe('Middleware Rate Limit', () => {
  let originalEnv;

  beforeAll(() => {
    // Salva as variáveis de ambiente originais
    originalEnv = process.env;
    
    // Garante que não estamos usando Redis no teste (limpa variáveis do Upstash)
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // Silencia console.warn durante os testes para não poluir o terminal
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restaura ambiente original
    process.env = originalEnv;
    console.warn.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve permitir requisições dentro do limite (5 tentativas)', async () => {
    const req = {
      ip: '192.168.1.100', // IP único para este teste
      headers: { get: () => 'jest-agent' },
      nextUrl: { pathname: '/api/auth/login' }
    };

    for (let i = 0; i < 5; i++) {
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      NextResponse.next.mockClear();
    }
  });

  it('deve bloquear a 6ª requisição (Rate Limit excedido)', async () => {
    const req = {
      ip: '192.168.1.101', // IP diferente para não conflitar com o teste anterior
      headers: { get: () => 'jest-agent' },
      nextUrl: { pathname: '/api/auth/login' }
    };

    // Consome as 5 tentativas permitidas
    for (let i = 0; i < 5; i++) {
      await middleware(req);
    }

    // 6ª tentativa deve ser bloqueada
    await middleware(req);

    // Verifica se retornou status 429 (Too Many Requests)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ 
        message: expect.stringMatching(/Muitas tentativas de login/) 
      }),
      { status: 429 }
    );
  });

  it('deve permitir requisições ilimitadas para IPs na Whitelist (Env Var)', async () => {
    // Define IP na whitelist via variável de ambiente
    process.env.ADMIN_IP_WHITELIST = '10.0.0.50';

    const req = {
      ip: '10.0.0.50',
      headers: { get: () => 'jest-agent' },
      nextUrl: { pathname: '/api/auth/login' }
    };

    // Tenta exceder o limite (10 tentativas > 5 permitidas)
    for (let i = 0; i < 10; i++) {
      await middleware(req);
    }

    // Verifica se nunca foi bloqueado (NextResponse.next chamado 10 vezes)
    expect(NextResponse.next).toHaveBeenCalledTimes(10);
    expect(NextResponse.json).not.toHaveBeenCalled();

    // Limpeza
    delete process.env.ADMIN_IP_WHITELIST;
  });
});
