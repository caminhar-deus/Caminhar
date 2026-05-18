import { useMemo } from 'react';
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

  const displayedPosts = useMemo(() => {
    return limit ? posts.slice(0, limit) : posts;
  }, [posts, limit]);

  if (loading) {
    return <div className={styles.section}><div className={styles.container} style={{textAlign: 'center'}}>Carregando reflexões...</div></div>;
  }

  if (posts.length === 0) {
    return null;
  }

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
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-10)' }}>
            <Link href="/blog" style={{
              display: 'inline-block',
              padding: 'var(--spacing-3) var(--spacing-6)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'var(--transition-all)'
            }}>
              Ver todas as postagens
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}