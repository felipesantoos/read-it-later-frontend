import { api, type ApiResponse, type PaginatedResponse } from './client';

export interface Article {
  id: string;
  url: string;
  urlHash: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  coverImage: string | null;
  siteName: string | null;
  content: string | null;
  contentType: 'ARTICLE' | 'BLOG' | 'PDF' | 'YOUTUBE' | 'TWITTER' | 'NEWSLETTER' | 'BOOK' | 'EBOOK';
  status: 'UNREAD' | 'READING' | 'FINISHED' | 'ARCHIVED';
  isFavorited: boolean;
  language: string | null;
  attributes: Record<string, any> | null;
  readingProgress: number;
  readingTime: number | null;
  wordCount: number | null;
  lastReadAt: Date | null;
  readCount: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  articleTags?: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  articleCollections?: Array<{
    collection: {
      id: string;
      name: string;
    };
  }>;
}

export interface CreateArticleData {
  url: string;
  contentType?: Article['contentType'];
  title?: string;
  description?: string;
  favicon?: string;
  coverImage?: string;
  siteName?: string;
  content?: string;
  attributes?: Record<string, any>;
  token?: string; // For public API
}

export interface UpdateArticleData {
  status?: Article['status'];
  isFavorited?: boolean;
  readingProgress?: number;
  attributes?: Record<string, any>;
  title?: string;
  description?: string;
}

export const articlesApi = {
  list: (params?: {
    status?: string;
    isFavorited?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.isFavorited !== undefined) query.set('isFavorited', params.isFavorited.toString());
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return api.get<PaginatedResponse<Article>>(
      `/articles${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) =>
    api.get<ApiResponse<Article>>(`/articles/${id}`),
  create: (data: CreateArticleData) =>
    api.post<ApiResponse<Article>>('/articles', data),
  update: (id: string, data: UpdateArticleData) =>
    api.patch<ApiResponse<Article>>(`/articles/${id}`, data),
  delete: (id: string) => api.delete(`/articles/${id}`),
  updateReadingProgress: (id: string, progress: number) =>
    api.post<ApiResponse<Article>>(`/articles/${id}/read`, { progress }),
};

