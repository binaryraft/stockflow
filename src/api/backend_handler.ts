import { ApiResponse, UserData } from './api-types';
import { Bill, Product } from '../types/index';

export const API_BASE_URL = 'http://localhost:3002/api';
const PURCHASE_STORAGE_KEY = 'purchase_bills';

export const getFriendlyErrorMessage = (errorCode: string): string => {
  const errorMap: Record<string, string> = {
    'invalid-credentials': 'Invalid email or password.',
    'user-not-found': 'No account found with this email.',
    'wrong-password': 'Incorrect password.',
    'user-already-exists': 'This email is already registered.',
    'weak-password': 'Password must be at least 6 characters long.',
    'invalid-email': 'Please enter a valid email address.',
    'missing-fields': 'All fields are required: name, company, email, password, language, and currency.',
    'network-error': 'Network error. Please check your connection.',
    'request-failed': 'Request failed. Please try again.',
    'server-error': 'Something went wrong. Please try again later.',
    'invalid-token': 'Session expired. Please sign in again.',
  };
  return errorMap[errorCode] || 'An unexpected error occurred.';
};

export const apiFetch = async <T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: object,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorCode = typeof data === 'object' && data.code ? data.code : 'request-failed';
      const message = typeof data === 'object' && data.message ? data.message : getFriendlyErrorMessage(errorCode);
      throw new Error(JSON.stringify({ code: errorCode, message, status: response.status }));
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    let errorData = {
      code: 'network-error',
      message: getFriendlyErrorMessage('network-error'),
      status: 500,
    };

    if (error instanceof Error && error.message) {
      try {
        errorData = JSON.parse(error.message);
      } catch {
        errorData.message = error.message;
      }
    }

    console.error('API request failed:', errorData);
    return {
      success: false,
      error: errorData.code,
      message: errorData.message,
      status: errorData.status,
    };
  }
};

export const loginUser = async (email: string, password: string): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  return apiFetch('/login', 'POST', { email, password });
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  selectedLanguage: string,
  currency: string,
  company: string,
  subscriptionPlan?: string,
  role: string = 'admin'
): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  const subscription = subscriptionPlan ? { plan: mapSubscriptionPlan(subscriptionPlan) } : undefined;

  return apiFetch('/signup', 'POST', {
    name,
    email,
    password,
    selectedLanguage,
    currency,
    company,
    subscription,
    role,
  });
};

const mapSubscriptionPlan = (plan: string): string => {
  const planMap: Record<string, string> = {
    admin: 'free',
    basic: 'premium',
    pro: 'enterprise',
    unlimited: 'enterprise',
  };
  return planMap[plan] || 'free';
};

export const validateToken = async (token: string): Promise<ApiResponse<{ user: UserData }>> => {
  return apiFetch('/validate', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });
};

export function getTokenFromStorage(): string | undefined {
  return localStorage.getItem('authToken') || undefined;
}

export function setTokenToStorage(token: string): void {
  localStorage.setItem('authToken', token);
}


export const getUserFromToken = async (token?: string): Promise<ApiResponse<{ user: UserData }>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }

  return apiFetch('/getUserFromToken', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });
};

export const addProduct = async (product: Product, token?: string): Promise<ApiResponse<Product>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }

  return apiFetch('/products', 'POST', product, {
    Authorization: `Bearer ${token}`,
  });
};

export const updateProduct = async (id: string, updatedData: Partial<Product>, token?: string): Promise<ApiResponse<Product>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }
  return apiFetch(`/products/${id}`, 'PUT', updatedData, {
    Authorization: `Bearer ${token}`,
  });
};

export const deleteProduct = async (id: string, token?: string): Promise<ApiResponse<{ message: string }>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }
  return apiFetch(`/products/${id}`, 'DELETE', undefined, {
    Authorization: `Bearer ${token}`,
  });
};

export const getProductById = async (id: string, token?: string): Promise<ApiResponse<Product>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }
  return apiFetch(`/products/${id}`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });
};

export const getAllProducts = async (token?: string): Promise<ApiResponse<Product[]>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }

  const response = await apiFetch('/products', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

  if (response.success && response.data?.products) {
    setProductToStorage(response.data.products);
  }

  return response;
};

export const savePurchaseBillToLocalStorage = (bill: Bill): void => {
  const existing = localStorage.getItem(PURCHASE_STORAGE_KEY);
  const bills: Bill[] = existing ? JSON.parse(existing) : [];
  bills.push(bill);
  localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(bills));
};

export const getAllPurchaseBillsFromLocalStorage = (): Bill[] => {
  const existing = localStorage.getItem(PURCHASE_STORAGE_KEY);
  return existing ? JSON.parse(existing) : [];
};

export const getAllPurchaseBillsFromServer = async (token?: string): Promise<ApiResponse<Bill[]>> => {
  token = token || getTokenFromStorage();
  if (!token) {
    return {
      success: false,
      error: 'invalid-token',
      message: 'Authentication token is missing.',
      status: 401,
    };
  }
  return apiFetch('/purchase/bills', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });
};
