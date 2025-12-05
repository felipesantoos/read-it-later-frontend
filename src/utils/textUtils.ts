/**
 * Extract plain text from HTML string (removes HTML tags)
 * Useful for displaying titles that may contain HTML spans
 */
export function extractTextFromHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Create a temporary DOM element to extract text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}


