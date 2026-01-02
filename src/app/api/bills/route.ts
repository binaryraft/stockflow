
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Bill, Product, ProductSKU, StockLayer, BillItem, Company, User, Store } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfDay } from 'date-fns';
import { Collection } from 'mongodb';

const routeNamePrefix = "[API_BILLS_COLLECTION /api/bills]";

export async function GET(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} GET`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const companyBills = await db.collection<Bill>('bills')
      .find({ companyId: companyId })
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`${routeLogName} Found ${companyBills.length} bills for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyBills });
  } catch (error) {
    console.error(`${routeNamePrefix} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new bill.`);
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { billData, itemsData } = body;

    const { companyId, storeId, type: billType, isEstimate, billedByStaffId, taxType, date: providedDate } = billData;

    if (!companyId || !billType || !itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
      return NextResponse.json({ success: false, message: 'Company ID, bill type, and at least one item are required.' }, { status: 400 });
    }
    if (!['sell', 'buy', 'return'].includes(billType)) {
      return NextResponse.json({ success: false, message: 'Invalid bill type provided.' }, { status: 400 });
    }

    const company = await db.collection<Company>('companies').findOne({ id: companyId });
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    const productsCollection = db.collection<Product>('products');
    const productIds = itemsData.map((item: any) => item.productId).filter((id: string) => !id.startsWith('SERVICE_ITEM_') && !id.startsWith('CHARGE_ITEM_'));
    const productsToUpdate: Product[] = await productsCollection.find({ id: { $in: productIds }, companyId: companyId }).toArray();

    const currentDate = providedDate ? new Date(providedDate) : new Date();
    const datePrefix = format(currentDate, 'ddMMyy');
    const billsTodayCount = await db.collection<Bill>('bills').countDocuments({
      companyId: companyId,
      date: { $gte: startOfDay(currentDate).toISOString() }
    });
    const newBillNumber = billsTodayCount + 1;
    const newBillId = `${datePrefix}${newBillNumber.toString().padStart(4, '0')}`;

    let processedBillItems: BillItem[] = [];
    let billSubTotal = 0;
    let billTotalSGST = 0;
    let billTotalCGST = 0;
    let billTotalIGST = 0;
    let billTotalDiscount = 0;

    for (const item of itemsData) {
      const isServiceOrCharge = item.productId.startsWith('SERVICE_ITEM_') || item.productId.startsWith('CHARGE_ITEM_');
      const productIndex = !isServiceOrCharge ? productsToUpdate.findIndex(p => p.id === item.productId) : -1;

      const product = productIndex !== -1 ? productsToUpdate[productIndex] : null;

      if (!isServiceOrCharge && !product) {
        return NextResponse.json({ success: false, message: `Product with ID ${item.productId} not found.` }, { status: 404 });
      }

      let sku: ProductSKU | undefined;
      if (product && item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
        const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(item.selectedVariantOptions || {}).sort()));
        sku = product.productSKUs.find(s => JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions);
      } else if (product) {
        sku = product.productSKUs.find(s => Object.keys(s.optionValues || {}).length === 0) || product.productSKUs[0];
      }

      const itemProductNameForBill = sku?.skuIdentifier || product?.name || item.productName || "Service/Charge";
      let itemCostPrice = item.costPrice || 0;
      let itemSellPrice = item.sellPrice || 0;

      if (billType === 'sell' && !isEstimate && product && sku) {
        if (product.trackQuantity) {
          let quantityToSell = item.quantity;
          let costOfGoodsSoldThisItem = 0;
          const relevantLayers = (sku?.stockLayers || [])
            .filter(l => (l.storeId === storeId || !l.storeId || storeId === undefined) && l.quantity > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
          if (relevantLayers.reduce((sum, l) => sum + l.quantity, 0) < quantityToSell) {
            return NextResponse.json({ success: false, message: `Insufficient stock for ${itemProductNameForBill}.` }, { status: 400 });
          }
          for (const layer of relevantLayers) {
            if (quantityToSell <= 0) break;
            const sellFromThisLayer = Math.min(quantityToSell, layer.quantity);
            costOfGoodsSoldThisItem += sellFromThisLayer * layer.costPrice;
            layer.quantity -= sellFromThisLayer;
            quantityToSell -= sellFromThisLayer;
          }
          itemCostPrice = item.quantity > 0 ? costOfGoodsSoldThisItem / item.quantity : 0;
        }
      } else if (billType === 'buy' && product && sku) {
        if (product.trackQuantity) {
          const newLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(newLayer);
        }
      } else if (billType === 'return' && product && sku) {
        itemCostPrice = item.costPrice || sku?.stockLayers.find(sl => sl.quantity > 0)?.costPrice || 0;
        if (product.trackQuantity && !item.isDefective) {
          const returnLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(returnLayer);
        }
      }

      let itemSgstAmount = 0, itemCgstAmount = 0, itemIgstAmount = 0;
      let itemDiscountAmount = 0;

      if (!isServiceOrCharge) {
        if ((billType === 'sell' || billType === 'return')) {
          if (item.discountValue && item.discountValue > 0) {
            if (item.discountType === 'percentage') {
              itemDiscountAmount = ((itemSellPrice * item.quantity) * item.discountValue) / 100;
            } else {
              itemDiscountAmount = item.discountValue * item.quantity;
            }
          }
        }
      }

      if (!isEstimate && product && !isServiceOrCharge) {
        const rawLineTotal = billType === 'buy' ? itemCostPrice * item.quantity : itemSellPrice * item.quantity;
        const taxableValue = Math.max(0, rawLineTotal - itemDiscountAmount);

        if (taxType === 'inter-state') {
          const rate = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
          itemIgstAmount = (taxableValue * rate) / 100;
        } else {
          itemSgstAmount = (taxableValue * (product.sgstRate || 0)) / 100;
          itemCgstAmount = (taxableValue * (product.cgstRate || 0)) / 100;
        }
      } else if (!isEstimate && isServiceOrCharge && billType === 'sell') {
        // Basic tax logic for services if they had rates, but currently assuming 0 or explicit charges.
        // Charges usually have tax? Assuming no tax on charges for now unless product definition has it.
        // If it's a "CHARGE_ITEM", we just take sellPrice.
      }

      const preTaxLineTotal = (billType === 'buy' ? itemCostPrice * item.quantity : itemSellPrice * item.quantity);
      // Note: subTotal usually represents the sum of prices * quantity (Gross), or Net?
      // Standard: SubTotal is sum of (Price * Qty). Discount is separate line or subtracted from Grand Total.
      // But tax is calculated on Net.
      // Let's keep billSubTotal as Gross (Price * Qty).

      billSubTotal += preTaxLineTotal;
      billTotalDiscount += itemDiscountAmount;
      billTotalSGST += itemSgstAmount;
      billTotalCGST += itemCgstAmount;
      billTotalIGST += itemIgstAmount;

      processedBillItems.push({
        id: uuidv4(), productId: product?.id || item.productId, productName: itemProductNameForBill,
        quantity: item.quantity, costPrice: itemCostPrice, sellPrice: itemSellPrice,
        isDefective: item.isDefective, selectedVariantOptions: item.selectedVariantOptions,
        sgstAmount: itemSgstAmount, cgstAmount: itemCgstAmount, igstAmount: itemIgstAmount,
        discountValue: item.discountValue, discountType: item.discountType, discountAmount: itemDiscountAmount,
        isAdditionalCharge: item.isAdditionalCharge, sourceChargeDefinitionId: item.sourceChargeDefinitionId,
      });
    }

    const staffUser = billedByStaffId ? await db.collection<User>('users').findOne({ id: billedByStaffId, companyId: companyId }) : null;
    const storeDetails = storeId ? await db.collection<Store>('stores').findOne({ id: storeId, companyId: companyId }) : null;

    const newBill: Bill = {
      id: newBillId, type: billType, date: currentDate.toISOString(), timestamp: currentDate.getTime(),
      vendorOrCustomerName: billData.vendorOrCustomerName, customerPhone: billData.customerPhone,
      items: processedBillItems, subTotal: billSubTotal, totalSGST: isEstimate ? 0 : billTotalSGST,
      totalCGST: isEstimate ? 0 : billTotalCGST, totalIGST: isEstimate ? 0 : billTotalIGST,
      totalDiscount: billTotalDiscount,
      totalAmount: isEstimate ? (billSubTotal - billTotalDiscount) : ((billSubTotal - billTotalDiscount) + billTotalSGST + billTotalCGST + billTotalIGST),
      isEstimate: !!isEstimate, notes: billData.notes || company.defaultBillNotes || '',
      paymentStatus: billData.paymentStatus, billedByStaffId: staffUser?.id,
      billedByStaffName: staffUser?.name, storeId: storeDetails?.id, storeName: storeDetails?.name,
      companyId: companyId, taxType: taxType,
    };

    await db.collection<Bill>('bills').insertOne(newBill);
    for (const product of productsToUpdate) {
      await productsCollection.updateOne({ id: product.id }, { $set: { productSKUs: product.productSKUs } });
    }

    console.log(`${routeLogName} New bill (ID: ${newBillId}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newBill }, { status: 201 });

  } catch (error) {
    console.error(`${routeNamePrefix} Error creating bill:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
