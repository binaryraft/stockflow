
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Product, ProductSKU, ProductVariant, AdditionalChargeDefinition } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate a unique ID
const generateId = () => uuidv4();

// GET a single product by ID
export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { productId } = params;
    // const { searchParams } = new URL(req.url);
    // const companyId = searchParams.get('companyId'); // For future scoping

    // if (!companyId) {
    //   return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    // }

    const db = await readDB();
    // const product = db.products.find(p => p.id === productId && p.companyId === companyId);
    const product = db.products.find(p => p.id === productId); // Temporarily ignoring companyId for GET single

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error(`API GET /api/products/${params.productId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a product by ID
export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { productId } = params;
    const body = await req.json();
    const { productData, companyId } = body; // Expect productData and companyId

    if (!companyId || !productData) {
      return NextResponse.json({ success: false, message: 'Company ID and product data are required' }, { status: 400 });
    }

    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === productId && p.companyId === companyId);

    if (productIndex === -1) {
      return NextResponse.json({ success: false, message: 'Product not found or not associated with this company' }, { status: 404 });
    }
    
    const getSkuIdentifier = (productName: string, optionValues: Record<string, string>): string => {
        if (!productName) return "Unknown Product";
        if (!optionValues || Object.keys(optionValues).length === 0) return productName;
        const sortedOptionsString = Object.entries(optionValues)
          .filter(([, value]) => typeof value === 'string')
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([, value]) => value)
          .join(' - ');
        return sortedOptionsString ? `${productName} (${sortedOptionsString})` : productName;
    };

    const existingProduct = db.products[productIndex];
    const updatedProduct: Product = { 
        ...existingProduct, 
        ...productData,
        id: existingProduct.id, // Ensure ID is not changed
        companyId: existingProduct.companyId, // Ensure companyId is not changed
        imageUrl: existingProduct.imageUrl, // Preserve existing image URL or update if provided
    };
    
    // Ensure variants and their options have IDs, and productSKUs are updated
    if (productData.variants !== undefined) {
      updatedProduct.variants = productData.variants.map((variantData: any, variantIdx: number) => {
        const existingVariant = existingProduct.variants?.find(v => v.id === variantData.id || v.name === variantData.name);
        return {
          id: existingVariant?.id || `variant-${generateId()}-${variantIdx}`,
          name: variantData.name,
          options: variantData.options.map((optData: any, optIdx: number) => {
            const existingOption = existingVariant?.options.find(o => o.id === optData.id || o.value === optData.value);
            return {
              id: existingOption?.id || `option-${generateId()}-${variantIdx}-${optIdx}`,
              value: optData.value,
            };
          }),
        };
      });
    }
    
    if (productData.additionalChargeDefinitions !== undefined) {
      updatedProduct.additionalChargeDefinitions = productData.additionalChargeDefinitions.map((ac: any) => ({
          ...ac,
          id: ac.id || uuidv4(),
          type: ac.type || 'fixed',
      }));
    }

    // Update SKU identifiers if product name or variants changed
    updatedProduct.productSKUs = updatedProduct.productSKUs.map(sku => ({
        ...sku,
        skuIdentifier: getSkuIdentifier(updatedProduct.name, sku.optionValues)
    }));

    // Handle pricing for non-tracked, non-variant products
    if (updatedProduct.trackQuantity === false && (!updatedProduct.variants || updatedProduct.variants.length === 0)) {
        let defaultSku = updatedProduct.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0);
        const costPrice = productData.costPriceForNonTracked ?? 0;
        const sellPrice = productData.sellPriceForNonTracked ?? 0;

        if (defaultSku) {
            if (defaultSku.stockLayers.length > 0) {
                defaultSku.stockLayers[0].costPrice = costPrice;
                defaultSku.stockLayers[0].sellPrice = sellPrice;
            } else {
                defaultSku.stockLayers.push({
                    id: generateId(), purchaseBillId: 'UPDATED_NON_TRACKED_API', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                });
            }
            defaultSku.skuIdentifier = getSkuIdentifier(updatedProduct.name, defaultSku.optionValues);
        } else { // Should ideally not happen if product setup is consistent
             defaultSku = {
                id: generateId(), optionValues: {}, skuIdentifier: getSkuIdentifier(updatedProduct.name, {}),
                stockLayers: [{
                    id: generateId(), purchaseBillId: 'CREATED_NON_TRACKED_API', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                }],
            };
            updatedProduct.productSKUs = [defaultSku, ...updatedProduct.productSKUs.filter(sku => Object.keys(sku.optionValues).length > 0)];
        }
    }


    db.products[productIndex] = updatedProduct;
    await writeDB(db);

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error(`API PUT /api/products/${params.productId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a product by ID
export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { productId } = params;
    const { searchParams } = new URL(req.url); // Get companyId from query for DELETE
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }

    const db = await readDB();
    const initialLength = db.products.length;
    db.products = db.products.filter(p => !(p.id === productId && p.companyId === companyId));

    if (db.products.length === initialLength) {
      return NextResponse.json({ success: false, message: 'Product not found or not associated with this company' }, { status: 404 });
    }

    await writeDB(db);
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error(`API DELETE /api/products/${params.productId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
