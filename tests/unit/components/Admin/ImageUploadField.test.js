import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import ImageUploadField from '../../../../components/Admin/fields/ImageUploadField.js';

describe('ImageUploadField Component', () => {
  const originalFetch = global.fetch;
  const originalAlert = global.alert;

  beforeEach(() => {
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.alert = originalAlert;
  });

  it('deve renderizar corretamente e exibir preview quando tem valor', () => {
    render(<ImageUploadField name="image" label="Imagem" value="https://example.com/img.jpg" onChange={jest.fn()} required hint="Dica de imagem" />);
    
    expect(screen.getByLabelText(/Imagem/)).toBeInTheDocument();
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'https://example.com/img.jpg');
    expect(screen.getByText('Dica de imagem')).toBeInTheDocument();
  });

  it('deve exibir erro recebido via prop', () => {
    render(<ImageUploadField name="image" label="Imagem" value="" onChange={jest.fn()} error="Erro de imagem" hint="Dica" />);
    expect(screen.getByText('Erro de imagem')).toBeInTheDocument();
  });

  it('deve realizar upload padrão com fetch e atualizar valor com sucesso', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ path: '/uploads/new-img.jpg' })
    });

    const onChange = jest.fn();
    render(<ImageUploadField name="image" label="Imagem" value="" onChange={onChange} />);

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(screen.getByText('Enviando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({ name: 'image', value: '/uploads/new-img.jpg' })
      }));
    });
  });

  it('deve exibir erro nativo (alert) se upload padrão falhar', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Formato inválido' })
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ImageUploadField name="image" label="Imagem" value="" onChange={jest.fn()} />);

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Formato inválido');
    });

    consoleSpy.mockRestore();
  });

  it('deve usar handler customizado de upload (onUpload) e atualizar se retornar URL', async () => {
    const onUpload = jest.fn().mockResolvedValue('https://custom.com/upload.jpg');
    const onChange = jest.fn();
    
    render(<ImageUploadField name="image" label="Imagem" value="" onChange={onChange} onUpload={onUpload} />);
    
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { name: 'image', value: 'https://custom.com/upload.jpg' } }));
    });
  });

  it('deve ignorar a mudança se nenhum arquivo for selecionado (Line 39)', () => {
    const onChange = jest.fn();
    render(<ImageUploadField name="image" label="Imagem" value="" onChange={onChange} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [] } }); // Array vazio (Cancelar)
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('deve fazer fallback de erro silencioso se a API não retornar JSON (Line 72)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Unparsable')) // Simula falha no res.json()
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<ImageUploadField name="image" label="Imagem" value="" onChange={jest.fn()} />);
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File([''], 'a.png')] } });
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Erro 500: Falha no upload'));
    consoleSpy.mockRestore();
  });
});