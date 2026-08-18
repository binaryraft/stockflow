
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { Product, AdditionalChargeDefinition, ProductSKU } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_PRODUCTS_SINGLE /api/products/[productId]]";

export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { productId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !productId) return NextResponse.json({ success: false, message: 'Company and Product ID are required.' }, { status: 400 });

    const product = await db.collection<Product>('products').findOne({ id: productId, companyId: companyId });

    if (!product) return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { productId } = params;
    const body = await req.json();
    const { productData, companyId } = body;

    if (!companyId || !productData || !productId) {
      return NextResponse.json({ success: false, message: 'Company ID, Product ID, and data are required.' }, { status: 400 });
    }

    const existingProduct = await db.collection<Product>('products').findOne({ id: productId, companyId: companyId });
    if (!existingProduct) return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });

    const { costPriceForNonTracked, sellPriceForNonTracked, ...updateableData } = productData;

    // Handle price updates for non-tracked, single-SKU products
    if (productData.trackQuantity === false && (!productData.variants || productData.variants.length === 0)) {
      let skuToUpdate = existingProduct.productSKUs[0];
      if (skuToUpdate) {
        if (!skuToUpdate.stockLayers || skuToUpdate.stockLayers.length === 0) {
          skuToUpdate.stockLayers = [{
            id: uuidv4(),
            purchaseBillId: 'STANDARD_PRICE_LAYER',
            purchaseDate: new Date().toISOString(),
            initialQuantity: 1000,
            quantity: 1000,
            costPrice: 0,
            sellPrice: 0
          }];
        }
        if (costPriceForNonTracked !== undefined) skuToUpdate.stockLayers[0].costPrice = costPriceForNonTracked;
        if (sellPriceForNonTracked !== undefined) skuToUpdate.stockLayers[0].sellPrice = sellPriceForNonTracked;
        updateableData.productSKUs = [skuToUpdate];
      }
    }

    const { id, ...dataToSet } = updateableData;

    const result = await db.collection<Product>('products').updateOne(
      { id: productId, companyId: companyId },
      { $set: dataToSet }
    );

    if (result.matchedCount === 0) return NextResponse.json({ success: false, message: 'Product not found during update operation.' }, { status: 404 });

    const updatedProduct = await db.collection<Product>('products').findOne({ id: productId, companyId: companyId });
    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { db } = await connectToDatabase();
    const { productId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId || !productId) return NextResponse.json({ success: false, message: 'Company and Product ID are required.' }, { status: 400 });

    const result = await db.collection<Product>('products').updateOne(
      { id: productId, companyId: companyId },
      { $set: { isArchived: true } }
    );

    if (result.matchedCount === 0) return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });

    const archivedProduct = await db.collection<Product>('products').findOne({ id: productId, companyId: companyId });
    return NextResponse.json({ success: true, data: archivedProduct, message: 'Product archived successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
