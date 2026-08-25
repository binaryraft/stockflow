-- Migration 003: product unit of measure (nos / m / cm / L / mL / kg / g / box / set / pair)
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
