import { useState } from 'react';
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
    FAVORITED: '#ffc107',
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
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                backgroundColor: statusColors[article.status],
                color: 'white',
                flexShrink: 0,
              }}
            >
              {article.status}
            </span>
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
            {article.readingProgress > 0 && (
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
                handleStatusChange(article.status === 'FAVORITED' ? 'UNREAD' : 'FAVORITED');
              }}
              disabled={isUpdating}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              {article.status === 'FAVORITED' ? '❤️' : '🤍'}
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

