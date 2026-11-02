import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button } from '@/components/UI';

export default function AdminCacheManager() {
  const [loading, setLoading] = useState(false);
  const [cacheMetrics, setCacheMetrics] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Carrega as métricas quando o componente é montado
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/admin/cache', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setCacheMetrics(data);
        }
      } catch (error) {
        console.error('Erro ao buscar métricas do cache:', error);
      }
    };

    fetchMetrics();
  }, []);

  const handleClearCache = async () => {
    setShowConfirm(false);

    const toastId = toast.loading('Limpando cache...');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
    <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', backgroundColor: 'var(--color-bg-primary)' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
        Cache do Sistema
      </h2>
      <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
        Limpar o cache força o sistema a buscar dados atualizados do banco de dados imediatamente. Use isso se as alterações não estiverem aparecendo no site.
      </p>
      
      <Button
        variant="danger"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        {loading ? 'Limpando...' : 'Limpar Cache Redis'}
      </Button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar Limpeza de Cache"
        size="sm"
        footer={
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleClearCache}
              style={{ marginLeft: '8px' }}
            >
              Confirmar
            </Button>
          </Modal.Footer>
        }
      >
        <p>Tem certeza que deseja limpar todo o cache do Redis? Isso pode afetar temporariamente a performance do site.</p>
      </Modal>

      {cacheMetrics && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.8rem', color: 'var(--color-text-primary)' }}>
            <span aria-hidden="true" style={{ marginRight: '6px' }}>📊</span>
            Status do Cache Redis
          </h3>
          <div style={{ backgroundColor: cacheMetrics.redisConnected ? 'var(--color-success-50)' : 'var(--color-error-50)', padding: '15px', borderRadius: '6px', border: `1px solid ${cacheMetrics.redisConnected ? 'var(--color-success-200)' : 'var(--color-error-200)'}` }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: cacheMetrics.redisConnected ? 'var(--color-success-700)' : 'var(--color-error-700)' }}>
              {cacheMetrics.redisConnected ? '✅ Redis Conectado' : '❌ Redis Desconectado'}
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--color-text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div>⚠️ Erros: {cacheMetrics.redisErrors}</div>
              <div>🔄 Fallbacks: {cacheMetrics.fallbackActivations}</div>
              <div>📍 Tamanho Local: {cacheMetrics.localMapSize} entradas</div>
              <div>⏱️ Última Falha: {cacheMetrics.lastFallbackTime ? new Date(cacheMetrics.lastFallbackTime).toLocaleString('pt-BR') : 'Nenhuma'}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}