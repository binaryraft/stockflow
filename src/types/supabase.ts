export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          token: string;
          active_subscription_id: string;
          logo_url: string | null;
          slogan: string | null;
          phone: string | null;
          address: string | null;
          gst_no: string | null;
          default_bill_notes: string | null;
          default_sales_payment_status: string | null;
          default_purchase_payment_status: string | null;
          currency: string | null;
          subscription_type: string | null;
          payment_status: string | null;
          creation_date: string | null;
          subscription_start_date: string | null;
          subscription_expiry_date: string | null;
          pending_subscription_id: string | null;
        };
        Insert: {
          id: string;
          name: string;
          token: string;
          active_subscription_id: string;
          logo_url?: string | null;
          slogan?: string | null;
          phone?: string | null;
          address?: string | null;
          gst_no?: string | null;
          default_bill_notes?: string | null;
          default_sales_payment_status?: string | null;
          default_purchase_payment_status?: string | null;
          currency?: string | null;
          subscription_type?: string | null;
          payment_status?: string | null;
          creation_date?: string | null;
          subscription_start_date?: string | null;
          subscription_expiry_date?: string | null;
          pending_subscription_id?: string | null;
        };
        Update: Partial<Insert>;
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          email: string | null;
          employee_id: string | null;
          password: string | null;
          role: string;
          assigned_store_ids: string[] | null;
          phone: string | null;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          email?: string | null;
          employee_id?: string | null;
          password?: string | null;
          role: string;
          assigned_store_ids?: string[] | null;
          phone?: string | null;
        };
        Update: Partial<Insert>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          track_quantity: boolean;
          sku: string | null;
          hsn_code: string | null;
          expiry_date: string | null;
          image_url: string | null;
          description: string | null;
          variants: Json | null;
          product_skus: Json;
          company_id: string;
          sgst_rate: number | null;
          cgst_rate: number | null;
          igst_rate: number | null;
          additional_charge_definitions: Json | null;
          is_archived: boolean | null;
        };
        Insert: {
          id: string;
          name: string;
          category?: string | null;
          track_quantity: boolean;
          sku?: string | null;
          hsn_code?: string | null;
          expiry_date?: string | null;
          image_url?: string | null;
          description?: string | null;
          variants?: Json | null;
          product_skus: Json;
          company_id: string;
          sgst_rate?: number | null;
          cgst_rate?: number | null;
          igst_rate?: number | null;
          additional_charge_definitions?: Json | null;
          is_archived?: boolean | null;
        };
        Update: Partial<Insert>;
      };
      bills: {
        Row: {
          id: string;
          invoice_number: string | null;
          type: string;
          date: string;
          timestamp: number;
          vendor_or_customer_name: string | null;
          customer_phone: string | null;
          items: Json;
          sub_total: number | null;
          total_sgst: number | null;
          total_cgst: number | null;
          total_igst: number | null;
          total_discount: number | null;
          tax_type: string | null;
          gstin: string | null;
          place_of_supply: string | null;
          billing_address: string | null;
          shipping_address: string | null;
          total_amount: number;
          is_estimate: boolean | null;
          notes: string | null;
          payment_status: string | null;
          billed_by_staff_id: string | null;
          billed_by_staff_name: string | null;
          store_id: string | null;
          store_name: string | null;
          company_id: string;
        };
        Insert: {
          id: string;
          invoice_number?: string | null;
          type: string;
          date: string;
          timestamp: number;
          vendor_or_customer_name?: string | null;
          customer_phone?: string | null;
          items: Json;
          sub_total?: number | null;
          total_sgst?: number | null;
          total_cgst?: number | null;
          total_igst?: number | null;
          total_discount?: number | null;
          tax_type?: string | null;
          gstin?: string | null;
          place_of_supply?: string | null;
          billing_address?: string | null;
          shipping_address?: string | null;
          total_amount: number;
          is_estimate?: boolean | null;
          notes?: string | null;
          payment_status?: string | null;
          billed_by_staff_id?: string | null;
          billed_by_staff_name?: string | null;
          store_id?: string | null;
          store_name?: string | null;
          company_id: string;
        };
        Update: Partial<Insert>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          company_id: string;
        };
        Insert: {
          id: string;
          name: string;
          company_id: string;
        };
        Update: Partial<Insert>;
      };
      stores: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          username: string;
          location: string;
          phone: string;
          email: string;
          access_code: string;
          passkey: string;
          allowed_staff_ids: string[] | null;
          allowed_operations: string[] | null;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          username: string;
          location: string;
          phone: string;
          email: string;
          access_code: string;
          passkey: string;
          allowed_staff_ids?: string[] | null;
          allowed_operations?: string[] | null;
        };
        Update: Partial<Insert>;
      };
      messages: {
        Row: {
          id: string;
          store_id: string;
          company_id: string;
          sender_id: string;
          sender_name: string;
          text: string;
          timestamp: number;
        };
        Insert: {
          id: string;
          store_id: string;
          company_id: string;
          sender_id: string;
          sender_name: string;
          text: string;
          timestamp: number;
        };
        Update: Partial<Insert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
