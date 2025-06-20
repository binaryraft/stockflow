
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// GET all categories for a company
export async function GET(req: NextRequest) {
  const routeName = "[API_CATEGORIES_GET_ALL /api/categories]";
  console.log(`${routeName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyCategories = db.categories.filter(c => c.companyId === companyId);
    console.log(`${routeName} Found ${companyCategories.length} categories for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyCategories.sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new category for a company
export async function POST(req: NextRequest) {
  const routeName = "[API_CATEGORIES_POST /api/categories]";
  console.log(`${routeName} Received request to create a new category.`);
  try {
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId || !name || typeof name !== 'string' || name.trim() === '') {
      console.warn(`${routeName} Missing or invalid company ID or category name.`);
      return NextResponse.json({ success: false, message: 'Company ID and a non-empty category name are required' }, { status: 400 });
    }

    const db = await readDB();
    const trimmedName = name.trim();

    const existingCategory = db.categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.companyId === companyId);
    if (existingCategory) {
      console.warn(`${routeName} Category "${trimmedName}" already exists for company ${companyId}.`);
      return NextResponse.json({ success: false, message: `Category "${trimmedName}" already exists for this company.` }, { status: 409 });
    }
    
    const newCategory: Category = {
      id: `cat_${uuidv4()}`,
      name: trimmedName,
      companyId,
    };

    db.categories.push(newCategory);
    await writeDB(db);

    console.log(`${routeName} New category "${trimmedName}" (ID: ${newCategory.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
