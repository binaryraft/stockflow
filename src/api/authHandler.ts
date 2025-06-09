import { errorMonitor } from 'events';
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
    // Get token from storage if not provided in headers
    const token = headers.Authorization ? undefined : getTokenFromStorage();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
      credentials: 'include',
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    console.log('res ', response);
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorCode = typeof data === 'object' && data.code
        ? data.code
        : 'request-failed';
      const message = typeof data === 'object' && data.message
        ? data.message
        : getFriendlyErrorMessage(errorCode);
      throw new Error(
        JSON.stringify({
          code: errorCode,
          message,
          status: response.status,
        })
      );
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

export const loginUser = async (
  email: string,
  password: string
): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  console.log('Admin ', email, password);
  localStorage.setItem('adminEmail', email)
  
  console.log('deb')
  const ma = localStorage.getItem('adminEmail')
  console.log(ma)
  return apiFetch('/auth/login', 'POST', {
    email,
    password,
    role: 'admin',
  });
};

export const registerUser = async (
  id: string,
  name: string,
  email: string,
  password: string,
  selectedLanguage: string,
  currency: string,
  company: string,
  subscriptionPlan?: string,
): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  const subscription = subscriptionPlan ? { plan: mapSubscriptionPlan(subscriptionPlan) } : undefined;
  console.log("client ", email)
  return apiFetch('/auth/signup', 'POST', {
    id,
    name,
    email,
    password,
    selectedLanguage,
    currency,
    company,
    subscription,
    role: 'admin',
  });
};

export const registerEmployee = async (
  id: string,
  name: string,
  email: string,
  password: string,
  selectedLanguage: string,
  currency: string,
  company: string
): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  const inviterEmail = localStorage.getItem('adminEmail');
  
  if (!inviterEmail) {
    throw new Error('Admin email not found in localStorage');
  }

  const payload = {
    id,
    name,
    email,
    password,
    selectedLanguage,
    currency,
    company,
    inviterEmail,
    role: 'employee'
  };

  console.log('Registering employee...');
  console.log('Payload:', payload);

  try {
    const response = await apiFetch('/auth/signup', 'POST', payload);
    console.log('[registerEmployee] Response:', response);
    return response;
  } catch (error) {
    console.error('[registerEmployee] Error:', error);
    throw error;
  }
};

export const loginEmployee = async (
  email: string,
  password: string
): Promise<ApiResponse<{ token: string; user: UserData }>> => {
  return apiFetch('/auth/login', 'POST', {
    email,
    password,
    role: 'employee',
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
  return apiFetch('/auth/validate', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });
};

export function getTokenFromStorage(): string | undefined {
  const token = localStorage.getItem('adminToken');
  console.log("admin Token", token)
  return token || undefined;
}

export function setTokenToStorage(token: string): void {
  localStorage.setItem('adminToken', token);
}

export const getUserData = (): UserData | null => {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
};

export const setUserData = (user: UserData) => {
  try {
    localStorage.setItem('userData', JSON.stringify(user));
  } catch {
    console.error('Failed to save user data');
  }
};

export const getUserFromToken = async (
  token?: string
): Promise<ApiResponse<{ user: UserData }>> => {
  const cachedUser = getUserData();
  if (cachedUser) {
    return {
      success: true,
      data: { user: cachedUser },
      status: 200,
    };
  }

  if (!token) {
    token = getTokenFromStorage();
    if (!token) {
      return {
        success: false,
        error: 'invalid-token',
        message: 'Authentication token is missing.',
        status: 401,
      };
    }
  }

  const response = await apiFetch('/auth/getuserfromtoken', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

  if (response.success && response.data?.user) {
    console.log("---------- response of user", response)
    setUserData(response.data.user);
  }

  return response;
};

export const addProduct = async (
  product: Product,
  token?: string
): Promise<ApiResponse<Product>> => {
  if (!token) {
    token = getTokenFromStorage();
    if (!token) {
      return {
        success: false,
        error: 'invalid-token',
        message: 'Authentication token is missing.',
        status: 401,
      };
    }
  }

  return apiFetch('/products', 'POST', product, {
    Authorization: `Bearer ${token}`,
  });
};

export const getProductFromStorage = (): Product[] | null => {
  try {
    const data = localStorage.getItem('products');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setProductToStorage = (products: Product[]): void => {
  try {
    localStorage.setItem('products', JSON.stringify(products));
  } catch {
    // Handle error silently or log
  }
};

export const addProductToStorage = (newProduct: Product): boolean => {
  try {
    const currentProducts = getProductFromStorage() ?? [];
    currentProducts.push(newProduct);
    setProductToStorage(currentProducts);
    return true;
  } catch {
    return false;
  }
};

export const getProductLastId = (): string | null => {
  const lastId = localStorage.getItem('lastProductId');
  if (lastId) {
    return lastId;
  }
  return findLastProductId();
};

const findLastProductId = (): string | null => {
  const productsStr = localStorage.getItem('products');
  console.log('Products string from storage:', productsStr);
  if (!productsStr) {
    console.log('No products found in storage.');
    return null;
  }

  const products: Product[] = JSON.parse(productsStr);
  console.log('Parsed products:', products);
  if (products.length === 0) {
    console.log('Products array is empty.');
    return null;
  }

  const extractNumber = (id: string): number => {
    const match = id.match(/\d+$/);
    const num = match ? parseInt(match[0], 10) : 0;
    console.log(`Extracted number from id "${id}":`, num);
    return num;
  };

  const extractPrefix = (id: string): string => {
    const match = id.match(/^\D+/);
    return match ? match[0] : '';
  };

  const maxIdProduct = products.reduce((max, product) => {
    const currentNum = extractNumber(product.id);
    const maxNum = extractNumber(max.id);
    console.log(`Comparing current: ${currentNum} with max: ${maxNum}`);
    return currentNum > maxNum ? product : max;
  }, products[0]);

  console.log('Max product full id:', maxIdProduct.id);

  const prefix = extractPrefix(maxIdProduct.id);
  const numberPart = extractNumber(maxIdProduct.id);
  const incrementedNumber = numberPart + 1;

  const originalNumberLength = maxIdProduct.id.length - prefix.length;
  const incrementedNumberStr = incrementedNumber.toString().padStart(originalNumberLength, '0');

  const incrementedId = prefix + incrementedNumberStr;
  console.log('Incremented product id:', incrementedId);

  return incrementedId;
};

export const setProductLastId = (id: number): void => {
  localStorage.setItem('lastProductId', id.toString());
};

export const getAllProducts = async (
  token?: string
): Promise<ApiResponse<Product[]>> => {
  if (!token) {
    token = getTokenFromStorage();
    if (!token) {
      return {
        success: false,
        error: 'invalid-token',
        message: 'Authentication token is missing.',
        status: 401,
      };
    }
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

export const getAllPurchaseBillsFromServer = async (
  token?: string
): Promise<ApiResponse<Bill[]>> => {
  if (!token) {
    token = getTokenFromStorage();
    if (!token) {
      return {
        success: false,
        error: 'invalid-token',
        message: 'Authentication token is missing.',
        status: 401,
      };
    }
  }

  const response = await apiFetch('/purchase/bills', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

  return response;
};