import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import SEOHead from '../../../../components/SEO/Head.js';

// Mock do next/head para expor as meta tags no DOM do teste
jest.mock('next/head', () => {
  return function MockHead({ children }) {
    return <div data-testid="next-head">{children}</div>;
  };
});

// Mock do useRouter
const mockUseRouter = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter()
}));

// Mock das configurações de SEO
jest.mock('../../../../lib/seo/config', () => ({
  siteConfig: {
    url: 'https://caminhar.com',
    name: 'Caminhar',
    defaultImage: '/default-og.jpg',
    social: { twitter: '@caminhar_app' }
  }
}));

describe('Componente de SEO - Head', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({ asPath: '/pagina-teste' });
  });

  it('deve renderizar as meta tags básicas e canônicas padrão', () => {
    render(
      <SEOHead title="Início" description="Descrição da página" tags={['react', 'seo']} />
    );

    // Título concatenado com o nome do site
    expect(document.querySelector('title').textContent).toBe('Início | Caminhar');
    
    // Meta Description e Keywords
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Descrição da página');
    expect(document.querySelector('meta[name="keywords"]')).toHaveAttribute('content', 'react, seo');

    // Canonical e OG URL gerados a partir do asPath do Router
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://caminhar.com/pagina-teste');
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://caminhar.com/pagina-teste');

    // Robôs padrão (Index)
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', expect.stringContaining('index, follow'));
  });

  it('deve usar apenas a URL base se a rota for a raiz (/)', () => {
    mockUseRouter.mockReturnValueOnce({ asPath: '/' }); // Mock temporário para este teste
    
    render(<SEOHead title="Home" description="Desc" />);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://caminhar.com');
  });

  it('não deve concatenar o título se ele for igual ao nome do site', () => {
    render(<SEOHead title="Caminhar" description="Home" />);
    expect(document.querySelector('title').textContent).toBe('Caminhar');
  });

  it('deve utilizar URL canônica customizada se fornecida, ignorando query params no OG', () => {
    render(
      <SEOHead title="Teste" description="Desc" canonical="https://custom.com/page?utm=123" />
    );
    
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://custom.com/page?utm=123');
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://custom.com/page'); // Query removida no OG
  });

  it('deve processar caminhos de imagem relativos e URLs absolutas corretamente', () => {
    const { unmount } = render(<SEOHead title="T1" description="D1" image="/minha-imagem.jpg" />);
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://caminhar.com/minha-imagem.jpg');
    unmount();

    render(<SEOHead title="T2" description="D2" image="https://external.com/img.jpg" />);
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://external.com/img.jpg');
  });

  it('deve aplicar meta tags de noindex', () => {
    render(<SEOHead title="Privado" description="Não indexar" noindex={true} />);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  it('deve renderizar meta tags exclusivas de Artigo (Article)', () => {
    render(
      <SEOHead 
        title="Meu Artigo" 
        description="Desc" 
        type="article"
        publishedAt="2023-01-01T12:00:00Z"
        modifiedAt="2023-01-02T12:00:00Z"
        author="João"
        section="Tecnologia"
        tags={['Dev']}
      />
    );

    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    expect(document.querySelector('meta[property="article:published_time"]')).toHaveAttribute('content', '2023-01-01T12:00:00Z');
    expect(document.querySelector('meta[property="article:modified_time"]')).toHaveAttribute('content', '2023-01-02T12:00:00Z');
    expect(document.querySelector('meta[property="article:author"]')).toHaveAttribute('content', 'João');
    expect(document.querySelector('meta[property="article:section"]')).toHaveAttribute('content', 'Tecnologia');
    expect(document.querySelector('meta[property="article:tag"]')).toHaveAttribute('content', 'Dev');
    
    // Twitter Article Data
    expect(document.querySelector('meta[name="twitter:data1"]')).toHaveAttribute('content', 'João');
    
    // Formatação de data local do twitter
    const twitterDate = document.querySelector('meta[name="twitter:data2"]').getAttribute('content');
    expect(twitterDate).toMatch(/01\/01\/2023|1\/1\/2023/);
  });

  it('deve usar o siteName como author no twitter:data1 se author não for passado', () => {
    render(<SEOHead title="Artigo" description="Desc" type="article" />);
    expect(document.querySelector('meta[name="twitter:data1"]')).toHaveAttribute('content', 'Caminhar');
  });
});