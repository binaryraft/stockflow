
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, DB_PATH } from '@/lib/db-access';
import type { Product, ProductSKU, ProductVariant, AdditionalChargeDefinition } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants'; // For conceptual subscription check

// Helper to generate a unique ID
const generateId = () => uuidv4();

// GET all products for a company
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    return NextResponse.json({ success: true, data: companyProducts });
  } catch (error) {
    console.error('API GET /api/products error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new product for a company
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productData, companyId } = body; // Expect productData and companyId in the body

    if (!companyId || !productData || !productData.name) {
      return NextResponse.json({ success: false, message: 'Company ID and product data (including name) are required' }, { status: 400 });
    }

    const db = await readDB();

    // Conceptual Subscription Check (Illustrative)
    // In a real app, you'd fetch the company's actual subscription plan.
    // For now, assume a default plan or check against a hardcoded limit.
    // This is where you'd look up company's userProfile.activeSubscriptionId or company.subscriptionId
    // For simplicity, let's assume a hardcoded limit for this prototype.
    const MAX_PRODUCTS_ALLOWED = 500; // Example limit
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    if (companyProducts.length >= MAX_PRODUCTS_ALLOWED) {
      // This check should ideally be based on the company's actual subscription plan
      // return NextResponse.json({ success: false, message: `Product limit reached for your plan (${MAX_PRODUCTS_ALLOWED}). Please upgrade.` }, { status: 403 });
    }


    const productVariants: ProductVariant[] = (productData.variants || []).map((variantData: any, variantIdx: number) => ({
      id: (variantData as any).id || `variant-${generateId()}-${variantIdx}`,
      name: variantData.name,
      options: variantData.options.map((optData: any, optIdx: number) => ({
        id: (optData as any).id || `option-${generateId()}-${variantIdx}-${optIdx}`,
        value: optData.value,
      })),
    }));
    
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


    const newProductBase: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> = {
      name: productData.name,
      category: productData.category,
      trackQuantity: productData.trackQuantity,
      sku: productData.sku,
      expiryDate: productData.expiryDate,
      description: productData.description,
      variants: productVariants,
      companyId: companyId, // Associate with the provided companyId
      sgstRate: productData.sgstRate,
      cgstRate: productData.cgstRate,
      additionalChargeDefinitions: (productData.additionalChargeDefinitions || []).map((ac: any) => ({
        ...ac,
        id: ac.id || uuidv4(),
        type: ac.type || 'fixed',
      })),
    };

    const newProduct: Product = {
      ...newProductBase,
      id: generateId(),
      imageUrl: `https://placehold.co/100x100.png?text=${encodeURIComponent(productData.name.substring(0, 10))}&font=roboto`,
      productSKUs: [],
    };

    // Create a default SKU if no variants or if it's a non-tracked item needing price storage
    if (!productVariants || productVariants.length === 0) {
      const skuIdentifier = getSkuIdentifier(newProduct.name, {});
      const defaultSku: ProductSKU = {
        id: generateId(),
        optionValues: {},
        skuIdentifier: skuIdentifier,
        stockLayers: [],
      };
      if (newProduct.trackQuantity === false && productData.costPriceForNonTracked !== undefined) {
        defaultSku.stockLayers.push({
          id: generateId(),
          purchaseBillId: 'INITIAL_SETUP_NON_TRACKED_API',
          purchaseDate: new Date().toISOString(),
          initialQuantity: 0,
          quantity: 0,
          costPrice: productData.costPriceForNonTracked ?? 0,
          sellPrice: productData.sellPriceForNonTracked ?? 0,
        });
      }
      newProduct.productSKUs.push(defaultSku);
    }
    
    // If variants exist, SKUs will be created dynamically as needed based on purchases or later configurations.
    // For now, addProduct on client side handles more complex SKU generation based on variants. API should be aligned.

    db.products.push(newProduct);
    await writeDB(db);

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    console.error('API POST /api/products error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
