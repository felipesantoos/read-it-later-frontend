import { useState, useEffect, useRef } from 'react';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import type { Theme } from '../utils/themeStyles';
import { themeStyles } from '../utils/themeStyles';
import { restoreSelectionFromPosition } from '../utils/highlightUtils';
import Button from './Button';
import { X, Pencil, MessageSquare, Plus, Trash2 } from 'lucide-react';
import '../App.css';

interface HighlightsManagerProps {
  articleId: string;
  currentHighlights?: Highlight[];
  onUpdate?: () => void;
  theme?: Theme;
  compact?: boolean;
  contentRef?: React.RefObject<HTMLDivElement>;
}

export default function HighlightsManager({
  articleId,
  currentHighlights = [],
  onUpdate,
  theme = 'light',
  compact = false,
  contentRef,
}: HighlightsManagerProps) {
  const [allHighlights, setAllHighlights] = useState<Highlight[]>(currentHighlights);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [highlightForNote, setHighlightForNote] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: 'highlight' | 'note' | 'all' | null; id: string | null }>({ isOpen: false, type: null, id: null });

  useEffect(() => {
    if (currentHighlights.length > 0) {
      setAllHighlights(currentHighlights);
      setLoading(false);
    } else {
      loadHighlights();
    }
  }, [currentHighlights]);

  useEffect(() => {
    if (showPopover) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const popoverWidth = 350;
        const viewportWidth = window.innerWidth;
        let left = rect.left;
        
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
      setEditingNoteId(null);
      setNoteContent('');
      setHighlightForNote(null);
    }
  }, [showPopover]);

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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  async function loadHighlights() {
    setLoading(true);
    try {
      const response = await highlightsApi.list({ articleId });
      setAllHighlights(response.data || []);
    } catch (error) {
      console.error('Error loading highlights:', error);
      setMessage({ text: 'Error loading highlights', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteHighlightClick(highlightId: string) {
    setConfirmDialog({ isOpen: true, type: 'highlight', id: highlightId });
  }

  async function handleDeleteHighlightConfirm() {
    if (!confirmDialog.id || confirmDialog.type !== 'highlight') return;

    try {
      await highlightsApi.delete(confirmDialog.id);
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'Highlight deleted', type: 'success' });
      setConfirmDialog({ isOpen: false, type: null, id: null });
    } catch (error) {
      console.error('Error deleting highlight:', error);
      setMessage({ text: 'Error deleting highlight', type: 'error' });
      setConfirmDialog({ isOpen: false, type: null, id: null });
    }
  }

  async function handleNavigateToHighlight(highlight: Highlight) {
    if (!highlight.position || !contentRef?.current) return;

    try {
      // restoreSelectionFromPosition already handles scrolling, so we don't need to scroll again
      const success = restoreSelectionFromPosition(highlight.position, contentRef.current, highlight.id);
      if (success) {
        setMessage({ text: 'Navigating to highlight...', type: 'info' });
      } else {
        setMessage({ text: 'Could not locate highlight in article', type: 'error' });
      }
    } catch (error) {
      console.error('Error navigating to highlight:', error);
      setMessage({ text: 'Error navigating to highlight', type: 'error' });
    }
  }

  async function handleAddNote(highlightId: string) {
    setHighlightForNote(highlightId);
    setNoteContent('');
  }

  async function handleSaveNote() {
    if (!highlightForNote || !noteContent.trim()) return;

    try {
      await highlightsApi.createNote(highlightForNote, noteContent.trim());
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'Note added', type: 'success' });
      setHighlightForNote(null);
      setNoteContent('');
    } catch (error) {
      console.error('Error creating note:', error);
      setMessage({ text: 'Error adding note', type: 'error' });
    }
  }

  async function handleEditNote(noteId: string, currentContent: string) {
    setEditingNoteId(noteId);
    setNoteContent(currentContent);
  }

  async function handleUpdateNote() {
    if (!editingNoteId || !noteContent.trim()) return;

    try {
      await highlightsApi.updateNote(editingNoteId, noteContent.trim());
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'Note updated', type: 'success' });
      setEditingNoteId(null);
      setNoteContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      setMessage({ text: 'Error updating note', type: 'error' });
    }
  }

  function handleDeleteNoteClick(noteId: string) {
    setConfirmDialog({ isOpen: true, type: 'note', id: noteId });
  }

  async function handleDeleteNoteConfirm() {
    if (!confirmDialog.id || confirmDialog.type !== 'note') return;

    try {
      await highlightsApi.deleteNote(confirmDialog.id);
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'Note deleted', type: 'success' });
      setConfirmDialog({ isOpen: false, type: null, id: null });
    } catch (error) {
      console.error('Error deleting note:', error);
      setMessage({ text: 'Error deleting note', type: 'error' });
      setConfirmDialog({ isOpen: false, type: null, id: null });
    }
  }

  function handleDeleteAllClick() {
    setConfirmDialog({ isOpen: true, type: 'all', id: null });
  }

  async function handleDeleteAllConfirm() {
    if (confirmDialog.type !== 'all') return;

    try {
      await highlightsApi.deleteAllByArticle(articleId);
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'All highlights deleted', type: 'success' });
      setConfirmDialog({ isOpen: false, type: null, id: null });
    } catch (error) {
      console.error('Error deleting all highlights:', error);
      setMessage({ text: 'Error deleting all highlights', type: 'error' });
      setConfirmDialog({ isOpen: false, type: null, id: null });
    }
  }

  function handleDeleteCancel() {
    setConfirmDialog({ isOpen: false, type: null, id: null });
  }

  const currentTheme = themeStyles[theme];

  // Compact mode: just show button with badge and popover
  if (compact) {
    return (
      <>
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
            title="Manage highlights"
            style={{
              position: 'relative',
              backgroundColor: currentTheme.buttonBg,
              border: `1px solid ${currentTheme.cardBorder}`,
              color: currentTheme.text,
            }}
          >
            Highlights
            {allHighlights.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  borderRadius: '12px',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  minWidth: '18px',
                  textAlign: 'center',
                  lineHeight: '1.2',
                }}
              >
                {allHighlights.length}
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
                  width: '350px',
                  maxHeight: '500px',
                  display: 'flex',
                  flexDirection: 'column',
                  pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ padding: '0.75rem', borderBottom: `1px solid ${currentTheme.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: currentTheme.text }}>
                    Highlights ({allHighlights.length})
                  </h3>
                  {allHighlights.length > 0 && (
                    <Button
                      variant="icon"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={handleDeleteAllClick}
                      title="Delete all highlights"
                      style={{ color: '#dc3545', padding: '0.25rem' }}
                    />
                  )}
                </div>

                {/* Highlights list */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.5rem',
                }}>
                  {loading ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>Loading...</p>
                  ) : allHighlights.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>
                      No highlights yet
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {allHighlights.map((highlight) => (
                        <div
                          key={highlight.id}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: currentTheme.buttonBg,
                            borderRadius: '4px',
                            border: `1px solid ${currentTheme.cardBorder}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <p
                              style={{
                                fontSize: '0.75rem',
                                margin: 0,
                                fontStyle: 'italic',
                                color: currentTheme.text,
                                flex: 1,
                                cursor: highlight.position ? 'pointer' : 'default',
                              }}
                              onClick={() => highlight.position && handleNavigateToHighlight(highlight)}
                              title={highlight.position ? 'Click to navigate' : ''}
                            >
                              "{highlight.text.length > 100 ? highlight.text.substring(0, 100) + '...' : highlight.text}"
                            </p>
                            <Button
                              variant="icon"
                              size="sm"
                              icon={<X size={14} />}
                              onClick={() => handleDeleteHighlightClick(highlight.id)}
                              title="Delete highlight"
                              style={{ color: '#dc3545', padding: '0 0.25rem', flexShrink: 0 }}
                            />
                          </div>
                          
                          {/* Notes section */}
                          {highlight.notes && highlight.notes.length > 0 && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${currentTheme.cardBorder}` }}>
                              {highlight.notes.map((note) => (
                                <div key={note.id} style={{ marginBottom: '0.25rem' }}>
                                  {editingNoteId === note.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                      <textarea
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        style={{
                                          width: '100%',
                                          minHeight: '40px',
                                          padding: '0.25rem',
                                          fontSize: '0.7rem',
                                          border: `1px solid ${currentTheme.cardBorder}`,
                                          borderRadius: '4px',
                                          backgroundColor: currentTheme.inputBg,
                                          color: currentTheme.text,
                                          resize: 'vertical',
                                          fontFamily: 'inherit',
                                        }}
                                        autoFocus
                                      />
                                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingNoteId(null);
                                            setNoteContent('');
                                          }}
                                          style={{
                                            padding: '0.15rem 0.5rem',
                                            fontSize: '0.7rem',
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
                                          onClick={handleUpdateNote}
                                          disabled={!noteContent.trim()}
                                          style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                                        >
                                          Save
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.25rem' }}>
                                      <p style={{ fontSize: '0.7rem', margin: 0, color: currentTheme.secondaryText, flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <MessageSquare size={12} /> {note.content}
                                      </p>
                                      <div style={{ display: 'flex', gap: '0.15rem' }}>
                                        <Button
                                          variant="icon"
                                          size="sm"
                                          icon={<Pencil size={12} />}
                                          onClick={() => handleEditNote(note.id, note.content)}
                                          title="Edit note"
                                          style={{ color: '#007bff', padding: '0 0.15rem' }}
                                        />
                                        <Button
                                          variant="icon"
                                          size="sm"
                                          icon={<X size={12} />}
                                          onClick={() => handleDeleteNoteClick(note.id)}
                                          title="Delete note"
                                          style={{ color: '#dc3545', padding: '0 0.15rem' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add note section */}
                          {highlightForNote === highlight.id ? (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${currentTheme.cardBorder}` }}>
                              <textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Add note..."
                                style={{
                                  width: '100%',
                                  minHeight: '40px',
                                  padding: '0.25rem',
                                  fontSize: '0.7rem',
                                  border: `1px solid ${currentTheme.cardBorder}`,
                                  borderRadius: '4px',
                                  backgroundColor: currentTheme.inputBg,
                                  color: currentTheme.text,
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                }}
                                autoFocus
                              />
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setHighlightForNote(null);
                                    setNoteContent('');
                                  }}
                                  style={{
                                    padding: '0.15rem 0.5rem',
                                    fontSize: '0.7rem',
                                    backgroundColor: currentTheme.buttonBg,
                                    border: `1px solid ${currentTheme.cardBorder}`,
                                    color: currentTheme.text,
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handleSaveNote}
                                  disabled={!noteContent.trim()}
                                  style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.5rem' }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Plus size={12} />}
                                onClick={() => handleAddNote(highlight.id)}
                                style={{
                                  padding: '0.15rem 0.5rem',
                                  fontSize: '0.7rem',
                                  backgroundColor: 'transparent',
                                  color: '#007bff',
                                  textDecoration: 'underline',
                                }}
                              >
                                Add note
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'highlight'}
        message="Are you sure you want to delete this highlight?"
        onConfirm={handleDeleteHighlightConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'note'}
        message="Are you sure you want to delete this note?"
        onConfirm={handleDeleteNoteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === 'all'}
        message={`Are you sure you want to delete all ${allHighlights.length} highlight${allHighlights.length !== 1 ? 's' : ''} and their notes? This action cannot be undone.`}
        onConfirm={handleDeleteAllConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete All"
        cancelText="Cancel"
      />
      </>
    );
  }

  // Full mode (not used in compact, but keeping for consistency)
  return null;
}

