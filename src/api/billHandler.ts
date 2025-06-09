import { ApiResponse } from './api-types';
import { Bill, BillItem } from '../types';
import { apiFetch, getTokenFromStorage } from './authHandler';

const BILL_ENDPOINT = '/bills';

const tokenMissingError = (): ApiResponse<any> => ({
  success: false,
  error: 'invalid-token',
  message: 'Authentication token is missing.',
  status: 401,
});

export const addBillToServer = async (
  billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'> & {
    billedByStaffId?: string;
    storeId?: string;
  },
  items: Omit<BillItem, 'id' | 'productName'>[]
): Promise<ApiResponse<Bill>> => {
  const token = getTokenFromStorage();
  if (!token) return tokenMissingError();

  const payload = { ...billData, items };
  return apiFetch(BILL_ENDPOINT, 'POST', payload, {
    Authorization: `Bearer ${token}`,
  });
};

export const deleteBillFromServer = async (
  billId: string
): Promise<ApiResponse<{ message: string }>> => {
  const token = getTokenFromStorage();
  if (!token) return tokenMissingError();

  return apiFetch(`${BILL_ENDPOINT}/${billId}`, 'DELETE', null, {
    Authorization: `Bearer ${token}`,
  });
};

export const getBillByIdFromServer = async (
  billId: string
): Promise<ApiResponse<Bill>> => {
  const token = getTokenFromStorage();
  if (!token) return tokenMissingError();

  return apiFetch(`${BILL_ENDPOINT}/${billId}`, 'GET', null, {
    Authorization: `Bearer ${token}`,
  });
};

export const getAllBillsFromServer = async (): Promise<ApiResponse<Bill[]>> => {
  const token = getTokenFromStorage();
  if (!token) return tokenMissingError();

  return apiFetch(BILL_ENDPOINT, 'GET', null, {
    Authorization: `Bearer ${token}`,
  });
};

export const getBillsForProductFromServer = async (
  productId: string
): Promise<ApiResponse<Bill[]>> => {
  const token = getTokenFromStorage();
  if (!token) return tokenMissingError();

  const allBillsRes = await getAllBillsFromServer();
  if (!allBillsRes.success) return allBillsRes;

  const filteredBills = allBillsRes.data.filter((bill) =>
    bill.items.some((item) => item.productId === productId)
  );
  return {
    success: true,
    data: filteredBills,
    status: 200,
  };
};
