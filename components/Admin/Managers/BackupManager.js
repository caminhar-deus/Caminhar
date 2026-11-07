import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import styles from '../styles/misc.module.css';

export default function AdminBackupManager() {
  const [latestBackup, setLatestBackup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLatestBackup(data.latest);
      }
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setShowConfirm(false);
    setCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessageType('success');
        setMessage('Backup realizado com sucesso!');
        fetchBackups(); // Atualiza a lista para mostrar o novo backup
      } else {
        setMessageType('error');
        setMessage(`Erro: ${data.message}`);
      }
    } catch {
      setMessageType('error');
      setMessage('Erro de conexão ao criar backup');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolHeader}>
        <h3 className={styles.toolTitle}>Backup do Sistema</h3>
      </div>
      <p className={styles.toolSubtitle}>
        Gerencie os backups do banco de dados. O sistema realiza backups automáticos diariamente, mas você pode forçar um backup manual aqui.
      </p>

      {message && (
        <div
          role={messageType === 'error' ? 'alert' : 'status'}
          className={`${styles.feedbackBanner} ${messageType === 'error' ? styles.statusDanger : styles.statusHealthy}`}
        >
          <AppIcon name={messageType === 'error' ? 'xCircle' : 'checkCircle'} size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className={styles.sectionBlock}>
        <h4 className={styles.sectionSubtitle}>Último Backup Realizado</h4>
        {loading ? (
          <p className={styles.toolSubtitle}>Carregando informações...</p>
        ) : latestBackup ? (
          <div className={styles.backupMetaBox}>
            <div className={`${styles.backupMetaRow} ${styles.backupFileName}`}>
              <AppIcon name="fileText" size={16} />
              <span>{latestBackup.name}</span>
            </div>
            <div className={styles.backupMetaRow}>
              <AppIcon name="calendar" size={16} />
              <span>Data: {new Date(latestBackup.date).toLocaleString('pt-BR')}</span>
            </div>
            <div className={styles.backupMetaRow}>
              <AppIcon name="hardDrive" size={16} />
              <span>Tamanho: {(latestBackup.size / 1024).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB</span>
            </div>
          </div>
        ) : (
          <p className={styles.toolSubtitle}>Nenhum backup encontrado.</p>
        )}
      </div>

      <Button
        variant="primary"
        onClick={() => setShowConfirm(true)}
        disabled={creating}
      >
        <AppIcon name={creating ? 'clock' : 'download'} size={16} />
        <span>{creating ? 'Criando Backup...' : 'Realizar Backup Agora'}</span>
      </Button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar Backup Manual"
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
              variant="primary"
              onClick={handleCreateBackup}
              className={styles.modalActionGap}
            >
              Confirmar
            </Button>
          </Modal.Footer>
        }
      >
        <p>Deseja iniciar um backup manual do banco de dados agora?</p>
      </Modal>
    </div>
  );
}