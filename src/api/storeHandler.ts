import { ApiResponse } from './api-types';
import { Store } from '../types/index';
import { apiFetch, getTokenFromStorage } from './authHandler';
import { getEmployeeTokenFromStorage, saveEmployeeTokenToStorage, removeEmployeeTokenFromStorage } from './staffHandler';

const STORE_ENDPOINT = '/stores';

const tokenMissingError = <T = any>(): ApiResponse<T> => ({
  success: false,
  error: 'invalid-token',
  message: 'Authentication token is missing.',
  status: 401,
});

const getValidToken = (): string | undefined => {
  const token = getTokenFromStorage() || getEmployeeTokenFromStorage();
  console.log('[Token Check] Token:', token);
  return token || undefined;
};

export const addStoreToServer = async (
  store: Store,
  token?: string
): Promise<ApiResponse<Store>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  // Validate store object
  const missingFields = [];
  if (!store.name) missingFields.push('name');
  if (!store.location) missingFields.push('location');
  if (!store.id) missingFields.push('id');
  if (missingFields.length > 0) {
    console.error('[addStoreToServer] Missing store fields:', missingFields);
    return {
      success: false,
      error: 'invalid-input',
      message: `Missing store fields: ${missingFields.join(', ')}`,
      status: 400,
    };
  }

  // Get admin email from localStorage
  const adminEmail = localStorage.getItem('adminEmail');
  if (!adminEmail) {
    console.error('[addStoreToServer] Admin email missing');
    return {
      success: false,
      error: 'missing-admin-email',
      message: 'Admin email not found in localStorage.',
      status: 400,
    };
  }

  const payload = {
    store: {
      id: store.id,
      name: store.name,
      location: store.location,
      email: store.email || '',
      phone: store.phone || '',
    },
    createdBy: adminEmail,
  };
  console.log('[addStoreToServer] Sending payload:', payload);

  return apiFetch(`${STORE_ENDPOINT}/add`, 'POST', payload, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const updateStoreToServer = async (
  storeId: string,
  storeData: Partial<Store>,
  token?: string
): Promise<ApiResponse<Store>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  if (!storeId) {
    console.error('[updateStoreToServer] Store ID is missing');
    return {
      success: false,
      error: 'invalid-input',
      message: 'Store ID is required.',
      status: 400,
    };
  }

  console.log('[updateStoreToServer] Updating store:', storeId, storeData);
  return apiFetch(`${STORE_ENDPOINT}/update/${storeId}`, 'PUT', { storeId, storeData }, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const deleteStoreToServer = async (
  storeId: string,
  token?: string
): Promise<ApiResponse<{ deleted: boolean }>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  if (!storeId) {
    console.error('[deleteStoreToServer] Store ID is missing');
    return {
      success: false,
      error: 'invalid-input',
      message: 'Store ID is required.',
      status: 400,
    };
  }

  console.log('[deleteStoreToServer] Deleting store:', storeId);
  return apiFetch(`${STORE_ENDPOINT}/delete/${storeId}`, 'DELETE', { storeId }, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const getStoreByIdToServer = async (
  storeId: string,
  token?: string
): Promise<ApiResponse<Store>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  if (!storeId) {
    console.error('[getStoreByIdToServer] Store ID is missing');
    return {
      success: false,
      error: 'invalid-input',
      message: 'Store ID is required.',
      status: 400,
    };
  }

  console.log('[getStoreByIdToServer] Fetching store:', storeId);
  return apiFetch(`${STORE_ENDPOINT}/get/${storeId}`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const getAllStoresToServer = async (
  token?: string
): Promise<ApiResponse<Store[]>> => {
  token ||= getValidToken();
  if (!token) {
    console.error('[getAllStoresToServer] Token is missing');
    return tokenMissingError();
  }

  console.log('[getAllStoresToServer] Fetching all stores with token:', token);
  return apiFetch(`${STORE_ENDPOINT}/all`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const getStoreDetailsByEmailFromServer = async (
  email: string,
  token?: string
): Promise<ApiResponse<Store[]>> => {
  token ||= getEmployeeTokenFromStorage();
  if (!token) return tokenMissingError();

  if (!email) {
    console.error('[getStoreDetailsByEmailFromServer] Email is missing');
    return {
      success: false,
      error: 'invalid-input',
      message: 'Email is required.',
      status: 400,
    };
  }

  console.log('[getStoreDetailsByEmailFromServer] Fetching stores for email:', email);
  return apiFetch(`${STORE_ENDPOINT}/details/by-email?email=${encodeURIComponent(email)}`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

// ========== STORE TOKEN HELPERS ==========

export const saveStoreTokenToStorage = (token: string): void => {
  try {
    localStorage.setItem('storeToken', token);
    console.log('[saveStoreTokenToStorage] Token saved successfully');
  } catch (err) {
    console.error('[saveStoreTokenToStorage] Failed to save token:', err);
  }
};

export const getStoreTokenFromStorage = (): string | undefined =>
  localStorage.getItem('storeToken') || undefined;

export const removeStoreTokenFromStorage = (): void => {
  try {
    localStorage.removeItem('storeToken');
    console.log('[removeStoreTokenFromStorage] Token removed successfully');
  } catch (err) {
    console.error('[removeStoreTokenFromStorage] Failed to remove token:', err);
  }
};