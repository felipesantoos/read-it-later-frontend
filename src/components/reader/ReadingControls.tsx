import StatusDropdown from './StatusDropdown';
import type { Article } from '../../api/articles';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';

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
  theme?: Theme;
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
  theme = 'light',
}: ReadingControlsProps) {
  const currentTheme = themeStyles[theme];
  
  return (
    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: currentTheme.text }}>
        <span style={{ minWidth: '60px' }}>Altura:</span>
        <input
          type="range"
          min="12"
          max="24"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          style={{ width: '70px' }}
        />
        <span style={{ minWidth: '35px', color: currentTheme.text }}>{fontSize}px</span>
      </label>
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: currentTheme.text }}>
        <span style={{ minWidth: '60px' }}>Linha:</span>
        <input
          type="range"
          min="1.2"
          max="2.4"
          step="0.1"
          value={lineHeight}
          onChange={(e) => onLineHeightChange(Number(e.target.value))}
          style={{ width: '70px' }}
        />
        <span style={{ minWidth: '35px', color: currentTheme.text }}>{lineHeight.toFixed(1)}</span>
      </label>
      <StatusDropdown
        article={article}
        isOpen={isStatusDropdownOpen}
        onToggle={onStatusDropdownToggle}
        onChange={onStatusChange}
        isUpdating={isUpdatingStatus}
        theme={theme}
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

