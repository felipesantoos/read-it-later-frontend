export type ArticleStatus = 'UNREAD' | 'READING' | 'PAUSED' | 'FINISHED' | 'ARCHIVED';

export const statusColors: Record<ArticleStatus, string> = {
  UNREAD: '#dc3545', // Red
  READING: '#ffc107', // Yellow
  PAUSED: '#007bff', // Blue
  FINISHED: '#28a745', // Green
  ARCHIVED: '#6c757d', // Grey
};

export const statusLabels: Record<ArticleStatus, string> = {
  UNREAD: 'Não Lido',
  READING: 'Lendo',
  PAUSED: 'Pausado',
  FINISHED: 'Lido',
  ARCHIVED: 'Arquivado',
};

export const allStatuses: ArticleStatus[] = ['UNREAD', 'READING', 'PAUSED', 'FINISHED', 'ARCHIVED'];

