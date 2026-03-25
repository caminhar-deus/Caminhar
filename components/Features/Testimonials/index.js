import React from 'react';

const testimonialsData = [
  {
    id: 1,
    name: 'Maria Silva',
    role: 'Membro da Comunidade',
    content: 'Os artigos e reflexões mudaram a minha forma de ver as dificuldades do dia a dia. Encontrei muita paz e direcionamento nas mensagens.',
    avatar: 'https://ui-avatars.com/api/?name=Maria+Silva&background=0D8ABC&color=fff'
  },
  {
    id: 2,
    name: 'João Pedro',
    role: 'Leitor Assíduo',
    content: 'A curadoria de músicas e os vídeos recomendados têm sido fundamentais nos meus momentos de devocional e oração. Trabalho incrível!',
    avatar: 'https://ui-avatars.com/api/?name=Joao+Pedro&background=4CAF50&color=fff'
  },
  {
    id: 3,
    name: 'Ana Costa',
    role: 'Líder de Jovens',
    content: 'Uso frequentemente os materiais do projeto para embasar os estudos com os jovens. É um conteúdo profundo e muito acessível.',
    avatar: 'https://ui-avatars.com/api/?name=Ana+Costa&background=E91E63&color=fff'
  }
];

export default function Testimonials() {
  return (
    <section style={{ padding: '4rem 1rem', backgroundColor: '#f8fafc', borderRadius: '12px', margin: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Dicas do Dia</h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Testemunhos reais de pessoas que têm sido abençoadas e edificadas pelos conteúdos do projeto.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {testimonialsData.map((testimonial) => (
          <div 
            key={testimonial.id} 
            style={{ 
              backgroundColor: '#ffffff', 
              padding: '2rem', 
              borderRadius: '12px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '1.5rem' }}>
              "{testimonial.content}"
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
              <img 
                src={testimonial.avatar} 
                alt={testimonial.name} 
                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '600', fontSize: '1rem' }}>
                  {testimonial.name}
                </h4>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  {testimonial.role}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}