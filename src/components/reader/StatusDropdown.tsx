import { useRef, useEffect } from 'react';
import type { Article } from '../../api/articles';
import { statusColors, statusLabels, allStatuses } from '../../constants/articleStatus';

interface StatusDropdownProps {
  article: Article;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (newStatus: Article['status']) => void;
  isUpdating?: boolean;
}

export default function StatusDropdown({ article, isOpen, onToggle, onChange, isUpdating = false }: StatusDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <span
        onClick={onToggle}
        style={{
          fontSize: '0.75rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: statusColors[article.status],
          color: 'white',
          cursor: isUpdating ? 'wait' : 'pointer',
          userSelect: 'none',
          display: 'inline-block',
          transition: 'opacity 0.2s',
          opacity: isUpdating ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isUpdating) {
            (e.currentTarget as HTMLElement).style.opacity = '0.9';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = isUpdating ? '0.7' : '1';
        }}
      >
        Status: {statusLabels[article.status]} ▼
      </span>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.25rem',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '120px',
            overflow: 'hidden',
          }}
        >
          {allStatuses.map((status) => (
            <div
              key={status}
              onClick={() => !isUpdating && onChange(status)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                cursor: isUpdating ? 'wait' : 'pointer',
                backgroundColor: status === article.status ? '#f0f0f0' : 'white',
                color: status === article.status ? statusColors[status] : '#333',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (status !== article.status && !isUpdating) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (status !== article.status) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                }
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusColors[status],
                  marginRight: '0.5rem',
                  verticalAlign: 'middle',
                }}
              />
              {statusLabels[status]}
              {status === article.status && (
                <span style={{ marginLeft: '0.5rem', color: statusColors[status] }}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

