import { useState, useEffect, useRef } from 'react';
import { tagsApi, type Tag } from '../api/tags';
import Toast from './Toast';
import type { Theme } from '../utils/themeStyles';
import '../App.css';

interface TagsManagerProps {
  articleId: string;
  currentTags?: Array<{ tag: Tag | { id: string; name: string } }>;
  onUpdate?: () => void;
  theme?: Theme;
}

export default function TagsManager({ articleId, currentTags = [], onUpdate, theme = 'light' }: TagsManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    if (showPopover) {
      const assignedIds = new Set(currentTags.map(at => at.tag.id));
      setSelectedTagIds(assignedIds);
      setSearchQuery('');
      
      // Calculate popover position (fixed is relative to viewport)
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const popoverWidth = 300; // Approximate width
        const viewportWidth = window.innerWidth;
        let left = rect.left;
        
        // Adjust if popover would overflow on the right
        if (left + popoverWidth > viewportWidth) {
          left = Math.max(8, viewportWidth - popoverWidth - 8);
        }
        
        setPopoverPosition({
          top: rect.bottom + 4,
          left: left,
        });
      }
    } else {
      setPopoverPosition(null);
    }
  }, [showPopover, currentTags]);


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

  async function handleApplyTags() {
    const currentAssignedIds = new Set(currentTags.map(at => at.tag.id));
    
    // Tags to add
    const toAdd = Array.from(selectedTagIds).filter(id => !currentAssignedIds.has(id));
    // Tags to remove
    const toRemove = Array.from(currentAssignedIds).filter(id => !selectedTagIds.has(id));

    try {
      // Add new tags
      for (const tagId of toAdd) {
        await tagsApi.addToArticle(tagId, articleId);
      }
      // Remove tags
      for (const tagId of toRemove) {
        await tagsApi.removeFromArticle(tagId, articleId);
      }
      
      onUpdate?.();
      setShowPopover(false);
      setMessage({ text: 'Tags atualizadas', type: 'success' });
    } catch (error) {
      console.error('Error applying tags:', error);
      setMessage({ text: 'Erro ao atualizar tags', type: 'error' });
    }
  }

  function handleToggleSelection(tagId: string) {
    const newSelected = new Set(selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTagIds(newSelected);
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

  const filteredTags = allTags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="card" style={{ padding: '0.5rem', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Assigned tags display */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, marginRight: '0.25rem' }}>Tags:</span>
          {currentTags.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>Nenhuma tag atribuída</span>
          ) : (
            <>
              {currentTags.map((at) => {
                const tag = at.tag;
                return (
                  <div
                    key={tag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleTag(tag.id)}
                    title="Clique para remover"
                  >
                    <span>{tag.name}</span>
                  </div>
                );
              })}
            </>
          )}
          <div style={{ position: 'relative' }} data-popover-container>
            <button
              ref={buttonRef}
              onClick={() => setShowPopover(!showPopover)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: '#e9ecef',
                border: '1px solid #dee2e6',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
              title="Adicionar tag"
            >
              +
            </button>

            {/* Popover */}
            {showPopover && popoverPosition && (
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
                  onClick={() => {
                    setShowPopover(false);
                    setSearchQuery('');
                    const assignedIds = new Set(currentTags.map(at => at.tag.id));
                    setSelectedTagIds(assignedIds);
                  }}
                />
                <div
                  style={{
                    position: 'fixed',
                    top: `${popoverPosition.top}px`,
                    left: `${popoverPosition.left}px`,
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 10000,
                    minWidth: '250px',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Search input */}
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                  <input
                    type="text"
                    placeholder="Buscar tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                    }}
                    autoFocus
                  />
                </div>

                {/* Create new tag */}
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', gap: '0.25rem' }}>
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
                    style={{
                      flex: 1,
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                    }}
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Criar
                  </button>
                </div>

                {/* Tags list */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.5rem',
                  maxHeight: '250px',
                }}>
                  {loading ? (
                    <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>Carregando...</p>
                  ) : filteredTags.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                      {searchQuery ? 'Nenhuma tag encontrada' : 'Nenhuma tag ainda'}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {filteredTags.map((tag) => {
                        const isSelected = selectedTagIds.has(tag.id);
                        return (
                          <div
                            key={tag.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? '#e7f3ff' : 'transparent',
                            }}
                            onClick={() => handleToggleSelection(tag.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelection(tag.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '0.75rem', flex: 1 }}>{tag.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '0 0.25rem',
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

                {/* Actions */}
                <div style={{
                  padding: '0.5rem',
                  borderTop: '1px solid #dee2e6',
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={() => {
                      setShowPopover(false);
                      setSearchQuery('');
                      const assignedIds = new Set(currentTags.map(at => at.tag.id));
                      setSelectedTagIds(assignedIds);
                    }}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApplyTags}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Aplicar
                  </button>
                </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

