
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Product, ProductSKU, ProductVariant, AdditionalChargeDefinition, StockLayer } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

const routeNamePrefix = "[API_PRODUCTS_COLLECTION /api/products]";
const generateId = () => uuidv4();

// GET all products for a company
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
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    console.log(`${routeLogName} Found ${companyProducts.length} products for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyProducts });
  } catch (error) {
    console.error(`${routeLogName} Error fetching products:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new product for a company
export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new product.`);
  try {
    const body = await req.json();
    // Expect productData and companyId in the body
    const { productData, companyId } = body; 

    if (!companyId || !productData || !productData.name || typeof productData.name !== 'string' || productData.name.trim() === '') {
      console.warn(`${routeLogName} Missing or invalid company ID or product data (name). Name must be a non-empty string.`);
      return NextResponse.json({ success: false, message: 'Company ID and product data (including a non-empty name) are required.' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeLogName} Company not found (ID: ${companyId}). Cannot add product.`);
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    const MAX_PRODUCTS_ALLOWED = plan ? (plan.features.some(f => f.toLowerCase().includes("unlimited products")) ? Infinity : 500) : 500; // Default limit if plan not found
    const companyProductsCount = db.products.filter(p => p.companyId === companyId).length;

    if (companyProductsCount >= MAX_PRODUCTS_ALLOWED) {
      console.warn(`${routeLogName} Product limit reached for company ${companyId} on plan ${plan?.name || 'Unknown'}. Limit: ${MAX_PRODUCTS_ALLOWED}, Current: ${companyProductsCount}.`);
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

    const newProductBase: Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'> = {
      name: productData.name.trim(),
      category: productData.category || '',
      trackQuantity: typeof productData.trackQuantity === 'boolean' ? productData.trackQuantity : true,
      sku: productData.sku ? productData.sku.trim() : '', // Base product SKU/barcode
      expiryDate: productData.expiryDate || '',
      description: productData.description || '',
      variants: productVariants,
      sgstRate: productData.sgstRate,
      cgstRate: productData.cgstRate,
      additionalChargeDefinitions: (productData.additionalChargeDefinitions || []).map((ac: any) => ({
        ...ac, id: ac.id || uuidv4(), type: ac.type || 'fixed',
      })),
    };

    const newProduct: Product = {
      ...newProductBase,
      id: generateId(),
      companyId: companyId, // Ensure companyId is set
      imageUrl: productData.imageUrl ? productData.imageUrl.trim() : null, // Store null if empty, let frontend handle placeholder
      productSKUs: [],
    };
    if (!newProduct.imageUrl) {
        newProduct.imageUrl = `https://placehold.co/100x100.png?text=${encodeURIComponent(newProduct.name.substring(0, 10))}&font=roboto`;
    }


    // Create a default SKU if no variants OR if it's a non-tracked item needing price storage
    if (!productVariants || productVariants.length === 0) {
      const skuIdentifier = getSkuIdentifier(newProduct.name, {});
      const defaultSku: ProductSKU = {
        id: generateId(), optionValues: {}, skuIdentifier: skuIdentifier, stockLayers: [],
      };
      // If non-tracked and prices are provided, create a conceptual stock layer for them
      if (newProduct.trackQuantity === false && productData.costPriceForNonTracked !== undefined && productData.sellPriceForNonTracked !== undefined) {
        defaultSku.stockLayers.push({
          id: generateId(), purchaseBillId: 'INITIAL_SETUP_NON_TRACKED_API_POST', purchaseDate: new Date().toISOString(),
          initialQuantity: 0, quantity: 0, // Non-tracked, so quantity is conceptual
          costPrice: productData.costPriceForNonTracked ?? 0,
          sellPrice: productData.sellPriceForNonTracked ?? 0,
        });
      }
      newProduct.productSKUs.push(defaultSku);
    }
    // For products with variants, ProductSKUs are typically created through purchase bills if stock is tracked.

    db.products.push(newProduct);
    
    // If initialStock and costPrice are provided for a new TRACKED product (likely from NewProductDialog)
    // create a conceptual initial purchase bill to establish the stock.
    if (newProduct.trackQuantity && productData.initialStock > 0 && productData.costPrice !== undefined && productData.sellPrice !== undefined) {
        const initialBillId = `INIT_PURCHASE_${newProduct.id.slice(0,8)}`;
        const conceptualBill: Bill = {
            id: initialBillId,
            type: 'buy',
            date: new Date().toISOString(),
            timestamp: Date.now(),
            items: [{
                id: uuidv4(),
                productId: newProduct.id,
                productName: newProduct.name, // Assuming non-variant for this conceptual bill
                quantity: productData.initialStock,
                costPrice: productData.costPrice,
                sellPrice: productData.sellPrice, // Sell price set at purchase
            }],
            totalAmount: productData.initialStock * productData.costPrice,
            companyId: companyId,
            billedByStaffId: 'SYSTEM_INIT', // System generated
            storeId: db.stores.find(s => s.companyId === companyId)?.id, // Assign to first store of company if exists
        };
        db.bills.push(conceptualBill);

        // Find the default SKU (or the first one) and add the stock layer
        const targetSku = newProduct.productSKUs.find(s => Object.keys(s.optionValues).length === 0) || newProduct.productSKUs[0];
        if (targetSku) {
            targetSku.stockLayers.push({
                id: generateId(),
                purchaseBillId: initialBillId,
                purchaseDate: conceptualBill.date,
                initialQuantity: productData.initialStock,
                quantity: productData.initialStock,
                costPrice: productData.costPrice,
                sellPrice: productData.sellPrice,
                storeId: conceptualBill.storeId,
            });
        }
        console.log(`${routeLogName} Created conceptual initial purchase bill ${initialBillId} for ${newProduct.name} with ${productData.initialStock} units.`);
    }


    await writeDB(db);

    console.log(`${routeLogName} New product "${newProduct.name}" (ID: ${newProduct.id}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 }); // 201 Created
  } catch (error) {
    console.error(`${routeLogName} Error creating product:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
