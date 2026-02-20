import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../../../styles/Admin.module.css';

/**
 * Campo de upload de imagem com preview
 * @param {Object} props - Propriedades do componente
 * @param {string} props.name - Nome do campo
 * @param {string} props.label - Label exibida
 * @param {string} props.value - URL da imagem atual
 * @param {Function} props.onChange - Handler de mudança (recebe a URL)
 * @param {Function} props.onUpload - Handler de upload (recebe o File)
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
  className = ''
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Se tiver handler customizado, usa ele
    if (onUpload) {
      setUploading(true);
      try {
        const url = await onUpload(file);
        if (url) onChange({ target: { name, value: url } });
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
        onChange({ target: { name, value: data.path } });
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro ${res.status}: Falha no upload`);
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
      </label>
      <div style={{ display: 'flex', gap: '10px' }}>
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
          {uploading ? 'Enviando...' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      
      {value && (
        <div style={{ marginTop: '10px' }}>
          <img 
            src={value} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '200px', 
              objectFit: 'cover', 
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }} 
          />
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
  className: PropTypes.string
};
