import React from 'react';
import toast from 'react-hot-toast';

/**
 * Componente genérico para botão "Puxar Dados" de fontes externas (Spotify, YouTube, Mercado Livre).
 *
 * Substitui o padrão duplicado de renderCustomFormField + botão com position:absolute
 * presente em AdminMusicas.js, AdminVideos.js e AdminProducts.js.
 *
 * @param {Object} props
 * @param {string} props.fieldName - Nome do campo (ex: 'url_spotify')
 * @param {string} props.gridColumn - Valor de gridColumn do campo (ex: 'span 2')
 * @param {string} props.url - URL atual do campo (para validação antes da requisição)
 * @param {Function} props.setFieldValue - Função para atualizar campos do formulário
 * @param {boolean} props.isFetching - Estado de loading
 * @param {Function} props.setIsFetching - Setter do estado de loading
 * @param {Object} props.config - Configuração do botão
 * @param {string} props.config.endpoint - Endpoint da API (ex: '/api/admin/fetch-spotify')
 * @param {string} props.config.buttonColor - Cor de fundo do botão (ex: '#1DB954')
 * @param {string} [props.config.buttonTextColor] - Cor do texto do botão (ex: '#fff')
 * @param {string} props.config.loadingMessage - Mensagem durante o loading (ex: 'Buscando dados...')
 * @param {string} props.config.successMessage - Mensagem de sucesso (ex: 'Dados encontrados!')
 * @param {Function} props.config.validateUrl - Função de validação da URL (ex: (url) => url.includes('youtube.com'))
 * @param {string} props.config.invalidUrlMessage - Mensagem se URL for inválida
 * @param {Object} [props.config.fieldMappings] - Mapeamento automático campo API -> campo formulário (ex: { titulo: 'title' }). Usado apenas se onSuccess não for fornecido.
 * @param {Function} [props.onSuccess] - Callback opcional para processar dados de sucesso. Se não fornecido, usa fieldMappings.
 * @param {React.ReactNode} props.children - O campo de formulário (UrlField) a ser renderizado
 */
export default function ExternalDataButton({
  fieldName,
  gridColumn,
  url,
  setFieldValue,
  isFetching,
  setIsFetching,
  config,
  onSuccess,
  children
}) {
  const handleFetch = async () => {
    if (!config.validateUrl(url)) {
      toast.error(config.invalidUrlMessage);
      return;
    }

    setIsFetching(true);
    const loadingToast = toast.loading(config.loadingMessage);

    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha na busca.');
      }

      const data = await res.json();

      if (onSuccess) {
        onSuccess(data, setFieldValue);
      } else if (config.fieldMappings) {
        for (const [formField, apiField] of Object.entries(config.fieldMappings)) {
          if (data[apiField] !== undefined) {
            setFieldValue(formField, data[apiField]);
          }
        }
      }

      toast.success(config.successMessage, { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div key={fieldName} style={{ gridColumn: gridColumn || 'span 1' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <button
            type="button"
            onClick={handleFetch}
            disabled={isFetching}
            title={config.buttonTitle || `Puxar dados automaticamente`}
            style={{
              padding: '4px 10px',
              backgroundColor: config.buttonColor || '#1DB954',
              color: config.buttonTextColor || '#fff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: isFetching ? 'not-allowed' : 'pointer',
              opacity: isFetching ? 0.7 : 1,
              whiteSpace: 'nowrap',
              marginTop: '24px' /* Alinha com o input abaixo do label */
            }}
          >
            {isFetching ? '⏳ Buscando...' : '⚡ Puxar Dados'}
          </button>
        </div>
      </div>
    </div>
  );
}