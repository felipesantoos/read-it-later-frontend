import { useState, useEffect } from 'react';
import { analyticsApi, type Analytics } from '../api/analytics';
import Toast from '../components/Toast';
import { themeStyles } from '../utils/themeStyles';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import { BarChart, RefreshCw, Moon, ScrollText, Sun, ArrowLeft } from 'lucide-react';
import '../App.css';

export default function AnalyticsWidget() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { theme, cycleTheme } = useTheme();

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
      setMessage({ text: 'Error loading statistics', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await loadAnalytics();
  }

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
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Could not load statistics</p>
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

      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart size={20} /> Statistics
        </h2>
        <Button
          variant="icon"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={handleRefresh}
          title="Refresh"
          style={{ color: currentTheme.text }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={theme === 'light' ? <Moon size={14} /> : theme === 'dark' ? <ScrollText size={14} /> : <Sun size={14} />}
          onClick={cycleTheme}
          title="Toggle theme"
          style={{ color: currentTheme.text }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={() => window.location.href = '/inbox'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Back
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#007bff' }}>
            {analytics.totalSaved}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Total Saved
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#28a745' }}>
            {analytics.totalRead}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Total Read
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ffc107' }}>
            {analytics.totalFinished}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Finished
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc3545' }}>
            {analytics.totalFavorited}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginTop: '0.25rem' }}>
            Favorites
          </div>
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Completion Rate</h3>
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
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Reading Time Today</h3>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#007bff' }}>
          {formatTime(analytics.readingTimeToday)}
        </div>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>By Status</h3>
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
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: currentTheme.text }}>Organization</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: currentTheme.text }}>Highlights</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentTheme.text }}>{analytics.totalHighlights}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: currentTheme.text }}>Collections</span>
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

