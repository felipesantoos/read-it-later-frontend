import { useState, useEffect, useRef } from 'react';
import { themeStyles } from '../../utils/themeStyles';
import type { Theme } from '../../utils/themeStyles';
import { captureSelectionInfo, getToolbarPosition, type SelectionInfo } from '../../utils/highlightUtils';

interface HighlightToolbarProps {
  articleId: string;
  onHighlight: (text: string, position: string) => Promise<void>;
  onHighlightWithNote: (text: string, position: string, noteContent: string) => Promise<void>;
  theme: Theme;
  contentRef: React.RefObject<HTMLDivElement | null>;
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
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const currentTheme = themeStyles[theme];

  useEffect(() => {
    // Track mouse position during selection
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleSelection = () => {
      // Don't hide if note input is showing
      if (showNoteInput) return;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
        setIsVisible(false);
        setShowNoteInput(false);
        setNoteContent('');
        mousePositionRef.current = null;
        return;
      }

      // Check if selection is within content area
      if (contentRef.current && !contentRef.current.contains(selection.anchorNode)) {
        setIsVisible(false);
        mousePositionRef.current = null;
        return;
      }

      const info = captureSelectionInfo();
      if (!info) {
        setIsVisible(false);
        return;
      }

      // Get the positioned parent container for relative positioning
      const container = contentRef.current?.offsetParent as HTMLElement || contentRef.current?.parentElement;
      if (!container) {
        setIsVisible(false);
        return;
      }

      // Use mouse position if available, otherwise fall back to selection position
      let toolbarPos: { top: number; left: number };
      
      if (mousePositionRef.current) {
        const containerRect = container.getBoundingClientRect();
        toolbarPos = {
          top: mousePositionRef.current.y - containerRect.top - 8, // 8px above mouse
          left: mousePositionRef.current.x - containerRect.left + 8, // 8px to the right of mouse
        };
      } else {
        // Fallback to selection-based positioning
        const pos = getToolbarPosition(info.range, container);
        if (!pos) {
          setIsVisible(false);
          return;
        }
        toolbarPos = pos;
      }

      setSelectionInfo(info);
      setPosition(toolbarPos);
      setIsVisible(true);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('selectionchange', handleSelection);

    const handleClick = (e: MouseEvent) => {
      // Hide toolbar if clicking outside (but not if clicking on the toolbar itself)
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') {
          setIsVisible(false);
          setShowNoteInput(false);
          setNoteContent('');
        } else if (showNoteInput) {
          // If note input is showing and clicking outside, just close the input but keep toolbar
          setShowNoteInput(false);
          setNoteContent('');
        }
      }
    };

    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [contentRef, showNoteInput]);

  // Adjust position if toolbar would go off screen
  useEffect(() => {
    if (!isVisible || !position || !toolbarRef.current || !contentRef.current) return;

    // Get the positioned parent container
    const container = contentRef.current.offsetParent as HTMLElement || contentRef.current.parentElement;
    if (!container) return;

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (!toolbarRef.current || !contentRef.current) return;

      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedLeft = position.left;
      let adjustedTop = position.top;

      // Adjust horizontal position if toolbar goes off screen
      if (toolbarRect.right > viewportWidth - 16) {
        // Move to left side of mouse position
        if (mousePositionRef.current) {
          adjustedLeft = mousePositionRef.current.x - containerRect.left - toolbarRect.width - 8;
        } else {
          adjustedLeft = containerRect.width - toolbarRect.width - 16;
        }
        // Ensure minimum left padding
        if (adjustedLeft < 16) {
          adjustedLeft = 16;
        }
      }
      // If toolbar goes off left edge, align to left with padding
      if (toolbarRect.left < containerRect.left + 16) {
        adjustedLeft = 16;
      }

      // Adjust vertical position if toolbar goes off screen
      const toolbarHeight = toolbarRect.height;
      
      // If toolbar goes off bottom, move it above the mouse
      if (toolbarRect.bottom > viewportHeight - 16) {
        if (mousePositionRef.current) {
          adjustedTop = mousePositionRef.current.y - containerRect.top - toolbarHeight - 8;
        } else {
          adjustedTop = Math.max(8, viewportHeight - containerRect.top - toolbarHeight - 16);
        }
      }
      // If toolbar goes off top, move it below the mouse
      if (toolbarRect.top < containerRect.top + 16) {
        if (mousePositionRef.current) {
          adjustedTop = mousePositionRef.current.y - containerRect.top + 8;
        } else {
          adjustedTop = 16;
        }
      }

      // Only update if position changed significantly (avoid infinite loops)
      if (Math.abs(adjustedLeft - position.left) > 1 || Math.abs(adjustedTop - position.top) > 1) {
        setPosition({ top: adjustedTop, left: adjustedLeft });
      }
    });
  }, [isVisible, position, contentRef]);

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

