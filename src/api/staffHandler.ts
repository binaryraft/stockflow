import { ApiResponse } from './api-types';
import { Staff, UserProfile } from '../types/index';
import { apiFetch, getTokenFromStorage, getUserFromToken } from './authHandler';
import { registerEmployee } from './authHandler';

const STAFF_ENDPOINT = '/staff';

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

export const addStaffToServer = async (
  staff: Staff,
  token?: string
): Promise<ApiResponse<Staff>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();


  let adminEmail = localStorage.getItem('adminEmail');

if (!adminEmail) {
  const response = await getUserFromToken(token);
  console.log('userFromToken', response.data?.user?.email);
  adminEmail = response.data?.user?.email; // double-check response structure
}

 console.log('admin email', adminEmail)
 
  if (!adminEmail) {
    console.error('[addStaffToServer] Admin email missing');
    return {
      success: false,
      error: 'missing-admin-email',
      message: 'Admin email not found in localStorage.',
      status: 400,
    };
  }

  // Validate staff object
  const missingFields = [];
  if (!staff.name) missingFields.push('name');
  if (!staff.email) missingFields.push('email');
  if (missingFields.length > 0) {
    console.error('[addStaffToServer] Missing staff fields:', missingFields);
    return {
      success: false,
      error: 'invalid-input',
      message: `Missing staff fields: ${missingFields.join(', ')}`,
      status: 400,
    };
  }

  // Get user data to ensure companyId is available
  const userResponse = await getUserFromToken(token);
  if (!userResponse.success || !userResponse.data?.user?.email) {
    console.error('[addStaffToServer] User fetch failed:', userResponse);
    return tokenMissingError();
  }
  const user = userResponse.data.user;

  // Register the employee first
  const registerResponse = await registerEmployee(
    staff.id ,
    staff.name,
    staff.email,
    staff.passkey,
    user.language || 'en',
    user.currency || 'USD',
    user.companyId || user.company || '',
    adminEmail
  );

  if (!registerResponse.success) {
    console.error('[addStaffToServer] Register employee failed:', registerResponse);
    return registerResponse;
  }

  // Save employee token if valid
  if (registerResponse.data?.token && typeof registerResponse.data.token === 'string') {
    try {
      saveEmployeeTokenToStorage(registerResponse.data.token);
      console.log('[addStaffToServer] Employee token saved:', registerResponse.data.token);
    } catch (err) {
      console.error('[addStaffToServer] Failed to save employee token:', err);
    }
  } else {
    console.warn('[addStaffToServer] No valid token in registerResponse:', registerResponse);
  }

  // Add staff to server
  const payload = {
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      department: staff.department || '',
      id: staff.id || `emp-${Date.now()}`,
      passkey: staff.passkey || `pass-${Date.now()}`
    },
    createdBy: adminEmail,
  };
  console.log('[addStaffToServer] Sending payload:', payload);

  return apiFetch(`${STAFF_ENDPOINT}/add`, 'POST', payload, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const updateStaffToServer = async (
  staffId: string,
  staffData: Partial<Staff>,
  token?: string
): Promise<ApiResponse<Staff>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  return apiFetch(`${STAFF_ENDPOINT}/update`, 'PUT', { staffId, staffData }, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const deleteStaffToServer = async (
  staffId: string,
  token?: string
): Promise<ApiResponse<{ deleted: boolean }>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  return apiFetch(`${STAFF_ENDPOINT}/delete`, 'DELETE', { staffId }, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const getStaffByIdToServer = async (
  staffId: string,
  token?: string
): Promise<ApiResponse<Staff>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  return apiFetch(`${STAFF_ENDPOINT}/get/${staffId}`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const getAllStaffToServer = async (
  token?: string
): Promise<ApiResponse<Staff[]>> => {
  token ||= getValidToken();
  if (!token) return tokenMissingError();

  return apiFetch(`${STAFF_ENDPOINT}/all`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

// ========== TOKEN HELPERS ==========

export const getEmployeeTokenFromStorage = (): string | undefined =>
  localStorage.getItem('employeeToken') || undefined;

export const saveEmployeeTokenToStorage = (token: string): void => {
  try {
    localStorage.setItem('employeeToken', token);
    console.log('[saveEmployeeTokenToStorage] Token saved successfully');
  } catch (err) {
    console.error('[saveEmployeeTokenToStorage] Failed to save token:', err);
  }
};

export const removeEmployeeTokenFromStorage = (): void => {
  try {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('adminToken');
    console.log('[removeEmployeeTokenFromStorage] Tokens removed successfully');
  } catch (err) {
    console.error('[removeEmployeeTokenFromStorage] Failed to remove tokens:', err);
  }
};

// ========== EMPLOYEE HELPERS ==========

export const getStaffDetailsForEmployee = async (
  staffId: string
): Promise<ApiResponse<Staff>> => {
  const token = getEmployeeTokenFromStorage();
  if (!token) return tokenMissingError();

  return apiFetch(`${STAFF_ENDPOINT}/get/${staffId}`, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};

export const getEmployeeFromToken = async (): Promise<ApiResponse<UserProfile>> => {
  const token = getEmployeeTokenFromStorage();
  if (!token) return tokenMissingError();

  return apiFetch('/auth/getemployeefromtoken', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
};