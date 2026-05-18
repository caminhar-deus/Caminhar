import { useState, useEffect } from 'react';
import Modal from '@/components/UI/Modal';

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
    } catch (error) {
      setMessage('❌ Erro de conexão ao criar backup');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', marginTop: '20px', backgroundColor: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>Backup do Sistema</h3>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.95rem' }}>
        Gerencie os backups do banco de dados. O sistema realiza backups automáticos diariamente, mas você pode forçar um backup manual aqui.
      </p>

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: message.includes('Erro') || message.includes('❌') ? '#ffebee' : '#e8f5e9',
          color: message.includes('Erro') || message.includes('❌') ? '#c62828' : '#2e7d32',
          borderRadius: '4px',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '1rem' }}>Último Backup Realizado</h4>
        {loading ? (
          <p style={{ color: '#666' }}>Carregando informações...</p>
        ) : latestBackup ? (
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>📄 {latestBackup.name}</div>
            <div style={{ fontSize: '0.9em', color: '#555' }}>
              📅 Data: {new Date(latestBackup.date).toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.9em', color: '#555' }}>
              💾 Tamanho: {(latestBackup.size / 1024).toFixed(2)} KB
            </div>
          </div>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Nenhum backup encontrado.</p>
        )}
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        disabled={creating}
        style={{
          padding: '10px 20px',
          backgroundColor: creating ? '#94a3b8' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: creating ? 'not-allowed' : 'pointer',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
      >
        {creating ? '⏳ Criando Backup...' : '📥 Realizar Backup Agora'}
      </button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar Backup Manual"
        size="sm"
        footer={
          <Modal.Footer>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateBackup}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                marginLeft: '8px'
              }}
            >
              Confirmar
            </button>
          </Modal.Footer>
        }
      >
        <p>Deseja iniciar um backup manual do banco de dados agora?</p>
      </Modal>
    </div>
  );
}