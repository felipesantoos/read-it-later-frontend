import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from '../components/Toast';
import ReaderHeader from '../components/reader/ReaderHeader';
import ArticleContent from '../components/reader/ArticleContent';
import HighlightToolbar from '../components/reader/HighlightToolbar';
import TTSControls from '../components/reader/TTSControls';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { useTTS } from '../hooks/useTTS';
import { validatePageChange } from '../utils/validation';
import { themeStyles } from '../utils/themeStyles';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
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
  const { theme, setTheme } = useTheme();
  const contentRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showTTSBar, setShowTTSBar] = useState(false);
  const [isHighlightingEnabled, setIsHighlightingEnabled] = useState(true);

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

  // Hook para TTS
  const tts = useTTS(article, contentRef);

  useEffect(() => {
    if (id) {
      loadArticle();
      loadHighlights();
    }
  }, [id]);

  // Stop TTS when navigating away or component unmounts
  useEffect(() => {
    return () => {
      if (tts.state === 'playing' || tts.state === 'paused') {
        tts.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only depend on id, not tts object


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space to scroll down (only if TTS is not playing)
      if (e.key === ' ' && contentRef.current && tts.state !== 'playing') {
        e.preventDefault();
        contentRef.current.scrollBy({ top: 300, behavior: 'smooth' });
      }
      // Escape to go back or stop TTS
      if (e.key === 'Escape') {
        if (tts.state === 'playing' || tts.state === 'paused') {
          tts.stop();
        } else {
          navigate('/inbox');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, tts]);

  async function loadArticle() {
    if (!id) return;
    setLoading(true);
    try {
      const response = await articlesApi.get(id);
      setArticle(response.data);
    } catch (error) {
      console.error('Error loading article:', error);
      setMessage({ text: 'Error loading article', type: 'error' });
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
      setMessage({ text: 'Pages updated!', type: 'success' });
    } catch (error) {
      console.error('Error updating pages:', error);
      setMessage({ text: 'Error updating pages', type: 'error' });
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
      setMessage({ text: 'Page updated!', type: 'success' });
    } catch (error) {
      console.error('Error updating page:', error);
      setMessage({ text: 'Error updating page', type: 'error' });
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
      setMessage({ text: 'Highlight created!', type: 'success' });
      await loadHighlights();
    } catch (error) {
      console.error('Error creating highlight:', error);
      setMessage({ text: 'Error creating highlight', type: 'error' });
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
      
      setMessage({ text: 'Highlight with note created!', type: 'success' });
      
      // Reload highlights to get the updated highlight with note included
      // This ensures the highlight is loaded with its note from the start
      await loadHighlights();
    } catch (error) {
      console.error('Error creating highlight with note:', error);
      setMessage({ text: 'Error creating highlight with note', type: 'error' });
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
      setMessage({ text: 'Status updated!', type: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ text: 'Error updating status', type: 'error' });
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
      
      setMessage({ text: 'Progress reset!', type: 'success' });
    } catch (error) {
      console.error('Error resetting progress:', error);
      setMessage({ text: 'Error resetting progress', type: 'error' });
    }
  }

  async function handleRatingChange(rating: number | null) {
    if (!article) return;
    try {
      const response = await articlesApi.update(article.id, { rating });
      updateArticleState(response.data);
    } catch (error) {
      console.error('Error updating rating:', error);
      setMessage({ text: 'Error updating rating', type: 'error' });
    }
  }

  const currentTheme = themeStyles[theme];

  const handleToggleTTSBar = () => {
    setShowTTSBar(prev => !prev);
  };

  if (loading) {
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <p>Article not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/inbox')}>Back</Button>
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
          onRatingChange={handleRatingChange}
          onTagsUpdate={updateArticleTagsAndCollections}
          onCollectionsUpdate={updateArticleTagsAndCollections}
          highlights={highlights}
          onHighlightsUpdate={handleHighlightsUpdate}
          contentRef={contentRef}
          onRefresh={handleRefresh}
          tts={tts}
          onToggleTTSBar={handleToggleTTSBar}
          isHighlightingEnabled={isHighlightingEnabled}
          onHighlightingToggle={() => setIsHighlightingEnabled(prev => !prev)}
        />
      </div>

      {/* Article Content */}
      <div 
        style={{ 
          position: 'relative', 
          flex: 1, 
          overflow: 'hidden',
          paddingBottom: showTTSBar ? '80px' : '0',
          transition: 'padding-bottom 0.3s ease',
        }}
      >
        <ArticleContent
          article={article}
          contentRef={contentRef}
          theme={theme}
          fontSize={fontSize}
          lineHeight={lineHeight}
          highlights={highlights}
          isHighlightingEnabled={isHighlightingEnabled}
        />
        
        {/* Highlight Toolbar - appears near selected text */}
        <HighlightToolbar
          articleId={article.id}
          onHighlight={handleCreateHighlight}
          onHighlightWithNote={handleCreateHighlightWithNote}
          theme={theme}
          contentRef={contentRef}
          isEnabled={isHighlightingEnabled}
        />
      </div>

      {/* Fixed TTS Bar */}
      {showTTSBar && (
        <TTSControls
          tts={tts}
          theme={theme}
          fixedBar={true}
          onClose={handleToggleTTSBar}
        />
      )}
    </div>
  );
}
