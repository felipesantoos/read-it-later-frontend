import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from '../components/Toast';
import '../App.css';

export default function HighlightsWidget() {
  const navigate = useNavigate();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHighlights();
  }, []);

  async function loadHighlights() {
    setLoading(true);
    try {
      const response = await highlightsApi.list();
      setHighlights(response.data || []);
    } catch (error) {
      console.error('Error loading highlights:', error);
      setMessage({ text: 'Erro ao carregar highlights', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await loadHighlights();
  }

  const filteredHighlights = highlights.filter((highlight) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      highlight.text.toLowerCase().includes(query) ||
      highlight.article.title?.toLowerCase().includes(query) ||
      highlight.notes.some(note => note.content.toLowerCase().includes(query))
    );
  });

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>✨ Highlights</h2>
          <button
            onClick={handleRefresh}
            title="Atualizar"
            style={{ padding: '0.25rem', fontSize: '0.75rem', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
        </div>
        <div className="flex gap-1">
          <a
            href="/inbox"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📥 Inbox
          </a>
          <a
            href="/analytics"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📊 Stats
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <input
          type="text"
          placeholder="Buscar highlights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
        />
      </div>

      {/* Highlights list */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Carregando...</p>
        </div>
      ) : filteredHighlights.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>
            {searchQuery ? 'Nenhum highlight encontrado' : 'Nenhum highlight ainda'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className="card"
              style={{ padding: '0.75rem', cursor: 'pointer' }}
              onClick={() => navigate(`/reader/${highlight.article.id}`)}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                  {highlight.article.title || highlight.article.url}
                </p>
              </div>
              <p style={{ fontSize: '0.9rem', margin: '0.5rem 0', fontStyle: 'italic', color: '#333' }}>
                "{highlight.text}"
              </p>
              {highlight.notes && highlight.notes.length > 0 && (
                <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #007bff' }}>
                  {highlight.notes.map((note) => (
                    <p key={note.id} style={{ fontSize: '0.85rem', margin: '0.25rem 0', color: '#666' }}>
                      💬 {note.content}
                    </p>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.5rem', margin: 0 }}>
                {new Date(highlight.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

