import type { Article } from '../api/articles';

export const statusColors: Record<Article['status'], string> = {
  UNREAD: '#6c757d',
  READING: '#007bff',
  FINISHED: '#28a745',
  ARCHIVED: '#6c757d',
};

export const statusLabels: Record<Article['status'], string> = {
  UNREAD: 'Não Lido',
  READING: 'Lendo',
  FINISHED: 'Lido',
  ARCHIVED: 'Arquivado',
};

export const allStatuses: Article['status'][] = ['UNREAD', 'READING', 'FINISHED', 'ARCHIVED'];

