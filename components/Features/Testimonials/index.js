import React, { useState, useEffect, useRef } from 'react';

const fallbackData = [
  {
    id: 1,
    name: 'Palavra do dia',
    content: 'Os artigos e reflexões mudaram a minha forma de ver as dificuldades do dia a dia. Encontrei muita paz e direcionamento nas mensagens.'
  },
  {
    id: 2,
    name: 'Oração do Dia',
    content: 'A curadoria de músicas e os vídeos recomendados têm sido fundamentais nos meus momentos de devocional e oração. Trabalho incrível!'
  },
  {
    id: 3,
    name: 'Anjos do Dia',
    content: 'Uso frequentemente os materiais do projeto para embasar os estudos com os jovens. É um conteúdo profundo e muito acessível.'
  }
];

export default function Testimonials() {
  const [dicas, setDicas] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const fetchDicas = async () => {
      try {
        const res = await fetch('/api/dicas');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setDicas(data); // Substitui os dados fixos pelos do Banco de Dados!
          }
        }
      } catch (error) {
        console.error('Erro ao buscar as dicas do dia:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDicas();
  }, []);

  // Verifica a posição da rolagem para mostrar/esconder as setas
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Mostra a seta da esquerda se não estiver no começo (com uma pequena margem de segurança)
      setCanScrollLeft(scrollLeft > 1);
      // Mostra a seta da direita se a posição atual + largura visível for menor que o total
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  };

  // Atualiza as setas caso a janela seja redimensionada ou as dicas mudem
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [dicas]);

  // Variável que checa se temos itens suficientes para habilitar o modo carrossel
  const hasCarousel = dicas.length > 3;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 340; // Movimento aproximado da largura do card + espaçamento
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section style={{ padding: '4rem 1rem', backgroundColor: '#f8fafc', borderRadius: '12px', margin: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Dicas do Dia</h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Pequenas porções de sabedoria, fé e oração para inspirar e fortalecer a sua jornada diária.
        </p>
      </div>

      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto' }}>
        {hasCarousel && canScrollLeft && (
          <button onClick={() => scroll('left')} className="nav-button left" aria-label="Anterior">
            ❮
          </button>
        )}

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className={`dicas-container ${hasCarousel ? 'carousel' : 'grid'}`}
        >
        {dicas.map((dica) => (
          <div 
            key={dica.id} 
            className="dica-card"
          >
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              "{dica.content}"
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '600', fontSize: '1rem' }}>
                  {dica.name}
                </h4>
              </div>
            </div>
          </div>
        ))}
        </div>

        {hasCarousel && canScrollRight && (
          <button onClick={() => scroll('right')} className="nav-button right" aria-label="Próxima">
            ❯
          </button>
        )}
      </div>

      <style jsx>{`
        .dicas-container {
          gap: 2rem;
          padding: 1rem 0; /* O padding evita que a sombra "vaze" nas laterais do overflow */
        }
        .dicas-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .dicas-container.carousel {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          scroll-behavior: smooth;
          -ms-overflow-style: none; /* Esconde a barra de rolagem no IE e Edge */
          scrollbar-width: none; /* Esconde a barra no Firefox */
        }
        .dicas-container.carousel::-webkit-scrollbar {
          display: none; /* Esconde a barra nativa do Chrome/Safari */
        }
        .dica-card {
          background-color: #ffffff;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .carousel .dica-card {
          flex: 0 0 auto;
          width: 320px;
        }
        .dica-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 20px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
        }
        .nav-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          color: #1e293b;
          font-size: 1.2rem;
          transition: background-color 0.2s, transform 0.2s;
        }
        .nav-button:hover {
          background: #f8fafc;
          transform: translateY(-50%) scale(1.1);
        }
        .nav-button.left { left: -20px; }
        .nav-button.right { right: -20px; }
        @media (max-width: 1240px) {
          .nav-button.left { left: 0px; }
          .nav-button.right { right: 0px; }
        }
      `}</style>
    </section>
  );
}