
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';

// GET a single category by ID
export async function GET(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeName = `[API_CATEGORIES_GET /api/categories/${params.categoryId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!categoryId) {
      console.warn(`${routeName} Category ID is required.`);
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const category = db.categories.find(c => c.id === categoryId && c.companyId === companyId);

    if (!category) {
      console.warn(`${routeName} Category not found (ID: ${categoryId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Category not found or does not belong to this company' }, { status: 404 });
    }
    console.log(`${routeName} Category found and returned successfully.`);
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a category by ID
export async function PUT(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeName = `[API_CATEGORIES_PUT /api/categories/${params.categoryId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { categoryId } = params;
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!categoryId) {
      console.warn(`${routeName} Category ID is required.`);
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.warn(`${routeName} Category name is required and must be a non-empty string.`);
      return NextResponse.json({ success: false, message: 'Category name is required and must be a non-empty string' }, { status: 400 });
    }

    const db = await readDB();
    const categoryIndex = db.categories.findIndex(c => c.id === categoryId && c.companyId === companyId);

    if (categoryIndex === -1) {
      console.warn(`${routeName} Category not found (ID: ${categoryId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Category not found or not associated with this company' }, { status: 404 });
    }

    const trimmedName = name.trim();
    const existingCategoryWithName = db.categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.companyId === companyId && c.id !== categoryId);
    if (existingCategoryWithName) {
      console.warn(`${routeName} Another category with the name "${trimmedName}" already exists for company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: `Another category with the name "${trimmedName}" already exists for this company.` }, { status: 409 });
    }
    
    db.categories[categoryIndex].name = trimmedName;
    await writeDB(db);

    console.log(`${routeName} Category updated successfully.`);
    return NextResponse.json({ success: true, data: db.categories[categoryIndex] });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a category by ID
export async function DELETE(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeName = `[API_CATEGORIES_DELETE /api/categories/${params.categoryId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }
    if (!categoryId) {
      console.warn(`${routeName} Category ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const categoryToDelete = db.categories.find(c => c.id === categoryId && c.companyId === companyId);
    if (!categoryToDelete) {
       console.warn(`${routeName} Category not found (ID: ${categoryId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Category not found or not associated with this company' }, { status: 404 });
    }
    
    const isCategoryInUse = db.products.some(p => p.category === categoryToDelete.name && p.companyId === companyId);
    if (isCategoryInUse) {
      console.warn(`${routeName} Category (ID: ${categoryId}, Name: ${categoryToDelete.name}) is in use by products and cannot be deleted.`);
      return NextResponse.json({ success: false, message: 'Category is in use by products and cannot be deleted. Please remove it from all products first.' }, { status: 409 });
    }

    db.categories = db.categories.filter(c => c.id !== categoryId); // No need to check companyId again as we already found categoryToDelete with it
    await writeDB(db);

    console.log(`${routeName} Category deleted successfully.`);
    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
