export type ArticleStatus = 'UNREAD' | 'READING' | 'PAUSED' | 'FINISHED' | 'ARCHIVED';

export const statusColors: Record<ArticleStatus, string> = {
  UNREAD: '#dc3545', // Red
  READING: '#ffc107', // Yellow
  PAUSED: '#007bff', // Blue
  FINISHED: '#28a745', // Green
  ARCHIVED: '#6c757d', // Grey
};

export const statusLabels: Record<ArticleStatus, string> = {
  UNREAD: 'Unread',
  READING: 'Reading',
  PAUSED: 'Paused',
  FINISHED: 'Finished',
  ARCHIVED: 'Archived',
};

export const allStatuses: ArticleStatus[] = ['UNREAD', 'READING', 'PAUSED', 'FINISHED', 'ARCHIVED'];

/**
 * Calcula a luminância relativa de uma cor hexadecimal e retorna
 * a cor do texto apropriada ('black' para cores claras, 'white' para cores escuras)
 */
export function getStatusTextColor(statusColor: string): string {
  // Remove o # se presente
  const hex = statusColor.replace('#', '');
  
  // Converte hexadecimal para RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calcula a luminância relativa usando a fórmula padrão
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Retorna 'black' se a luminância for maior que 0.5 (cor clara)
  // Retorna 'white' se a luminância for menor ou igual a 0.5 (cor escura)
  return luminance > 0.5 ? 'black' : 'white';
}

