import Head from 'next/head';
import Link from 'next/link';
import styles from './Blog.module.css';
import PostCard from '../../components/Features/Blog/PostCard';
import { query } from '../../lib/db.js';

export async function getServerSideProps({ query: queryParams }) {
  try {
    const page = parseInt(queryParams.page || '1');
    const limit = 9;
    const offset = (page - 1) * limit;

    // Query direta ao banco — elimina latência de rede e overhead HTTP
    const postsResult = await query(
      'SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const totalResult = await query(
      'SELECT COUNT(*) FROM posts WHERE published = true'
    );

    const posts = postsResult.rows;
    const totalPosts = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalPosts / limit);

    return { props: { posts: JSON.parse(JSON.stringify(posts)), currentPage: page, totalPages } };
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
        <Link href="/" style={{ color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ← Voltar para a Home
        </Link>
      </div>

      <header className={styles.header} style={{ marginBottom: '50px', textAlign: 'center' }}>
        <h1 className={styles.title}>Blog</h1>
        <p className={styles.subtitle}>Compartilhando a jornada da fé</p>
      </header>

      <main>
        {fetchError ? (
          <p style={{ textAlign: 'center', color: '#721c24', background: '#f8d7da', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            Desculpe, não foi possível carregar os posts no momento. Tente novamente mais tarde.
          </p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: 'center' }}>Nenhum post publicado ainda.</p>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} readMoreText="Ler artigo completo →" />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '50px' }}>
            {currentPage > 1 ? (
              <Link href={`/blog?page=${currentPage - 1}`} style={{
                padding: '10px 20px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                color: '#333',
                textDecoration: 'none'
              }}>
                &larr; Anterior
              </Link>
            ) : null}
            
            <span style={{ color: '#666' }}>Página {currentPage} de {totalPages}</span>

            {currentPage < totalPages ? (
              <Link href={`/blog?page=${currentPage + 1}`} style={{
                padding: '10px 20px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                color: '#333',
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