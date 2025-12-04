import { useState, useEffect } from 'react';
import type { Article } from '../../api/articles';
import { validatePages } from '../../utils/validation';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';

interface PageTrackerProps {
  article: Article;
  onPageChange: (newPage: number) => Promise<void>;
  onPagesUpdate: (totalPages: number | null, currentPage: number | null) => Promise<void>;
  onError: (message: string) => void;
  theme?: Theme;
}

export default function PageTracker({ article, onPageChange, onPagesUpdate, onError, theme = 'light' }: PageTrackerProps) {
  const [isEditingPages, setIsEditingPages] = useState(false);
  const [editingTotalPages, setEditingTotalPages] = useState<string>('');
  const [editingCurrentPage, setEditingCurrentPage] = useState<string>('');
  const currentTheme = themeStyles[theme];

  // Initialize editing values when article changes
  useEffect(() => {
    setEditingTotalPages(article.totalPages?.toString() || '');
    setEditingCurrentPage(article.currentPage?.toString() || '');
  }, [article.totalPages, article.currentPage]);

  const handleSavePages = async () => {
    const totalPages = editingTotalPages ? parseInt(editingTotalPages) : null;
    const currentPage = editingCurrentPage ? parseInt(editingCurrentPage) : null;

    const validation = validatePages(totalPages, currentPage);
    if (!validation.isValid) {
      onError(validation.error || 'Erro de validação');
      return;
    }

    try {
      await onPagesUpdate(totalPages, currentPage);
      setIsEditingPages(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCancel = () => {
    setIsEditingPages(false);
    setEditingTotalPages(article.totalPages?.toString() || '');
    setEditingCurrentPage(article.currentPage?.toString() || '');
  };

  const PageEditForm = () => (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: currentTheme.text }}>
        Total:
        <input
          type="number"
          min="1"
          value={editingTotalPages}
          onChange={(e) => setEditingTotalPages(e.target.value)}
          placeholder="300"
          style={{ 
            width: '70px', 
            padding: '0.2rem', 
            fontSize: '0.75rem',
            backgroundColor: currentTheme.inputBg,
            borderColor: currentTheme.inputBorder,
            color: currentTheme.text
          }}
        />
      </label>
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: currentTheme.text }}>
        Atual:
        <input
          type="number"
          min="0"
          max={editingTotalPages ? parseInt(editingTotalPages) : undefined}
          value={editingCurrentPage}
          onChange={(e) => setEditingCurrentPage(e.target.value)}
          placeholder="45"
          style={{ 
            width: '70px', 
            padding: '0.2rem', 
            fontSize: '0.75rem',
            backgroundColor: currentTheme.inputBg,
            borderColor: currentTheme.inputBorder,
            color: currentTheme.text
          }}
        />
      </label>
      <button
        onClick={handleSavePages}
        className="primary"
        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
      >
        Salvar
      </button>
      <button
        onClick={handleCancel}
        style={{ 
          padding: '0.2rem 0.4rem', 
          fontSize: '0.75rem',
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.text
        }}
      >
        Cancelar
      </button>
    </div>
  );

  if (article.totalPages && article.totalPages > 0) {
    return (
      <div style={{ padding: '0', marginBottom: '0' }}>
        {!isEditingPages ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: currentTheme.text }}>
              Página {article.currentPage || 0} de {article.totalPages}
              {article.currentPage && article.totalPages && (
                <span style={{ color: currentTheme.secondaryText, marginLeft: '0.4rem', fontSize: '0.8rem' }}>
                  ({Math.round(((article.currentPage || 0) / article.totalPages) * 100)}%)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                onClick={() => article.currentPage && onPageChange(Math.max(0, article.currentPage - 1))}
                disabled={!article.currentPage || article.currentPage <= 0}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.75rem',
                  opacity: (!article.currentPage || article.currentPage <= 0) ? 0.5 : 1,
                  cursor: (!article.currentPage || article.currentPage <= 0) ? 'not-allowed' : 'pointer',
                  backgroundColor: currentTheme.buttonBg,
                  color: currentTheme.text
                }}
              >
                ←
              </button>
              <input
                type="number"
                min="0"
                max={article.totalPages}
                value={article.currentPage || 0}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (!isNaN(page) && page >= 0 && page <= article.totalPages!) {
                    onPageChange(page);
                  }
                }}
                style={{
                  width: '55px',
                  padding: '0.2rem',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  backgroundColor: currentTheme.inputBg,
                  borderColor: currentTheme.inputBorder,
                  color: currentTheme.text
                }}
              />
              <button
                onClick={() => article.currentPage !== null && onPageChange(Math.min(article.totalPages!, article.currentPage + 1))}
                disabled={!article.currentPage || article.currentPage >= article.totalPages}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.75rem',
                  opacity: (!article.currentPage || article.currentPage >= article.totalPages) ? 0.5 : 1,
                  cursor: (!article.currentPage || article.currentPage >= article.totalPages) ? 'not-allowed' : 'pointer',
                  backgroundColor: currentTheme.buttonBg,
                  color: currentTheme.text
                }}
              >
                →
              </button>
              <button
                onClick={() => setIsEditingPages(true)}
                style={{ 
                  padding: '0.2rem 0.4rem', 
                  fontSize: '0.75rem',
                  backgroundColor: currentTheme.buttonBg,
                  color: currentTheme.text
                }}
              >
                ✏️
              </button>
            </div>
          </div>
        ) : (
          <PageEditForm />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '0', marginBottom: '0' }}>
      {!isEditingPages ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', color: currentTheme.secondaryText }}>Rastreamento de páginas não configurado</span>
          <button
            onClick={() => setIsEditingPages(true)}
            style={{ 
              padding: '0.2rem 0.4rem', 
              fontSize: '0.75rem',
              backgroundColor: currentTheme.buttonBg,
              color: currentTheme.text
            }}
          >
            ➕ Adicionar
          </button>
        </div>
      ) : (
        <PageEditForm />
      )}
    </div>
  );
}

