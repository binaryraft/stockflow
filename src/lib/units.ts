import { Boxes, Droplets, Layers, Link2, Package, Ruler, Scale, Weight, type LucideIcon } from 'lucide-react';

export interface ProductUnit {
  value: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const PRODUCT_UNITS: ProductUnit[] = [
  { value: 'nos', label: 'Nos (Pieces)', short: 'nos', icon: Package },
  { value: 'box', label: 'Box', short: 'box', icon: Boxes },
  { value: 'set', label: 'Set', short: 'set', icon: Layers },
  { value: 'pair', label: 'Pair', short: 'pair', icon: Link2 },
  { value: 'm', label: 'Meter', short: 'm', icon: Ruler },
  { value: 'cm', label: 'Centimeter', short: 'cm', icon: Ruler },
  { value: 'l', label: 'Litre', short: 'L', icon: Droplets },
  { value: 'ml', label: 'Millilitre', short: 'mL', icon: Droplets },
  { value: 'kg', label: 'Kilogram', short: 'kg', icon: Weight },
  { value: 'g', label: 'Gram', short: 'g', icon: Scale },
];

export const DEFAULT_UNIT_VALUE = 'nos';

export function getUnit(value?: string | null): ProductUnit | undefined {
  if (!value) return undefined;
  return PRODUCT_UNITS.find(u => u.value === value);
}

export function getUnitShort(value?: string | null): string {
  return getUnit(value)?.short ?? '';
}

/**
 * Rounds money values to 2 decimals to avoid float drift (0.1 + 0.2 problems).
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Rounds quantities to 3 decimals — enough for cm/mL/g precision while
 * keeping float noise out of stock layers.
 */
export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Formats a quantity for display: trims float noise and appends the unit
 * abbreviation when one exists (e.g. "2.5 m", "750 mL", "3 nos").
 */
export function formatQuantity(quantity: number | null | undefined, unit?: string | null): string {
  if (quantity === null || quantity === undefined || Number.isNaN(quantity)) return 'N/A';
  const clean = roundQuantity(quantity);
  const text = Number.isInteger(clean) ? String(clean) : String(parseFloat(clean.toFixed(3)));
  const short = getUnitShort(unit);
  return short ? `${text} ${short}` : text;
}
