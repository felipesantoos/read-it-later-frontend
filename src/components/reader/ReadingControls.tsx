import StatusDropdown from './StatusDropdown';
import type { Article } from '../../api/articles';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';
import Button from '../Button';
import { Sparkles } from 'lucide-react';

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
          type="number"
          step="1"
          value={fontSize}
          onChange={(e) => {
            const inputValue = e.target.value.trim();
            // Allow empty input during editing
            if (inputValue === '' || inputValue === '-') {
              return;
            }
            const value = parseInt(inputValue, 10);
            // Update if value is a valid positive integer
            if (!isNaN(value) && value > 0) {
              onFontSizeChange(value);
            }
          }}
          onKeyDown={(e) => {
            // Handle arrow keys explicitly
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (fontSize > 0) {
                onFontSizeChange(fontSize + 1);
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (fontSize > 1) {
                onFontSizeChange(fontSize - 1);
              }
            }
          }}
          onBlur={(e) => {
            // Validate and reset to last valid value if invalid
            const value = parseInt(e.target.value, 10);
            if (isNaN(value) || value <= 0) {
              e.target.value = fontSize.toString();
            }
          }}
          style={{ width: '70px' }}
        />
        <span style={{ minWidth: '35px', color: currentTheme.text }}>{fontSize}px</span>
      </label>
      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: currentTheme.text }}>
        <span style={{ minWidth: '60px' }}>Linha:</span>
        <input
          type="number"
          step="0.1"
          value={lineHeight}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value > 0) {
              onLineHeightChange(value);
            }
          }}
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
        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={14} />}
          onClick={onCreateHighlight}
        >
          Highlight
        </Button>
      )}
    </div>
  );
}

