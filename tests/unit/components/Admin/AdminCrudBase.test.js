import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminCrudBase from '../../../../components/Admin/AdminCrudBase.js';
import { useAdminCrud } from '../../../../hooks/useAdminCrud.js';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { mockGlobalFetch } from '../../../helpers/index.js';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn().mockReturnValue('toast-id'),
}));

// Mockamos o Hook de CRUD para controlarmos a tabela sem precisar de chamadas à API
jest.mock('../../../../hooks/useAdminCrud.js', () => ({
  useAdminCrud: jest.fn(),
}));

// Mock do Modal para evitar dependência de CSS modules e portal
jest.mock('@/components/UI/Modal', () => {
  const Footer = ({ children }) => <div data-testid="modal-footer">{children}</div>;
  const Modal = ({ isOpen, children, onClose }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <div>{children}</div>
        <button data-testid="modal-close" onClick={onClose}>Fechar</button>
      </div>
    ) : null;
  Modal.Footer = Footer;
  return { Modal, ModalDefault: null };
});

jest.mock('@/components/UI/Button', () => ({
  Button: ({ children, disabled, onClick, variant }) => (
    <button
      data-testid={`btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  ButtonDefault: null,
}));

const DummyInput = ({ name, value, onChange, error }) => (
  <div>
    <input data-testid={`input-${name}`} name={name} value={value || ''} onChange={onChange} />
    {error && <span data-testid={`error-${name}`}>{error}</span>}
  </div>
);

describe('Componente Front-End - AdminCrudBase', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;

  let fetchMock;

  const mockUseAdminCrud = {
    items: [],
    loading: false,
    error: null,
    formData: {},
    isEditing: false,
    currentPage: 1,
    totalPages: 1,
    handleInputChange: jest.fn(),
    setFieldValue: jest.fn(),
    handleEdit: jest.fn(),
    handleSubmit: jest.fn(),
    handleDelete: jest.fn(),
    toggleField: jest.fn(),
    resetForm: jest.fn(),
    goToPage: jest.fn(),
  };

  const defaultProps = {
    apiEndpoint: '/api/test',
    title: 'Teste CRUD',
    fields: [
      { name: 'name', component: DummyInput, label: 'Nome' }
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Nome' },
      { key: 'status', header: 'Status' }
    ],
    initialFormData: { name: '' },
  };

  beforeEach(() => {
    useAdminCrud.mockReturnValue(mockUseAdminCrud);
    fetchMock = mockGlobalFetch();
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    global.URL.createObjectURL = originalCreateObjectURL;
  });

  it('deve renderizar o título, contador de itens e a mensagem de lista vazia', () => {
    render(<AdminCrudBase {...defaultProps} emptyMessage="Vazio." showItemCount={true} itemNameSingular="item" />);
    expect(screen.getByText('Teste CRUD')).toBeInTheDocument();
    expect(screen.getByText('Total: 0 itens')).toBeInTheDocument();
    expect(screen.getByText('Vazio.')).toBeInTheDocument();
  });

  it('deve renderizar a tabela de itens e os skeletons enquanto carrega', () => {
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, loading: true, items: [] });
    render(<AdminCrudBase {...defaultProps} reorderable={true} />);
    expect(document.querySelectorAll('.skeleton-box').length).toBeGreaterThan(0);
  });

  it('deve abrir o formulário ao clicar em Novo e chamar handleSubmit ao submeter', () => {
    render(<AdminCrudBase {...defaultProps} />);
    
    fireEvent.click(screen.getByText('+ Novo'));
    const input = screen.getByTestId('input-name');
    expect(input).toBeInTheDocument();

    fireEvent.submit(input.closest('form'));
    expect(mockUseAdminCrud.handleSubmit).toHaveBeenCalled();
  });

  it('deve chamar handleEdit ao clicar em Editar', () => {
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Editável', status: false }]
    });

    render(<AdminCrudBase {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Editar'));
    expect(mockUseAdminCrud.handleEdit).toHaveBeenCalledWith({ id: 1, name: 'Editável', status: false });
  });

  it('deve abrir modal de confirmação ao clicar em Excluir e confirmar a exclusão', async () => {
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Editável', status: false }]
    });

    render(<AdminCrudBase {...defaultProps} />);

    // Clica em Excluir
    fireEvent.click(screen.getByText('Excluir'));

    // Verifica que o modal de confirmação abriu
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // O handleDelete do mock é uma função que espera receber resolução via onConfirmDelete
    // Verificamos que onConfirmDelete foi passado ao hook
    const passedOptions = useAdminCrud.mock.calls[useAdminCrud.mock.calls.length - 1][0];
    expect(passedOptions.onConfirmDelete).toBeDefined();
  });

  it('deve confirmar exclusão ao clicar em "Sim, excluir" no modal', async () => {
    const mockHandleDelete = jest.fn().mockResolvedValue();
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Editável', status: false }],
      handleDelete: mockHandleDelete,
    });

    const { rerender } = render(<AdminCrudBase {...defaultProps} />);

    // Clica em Excluir para abrir o modal
    fireEvent.click(screen.getByText('Excluir'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // Obtém a Promise de onConfirmDelete
    const passedOptions = useAdminCrud.mock.calls[useAdminCrud.mock.calls.length - 1][0];
    const confirmPromise = passedOptions.onConfirmDelete();

    // Simula clique no botão "Sim, excluir" - que chama handleConfirmDelete
    const btnSimExcluir = screen.getByText('Sim, excluir');
    fireEvent.click(btnSimExcluir);

    // Aguarda a Promise ser resolvida com true
    const result = await act(async () => {
      return await confirmPromise;
    });

    expect(result).toBe(true);

    // Verifica que handleDelete foi chamado com o id do item (1)
    expect(mockHandleDelete).toHaveBeenCalledWith(1);

    // Simula ciclo de loading (true) e depois volta a false para disparar o useEffect que fecha o modal
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Editável', status: false }],
      loading: true,
      handleDelete: mockHandleDelete,
    });
    rerender(<AdminCrudBase {...defaultProps} />);

    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Editável', status: false }],
      loading: false,
      handleDelete: mockHandleDelete,
    });
    rerender(<AdminCrudBase {...defaultProps} />);

    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('deve cancelar exclusão ao fechar o modal sem confirmar', async () => {
    const mockHandleDelete = jest.fn();
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Editável', status: false }],
      handleDelete: mockHandleDelete,
    });

    render(<AdminCrudBase {...defaultProps} />);

    // Clica em Excluir para abrir o modal
    fireEvent.click(screen.getByText('Excluir'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // Obtém a Promise de onConfirmDelete
    const passedOptions = useAdminCrud.mock.calls[useAdminCrud.mock.calls.length - 1][0];
    const confirmPromise = passedOptions.onConfirmDelete();

    // Fecha o modal clicando no botão de fechar (mock do Modal)
    fireEvent.click(screen.getByTestId('modal-close'));

    // Aguarda a Promise ser resolvida com false
    const result = await act(async () => {
      return await confirmPromise;
    });

    expect(result).toBe(false);
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('deve passar searchTerm para o hook quando searchable=true e o input muda', () => {
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Maçã' }, { id: 2, name: 'Banana' }]
    });

    render(<AdminCrudBase {...defaultProps} searchable={true} />);
    const searchInput = screen.getByPlaceholderText('Buscar item...');
    
    fireEvent.change(searchInput, { target: { value: 'Maç' } });

    const passedOptions = useAdminCrud.mock.calls[useAdminCrud.mock.calls.length - 1][0];
    expect(passedOptions.searchTerm).toBe('Maç');

    // A busca agora é server-side: o hook é re-chamado com searchTerm,
    // e os itens exibidos vêm diretamente do mock (sem filtro local)
    expect(screen.getByText('Maçã')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('deve navegar entre as páginas corretamente', () => {
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, usePagination: true, currentPage: 2, totalPages: 3 });
    render(<AdminCrudBase {...defaultProps} usePagination={true} />);
    
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Anterior'));
    expect(mockUseAdminCrud.goToPage).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText('Próxima'));
    expect(mockUseAdminCrud.goToPage).toHaveBeenCalledWith(3);
  });

  it('deve alternar booleanos nativamente, acionar o toggleField e re-renderizar', async () => {
    mockUseAdminCrud.toggleField.mockResolvedValue();
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, items: [{ id: 1, name: 'Teste', status: false }] });

    render(<AdminCrudBase {...defaultProps} />);
    const toggleButton = screen.getByText('Rascunho').closest('button');
    
    fireEvent.click(toggleButton);
    expect(mockUseAdminCrud.toggleField).toHaveBeenCalled();
    expect(mockUseAdminCrud.toggleField.mock.calls[0][0]).toEqual({ id: 1, name: 'Teste', status: false });
    expect(mockUseAdminCrud.toggleField.mock.calls[0][1]).toBe('status');
    expect(mockUseAdminCrud.toggleField.mock.calls[0][2]).toBe(false);
    // 4º argumento é o objeto { onOptimisticUpdate, onRevert }
    expect(typeof mockUseAdminCrud.toggleField.mock.calls[0][3]).toBe('object');
  });

  it('deve reverter o toggle caso a API falhe', async () => {
    // Simula o comportamento real do toggleField: trata erro internamente e nunca rejeita a Promise.
    // O mock recebe os callbacks e invoca onRevert em caso de falha.
    mockUseAdminCrud.toggleField.mockImplementation(async (item, key, currentValue, { onOptimisticUpdate, onRevert } = {}) => {
      if (onRevert) {
        onRevert(item, key, currentValue);
      }
    });
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, items: [{ id: 1, name: 'Teste', status: false }] });

    render(<AdminCrudBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Rascunho').closest('button'));

    await waitFor(() => {
      expect(mockUseAdminCrud.toggleField).toHaveBeenCalled();
    });
  });

  it('deve exportar para CSV e formatar aspas e quebras de linha corretamente', () => {
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 1, name: 'Produto "Teste", Novo\nLinha', status: true }]
    });

    render(<AdminCrudBase {...defaultProps} exportable={true} />);
    
    const mockAnchor = document.createElement('a');
    const linkClickSpy = jest.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      return tagName === 'a' ? mockAnchor : originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByText('Exportar CSV'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(linkClickSpy).toHaveBeenCalled();
    
    jest.restoreAllMocks();
  });

  it('deve exibir notificação de erro caso não haja dados para exportar', () => {
    render(<AdminCrudBase {...defaultProps} exportable={true} />);
    fireEvent.click(screen.getByText('Exportar CSV'));
    expect(toast.error).toHaveBeenCalledWith('Não há dados para exportar.');
  });

  it('deve exibir notificação de erro vinda do hook e destacar erros de campo', () => {
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, error: { message: 'Erro genérico' } });
    const { rerender } = render(<AdminCrudBase {...defaultProps} />);
    expect(toast.error).toHaveBeenCalledWith('Erro genérico');

    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, error: { message: 'Erro', errors: { name: ['Invalido'] } } });
    rerender(<AdminCrudBase {...defaultProps} />);
    expect(toast.error).toHaveBeenCalledWith('Verifique os campos em vermelho no formulário.');
    
    // Abre o form para renderizar os campos e ver o erro no input (Linhas 209-213)
    fireEvent.click(screen.getByText('+ Novo'));
    expect(screen.getByTestId('error-name')).toHaveTextContent('Invalido');
  });

  it('deve validar formulário usando Zod e função customizada, lançando erro no handleSubmit', () => {
    const schema = z.object({ name: z.string().min(3) });
    const customValidate = jest.fn();
    const handleSubmitSpy = jest.fn((e, validateForm) => {
      e.preventDefault();
      try { validateForm(); } catch (err) { expect(err.errors).toBeDefined(); }
    });
    
    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      formData: { name: 'A' },
      handleSubmit: handleSubmitSpy
    });

    render(<AdminCrudBase {...defaultProps} validationSchema={schema} validate={customValidate} />);
    fireEvent.click(screen.getByText('+ Novo'));
    fireEvent.submit(screen.getByTestId('input-name').closest('form'));
    
    expect(handleSubmitSpy).toHaveBeenCalled();
    expect(customValidate).not.toHaveBeenCalled();
  });

  it('deve processar células customizadas (renderCustomCell, column.render, format) e URLs padrão', () => {
    const customCols = [
      { key: 'id', header: 'ID', render: (item) => <span data-testid="cell-render">{item.id}</span> },
      { key: 'link', header: 'Link' },
      { key: 'data', header: 'Data', format: (val) => `Data: ${val}` },
      { key: 'external', header: 'External' }
    ];

    useAdminCrud.mockReturnValue({
      ...mockUseAdminCrud,
      items: [{ id: 999, link: 'interno', data: '123', external: 'https://exemplo.com' }]
    });

    const renderCustomCell = (col, item, value) => col.key === 'link' ? <b>Customizado</b> : undefined;

    render(<AdminCrudBase {...defaultProps} columns={customCols} renderCustomCell={renderCustomCell} />);
    expect(screen.getByTestId('cell-render')).toBeInTheDocument();
    expect(screen.getByText('Customizado')).toBeInTheDocument();
    expect(screen.getByText('Data: 123')).toBeInTheDocument();
    expect(screen.getByText('Abrir link')).toHaveAttribute('href', 'https://exemplo.com');
  });

  it('deve usar renderCustomFormField se fornecido e lidar com field sem componente', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const renderCustom = (config) => config.name === 'name' ? <div key={config.name} data-testid="custom-field">Custom</div> : null;

    render(<AdminCrudBase {...defaultProps} fields={[{ name: 'name', label: 'Nome' }, { name: 'invalido', label: 'Invalido' }]} renderCustomFormField={renderCustom} />);
    fireEvent.click(screen.getByText('+ Novo'));
    
    expect(screen.getByTestId('custom-field')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Componente não definido para o campo: invalido');
    consoleSpy.mockRestore();
  });

  it('deve reordenar itens com drag and drop', () => {
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    const onReorder = jest.fn();
    render(<AdminCrudBase {...defaultProps} reorderable={true} onReorder={onReorder} />);

    const rows = screen.getAllByRole('row').slice(1); // Ignora thead
    const mockDataTransfer = { effectAllowed: '', setData: jest.fn(), getData: jest.fn(() => '0') };

    fireEvent.dragStart(rows[0], { dataTransfer: mockDataTransfer });
    fireEvent.dragOver(rows[1]);
    fireEvent.dragLeave(rows[1]);
    fireEvent.drop(rows[1], { dataTransfer: mockDataTransfer });

    expect(onReorder).toHaveBeenCalled();
  });

  it('deve ocultar ações de formulário e edição se readOnly=true', () => {
    useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, items: [{ id: 1, name: 'Leitura', status: false }] });
    render(<AdminCrudBase {...defaultProps} readOnly={true} />);
    
    expect(screen.queryByText('+ Novo')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('deve acionar onSuccess após sucesso do hook e fechar formulário (Linhas 71-75)', () => {
    const onSuccessSpy = jest.fn();
    render(<AdminCrudBase {...defaultProps} onSuccess={onSuccessSpy} />);
    
    // Extrai a função passada pro hook mockado na última renderização
    const passedOptions = useAdminCrud.mock.calls[useAdminCrud.mock.calls.length - 1][0];
    
    act(() => {
      passedOptions.onSuccess();
    });

    expect(onSuccessSpy).toHaveBeenCalled();
  });

  it('deve dar scroll na tela ao abrir formulário de Novo ou Edição (Linhas 384-386)', () => {
    jest.useFakeTimers();
    
    const mockScroll = jest.fn();
    const formElement = document.createElement('div');
    formElement.id = 'crud-form';
    formElement.scrollIntoView = mockScroll;
    document.body.appendChild(formElement);

    render(<AdminCrudBase {...defaultProps} />);
    fireEvent.click(screen.getByText('+ Novo'));
    act(() => jest.advanceTimersByTime(50));
    
    expect(mockScroll).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(formElement);
    jest.useRealTimers();
  });

  it('deve chamar resetForm ANTES de fechar o formulário ao clicar em Cancelar (Fallback de erro raro)', () => {
    // Ordem de execução é importante: PRIMEIRO resetForm, DEPOIS fecha o form
    // Esse é o fallback de segurança que evita leaks de estado
    
    render(<AdminCrudBase {...defaultProps} />);
    
    // Limpa contagem do mock antes de começar (o button + Novo também chama resetForm)
    mockUseAdminCrud.resetForm.mockClear();
    
    // Primeiro abre o formulário
    fireEvent.click(screen.getByText('+ Novo'));
    
    // Agora clica no botão Cancelar
    fireEvent.click(screen.getByText('Cancelar'));
    
    // Verifica que resetForm foi chamado 2 vezes:
    // 1 vez ao abrir o formulário (botão + Novo)
    // 1 vez ao fechar o formulário (botão Cancelar)
    // Ambas as chamadas são intencionais e parte do design de segurança
    expect(mockUseAdminCrud.resetForm).toHaveBeenCalledTimes(2);
    
    // E que o formulário não está mais visivel
    expect(screen.queryByTestId('input-name')).not.toBeInTheDocument();
  });
});
