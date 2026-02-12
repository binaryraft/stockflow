
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
    const firstStore = await db.collection<Store>('stores').findOne({ companyId: companyId });
    const localStoreId = firstStore?.id;

    if (!productData.variants || productData.variants.length === 0) {
      const skuId = generateId();
      const initialStock = Number(productData.initialStock || 0);
      const skuCost = Number(productData.costPrice || 0);
      const skuSell = Number(productData.sellPrice || 0);

      const defaultSku: ProductSKU = {
        id: skuId,
        optionValues: {},
        skuIdentifier: productData.name,
        stockLayers: [],
      };

      // Always create a layer (tracked or not) to store the prices for display/billing purposes
      defaultSku.stockLayers.push({
        id: generateId(),
        purchaseBillId: productData.trackQuantity && initialStock > 0 ? 'INITIAL_STOCK' : 'PRICE_ENTRY',
        purchaseDate: new Date().toISOString(),
        initialQuantity: initialStock,
        quantity: initialStock,
        costPrice: skuCost,
        sellPrice: skuSell,
        storeId: localStoreId,
      });

      if (productData.trackQuantity && initialStock > 0) {
        initialBillItems.push({
          id: uuidv4(),
          productId: newProduct.id,
          productName: newProduct.name,
          quantity: initialStock,
          costPrice: skuCost,
          sellPrice: skuSell,
          selectedVariantOptions: {}
        });
      }
      newProduct.productSKUs.push(defaultSku);
    } else {
      const baseCost = Number(productData.costPrice || 0);
      const baseSell = Number(productData.sellPrice || 0);

      const generateCombinations = (vList: any[]): { optionValues: Record<string, string>, metadata: any }[] => {
        if (vList.length === 0) return [{ optionValues: {}, metadata: { costDelta: 0, sellDelta: 0, stock: undefined } }];
        const firstVariant = vList[0];
        const restCombinations = generateCombinations(vList.slice(1));
        const combinations: { optionValues: Record<string, string>, metadata: any }[] = [];

        firstVariant.options.forEach((option: any) => {
          restCombinations.forEach(combination => {
            const optionCostDelta = option.costPrice !== undefined ? (Number(option.costPrice) - baseCost) : 0;
            const optionSellDelta = option.sellPrice !== undefined ? (Number(option.sellPrice) - baseSell) : 0;

            const meta = {
              costDelta: optionCostDelta + (combination.metadata.costDelta || 0),
              sellDelta: optionSellDelta + (combination.metadata.sellDelta || 0),
              stock: option.initialStock !== undefined && Number(option.initialStock) > 0
                ? Number(option.initialStock)
                : combination.metadata.stock,
            };

            combinations.push({
              optionValues: { [firstVariant.name]: option.value, ...combination.optionValues },
              metadata: meta
            });
          });
        });
        return combinations;
      };

      const combinations = generateCombinations(productData.variants);

      newProduct.productSKUs = combinations.map(combination => {
        const skuId = generateId();
        const skuCost = baseCost + (combination.metadata.costDelta || 0);
        const skuSell = baseSell + (combination.metadata.sellDelta || 0);
        const skuStock = Number(combination.metadata.stock !== undefined ? combination.metadata.stock : (productData.initialStock || 0));

        const sku: ProductSKU = {
          id: skuId,
          optionValues: combination.optionValues,
          skuIdentifier: `${newProduct.name} (${Object.values(combination.optionValues).join(' - ')})`,
          stockLayers: []
        };

        // Always create a layer (tracked or not) to store the prices
        sku.stockLayers.push({
          id: generateId(),
          purchaseBillId: productData.trackQuantity && skuStock > 0 ? 'INITIAL_STOCK' : 'PRICE_ENTRY',
          purchaseDate: new Date().toISOString(),
          initialQuantity: skuStock,
          quantity: skuStock,
          costPrice: skuCost,
          sellPrice: skuSell,
          storeId: localStoreId,
        });

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

        return sku;
      });
    }

    await db.collection<Product>('products').insertOne(newProduct);

    let initialBill: Bill | null = null;
    // Create Initial Purchase Bill if items exist
    if (initialBillItems.length > 0) {
      const initialBillId = `INIT_PURCHASE_${newProduct.id.slice(0, 8)}`;
      let totalAmount = 0;
      initialBillItems.forEach(item => {
        totalAmount += (item.quantity * item.costPrice);
      });

      initialBill = {
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
      await db.collection<Bill>('bills').insertOne(initialBill);
    }


    return NextResponse.json({ success: true, data: { product: newProduct, initialBill } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
