import { useApiFetch } from '@/hooks';
import Link from 'next/link';
import styles from './styles/Blog.module.css';
import PostCard from './PostCard';

export default function BlogSection({ limit }) {
  const { data: responseData, loading } = useApiFetch('/api/posts', {
    transform: (result) => {
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
      console.error('API returned success: false or data is not an array:', result);
      return [];
    },
    onError: (err) => console.error('Erro ao carregar posts:', err),
  });

  const posts = responseData || [];

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