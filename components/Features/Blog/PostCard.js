import Link from 'next/link';
import { BaseCard } from '@/components/UI';
import styles from './styles/Blog.module.css';

export default function PostCard({ post, readMoreText = 'Ler mais →' }) {
  return (
    <BaseCard
      hoverable
      media={
        <img 
          src={post.image_url || '/api/placeholder-image?text=Reflexão'} 
          alt={post.title || 'Imagem ilustrativa do artigo'}
          loading="lazy"
          width={400}
          height={225}
          style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
        />
      }
    >
      {post.categories?.length > 0 && (
        <div className={styles.categories} aria-label="Categorias do post">
          {post.categories.map((cat) => (
            <span key={cat.id ?? cat.slug} className={styles.category}>
              {cat.name}
            </span>
          ))}
        </div>
      )}
      <h3 className={styles.cardTitle}>
        {post.title}
      </h3>
      <p className={styles.excerpt}>
        {post.excerpt}
      </p>

      <div className={styles.footer}>
        <span className={styles.date}>
          {new Date(post.created_at).toLocaleDateString('pt-BR')}
        </span>
        <Link 
          href={`/blog/${post.slug}`} 
          className={styles.readMore}
          aria-label={`Ler mais sobre: ${post.title}`}
          title={post.title}
        >
          {readMoreText}
        </Link>
      </div>
    </BaseCard>
  );
}