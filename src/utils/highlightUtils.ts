/**
 * Utilities for capturing and working with text selection positions
 */

export interface SelectionInfo {
  text: string;
  position: string;
  range: Range;
  beforeText: string;
  afterText: string;
}

/**
 * Token-based position information (Version 3)
 */
export interface TokenBasedPosition {
  version: 3;
  tokenIds: string[]; // Array de IDs ordenados como ['ritl-w-0', 'ritl-w-1', ...] - fonte de verdade para posição
  text: string; // Texto completo do highlight - útil para validação, busca e exibição
}


/**
 * Get text content before and after selection for context
 */
function getContextText(range: Range, container: Node, contextLength: number = 50): { before: string; after: string } {
  const containerText = container.textContent || '';
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  // Get text before selection
  const beforeStart = Math.max(0, startOffset - contextLength);
  const beforeText = containerText.substring(beforeStart, startOffset);
  
  // Get text after selection
  const afterEnd = Math.min(containerText.length, endOffset + contextLength);
  const afterText = containerText.substring(endOffset, afterEnd);
  
  return { before: beforeText, after: afterText };
}


/**
 * Check if a node or its ancestors contain token spans (ritl-w-*)
 */
export function hasTokenSpans(container: Node): boolean {
  if (container.nodeType === Node.ELEMENT_NODE) {
    const element = container as Element;
    // Check if this element or any descendant has a token span
    if (element.querySelector && element.querySelector('[id^="ritl-w-"]')) {
      return true;
    }
  }
  
  // Check parent containers
  let current: Node | null = container;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const element = current as Element;
    if (element.querySelector && element.querySelector('[id^="ritl-w-"]')) {
      return true;
    }
    current = current.parentNode;
  }
  
  return false;
}

/**
 * Find the token span that contains a given node
 */
export function findTokenSpanContainingNode(node: Node): HTMLElement | null {
  let current: Node | null = node;
  
  // First check if the node itself is a token span
  if (current.nodeType === Node.ELEMENT_NODE) {
    const element = current as HTMLElement;
    if (element.id && element.id.startsWith('ritl-w-')) {
      return element;
    }
  }
  
  // Then check parent nodes
  while (current) {
    current = current.parentNode;
    if (current && current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (element.id && element.id.startsWith('ritl-w-')) {
        return element;
      }
    }
  }
  return null;
}

/**
 * Expand a selection to include only complete tokens (spans with IDs ritl-w-*)
 * Expands only the start and end tokens to be complete, keeping all intermediate tokens as-is
 */
export function expandSelectionToCompleteTokens(range: Range): Range | null {
  try {
    // Check if the container has token spans
    const container = range.commonAncestorContainer;
    if (!hasTokenSpans(container)) {
      return null; // No tokens available
    }

    // Get the container element for querying
    const containerElement = container.nodeType === Node.ELEMENT_NODE 
      ? container as Element 
      : container.parentElement;
    
    if (!containerElement) {
      return null;
    }

    // Find the token span that contains the start of the selection
    const startToken = findTokenSpanContainingNode(range.startContainer);
    // Find the token span that contains the end of the selection
    const endToken = findTokenSpanContainingNode(range.endContainer);

    if (!startToken || !endToken) {
      return null; // Could not find token spans
    }

    // If start and end are the same token, just select that token
    if (startToken === endToken) {
      const expandedRange = document.createRange();
      expandedRange.selectNodeContents(startToken);
      return expandedRange;
    }

    // Create a range from the start of the first token to the end of the last token
    const expandedRange = document.createRange();
    
    // Set start to the beginning of the start token
    if (startToken.firstChild) {
      if (startToken.firstChild.nodeType === Node.TEXT_NODE) {
        expandedRange.setStart(startToken.firstChild, 0);
      } else {
        expandedRange.setStartBefore(startToken.firstChild);
      }
    } else {
      expandedRange.setStartBefore(startToken);
    }
    
    // Set end to the end of the end token
    if (endToken.lastChild) {
      if (endToken.lastChild.nodeType === Node.TEXT_NODE) {
        const textNode = endToken.lastChild as Text;
        expandedRange.setEnd(textNode, textNode.length);
      } else {
        expandedRange.setEndAfter(endToken.lastChild);
      }
    } else {
      expandedRange.setEndAfter(endToken);
    }

    return expandedRange;
  } catch (e) {
    console.error('Error expanding selection to complete tokens:', e);
    return null;
  }
}

/**
 * Expand a selection to include only complete tokens (spans with IDs ritl-w-*)
 * If the selection starts or ends in the middle of a token span, it expands to include the full span
 */
export function expandSelectionToTokens(range: Range): Range | null {
  try {
    // Check if the container has token spans
    const container = range.commonAncestorContainer;
    if (!hasTokenSpans(container)) {
      return null; // No tokens available, return null to use fallback
    }

    // Find all token spans that are within or partially covered by the range
    const tokenSpans: HTMLElement[] = [];
    
    // Get the container element for querying
    const containerElement = container.nodeType === Node.ELEMENT_NODE 
      ? container as Element 
      : container.parentElement;
    
    if (!containerElement) {
      return null;
    }

    // Find all token spans in the document that might intersect with the range
    const allTokenSpans = containerElement.querySelectorAll('[id^="ritl-w-"]');
    
    for (const span of Array.from(allTokenSpans)) {
      const element = span as HTMLElement;
      
      // Create a range for this span
      const spanRange = document.createRange();
      spanRange.selectNodeContents(element);
      
      // Check if ranges intersect (span is within or overlaps with selection)
      const startComparison = range.compareBoundaryPoints(Range.START_TO_END, spanRange);
      const endComparison = range.compareBoundaryPoints(Range.END_TO_START, spanRange);
      
      if (startComparison >= 0 && endComparison <= 0) {
        // Range fully contains or overlaps with span
        tokenSpans.push(element);
      } else {
        // Check if range boundaries are inside this span
        const rangeStart = range.startContainer;
        const rangeEnd = range.endContainer;
        
        if (
          (element.contains(rangeStart) || element === rangeStart) ||
          (element.contains(rangeEnd) || element === rangeEnd)
        ) {
          tokenSpans.push(element);
        }
      }
    }

    if (tokenSpans.length === 0) {
      return null; // No token spans found
    }

    // Sort spans by their position in the DOM (using their token index)
    tokenSpans.sort((a, b) => {
      const aIndex = parseInt(a.id.replace('ritl-w-', ''), 10);
      const bIndex = parseInt(b.id.replace('ritl-w-', ''), 10);
      return aIndex - bIndex;
    });

    // Create a new range that covers from the start of the first span to the end of the last span
    const firstSpan = tokenSpans[0];
    const lastSpan = tokenSpans[tokenSpans.length - 1];

    const expandedRange = document.createRange();
    
    // Set start to the beginning of the first span
    if (firstSpan.firstChild) {
      if (firstSpan.firstChild.nodeType === Node.TEXT_NODE) {
        expandedRange.setStart(firstSpan.firstChild, 0);
      } else {
        expandedRange.setStartBefore(firstSpan.firstChild);
      }
    } else {
      expandedRange.setStartBefore(firstSpan);
    }
    
    // Set end to the end of the last span
    if (lastSpan.lastChild) {
      if (lastSpan.lastChild.nodeType === Node.TEXT_NODE) {
        const textNode = lastSpan.lastChild as Text;
        expandedRange.setEnd(textNode, textNode.length);
      } else {
        expandedRange.setEndAfter(lastSpan.lastChild);
      }
    } else {
      expandedRange.setEndAfter(lastSpan);
    }

    return expandedRange;
  } catch (e) {
    console.error('Error expanding selection to tokens:', e);
    return null;
  }
}

/**
 * Extract all token IDs (ritl-w-{index}) from a Range
 * Returns array of IDs ordered by their position in the document
 */
export function getTokenIdsFromRange(range: Range): string[] {
  const tokenIds: string[] = [];
  
  try {
    const container = range.commonAncestorContainer;
    
    // Get the nearest Element ancestor for querying (Handles text node containers)
    const containerElement = container.nodeType === Node.ELEMENT_NODE 
      ? container as Element 
      : container.parentElement;
    
    if (!containerElement) {
      return [];
    }

    // Find all token spans in the container
    const allTokenSpans = containerElement.querySelectorAll('[id^="ritl-w-"]');
    
    for (const span of Array.from(allTokenSpans)) {
      const element = span as HTMLElement;
      
      try {
        const elementRange = document.createRange();
        // Create a range that covers the element's contents for precise comparison
        elementRange.selectNodeContents(element);
        
        // Standard Intersection Logic:
        // The range (selection) ends after the element range starts,
        // AND the range (selection) starts before the element range ends.
        const isIntersecting = 
          range.compareBoundaryPoints(Range.END_TO_START, elementRange) < 0 && 
          range.compareBoundaryPoints(Range.START_TO_END, elementRange) > 0;
        
        if (isIntersecting) {
          if (!tokenIds.includes(element.id)) {
            tokenIds.push(element.id);
          }
        }
      } catch (e) {
        // Continue if range comparison fails for any reason
        continue;
      }
    }

    // Sort by numeric index to ensure correct order
    tokenIds.sort((a, b) => {
      const aIndex = parseInt(a.replace('ritl-w-', ''), 10);
      const bIndex = parseInt(b.replace('ritl-w-', ''), 10);
      return aIndex - bIndex;
    });

    return tokenIds;
  } catch (e) {
    console.error('Error getting token IDs from range:', e);
    return [];
  }
}

/**
 * Create token-based position information (Version 3)
 */
export function createTokenBasedPosition(tokenIds: string[], text: string): TokenBasedPosition {
  return {
    version: 3,
    tokenIds,
    text,
  };
}

/**
 * Capture selection information including position (only Version 3 token-based)
 */
export function captureSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  
  let range = selection.getRangeAt(0);
  let text = range.toString().trim();
  
  if (!text) {
    return null;
  }
  
  // Get container element
  const container = range.commonAncestorContainer;
  const containerElement = container.nodeType === Node.TEXT_NODE 
    ? container.parentElement 
    : container as Element;
  
  if (!containerElement) {
    return null;
  }
  
  // Only support token-based highlights (Version 3)
  // If content doesn't have token spans, we cannot create a highlight
  if (!hasTokenSpans(container)) {
    console.warn('Cannot create highlight: article content does not have token spans. Only Version 3 token-based highlights are supported.');
    return null;
  }
  
  // Try to expand selection to complete tokens
  // Use expandSelectionToCompleteTokens which expands only start and end tokens
  const expandedRange = expandSelectionToCompleteTokens(range);
  
  if (!expandedRange) {
    console.warn('Cannot create highlight: could not expand selection to tokens.');
    return null;
  }
  
  const finalRange = expandedRange;
  text = expandedRange.toString().trim();
  
  // Extract token IDs from the expanded range
  const tokenIds = getTokenIdsFromRange(expandedRange);
  
  if (tokenIds.length === 0) {
    console.warn('Cannot create highlight: no token IDs found in selection.');
    return null;
  }
  
  // Use token-based position (Version 3)
  const tokenPosition = createTokenBasedPosition(tokenIds, text);
  const position = JSON.stringify(tokenPosition);
  
  // Get context text from the final range
  const context = getContextText(finalRange, container);
  
  return {
    text,
    position,
    range: finalRange,
    beforeText: context.before,
    afterText: context.after,
  };
}


/**
 * Normalize text for comparison (remove extra whitespace, trim)
 */
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Check if position string is in token-based format (Version 3)
 */
export function isTokenBasedFormat(position: string): boolean {
  try {
    const parsed = JSON.parse(position);
    return parsed && parsed.version === 3 && Array.isArray(parsed.tokenIds);
  } catch {
    return false;
  }
}

/**
 * Parse position string and return TokenBasedPosition or null
 */
export function parsePosition(position: string): TokenBasedPosition | null {
  try {
    const parsed = JSON.parse(position);
    if (parsed && parsed.version === 3 && Array.isArray(parsed.tokenIds)) {
      return parsed as TokenBasedPosition;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Restore selection from position identifier (only Version 3 token-based)
 */
export function restoreSelectionFromPosition(
  position: string, 
  container: HTMLElement, 
  highlightId?: string
): boolean {
  try {
    const parsedPos = parsePosition(position);
    if (!parsedPos || !parsedPos.text) {
      return false;
    }
    
    // Only support Version 3 token-based highlights
    if (!isTokenBasedFormat(position) || !('tokenIds' in parsedPos)) {
      console.warn('Cannot restore selection: only Version 3 token-based highlights are supported.');
      return false;
    }
    
    const tokenPosition = parsedPos as TokenBasedPosition;
    const tokenIds = tokenPosition.tokenIds;
    
    if (!tokenIds || tokenIds.length === 0) {
      return false;
    }
    
    // First, try to find by highlight ID if available (most reliable)
    if (highlightId) {
      const markById = container.querySelector(`mark[data-highlight-id="${highlightId}"]`) as HTMLElement;
      if (markById) {
        markById.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const range = document.createRange();
        if (markById.firstChild && markById.firstChild.nodeType === Node.TEXT_NODE) {
          range.selectNodeContents(markById);
        } else {
          range.selectNode(markById);
        }
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        return true;
      }
    }
    
    // Try to find token spans directly
    const tokenSpans: HTMLElement[] = [];
    let allFound = true;
    
    for (const tokenId of tokenIds) {
      // Search within container first (more efficient)
      const span = container.querySelector(`#${tokenId}`) as HTMLElement;
      if (!span) {
        // Fallback to document.getElementById if not found in container
        const docSpan = document.getElementById(tokenId);
        if (docSpan && container.contains(docSpan)) {
          tokenSpans.push(docSpan);
        } else {
          allFound = false;
          break;
        }
      } else if (span.id.startsWith('ritl-w-')) {
        tokenSpans.push(span);
      } else {
        allFound = false;
        break;
      }
    }
    
    if (allFound && tokenSpans.length > 0) {
      // Optional: validate that the text still matches
      const actualText = tokenSpans.map(span => span.textContent || '').join('');
      if (normalizeText(actualText) !== normalizeText(tokenPosition.text)) {
        console.warn('Token text mismatch, but restoring anyway:', {
          expected: tokenPosition.text,
          actual: actualText
        });
      }
      
      // Check if spans are inside a mark element (highlighted)
      const firstSpan = tokenSpans[0];
      const markElement = firstSpan.closest('mark[data-highlight-id]') as HTMLElement;
      
      if (markElement) {
        // If inside a mark, scroll to and select the mark
        markElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const range = document.createRange();
        if (markElement.firstChild && markElement.firstChild.nodeType === Node.TEXT_NODE) {
          range.selectNodeContents(markElement);
        } else {
          range.selectNode(markElement);
        }
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        return true;
      }
      
      // If not inside a mark, create range from first to last span
      const lastSpan = tokenSpans[tokenSpans.length - 1];
      
      const range = document.createRange();
      
      // Set start to the beginning of the first span
      if (firstSpan.firstChild) {
        if (firstSpan.firstChild.nodeType === Node.TEXT_NODE) {
          range.setStart(firstSpan.firstChild, 0);
        } else {
          range.setStartBefore(firstSpan.firstChild);
        }
      } else {
        range.setStartBefore(firstSpan);
      }
      
      // Set end to the end of the last span
      if (lastSpan.lastChild) {
        if (lastSpan.lastChild.nodeType === Node.TEXT_NODE) {
          const textNode = lastSpan.lastChild as Text;
          range.setEnd(textNode, textNode.length);
        } else {
          range.setEndAfter(lastSpan.lastChild);
        }
      } else {
        range.setEndAfter(lastSpan);
      }
      
      // Scroll to the first span
      firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Apply selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.error('Error restoring selection:', e);
    return false;
  }
}

/**
 * Get coordinates for positioning toolbar near selection
 * Returns position relative to the positioned parent (absolute positioning context)
 */
export function getToolbarPosition(range: Range, container?: HTMLElement | null): { top: number; left: number } | null {
  try {
    const rect = range.getBoundingClientRect();
    
    // Use provided container, or find the nearest positioned ancestor
    let positionedParent: Element | null = container || null;
    
    if (!positionedParent) {
      positionedParent = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer as Element;
      
      while (positionedParent && positionedParent !== document.body) {
        const style = window.getComputedStyle(positionedParent);
        if (style.position !== 'static') {
          break;
        }
        positionedParent = positionedParent.parentElement;
      }
    }
    
    const parentRect = positionedParent?.getBoundingClientRect() || { top: 0, left: 0 };
    
    // Calculate position relative to the positioned parent
    // Position above the selection, centered horizontally
    // Use a larger offset to ensure toolbar doesn't cover content (approximately toolbar height + padding)
    const relativeTop = rect.top - parentRect.top - 60; // Position well above selection to avoid covering content
    const selectionCenter = rect.left + (rect.width / 2); // Center of selection
    const relativeLeft = selectionCenter - parentRect.left; // Center relative to parent
    
    return {
      top: relativeTop,
      left: relativeLeft,
    };
  } catch (e) {
    console.error('Error getting toolbar position:', e);
    return null;
  }
}


