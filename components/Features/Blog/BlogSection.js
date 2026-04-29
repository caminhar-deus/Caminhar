import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './styles/Blog.module.css';
import PostCard from './PostCard';

export default function BlogSection({ limit }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/posts');
        
        // ✅ Validação defensiva: Verificar se a resposta é realmente JSON
        const contentType = res.headers?.get?.('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.error(`API /api/posts retornou conteúdo inválido. Esperado JSON, recebido: ${contentType}`);
          console.error('Isso geralmente significa que a rota API quebrou e retornou página HTML de erro');
          setPosts([]);
          return;
        }

        if (res.ok) {
          let responseData;
          try {
            responseData = await res.json();
          } catch (jsonError) {
            console.error('Falha ao parsear JSON da resposta da API mesmo com Content-Type correto:', jsonError);
            setPosts([]);
            return;
          }

          // CRITICAL FIX: Access the 'data' property from the API response
          if (responseData.success && Array.isArray(responseData.data)) {
            setPosts(responseData.data);
          } else {
            console.error('API returned success: false or data is not an array:', responseData);
            setPosts([]); // Ensure posts is an array even on API logic error
          }
        } else {
          let errorData;
          try {
            errorData = await res.json();
          } catch (jsonError) {
            console.error(`API retornou erro HTTP ${res.status} mas conteúdo não é JSON válido`);
            setPosts([]);
            return;
          }
          
          console.error('API Error fetching posts:', res.status, errorData.message || 'Unknown error');
          setPosts([]); // Set to empty array on HTTP error
        }
      } catch (error) {
        console.error('Erro ao carregar posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) {
    return <div className={styles.section}><div className={styles.container} style={{textAlign: 'center'}}>Carregando reflexões...</div></div>;
  }

  if (posts.length === 0) {
    return null;
  }

  const displayedPosts = limit ? posts.slice(0, limit) : posts;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Reflexões & Estudos</h2>
          <p className={styles.subtitle}>Edifique sua fé com nossos artigos mais recentes</p>
        </div>

        <div className={styles.grid}>
          {displayedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {limit && posts.length > limit && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/blog" style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}>
              Ver todas as postagens
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}