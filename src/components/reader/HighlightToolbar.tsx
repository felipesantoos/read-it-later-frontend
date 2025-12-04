import { useState, useEffect, useRef } from 'react';
import { themeStyles } from '../../utils/themeStyles';
import type { Theme } from '../../utils/themeStyles';
import { captureSelectionInfo, getToolbarPosition, type SelectionInfo } from '../../utils/highlightUtils';

interface HighlightToolbarProps {
  articleId: string;
  onHighlight: (text: string, position: string) => Promise<void>;
  onHighlightWithNote: (text: string, position: string, noteContent: string) => Promise<void>;
  theme: Theme;
  contentRef: React.RefObject<HTMLDivElement>;
}

export default function HighlightToolbar({
  articleId,
  onHighlight,
  onHighlightWithNote,
  theme,
  contentRef,
}: HighlightToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const currentTheme = themeStyles[theme];

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
        setIsVisible(false);
        setShowNoteInput(false);
        setNoteContent('');
        return;
      }

      // Check if selection is within content area
      if (contentRef.current && !contentRef.current.contains(selection.anchorNode)) {
        setIsVisible(false);
        return;
      }

      const info = captureSelectionInfo();
      if (!info) {
        setIsVisible(false);
        return;
      }

      const toolbarPos = getToolbarPosition(info.range);
      if (!toolbarPos) {
        setIsVisible(false);
        return;
      }

      setSelectionInfo(info);
      setPosition(toolbarPos);
      setIsVisible(true);
    };

    const handleClick = (e: MouseEvent) => {
      // Hide toolbar if clicking outside
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') {
          setIsVisible(false);
          setShowNoteInput(false);
          setNoteContent('');
        }
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [contentRef]);

  // Adjust position if toolbar would go off screen
  useEffect(() => {
    if (!isVisible || !position || !toolbarRef.current) return;

    const rect = toolbarRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedLeft = position.left;
    let adjustedTop = position.top;

    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      adjustedLeft = viewportWidth - rect.width - 16;
    }
    if (adjustedLeft < 16) {
      adjustedLeft = 16;
    }

    // Adjust vertical position (show above if not enough space below)
    if (rect.bottom > viewportHeight) {
      adjustedTop = position.top - rect.height - 16;
    }

    if (adjustedLeft !== position.left || adjustedTop !== position.top) {
      setPosition({ top: adjustedTop, left: adjustedLeft });
    }
  }, [isVisible, position]);

  const handleHighlight = async () => {
    if (!selectionInfo || isCreating) return;

    setIsCreating(true);
    try {
      await onHighlight(selectionInfo.text, selectionInfo.position);
      window.getSelection()?.removeAllRanges();
      setIsVisible(false);
      setShowNoteInput(false);
      setNoteContent('');
    } catch (error) {
      console.error('Error creating highlight:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleHighlightWithNote = async () => {
    if (!selectionInfo || !noteContent.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onHighlightWithNote(selectionInfo.text, selectionInfo.position, noteContent.trim());
      window.getSelection()?.removeAllRanges();
      setIsVisible(false);
      setShowNoteInput(false);
      setNoteContent('');
    } catch (error) {
      console.error('Error creating highlight with note:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowNoteInput = () => {
    setShowNoteInput(true);
  };

  const handleCancelNote = () => {
    setShowNoteInput(false);
    setNoteContent('');
  };

  if (!isVisible || !position || !selectionInfo) {
    return null;
  }

  const truncatedText = selectionInfo.text.length > 50 
    ? selectionInfo.text.substring(0, 50) + '...' 
    : selectionInfo.text;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        backgroundColor: currentTheme.cardBg,
        border: `1px solid ${currentTheme.cardBorder}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: showNoteInput ? '0.75rem' : '0.5rem',
        zIndex: 10000,
        minWidth: showNoteInput ? '300px' : 'auto',
        maxWidth: '400px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {showNoteInput ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: currentTheme.secondaryText, marginBottom: '0.25rem' }}>
            "{truncatedText}"
          </div>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Adicionar nota..."
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '0.5rem',
              fontSize: '0.875rem',
              border: `1px solid ${currentTheme.cardBorder}`,
              borderRadius: '4px',
              backgroundColor: currentTheme.inputBg,
              color: currentTheme.text,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancelNote}
              disabled={isCreating}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: currentTheme.buttonBg,
                color: currentTheme.text,
                border: `1px solid ${currentTheme.cardBorder}`,
                borderRadius: '4px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleHighlightWithNote}
              disabled={!noteContent.trim() || isCreating}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: noteContent.trim() && !isCreating ? 'pointer' : 'not-allowed',
                opacity: noteContent.trim() && !isCreating ? 1 : 0.5,
              }}
            >
              {isCreating ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleHighlight}
            disabled={isCreating}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.5 : 1,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Criar highlight"
          >
            ✨ Highlight
          </button>
          <button
            onClick={handleShowNoteInput}
            disabled={isCreating}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.5 : 1,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Criar highlight com nota"
          >
            💬 Add Note
          </button>
        </div>
      )}
    </div>
  );
}

