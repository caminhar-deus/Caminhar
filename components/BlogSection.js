import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/Blog.module.css';

export default function BlogSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/posts');
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (error) {
        console.error('Erro ao carregar posts:', error);
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

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Reflexões & Estudos</h2>
          <p className={styles.subtitle}>Edifique sua fé com nossos artigos mais recentes</p>
        </div>

        <div className={styles.grid}>
          {posts.map((post) => (
            <article key={post.id} className={styles.card}>
              <div className={styles.imageContainer}>
                <img 
                  src={post.image_url || '/api/placeholder-image?text=Reflexão'} 
                  alt={post.title}
                  className={styles.image}
                  loading="lazy"
                />
              </div>
              
              <div className={styles.content}>
                <div className={styles.meta}>
                  {post.categories && post.categories.map(cat => (
                    <span key={cat.slug} className={styles.category}>
                      {cat.name}
                    </span>
                  ))}
                </div>

                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.excerpt}>{post.excerpt}</p>

                <div className={styles.footer}>
                  <span className={styles.date}>
                    {new Date(post.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <Link href={`/blog/${post.slug}`} className={styles.readMore}>
                    Ler mais →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}