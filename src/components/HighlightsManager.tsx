import { useState, useEffect, useRef } from 'react';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from './Toast';
import type { Theme } from '../utils/themeStyles';
import { themeStyles } from '../utils/themeStyles';
import { restoreSelectionFromPosition } from '../utils/highlightUtils';
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

  async function loadHighlights() {
    setLoading(true);
    try {
      const response = await highlightsApi.list({ articleId });
      setAllHighlights(response.data || []);
    } catch (error) {
      console.error('Error loading highlights:', error);
      setMessage({ text: 'Erro ao carregar highlights', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteHighlight(highlightId: string) {
    if (!confirm('Tem certeza que deseja deletar este highlight?')) return;

    try {
      await highlightsApi.delete(highlightId);
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'Highlight deletado', type: 'success' });
    } catch (error) {
      console.error('Error deleting highlight:', error);
      setMessage({ text: 'Erro ao deletar highlight', type: 'error' });
    }
  }

  async function handleNavigateToHighlight(highlight: Highlight) {
    if (!highlight.position || !contentRef?.current) return;

    try {
      const success = restoreSelectionFromPosition(highlight.position, contentRef.current, highlight.id);
      if (success) {
        // Scroll to selection
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.getBoundingClientRect();
          range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setMessage({ text: 'Navegando para highlight...', type: 'info' });
      } else {
        setMessage({ text: 'Não foi possível localizar o highlight no artigo', type: 'error' });
      }
    } catch (error) {
      console.error('Error navigating to highlight:', error);
      setMessage({ text: 'Erro ao navegar para highlight', type: 'error' });
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
      setMessage({ text: 'Nota adicionada', type: 'success' });
      setHighlightForNote(null);
      setNoteContent('');
    } catch (error) {
      console.error('Error creating note:', error);
      setMessage({ text: 'Erro ao adicionar nota', type: 'error' });
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
      setMessage({ text: 'Nota atualizada', type: 'success' });
      setEditingNoteId(null);
      setNoteContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      setMessage({ text: 'Erro ao atualizar nota', type: 'error' });
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Tem certeza que deseja deletar esta nota?')) return;

    try {
      await highlightsApi.deleteNote(noteId);
      await loadHighlights();
      onUpdate?.();
      setMessage({ text: 'Nota deletada', type: 'success' });
    } catch (error) {
      console.error('Error deleting note:', error);
      setMessage({ text: 'Erro ao deletar nota', type: 'error' });
    }
  }

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
          <button
            ref={buttonRef}
            onClick={() => setShowPopover(!showPopover)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: currentTheme.buttonBg,
              border: `1px solid ${currentTheme.cardBorder}`,
              borderRadius: '4px',
              cursor: 'pointer',
              color: currentTheme.text,
              position: 'relative',
            }}
            title="Gerenciar highlights"
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
          </button>
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
                }}
              />
              <div
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
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ padding: '0.75rem', borderBottom: `1px solid ${currentTheme.cardBorder}` }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: currentTheme.text }}>
                    Highlights ({allHighlights.length})
                  </h3>
                </div>

                {/* Highlights list */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.5rem',
                }}>
                  {loading ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>Carregando...</p>
                  ) : allHighlights.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, textAlign: 'center' }}>
                      Nenhum highlight ainda
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
                              title={highlight.position ? 'Clique para navegar' : ''}
                            >
                              "{highlight.text.length > 100 ? highlight.text.substring(0, 100) + '...' : highlight.text}"
                            </p>
                            <button
                              onClick={() => handleDeleteHighlight(highlight.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '0 0.25rem',
                                flexShrink: 0,
                              }}
                              title="Deletar highlight"
                            >
                              ×
                            </button>
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
                                        <button
                                          onClick={() => {
                                            setEditingNoteId(null);
                                            setNoteContent('');
                                          }}
                                          style={{
                                            padding: '0.15rem 0.5rem',
                                            fontSize: '0.7rem',
                                            backgroundColor: currentTheme.buttonBg,
                                            color: currentTheme.text,
                                            border: `1px solid ${currentTheme.cardBorder}`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={handleUpdateNote}
                                          disabled={!noteContent.trim()}
                                          style={{
                                            padding: '0.15rem 0.5rem',
                                            fontSize: '0.7rem',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: noteContent.trim() ? 'pointer' : 'not-allowed',
                                            opacity: noteContent.trim() ? 1 : 0.5,
                                          }}
                                        >
                                          Salvar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.25rem' }}>
                                      <p style={{ fontSize: '0.7rem', margin: 0, color: currentTheme.secondaryText, flex: 1 }}>
                                        💬 {note.content}
                                      </p>
                                      <div style={{ display: 'flex', gap: '0.15rem' }}>
                                        <button
                                          onClick={() => handleEditNote(note.id, note.content)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#007bff',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            padding: '0 0.15rem',
                                          }}
                                          title="Editar nota"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDeleteNote(note.id)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#dc3545',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            padding: '0 0.15rem',
                                          }}
                                          title="Deletar nota"
                                        >
                                          ×
                                        </button>
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
                                placeholder="Adicionar nota..."
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
                                <button
                                  onClick={() => {
                                    setHighlightForNote(null);
                                    setNoteContent('');
                                  }}
                                  style={{
                                    padding: '0.15rem 0.5rem',
                                    fontSize: '0.7rem',
                                    backgroundColor: currentTheme.buttonBg,
                                    color: currentTheme.text,
                                    border: `1px solid ${currentTheme.cardBorder}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleSaveNote}
                                  disabled={!noteContent.trim()}
                                  style={{
                                    padding: '0.15rem 0.5rem',
                                    fontSize: '0.7rem',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: noteContent.trim() ? 'pointer' : 'not-allowed',
                                    opacity: noteContent.trim() ? 1 : 0.5,
                                  }}
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.5rem' }}>
                              <button
                                onClick={() => handleAddNote(highlight.id)}
                                style={{
                                  padding: '0.15rem 0.5rem',
                                  fontSize: '0.7rem',
                                  backgroundColor: 'transparent',
                                  color: '#007bff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                + Adicionar nota
                              </button>
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
    );
  }

  // Full mode (not used in compact, but keeping for consistency)
  return null;
}

