import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Select from '../../../../components/UI/Select.js';

describe('Componente UI - Select', () => {
  const options = [
    { value: '1', label: 'Opção 1' },
    { value: '2', label: 'Opção 2', disabled: true },
  ];

  it('deve renderizar o select com label, placeholder e opções', () => {
    const ref = createRef();
    render(<Select ref={ref} label="Escolha" options={options} placeholder="Selecione" id="sel1" required />);
    
    expect(screen.getByLabelText(/Escolha/)).toBeInTheDocument();
    expect(screen.getByText('Selecione')).toBeInTheDocument();
    expect(screen.getByText('Opção 1')).toBeInTheDocument();
    expect(screen.getByText('Opção 2')).toBeDisabled();
    expect(ref.current.id).toBe('sel1');
  });

  it('deve disparar evento onChange ao mudar valor', () => {
    const onChange = jest.fn();
    render(<Select options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('deve exibir mensagem de erro e esconder helperText', () => {
    const { rerender } = render(<Select helperText="Ajuda" />);
    rerender(<Select error errorMessage="Erro aqui" helperText="Ajuda" />);
    expect(screen.queryByText('Ajuda')).not.toBeInTheDocument();
    expect(screen.getByText('Erro aqui')).toBeInTheDocument();
  });

  describe('modo custom', () => {
    it('deve abrir o dropdown ao clicar no combobox e fechar ao clicar fora', () => {
      render(<Select options={options} searchable />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(2);

      // Clique fora do wrapper fecha o dropdown (handleClickOutside)
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('deve abrir e fechar o dropdown com teclado (Enter/Escape)', () => {
      render(<Select options={options} searchable />);
      const combobox = screen.getByRole('combobox');

      fireEvent.keyDown(combobox, { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(combobox, { key: 'Enter' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      fireEvent.keyDown(combobox, { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(combobox, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('deve exibir o input de busca apenas com o dropdown aberto no modo searchable', () => {
      render(<Select options={options} searchable />);

      expect(screen.queryByPlaceholderText('Selecione...')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Selecione...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveFocus();

      // Click no input não propaga para o combobox (stopPropagation): mantém o dropdown aberto
      fireEvent.click(searchInput);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('não deve abrir o dropdown quando disabled está ativo', () => {
      render(<Select options={options} searchable disabled />);

      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('deve selecionar uma opção, fechar o dropdown e disparar onChange', () => {
      const onChange = jest.fn();
      render(<Select options={options} searchable onChange={onChange} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Opção 1'));

      expect(onChange).toHaveBeenCalledWith({ target: { value: '1' } });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      // O label selecionado passa a ser exibido no lugar do placeholder
      expect(screen.getByText('Opção 1')).toBeInTheDocument();
    });

    it('deve ignorar cliques em opções desabilitadas', () => {
      const onChange = jest.fn();
      render(<Select options={options} searchable onChange={onChange} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Opção 2'));

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('busca com debounce', () => {
    it('deve filtrar as opções pela busca após 300ms', () => {
      jest.useFakeTimers();
      try {
        render(<Select options={options} searchable />);
        fireEvent.click(screen.getByRole('combobox'));

        fireEvent.change(screen.getByPlaceholderText('Selecione...'), { target: { value: 'OPÇÃO 1' } });
        // Antes do debounce, a lista permanece completa
        expect(screen.getAllByRole('option')).toHaveLength(2);

        act(() => { jest.advanceTimersByTime(300); });
        expect(screen.getAllByRole('option')).toHaveLength(1);
        expect(screen.getByText('Opção 1')).toBeInTheDocument();
        expect(screen.queryByText('Opção 2')).not.toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    it('deve exibir mensagem quando a busca não encontrar resultados', () => {
      jest.useFakeTimers();
      try {
        render(<Select options={options} searchable />);
        fireEvent.click(screen.getByRole('combobox'));

        fireEvent.change(screen.getByPlaceholderText('Selecione...'), { target: { value: 'inexistente' } });
        act(() => { jest.advanceTimersByTime(300); });

        expect(screen.getByText('Nenhuma opção encontrada')).toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    it('deve cancelar o debounce pendente ao fechar o dropdown antes de 300ms', () => {
      jest.useFakeTimers();
      try {
        render(<Select options={options} searchable />);
        fireEvent.click(screen.getByRole('combobox'));

        fireEvent.change(screen.getByPlaceholderText('Selecione...'), { target: { value: 'OPÇÃO 1' } });
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

        act(() => { jest.advanceTimersByTime(300); });

        // Reabrir o dropdown mantém todas as opções: o termo não foi aplicado
        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.getAllByRole('option')).toHaveLength(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('limpar seleção e valor controlado', () => {
    it('deve limpar a seleção chamando onChange e onClear', () => {
      const onChange = jest.fn();
      const onClear = jest.fn();
      render(<Select options={options} clearable value="1" onChange={onChange} onClear={onClear} />);

      expect(screen.getByText('Opção 1')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));

      expect(onChange).toHaveBeenCalledWith({ target: { value: '' } });
      expect(onClear).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Limpar seleção' })).not.toBeInTheDocument();
    });

    it('deve ocultar o botão de limpar quando não há seleção', () => {
      render(<Select options={options} clearable />);
      expect(screen.queryByRole('button', { name: 'Limpar seleção' })).not.toBeInTheDocument();
    });

    it('deve atualizar o label quando value controlado muda', () => {
      const { rerender } = render(<Select options={options} searchable value="1" />);
      expect(screen.getByText('Opção 1')).toBeInTheDocument();

      rerender(<Select options={options} searchable value="2" />);
      expect(screen.getByText('Opção 2')).toBeInTheDocument();
    });

    it('deve usar defaultValue quando não controlado e destacar a opção corrente', () => {
      render(<Select options={options} searchable defaultValue="1" />);

      fireEvent.click(screen.getByRole('combobox'));
      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Opção 1');
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });

    it('deve associar o label ao combobox via id', () => {
      render(<Select options={options} searchable label="Escolha" id="custom-select" />);

      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'custom-select');
      expect(screen.getByText('Escolha').tagName).toBe('LABEL');
      expect(screen.getByText('Escolha')).toHaveAttribute('for', 'custom-select');
    });
  });

  describe('modo nativo', () => {
    it('deve desabilitar o select quando disabled está ativo', () => {
      render(<Select options={options} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('deve lidar com foco e perda de foco', () => {
      render(<Select options={options} />);
      const select = screen.getByRole('combobox');

      act(() => { select.focus(); });
      expect(select).toHaveFocus();

      act(() => { select.blur(); });
      expect(select).not.toHaveFocus();
    });

    it('deve expor aria-invalid e aria-describedby conforme erro/helper', () => {
      const { rerender } = render(<Select options={options} helperText="Ajuda" />);
      const select = screen.getByRole('combobox');

      expect(select).toHaveAttribute('aria-invalid', 'false');
      expect(select.getAttribute('aria-describedby')).toContain('-helper');

      rerender(<Select options={options} error errorMessage="Erro aqui" />);
      const selectWithError = screen.getByRole('combobox');
      expect(selectWithError).toHaveAttribute('aria-invalid', 'true');
      expect(selectWithError.getAttribute('aria-describedby')).toContain('-error');
      expect(screen.getByRole('alert')).toHaveTextContent('Erro aqui');
    });
  });
});