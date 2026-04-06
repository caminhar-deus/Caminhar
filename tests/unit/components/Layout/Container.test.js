import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Container from '../../../../components/Layout/Container.js';

describe('Layout - Container', () => {
  it('deve renderizar Container padrão (div) e aplicar as propriedades corretas', () => {
    const { container } = render(<Container>Conteudo</Container>);
    expect(container.firstChild).toHaveTextContent('Conteudo');
    expect(container.firstChild.tagName).toBe('DIV');
  });

  it('deve renderizar com props customizadas (fluid, as, className, centered=false)', () => {
    const { container } = render(
      <Container fluid={true} as="main" className="custom-class" centered={false}>Conteudo</Container>
    );
    expect(container.firstChild.tagName).toBe('MAIN');
  });

  it('Container.Section deve renderizar uma <section>', () => {
    const { container } = render(<Container.Section>Sec</Container.Section>);
    expect(container.firstChild.tagName).toBe('SECTION');
  });

  it('Container.Article deve renderizar um <article>', () => {
    const { container } = render(<Container.Article>Art</Container.Article>);
    expect(container.firstChild.tagName).toBe('ARTICLE');
  });
});