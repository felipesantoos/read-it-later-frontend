import { api, type ApiResponse } from './client';

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  articleTags?: Array<{
    article: any;
  }>;
}

export interface CreateTagData {
  name: string;
}

export const tagsApi = {
  list: () => api.get<ApiResponse<Tag[]>>('/tags'),
  create: (data: CreateTagData) =>
    api.post<ApiResponse<Tag>>('/tags', data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  addToArticle: (tagId: string, articleId: string) =>
    api.post<ApiResponse<any>>(`/tags/${tagId}/articles`, { articleId }),
  removeFromArticle: (tagId: string, articleId: string) =>
    api.delete(`/tags/${tagId}/articles/${articleId}`),
};

