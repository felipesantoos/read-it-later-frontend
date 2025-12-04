import { useState, useEffect } from 'react';
import { articlesApi, type Article } from '../api/articles';
import { searchApi } from '../api/search';
import ArticleCard from '../components/ArticleCard';
import Toast from '../components/Toast';
import '../App.css';

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'reading-time' | 'progress';
type ContentTypeFilter = 'all' | 'ARTICLE' | 'BLOG' | 'PDF' | 'YOUTUBE' | 'TWITTER' | 'NEWSLETTER' | 'BOOK' | 'EBOOK';

export default function InboxWidget() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'UNREAD' | 'READING' | 'FINISHED' | 'all'>('UNREAD');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      loadArticles();
    }
  }, [searchQuery, statusFilter, contentTypeFilter, sortOption]);

  async function loadArticles() {
    setLoading(true);
    try {
      const response = await articlesApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 200,
      });
      let filtered = response.data || [];
      
      // Filter by content type
      if (contentTypeFilter !== 'all') {
        filtered = filtered.filter(a => a.contentType === contentTypeFilter);
      }
      
      // Sort
      filtered = sortArticles(filtered, sortOption);
      
      setArticles(filtered);
    } catch (error) {
      console.error('Error loading articles:', error);
      setMessage({ text: 'Erro ao carregar artigos', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadArticles();
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchApi.search(searchQuery.trim(), 'articles');
      let filtered = response.data.articles || [];
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(a => a.status === statusFilter);
      }
      
      // Filter by content type
      if (contentTypeFilter !== 'all') {
        filtered = filtered.filter(a => a.contentType === contentTypeFilter);
      }
      
      // Sort
      filtered = sortArticles(filtered, sortOption);
      
      setArticles(filtered);
    } catch (error) {
      console.error('Error searching:', error);
      setMessage({ text: 'Erro ao buscar', type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  function sortArticles(articlesToSort: Article[], sort: SortOption): Article[] {
    const sorted = [...articlesToSort];
    switch (sort) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'title-asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'title-desc':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      case 'reading-time':
        return sorted.sort((a, b) => (b.readingTime || 0) - (a.readingTime || 0));
      case 'progress':
        return sorted.sort((a, b) => b.readingProgress - a.readingProgress);
      default:
        return sorted;
    }
  }

  async function handleSaveUrl() {
    if (!urlInput.trim()) {
      setMessage({ text: 'Por favor, insira uma URL', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      await articlesApi.create({ url: urlInput.trim() });
      setMessage({ text: 'Artigo salvo com sucesso!', type: 'success' });
      setUrlInput('');
      loadArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      setMessage({ text: error instanceof Error ? error.message : 'Erro ao salvar artigo', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // j/k for navigation
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const firstArticle = document.querySelector('[data-article-card]') as HTMLElement;
        if (firstArticle) {
          firstArticle.focus();
          firstArticle.click();
        }
      }
      // Escape to clear search
      if (e.key === 'Escape') {
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const unreadCount = articles.filter(a => a.status === 'UNREAD').length;
  const readingCount = articles.filter(a => a.status === 'READING').length;
  const finishedCount = articles.filter(a => a.status === 'FINISHED').length;
  
  // Get current reading session (most recently accessed article with READING status)
  const currentReadingSession = articles
    .filter(a => a.status === 'READING')
    .sort((a, b) => {
      const aTime = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
      const bTime = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
      return bTime - aTime;
    })[0];

  return (
    <div className="widget-container">
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={message.type === 'error' ? 6000 : 3000}
        />
      )}

      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>📥 Inbox</h2>
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '12px',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <a
            href="/reading-now"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📖 Lendo
          </a>
          <a
            href="/favorites"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            ⭐ Favoritos
          </a>
          <a
            href="/analytics"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📊 Stats
          </a>
        </div>
      </div>

      {/* Save URL input */}
      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Cole a URL aqui..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveUrl();
              }
            }}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
            disabled={isSaving}
          />
          <button
            className="primary"
            onClick={handleSaveUrl}
            disabled={isSaving || !urlInput.trim()}
            style={{ padding: '0.5rem 1rem' }}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <input
          type="text"
          placeholder="🔍 Buscar artigos (título, URL, conteúdo, tags)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
        />
      </div>

      {/* Filters and Sort */}
      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ordenar:</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, minWidth: '150px' }}
            >
              <option value="date-desc">Data (mais recente)</option>
              <option value="date-asc">Data (mais antiga)</option>
              <option value="title-asc">Título (A-Z)</option>
              <option value="title-desc">Título (Z-A)</option>
              <option value="reading-time">Tempo de leitura</option>
              <option value="progress">Progresso</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tipo:</label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as ContentTypeFilter)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, minWidth: '150px' }}
            >
              <option value="all">Todos</option>
              <option value="ARTICLE">Artigo</option>
              <option value="BLOG">Blog</option>
              <option value="PDF">PDF</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="TWITTER">Twitter</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="BOOK">Livro</option>
              <option value="EBOOK">E-book</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export button */}
      <div className="card mb-1" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('auth_token') || new URLSearchParams(window.location.search).get('token') || '';
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
              const response = await fetch(`${apiUrl}/articles/export?format=json&token=${token}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'articles.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setMessage({ text: 'Exportado com sucesso!', type: 'success' });
              } else {
                throw new Error('Erro ao exportar');
              }
            } catch (error) {
              setMessage({ text: 'Erro ao exportar', type: 'error' });
            }
          }}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          📥 Exportar JSON
        </button>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('auth_token') || new URLSearchParams(window.location.search).get('token') || '';
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
              const response = await fetch(`${apiUrl}/articles/export?format=csv&token=${token}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'articles.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setMessage({ text: 'Exportado com sucesso!', type: 'success' });
              } else {
                throw new Error('Erro ao exportar');
              }
            } catch (error) {
              setMessage({ text: 'Erro ao exportar', type: 'error' });
            }
          }}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* Current Reading Session Status */}
      {currentReadingSession && (
        <div className="card mb-1" style={{ 
          padding: '0.75rem', 
          backgroundColor: '#e7f3ff', 
          border: '2px solid #007bff',
          borderRadius: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>📖</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#007bff' }}>
              Lendo agora:
            </span>
          </div>
          <div style={{ marginLeft: '1.5rem' }}>
            <a
              href={`/reader/${currentReadingSession.id}`}
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#007bff',
                textDecoration: 'none',
                display: 'block',
                marginBottom: '0.25rem',
              }}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/reader/${currentReadingSession.id}?token=${localStorage.getItem('auth_token') || new URLSearchParams(window.location.search).get('token') || ''}`;
              }}
            >
              {currentReadingSession.title || currentReadingSession.url}
            </a>
            {currentReadingSession.readingProgress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: '6px', backgroundColor: '#cfe2ff', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${currentReadingSession.readingProgress * 100}%`,
                      backgroundColor: '#007bff',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '40px' }}>
                  {Math.round(currentReadingSession.readingProgress * 100)}%
                </span>
              </div>
            )}
            {currentReadingSession.lastReadAt && (
              <p style={{ fontSize: '0.7rem', color: '#666', margin: '0.25rem 0 0 0' }}>
                Última leitura: {new Date(currentReadingSession.lastReadAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-1" style={{ width: '100%' }}>
        <button
          onClick={() => setStatusFilter('UNREAD')}
          className={statusFilter === 'UNREAD' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Não Lidos ({unreadCount})
        </button>
        <button
          onClick={() => setStatusFilter('READING')}
          className={statusFilter === 'READING' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Lendo ({readingCount})
        </button>
        <button
          onClick={() => setStatusFilter('FINISHED')}
          className={statusFilter === 'FINISHED' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Lidos ({finishedCount})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'primary' : ''}
          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Todos
        </button>
      </div>

      {/* Articles list */}
      {loading || isSearching ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>{isSearching ? 'Buscando...' : 'Carregando...'}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>
            {searchQuery ? 'Nenhum artigo encontrado' : 'Nenhum artigo encontrado'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onUpdate={loadArticles} />
          ))}
        </div>
      )}
    </div>
  );
}

