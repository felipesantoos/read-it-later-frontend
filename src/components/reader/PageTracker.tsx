import { useState, useEffect } from 'react';
import type { Article } from '../../api/articles';
import { validatePages } from '../../utils/validation';

interface PageTrackerProps {
  article: Article;
  onPageChange: (newPage: number) => Promise<void>;
  onPagesUpdate: (totalPages: number | null, currentPage: number | null) => Promise<void>;
  onError: (message: string) => void;
}

export default function PageTracker({ article, onPageChange, onPagesUpdate, onError }: PageTrackerProps) {
  const [isEditingPages, setIsEditingPages] = useState(false);
  const [editingTotalPages, setEditingTotalPages] = useState<string>('');
  const [editingCurrentPage, setEditingCurrentPage] = useState<string>('');

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
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
        Total:
        <input
          type="number"
          min="1"
          value={editingTotalPages}
          onChange={(e) => setEditingTotalPages(e.target.value)}
          placeholder="300"
          style={{ width: '70px', padding: '0.2rem', fontSize: '0.75rem' }}
        />
      </label>
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
        Atual:
        <input
          type="number"
          min="0"
          max={editingTotalPages ? parseInt(editingTotalPages) : undefined}
          value={editingCurrentPage}
          onChange={(e) => setEditingCurrentPage(e.target.value)}
          placeholder="45"
          style={{ width: '70px', padding: '0.2rem', fontSize: '0.75rem' }}
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
        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
      >
        Cancelar
      </button>
    </div>
  );

  if (article.totalPages && article.totalPages > 0) {
    return (
      <div className="card" style={{ padding: '0.5rem', marginBottom: '0.4rem' }}>
        {!isEditingPages ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
              Página {article.currentPage || 0} de {article.totalPages}
              {article.currentPage && article.totalPages && (
                <span style={{ color: '#666', marginLeft: '0.4rem', fontSize: '0.8rem' }}>
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
                  cursor: (!article.currentPage || article.currentPage <= 0) ? 'not-allowed' : 'pointer'
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
                  textAlign: 'center'
                }}
              />
              <button
                onClick={() => article.currentPage !== null && onPageChange(Math.min(article.totalPages!, article.currentPage + 1))}
                disabled={!article.currentPage || article.currentPage >= article.totalPages}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.75rem',
                  opacity: (!article.currentPage || article.currentPage >= article.totalPages) ? 0.5 : 1,
                  cursor: (!article.currentPage || article.currentPage >= article.totalPages) ? 'not-allowed' : 'pointer'
                }}
              >
                →
              </button>
              <button
                onClick={() => setIsEditingPages(true)}
                style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
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
    <div className="card" style={{ padding: '0.5rem', marginBottom: '0.4rem' }}>
      {!isEditingPages ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>Rastreamento de páginas não configurado</span>
          <button
            onClick={() => setIsEditingPages(true)}
            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
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

