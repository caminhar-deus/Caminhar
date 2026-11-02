import Head from 'next/head';
import Link from 'next/link';
import styles from './Blog.module.css';
import PostCard from '../../components/Features/Blog/PostCard';
import { Pagination } from '../../components/UI';
import { getRecentPosts } from '../../lib/domain/posts.js';
import { getOrSetCache } from '../../lib/cache/cache.js';
import { getSetting } from '../../lib/domain/settings.js';
import { siteConfig } from '../../lib/seo/config';

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

    // Nome do site vem do painel (settings `site_title`, unificação ADR-0032),
    // com a MESMA chave de cache da API `/api/settings` — o PUT do painel
    // invalida a chave, então o SSR reflete a troca sem esperar o TTL.
    const siteTitle = await getOrSetCache(
      'settings:site_title',
      () => getSetting('site_title'),
      7200
    );

    return {
      props: {
        posts: JSON.parse(JSON.stringify(result.data)),
        currentPage: page,
        totalPages: result.pagination.totalPages,
        siteTitle: siteTitle || null,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar posts no SSR:', error);
    return { props: { posts: [], currentPage: 1, totalPages: 1, fetchError: true, siteTitle: null } };
  }
}

export default function BlogIndex({ posts, currentPage, totalPages, fetchError, siteTitle }) {
  // Nome do site do painel com fallback estático (unificação ADR-0032).
  const siteName = siteTitle || siteConfig.name;
  return (
    <div className={styles.container}>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Head>
        <title>{`Blog - ${siteName}`}</title>
        <meta name="description" content="Compartilhando a jornada da fé através de reflexões e estudos." />
      </Head>

      <div className={styles.backLinkWrapper}>
        <Link href="/" className={styles.backLink}>
          ← Voltar para a Home
        </Link>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Blog</h1>
        <p className={styles.subtitle}>Compartilhando a jornada da fé</p>
      </header>

      <main id="main-content">
        {fetchError ? (
          <p className={styles.errorBanner}>
            Desculpe, não foi possível carregar os posts no momento. Tente novamente mais tarde.
          </p>
        ) : posts.length === 0 ? (
          <p className={styles.emptyState}>Nenhum post publicado ainda.</p>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          getPageUrl={(p) => `/blog?page=${p}`}
        />
      </main>
    </div>
  );
}