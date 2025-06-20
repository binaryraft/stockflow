
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Product, ProductSKU, ProductVariant, AdditionalChargeDefinition } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => uuidv4();

// GET a single product by ID
export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  const routeName = `[API_PRODUCTS_GET /api/products/${params.productId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { productId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); 

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }
    if (!productId) {
      console.warn(`${routeName} Product ID is required.`);
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const product = db.products.find(p => p.id === productId && p.companyId === companyId);

    if (!product) {
      console.warn(`${routeName} Product not found (ID: ${productId}) or does not belong to company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Product not found or does not belong to this company' }, { status: 404 });
    }
    console.log(`${routeName} Product found and returned successfully.`);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT (update) a product by ID
export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  const routeName = `[API_PRODUCTS_PUT /api/products/${params.productId}]`;
  console.log(`${routeName} Received request to update product.`);
  try {
    const { productId } = params;
    const body = await req.json();
    const { productData, companyId } = body;

    if (!companyId || !productData) {
      console.warn(`${routeName} Company ID and product data are required.`);
      return NextResponse.json({ success: false, message: 'Company ID and product data are required' }, { status: 400 });
    }
    if (!productId) {
      console.warn(`${routeName} Product ID is required.`);
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 });
    }
    if (!productData.name || typeof productData.name !== 'string' || productData.name.trim() === '') {
      console.warn(`${routeName} Product name is required and must be non-empty.`);
      return NextResponse.json({ success: false, message: 'Product name is required' }, { status: 400 });
    }

    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === productId && p.companyId === companyId);

    if (productIndex === -1) {
      console.warn(`${routeName} Product not found (ID: ${productId}) or not associated with company (ID: ${companyId}).`);
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
    // Ensure that sensitive fields like companyId or productSKUs are not directly overwritten from productData if not intended
    // Create a new object with existing data, then spread allowed productData fields
    const updatedProduct: Product = { 
        ...existingProduct, // Start with existing product data
        name: productData.name.trim(),
        description: productData.description !== undefined ? productData.description : existingProduct.description,
        category: productData.category !== undefined ? productData.category : existingProduct.category,
        trackQuantity: typeof productData.trackQuantity === 'boolean' ? productData.trackQuantity : existingProduct.trackQuantity,
        sku: productData.sku !== undefined ? productData.sku : existingProduct.sku, // Base SKU
        expiryDate: productData.expiryDate !== undefined ? productData.expiryDate : existingProduct.expiryDate,
        imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : existingProduct.imageUrl,
        sgstRate: typeof productData.sgstRate === 'number' ? productData.sgstRate : existingProduct.sgstRate,
        cgstRate: typeof productData.cgstRate === 'number' ? productData.cgstRate : existingProduct.cgstRate,
        // Variants and AdditionalChargeDefinitions need careful merging or replacement
        variants: productData.variants !== undefined ? productData.variants.map((variantData: any, variantIdx: number) => {
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
        }) : existingProduct.variants,
        additionalChargeDefinitions: productData.additionalChargeDefinitions !== undefined ? productData.additionalChargeDefinitions.map((ac: AdditionalChargeDefinition) => ({
            ...ac, id: ac.id || uuidv4(), type: ac.type || 'fixed',
        })) : existingProduct.additionalChargeDefinitions,
        // productSKUs are managed by billing/purchases and should not be directly set here, except for their identifiers.
        // If productSKUs were passed in productData, it should be for updating identifiers or conceptual (non-stock) SKUs.
        // For now, we regenerate identifiers for existing SKUs if name/variants change. Stock layers are preserved.
        productSKUs: existingProduct.productSKUs.map(sku => ({
            ...sku,
            skuIdentifier: getSkuIdentifier(updatedProduct.name, sku.optionValues)
        })),
        id: existingProduct.id, 
        companyId: existingProduct.companyId, 
    };
    
    // Handle non-tracked product price updates (if variants are not used)
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
                    id: generateId(), purchaseBillId: 'UPDATED_NON_TRACKED_API_PUT', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                });
            }
            defaultSku.skuIdentifier = getSkuIdentifier(updatedProduct.name, defaultSku.optionValues);
        } else { 
             defaultSku = {
                id: generateId(), optionValues: {}, skuIdentifier: getSkuIdentifier(updatedProduct.name, {}),
                stockLayers: [{
                    id: generateId(), purchaseBillId: 'CREATED_NON_TRACKED_API_PUT', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                }],
            };
            updatedProduct.productSKUs = [defaultSku];
        }
    }

    db.products[productIndex] = updatedProduct;
    await writeDB(db);

    console.log(`${routeName} Product (ID: ${productId}) updated successfully.`);
    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE a product by ID
export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  const routeName = `[API_PRODUCTS_DELETE /api/products/${params.productId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { productId } = params;
    const { searchParams } = new URL(req.url); 
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required for deletion.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for deletion' }, { status: 400 });
    }
    if (!productId) {
      console.warn(`${routeName} Product ID is required.`);
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const initialLength = db.products.length;
    db.products = db.products.filter(p => !(p.id === productId && p.companyId === companyId));

    if (db.products.length === initialLength) {
      console.warn(`${routeName} Product not found (ID: ${productId}) or not associated with company (ID: ${companyId}).`);
      return NextResponse.json({ success: false, message: 'Product not found or not associated with this company' }, { status: 404 });
    }

    await writeDB(db);
    console.log(`${routeName} Product (ID: ${productId}) deleted successfully.`);
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
