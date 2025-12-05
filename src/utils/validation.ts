export interface PageValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePages(totalPages: number | null, currentPage: number | null): PageValidationResult {
  if (totalPages !== null && totalPages <= 0) {
    return { isValid: false, error: 'Total de páginas deve ser maior que 0' };
  }
  
  if (currentPage !== null && currentPage < 0) {
    return { isValid: false, error: 'Página atual não pode ser negativa' };
  }
  
  if (totalPages !== null && currentPage !== null && currentPage > totalPages) {
    return { isValid: false, error: 'Página atual não pode ser maior que o total de páginas' };
  }
  
  return { isValid: true };
}

export function validatePageChange(newPage: number, totalPages: number | null): PageValidationResult {
  if (totalPages && newPage > totalPages) {
    return { isValid: false, error: 'Página não pode ser maior que o total de páginas' };
  }
  
  if (newPage < 0) {
    return { isValid: false, error: 'Página não pode ser negativa' };
  }
  
  return { isValid: true };
}


