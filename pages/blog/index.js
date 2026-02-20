import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Blog.module.css';
import PostCard from '../../components/PostCard.js';

export async function getServerSideProps({ query }) {
  try {
    // A URL precisa ser absoluta ao rodar no lado do servidor.
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const res = await fetch(`${protocol}://${host}/api/posts`);

    if (!res.ok) {
      console.error('Falha ao buscar posts, status:', res.status);
      return { props: { posts: [], currentPage: 1, totalPages: 1 } };
    }

    const posts = await res.json();

    const page = parseInt(query.page || '1');
    const limit = 9;
    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const paginatedPosts = posts.slice((page - 1) * limit, page * limit);

    return { props: { posts: paginatedPosts, currentPage: page, totalPages } };
  } catch (error) {
    console.error('Erro de conexão ao buscar posts:', error);
    return { props: { posts: [], currentPage: 1, totalPages: 1 } };
  }
}

export default function BlogIndex({ posts, currentPage, totalPages }) {
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
        {posts.length === 0 ? (
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