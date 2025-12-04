import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import { highlightsApi, type Highlight } from '../api/highlights';
import TagsManager from '../components/TagsManager';
import CollectionsManager from '../components/CollectionsManager';
import Toast from '../components/Toast';
import '../App.css';

export default function ReaderWidget() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadArticle();
      loadHighlights();
    }
  }, [id]);

  useEffect(() => {
    // Track scroll progress
    const handleScroll = () => {
      if (!contentRef.current || !article) return;
      
      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      // Update reading progress (throttle to avoid too many requests)
      const updateProgress = async () => {
        try {
          await articlesApi.updateReadingProgress(article.id, progress);
          if (progress > 0 && article.status === 'UNREAD') {
            await articlesApi.update(article.id, { status: 'READING' });
          }
          if (progress >= 0.95) {
            await articlesApi.update(article.id, { status: 'FINISHED' });
          }
        } catch (error) {
          console.error('Error updating progress:', error);
        }
      };

      // Throttle updates
      const timeoutId = setTimeout(updateProgress, 1000);
      return () => clearTimeout(timeoutId);
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [article]);

  useEffect(() => {
    // Handle text selection
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // j/k for navigation (if we had a list)
      // Space to scroll down
      if (e.key === ' ' && contentRef.current) {
        e.preventDefault();
        contentRef.current.scrollBy({ top: 300, behavior: 'smooth' });
      }
      // Escape to go back
      if (e.key === 'Escape') {
        navigate('/inbox');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  async function loadArticle() {
    if (!id) return;
    setLoading(true);
    try {
      const response = await articlesApi.get(id);
      setArticle(response.data);
    } catch (error) {
      console.error('Error loading article:', error);
      setMessage({ text: 'Erro ao carregar artigo', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function loadHighlights() {
    if (!id) return;
    try {
      const response = await highlightsApi.list({ articleId: id });
      setHighlights(response.data || []);
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  }

  async function handleCreateHighlight() {
    if (!selectedText || !article) return;

    try {
      await highlightsApi.create({
        articleId: article.id,
        text: selectedText,
      });
      setMessage({ text: 'Highlight criado!', type: 'success' });
      setSelectedText('');
      loadHighlights();
    } catch (error) {
      console.error('Error creating highlight:', error);
      setMessage({ text: 'Erro ao criar highlight', type: 'error' });
    }
  }

  const themeStyles = {
    light: { bg: '#fff', text: '#333' },
    dark: { bg: '#1a1a1a', text: '#e0e0e0' },
    sepia: { bg: '#f4ecd8', text: '#5c4b37' },
  };

  const currentTheme = themeStyles[theme];

  if (loading) {
    return (
      <div className="widget-container">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="widget-container">
        <p>Artigo não encontrado</p>
        <button onClick={() => navigate('/inbox')}>Voltar</button>
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

      {/* Header */}
      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <button onClick={() => navigate('/inbox')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
          ← Voltar
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'sepia' : 'light')}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            {theme === 'light' ? '🌙' : theme === 'dark' ? '📜' : '☀️'}
          </button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            🔗 Original
          </a>
        </div>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {article.title || article.url}
      </h1>

      {article.description && (
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          {article.description}
        </p>
      )}

      {/* Reading controls */}
      <div className="card mb-1" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.8rem' }}>
          Tamanho: 
          <input
            type="range"
            min="12"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ marginLeft: '0.5rem', width: '100px' }}
          />
          {fontSize}px
        </label>
        <label style={{ fontSize: '0.8rem' }}>
          Espaçamento: 
          <input
            type="range"
            min="1.2"
            max="2.4"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            style={{ marginLeft: '0.5rem', width: '100px' }}
          />
          {lineHeight.toFixed(1)}
        </label>
        {selectedText && (
          <button
            className="primary"
            onClick={handleCreateHighlight}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            ✨ Highlight
          </button>
        )}
      </div>

      {/* Progress bar */}
      {article.readingProgress > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${article.readingProgress * 100}%`,
                backgroundColor: '#007bff',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            {Math.round(article.readingProgress * 100)}% lido
          </p>
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        style={{
          backgroundColor: currentTheme.bg,
          color: currentTheme.text,
          padding: '1.5rem',
          borderRadius: '6px',
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          maxHeight: '600px',
          overflowY: 'auto',
          fontFamily: 'Georgia, serif',
        }}
      >
        {article.content ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{article.content}</div>
        ) : (
          <div>
            <p>Conteúdo não disponível. <a href={article.url} target="_blank" rel="noopener noreferrer">Abrir original</a></p>
          </div>
        )}
      </div>

      {/* Tags and Collections */}
      <div className="card mt-1" style={{ padding: '0.75rem' }}>
        <TagsManager
          articleId={article.id}
          currentTags={article.articleTags}
          onUpdate={loadArticle}
        />
        <CollectionsManager
          articleId={article.id}
          currentCollections={article.articleCollections}
          onUpdate={loadArticle}
        />
      </div>

      {/* Highlights section */}
      {highlights.length > 0 && (
        <div className="card mt-1" style={{ padding: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Highlights ({highlights.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {highlights.map((highlight) => (
              <div key={highlight.id} style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>"{highlight.text}"</p>
                {highlight.notes && highlight.notes.length > 0 && (
                  <div style={{ marginTop: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid #007bff' }}>
                    {highlight.notes.map((note) => (
                      <p key={note.id} style={{ fontSize: '0.8rem', margin: '0.25rem 0', color: '#666' }}>
                        {note.content}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

