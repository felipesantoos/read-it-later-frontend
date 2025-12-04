import { useState, useEffect } from 'react';
import { tagsApi, type Tag } from '../api/tags';
import Toast from './Toast';
import '../App.css';

interface TagsManagerProps {
  articleId: string;
  currentTags?: Array<{ tag: Tag }>;
  onUpdate?: () => void;
}

export default function TagsManager({ articleId, currentTags = [], onUpdate }: TagsManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const response = await tagsApi.list();
      setAllTags(response.data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;

    try {
      await tagsApi.create({ name: newTagName.trim() });
      setNewTagName('');
      await loadTags();
      setMessage({ text: 'Tag criada!', type: 'success' });
    } catch (error) {
      console.error('Error creating tag:', error);
      setMessage({ text: 'Erro ao criar tag', type: 'error' });
    }
  }

  async function handleToggleTag(tagId: string) {
    const isAssigned = currentTags.some(at => at.tag.id === tagId);
    
    try {
      if (isAssigned) {
        await tagsApi.removeFromArticle(tagId, articleId);
      } else {
        await tagsApi.addToArticle(tagId, articleId);
      }
      onUpdate?.();
      setMessage({ text: isAssigned ? 'Tag removida' : 'Tag adicionada', type: 'success' });
    } catch (error) {
      console.error('Error toggling tag:', error);
      setMessage({ text: 'Erro ao atualizar tag', type: 'error' });
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm('Tem certeza que deseja deletar esta tag?')) return;

    try {
      await tagsApi.delete(tagId);
      await loadTags();
      setMessage({ text: 'Tag deletada', type: 'success' });
    } catch (error) {
      console.error('Error deleting tag:', error);
      setMessage({ text: 'Erro ao deletar tag', type: 'error' });
    }
  }

  const assignedTagIds = new Set(currentTags.map(at => at.tag.id));

  return (
    <div>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tags</h4>
        
        {/* Create new tag */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            placeholder="Nova tag..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateTag();
              }
            }}
            style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          />
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            +
          </button>
        </div>

        {/* Tags list */}
        {loading ? (
          <p style={{ fontSize: '0.75rem', color: '#666' }}>Carregando...</p>
        ) : allTags.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: '#666' }}>Nenhuma tag ainda</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {allTags.map((tag) => {
              const isAssigned = assignedTagIds.has(tag.id);
              return (
                <div
                  key={tag.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: isAssigned ? '#007bff' : '#e9ecef',
                    color: isAssigned ? 'white' : '#333',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggleTag(tag.id)}
                  title={isAssigned ? 'Clique para remover' : 'Clique para adicionar'}
                >
                  <span>{tag.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: 0,
                      marginLeft: '0.25rem',
                    }}
                    title="Deletar tag"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

