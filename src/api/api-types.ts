// types.ts (create this new file)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?:number;
  message?: string;
  token?: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  language?: string;
  currency?: string;
  theme?: string;
}
