
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Category, Product } from '@/types';

const routeNamePrefix = "[API_CATEGORIES_SINGLE /api/categories/[categoryId]]";

export async function GET(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/categories/${params.categoryId}`;
  try {
    const { db } = await connectToDatabase();
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !categoryId) return NextResponse.json({ success: false, message: 'Company and Category ID are required.' }, { status: 400 });

    const category = await db.collection<Category>('categories').findOne({ id: categoryId, companyId: companyId });

    if (!category) return NextResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/categories/${params.categoryId}`;
  try {
    const { db } = await connectToDatabase();
    const { categoryId } = params;
    const body = await req.json();
    const { name, companyId } = body;

    if (!companyId || !categoryId || !name) return NextResponse.json({ success: false, message: 'Company ID, category ID, and name are required.' }, { status: 400 });

    const trimmedName = name.trim();
    const existingCategoryWithName = await db.collection<Category>('categories').findOne({ name: new RegExp(`^${trimmedName}$`, 'i'), companyId: companyId, id: { $ne: categoryId } });
    if (existingCategoryWithName) {
      return NextResponse.json({ success: false, message: `Another category with the name "${trimmedName}" already exists.` }, { status: 409 });
    }

    const result = await db.collection<Category>('categories').updateOne(
      { id: categoryId, companyId: companyId },
      { $set: { name: trimmedName } }
    );

    if (result.matchedCount === 0) return NextResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });

    const updatedCategory = await db.collection<Category>('categories').findOne({ id: categoryId, companyId: companyId });
    return NextResponse.json({ success: true, data: updatedCategory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/categories/${params.categoryId}`;
  try {
    const { db } = await connectToDatabase();
    const { categoryId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !categoryId) return NextResponse.json({ success: false, message: 'Company and Category ID are required.' }, { status: 400 });
    
    const categoryToDelete = await db.collection<Category>('categories').findOne({ id: categoryId, companyId: companyId });
    if (!categoryToDelete) return NextResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });

    const isCategoryInUse = await db.collection<Product>('products').findOne({ category: categoryToDelete.name, companyId: companyId });
    if (isCategoryInUse) {
      return NextResponse.json({ success: false, message: 'Category is in use by products and cannot be deleted.' }, { status: 409 });
    }

    const result = await db.collection<Category>('categories').deleteOne({ id: categoryId, companyId: companyId });
    if (result.deletedCount === 0) return NextResponse.json({ success: false, message: 'Category not found for deletion.' }, { status: 404 });
    
    return NextResponse.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
