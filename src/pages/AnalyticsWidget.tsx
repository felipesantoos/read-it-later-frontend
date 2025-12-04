import { useState, useEffect } from 'react';
import { analyticsApi, type Analytics } from '../api/analytics';
import Toast from '../components/Toast';
import '../App.css';

export default function AnalyticsWidget() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const response = await analyticsApi.get();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setMessage({ text: 'Erro ao carregar estatísticas', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="widget-container">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="widget-container">
        <p>Não foi possível carregar as estatísticas</p>
      </div>
    );
  }

  return (
    <div className="widget-container">
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>📊 Estatísticas</h2>
        <a
          href="/inbox"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
        >
          ← Voltar
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#007bff' }}>
            {analytics.totalSaved}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Total Salvo
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#28a745' }}>
            {analytics.totalRead}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Total Lido
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ffc107' }}>
            {analytics.totalFinished}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Finalizados
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc3545' }}>
            {analytics.totalFavorited}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Favoritos
          </div>
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Taxa de Conclusão</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${analytics.completionRate}%`,
                backgroundColor: '#28a745',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '50px' }}>
            {analytics.completionRate.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tempo de Leitura Hoje</h3>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#007bff' }}>
          {formatTime(analytics.readingTimeToday)}
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Por Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(analytics.articlesByStatus).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem' }}>{status}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Organização</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>Highlights</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{analytics.totalHighlights}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>Coleções</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{analytics.totalCollections}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>Tags</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{analytics.totalTags}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

