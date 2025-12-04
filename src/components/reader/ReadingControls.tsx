import StatusDropdown from './StatusDropdown';
import type { Article } from '../../api/articles';

interface ReadingControlsProps {
  article: Article;
  fontSize: number;
  lineHeight: number;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onStatusChange: (newStatus: Article['status']) => void;
  isUpdatingStatus: boolean;
  isStatusDropdownOpen: boolean;
  onStatusDropdownToggle: () => void;
  selectedText: string;
  onCreateHighlight: () => void;
}

export default function ReadingControls({
  article,
  fontSize,
  lineHeight,
  onFontSizeChange,
  onLineHeightChange,
  onStatusChange,
  isUpdatingStatus,
  isStatusDropdownOpen,
  onStatusDropdownToggle,
  selectedText,
  onCreateHighlight,
}: ReadingControlsProps) {
  return (
    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
      <label style={{ fontSize: '0.75rem' }}>
        A: 
        <input
          type="range"
          min="12"
          max="24"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          style={{ marginLeft: '0.3rem', width: '70px' }}
        />
        {fontSize}px
      </label>
      <label style={{ fontSize: '0.75rem' }}>
        L: 
        <input
          type="range"
          min="1.2"
          max="2.4"
          step="0.1"
          value={lineHeight}
          onChange={(e) => onLineHeightChange(Number(e.target.value))}
          style={{ marginLeft: '0.3rem', width: '70px' }}
        />
        {lineHeight.toFixed(1)}
      </label>
      <StatusDropdown
        article={article}
        isOpen={isStatusDropdownOpen}
        onToggle={onStatusDropdownToggle}
        onChange={onStatusChange}
        isUpdating={isUpdatingStatus}
      />
      {selectedText && (
        <button
          className="primary"
          onClick={onCreateHighlight}
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
        >
          ✨ Highlight
        </button>
      )}
    </div>
  );
}

