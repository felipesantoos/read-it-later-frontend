import { useState, useEffect, useRef } from 'react';
import { themeStyles } from '../../utils/themeStyles';
import type { Theme } from '../../utils/themeStyles';
import { captureSelectionInfo, getToolbarPosition, type SelectionInfo, hasTokenSpans, expandSelectionToTokens } from '../../utils/highlightUtils';
import Button from '../Button';
import { Sparkles, MessageSquare } from 'lucide-react';

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
  const capturedSelectionTextRef = useRef<string | null>(null);
  const currentTheme = themeStyles[theme];

  useEffect(() => {
    const handleSelection = () => {
      // Don't hide if note input is showing
      if (showNoteInput) return;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
        setIsVisible(false);
        setShowNoteInput(false);
        setNoteContent('');
        capturedSelectionTextRef.current = null;
        return;
      }

      // Check if selection is within content area
      if (contentRef.current && !contentRef.current.contains(selection.anchorNode)) {
        setIsVisible(false);
        capturedSelectionTextRef.current = null;
        return;
      }

      // If toolbar is already visible, don't update position unless selection text changed
      if (isVisible && capturedSelectionTextRef.current) {
        const currentText = selection.toString().trim();
        const capturedText = capturedSelectionTextRef.current.trim();
        // Normalize whitespace for comparison
        if (currentText.replace(/\s+/g, ' ') === capturedText.replace(/\s+/g, ' ')) {
          // Selection hasn't changed, don't update position
          return;
        }
      }

      // Check if content has token spans and validate selection
      const range = selection.getRangeAt(0);
      const ancestorContainer = range.commonAncestorContainer;
      
      if (hasTokenSpans(ancestorContainer)) {
        // For articles with token spans, ensure selection covers complete tokens
        const expandedRange = expandSelectionToTokens(range);
        if (expandedRange) {
          // Update selection to expanded range (complete tokens only)
          selection.removeAllRanges();
          selection.addRange(expandedRange);
        }
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

      // Capture selection text when toolbar first appears
      if (!isVisible) {
        capturedSelectionTextRef.current = info.text;
      }

      // Always use selection-based positioning (never use mouse position)
      const pos = getToolbarPosition(info.range, container);
      if (!pos) {
        setIsVisible(false);
        return;
      }

      setSelectionInfo(info);
      setPosition(pos);
      setIsVisible(true);
    };

    document.addEventListener('selectionchange', handleSelection);

    const handleClick = (e: MouseEvent) => {
      // Hide toolbar if clicking outside (but not if clicking on the toolbar itself)
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') {
          setIsVisible(false);
          setShowNoteInput(false);
          setNoteContent('');
          capturedSelectionTextRef.current = null;
        } else if (showNoteInput) {
          // If note input is showing and clicking outside, just close the input but keep toolbar
          setShowNoteInput(false);
          setNoteContent('');
        }
      }
    };

    document.addEventListener('mousedown', handleClick);

    return () => {
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
      // Since toolbar is centered with transform: translateX(-50%), we need to check both edges
      const toolbarHalfWidth = toolbarRect.width / 2;
      
      if (toolbarRect.right > viewportWidth - 16) {
        // Toolbar goes off right edge, adjust to keep it on screen
        adjustedLeft = Math.min(containerRect.width - toolbarHalfWidth - 16, position.left);
      }
      // If toolbar goes off left edge, adjust to keep it on screen
      if (toolbarRect.left < containerRect.left + 16) {
        adjustedLeft = Math.max(toolbarHalfWidth + 16, position.left);
      }

      // Adjust vertical position if toolbar goes off screen
      const toolbarHeight = toolbarRect.height;
      
      // Get the selection rect to position toolbar above it
      const selection = window.getSelection();
      let selectionRect: DOMRect | null = null;
      if (selection && selection.rangeCount > 0) {
        selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      }
      
      // If toolbar goes off top of viewport, position it just above the selection
      if (toolbarRect.top < containerRect.top + 16) {
        if (selectionRect) {
          // Position toolbar just above the selection (8px gap)
          adjustedTop = selectionRect.top - containerRect.top - toolbarHeight - 8;
          // Ensure it doesn't go below the selection
          if (adjustedTop > selectionRect.top - containerRect.top) {
            adjustedTop = selectionRect.top - containerRect.top - toolbarHeight - 8;
          }
          // Ensure minimum top padding
          if (adjustedTop < 16) {
            adjustedTop = 16;
          }
        } else {
          adjustedTop = 16;
        }
      }
      
      // If toolbar goes off bottom, move it up but keep it above selection if possible
      if (toolbarRect.bottom > viewportHeight - 16) {
        if (selectionRect) {
          // Try to position above selection
          adjustedTop = selectionRect.top - containerRect.top - toolbarHeight - 8;
          // If that's still off screen, position at top of viewport
          if (adjustedTop < 16) {
            adjustedTop = Math.max(8, viewportHeight - containerRect.top - toolbarHeight - 16);
          }
        } else {
          adjustedTop = Math.max(8, viewportHeight - containerRect.top - toolbarHeight - 16);
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
      capturedSelectionTextRef.current = null;
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
      capturedSelectionTextRef.current = null;
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
        transform: 'translateX(-50%)', // Center horizontally
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
            placeholder="Add note..."
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
              Cancel
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
              {isCreating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={handleHighlight}
            disabled={isCreating}
            title="Create highlight"
            style={{ 
              backgroundColor: '#ffc107',
              color: '#000',
              fontWeight: 500
            }}
          >
            Highlight
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<MessageSquare size={14} />}
            onClick={handleShowNoteInput}
            disabled={isCreating}
            title="Create highlight with note"
            style={{ fontWeight: 500 }}
          >
            Add Note
          </Button>
        </div>
      )}
    </div>
  );
}

