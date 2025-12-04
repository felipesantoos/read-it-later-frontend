import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import '../App.css';

interface ArticleCardProps {
  article: Article;
  onUpdate?: () => void;
}

export default function ArticleCard({ article, onUpdate }: ArticleCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const handleStatusChange = async (newStatus: Article['status']) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await articlesApi.update(article.id, { status: newStatus });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating article:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await articlesApi.update(article.id, { isFavorited: !article.isFavorited });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating article:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este artigo?')) return;
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await articlesApi.delete(article.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting article:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatReadingTime = (seconds: number | null) => {
    if (!seconds) return '';
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  };

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

  const handleStatusSelect = async (newStatus: Article['status']) => {
    setIsStatusDropdownOpen(false);
    await handleStatusChange(newStatus);
  };

  return (
    <div 
      className="card" 
      style={{ padding: '0.75rem', cursor: 'pointer' }} 
      onClick={() => navigate(`/reader/${article.id}`)}
      data-article-card
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/reader/${article.id}`);
        }
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title || ''}
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'cover',
              borderRadius: '4px',
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {article.title || article.url}
            </h3>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
              {article.isFavorited && (
                <span style={{ fontSize: '0.8rem' }} title="Favorito">⭐</span>
              )}
              <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  }}
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.4rem',
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
                  {statusLabels[article.status]} ▼
                </span>
                {isStatusDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(status);
                        }}
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
            </div>
          </div>
          {article.description && (
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.25rem 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {article.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {article.siteName && (
              <span style={{ fontSize: '0.75rem', color: '#999' }}>{article.siteName}</span>
            )}
            {article.readingTime && (
              <span style={{ fontSize: '0.75rem', color: '#999' }}>⏱ {formatReadingTime(article.readingTime)}</span>
            )}
            {article.totalPages && article.totalPages > 0 ? (
              <span style={{ fontSize: '0.75rem', color: '#999' }}>
                📄 {article.currentPage || 0}/{article.totalPages} páginas
                {article.currentPage && article.totalPages && (
                  <span style={{ marginLeft: '0.25rem' }}>
                    ({Math.round(((article.currentPage || 0) / article.totalPages) * 100)}%)
                  </span>
                )}
              </span>
            ) : article.readingProgress > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#999' }}>
                📖 {Math.round(article.readingProgress * 100)}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {article.articleTags && article.articleTags.length > 0 && (
              <>
                {article.articleTags.map((at) => (
                  <span
                    key={at.tag.id}
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.4rem',
                      backgroundColor: '#e9ecef',
                      borderRadius: '12px',
                    }}
                  >
                    {at.tag.name}
                  </span>
                ))}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              disabled={isUpdating}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
              title={article.isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              {article.isFavorited ? '❤️' : '🤍'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(article.status === 'ARCHIVED' ? 'UNREAD' : 'ARCHIVED');
              }}
              disabled={isUpdating}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              📦
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isUpdating}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: '#dc3545', color: 'white' }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

