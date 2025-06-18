
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Category } from '@/types';

// GET a single category by ID
export async function GET(req: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const category = db.categories.find(c => c.id === categoryId && c.companyId === companyId);

    if (!category) {
      return NextResponse.json({ success: false, message: 'Category not found or does not belong to this company' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error(`API GET /api/categories/${params.categoryId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a category by ID
export async function PUT(req: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    const { categoryId } = params;
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Category name is required and must be a non-empty string' }, { status: 400 });
    }

    const db = await readDB();
    const categoryIndex = db.categories.findIndex(c => c.id === categoryId && c.companyId === companyId);

    if (categoryIndex === -1) {
      return NextResponse.json({ success: false, message: 'Category not found or not associated with this company' }, { status: 404 });
    }

    // Check if new name already exists for this company (excluding current category)
    const existingCategoryWithName = db.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase() && c.companyId === companyId && c.id !== categoryId);
    if (existingCategoryWithName) {
      return NextResponse.json({ success: false, message: `Another category with the name "${name.trim()}" already exists for this company.` }, { status: 409 });
    }
    
    db.categories[categoryIndex].name = name.trim();
    await writeDB(db);

    return NextResponse.json({ success: true, data: db.categories[categoryIndex] });
  } catch (error) {
    console.error(`API PUT /api/categories/${params.categoryId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a category by ID
export async function DELETE(req: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const db = await readDB();
    
    // Optional: Check if category is in use by any products of this company
    const isCategoryInUse = db.products.some(p => p.category === db.categories.find(c=>c.id === categoryId)?.name && p.companyId === companyId);
    if (isCategoryInUse) {
      // Decide on behavior: prevent deletion or allow (and perhaps clear from products)
      // For this prototype, we'll prevent deletion if in use.
      return NextResponse.json({ success: false, message: 'Category is in use by products and cannot be deleted. Please remove it from all products first.' }, { status: 409 });
    }

    const initialLength = db.categories.length;
    db.categories = db.categories.filter(c => !(c.id === categoryId && c.companyId === companyId));

    if (db.categories.length === initialLength) {
      return NextResponse.json({ success: false, message: 'Category not found or not associated with this company' }, { status: 404 });
    }

    await writeDB(db);
    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error(`API DELETE /api/categories/${params.categoryId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
