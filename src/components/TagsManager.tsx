import { useState, useEffect, useRef } from 'react';
import { tagsApi, type Tag } from '../api/tags';
import Toast from './Toast';
import type { Theme } from '../utils/themeStyles';
import { themeStyles } from '../utils/themeStyles';
import Button from './Button';
import { Plus, X } from 'lucide-react';
import '../App.css';

interface TagsManagerProps {
  articleId: string;
  currentTags?: Array<{ tag: Tag | { id: string; name: string } }>;
  onUpdate?: () => void;
  theme?: Theme;
  compact?: boolean;
}

export default function TagsManager({ articleId, currentTags = [], onUpdate, theme = 'light', compact = false }: TagsManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Handle click outside to close popover
  useEffect(() => {
    if (!showPopover) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
        setSearchQuery('');
        const assignedIds = new Set(currentTags.map(at => at.tag.id));
        setSelectedTagIds(assignedIds);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      setMessage({ text: 'Tag created!', type: 'success' });
    } catch (error) {
      console.error('Error creating tag:', error);
      setMessage({ text: 'Error creating tag', type: 'error' });
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
      setMessage({ text: 'Tags updated', type: 'success' });
    } catch (error) {
      console.error('Error applying tags:', error);
      setMessage({ text: 'Error updating tags', type: 'error' });
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
      setMessage({ text: isAssigned ? 'Tag removed' : 'Tag added', type: 'success' });
    } catch (error) {
      console.error('Error toggling tag:', error);
      setMessage({ text: 'Error updating tag', type: 'error' });
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await tagsApi.delete(tagId);
      await loadTags();
      setMessage({ text: 'Tag deleted', type: 'success' });
    } catch (error) {
      console.error('Error deleting tag:', error);
      setMessage({ text: 'Error deleting tag', type: 'error' });
    }
  }

  const filteredTags = allTags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTheme = themeStyles[theme];

  // Compact mode: just show button with badge and popover
  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
            duration={3000}
          />
        )}
        <div style={{ position: 'relative' }} data-popover-container>
          <Button
            ref={buttonRef}
            variant="ghost"
            size="sm"
            onClick={() => setShowPopover(!showPopover)}
            title="Manage tags"
            style={{
              position: 'relative',
              backgroundColor: currentTheme.buttonBg,
              border: `1px solid ${currentTheme.cardBorder}`,
              color: currentTheme.text,
            }}
          >
            Tags
            {currentTags.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  minWidth: '18px',
                  textAlign: 'center',
                  lineHeight: '1.2',
                }}
              >
                {currentTags.length}
              </span>
            )}
          </Button>
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
                  pointerEvents: 'none',
                }}
              />
              <div
                ref={popoverRef}
                style={{
                  position: 'fixed',
                  top: `${popoverPosition.top}px`,
                  left: `${popoverPosition.left}px`,
                  backgroundColor: currentTheme.cardBg,
                  border: `1px solid ${currentTheme.cardBorder}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 10000,
                  minWidth: '250px',
                  maxWidth: '400px',
                  maxHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search input */}
                <div style={{ padding: '0.5rem', borderBottom: `1px solid ${currentTheme.cardBorder}` }}>
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: `1px solid ${currentTheme.cardBorder}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.inputBg,
                      color: currentTheme.text,
                    }}
                    autoFocus
                  />
                </div>

                {/* Create new tag */}
                <div style={{ padding: '0.5rem', borderBottom: `1px solid ${currentTheme.cardBorder}`, display: 'flex', gap: '0.25rem' }}>
                  <input
                    type="text"
                    placeholder="New tag..."
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
                      border: `1px solid ${currentTheme.cardBorder}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.inputBg,
                      color: currentTheme.text,
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    style={{
                      whiteSpace: 'nowrap',
                      backgroundColor: currentTheme.buttonBg,
                      border: `1px solid ${currentTheme.cardBorder}`,
                      color: currentTheme.text,
                    }}
                  >
                    Create
                  </Button>
                </div>

                {/* Tags list */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.5rem',
                  maxHeight: '250px',
                }}>
                  {loading ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>Loading...</p>
                  ) : filteredTags.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>
                      {searchQuery ? 'No tags found' : 'No tags yet'}
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
                              backgroundColor: isSelected ? (theme === 'dark' ? '#1e3a5f' : '#e7f3ff') : 'transparent',
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
                            <span style={{ fontSize: '0.75rem', flex: 1, color: currentTheme.text }}>{tag.name}</span>
                            <Button
                              variant="icon"
                              size="sm"
                              icon={<X size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                              }}
                              title="Delete tag"
                              style={{ color: '#dc3545', padding: '0 0.25rem' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  padding: '0.5rem',
                  borderTop: `1px solid ${currentTheme.cardBorder}`,
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPopover(false);
                      setSearchQuery('');
                      const assignedIds = new Set(currentTags.map(at => at.tag.id));
                      setSelectedTagIds(assignedIds);
                    }}
                    style={{
                      backgroundColor: currentTheme.buttonBg,
                      border: `1px solid ${currentTheme.cardBorder}`,
                      color: currentTheme.text,
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyTags}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Full mode: original implementation
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
            <span style={{ fontSize: '0.75rem', color: '#666' }}>No tags assigned</span>
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
                    title="Click to remove"
                  >
                    <span>{tag.name}</span>
                  </div>
                );
              })}
            </>
          )}
          <div style={{ position: 'relative' }} data-popover-container>
            <Button
              ref={buttonRef}
              variant="icon"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowPopover(!showPopover)}
              title="Add tag"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: currentTheme.buttonBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
              }}
            />

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
                    pointerEvents: 'none',
                  }}
                />
                <div
                  ref={popoverRef}
                  style={{
                    position: 'fixed',
                    top: `${popoverPosition.top}px`,
                    left: `${popoverPosition.left}px`,
                    backgroundColor: currentTheme.cardBg,
                    border: `1px solid ${currentTheme.cardBorder}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 10000,
                    minWidth: '250px',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Search input */}
                <div style={{ padding: '0.5rem', borderBottom: `1px solid ${currentTheme.cardBorder}` }}>
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: `1px solid ${currentTheme.cardBorder}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.inputBg,
                      color: currentTheme.text,
                    }}
                    autoFocus
                  />
                </div>

                {/* Create new tag */}
                <div style={{ padding: '0.5rem', borderBottom: `1px solid ${currentTheme.cardBorder}`, display: 'flex', gap: '0.25rem' }}>
                  <input
                    type="text"
                    placeholder="New tag..."
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
                      border: `1px solid ${currentTheme.cardBorder}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.inputBg,
                      color: currentTheme.text,
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    style={{
                      whiteSpace: 'nowrap',
                      backgroundColor: currentTheme.buttonBg,
                      border: `1px solid ${currentTheme.cardBorder}`,
                      color: currentTheme.text,
                    }}
                  >
                    Create
                  </Button>
                </div>

                {/* Tags list */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.5rem',
                  maxHeight: '250px',
                }}>
                  {loading ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>Loading...</p>
                  ) : filteredTags.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>
                      {searchQuery ? 'No tags found' : 'No tags yet'}
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
                              backgroundColor: isSelected ? (theme === 'dark' ? '#1e3a5f' : '#e7f3ff') : 'transparent',
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
                            <span style={{ fontSize: '0.75rem', flex: 1, color: currentTheme.text }}>{tag.name}</span>
                            <Button
                              variant="icon"
                              size="sm"
                              icon={<X size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                              }}
                              title="Delete tag"
                              style={{ color: '#dc3545', padding: '0 0.25rem' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  padding: '0.5rem',
                  borderTop: `1px solid ${currentTheme.cardBorder}`,
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPopover(false);
                      setSearchQuery('');
                      const assignedIds = new Set(currentTags.map(at => at.tag.id));
                      setSelectedTagIds(assignedIds);
                    }}
                    style={{
                      backgroundColor: currentTheme.buttonBg,
                      border: `1px solid ${currentTheme.cardBorder}`,
                      color: currentTheme.text,
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyTags}
                  >
                    Apply
                  </Button>
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

