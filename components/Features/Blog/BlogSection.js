import { useApiFetch } from '@/hooks';
import Link from 'next/link';
import styles from './styles/Blog.module.css';
import PostCard from './PostCard';

export default function BlogSection({ limit }) {
  // O limite é pedido À API (limit na query) — sem corte client-side
  // (PLANO_ACAO F2.1, D-01/D-02).
  const url = `/api/posts?response=v1${limit ? `&limit=${limit}` : ''}`;
  const { data: responseData, loading } = useApiFetch(url, {
    transform: (result) => {
      // Formato esperado (v1): { success: true, data: [...], pagination: {...} }
      if (result.success && Array.isArray(result.data)) {
        return { posts: result.data, total: result.pagination?.total ?? result.data.length };
      }
      // Fallback defensivo: se a resposta for diretamente um array (formato alternativo)
      if (Array.isArray(result)) {
        return { posts: result, total: result.length };
      }
      // Fallback defensivo: se tiver data direto no objeto sem success
      if (result.data && Array.isArray(result.data)) {
        return { posts: result.data, total: result.pagination?.total ?? result.data.length };
      }
      // Fallback defensivo: formato inesperado devolve lista vazia (sem log no caminho público)
      return { posts: [], total: 0 };
    },
    staleTime: 60000, // 1 minuto de cache para evitar chamadas repetidas
  });

  const posts = responseData?.posts || [];
  const total = responseData?.total || 0;

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
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* O total REAL da resposta decide o link: com o limite pedido à API,
            `posts.length` nunca ultrapassa `limit` (armadilha do F2.1). */}
        {limit && total > posts.length && (
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