import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/UI';

export default function AdminBackupManager() {
  const [latestBackup, setLatestBackup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
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
        setMessage('✅ Backup realizado com sucesso!');
        fetchBackups(); // Atualiza a lista para mostrar o novo backup
      } else {
        setMessage(`❌ Erro: ${data.message}`);
      }
    } catch {
      setMessage('❌ Erro de conexão ao criar backup');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid var(--color-border-light)', borderRadius: '8px', marginTop: '20px', backgroundColor: 'var(--color-bg-primary)' }}>
      <h3 style={{ marginTop: 0, color: 'var(--color-text-primary)' }}>Backup do Sistema</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
        Gerencie os backups do banco de dados. O sistema realiza backups automáticos diariamente, mas você pode forçar um backup manual aqui.
      </p>

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: message.includes('Erro') || message.includes('❌') ? 'var(--color-error-50)' : 'var(--color-success-50)',
          color: message.includes('Erro') || message.includes('❌') ? 'var(--color-error-700)' : 'var(--color-success-700)',
          border: `1px solid ${message.includes('Erro') || message.includes('❌') ? 'var(--color-error-200)' : 'var(--color-success-200)'}`,
          borderRadius: '4px',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '1rem', color: 'var(--color-text-primary)' }}>Último Backup Realizado</h4>
        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Carregando informações...</p>
        ) : latestBackup ? (
          <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '15px', borderRadius: '6px', border: '1px solid var(--color-border-light)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: 'var(--color-text-primary)' }}>
              📄 {latestBackup.name}
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--color-text-secondary)' }}>
              📅 Data: {new Date(latestBackup.date).toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.9em', color: 'var(--color-text-secondary)' }}>
              💾 Tamanho: {(latestBackup.size / 1024).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Nenhum backup encontrado.</p>
        )}
      </div>

      <Button
        variant="primary"
        onClick={() => setShowConfirm(true)}
        disabled={creating}
      >
        {creating ? '⏳ Criando Backup...' : '📥 Realizar Backup Agora'}
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
              style={{ marginLeft: '8px' }}
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