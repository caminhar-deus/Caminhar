import Head from 'next/head';
import Link from 'next/link';
import { query } from '../../lib/db';

export default function BlogIndex({ posts }) {
  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      <Head>
        <title>Blog | O Caminhar com Deus</title>
        <meta name="description" content="Reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã." />
      </Head>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#718096', fontSize: '0.9rem' }}>
            ← Voltar para o Início
          </Link>
        </div>

        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#2d3748', marginBottom: '0.5rem' }}>Blog</h1>
          <p style={{ color: '#718096', fontSize: '1.1rem' }}>
            Compartilhando a jornada da fé
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#718096', fontSize: '1.1rem' }}>Nenhum post publicado ainda.</p>
              <p style={{ color: '#a0aec0' }}>Volte em breve para novas reflexões.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                overflow: 'hidden',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease',
              }}>
                {post.image_url && (
                  <Link href={`/blog/${post.slug}`}>
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      style={{ 
                        width: '100%', 
                        height: '250px', 
                        objectFit: 'cover',
                        display: 'block',
                        cursor: 'pointer'
                      }} 
                    />
                  </Link>
                )}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#718096' }}>
                    {new Date(post.created_at).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#2d3748', lineHeight: '1.3' }}>
                      {post.title}
                    </h2>
                  </Link>
                  <p style={{ color: '#4a5568', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                  </p>
                  <Link href={`/blog/${post.slug}`} style={{ color: '#3182ce', textDecoration: 'none', fontWeight: '600' }}>
                    Ler artigo completo →
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  const result = await query('SELECT id, title, slug, excerpt, content, image_url, created_at FROM posts WHERE published = true ORDER BY created_at DESC');
  return { props: { posts: JSON.parse(JSON.stringify(result.rows)) } };
}