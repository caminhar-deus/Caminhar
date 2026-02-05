import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminCacheManager() {
  const [loading, setLoading] = useState(false);

  const handleClearCache = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o cache do Redis? Isso pode afetar temporariamente a performance do site.')) {
      return;
    }

    const toastId = toast.loading('Limpando cache...');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, { id: toastId });
      } else {
        toast.error(data.message || 'Erro ao limpar cache', { id: toastId });
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      toast.error('Erro de conexão ao tentar limpar o cache.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
        Cache do Sistema
      </h2>
      <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
        Limpar o cache força o sistema a buscar dados atualizados do banco de dados imediatamente. Use isso se as alterações não estiverem aparecendo no site.
      </p>
      
      <button
        onClick={handleClearCache}
        disabled={loading}
        style={{
          padding: '0.6rem 1.2rem',
          backgroundColor: loading ? '#ccc' : '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          transition: 'background-color 0.2s'
        }}
      >
        {loading ? 'Limpando...' : 'Limpar Cache Redis'}
      </button>

    </div>
  );
}