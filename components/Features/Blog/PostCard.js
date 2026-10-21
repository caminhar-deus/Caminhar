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
      {/* TODO(PLANO_ACAO_SITE_PUBLICO.md D-20): os chips de categoria foram
          removidos porque a listagem pública de posts não devolve
          `categories` e não existe mecanismo no painel para criar/atribuir
          categorias (junction `post_categories` nunca é populada). Reavaliar
          quando houver CRUD de categorias. */}
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