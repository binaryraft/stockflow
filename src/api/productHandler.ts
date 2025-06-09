import { Product } from '../types';
import { ApiResponse } from './api-types';
import { apiFetch, getTokenFromStorage, getUserFromToken } from './authHandler';

const PRODUCT_ENDPOINT = '/products';

const tokenMissingError = (): ApiResponse<any> => ({
  success: false,
  error: 'invalid-token',
  message: 'Authentication token is missing.',
  status: 401,
});

export const addProductToServer = async (
  productData: Partial<Product>,
  token?: string
): Promise<ApiResponse<Product>> => {
  token = token || getTokenFromStorage();
  if (!token) return tokenMissingError();
  const user = getUserFromToken(token);
  if (!user?.email) return tokenMissingError();

  return apiFetch(`${PRODUCT_ENDPOINT}/add`, 'POST', { email: user.email, productData }, {
    Authorization: `Bearer ${token}`,
  });
};

export const updateProductToServer = async (
  productId: string,
  productData: Partial<Product>,
  token?: string
): Promise<ApiResponse<Product>> => {
  token = token || getTokenFromStorage();
  if (!token) return tokenMissingError();
  const user = getUserFromToken(token);
  if (!user?.email) return tokenMissingError();

  return apiFetch(`${PRODUCT_ENDPOINT}/update`, 'PUT', { email: user.email, productId, productData }, {
    Authorization: `Bearer ${token}`,
  });
};

export const deleteProductToServer = async (
  productId: string,
  token?: string
): Promise<ApiResponse<{ deleted: boolean }>> => {
  token = token || getTokenFromStorage();
  if (!token) return tokenMissingError();
  const user = getUserFromToken(token);
  if (!user?.email) return tokenMissingError();

  return apiFetch(`${PRODUCT_ENDPOINT}/delete`, 'DELETE', { email: user.email, productId }, {
    Authorization: `Bearer ${token}`,
  });
};

export const getProductByIdToServer = async (
  productId: string,
  token?: string
): Promise<ApiResponse<Product>> => {
  token = token || getTokenFromStorage();
  if (!token) return tokenMissingError();
  const user = getUserFromToken(token);
  if (!user?.email) return tokenMissingError();

  return apiFetch(`${PRODUCT_ENDPOINT}/get/${productId}`, 'POST', { email: user.email }, {
    Authorization: `Bearer ${token}`,
  });
};

export const getAllProductsToServer = async (
  token?: string
): Promise<ApiResponse<Product[]>> => {
  token = token || getTokenFromStorage();
  if (!token) return tokenMissingError();
  const user = getUserFromToken(token);
  if (!user?.email) return tokenMissingError();

  return apiFetch(`${PRODUCT_ENDPOINT}/all`, 'POST', { email: user.email }, {
    Authorization: `Bearer ${token}`,
  });
};

export const searchProductsToServer = async (
  searchTerm: string,
  token?: string
): Promise<ApiResponse<Product[]>> => {
  token = token || getTokenFromStorage();
  if (!token) return tokenMissingError();
  const user = getUserFromToken(token);
  if (!user?.email) return tokenMissingError();

  return apiFetch(`${PRODUCT_ENDPOINT}/search`, 'POST', { email: user.email, searchTerm }, {
    Authorization: `Bearer ${token}`,
  });
};
