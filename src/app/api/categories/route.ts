
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// GET all categories for a company
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyCategories = db.categories.filter(c => c.companyId === companyId);
    return NextResponse.json({ success: true, data: companyCategories.sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (error) {
    console.error('API GET /api/categories error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new category for a company
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId || !name) {
      return NextResponse.json({ success: false, message: 'Company ID and category name are required' }, { status: 400 });
    }

    const db = await readDB();

    const existingCategory = db.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.companyId === companyId);
    if (existingCategory) {
      return NextResponse.json({ success: false, message: `Category "${name}" already exists for this company.` }, { status: 409 });
    }
    
    // Conceptual: Add subscription check here if categories are limited by plan

    const newCategory: Category = {
      id: `cat_${uuidv4()}`,
      name,
      companyId,
    };

    db.categories.push(newCategory);
    await writeDB(db);

    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error) {
    console.error('API POST /api/categories error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

    