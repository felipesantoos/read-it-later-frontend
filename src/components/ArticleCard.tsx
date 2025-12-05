import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/articles';
import { statusColors, statusLabels, allStatuses, getStatusTextColor } from '../constants/articleStatus';
import { extractTextFromHtml } from '../utils/textUtils';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';
import { Heart, Archive, Trash2, Star, BookOpen, Check } from 'lucide-react';
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
  const statusButtonRef = useRef<HTMLSpanElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; right?: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean }>({ isOpen: false });

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

  const handleRatingChange = async (rating: number | null) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      // If clicking the same rating, remove it (set to null)
      const newRating = article.rating === rating ? null : rating;
      await articlesApi.update(article.id, { rating: newRating });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating rating:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    setConfirmDialog({ isOpen: true });
  };

  const handleDeleteConfirm = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await articlesApi.delete(article.id);
      setConfirmDialog({ isOpen: false });
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting article:', error);
      setConfirmDialog({ isOpen: false });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDialog({ isOpen: false });
  };

  const formatReadingTime = (seconds: number | null) => {
    if (!seconds) return '';
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  };

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isStatusDropdownOpen && statusButtonRef.current) {
      const rect = statusButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        left: rect.left,
      });
    } else {
      setDropdownPosition(null);
    }
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
            alt={extractTextFromHtml(article.title) || ''}
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
              {extractTextFromHtml(article.title) || article.url}
            </h3>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
              {article.isFavorited && (
                <Star size={14} style={{ color: '#ffc107' }} />
              )}
              <div 
                style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}
                onClick={(e) => e.stopPropagation()}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={12}
                    style={{
                      color: article.rating !== null && star <= article.rating ? '#ffc107' : '#ccc',
                      cursor: 'pointer',
                      fill: article.rating !== null && star <= article.rating ? '#ffc107' : 'none',
                      transition: 'color 0.2s',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRatingChange(star);
                    }}
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        (e.currentTarget as SVGSVGElement).style.color = '#ffc107';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUpdating) {
                        const currentColor = article.rating !== null && star <= article.rating ? '#ffc107' : '#ccc';
                        (e.currentTarget as SVGSVGElement).style.color = currentColor;
                      }
                    }}
                  />
                ))}
              </div>
              <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                <span
                  ref={statusButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  }}
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: statusColors[article.status],
                    color: getStatusTextColor(statusColors[article.status]),
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
                {isStatusDropdownOpen && dropdownPosition && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                      }}
                      onClick={() => setIsStatusDropdownOpen(false)}
                    />
                    <div
                      style={{
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        zIndex: 10000,
                        minWidth: '120px',
                        overflow: 'hidden',
                      }}
                      onClick={(e) => e.stopPropagation()}
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
                          <Check size={14} style={{ marginLeft: '0.5rem', color: statusColors[status] }} />
                        )}
                      </div>
                    ))}
                    </div>
                  </>
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
                📄 {article.currentPage || 0}/{article.totalPages} pages
                {article.currentPage && article.totalPages && (
                  <span style={{ marginLeft: '0.25rem' }}>
                    ({Math.round(((article.currentPage || 0) / article.totalPages) * 100)}%)
                  </span>
                )}
              </span>
            ) : article.readingProgress > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#999', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <BookOpen size={12} /> {Math.round(article.readingProgress * 100)}%
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
            <Button
              variant="ghost"
              size="sm"
              icon={<Heart size={14} fill={article.isFavorited ? 'currentColor' : 'none'} />}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              disabled={isUpdating}
              title={article.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              style={{ 
                fontSize: '0.7rem', 
                padding: '0.25rem 0.5rem',
                color: article.isFavorited ? '#dc3545' : 'inherit'
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Archive size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(article.status === 'ARCHIVED' ? 'UNREAD' : 'ARCHIVED');
              }}
              disabled={isUpdating}
              title={article.status === 'ARCHIVED' ? 'Desarquivar' : 'Arquivar'}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            />
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              disabled={isUpdating}
              title="Delete article"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            />
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message="Are you sure you want to delete this article?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

