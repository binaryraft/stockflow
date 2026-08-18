
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_CATEGORIES_COLLECTION /api/categories]";

export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const companyCategories = await db.collection<Category>('categories')
      .find({ companyId: companyId })
      .sort({ name: 1 })
      .toArray();

    console.log(`${routeLogName} Found ${companyCategories.length} categories for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyCategories });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new category.`);
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId || !name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Company ID and a non-empty category name are required.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existingCategory = await db.collection('categories').findOne({ name: new RegExp(`^${trimmedName}$`, 'i'), companyId: companyId });

    if (existingCategory) {
      return NextResponse.json({ success: false, message: `Category "${trimmedName}" already exists for this company.` }, { status: 409 });
    }
    
    const newCategory: Category = {
      id: `cat_${uuidv4()}`,
      name: trimmedName,
      companyId,
    };

    await db.collection<Category>('categories').insertOne(newCategory);

    console.log(`${routeLogName} New category "${trimmedName}" created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error) {
    console.error(`${routeLogName} Error creating category:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
