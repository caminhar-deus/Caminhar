import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Blog.module.css';

export default function BlogPost() {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function fetchPost() {
      try {
        // Busca todos os posts e filtra pelo slug atual
        // (Idealmente, sua API teria um endpoint específico como /api/posts?slug=...)
        const res = await fetch('/api/posts');
        if (res.ok) {
          const posts = await res.json();
          const foundPost = posts.find(p => p.slug === slug);
          setPost(foundPost || null);
        }
      } catch (error) {
        console.error('Erro ao buscar post:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.container} style={{ padding: '50px 20px', textAlign: 'center' }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={styles.container} style={{ padding: '50px 20px', textAlign: 'center' }}>
        <h2>Post não encontrado</h2>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}>
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ padding: '40px 20px' }}>
      <Head>
        <title>{post.title}</title>
        <meta name="description" content={post.excerpt} />
      </Head>

      <div style={{ marginBottom: '30px' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ← Voltar
        </Link>
      </div>

      <article style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#2c3e50', marginBottom: '15px' }}>{post.title}</h1>
          <div style={{ color: '#999', fontSize: '0.9rem' }}>
            {new Date(post.created_at).toLocaleDateString('pt-BR')}
          </div>
        </header>

        {post.image_url && (
          <div style={{ marginBottom: '40px', borderRadius: '12px', overflow: 'hidden' }}>
            <img 
              src={post.image_url} 
              alt={post.title} 
              style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover' }} 
            />
          </div>
        )}

        <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>
          {post.content}
        </div>
      </article>
    </div>
  );
}