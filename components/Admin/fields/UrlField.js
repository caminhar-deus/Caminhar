import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from '../../../styles/Admin.module.css';

/**
 * Campo de URL com validação e preview (YouTube, Spotify, etc)
 * @param {Object} props - Propriedades do componente
 * @param {string} props.name - Nome do campo
 * @param {string} props.label - Label exibida
 * @param {string} props.value - URL atual
 * @param {Function} props.onChange - Handler de mudança
 * @param {string} [props.platform='generic'] - Plataforma (youtube, spotify, generic)
 * @param {boolean} [props.showPreview=false] - Se deve mostrar preview
 * @param {boolean} [props.required=false] - Se é obrigatório
 * @param {string} [props.placeholder] - Placeholder
 * @param {string} [props.error] - Mensagem de erro
 * @param {string} [props.hint] - Texto de ajuda
 * @param {Function} [props.validate] - Função de validação customizada
 * @param {string} [props.className] - Classe CSS adicional
 */
export default function UrlField({
  name,
  label,
  value,
  onChange,
  platform = 'generic',
  showPreview = false,
  required = false,
  placeholder,
  error,
  hint,
  validate,
  className = ''
}) {
  const [validationError, setValidationError] = useState('');

  // Extrai ID do YouTube
  const getYouTubeId = useCallback((url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }, []);

  // Extrai ID do Spotify
  const getSpotifyId = useCallback((url) => {
    const match = url.match(/(?:spotify\.com\/track\/|spotify:track:)([^"&?\/\s]+)/);
    return match ? match[1] : null;
  }, []);

  // Valida a URL
  const validateUrl = useCallback((url) => {
    if (!url) return required ? 'URL é obrigatória' : '';
    
    try {
      new URL(url);
    } catch {
      return 'URL inválida';
    }

    if (platform === 'youtube' && !getYouTubeId(url)) {
      return 'URL do YouTube inválida. Formatos aceitos: youtube.com/watch?v=ID, youtu.be/ID';
    }

    if (platform === 'spotify' && !getSpotifyId(url)) {
      return 'URL do Spotify inválida. Use: open.spotify.com/track/ID';
    }

    if (validate) {
      return validate(url);
    }

    return '';
  }, [platform, required, getYouTubeId, getSpotifyId, validate]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(e);
    
    if (newValue) {
      const error = validateUrl(newValue);
      setValidationError(error);
    } else {
      setValidationError('');
    }
  };

  // Gera preview baseado na plataforma
  const renderPreview = () => {
    if (!value) return null;

    const youtubeId = getYouTubeId(value);
    const spotifyId = getSpotifyId(value);

    if (platform === 'youtube' && youtubeId) {
      return (
        <div className={styles.previewSection}>
          <label>Pré-visualização</label>
          <div className={styles.videoPreview}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0`}
              width="320"
              height="180"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Preview do vídeo"
            />
          </div>
        </div>
      );
    }

    if (platform === 'spotify' && spotifyId) {
      return (
        <div className={styles.previewSection}>
          <label>Pré-visualização</label>
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: '12px' }}
            src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
            width="100%"
            height="160"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      );
    }

    return null;
  };

  // Placeholders específicos por plataforma
  const platformPlaceholders = {
    youtube: 'https://www.youtube.com/watch?v=...',
    spotify: 'https://open.spotify.com/track/...',
    generic: 'https://...'
  };

  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
      </label>
      <input
        id={name}
        type="url"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder || platformPlaceholders[platform]}
        required={required}
        className={styles.input}
      />
      {(validationError || error) && (
        <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
          {validationError || error}
        </small>
      )}
      {hint && !validationError && !error && (
        <small className={styles.formHint}>{hint}</small>
      )}
      
      {showPreview && renderPreview()}
    </div>
  );
}

UrlField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  platform: PropTypes.oneOf(['youtube', 'spotify', 'generic']),
  showPreview: PropTypes.bool,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  validate: PropTypes.func,
  className: PropTypes.string
};
