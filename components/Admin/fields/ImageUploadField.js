import { useState } from 'react';
import PropTypes from 'prop-types';
import { AppIcon } from '@/components/UI/icons';
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

  // Normaliza null/undefined (ex.: colunas NULL do banco ou initialFormData)
  // para string vazia, mantendo o input/textarea sempre controlado no React.
  const normalizedValue = value ?? '';
  const images = multiple
    ? normalizedValue.split('\n').map((line) => line.trim()).filter(Boolean)
    : (normalizedValue ? [normalizedValue] : []);

  // No modo múltiplo, cada upload vira uma nova linha (o produto usa a
  // primeira imagem como capa e as demais no carrossel — parseImages).
  const applyUploadedUrl = (url) => {
    if (!multiple) return url;
    if (images.includes(url)) return images.join('\n');
    return [...images, url].join('\n');
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

  const removeImage = (urlToRemove) => {
    const next = images.filter((url) => url !== urlToRemove).join('\n');
    onChange({ target: { name, value: next } });
  };

  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required && <span className={styles.requiredMark}>*</span>}
      </label>
      <div className={styles.inlineUploadRow}>
        {multiple ? (
          <textarea
            id={name}
            name={name}
            value={normalizedValue}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={`${styles.input} ${styles.flexInput}`}
            rows={3}
          />
        ) : (
          <input
            id={name}
            type="text"
            name={name}
            value={normalizedValue}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={`${styles.input} ${styles.flexInput}`}
          />
        )}
        <label
          className={`${styles.uploadLabelButton}${uploading ? ` ${styles.uploadLabelDisabled}` : ''}`}
        >
          <AppIcon name="upload" size={16} />
          <span>{uploading ? 'Enviando...' : (multiple ? 'Adicionar imagem' : 'Upload')}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className={styles.hiddenFileInput}
          />
        </label>
      </div>
      
      {images.length > 0 && (
        <div className={styles.uploadPreviewList}>
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className={styles.uploadPreviewItem}>
              <img 
                src={url} 
                alt={multiple ? `Preview ${index + 1}` : 'Preview'} 
                className={styles.uploadPreviewImg}
              />
              {multiple && (
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label={`Remover imagem ${index + 1}`}
                  className={styles.removePreviewButton}
                >
                  <AppIcon name="close" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <small className={styles.fieldError}>
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
  value: PropTypes.string,
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