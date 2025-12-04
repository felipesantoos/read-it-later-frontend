import { api, type ApiResponse } from './client';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  articleCollections?: Array<{
    article: any;
  }>;
}

export interface CreateCollectionData {
  name: string;
  description?: string;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
}

export const collectionsApi = {
  list: () => api.get<ApiResponse<Collection[]>>('/collections'),
  get: (id: string) => api.get<ApiResponse<Collection>>(`/collections/${id}`),
  create: (data: CreateCollectionData) =>
    api.post<ApiResponse<Collection>>('/collections', data),
  update: (id: string, data: UpdateCollectionData) =>
    api.patch<ApiResponse<Collection>>(`/collections/${id}`, data),
  delete: (id: string) => api.delete(`/collections/${id}`),
  addArticle: (collectionId: string, articleId: string) =>
    api.post<ApiResponse<any>>(`/collections/${collectionId}/articles`, { articleId }),
  removeArticle: (collectionId: string, articleId: string) =>
    api.delete(`/collections/${collectionId}/articles/${articleId}`),
};

