import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import UrlField from '../../../../components/Admin/fields/UrlField.js';

describe('UrlField Component', () => {
  it('deve renderizar corretamente o campo genérico', () => {
    const onChange = jest.fn();
    render(<UrlField name="link" label="Link Genérico" value="" onChange={onChange} required />);
    
    expect(screen.getByLabelText(/Link Genérico/)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('deve validar URL obrigatória e exibir erro', () => {
    const onChange = jest.fn();
    // Inicia com um valor válido para que a simulação de mudança para '' dispare o evento no React
    render(<UrlField name="link" label="Link" value="https://exemplo.com" onChange={onChange} required />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    
    expect(screen.getByText('URL é obrigatória')).toBeInTheDocument();
  });

  it('deve validar formato de URL genérica', () => {
    const onChange = jest.fn();
    render(<UrlField name="link" label="Link" value="" onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'nao-e-uma-url' } });
    
    expect(screen.getByText('URL inválida')).toBeInTheDocument();
  });

  it('deve validar formato e extrair ID do YouTube e mostrar preview', () => {
    const onChange = jest.fn();
    const { rerender } = render(<UrlField name="link" label="Link" value="" onChange={onChange} platform="youtube" showPreview />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://youtube.com/invalid' } });
    expect(screen.getByText(/URL do YouTube inválida/)).toBeInTheDocument();

    rerender(<UrlField name="link" label="Link" value="https://www.youtube.com/watch?v=dQw4w9WgXcQ" onChange={onChange} platform="youtube" showPreview />);
    expect(screen.getByTitle('Preview do vídeo')).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0');
  });

  it('deve validar formato e extrair ID do Spotify e mostrar preview', () => {
    const onChange = jest.fn();
    const { rerender } = render(<UrlField name="link" label="Link" value="" onChange={onChange} platform="spotify" showPreview />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://spotify.com/invalid' } });
    expect(screen.getByText(/URL do Spotify inválida/)).toBeInTheDocument();

    rerender(<UrlField name="link" label="Link" value="https://open.spotify.com/track/123456" onChange={onChange} platform="spotify" showPreview />);
    expect(screen.getByTestId('embed-iframe')).toHaveAttribute('src', 'https://open.spotify.com/embed/track/123456?utm_source=generator&theme=0');
  });

  it('deve aceitar função de validação customizada', () => {
    const onChange = jest.fn();
    const customValidate = jest.fn(() => 'Erro customizado');
    
    render(<UrlField name="link" label="Link" value="" onChange={onChange} validate={customValidate} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    
    expect(customValidate).toHaveBeenCalledWith('https://example.com');
    expect(screen.getByText('Erro customizado')).toBeInTheDocument();
  });

  it('deve exibir hint se não houver erro', () => {
    const onChange = jest.fn();
    render(<UrlField name="link" label="Link" value="" onChange={onChange} hint="Dica de URL" />);
    
    expect(screen.getByText('Dica de URL')).toBeInTheDocument();
  });

  it('deve retornar null no preview se a plataforma for generic (Lines 126-127)', () => {
    const { container } = render(<UrlField name="link" label="Link" value="https://site.com" onChange={jest.fn()} platform="generic" showPreview />);
    // Não deve renderizar nenhum iframe de preview
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('deve validar corretamente exceção no construtor de URL (Lines 70-71)', () => {
    // Algumas strings incompletas não caem no if inicial, mas quebram no "new URL()"
    const onChange = jest.fn();
    render(<UrlField name="link" label="Link" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'http://' } }); 
    expect(screen.getByText('URL inválida')).toBeInTheDocument();
  });
});