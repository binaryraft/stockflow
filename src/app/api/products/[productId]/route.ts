
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

    // Strip fields that have no corresponding DB columns
    const { costPriceForNonTracked, sellPriceForNonTracked, initialStock: _is, costPrice: _cp, sellPrice: _sp, ...updateableData } = productData;
    const numOrUndef = (v: any) => (v === '' || v === null || v === undefined ? undefined : Number(v));

    // Handle price updates for non-tracked products: their prices live in a
    // STANDARD_PRICE_LAYER on each SKU rather than in stock/purchase bills.
    if (productData.trackQuantity === false) {
      const normKey = (v: unknown) => String(v ?? '').toLowerCase();
      const findOptionPrice = (skuOptionValues: Record<string, string>) => {
        for (const variant of productData.variants || []) {
          for (const [optName, optValue] of Object.entries(skuOptionValues || {})) {
            if (normKey(variant?.name) !== normKey(optName)) continue;
            const option = (variant?.options || []).find((o: any) => normKey(o?.value) === normKey(optValue));
            if (option && (option.costPrice !== undefined || option.sellPrice !== undefined)) {
              return { cost: option.costPrice, sell: option.sellPrice };
            }
          }
        }
        return null;
      };

      updateableData.productSKUs = (existingProduct.productSKUs || []).map((sku) => {
        const skuCopy: ProductSKU = { ...sku, stockLayers: [...(sku.stockLayers || [])] };
        if (!skuCopy.stockLayers.length) {
          skuCopy.stockLayers.push({
            id: uuidv4(),
            purchaseBillId: 'STANDARD_PRICE_LAYER',
            purchaseDate: new Date().toISOString(),
            initialQuantity: 0,
            quantity: 0,
            costPrice: 0,
            sellPrice: 0,
          });
        }
        const priceLayer = skuCopy.stockLayers[0];
        if (!productData.variants || productData.variants.length === 0) {
          const cost = numOrUndef(costPriceForNonTracked);
          const sell = numOrUndef(sellPriceForNonTracked);
          if (cost !== undefined) priceLayer.costPrice = cost;
          if (sell !== undefined) priceLayer.sellPrice = sell;
        } else {
          const found = findOptionPrice(skuCopy.optionValues);
          if (found) {
            const cost = numOrUndef(found.cost);
            const sell = numOrUndef(found.sell);
            if (cost !== undefined) priceLayer.costPrice = cost;
            if (sell !== undefined) priceLayer.sellPrice = sell;
          }
        }
        return skuCopy;
      });

      // Keep the dedicated columns in sync for the single-SKU fallback path.
      if (!productData.variants || productData.variants.length === 0) {
        if (numOrUndef(costPriceForNonTracked) !== undefined) updateableData.costPriceForNonTracked = numOrUndef(costPriceForNonTracked);
        if (numOrUndef(sellPriceForNonTracked) !== undefined) updateableData.sellPriceForNonTracked = numOrUndef(sellPriceForNonTracked);
      }
    }

    const { id, ...dataToSet } = updateableData;

    let result;
    try {
      result = await db.collection<Product>('products').updateOne(
        { id: productId, companyId: companyId },
        { $set: dataToSet }
      );
    } catch (updateError: any) {
      // Graceful degradation if the `unit` column hasn't been added yet (migration 003).
      if (String(updateError?.message || '').includes("'unit'")) {
        const { unit: _unitOmitted, ...setDataWithoutUnit } = dataToSet as any;
        result = await db.collection<Product>('products').updateOne(
          { id: productId, companyId: companyId },
          { $set: setDataWithoutUnit }
        );
      } else {
        throw updateError;
      }
    }

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
