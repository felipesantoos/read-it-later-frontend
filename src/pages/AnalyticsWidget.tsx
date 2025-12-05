import { useState, useEffect } from 'react';
import { analyticsApi, type Analytics } from '../api/analytics';
import Toast from '../components/Toast';
import { themeStyles, type Theme } from '../utils/themeStyles';
import '../App.css';

export default function AnalyticsWidget() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [theme, setTheme] = useState<Theme>('light');

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

  async function handleRefresh() {
    await loadAnalytics();
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('sepia');
    } else {
      setTheme('light');
    }
  };

  const currentTheme = themeStyles[theme];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    const currentTheme = themeStyles[theme];
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Não foi possível carregar as estatísticas</p>
      </div>
    );
  }

  return (
    <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>📊 Estatísticas</h2>
          <button
            onClick={handleRefresh}
            title="Atualizar"
            style={{ padding: '0.25rem', fontSize: '0.75rem', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: currentTheme.buttonBg, color: currentTheme.text }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
          <button
            onClick={cycleTheme}
            title="Alternar tema"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: currentTheme.buttonBg, color: currentTheme.text }}
          >
            {theme === 'light' ? '🌙' : theme === 'dark' ? '📜' : '☀️'}
          </button>
        </div>
        <a
          href="/inbox"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: currentTheme.text }}
        >
          ← Voltar
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#007bff' }}>
            {analytics.totalSaved}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Total Salvo
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#28a745' }}>
            {analytics.totalRead}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Total Lido
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ffc107' }}>
            {analytics.totalFinished}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Finalizados
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc3545' }}>
            {analytics.totalFavorited}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Favoritos
          </div>
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Taxa de Conclusão</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '20px', backgroundColor: currentTheme.progressBg, borderRadius: '10px', overflow: 'hidden' }}>
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

      <div className="card mb-1" style={{ padding: '0.75rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Tempo de Leitura Hoje</h3>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#007bff' }}>
          {formatTime(analytics.readingTimeToday)}
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Por Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(analytics.articlesByStatus).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: currentTheme.text }}>{status}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentTheme.text }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '0.75rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Organização</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: currentTheme.text }}>Highlights</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentTheme.text }}>{analytics.totalHighlights}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: currentTheme.text }}>Coleções</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentTheme.text }}>{analytics.totalCollections}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: currentTheme.text }}>Tags</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentTheme.text }}>{analytics.totalTags}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

