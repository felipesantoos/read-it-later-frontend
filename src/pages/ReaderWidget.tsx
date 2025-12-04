import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from '../components/Toast';
import ReaderHeader from '../components/reader/ReaderHeader';
import ArticleContent from '../components/reader/ArticleContent';
import { ArticleTagsAndCollections, ArticleHighlights } from '../components/reader/ArticleMetadata';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { validatePageChange } from '../utils/validation';
import { themeStyles } from '../utils/themeStyles';
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
  const contentRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const [selectedText, setSelectedText] = useState<string>('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);

  useEffect(() => {
    if (id) {
      loadArticle();
      loadHighlights();
    }
  }, [id]);

  // Função para atualizar estado local sem recarregar o artigo inteiro
  const updateArticleState = (updates: Partial<Article>) => {
    if (!article) return;
    setArticle({ ...article, ...updates });
  };

  // Hook para rastreamento de scroll
  useScrollProgress({
    contentRef,
    article,
    onArticleUpdate: updateArticleState,
  });

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

  // Função para atualizar apenas tags e coleções sem recarregar o artigo inteiro
  async function updateArticleTagsAndCollections() {
    if (!id || !article) return;
    try {
      const response = await articlesApi.get(id);
      // Atualizar apenas tags e coleções no estado local
      updateArticleState({
        articleTags: response.data.articleTags,
        articleCollections: response.data.articleCollections,
      });
    } catch (error) {
      console.error('Error updating tags/collections:', error);
      // Não mostrar toast aqui, pois TagsManager/CollectionsManager já mostram seus próprios toasts
    }
  }

  async function handlePagesUpdate(totalPages: number | null, currentPage: number | null) {
    if (!article) return;

    try {
      const response = await articlesApi.update(article.id, {
        totalPages: totalPages,
        currentPage: currentPage,
      });
      updateArticleState(response.data);
      setMessage({ text: 'Páginas atualizadas!', type: 'success' });
    } catch (error) {
      console.error('Error updating pages:', error);
      setMessage({ text: 'Erro ao atualizar páginas', type: 'error' });
      throw error;
    }
  }

  async function handlePageChange(newPage: number) {
    if (!article) return;

    const validation = validatePageChange(newPage, article.totalPages);
    if (!validation.isValid) {
      setMessage({ text: validation.error || 'Erro de validação', type: 'error' });
      return;
    }

    try {
      const response = await articlesApi.updateReadingProgressByPage(article.id, newPage);
      updateArticleState(response.data);
      setMessage({ text: 'Página atualizada!', type: 'success' });
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

  async function handleStatusChange(newStatus: Article['status']) {
    if (!article || isUpdatingStatus) return;
    setIsStatusDropdownOpen(false);
    setIsUpdatingStatus(true);
    try {
      const response = await articlesApi.update(article.id, { status: newStatus });
      updateArticleState(response.data);
      setMessage({ text: 'Status atualizado!', type: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ text: 'Erro ao atualizar status', type: 'error' });
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleResetProgress() {
    if (!article) return;
    try {
      const response = await articlesApi.updateReadingProgress(article.id, 0);
      updateArticleState(response.data);
      
      // Also reset currentPage if totalPages is set
      if (article.totalPages) {
        await articlesApi.update(article.id, { currentPage: 0 });
        updateArticleState({ currentPage: 0 });
      }
      
      // Scroll to top
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      
      setMessage({ text: 'Progresso resetado!', type: 'success' });
    } catch (error) {
      console.error('Error resetting progress:', error);
      setMessage({ text: 'Erro ao resetar progresso', type: 'error' });
    }
  }

  const currentTheme = themeStyles[theme];

  if (loading) {
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Artigo não encontrado</p>
        <button onClick={() => navigate('/inbox')}>Voltar</button>
      </div>
    );
  }

  return (
    <div 
      className="widget-container" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 2rem)', 
        overflow: 'hidden',
        backgroundColor: currentTheme.bg,
        color: currentTheme.text
      }}
    >
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      {/* Header - Always visible */}
      <div style={{ flexShrink: 0, width: '100%', marginBottom: isTopBarVisible ? '0' : '0.5rem' }}>
        <ReaderHeader
          article={article}
          theme={theme}
          onThemeChange={setTheme}
          isTopBarVisible={isTopBarVisible}
          onToggleTopBar={() => setIsTopBarVisible(!isTopBarVisible)}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onFontSizeChange={setFontSize}
          onLineHeightChange={setLineHeight}
          onStatusChange={handleStatusChange}
          isUpdatingStatus={isUpdatingStatus}
          isStatusDropdownOpen={isStatusDropdownOpen}
          onStatusDropdownToggle={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
          selectedText={selectedText}
          onCreateHighlight={handleCreateHighlight}
          readingProgress={article.readingProgress}
          onPageChange={handlePageChange}
          onPagesUpdate={handlePagesUpdate}
          onResetProgress={handleResetProgress}
          onTagsUpdate={updateArticleTagsAndCollections}
        />
      </div>

      {/* Fixed Actions Bar at the top */}
      {isTopBarVisible && (
      <div style={{ flexShrink: 0, width: '100%' }}>

      {/* All Actions and Controls - Horizontal Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, auto) 1fr',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        alignItems: 'stretch',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }} className="reader-actions-grid">
        {/* Column 1: Collections */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, height: '100%', minWidth: 0 }}>
            <ArticleTagsAndCollections
              article={article}
              onTagsUpdate={updateArticleTagsAndCollections}
              onCollectionsUpdate={updateArticleTagsAndCollections}
              theme={theme}
            />
          </div>
        </div>

        {/* Column 2: Highlights Section */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', width: '100%' }}>
          {highlights.length > 0 ? (
            <ArticleHighlights highlights={highlights} theme={theme} />
          ) : (
            <div 
              className="card" 
              style={{ 
                padding: '0.5rem',
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, margin: 0 }}>
                Nenhum highlight ainda
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
      )}

      {/* Separator */}
      {isTopBarVisible && (
      <div style={{ 
        borderTop: `2px solid ${currentTheme.separator}`, 
        marginTop: '1rem', 
        marginBottom: '1rem',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-0.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: currentTheme.bg,
          padding: '0 0.5rem',
          fontSize: '0.75rem',
          color: currentTheme.secondaryText,
          fontWeight: 500
        }}>
          Conteúdo
        </div>
      </div>
      )}

      {/* Article Content - Only content at the bottom */}
      <ArticleContent
        article={article}
        contentRef={contentRef}
        theme={theme}
        fontSize={fontSize}
        lineHeight={lineHeight}
      />
    </div>
  );
}
