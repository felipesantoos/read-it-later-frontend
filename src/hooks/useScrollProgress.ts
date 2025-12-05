import { useEffect, useRef, MutableRefObject } from 'react';
import { articlesApi, type Article } from '../api/articles';

interface UseScrollProgressOptions {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  article: Article | null;
  onArticleUpdate: (updates: Partial<Article>) => void;
}

export function useScrollProgress({ contentRef, article, onArticleUpdate }: UseScrollProgressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const articleRef = useRef(article);
  const onUpdateRef = useRef(onArticleUpdate);

  // Keep refs updated
  useEffect(() => {
    articleRef.current = article;
    onUpdateRef.current = onArticleUpdate;
  }, [article, onArticleUpdate]);

  useEffect(() => {
    if (!contentRef.current || !article) return;

    const handleScroll = () => {
      const element = contentRef.current;
      const currentArticle = articleRef.current;
      if (!element || !currentArticle) return;

      // Disable scroll-based progress update if totalPages is set (>= 1)
      // Progress should only be updated by page changes in this case
      if (currentArticle.totalPages !== null && currentArticle.totalPages >= 1) {
        return;
      }

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Update reading progress (throttle to avoid too many requests)
      timeoutRef.current = setTimeout(async () => {
        try {
          let updatedArticle: Article | null = null;
          const currentArticle = articleRef.current;
          if (!currentArticle) return;

          // Only update if progress increased (never decrease progress based on scroll)
          const currentProgress = currentArticle.readingProgress || 0;
          
          // Never decrease progress - only update if new progress is greater
          if (progress <= currentProgress) {
            return;
          }
          
          // Only update if progress increased significantly (more than 0.5% difference)
          const progressDiff = progress - currentProgress;
          if (progressDiff < 0.005) {
            return;
          }

          // Update by progress percentage - backend will sync currentPage if totalPages is set
          const response = await articlesApi.updateReadingProgress(currentArticle.id, progress);
          updatedArticle = response.data;

          // Update local state if we got an updated article
          if (updatedArticle) {
            onUpdateRef.current(updatedArticle);
          }
        } catch (error) {
          console.error('Error updating progress:', error);
          // Não mostrar toast para atualizações automáticas de scroll
        }
      }, 1000);
    };

    const element = contentRef.current;
    element.addEventListener('scroll', handleScroll);
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [contentRef, article]);
}

