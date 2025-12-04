import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from '../components/Toast';
import ReaderHeader from '../components/reader/ReaderHeader';
import ReadingControls from '../components/reader/ReadingControls';
import PageTracker from '../components/reader/PageTracker';
import ArticleContent from '../components/reader/ArticleContent';
import { ArticleTagsAndCollections, ArticleHighlights } from '../components/reader/ArticleMetadata';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { validatePageChange } from '../utils/validation';
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
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
    <div className="widget-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 2rem)', overflow: 'hidden' }}>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      {/* Fixed Actions Bar at the top */}
      <div style={{ flexShrink: 0 }}>
        {/* Header */}
        <ReaderHeader
          article={article}
          theme={theme}
          onThemeChange={setTheme}
        />

      {/* Article Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.4rem', lineHeight: 1.3 }}>
          {article.title || article.url}
        </h1>
        {article.description && (
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 0 }}>
            {article.description}
          </p>
        )}
      </div>

      {/* All Actions and Controls - Horizontal Layout */}
      <div className="actions-grid-3" style={{ marginBottom: '0.75rem', alignItems: 'stretch' }}>
        {/* Column 1: Reading Controls */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.4rem', height: '100%' }}>
            <ReadingControls
              article={article}
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
            />
          </div>
        </div>

        {/* Column 2: Progress and Page Tracking */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.5rem', height: '100%' }}>
            {(article.readingProgress > 0 || article.totalPages) && (
              <div style={{ 
                height: '4px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '2px', 
                overflow: 'hidden', 
                marginBottom: '0.5rem' 
              }}>
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

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <PageTracker
                article={article}
                onPageChange={handlePageChange}
                onPagesUpdate={handlePagesUpdate}
                onError={(error) => setMessage({ text: error, type: 'error' })}
              />

              {article.readingProgress > 0 && !article.totalPages && (
                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.4rem', textAlign: 'center' }}>
                  {Math.round(article.readingProgress * 100)}% lido
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Tags and Collections */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, height: '100%' }}>
            <ArticleTagsAndCollections
              article={article}
              onTagsUpdate={updateArticleTagsAndCollections}
              onCollectionsUpdate={updateArticleTagsAndCollections}
            />
          </div>
        </div>

        {/* Row 2: Highlights Section - spans all columns */}
        <div style={{ gridColumn: '1 / -1' }}>
          <ArticleHighlights highlights={highlights} />
        </div>
      </div>
      </div>

      {/* Separator */}
      <div style={{ 
        borderTop: '2px solid #e0e0e0', 
        marginTop: '1rem', 
        marginBottom: '1rem',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-0.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '0 0.5rem',
          fontSize: '0.75rem',
          color: '#666',
          fontWeight: 500
        }}>
          Conteúdo
        </div>
      </div>

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
