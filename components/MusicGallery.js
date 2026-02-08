import MusicCard from './MusicCard';
import styles from '../styles/MusicGallery.module.css';

// Dados temporários (Mock) para testar a interface
const musicasMock = [
  {
    id: 1,
    titulo: 'Espírito Santo',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 2,
    titulo: 'Aos Olhos do Pai',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 3,
    titulo: 'Teu Espírito',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 4,
    titulo: 'Santo Espírito',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 5,
    titulo: 'Espírito Santo (Ao Vivo)',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 6,
    titulo: 'Espírito Santo (Acústico)',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  }
];

export default function MusicGallery() {
  return (
    <div className={styles.galleryContainer}>
      <div className={styles.galleryGrid}>
        {musicasMock.map((musica) => (
          <MusicCard key={musica.id} musica={musica} />
        ))}
      </div>
    </div>
  );
}