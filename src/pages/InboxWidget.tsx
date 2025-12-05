import { useState, useEffect } from 'react';
import { articlesApi, type Article, type ArticleCounts } from '../api/articles';
import { searchApi } from '../api/search';
import ArticleCard from '../components/ArticleCard';
import Toast from '../components/Toast';
import { themeStyles } from '../utils/themeStyles';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import { Inbox, RefreshCw, Moon, ScrollText, Sun, BookOpen, Star, BarChart, Download } from 'lucide-react';
import '../App.css';

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'reading-time' | 'progress' | 'rating-desc' | 'rating-asc';
type ContentTypeFilter = 'all' | 'ARTICLE' | 'BLOG' | 'PDF' | 'YOUTUBE' | 'TWITTER' | 'NEWSLETTER' | 'BOOK' | 'EBOOK';

export default function InboxWidget() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'UNREAD' | 'READING' | 'PAUSED' | 'FINISHED' | 'all'>('UNREAD');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [minRatingFilter, setMinRatingFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const [statusCounts, setStatusCounts] = useState<ArticleCounts>({
    UNREAD: 0,
    READING: 0,
    PAUSED: 0,
    FINISHED: 0,
    ARCHIVED: 0,
    total: 0,
  });

  useEffect(() => {
    loadStatusCounts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      loadArticles();
    }
  }, [searchQuery, statusFilter, contentTypeFilter, sortOption, minRatingFilter]);

  async function loadStatusCounts() {
    try {
      const response = await articlesApi.getCounts();
      if (response.data) {
        setStatusCounts(response.data);
      }
    } catch (error) {
      console.error('Error loading status counts:', error);
    }
  }

  async function handleArticleUpdate() {
    await Promise.all([loadArticles(), loadStatusCounts()]);
  }

  async function handleRefresh() {
    await Promise.all([loadArticles(), loadStatusCounts()]);
  }

  const currentTheme = themeStyles[theme];

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
      
      // Filter by minimum rating
      if (minRatingFilter !== null && minRatingFilter > 0) {
        filtered = filtered.filter(a => a.rating !== null && a.rating >= minRatingFilter);
      }
      
      // Sort
      filtered = sortArticles(filtered, sortOption);
      
      setArticles(filtered);
    } catch (error) {
      console.error('Error loading articles:', error);
      setMessage({ text: 'Error loading articles', type: 'error' });
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
      
      // Filter by minimum rating
      if (minRatingFilter !== null && minRatingFilter > 0) {
        filtered = filtered.filter(a => a.rating !== null && a.rating >= minRatingFilter);
      }
      
      // Sort
      filtered = sortArticles(filtered, sortOption);
      
      setArticles(filtered);
    } catch (error) {
      console.error('Error searching:', error);
      setMessage({ text: 'Error searching', type: 'error' });
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
      case 'rating-desc':
        return sorted.sort((a, b) => {
          const aRating = a.rating ?? -1;
          const bRating = b.rating ?? -1;
          return bRating - aRating;
        });
      case 'rating-asc':
        return sorted.sort((a, b) => {
          const aRating = a.rating ?? -1;
          const bRating = b.rating ?? -1;
          return aRating - bRating;
        });
      default:
        return sorted;
    }
  }

  async function handleSaveUrl() {
    if (!urlInput.trim() && !selectedFile) {
      setMessage({ text: 'Please enter a URL or select a file', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedFile) {
        // Upload file
        await articlesApi.createFromFile(selectedFile);
        setMessage({ text: 'File uploaded successfully!', type: 'success' });
        setSelectedFile(null);
      } else {
        // Save URL
        await articlesApi.create({ url: urlInput.trim() });
        setMessage({ text: 'Article saved successfully!', type: 'success' });
        setUrlInput('');
      }
      await handleArticleUpdate();
    } catch (error) {
      console.error('Error saving article:', error);
      setMessage({ text: error instanceof Error ? error.message : 'Error saving article', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUrlInput(''); // Clear URL input when file is selected
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
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

  const unreadCount = statusCounts.UNREAD;
  const readingCount = statusCounts.READING;
  const pausedCount = statusCounts.PAUSED;
  const finishedCount = statusCounts.FINISHED;
  
  // Get current reading session (most recently accessed article with READING status)
  const currentReadingSession = articles
    .filter(a => a.status === 'READING')
    .sort((a, b) => {
      const aTime = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
      const bTime = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
      return bTime - aTime;
    })[0];

  return (
    <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={message.type === 'error' ? 6000 : 3000}
        />
      )}

      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Inbox size={20} /> Inbox
        </h2>
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
          icon={<BookOpen size={14} />}
          onClick={() => window.location.href = '/reading-now'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Reading
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Star size={14} />}
          onClick={() => window.location.href = '/favorites'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Favorites
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<BarChart size={14} />}
          onClick={() => window.location.href = '/analytics'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Stats
        </Button>
      </div>

      {/* Save URL or File input */}
      <div className="card mb-1" style={{ padding: '0.5rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Paste URL here..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedFile(null); // Clear file when URL is entered
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveUrl();
                }
              }}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              disabled={isSaving || !!selectedFile}
            />
            <label
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentTheme.buttonBg || '#007bff',
                color: 'white',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              <input
                type="file"
                accept=".pdf,.html,.htm,.txt,.md,.markdown,.epub,.docx,.doc"
                onChange={handleFileSelect}
                disabled={isSaving || !!urlInput.trim()}
                style={{ display: 'none' }}
              />
              📎 Upload
            </label>
            <button
              className="primary"
              onClick={handleSaveUrl}
              disabled={isSaving || (!urlInput.trim() && !selectedFile)}
              style={{ padding: '0.5rem 1rem' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {selectedFile && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: currentTheme.inputBg || '#f8f9fa',
              borderRadius: '4px',
              fontSize: '0.75rem'
            }}>
              <span>📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              <button
                onClick={handleRemoveFile}
                style={{
                  marginLeft: 'auto',
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: currentTheme.text,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="card mb-1" style={{ padding: '0.5rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <input
          type="text"
          placeholder="🔍 Search articles (title, URL, content, tags)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
        />
      </div>

      {/* Filters and Sort */}
      <div className="card mb-1" style={{ padding: '0.5rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sort:</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, minWidth: '150px' }}
            >
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="reading-time">Reading time</option>
              <option value="progress">Progress</option>
              <option value="rating-desc">Rating (highest)</option>
              <option value="rating-asc">Rating (lowest)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Min Rating:</label>
            <select
              value={minRatingFilter ?? ''}
              onChange={(e) => setMinRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, minWidth: '150px' }}
            >
              <option value="">All ratings</option>
              <option value="1">1+ ⭐</option>
              <option value="2">2+ ⭐⭐</option>
              <option value="3">3+ ⭐⭐⭐</option>
              <option value="4">4+ ⭐⭐⭐⭐</option>
              <option value="5">5 ⭐⭐⭐⭐⭐</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Type:</label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as ContentTypeFilter)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, minWidth: '150px' }}
            >
              <option value="all">All</option>
              <option value="ARTICLE">Article</option>
              <option value="BLOG">Blog</option>
              <option value="PDF">PDF</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="TWITTER">Twitter</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="BOOK">Book</option>
              <option value="EBOOK">E-book</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export button */}
      <div className="card mb-1" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={14} />}
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
                setMessage({ text: 'Exported successfully!', type: 'success' });
              } else {
                throw new Error('Error exporting');
              }
            } catch (error) {
              setMessage({ text: 'Error exporting', type: 'error' });
            }
          }}
        >
          Export JSON
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={14} />}
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
                setMessage({ text: 'Exported successfully!', type: 'success' });
              } else {
                throw new Error('Error exporting');
              }
            } catch (error) {
              setMessage({ text: 'Error exporting', type: 'error' });
            }
          }}
        >
          Export CSV
        </Button>
      </div>

      {/* Current Reading Session Status */}
      {currentReadingSession && (
        <div className="card mb-1" style={{ 
          padding: '0.75rem', 
          backgroundColor: currentTheme.cardBg, 
          border: `2px solid ${currentTheme.cardBorder}`,
          borderRadius: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <BookOpen size={20} style={{ color: '#007bff' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#007bff' }}>
              Reading now:
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
                Last read: {new Date(currentReadingSession.lastReadAt).toLocaleString('en-US')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-1" style={{ width: '100%', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('UNREAD')}
          className={statusFilter === 'UNREAD' ? 'primary' : ''}
          style={{ flex: 1, minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setStatusFilter('READING')}
          className={statusFilter === 'READING' ? 'primary' : ''}
          style={{ flex: 1, minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Reading ({readingCount})
        </button>
        <button
          onClick={() => setStatusFilter('PAUSED')}
          className={statusFilter === 'PAUSED' ? 'primary' : ''}
          style={{ flex: 1, minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Paused ({pausedCount})
        </button>
        <button
          onClick={() => setStatusFilter('FINISHED')}
          className={statusFilter === 'FINISHED' ? 'primary' : ''}
          style={{ flex: 1, minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          Finished ({finishedCount})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'primary' : ''}
          style={{ flex: 1, minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
        >
          All
        </button>
      </div>

      {/* Articles list */}
      {loading || isSearching ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>{isSearching ? 'Searching...' : 'Loading...'}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <p style={{ color: currentTheme.secondaryText, margin: 0 }}>
            {searchQuery ? 'No articles found' : 'No articles found'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onUpdate={handleArticleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

