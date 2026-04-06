import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Stack from '../../../../components/Layout/Stack.js';

describe('Layout - Stack', () => {
  it('deve renderizar Stack direcional horizontal repassando props de formatação', () => {
    const { container } = render(
      <Stack direction="row" spacing="lg" align="center" justify="between" wrap inline>Item 1</Stack>
    );
    expect(container.firstChild).toHaveTextContent('Item 1');
  });

  it('deve renderizar Stack direcional vertical padrão', () => {
    const { container } = render(<Stack direction="vertical">Item</Stack>);
    expect(container.firstChild).toHaveTextContent('Item');
  });

  it('deve renderizar subcomponentes Item e Divider', () => {
    const { container } = render(
      <Stack>
        <Stack.Item grow shrink align="end">Item</Stack.Item>
        <Stack.Divider />
      </Stack>
    );
    expect(container.querySelector('[role="separator"]')).toBeInTheDocument();
  });

  it('deve renderizar os wrappers diretos HStack e VStack', () => {
    expect(render(<Stack.VStack>V</Stack.VStack>).container.firstChild).toHaveTextContent('V');
    expect(render(<Stack.HStack>H</Stack.HStack>).container.firstChild).toHaveTextContent('H');
  });
});