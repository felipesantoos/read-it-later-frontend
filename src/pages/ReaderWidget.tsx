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
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingPages, setIsEditingPages] = useState(false);
  const [editingTotalPages, setEditingTotalPages] = useState<string>('');
  const [editingCurrentPage, setEditingCurrentPage] = useState<string>('');

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
          // If article has totalPages, update by page instead
          if (article.totalPages && article.totalPages > 0) {
            const newCurrentPage = Math.round(progress * article.totalPages);
            if (newCurrentPage !== article.currentPage) {
              await articlesApi.updateReadingProgressByPage(article.id, newCurrentPage);
            }
          } else {
            await articlesApi.updateReadingProgress(article.id, progress);
          }
          
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
      // Initialize editing values
      if (response.data) {
        setEditingTotalPages(response.data.totalPages?.toString() || '');
        setEditingCurrentPage(response.data.currentPage?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading article:', error);
      setMessage({ text: 'Erro ao carregar artigo', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePages() {
    if (!article) return;
    
    const totalPages = editingTotalPages ? parseInt(editingTotalPages) : null;
    const currentPage = editingCurrentPage ? parseInt(editingCurrentPage) : null;
    
    // Validation
    if (totalPages !== null && totalPages <= 0) {
      setMessage({ text: 'Total de páginas deve ser maior que 0', type: 'error' });
      return;
    }
    if (currentPage !== null && currentPage < 0) {
      setMessage({ text: 'Página atual não pode ser negativa', type: 'error' });
      return;
    }
    if (totalPages !== null && currentPage !== null && currentPage > totalPages) {
      setMessage({ text: 'Página atual não pode ser maior que o total de páginas', type: 'error' });
      return;
    }
    
    try {
      await articlesApi.update(article.id, {
        totalPages: totalPages,
        currentPage: currentPage,
      });
      await loadArticle();
      setIsEditingPages(false);
      setMessage({ text: 'Páginas atualizadas!', type: 'success' });
    } catch (error) {
      console.error('Error updating pages:', error);
      setMessage({ text: 'Erro ao atualizar páginas', type: 'error' });
    }
  }

  async function handlePageChange(newPage: number) {
    if (!article) return;
    
    const totalPages = article.totalPages;
    if (totalPages && newPage > totalPages) {
      setMessage({ text: 'Página não pode ser maior que o total de páginas', type: 'error' });
      return;
    }
    if (newPage < 0) {
      setMessage({ text: 'Página não pode ser negativa', type: 'error' });
      return;
    }
    
    try {
      await articlesApi.updateReadingProgressByPage(article.id, newPage);
      await loadArticle();
    } catch (error) {
      console.error('Error updating page:', error);
      setMessage({ text: 'Erro ao atualizar página', type: 'error' });
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

  const statusColors: Record<Article['status'], string> = {
    UNREAD: '#6c757d',
    READING: '#007bff',
    FINISHED: '#28a745',
    ARCHIVED: '#6c757d',
  };

  const statusLabels: Record<Article['status'], string> = {
    UNREAD: 'Não Lido',
    READING: 'Lendo',
    FINISHED: 'Lido',
    ARCHIVED: 'Arquivado',
  };

  const allStatuses: Article['status'][] = ['UNREAD', 'READING', 'FINISHED', 'ARCHIVED'];

  async function handleStatusChange(newStatus: Article['status']) {
    if (!article || isUpdatingStatus) return;
    setIsStatusDropdownOpen(false);
    setIsUpdatingStatus(true);
    try {
      await articlesApi.update(article.id, { status: newStatus });
      await loadArticle();
      setMessage({ text: 'Status atualizado!', type: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ text: 'Erro ao atualizar status', type: 'error' });
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen]);

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
        <div ref={statusDropdownRef} style={{ position: 'relative' }}>
          <span
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: statusColors[article.status],
              color: 'white',
              cursor: 'pointer',
              userSelect: 'none',
              display: 'inline-block',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            Status: {statusLabels[article.status]} ▼
          </span>
          {isStatusDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.25rem',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '120px',
                overflow: 'hidden',
              }}
            >
              {allStatuses.map((status) => (
                <div
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: status === article.status ? '#f0f0f0' : 'white',
                    color: status === article.status ? statusColors[status] : '#333',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (status !== article.status) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status !== article.status) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                    }
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: statusColors[status],
                      marginRight: '0.5rem',
                      verticalAlign: 'middle',
                    }}
                  />
                  {statusLabels[status]}
                  {status === article.status && (
                    <span style={{ marginLeft: '0.5rem', color: statusColors[status] }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* Progress bar and page tracking */}
      <div style={{ marginBottom: '1rem' }}>
        {(article.readingProgress > 0 || article.totalPages) && (
          <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div
              style={{
                height: '100%',
                width: `${article.readingProgress * 100}%`,
                backgroundColor: '#007bff',
                transition: 'width 0.3s',
              }}
            />
          </div>
        )}
        
        {/* Page information */}
        {article.totalPages && article.totalPages > 0 ? (
          <div className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
            {!isEditingPages ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  Página {article.currentPage || 0} de {article.totalPages}
                  {article.currentPage && article.totalPages && (
                    <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                      ({Math.round(((article.currentPage || 0) / article.totalPages) * 100)}%)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => article.currentPage && handlePageChange(Math.max(0, article.currentPage - 1))}
                    disabled={!article.currentPage || article.currentPage <= 0}
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem',
                      opacity: (!article.currentPage || article.currentPage <= 0) ? 0.5 : 1,
                      cursor: (!article.currentPage || article.currentPage <= 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Anterior
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={article.totalPages}
                    value={article.currentPage || 0}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (!isNaN(page) && page >= 0 && page <= article.totalPages!) {
                        handlePageChange(page);
                      }
                    }}
                    style={{ 
                      width: '60px', 
                      padding: '0.25rem', 
                      fontSize: '0.75rem',
                      textAlign: 'center'
                    }}
                  />
                  <button
                    onClick={() => article.currentPage !== null && handlePageChange(Math.min(article.totalPages!, article.currentPage + 1))}
                    disabled={!article.currentPage || article.currentPage >= article.totalPages}
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem',
                      opacity: (!article.currentPage || article.currentPage >= article.totalPages) ? 0.5 : 1,
                      cursor: (!article.currentPage || article.currentPage >= article.totalPages) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Próxima →
                  </button>
                  <button
                    onClick={() => setIsEditingPages(true)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Total de páginas:
                  <input
                    type="number"
                    min="1"
                    value={editingTotalPages}
                    onChange={(e) => setEditingTotalPages(e.target.value)}
                    placeholder="Ex: 300"
                    style={{ width: '80px', padding: '0.25rem', fontSize: '0.75rem' }}
                  />
                </label>
                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Página atual:
                  <input
                    type="number"
                    min="0"
                    max={editingTotalPages ? parseInt(editingTotalPages) : undefined}
                    value={editingCurrentPage}
                    onChange={(e) => setEditingCurrentPage(e.target.value)}
                    placeholder="Ex: 45"
                    style={{ width: '80px', padding: '0.25rem', fontSize: '0.75rem' }}
                  />
                </label>
                <button
                  onClick={handleSavePages}
                  className="primary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setIsEditingPages(false);
                    setEditingTotalPages(article.totalPages?.toString() || '');
                    setEditingCurrentPage(article.currentPage?.toString() || '');
                  }}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
            {!isEditingPages ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>Rastreamento de páginas não configurado</span>
                <button
                  onClick={() => setIsEditingPages(true)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  ➕ Adicionar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Total de páginas:
                  <input
                    type="number"
                    min="1"
                    value={editingTotalPages}
                    onChange={(e) => setEditingTotalPages(e.target.value)}
                    placeholder="Ex: 300"
                    style={{ width: '80px', padding: '0.25rem', fontSize: '0.75rem' }}
                  />
                </label>
                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Página atual:
                  <input
                    type="number"
                    min="0"
                    max={editingTotalPages ? parseInt(editingTotalPages) : undefined}
                    value={editingCurrentPage}
                    onChange={(e) => setEditingCurrentPage(e.target.value)}
                    placeholder="Ex: 45"
                    style={{ width: '80px', padding: '0.25rem', fontSize: '0.75rem' }}
                  />
                </label>
                <button
                  onClick={handleSavePages}
                  className="primary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setIsEditingPages(false);
                    setEditingTotalPages('');
                    setEditingCurrentPage('');
                  }}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
        
        {article.readingProgress > 0 && !article.totalPages && (
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            {Math.round(article.readingProgress * 100)}% lido
          </p>
        )}
      </div>

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

