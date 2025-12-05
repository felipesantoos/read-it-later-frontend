import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { Article } from '../../api/articles';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';
import { validatePages } from '../../utils/validation';
import StatusDropdown from './StatusDropdown';
import TagsManager from '../TagsManager';
import CollectionsManager from '../CollectionsManager';
import HighlightsManager from '../HighlightsManager';
import TTSControls from './TTSControls';
import type { Highlight } from '../../api/highlights';
import type { MutableRefObject, RefObject } from 'react';
import type { UseTTSReturn } from '../../hooks/useTTS';
import Button from '../Button';
import { ArrowLeft, Moon, ScrollText, Sun, ExternalLink, Pencil, Plus, RotateCw, X, Check, ChevronLeft, ChevronRight, RefreshCw, Star, Highlighter } from 'lucide-react';

interface ReaderHeaderProps {
  article: Article;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  fontSize: number;
  lineHeight: number;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onStatusChange: (newStatus: Article['status']) => void;
  isUpdatingStatus: boolean;
  isStatusDropdownOpen: boolean;
  onStatusDropdownToggle: () => void;
  readingProgress: number;
  onPageChange: (newPage: number) => Promise<void>;
  onPagesUpdate: (totalPages: number | null, currentPage: number | null) => Promise<void>;
  onResetProgress: () => Promise<void>;
  onRatingChange?: (rating: number | null) => Promise<void>;
  onTagsUpdate?: () => void;
  onCollectionsUpdate?: () => void;
  highlights?: Highlight[];
  onHighlightsUpdate?: () => void;
  contentRef?: MutableRefObject<HTMLDivElement | null>;
  onRefresh?: () => void;
  tts?: UseTTSReturn;
  onToggleTTSBar?: () => void;
  isHighlightingEnabled?: boolean;
  onHighlightingToggle?: () => void;
}

export default function ReaderHeader({ 
  article, 
  theme, 
  onThemeChange, 
  fontSize,
  lineHeight,
  onFontSizeChange,
  onLineHeightChange,
  onStatusChange,
  isUpdatingStatus,
  isStatusDropdownOpen,
  onStatusDropdownToggle,
  readingProgress,
  onPageChange,
  onPagesUpdate,
  onResetProgress,
  onRatingChange,
  onTagsUpdate,
  onCollectionsUpdate,
  highlights,
  onHighlightsUpdate,
  contentRef,
  onRefresh,
  tts,
  onToggleTTSBar,
  isHighlightingEnabled = true,
  onHighlightingToggle
}: ReaderHeaderProps) {
  const navigate = useNavigate();
  const currentTheme = themeStyles[theme];
  const [isEditingPages, setIsEditingPages] = useState(false);
  const [editingTotalPages, setEditingTotalPages] = useState<string>('');
  const [editingCurrentPage, setEditingCurrentPage] = useState<string>('');

  const cycleTheme = () => {
    if (theme === 'light') {
      onThemeChange('dark');
    } else if (theme === 'dark') {
      onThemeChange('sepia');
    } else {
      onThemeChange('light');
    }
  };

  const handleStartEditingPages = () => {
    setEditingTotalPages(article.totalPages?.toString() || '');
    setEditingCurrentPage(article.currentPage?.toString() || '1');
    setIsEditingPages(true);
  };

  const handleSavePages = async () => {
    const totalPagesValue = editingTotalPages.trim();
    const currentPageValue = editingCurrentPage.trim();
    
    let totalPages: number | null = null;
    if (totalPagesValue) {
      const parsed = parseInt(totalPagesValue, 10);
      totalPages = isNaN(parsed) ? null : parsed;
    }
    
    let currentPage: number | null = null;
    if (currentPageValue) {
      const parsed = parseInt(currentPageValue, 10);
      currentPage = isNaN(parsed) ? null : parsed;
    }
    
    const validation = validatePages(totalPages, currentPage);
    if (!validation.isValid) {
      // Silently fail - validation errors would be shown by parent component if needed
      return;
    }
    
    try {
      await onPagesUpdate(totalPages, currentPage);
      setIsEditingPages(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCancelEditingPages = () => {
    setIsEditingPages(false);
    setEditingTotalPages('');
    setEditingCurrentPage('');
  };

  return (
    <div className="flex mb-1" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={14} />}
        onClick={() => navigate('/inbox')}
        style={{ color: currentTheme.text }}
      >
        Back
      </Button>
      <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Page Tracker - Compact */}
        {isEditingPages ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              min="0"
              max={editingTotalPages ? parseInt(editingTotalPages) : undefined}
              value={editingCurrentPage}
              onChange={(e) => setEditingCurrentPage(e.target.value)}
              placeholder="Current"
              style={{
                width: '50px',
                padding: '0.15rem 0.2rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
                borderRadius: '3px'
              }}
            />
            <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText }}>/</span>
            <input
              type="number"
              value={editingTotalPages}
              onChange={(e) => setEditingTotalPages(e.target.value)}
              placeholder="Total"
              style={{
                width: '50px',
                padding: '0.15rem 0.2rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
                borderRadius: '3px'
              }}
            />
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={12} />}
              onClick={handleSavePages}
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem' }}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={12} />}
              onClick={handleCancelEditingPages}
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: currentTheme.text }}
            />
          </div>
        ) : article.totalPages && article.totalPages > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronLeft size={14} />}
              onClick={() => {
                const currentPage = article.currentPage ?? 0;
                if (currentPage > 0) {
                  onPageChange(currentPage - 1);
                }
              }}
              disabled={(article.currentPage ?? 0) === 0}
              title="Previous page"
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: currentTheme.text }}
            />
            <input
              type="number"
              min="0"
              max={article.totalPages}
              value={article.currentPage || 0}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 0 && page <= article.totalPages!) {
                  onPageChange(page);
                }
              }}
              style={{
                width: '45px',
                padding: '0.15rem 0.2rem',
                fontSize: '0.7rem',
                textAlign: 'center',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
                borderRadius: '3px'
              }}
            />
            <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText }}>
              / {article.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronRight size={14} />}
              onClick={() => {
                const currentPage = article.currentPage ?? 0;
                if (currentPage < article.totalPages!) {
                  onPageChange(currentPage + 1);
                }
              }}
              disabled={(article.currentPage ?? 0) >= article.totalPages!}
              title="Next page"
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: currentTheme.text }}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil size={12} />}
              onClick={handleStartEditingPages}
              title="Edit pages"
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: currentTheme.text }}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={12} />}
            onClick={handleStartEditingPages}
            title="Add page tracking"
            style={{ color: currentTheme.text }}
          >
            Páginas
          </Button>
        )}

        {/* Progress Bar - Compact */}
        {readingProgress > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ 
              width: '60px', 
              height: '3px', 
              backgroundColor: currentTheme.buttonBg || '#e9ecef', 
              borderRadius: '2px', 
              overflow: 'hidden' 
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${readingProgress * 100}%`,
                  backgroundColor: '#007bff',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText, minWidth: '35px' }}>
              {Math.round(readingProgress * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCw size={12} />}
              onClick={onResetProgress}
              title="Reset progress"
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', color: currentTheme.text }}
            />
          </div>
        )}

        {/* Font Size Input */}
        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: currentTheme.text }}>
          <span style={{ fontSize: '0.75rem' }}>Height:</span>
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
            onBlur={(e) => {
              // Validate and reset to last valid value if invalid
              const value = parseInt(e.target.value, 10);
              if (isNaN(value) || value <= 0) {
                e.target.value = fontSize.toString();
              }
            }}
            style={{
              width: '50px',
              padding: '0.2rem 0.3rem',
              fontSize: '0.75rem',
              border: `1px solid ${currentTheme.cardBorder}`,
              borderRadius: '4px',
              backgroundColor: currentTheme.cardBg,
              color: currentTheme.text
            }}
          />
        </label>
        
        {/* Line Height Input */}
        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: currentTheme.text }}>
          <span style={{ fontSize: '0.75rem' }}>Line:</span>
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
            style={{
              width: '50px',
              padding: '0.2rem 0.3rem',
              fontSize: '0.75rem',
              border: `1px solid ${currentTheme.cardBorder}`,
              borderRadius: '4px',
              backgroundColor: currentTheme.cardBg,
              color: currentTheme.text
            }}
          />
        </label>

        {/* Status Dropdown */}
        <StatusDropdown
          article={article}
          isOpen={isStatusDropdownOpen}
          onToggle={onStatusDropdownToggle}
          onChange={onStatusChange}
          isUpdating={isUpdatingStatus}
          theme={theme}
        />

        {/* Rating Stars */}
        {onRatingChange && (
          <div style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                style={{
                  color: article.rating !== null && star <= article.rating ? '#ffc107' : currentTheme.secondaryText || '#ccc',
                  cursor: 'pointer',
                  fill: article.rating !== null && star <= article.rating ? '#ffc107' : 'none',
                  transition: 'color 0.2s',
                }}
                onClick={() => {
                  // If clicking the same rating, remove it (set to null)
                  const newRating = article.rating === star ? null : star;
                  onRatingChange(newRating);
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as SVGSVGElement).style.color = '#ffc107';
                }}
                onMouseLeave={(e) => {
                  const currentColor = article.rating !== null && star <= article.rating ? '#ffc107' : currentTheme.secondaryText || '#ccc';
                  (e.currentTarget as SVGSVGElement).style.color = currentColor;
                }}
              />
            ))}
          </div>
        )}

        {/* Tags Button */}
        <TagsManager
          articleId={article.id}
          currentTags={article.articleTags}
          onUpdate={onTagsUpdate}
          theme={theme}
          compact={true}
        />

        {/* Collections Button */}
        <CollectionsManager
          articleId={article.id}
          currentCollections={article.articleCollections}
          onUpdate={onCollectionsUpdate}
          theme={theme}
          compact={true}
        />

        {/* Highlights Button */}
        <HighlightsManager
          articleId={article.id}
          currentHighlights={highlights}
          onUpdate={onHighlightsUpdate}
          theme={theme}
          compact={true}
          contentRef={contentRef as RefObject<HTMLDivElement> | undefined}
        />

        {/* Highlight Toggle Button */}
        {onHighlightingToggle && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Highlighter size={14} />}
            onClick={onHighlightingToggle}
            title={isHighlightingEnabled ? "Disable highlights and notes" : "Enable highlights and notes"}
            style={{ 
              color: isHighlightingEnabled ? currentTheme.text : (currentTheme.secondaryText || '#999'),
              opacity: isHighlightingEnabled ? 1 : 0.5
            }}
          />
        )}

        {/* TTS Controls */}
        {tts && (
          <TTSControls
            tts={tts}
            theme={theme}
            compact={true}
            onToggleFixedBar={onToggleTTSBar}
          />
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={onRefresh}
            title="Refresh"
            style={{ color: currentTheme.text }}
          />
        )}

        {/* Theme Button */}
        <Button
          variant="ghost"
          size="sm"
          icon={theme === 'light' ? <Moon size={14} /> : theme === 'dark' ? <ScrollText size={14} /> : <Sun size={14} />}
          onClick={cycleTheme}
          title="Toggle theme"
          style={{ color: currentTheme.text }}
        />
        
        {/* Original Link */}
        <Button
          variant="ghost"
          size="sm"
          icon={<ExternalLink size={14} />}
          onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
          title="Open original article"
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Original
        </Button>
      </div>
    </div>
  );
}

