import Head from 'next/head';
import Link from 'next/link';
import { query } from '../../lib/db';

export default function BlogPost({ post }) {
  // Define a URL base do site (fallback para localhost se não estiver definida)
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  
  // Garante que a imagem tenha URL absoluta (necessário para WhatsApp/Facebook)
  const imageUrl = post.image_url 
    ? (post.image_url.startsWith('http') ? post.image_url : `${siteUrl}${post.image_url}`)
    : `${siteUrl}/default-og-image.jpg`; // Imagem padrão caso o post não tenha

  return (
    <>
      <Head>
        <title>{post.title} | O Caminhar com Deus</title>
        <meta name="description" content={post.excerpt || post.content.substring(0, 160)} />
        
        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={postUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || post.content.substring(0, 160)} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:site_name" content="O Caminhar com Deus" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="article:published_time" content={post.created_at} />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt || post.content.substring(0, 160)} />
        <meta name="twitter:image" content={imageUrl} />
      </Head>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <Link href="/blog" style={{ textDecoration: 'none', color: '#666', marginBottom: '1rem', display: 'inline-block' }}>
          ← Voltar para o Blog
        </Link>
        
        <article>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#333' }}>{post.title}</h1>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Publicado em {new Date(post.created_at).toLocaleDateString('pt-BR')}
          </p>
          
          {post.image_url && (
            <img 
              src={post.image_url} 
              alt={post.title} 
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '2rem' }} 
            />
          )}

          <div style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#2d3748' }}>
            {/* Renderização simples do conteúdo quebrando linhas */}
            {post.content.split('\n').map((paragraph, index) => (
              paragraph.trim() && <p key={index} style={{ marginBottom: '1rem' }}>{paragraph}</p>
            ))}
          </div>

          <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#4a5568', marginBottom: '1rem' }}>Compartilhe esta reflexão:</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - ${postUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  backgroundColor: '#25D366', 
                  color: 'white', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px', 
                  textDecoration: 'none', 
                  fontWeight: '500' 
                }}
              >
                WhatsApp
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  backgroundColor: '#1877F2', 
                  color: 'white', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px', 
                  textDecoration: 'none', 
                  fontWeight: '500' 
                }}
              >
                Facebook
              </a>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const result = await query(
    'SELECT * FROM posts WHERE slug = $1 AND published = true',
    [params.slug]
  );
  const post = result.rows[0];

  if (!post) {
    return { notFound: true };
  }

  return { props: { post: JSON.parse(JSON.stringify(post)) } };
}