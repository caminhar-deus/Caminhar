import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Grid from '../../../../components/Layout/Grid.js';

describe('Layout - Grid', () => {
  it('deve renderizar Grid base repassando gap, align e justify', () => {
    const { container } = render(<Grid columns={4} gap="lg" align="center" justify="between">Item</Grid>);
    expect(container.firstChild).toHaveTextContent('Item');
  });

  it('Grid.Item deve renderizar com spans e posições customizadas', () => {
    const { container } = render(<Grid.Item colSpan={2} colStart={1} rowSpan={3}>Item</Grid.Item>);
    expect(container.firstChild).toHaveTextContent('Item');
  });

  it('Grid.Auto deve renderizar com css variable min-width injetada via estilo', () => {
    const { container } = render(<Grid.Auto minWidth="300px" gap="sm">Item</Grid.Auto>);
    expect(container.firstChild).toHaveStyle('--min-width: 300px');
  });

  it('Grid.Responsive deve renderizar com variáveis css para breakpoints definidos', () => {
    const { container } = render(
      <Grid.Responsive columns={{ default: 1, md: 2, xl: 4 }} gap="xs">
        Item
      </Grid.Responsive>
    );
    expect(container.firstChild).toHaveStyle('--cols-default: 1');
    expect(container.firstChild).toHaveStyle('--cols-md: 2');
    expect(container.firstChild).toHaveStyle('--cols-xl: 4');
  });

  it('Grid.Responsive deve usar o fallback 1 para propriedades não informadas', () => {
    const { container } = render(<Grid.Responsive columns={{}}>Item</Grid.Responsive>);
    // Pela cascata do fallback de JS, ele assumirá 1 para todos caso o default seja omitido
    expect(container.firstChild).toHaveStyle('--cols-default: 1');
  });
});