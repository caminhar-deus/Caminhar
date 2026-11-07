import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import styles from '../styles/misc.module.css';

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
    <div className={styles.toolCard}>
      <div className={styles.toolHeader}>
        <h2 className={styles.toolTitle}>
          Cache do Sistema
        </h2>
      </div>
      <p className={styles.toolSubtitle}>
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
              className={styles.modalActionGap}
            >
              Confirmar
            </Button>
          </Modal.Footer>
        }
      >
        <p>Tem certeza que deseja limpar todo o cache do Redis? Isso pode afetar temporariamente a performance do site.</p>
      </Modal>

      {cacheMetrics && (
        <div className={styles.sectionBlock} style={{ marginTop: 'var(--spacing-6)', marginBottom: 0 }}>
          <h3 className={styles.sectionSubtitle}>
            <AppIcon name="chart" size={18} />
            <span>Status do Cache Redis</span>
          </h3>
          <div className={`${styles.metricsBox} ${cacheMetrics.redisConnected ? styles.statusHealthy : styles.statusDanger}`}>
            <div className={styles.metricsStatus}>
              <AppIcon name={cacheMetrics.redisConnected ? 'checkCircle' : 'xCircle'} size={18} />
              <span>{cacheMetrics.redisConnected ? 'Redis Conectado' : 'Redis Desconectado'}</span>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <AppIcon name="alertTriangle" size={14} />
                <span>Erros: {cacheMetrics.redisErrors}</span>
              </div>
              <div className={styles.metricItem}>
                <AppIcon name="refresh" size={14} />
                <span>Fallbacks: {cacheMetrics.fallbackActivations}</span>
              </div>
              <div className={styles.metricItem}>
                <AppIcon name="database" size={14} />
                <span>Tamanho Local: {cacheMetrics.localMapSize} entradas</span>
              </div>
              <div className={styles.metricItem}>
                <AppIcon name="clock" size={14} />
                <span>Última Falha: {cacheMetrics.lastFallbackTime ? new Date(cacheMetrics.lastFallbackTime).toLocaleString('pt-BR') : 'Nenhuma'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}