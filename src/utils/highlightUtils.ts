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
 * Anchor-based position information (Version 2)
 */
export interface AnchorInfo {
  version: 2;
  startAnchor: string;
  startOffset: number;
  endAnchor: string;
  endOffset: number;
  containerXPath: string;
  text: string;
}

/**
 * Legacy position format (Version 1)
 */
interface LegacyPositionInfo {
  xpath?: string;
  startOffset?: number;
  endOffset?: number;
  text: string;
}

/**
 * Get XPath for an element (does not include text nodes)
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
 * Get XPath for any node, including text nodes
 */
function getXPathForNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentNode;
    if (!parent) return '';
    
    // Get parent XPath
    const parentXPath = getXPath(parent);
    
    // Count preceding text siblings
    let textIndex = 1;
    let sibling = node.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        textIndex++;
      }
      sibling = sibling.previousSibling;
    }
    
    // Also count preceding element siblings that might contain text
    // We need to count all text nodes before this one in document order
    const walker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let count = 1;
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      if (textNode === node) {
        break;
      }
      count++;
    }
    
    return `${parentXPath}/text()[${count}]`;
  }
  
  return getXPath(node);
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
 * Find the root container element for the article content
 */
function findArticleRoot(node: Node): Node {
  let current: Node | null = node;
  
  // Look for common article container classes/ids
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const el = current as Element;
    if (
      el.classList.contains('article-content') ||
      el.classList.contains('article') ||
      el.id === 'article-content' ||
      el.id === 'article'
    ) {
      return current;
    }
    current = current.parentNode;
  }
  
  // Fallback to document.body or the node itself
  return document.body || node;
}

/**
 * Create anchor information from a Range
 */
export function createAnchorFromRange(range: Range, _root?: Node): AnchorInfo {
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  const container = range.commonAncestorContainer;
  const containerElement = container.nodeType === Node.TEXT_NODE 
    ? container.parentElement 
    : container as Element;
  
  const startAnchor = getXPathForNode(startNode);
  const endAnchor = getXPathForNode(endNode);
  const containerXPath = containerElement ? getXPath(containerElement) : '';
  
  return {
    version: 2,
    startAnchor,
    startOffset,
    endAnchor,
    endOffset,
    containerXPath,
    text: range.toString().trim(),
  };
}

/**
 * Capture selection information including position (using anchor-based system)
 */
export function captureSelectionInfo(root?: Node): SelectionInfo | null {
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
  
  // Create anchor-based position (Version 2)
  const anchorInfo = createAnchorFromRange(range, root);
  const position = JSON.stringify(anchorInfo);
  
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
 * Find node by XPath, including text nodes
 */
export function findNodeByXPath(xpath: string, root: Node = document): Node | null {
  try {
    // Handle text node XPath (e.g., /path/to/element/text()[1])
    if (xpath.includes('/text()[')) {
      const parts = xpath.split('/text()[');
      const elementPath = parts[0];
      const indexPart = parts[1]?.replace(']', '');
      const textIndex = indexPart ? parseInt(indexPart, 10) : 1;
      
      // Find the parent element
      const parentElement = findElementByXPath(elementPath, root);
      if (!parentElement) {
        return null;
      }
      
      // Find the text node at the specified index
      const walker = document.createTreeWalker(
        parentElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let count = 0;
      let textNode: Node | null;
      while ((textNode = walker.nextNode())) {
        count++;
        if (count === textIndex) {
          return textNode;
        }
      }
      
      return null;
    }
    
    // Regular element XPath
    return findElementByXPath(xpath, root);
  } catch (e) {
    console.error('Error finding node by XPath:', e);
    return null;
  }
}

/**
 * Restore Range from anchor information
 */
export function restoreRangeFromAnchors(anchorInfo: AnchorInfo, _root: Node = document): Range | null {
  try {
    // Always use document as root for absolute XPath
    let startNode = findNodeByXPath(anchorInfo.startAnchor, document);
    let endNode = findNodeByXPath(anchorInfo.endAnchor, document);
    
    // If nodes not found by absolute XPath, try using containerXPath as fallback
    if (!startNode || !endNode) {
      console.warn('Could not find start or end node for anchor, XPath may have changed:', {
        startAnchor: anchorInfo.startAnchor,
        endAnchor: anchorInfo.endAnchor,
        containerXPath: anchorInfo.containerXPath,
        startNodeFound: !!startNode,
        endNodeFound: !!endNode,
      });
      return null;
    }
    
    // If startNode is an element, find the appropriate text node or child
    if (startNode.nodeType === Node.ELEMENT_NODE) {
      const element = startNode as Element;
      // If offset is 0, we want the start of the first text node
      if (anchorInfo.startOffset === 0) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        startNode = walker.nextNode() || element.firstChild || element;
        if (startNode && startNode.nodeType === Node.TEXT_NODE) {
          // Use offset 0 within the text node
        } else {
          startNode = element;
        }
      } else {
        // Offset refers to child index
        const child = element.childNodes[anchorInfo.startOffset];
        if (child) {
          startNode = child;
        }
      }
    }
    
    // If endNode is an element, find the appropriate text node or child
    if (endNode.nodeType === Node.ELEMENT_NODE) {
      const element = endNode as Element;
      // If offset is 0, we want the end of the last text node (to mark the end of highlight)
      if (anchorInfo.endOffset === 0) {
        // Find the last text node within this element
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        let lastTextNode: Node | null = null;
        let textNode: Node | null;
        while ((textNode = walker.nextNode())) {
          lastTextNode = textNode;
        }
        if (lastTextNode && lastTextNode.nodeType === Node.TEXT_NODE) {
          endNode = lastTextNode;
          anchorInfo.endOffset = (lastTextNode as Text).length;
        }
      } else {
        // Offset refers to child index
        const child = element.childNodes[anchorInfo.endOffset];
        if (child) {
          endNode = child;
          // If it's a text node, use full length; if element, find last text node
          if (endNode.nodeType === Node.TEXT_NODE) {
            anchorInfo.endOffset = (endNode as Text).length;
          } else {
            // Find last text node in the child element
            const walker = document.createTreeWalker(endNode, NodeFilter.SHOW_TEXT, null);
            let lastTextNode: Node | null = null;
            let textNode: Node | null;
            while ((textNode = walker.nextNode())) {
              lastTextNode = textNode;
            }
            if (lastTextNode && lastTextNode.nodeType === Node.TEXT_NODE) {
              endNode = lastTextNode;
              anchorInfo.endOffset = (lastTextNode as Text).length;
            } else {
              anchorInfo.endOffset = 0;
            }
          }
        }
      }
    }
    
    // Validate offsets
    if (startNode.nodeType === Node.TEXT_NODE) {
      const maxStartOffset = (startNode as Text).length;
      if (anchorInfo.startOffset > maxStartOffset) {
        console.warn('Start offset exceeds node length:', anchorInfo.startOffset, '>', maxStartOffset);
        return null;
      }
    }
    
    if (endNode.nodeType === Node.TEXT_NODE) {
      const maxEndOffset = (endNode as Text).length;
      if (anchorInfo.endOffset > maxEndOffset) {
        console.warn('End offset exceeds node length:', anchorInfo.endOffset, '>', maxEndOffset);
        return null;
      }
    }
    
    // Create Range
    const range = document.createRange();
    range.setStart(startNode, anchorInfo.startOffset);
    range.setEnd(endNode, anchorInfo.endOffset);
    
    // Validate range is valid
    if (range.collapsed) {
      console.warn('Range is collapsed after restoration');
      return null;
    }
    
    return range;
  } catch (e) {
    console.error('Error restoring range from anchors:', e);
    return null;
  }
}

/**
 * Normalize text for comparison (remove extra whitespace, trim)
 */
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Check if position string is in anchor format (Version 2)
 */
export function isAnchorFormat(position: string): boolean {
  try {
    const parsed = JSON.parse(position);
    return parsed && parsed.version === 2 && parsed.startAnchor && parsed.endAnchor;
  } catch {
    return false;
  }
}

/**
 * Parse position string and return either AnchorInfo or LegacyPositionInfo
 */
export function parsePosition(position: string): AnchorInfo | LegacyPositionInfo | null {
  try {
    const parsed = JSON.parse(position);
    if (parsed && parsed.version === 2) {
      return parsed as AnchorInfo;
    }
    return parsed as LegacyPositionInfo;
  } catch {
    return null;
  }
}

/**
 * Restore selection from position identifier
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
    
    const searchText = parsedPos.text;
    const normalizedSearchText = normalizeText(searchText);
    
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
    
    // Second, try to find an existing highlight mark by matching text
    const allMarks = container.querySelectorAll('mark[data-highlight-id]');
    for (const mark of Array.from(allMarks)) {
      const markText = mark.textContent || '';
      if (normalizeText(markText) === normalizedSearchText) {
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
    
    // Third, try anchor-based restoration (Version 2)
    if (isAnchorFormat(position) && parsedPos && 'startAnchor' in parsedPos) {
      const anchorInfo = parsedPos as AnchorInfo;
      const root = findArticleRoot(container);
      const range = restoreRangeFromAnchors(anchorInfo, root);
      
      if (range) {
        // Scroll to range
        const rect = range.getBoundingClientRect();
        if (rect.height > 0) {
          range.startContainer.nodeType === Node.TEXT_NODE
            ? (range.startContainer.parentElement || container).scrollIntoView({ behavior: 'smooth', block: 'center' })
            : (range.startContainer as Element).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Select
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        }
      }
    }
    
    // Fourth, fallback to legacy XPath-based search
    if (parsedPos && 'xpath' in parsedPos && parsedPos.xpath) {
      const element = findElementByXPath(parsedPos.xpath, container);
      
      if (element && (element.nodeType === Node.TEXT_NODE || element.nodeType === Node.ELEMENT_NODE)) {
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
        
        if (textNode && textNode.textContent) {
          // Try exact match first
          let index = textNode.textContent.indexOf(searchText);
          if (index === -1) {
            // Try normalized match
            const normalizedTextContent = normalizeText(textNode.textContent);
            if (normalizedTextContent.includes(normalizedSearchText)) {
              // Try to find approximate position
              index = textNode.textContent.toLowerCase().indexOf(searchText.toLowerCase());
            }
          }
          
          if (index !== -1) {
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
          }
        }
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
    // Position at top right of selection by default
    const relativeTop = rect.top - parentRect.top - 8; // 8px above selection
    const relativeLeft = rect.right - parentRect.left + 8; // Right edge of selection + 8px offset
    
    return {
      top: relativeTop,
      left: relativeLeft,
    };
  } catch (e) {
    console.error('Error getting toolbar position:', e);
    return null;
  }
}

