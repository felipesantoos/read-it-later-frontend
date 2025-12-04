import { useEffect } from 'react';
import '../App.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const backgroundColor = 
    type === 'error' ? '#fee' : 
    type === 'success' ? '#efe' : 
    '#eef';

  const borderColor = 
    type === 'error' ? '#fcc' : 
    type === 'success' ? '#cfc' : 
    '#ccf';

  return (
    <div
      className="card"
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        backgroundColor,
        border: `1px solid ${borderColor}`,
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        maxWidth: '300px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>{message}</p>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

