
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_CATEGORIES_COLLECTION /api/categories]";

// GET all categories for a company
export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const companyCategories = db.categories
      .filter(c => c.companyId === companyId)
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    console.log(`${routeLogName} Found ${companyCategories.length} categories for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyCategories });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new category for a company
export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new category.`);
  try {
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId || !name || typeof name !== 'string' || name.trim() === '') {
      console.warn(`${routeLogName} Missing or invalid company ID or category name. Category name must be a non-empty string.`);
      return NextResponse.json({ success: false, message: 'Company ID and a non-empty category name are required.' }, { status: 400 });
    }

    const db = await readDB();
    const trimmedName = name.trim();

    // Check if category with the same name already exists for this company (case-insensitive)
    const existingCategory = db.categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.companyId === companyId);
    if (existingCategory) {
      console.warn(`${routeLogName} Category "${trimmedName}" already exists for company ${companyId}.`);
      return NextResponse.json({ success: false, message: `Category "${trimmedName}" already exists for this company.` }, { status: 409 }); // 409 Conflict
    }
    
    const newCategory: Category = {
      id: `cat_${uuidv4()}`,
      name: trimmedName,
      companyId,
    };

    db.categories.push(newCategory);
    await writeDB(db);

    console.log(`${routeLogName} New category "${trimmedName}" (ID: ${newCategory.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newCategory }, { status: 201 }); // 201 Created
  } catch (error) {
    console.error(`${routeLogName} Error creating category:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
