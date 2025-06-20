
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Product, ProductSKU, ProductVariant, AdditionalChargeDefinition } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

const generateId = () => uuidv4();

// GET all products for a company
export async function GET(req: NextRequest) {
  const routeName = "[API_PRODUCTS_GET_ALL /api/products]";
  console.log(`${routeName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    console.log(`${routeName} Found ${companyProducts.length} products for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyProducts });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new product for a company
export async function POST(req: NextRequest) {
  const routeName = "[API_PRODUCTS_POST /api/products]";
  console.log(`${routeName} Received request to create a new product.`);
  try {
    const body = await req.json();
    const { productData, companyId } = body;

    if (!companyId || !productData || !productData.name || typeof productData.name !== 'string' || productData.name.trim() === '') {
      console.warn(`${routeName} Missing or invalid company ID or product data (name).`);
      return NextResponse.json({ success: false, message: 'Company ID and product data (including a non-empty name) are required' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeName} Company not found (ID: ${companyId}). Cannot add product.`);
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    // Conceptual Subscription Check
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    // For simplicity, assuming a default plan if not found, or skipping strict check if plan is lenient.
    // In a real app, if !plan, this would be an error.
    const MAX_PRODUCTS_ALLOWED = plan ? (plan.features.some(f => f.toLowerCase().includes("unlimited products")) ? Infinity : 500) : 500;
    const companyProductsCount = db.products.filter(p => p.companyId === companyId).length;
    if (companyProductsCount >= MAX_PRODUCTS_ALLOWED) {
      console.warn(`${routeName} Product limit reached for company ${companyId} on plan ${plan?.name || 'Unknown'}.`);
      return NextResponse.json({ success: false, message: `Product limit (${MAX_PRODUCTS_ALLOWED}) reached for your current plan. Please upgrade.` }, { status: 403 });
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
      name: productData.name.trim(),
      category: productData.category || '',
      trackQuantity: typeof productData.trackQuantity === 'boolean' ? productData.trackQuantity : true,
      sku: productData.sku || '', // Base product SKU/barcode
      expiryDate: productData.expiryDate || '',
      description: productData.description || '',
      variants: productVariants,
      companyId: companyId,
      sgstRate: productData.sgstRate,
      cgstRate: productData.cgstRate,
      additionalChargeDefinitions: (productData.additionalChargeDefinitions || []).map((ac: any) => ({
        ...ac, id: ac.id || uuidv4(), type: ac.type || 'fixed',
      })),
    };

    const newProduct: Product = {
      ...newProductBase,
      id: generateId(),
      imageUrl: productData.imageUrl || `https://placehold.co/100x100.png?text=${encodeURIComponent(newProductBase.name.substring(0, 10))}&font=roboto`,
      productSKUs: [],
    };

    // Create a default SKU if no variants OR if it's a non-tracked item needing price storage
    if (!productVariants || productVariants.length === 0) {
      const skuIdentifier = getSkuIdentifier(newProduct.name, {});
      const defaultSku: ProductSKU = {
        id: generateId(), optionValues: {}, skuIdentifier: skuIdentifier, stockLayers: [],
      };
      if (newProduct.trackQuantity === false && productData.costPriceForNonTracked !== undefined && productData.sellPriceForNonTracked !== undefined) {
        defaultSku.stockLayers.push({
          id: generateId(), purchaseBillId: 'INITIAL_SETUP_NON_TRACKED_API_POST', purchaseDate: new Date().toISOString(),
          initialQuantity: 0, quantity: 0,
          costPrice: productData.costPriceForNonTracked ?? 0,
          sellPrice: productData.sellPriceForNonTracked ?? 0,
        });
      }
      newProduct.productSKUs.push(defaultSku);
    }
    // For products with variants, ProductSKUs are typically created through purchase bills if stock is tracked.
    // If a non-tracked product has variants, its pricing might be conceptual or handled differently.

    db.products.push(newProduct);
    await writeDB(db);

    console.log(`${routeName} New product "${newProduct.name}" (ID: ${newProduct.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
