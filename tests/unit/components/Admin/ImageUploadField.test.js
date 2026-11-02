import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import ImageUploadField from '../../../../components/Admin/fields/ImageUploadField.js';
import CrudForm from '../../../../components/Admin/CrudForm.js';
import { mockGlobalFetch } from '../../../helpers/index.js';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
}));

describe('ImageUploadField Component', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
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
      expect(toast.error).toHaveBeenCalledWith('Formato inválido');
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
      expect(onUpload).toHaveBeenCalledWith(file, 'post');
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
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro 500: Falha no upload'));
    consoleSpy.mockRestore();
  });

  it('multiple: deve anexar o upload em nova linha preservando as URLs existentes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ path: '/uploads/new-img.jpg' })
    });

    const onChange = jest.fn();
    render(<ImageUploadField name="image_url" label="Imagens" value={'https://a.jpg\nhttps://b.jpg'} onChange={onChange} multiple />);

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File([''], 'a.png', { type: 'image/png' })] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        target: { name: 'image_url', value: 'https://a.jpg\nhttps://b.jpg\n/uploads/new-img.jpg' }
      });
    });
  });

  it('multiple: deve renderizar um preview por imagem e remover pela linha correspondente', () => {
    const onChange = jest.fn();
    render(<ImageUploadField name="image_url" label="Imagens" value={'https://a.jpg\nhttps://b.jpg'} onChange={onChange} multiple />);

    expect(screen.getByAltText('Preview 1')).toHaveAttribute('src', 'https://a.jpg');
    expect(screen.getByAltText('Preview 2')).toHaveAttribute('src', 'https://b.jpg');

    fireEvent.click(screen.getByLabelText('Remover imagem 2'));

    expect(onChange).toHaveBeenCalledWith({ target: { name: 'image_url', value: 'https://a.jpg' } });
  });

  it('multiple: deve deduplicar quando a mesma URL é enviada de novo', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ path: '/uploads/dup.jpg' })
    });

    const onChange = jest.fn();
    render(<ImageUploadField name="image_url" label="Imagens" value="/uploads/dup.jpg" onChange={onChange} multiple />);

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File([''], 'a.png', { type: 'image/png' })] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ target: { name: 'image_url', value: '/uploads/dup.jpg' } });
    });
  });

  it('deve normalizar value null para string vazia no modo simples sem avisos no console e limpar o DOM ao alternar para null', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const onChange = jest.fn();
      const { rerender } = render(
        <ImageUploadField name="thumbnail" label="Thumbnail" value={null} onChange={onChange} />
      );

      const input = screen.getByLabelText('Thumbnail');
      expect(input).toHaveValue('');
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      rerender(
        <ImageUploadField name="thumbnail" label="Thumbnail" value="https://example.com/capa.jpg" onChange={onChange} />
      );
      expect(input).toHaveValue('https://example.com/capa.jpg');
      expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'https://example.com/capa.jpg');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      rerender(
        <ImageUploadField name="thumbnail" label="Thumbnail" value={null} onChange={onChange} />
      );
      expect(input).toHaveValue('');
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('multiple: deve normalizar value null no textarea, permitir upload e limpar o DOM ao voltar para null sem avisos no console', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ path: '/uploads/primeira.jpg' })
      });

      const onChange = jest.fn();
      const { rerender } = render(
        <ImageUploadField name="image_url" label="Imagens" value={null} onChange={onChange} multiple />
      );

      const textarea = screen.getByLabelText('Imagens');
      expect(textarea).toHaveValue('');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      fireEvent.change(document.querySelector('input[type="file"]'), {
        target: { files: [new File([''], 'a.png', { type: 'image/png' })] }
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          target: { name: 'image_url', value: '/uploads/primeira.jpg' }
        });
      });

      rerender(
        <ImageUploadField name="image_url" label="Imagens" value={'https://a.jpg\nhttps://b.jpg'} onChange={onChange} multiple />
      );
      expect(textarea).toHaveValue('https://a.jpg\nhttps://b.jpg');

      rerender(
        <ImageUploadField name="image_url" label="Imagens" value={null} onChange={onChange} multiple />
      );
      expect(textarea).toHaveValue('');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('integração CrudForm: não deve emitir aviso ao iniciar com thumbnail null nem reter valor fantasma ao trocar edição para item com null', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fields = [
        {
          name: 'thumbnail',
          component: ImageUploadField,
          label: 'Thumbnail Customizada (Opcional)',
          uploadType: 'video'
        }
      ];
      const baseProps = {
        fields,
        handleInputChange: jest.fn(),
        setFieldValue: jest.fn(),
        error: null,
        loading: false,
        isEditing: false,
        updateButtonText: 'Atualizar',
        saveButtonText: 'Salvar',
        handleSubmit: jest.fn(),
        validateForm: jest.fn()
      };

      const { rerender } = render(
        <CrudForm {...baseProps} formData={{ thumbnail: null }} />
      );

      const input = screen.getByLabelText('Thumbnail Customizada (Opcional)');
      expect(input).toHaveValue('');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      rerender(
        <CrudForm {...baseProps} isEditing formData={{ thumbnail: 'https://cdn.site/video-a.jpg' }} />
      );
      expect(input).toHaveValue('https://cdn.site/video-a.jpg');

      rerender(
        <CrudForm {...baseProps} isEditing formData={{ thumbnail: null }} />
      );
      expect(input).toHaveValue('');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
