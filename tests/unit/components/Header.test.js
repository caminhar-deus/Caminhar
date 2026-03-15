import React from 'react';
import { jest, describe, it, expect } from '@jest/globals';
import { renderWithProviders } from '@helpers/render.js';

// Componente hipotético para demonstração.
// Em um caso real, você importaria seu componente existente.
// ex: import Header from '../../../components/Header';
const MockHeader = ({ title }) => (
  <header>
    <h1>{title}</h1>
    <nav>
      <a href="/">Início</a>
      <a href="/posts">Posts</a>
    </nav>
  </header>
);

describe('Componente Header', () => {
  it('deve renderizar sem erros (smoke test)', () => {
    // Apenas renderiza o componente. Se não houver erro, o teste passa.
    renderWithProviders(<MockHeader title="Caminhar com Deus" />);
  });

  it('deve corresponder ao snapshot', () => {
    // Renderiza o componente e compara sua estrutura com o snapshot salvo.
    const { container } = renderWithProviders(<MockHeader title="Caminhar com Deus" />);
    expect(container).toMatchSnapshot();
  });
});