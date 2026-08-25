-- Migration 002: Add fallback pricing columns for non-tracked products.
-- These are written by POST /api/products and read by the billing UI
-- as default cost/sell prices when a product does not track quantity.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price_for_non_tracked NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sell_price_for_non_tracked NUMERIC;

-- Keep privileges consistent for roles that already have table access.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
