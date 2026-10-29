import { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/form.module.css';
import toast from 'react-hot-toast';

/**
 * Campo de upload de imagem com preview
 * @param {Object} props - Propriedades do componente
 * @param {string} props.name - Nome do campo
 * @param {string} props.label - Label exibida
 * @param {string} props.value - URL da imagem atual
 * @param {Function} props.onChange - Handler de mudança (recebe a URL)
 * @param {Function} props.onUpload - Handler de upload (recebe o File e o uploadType)
 * @param {string} [props.uploadEndpoint='/api/upload-image'] - Endpoint de upload
 * @param {string} [props.uploadType='post'] - Tipo de upload
 * @param {boolean} [props.required=false] - Se é obrigatório
 * @param {string} [props.error] - Mensagem de erro
 * @param {string} [props.hint] - Texto de ajuda
 * @param {string} [props.placeholder] - Placeholder do input
 * @param {string} [props.className] - Classe CSS adicional
 */
export default function ImageUploadField({
  name,
  label,
  value,
  onChange,
  onUpload,
  uploadEndpoint = '/api/upload-image',
  uploadType = 'post',
  required = false,
  error,
  hint,
  placeholder = 'https://... ou faça upload',
  className = '',
  multiple = false
}) {
  const [uploading, setUploading] = useState(false);

  // No modo múltiplo, cada upload vira uma nova linha (o produto usa a
  // primeira imagem como capa e as demais no carrossel — parseImages).
  const applyUploadedUrl = (url) => {
    if (!multiple) return url;
    const current = (value || '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (current.includes(url)) return current.join('\n');
    return [...current, url].join('\n');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Se tiver handler customizado, usa ele
    if (onUpload) {
      setUploading(true);
      try {
        const url = await onUpload(file, uploadType);
        if (url) onChange({ target: { name, value: applyUploadedUrl(url) } });
      } finally {
        setUploading(false);
      }
      return;
    }

    // Upload padrão
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('uploadType', uploadType);

      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        onChange({ target: { name, value: applyUploadedUrl(data.path) } });
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro ${res.status}: Falha no upload`);
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const images = multiple
    ? (value || '').split('\n').map((line) => line.trim()).filter(Boolean)
    : (value ? [value] : []);

  const removeImage = (urlToRemove) => {
    const next = images.filter((url) => url !== urlToRemove).join('\n');
    onChange({ target: { name, value: next } });
  };

  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
      </label>
      <div style={{ display: 'flex', gap: '10px' }}>
        {multiple ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={styles.input}
            rows={3}
            style={{ flex: 1 }}
          />
        ) : (
          <input
            id={name}
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={styles.input}
            style={{ flex: 1 }}
          />
        )}
        <label 
          className={styles.saveButton}
          style={{ 
            padding: '10px 16px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {uploading ? 'Enviando...' : (multiple ? 'Adicionar imagem' : 'Upload')}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      
      {images.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {images.map((url, index) => (
            <div key={`${url}-${index}`} style={{ position: 'relative' }}>
              <img 
                src={url} 
                alt={multiple ? `Preview ${index + 1}` : 'Preview'} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '200px', 
                  objectFit: 'cover', 
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }} 
              />
              {multiple && (
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label={`Remover imagem ${index + 1}`}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
          {error}
        </small>
      )}
      {hint && !error && (
        <small className={styles.formHint}>{hint}</small>
      )}
    </div>
  );
}

ImageUploadField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func,
  uploadEndpoint: PropTypes.string,
  uploadType: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  multiple: PropTypes.bool
};