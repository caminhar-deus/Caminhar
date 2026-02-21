import Link from 'next/link';
import styles from './styles/Blog.module.css';

export default function PostCard({ post, readMoreText = 'Ler mais →' }) {
  return (
    <article className={styles.card}>
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
            {readMoreText}
          </Link>
        </div>
      </div>
    </article>
  );
}