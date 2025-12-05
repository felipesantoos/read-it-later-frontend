import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from '../components/Toast';
import ReaderHeader from '../components/reader/ReaderHeader';
import ArticleContent from '../components/reader/ArticleContent';
import HighlightToolbar from '../components/reader/HighlightToolbar';
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
  const [fontSize, setFontSize] = useState(24);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('sepia');
  const contentRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
      // Ensure we create a new array reference to trigger React re-render
      const newHighlights = response.data || [];
      setHighlights([...newHighlights]);
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  }

  async function handleCreateHighlight(text: string, position: string) {
    if (!article) return;

    try {
      await highlightsApi.create({
        articleId: article.id,
        text: text,
        position: position,
      });
      setMessage({ text: 'Highlight criado!', type: 'success' });
      await loadHighlights();
    } catch (error) {
      console.error('Error creating highlight:', error);
      setMessage({ text: 'Erro ao criar highlight', type: 'error' });
      throw error;
    }
  }

  async function handleCreateHighlightWithNote(text: string, position: string, noteContent: string) {
    if (!article) return;

    try {
      // Create highlight first (without loading highlights to avoid processing DOM too early)
      const highlightResponse = await highlightsApi.create({
        articleId: article.id,
        text: text,
        position: position,
      });
      
      // Then create note
      await highlightsApi.createNote(highlightResponse.data.id, noteContent);
      
      setMessage({ text: 'Highlight com nota criado!', type: 'success' });
      
      // Reload highlights to get the updated highlight with note included
      // This ensures the highlight is loaded with its note from the start
      await loadHighlights();
    } catch (error) {
      console.error('Error creating highlight with note:', error);
      setMessage({ text: 'Erro ao criar highlight com nota', type: 'error' });
      throw error;
    }
  }

  async function handleHighlightsUpdate() {
    await loadHighlights();
  }

  async function handleRefresh() {
    await Promise.all([loadArticle(), loadHighlights()]);
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
      <div style={{ flexShrink: 0, width: '100%', marginBottom: '0.5rem' }}>
        <ReaderHeader
          article={article}
          theme={theme}
          onThemeChange={setTheme}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onFontSizeChange={setFontSize}
          onLineHeightChange={setLineHeight}
          onStatusChange={handleStatusChange}
          isUpdatingStatus={isUpdatingStatus}
          isStatusDropdownOpen={isStatusDropdownOpen}
          onStatusDropdownToggle={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
          readingProgress={article.readingProgress}
          onPageChange={handlePageChange}
          onPagesUpdate={handlePagesUpdate}
          onResetProgress={handleResetProgress}
          onTagsUpdate={updateArticleTagsAndCollections}
          onCollectionsUpdate={updateArticleTagsAndCollections}
          highlights={highlights}
          onHighlightsUpdate={handleHighlightsUpdate}
          contentRef={contentRef}
        />
      </div>

      {/* Article Content */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <ArticleContent
          article={article}
          contentRef={contentRef}
          theme={theme}
          fontSize={fontSize}
          lineHeight={lineHeight}
          highlights={highlights}
        />
        
        {/* Highlight Toolbar - appears near selected text */}
        <HighlightToolbar
          articleId={article.id}
          onHighlight={handleCreateHighlight}
          onHighlightWithNote={handleCreateHighlightWithNote}
          theme={theme}
          contentRef={contentRef}
        />
      </div>
    </div>
  );
}
