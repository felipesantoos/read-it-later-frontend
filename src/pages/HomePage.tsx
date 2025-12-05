import { useState, useEffect } from 'react';
import { articlesApi } from '../api/articles';
import '../App.css';

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentReading, setCurrentReading] = useState<{ title: string; id: string }[]>([]);

  useEffect(() => {
    // Obter token da query string ou localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromQuery = urlParams.get('token');
    
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
      localStorage.setItem('auth_token', tokenFromQuery);
      loadCurrentReading(tokenFromQuery);
    } else {
      const tokenFromStorage = localStorage.getItem('auth_token');
      setToken(tokenFromStorage);
      if (tokenFromStorage) {
        loadCurrentReading(tokenFromStorage);
      }
    }
  }, []);

  async function loadCurrentReading(tokenValue: string) {
    try {
      // Temporarily set token for API call
      const originalToken = localStorage.getItem('auth_token');
      localStorage.setItem('auth_token', tokenValue);
      
      const response = await articlesApi.list({ status: 'READING' });
      const readingArticles = response.data || [];
      
      if (readingArticles.length > 0) {
        const sortedArticles = readingArticles.sort((a, b) => {
          const aTime = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
          const bTime = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
          return bTime - aTime;
        });
        
        setCurrentReading(
          sortedArticles.map(article => ({
            title: article.title || article.url,
            id: article.id,
          }))
        );
      } else {
        setCurrentReading([]);
      }
      
      // Restore original token
      if (originalToken) {
        localStorage.setItem('auth_token', originalToken);
      }
    } catch (error) {
      // Silently fail - not critical
      console.error('Error loading current reading:', error);
    }
  }

  function getToken(): string | null {
    return token;
  }

  function openWidget(path: string) {
    const currentToken = getToken();
    if (!currentToken) {
      setMessage({ text: 'Token não encontrado. Adicione ?token=SEU_TOKEN na URL.', type: 'error' });
      return;
    }

    const url = `${window.location.origin}${path}?token=${encodeURIComponent(currentToken)}`;
    window.open(url, '_blank');
  }

  function copyLink(path: string) {
    const currentToken = getToken();
    if (!currentToken) {
      setMessage({ text: 'Token não encontrado. Adicione ?token=SEU_TOKEN na URL.', type: 'error' });
      return;
    }

    const url = `${window.location.origin}${path}?token=${encodeURIComponent(currentToken)}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setMessage({ text: 'Link copiado para a área de transferência!', type: 'success' });
      }).catch(() => {
        setMessage({ text: `Link: ${url}`, type: 'info' });
      });
    } else {
      setMessage({ text: `Link: ${url}`, type: 'info' });
    }
  }

  const currentToken = getToken();

  return (
    <div className="widget-container">
      <h2 className="widget-title">Read It Later Widgets</h2>

      {!currentToken && (
        <div className="card mb-1" style={{ padding: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', margin: 0, color: '#666' }}>
            Token não encontrado. Adicione ?token=SEU_TOKEN na URL.
          </p>
        </div>
      )}

      {/* Current Reading Session Status */}
      {currentToken && currentReading.length > 0 && (
        <div className="card mb-1" style={{ 
          padding: '0.75rem', 
          backgroundColor: '#e7f3ff', 
          border: '2px solid #007bff',
          borderRadius: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>📖</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#007bff' }}>
              Sessão de leitura ativa:
            </span>
          </div>
          <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {currentReading.map((reading) => (
              <a
                key={reading.id}
                href={`/reader/${reading.id}?token=${currentToken}`}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#007bff',
                  textDecoration: 'none',
                }}
              >
                {reading.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="card mb-1" style={{ padding: '0.5rem', backgroundColor: message.type === 'error' ? '#fee' : message.type === 'success' ? '#efe' : '#eef' }}>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>{message.text}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
        <div className="card" style={{ padding: '0.5rem' }}>
          <div className="flex-between gap-1" style={{ alignItems: 'center' }}>
            <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📥</span>
              <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Inbox
              </span>
            </div>
            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <button
                onClick={() => copyLink('/inbox')}
                disabled={!currentToken}
                title="Copiar link"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                📋
              </button>
              <button
                className="primary"
                onClick={() => openWidget('/inbox')}
                disabled={!currentToken}
                title="Abrir widget"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.5rem' }}>
          <div className="flex-between gap-1" style={{ alignItems: 'center' }}>
            <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📖</span>
              <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Lendo Agora
              </span>
            </div>
            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <button
                onClick={() => copyLink('/reading-now')}
                disabled={!currentToken}
                title="Copiar link"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                📋
              </button>
              <button
                className="primary"
                onClick={() => openWidget('/reading-now')}
                disabled={!currentToken}
                title="Abrir widget"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.5rem' }}>
          <div className="flex-between gap-1" style={{ alignItems: 'center' }}>
            <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⭐</span>
              <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Favoritos
              </span>
            </div>
            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <button
                onClick={() => copyLink('/favorites')}
                disabled={!currentToken}
                title="Copiar link"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                📋
              </button>
              <button
                className="primary"
                onClick={() => openWidget('/favorites')}
                disabled={!currentToken}
                title="Abrir widget"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.5rem' }}>
          <div className="flex-between gap-1" style={{ alignItems: 'center' }}>
            <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>✨</span>
              <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Highlights
              </span>
            </div>
            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <button
                onClick={() => copyLink('/highlights')}
                disabled={!currentToken}
                title="Copiar link"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                📋
              </button>
              <button
                className="primary"
                onClick={() => openWidget('/highlights')}
                disabled={!currentToken}
                title="Abrir widget"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.5rem' }}>
          <div className="flex-between gap-1" style={{ alignItems: 'center' }}>
            <div className="flex gap-1" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📊</span>
              <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Estatísticas
              </span>
            </div>
            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <button
                onClick={() => copyLink('/analytics')}
                disabled={!currentToken}
                title="Copiar link"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                📋
              </button>
              <button
                className="primary"
                onClick={() => openWidget('/analytics')}
                disabled={!currentToken}
                title="Abrir widget"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: currentToken ? 'pointer' : 'not-allowed',
                  opacity: currentToken ? 1 : 0.6,
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

