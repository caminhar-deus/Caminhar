import Link from 'next/link';
import BaseCard from '../../UI/BaseCard';

export default function PostCard({ post, readMoreText = 'Ler mais →' }) {
  const categoryStyle = {
    fontSize: '0.75rem',
    color: '#1976d2',
    backgroundColor: '#e3f2fd',
    padding: '0.25rem 0.75rem',
    borderRadius: '50px',
    fontWeight: 600,
    textTransform: 'uppercase',
    display: 'inline-block',
    marginRight: '0.5rem',
    marginBottom: '0.5rem',
  };

  return (
    <BaseCard
      hoverable
      media={
        <img 
          src={post.image_url || '/api/placeholder-image?text=Reflexão'} 
          alt={post.title}
          loading="lazy"
          width={400}
          height={225}
          style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
        />
      }
    >
      {post.categories && post.categories.length > 0 && (
        <div style={{ marginBottom: '0.8rem' }}>
          {post.categories.map(cat => (
            <span key={cat.slug} style={categoryStyle}>
              {cat.name}
            </span>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.8rem 0', color: '#2c3e50', lineHeight: 1.4 }}>
        {post.title}
      </h3>
      <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
        {post.excerpt}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #eee', marginTop: 'auto' }}>
        <span style={{ fontSize: '0.85rem', color: '#999' }}>
          {new Date(post.created_at).toLocaleDateString('pt-BR')}
        </span>
        <Link href={`/blog/${post.slug}`} style={{ color: '#0070f3', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
          {readMoreText}
        </Link>
      </div>
    </BaseCard>
  );
}