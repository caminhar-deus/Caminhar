import Head from 'next/head';
import Link from 'next/link';
import styles from './Blog.module.css';
import PostCard from '../../components/Features/Blog/PostCard';
import { getRecentPosts } from '../../lib/domain/posts.js';
import { getOrSetCache } from '../../lib/cache/cache.js';

export async function getServerSideProps({ query: queryParams }) {
  try {
    const parsedPage = parseInt(queryParams.page || '1');
    const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit = 9;

    // Mesma camada de domínio e a MESMA chave de cache da listagem sem busca
    // da API `/api/posts` — /blog e a aba pública compartilham a entrada de
    // cache e a ordenação curada (`position ASC, created_at DESC`) do
    // `paginate`. Antes este SSR reimplementava a query em SQL ad hoc
    // (`ORDER BY created_at DESC`) e ignorava a curadoria (doc público §7,
    // item 12).
    const result = await getOrSetCache(
      `posts:list:${page}:${limit}`,
      () => getRecentPosts(limit, page, ''),
      7200
    );

    return {
      props: {
        posts: JSON.parse(JSON.stringify(result.data)),
        currentPage: page,
        totalPages: result.pagination.totalPages,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar posts no SSR:', error);
    return { props: { posts: [], currentPage: 1, totalPages: 1, fetchError: true } };
  }
}

export default function BlogIndex({ posts, currentPage, totalPages, fetchError }) {
  return (
    <div className={styles.container} style={{ padding: '40px 20px' }}>
      <Head>
        <title>Blog - O Caminhar com Deus</title>
        <meta name="description" content="Compartilhando a jornada da fé através de reflexões e estudos." />
      </Head>

      <div style={{ marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
        <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ← Voltar para a Home
        </Link>
      </div>

      <header className={styles.header} style={{ marginBottom: '50px', textAlign: 'center' }}>
        <h1 className={styles.title}>Blog</h1>
        <p className={styles.subtitle}>Compartilhando a jornada da fé</p>
      </header>

      <main>
        {fetchError ? (
          <p style={{ textAlign: 'center', color: 'var(--color-error-800, #991b1b)', background: 'var(--color-error-100, #fee2e2)', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            Desculpe, não foi possível carregar os posts no momento. Tente novamente mais tarde.
          </p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: 'center' }}>Nenhum post publicado ainda.</p>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '50px' }}>
            {currentPage > 1 ? (
              <Link href={`/blog?page=${currentPage - 1}`} style={{
                padding: '10px 20px',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                textDecoration: 'none'
              }}>
                &larr; Anterior
              </Link>
            ) : null}
            
            <span style={{ color: 'var(--color-text-secondary)' }}>Página {currentPage} de {totalPages}</span>

            {currentPage < totalPages ? (
              <Link href={`/blog?page=${currentPage + 1}`} style={{
                padding: '10px 20px',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                textDecoration: 'none'
              }}>
                Próxima &rarr;
              </Link>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}