import { useState } from 'react';

export default function AdminIntegrityCheck() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/admin/verify-migration');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Falha ao verificar a integridade.');
      }

      setReport(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>Verificação de Integridade da Migração</h3>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
        Execute esta verificação para confirmar se os dados foram migrados corretamente para o PostgreSQL.
      </p>
      <button 
        onClick={handleVerify} 
        disabled={loading}
        style={{ padding: '0.5rem 1rem', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {loading ? 'Verificando...' : 'Verificar Integridade Agora'}
      </button>

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff5f5', color: '#c53030', borderRadius: '8px' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {report && (
        <div style={{ marginTop: '1.5rem', backgroundColor: '#f7fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4>Relatório de Integridade ({new Date(report.timestamp).toLocaleString('pt-BR')})</h4>
          <p><strong>Banco de Dados:</strong> {report.database}</p>
          
          <h5>Contagem de Registros:</h5>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><strong>Usuários:</strong> {report.counts.users}</li>
            <li><strong>Posts:</strong> {report.counts.posts}</li>
            <li><strong>Configurações:</strong> {report.counts.settings}</li>
            <li><strong>Imagens:</strong> {report.counts.images}</li>
          </ul>

          <h5>Amostra dos Últimos Posts:</h5>
          {report.samples.latest_posts.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', backgroundColor: '#edf2f7' }}>
                  <th style={{ padding: '0.5rem' }}>ID</th>
                  <th style={{ padding: '0.5rem' }}>Título</th>
                  <th style={{ padding: '0.5rem' }}>Publicado</th>
                </tr>
              </thead>
              <tbody>
                {report.samples.latest_posts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem' }}>{post.id}</td>
                    <td style={{ padding: '0.5rem' }}>{post.title}</td>
                    <td style={{ padding: '0.5rem' }}>{post.published ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhum post encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}