
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductSKU, ProductVariant, Bill, Company, Store } from '@/types';
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

    const companyProducts = await db.collection<Product>('products').find({ companyId: companyId }).toArray();
    return NextResponse.json({ success: true, data: companyProducts });
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

    if (!productData.variants || productData.variants.length === 0) {
      newProduct.productSKUs.push({
        id: generateId(),
        optionValues: {},
        skuIdentifier: productData.name,
        stockLayers: [],
      });
    }

    await db.collection<Product>('products').insertOne(newProduct);
    
    // Handle initial stock as a conceptual purchase bill
    if (productData.trackQuantity && productData.initialStock > 0 && productData.costPrice !== undefined && productData.sellPrice !== undefined) {
        const firstStore = await db.collection<Store>('stores').findOne({ companyId: companyId });
        const initialBillId = `INIT_PURCHASE_${newProduct.id.slice(0,8)}`;
        const conceptualBill: Bill = {
            id: initialBillId, type: 'buy', date: new Date().toISOString(), timestamp: Date.now(),
            items: [{ id: uuidv4(), productId: newProduct.id, productName: newProduct.name, quantity: productData.initialStock, costPrice: productData.costPrice, sellPrice: productData.sellPrice }],
            totalAmount: productData.initialStock * productData.costPrice,
            companyId: companyId, billedByStaffId: 'SYSTEM_INIT', storeId: firstStore?.id, storeName: firstStore?.name,
            paymentStatus: company.defaultPurchasePaymentStatus || 'paid', notes: 'Initial stock entry.'
        };
        await db.collection<Bill>('bills').insertOne(conceptualBill);
    }


    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
