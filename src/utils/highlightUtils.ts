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
 * Get XPath for an element
 */
function getXPath(element: Node): string {
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentNode!;
  }
  
  const parts: string[] = [];
  let current: Node | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.nodeName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }
  
  return parts.length ? '/' + parts.join('/') : '';
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
 * Capture selection information including position
 */
export function captureSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  
  const range = selection.getRangeAt(0);
  const text = range.toString().trim();
  
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
  
  // Get XPath for position
  const xpath = getXPath(containerElement);
  
  // Get offsets relative to container
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  // Create position identifier
  const position = JSON.stringify({
    xpath,
    startOffset,
    endOffset,
    text,
  });
  
  // Get context text
  const context = getContextText(range, container);
  
  return {
    text,
    position,
    range: range.cloneRange(),
    beforeText: context.before,
    afterText: context.after,
  };
}

/**
 * Find element by XPath
 */
export function findElementByXPath(xpath: string, root: Node = document): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      root,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch (e) {
    console.error('Error finding element by XPath:', e);
    return null;
  }
}

/**
 * Restore selection from position identifier
 */
export function restoreSelectionFromPosition(position: string, container: HTMLElement): boolean {
  try {
    const pos = JSON.parse(position);
    const searchText = pos.text;
    
    // First, try to find an existing highlight mark with the text
    const allMarks = container.querySelectorAll('mark[data-highlight-id]');
    for (const mark of Array.from(allMarks)) {
      if (mark.textContent && mark.textContent.trim() === searchText.trim()) {
        // Found the highlight, scroll to it and select it
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Try to select the text inside the mark
        const range = document.createRange();
        if (mark.firstChild && mark.firstChild.nodeType === Node.TEXT_NODE) {
          range.selectNodeContents(mark);
        } else {
          range.selectNode(mark);
        }
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        return true;
      }
    }
    
    // If not found in marks, try to find in the content using XPath
    const element = findElementByXPath(pos.xpath, container);
    
    if (!element || (element.nodeType !== Node.TEXT_NODE && element.nodeType !== Node.ELEMENT_NODE)) {
      return false;
    }
    
    // Try to find text node
    let textNode: Node | null = null;
    if (element.nodeType === Node.TEXT_NODE) {
      textNode = element;
    } else {
      // Find first text node in element
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      textNode = walker.nextNode();
    }
    
    if (!textNode || !textNode.textContent) {
      return false;
    }
    
    // Try to match text
    const textContent = textNode.textContent;
    const index = textContent.indexOf(searchText);
    
    if (index === -1) {
      return false;
    }
    
    // Create range
    const range = document.createRange();
    range.setStart(textNode, index);
    range.setEnd(textNode, index + searchText.length);
    
    // Scroll to range
    range.getBoundingClientRect();
    if (textNode.parentElement) {
      textNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Select
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('Error restoring selection:', e);
    return false;
  }
}

/**
 * Get coordinates for positioning toolbar near selection
 */
export function getToolbarPosition(range: Range): { top: number; left: number } | null {
  try {
    const rect = range.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    return {
      top: rect.bottom + scrollTop + 8, // 8px below selection
      left: rect.left + scrollLeft + (rect.width / 2), // Center of selection
    };
  } catch (e) {
    console.error('Error getting toolbar position:', e);
    return null;
  }
}

