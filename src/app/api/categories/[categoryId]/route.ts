
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';

const routeNamePrefix = "[API_CATEGORIES_SINGLE /api/categories/[categoryId]]";

// GET a single category by ID
export async function GET(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/categories/${params.categoryId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }
    if (!categoryId) {
      console.warn(`${routeLogName} Category ID is required.`);
      return NextResponse.json({ success: false, message: 'Category ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const category = db.categories.find(c => c.id === categoryId && c.companyId === companyId);

    if (!category) {
      console.warn(`${routeLogName} Category not found (ID: ${categoryId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Category not found or does not belong to this company.' }, { status: 404 });
    }
    console.log(`${routeLogName} Category found and returned successfully.`);
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a category by ID
export async function PUT(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/categories/${params.categoryId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { categoryId } = params;
    const body = await req.json();
    const { name, companyId } = body; // Expect companyId in body for authorization

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required in the request body.`);
      return NextResponse.json({ success: false, message: 'Company ID is required in the request body.' }, { status: 400 });
    }
    if (!categoryId) {
      console.warn(`${routeLogName} Category ID is required.`);
      return NextResponse.json({ success: false, message: 'Category ID is required.' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.warn(`${routeLogName} Category name is required and must be a non-empty string.`);
      return NextResponse.json({ success: false, message: 'Category name is required and must be a non-empty string.' }, { status: 400 });
    }

    const db = await readDB();
    const categoryIndex = db.categories.findIndex(c => c.id === categoryId && c.companyId === companyId);

    if (categoryIndex === -1) {
      console.warn(`${routeLogName} Category not found (ID: ${categoryId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Category not found or not associated with this company.' }, { status: 404 });
    }

    const trimmedName = name.trim();
    const existingCategoryWithName = db.categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.companyId === companyId && c.id !== categoryId);
    if (existingCategoryWithName) {
      console.warn(`${routeLogName} Another category with the name "${trimmedName}" already exists for company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: `Another category with the name "${trimmedName}" already exists for this company.` }, { status: 409 }); // 409 Conflict
    }
    
    db.categories[categoryIndex].name = trimmedName;
    await writeDB(db);

    console.log(`${routeLogName} Category (ID: ${categoryId}) updated successfully.`);
    return NextResponse.json({ success: true, data: db.categories[categoryIndex] });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a category by ID
export async function DELETE(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/categories/${params.categoryId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion.' }, { status: 400 });
    }
    if (!categoryId) {
      console.warn(`${routeLogName} Category ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Category ID is required for deletion.' }, { status: 400 });
    }

    const db = await readDB();
    const categoryToDelete = db.categories.find(c => c.id === categoryId && c.companyId === companyId);
    if (!categoryToDelete) {
       console.warn(`${routeLogName} Category not found (ID: ${categoryId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Category not found or not associated with this company.' }, { status: 404 });
    }
    
    // Check if the category is in use by any product of the same company
    const isCategoryInUse = db.products.some(p => p.category === categoryToDelete.name && p.companyId === companyId);
    if (isCategoryInUse) {
      console.warn(`${routeLogName} Category (ID: ${categoryId}, Name: ${categoryToDelete.name}) is in use by products and cannot be deleted.`);
      return NextResponse.json({ success: false, message: 'Category is in use by products and cannot be deleted. Please remove it from all products first.' }, { status: 409 }); // 409 Conflict
    }

    db.categories = db.categories.filter(c => !(c.id === categoryId && c.companyId === companyId)); // Redundant companyId check here, but safe
    await writeDB(db);

    console.log(`${routeLogName} Category (ID: ${categoryId}) deleted successfully for company (ID: ${companyId}).`);
    return NextResponse.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
