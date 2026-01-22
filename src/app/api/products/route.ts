
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductSKU, ProductVariant, Bill, BillItem, Company, Store } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

const routeNamePrefix = "[API_PRODUCTS_COLLECTION /api/products]";
const generateId = () => uuidv4();

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });

    const limit = parseInt(searchParams.get('limit') || '0', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const searchTerm = searchParams.get('search') || '';
    const sortField = searchParams.get('sort') || '_id';
    const sortOrder = searchParams.get('order') === 'asc' ? 1 : -1;

    let query: any = { companyId };
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      query.$or = [
        { name: regex },
        { category: regex },
        { 'productSKUs.skuIdentifier': regex }
      ];
    }

    let cursor = db.collection<Product>('products').find(query).sort({ [sortField]: sortOrder });
    const totalCount = await db.collection<Product>('products').countDocuments(query);

    if (offset > 0) cursor = cursor.skip(offset);
    if (limit > 0) cursor = cursor.limit(limit);

    const companyProducts = await cursor.toArray();
    return NextResponse.json({ success: true, data: companyProducts, totalCount, limit, offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { productData, companyId } = body;

    if (!companyId || !productData || !productData.name) {
      return NextResponse.json({ success: false, message: 'Company ID and product data are required.' }, { status: 400 });
    }

    const company = await db.collection<Company>('companies').findOne({ id: companyId });
    if (!company) return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === company.activeSubscriptionId);
    const companyProductsCount = await db.collection<Product>('products').countDocuments({ companyId: companyId });
    if (plan && companyProductsCount >= (plan.maxStores * 500)) { // Simplified limit
      return NextResponse.json({ success: false, message: `Product limit reached for your current plan.` }, { status: 403 });
    }

    const newProduct: Product = {
      ...productData,
      id: generateId(),
      companyId: companyId,
      productSKUs: [],
      imageUrl: productData.imageUrl || `https://placehold.co/100x100.png?text=${encodeURIComponent(productData.name.substring(0, 10))}&font=roboto`,
    };

    const initialBillItems: BillItem[] = [];

    if (!productData.variants || productData.variants.length === 0) {
      const skuId = generateId();
      newProduct.productSKUs.push({
        id: skuId,
        optionValues: {},
        skuIdentifier: productData.name,
        stockLayers: [],
      });
      // Handle single product initial stock
      if (productData.trackQuantity && productData.initialStock && productData.initialStock > 0) {
        initialBillItems.push({
          id: uuidv4(),
          productId: newProduct.id,
          productName: newProduct.name,
          quantity: productData.initialStock,
          costPrice: productData.costPrice || 0,
          sellPrice: productData.sellPrice || 0,
          selectedVariantOptions: {}
        });
      }
    } else {
      // Generate all possible SKU combinations from variants, capturing metadata
      const generateCombinations = (variants: any[]): { optionValues: Record<string, string>, metadata: any }[] => {
        if (variants.length === 0) return [{ optionValues: {}, metadata: {} }];
        const firstVariant = variants[0];
        const restCombinations = generateCombinations(variants.slice(1));
        const combinations: { optionValues: Record<string, string>, metadata: any }[] = [];

        firstVariant.options.forEach((option: any) => {
          restCombinations.forEach(combination => {
            // Logic: Variant 0 (Top level) takes precedence for price/stock if defined, otherwise inherit from lower levels
            // Actually, usually the 'lowest' specific level might override? 
            // But here, let's assume if you set price on Color (Var 1), it applies.
            const meta = {
              costPrice: option.costPrice !== undefined ? option.costPrice : combination.metadata.costPrice,
              sellPrice: option.sellPrice !== undefined ? option.sellPrice : combination.metadata.sellPrice,
              initialStock: option.initialStock !== undefined ? option.initialStock : combination.metadata.initialStock,
            };

            combinations.push({
              optionValues: {
                [firstVariant.name]: option.value,
                ...combination.optionValues
              },
              metadata: meta
            });
          });
        });
        return combinations;
      };

      const combinations = generateCombinations(productData.variants);

      newProduct.productSKUs = combinations.map(combination => {
        const skuId = generateId();
        const skuCost = combination.metadata.costPrice !== undefined ? combination.metadata.costPrice : (productData.costPrice || 0);
        const skuSell = combination.metadata.sellPrice !== undefined ? combination.metadata.sellPrice : (productData.sellPrice || 0);
        const skuStock = combination.metadata.initialStock !== undefined ? combination.metadata.initialStock : 0; // Default to 0 if not set on variant

        // Create bill item if this variant/SKU has stock
        if (productData.trackQuantity && skuStock > 0) {
          initialBillItems.push({
            id: uuidv4(),
            productId: newProduct.id,
            productName: newProduct.name,
            quantity: skuStock,
            costPrice: skuCost,
            sellPrice: skuSell,
            selectedVariantOptions: combination.optionValues
          });
        }

        return {
          id: skuId,
          optionValues: combination.optionValues,
          skuIdentifier: `${newProduct.name} (${Object.values(combination.optionValues).join(' - ')})`,
          stockLayers: [] // Stock layers are built from bills, so initially empty check for bill creation below
        };
      });
    }

    await db.collection<Product>('products').insertOne(newProduct);

    // Create Initial Purchase Bill if items exist
    if (initialBillItems.length > 0) {
      const firstStore = await db.collection<Store>('stores').findOne({ companyId: companyId });
      const initialBillId = `INIT_PURCHASE_${newProduct.id.slice(0, 8)}`;
      let totalAmount = 0;
      initialBillItems.forEach(item => {
        totalAmount += (item.quantity * item.costPrice);
      });

      const conceptualBill: Bill = {
        id: initialBillId,
        type: 'buy',
        date: new Date().toISOString(),
        timestamp: Date.now(),
        items: initialBillItems,
        totalAmount: totalAmount,
        companyId: companyId,
        billedByStaffId: 'SYSTEM_INIT',
        storeId: firstStore?.id,
        storeName: firstStore?.name,
        paymentStatus: company.defaultPurchasePaymentStatus || 'paid',
        notes: 'Initial stock entry from product creation.'
      };
      await db.collection<Bill>('bills').insertOne(conceptualBill);
    }


    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
