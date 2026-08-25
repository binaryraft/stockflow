-- StockFlow Supabase Migration
-- Tables: companies, users, products, bills, categories, stores, messages

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  active_subscription_id TEXT NOT NULL DEFAULT 'growth',
  logo_url TEXT,
  slogan TEXT,
  phone TEXT,
  address TEXT,
  gst_no TEXT,
  default_bill_notes TEXT,
  default_sales_payment_status TEXT DEFAULT 'paid',
  default_purchase_payment_status TEXT DEFAULT 'paid',
  currency TEXT DEFAULT 'INR',
  subscription_type TEXT DEFAULT 'monthly',
  payment_status TEXT DEFAULT 'pending',
  creation_date TEXT,
  subscription_start_date TEXT,
  subscription_expiry_date TEXT,
  pending_subscription_id TEXT
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  employee_id TEXT,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'employee',
  assigned_store_ids TEXT[] DEFAULT '{}',
  phone TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_employee ON users(role, employee_id, company_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  track_quantity BOOLEAN NOT NULL DEFAULT true,
  sku TEXT,
  hsn_code TEXT,
  expiry_date TEXT,
  image_url TEXT,
  description TEXT,
  variants JSONB DEFAULT '[]',
  product_skus JSONB NOT NULL DEFAULT '[]',
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sgst_rate NUMERIC,
  cgst_rate NUMERIC,
  igst_rate NUMERIC,
  cost_price_for_non_tracked NUMERIC,
  sell_price_for_non_tracked NUMERIC,
  additional_charge_definitions JSONB DEFAULT '[]',
  is_archived BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);

-- ============================================================
-- BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  vendor_or_customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  sub_total NUMERIC,
  total_sgst NUMERIC,
  total_cgst NUMERIC,
  total_igst NUMERIC,
  total_discount NUMERIC,
  tax_type TEXT,
  gstin TEXT,
  place_of_supply TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  is_estimate BOOLEAN DEFAULT false,
  notes TEXT,
  payment_status TEXT DEFAULT 'paid',
  billed_by_staff_id TEXT,
  billed_by_staff_name TEXT,
  store_id TEXT,
  store_name TEXT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bills_company_id ON bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_company_date ON bills(company_id, date);
CREATE INDEX IF NOT EXISTS idx_bills_company_type ON bills(company_id, type);
CREATE INDEX IF NOT EXISTS idx_bills_store_id ON bills(store_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_company ON categories(company_id, LOWER(name));

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  access_code TEXT NOT NULL,
  passkey TEXT NOT NULL,
  allowed_staff_ids TEXT[] DEFAULT '{}',
  allowed_operations TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_stores_company_id ON stores(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_username_company ON stores(company_id, username);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_store_company ON messages(store_id, company_id);

-- ============================================================
-- RLS (Row Level Security) - Enable but allow service_role bypass
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY "Service role full access" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Anon read access (for client-side queries if needed)
CREATE POLICY "Anon read access" ON companies FOR SELECT USING (true);
CREATE POLICY "Anon read access" ON users FOR SELECT USING (true);
CREATE POLICY "Anon read access" ON products FOR SELECT USING (true);
CREATE POLICY "Anon read access" ON bills FOR SELECT USING (true);
CREATE POLICY "Anon read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Anon read access" ON stores FOR SELECT USING (true);
CREATE POLICY "Anon read access" ON messages FOR SELECT USING (true);
