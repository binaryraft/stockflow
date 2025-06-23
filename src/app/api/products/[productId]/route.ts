
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Product, ProductSKU, ProductVariant, AdditionalChargeDefinition } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_PRODUCTS_SINGLE /api/products/[productId]]";
const generateId = () => uuidv4();

// GET a single product by ID
export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/products/${params.productId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { productId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); 

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }
    if (!productId) {
      console.warn(`${routeLogName} Product ID is required.`);
      return NextResponse.json({ success: false, message: 'Product ID is required.' }, { status: 400 });
    }

    const db = await readDB();
    const product = db.products.find(p => p.id === productId && p.companyId === companyId);

    if (!product) {
      console.warn(`${routeLogName} Product not found (ID: ${productId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Product not found or does not belong to this company.' }, { status: 404 });
    }
    console.log(`${routeLogName} Product (ID: ${productId}) found and returned successfully.`);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error(`${routeNamePrefix} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a product by ID
export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  const routeLogName = `${routeNamePrefix} PUT /api/products/${params.productId}`;
  console.log(`${routeLogName} Received request to update product.`);
  try {
    const { productId } = params;
    const body = await req.json();
    const { productData, companyId } = body; 

    if (!companyId || !productData) {
      console.warn(`${routeLogName} Company ID and product data are required in the request body.`);
      return NextResponse.json({ success: false, message: 'Company ID and product data are required.' }, { status: 400 });
    }
    if (!productId) {
      console.warn(`${routeLogName} Product ID is required in URL path.`);
      return NextResponse.json({ success: false, message: 'Product ID is required in URL path.' }, { status: 400 });
    }
    if (productData.name !== undefined && (!productData.name || typeof productData.name !== 'string' || productData.name.trim() === '')) {
      console.warn(`${routeNamePrefix} Product name is required and must be a non-empty string.`);
      return NextResponse.json({ success: false, message: 'Product name is required.' }, { status: 400 });
    }

    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === productId && p.companyId === companyId);

    if (productIndex === -1) {
      console.warn(`${routeLogName} Product not found (ID: ${productId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Product not found or not associated with this company.' }, { status: 404 });
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
    
    const updatedProductData = { ...existingProduct, ...productData };
    if (productData.name) {
        updatedProductData.name = productData.name.trim();
        updatedProductData.productSKUs = existingProduct.productSKUs.map(sku => ({
            ...sku,
            skuIdentifier: getSkuIdentifier(productData.name.trim(), sku.optionValues)
        }));
    }
    if (productData.variants) {
      updatedProductData.variants = productData.variants.map((variantData: any, variantIdx: number) => {
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
    if (productData.additionalChargeDefinitions) {
      updatedProductData.additionalChargeDefinitions = productData.additionalChargeDefinitions.map((ac: AdditionalChargeDefinition) => ({
        ...ac, id: ac.id || uuidv4(), type: ac.type || 'fixed',
      }));
    }

    if (updatedProductData.trackQuantity === false && (!updatedProductData.variants || updatedProductData.variants.length === 0)) {
        let defaultSku = updatedProductData.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0);
        const costPrice = productData.costPriceForNonTracked !== undefined ? productData.costPriceForNonTracked : (defaultSku?.stockLayers[0]?.costPrice ?? 0);
        const sellPrice = productData.sellPriceForNonTracked !== undefined ? productData.sellPriceForNonTracked : (defaultSku?.stockLayers[0]?.sellPrice ?? 0);

        if (defaultSku) {
            if (defaultSku.stockLayers.length > 0) {
                defaultSku.stockLayers[0].costPrice = costPrice;
                defaultSku.stockLayers[0].sellPrice = sellPrice;
            } else { 
                defaultSku.stockLayers.push({
                    id: generateId(), purchaseBillId: 'UPDATED_NON_TRACKED_API_PUT', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                });
            }
            defaultSku.skuIdentifier = getSkuIdentifier(updatedProductData.name, defaultSku.optionValues);
        } else { 
             defaultSku = {
                id: generateId(), optionValues: {}, skuIdentifier: getSkuIdentifier(updatedProductData.name, {}),
                stockLayers: [{
                    id: generateId(), purchaseBillId: 'CREATED_NON_TRACKED_API_PUT', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                }],
            };
            updatedProductData.productSKUs = [defaultSku];
        }
    }
    if (!updatedProductData.imageUrl && updatedProductData.name) {
        updatedProductData.imageUrl = `https://placehold.co/100x100.png?text=${encodeURIComponent(updatedProductData.name.substring(0, 10))}&font=roboto`;
    }


    db.products[productIndex] = updatedProductData;
    await writeDB(db);

    console.log(`${routeLogName} Product (ID: ${productId}) updated successfully.`);
    return NextResponse.json({ success: true, data: updatedProductData });
  } catch (error) {
    console.error(`${routeNamePrefix} Error updating product:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a product by ID (This is now a SOFT delete, i.e., archiving)
export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE (Archive) /api/products/${params.productId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { productId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for archiving.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for archiving.' }, { status: 400 });
    }
    if (!productId) {
      console.warn(`${routeLogName} Product ID is required for archiving.`);
      return NextResponse.json({ success: false, message: 'Product ID is required for archiving.' }, { status: 400 });
    }

    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === productId && p.companyId === companyId);

    if (productIndex === -1) {
      console.warn(`${routeLogName} Product not found (ID: ${productId}) or not associated with company (ID: ${companyId}). No action taken.`);
      return NextResponse.json({ success: false, message: 'Product not found or not associated with this company.' }, { status: 404 });
    }

    const productToArchive = db.products[productIndex];
    productToArchive.isArchived = true;
    db.products[productIndex] = productToArchive;

    await writeDB(db);
    console.log(`${routeLogName} Product (ID: ${productId}) archived successfully for company (ID: ${companyId}).`);
    return NextResponse.json({ success: true, data: productToArchive, message: 'Product archived successfully.' });
  } catch (error) {
    console.error(`${routeNamePrefix} Error archiving product:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
