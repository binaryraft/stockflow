
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Bill, Product, ProductSKU, StockLayer, BillItem, Company } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, isToday } from 'date-fns';

const routeNamePrefix = "[API_BILLS_COLLECTION /api/bills]";

// GET all bills for a company
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
    const companyBills = db.bills
      .filter(b => b.companyId === companyId)
      .sort((a, b) => b.timestamp - a.timestamp);

    console.log(`${routeLogName} Found ${companyBills.length} bills for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyBills });
  } catch (error) {
    console.error(`${routeNamePrefix} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new bill and update inventory
export async function POST(req: NextRequest) {
  const routeLogName = `${routeNamePrefix} POST`;
  console.log(`${routeLogName} Received request to create a new bill.`);
  try {
    const body = await req.json();
    const { billData, itemsData } = body;
    
    const { companyId, storeId, type: billType, isEstimate, billedByStaffId } = billData;

    if (!companyId || !billType || !itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
      console.warn(`${routeLogName} Missing required fields: companyId, billType, or itemsData must be a non-empty array.`);
      return NextResponse.json({ success: false, message: 'Company ID, bill type, and at least one item are required.' }, { status: 400 });
    }
    if (!['sell', 'buy', 'return'].includes(billType)) {
      console.warn(`${routeLogName} Invalid bill type: ${billType}. Must be 'sell', 'buy', or 'return'.`);
      return NextResponse.json({ success: false, message: 'Invalid bill type provided.' }, { status: 400 });
    }

    const db = await readDB();
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      console.warn(`${routeLogName} Company not found (ID: ${companyId}). Cannot create bill.`);
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    let productsToUpdate: Product[] = JSON.parse(JSON.stringify(db.products.filter(p => p.companyId === companyId)));

    const currentDate = new Date();
    
    const datePrefix = format(currentDate, 'ddMMyy');
    const billsTodayForCompany = db.bills.filter(bill => 
      bill.companyId === companyId && isToday(new Date(bill.date))
    );
    const newBillNumber = billsTodayForCompany.length + 1;
    const newBillId = `${datePrefix}${newBillNumber}`;
    
    const billTimestamp = currentDate.getTime();
    
    let processedBillItems: BillItem[] = [];
    let billSubTotal = 0;
    let billTotalSGST = 0;
    let billTotalCGST = 0;

    for (const item of itemsData) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        console.warn(`${routeLogName} Invalid item data in request:`, item);
        return NextResponse.json({ success: false, message: `Invalid data for item: ${item.productId || 'Unknown'}. Quantity must be > 0.` }, { status: 400 });
      }
      
      const isServiceOrCharge = item.productId.startsWith('SERVICE_ITEM_') || item.productId.startsWith('CHARGE_ITEM_');
      const productIndex = !isServiceOrCharge ? productsToUpdate.findIndex(p => p.id === item.productId) : -1;
      
      if (!isServiceOrCharge && productIndex === -1) {
        console.warn(`${routeLogName} Product with ID ${item.productId} not found for company ${companyId}.`);
        return NextResponse.json({ success: false, message: `Product with ID ${item.productId} not found for this company.` }, { status: 404 });
      }
      const product = productIndex !== -1 ? productsToUpdate[productIndex] : null;

      let sku: ProductSKU | undefined;
      if (product && item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
        const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(item.selectedVariantOptions || {}).sort()));
        sku = product.productSKUs.find(s => JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions);
      } else if (product) {
        sku = product.productSKUs.find(s => Object.keys(s.optionValues || {}).length === 0) || product.productSKUs[0];
      }
      
      if (product && !sku && product.variants && product.variants.length > 0) {
         const skuIdentifierFromName = product.name + (Object.values(item.selectedVariantOptions || {}).length > 0 ? ` (${Object.values(item.selectedVariantOptions || {}).join(' - ')})` : '');
         console.warn(`${routeLogName} SKU not found for variant product ${skuIdentifierFromName}. Creating conceptual SKU.`);
         sku = { id: uuidv4(), optionValues: item.selectedVariantOptions || {}, skuIdentifier: skuIdentifierFromName, stockLayers: [] };
         product.productSKUs.push(sku);
      } else if (product && !sku && (!product.variants || product.variants.length === 0)) {
         sku = product.productSKUs[0] || { id: uuidv4(), optionValues: {}, skuIdentifier: product.name, stockLayers: [] };
         if (!product.productSKUs.includes(sku)) product.productSKUs.push(sku);
      }

      const itemProductNameForBill = sku?.skuIdentifier || product?.name || item.productName || "Service/Charge";
      let itemCostPrice = item.costPrice || 0;
      let itemSellPrice = item.sellPrice || 0;
      let itemSgstAmount = 0;
      let itemCgstAmount = 0;

      if (billType === 'sell' && !isEstimate && product) {
        if (product.trackQuantity) {
          let quantityToSell = item.quantity;
          let costOfGoodsSoldThisItem = 0;
          const relevantLayers = (sku?.stockLayers || [])
            .filter(l => (l.storeId === storeId || !l.storeId || storeId === undefined) && l.quantity > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

          if (relevantLayers.reduce((sum, l) => sum + l.quantity, 0) < quantityToSell) {
            console.warn(`${routeLogName} Insufficient stock for ${itemProductNameForBill} at store ${storeId}. Available: ${relevantLayers.reduce((sum, l) => sum + l.quantity, 0)}, needed: ${quantityToSell}`);
            return NextResponse.json({ success: false, message: `Insufficient stock for ${itemProductNameForBill}${storeId ? ` at store ${storeId}` : ''}. Available: ${relevantLayers.reduce((sum, l) => sum + l.quantity, 0)}` }, { status: 400 });
          }

          for (let i = 0; i < relevantLayers.length && quantityToSell > 0; i++) {
            const layer = relevantLayers[i];
            const sellFromThisLayer = Math.min(quantityToSell, layer.quantity);
            costOfGoodsSoldThisItem += sellFromThisLayer * layer.costPrice;
            layer.quantity -= sellFromThisLayer;
            quantityToSell -= sellFromThisLayer;
          }
          itemCostPrice = item.quantity > 0 ? costOfGoodsSoldThisItem / item.quantity : 0;
        } else {
          itemCostPrice = sku?.stockLayers[0]?.costPrice || 0;
        }
      } else if (billType === 'buy' && product) {
        if (itemCostPrice <= 0 && product.trackQuantity) {
           console.warn(`${routeLogName} Cost price must be > 0 for tracked purchases: ${itemProductNameForBill}`);
           return NextResponse.json({ success: false, message: `Cost price must be > 0 for tracked purchase: ${itemProductNameForBill}.`}, { status: 400 });
        }
        if (itemSellPrice <= 0 && product.trackQuantity && itemCostPrice > 0) {
            console.warn(`${routeLogName} Sell price must be > 0 for tracked purchases when setting batch price: ${itemProductNameForBill}`);
            return NextResponse.json({ success: false, message: `Sell price for purchased batch must be > 0 if cost price is set: ${itemProductNameForBill}.`}, { status: 400 });
        }
        if (product.trackQuantity && sku) {
          const newLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(newLayer);
        }
      } else if (billType === 'return' && product) {
        itemCostPrice = item.costPrice || sku?.stockLayers.find(sl => sl.quantity > 0)?.costPrice || 0;
        if (product.trackQuantity && !item.isDefective && sku) {
          const returnLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(), 
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(returnLayer);
        }
      }
      
      if (!isEstimate && product && !isServiceOrCharge) {
        if (billType === 'sell' || billType === 'return') {
            const itemPreTaxValue = itemSellPrice * item.quantity;
            itemSgstAmount = (itemPreTaxValue * (product.sgstRate || 0)) / 100;
            itemCgstAmount = (itemPreTaxValue * (product.cgstRate || 0)) / 100;
        } else if (billType === 'buy') {
            const itemPreTaxValue = itemCostPrice * item.quantity;
            itemSgstAmount = (itemPreTaxValue * (product.sgstRate || 0)) / 100;
            itemCgstAmount = (itemPreTaxValue * (product.cgstRate || 0)) / 100;
        }
      }

      const currentItemSubTotal = (billType === 'buy')
        ? itemCostPrice * item.quantity
        : itemSellPrice * item.quantity;
      billSubTotal += currentItemSubTotal;
      billTotalSGST += itemSgstAmount;
      billTotalCGST += itemCgstAmount;

      processedBillItems.push({
        id: uuidv4(), productId: product?.id || item.productId, productName: itemProductNameForBill,
        quantity: item.quantity, costPrice: itemCostPrice, sellPrice: itemSellPrice,
        isDefective: item.isDefective, selectedVariantOptions: item.selectedVariantOptions,
        sgstAmount: itemSgstAmount, cgstAmount: itemCgstAmount,
        isAdditionalCharge: item.isAdditionalCharge, sourceChargeDefinitionId: item.sourceChargeDefinitionId,
      });
    }
    
    if ((billType === 'sell' || billType === 'return') && !isEstimate) {
        const mainProductBillItems = processedBillItems.filter(it => !it.isAdditionalCharge && !it.productId.startsWith('SERVICE_ITEM_'));
        for (const mainItem of mainProductBillItems) {
            const productDef = productsToUpdate.find(p => p.id === mainItem.productId);
            if (productDef?.additionalChargeDefinitions && productDef.additionalChargeDefinitions.length > 0) {
                productDef.additionalChargeDefinitions.forEach(chargeDef => {
                    let chargeValue = 0;
                    if (chargeDef.type === 'fixed') chargeValue = chargeDef.value;
                    else if (chargeDef.type === 'percentage') chargeValue = ((mainItem.sellPrice * mainItem.quantity) * chargeDef.value) / 100;
                    
                    const chargeBillItem: BillItem = {
                        id: uuidv4(), productId: `CHARGE_ITEM_${chargeDef.id}`, productName: chargeDef.name,
                        quantity: 1, costPrice: 0, sellPrice: chargeValue,
                        sgstAmount: 0, cgstAmount: 0, isAdditionalCharge: true, sourceChargeDefinitionId: chargeDef.id,
                    };
                    processedBillItems.push(chargeBillItem);
                    billSubTotal += chargeValue;
                });
            }
        }
    }

    const grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST;
    
    const staffUser = billedByStaffId ? db.users.find(u => u.id === billedByStaffId && u.companyId === companyId) : undefined;
    const storeDetails = storeId ? db.stores.find(s => s.id === storeId && s.companyId === companyId) : undefined;

    const newBill: Bill = {
      id: newBillId, type: billType, date: currentDate.toISOString(), timestamp: billTimestamp,
      vendorOrCustomerName: billData.vendorOrCustomerName || undefined, 
      customerPhone: billData.customerPhone || undefined,
      items: processedBillItems, 
      subTotal: billSubTotal, 
      totalSGST: isEstimate ? 0 : billTotalSGST, 
      totalCGST: isEstimate ? 0 : billTotalCGST,
      totalAmount: isEstimate ? billSubTotal : grandTotalAmount, 
      isEstimate: !!isEstimate, 
      notes: billData.notes || company.defaultBillNotes || '',
      paymentStatus: billData.paymentStatus, 
      billedByStaffId: staffUser?.id, billedByStaffName: staffUser?.name,
      storeId: storeDetails?.id, storeName: storeDetails?.name, 
      companyId: companyId,
    };

    db.bills.push(newBill);
    db.products = db.products.map(p => {
      const updatedProduct = productsToUpdate.find(up => up.id === p.id);
      return updatedProduct || p;
    });

    await writeDB(db);
    console.log(`${routeLogName} New bill (ID: ${newBillId}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newBill }, { status: 201 });

  } catch (error) {
    console.error(`${routeNamePrefix} Error creating bill:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
