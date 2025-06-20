
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Bill, Product, ProductSKU, StockLayer, BillItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// GET all bills for a company
export async function GET(req: NextRequest) {
  const routeName = "[API_BILLS_GET_ALL /api/bills]";
  console.log(`${routeName} Received request.`);
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      console.warn(`${routeName} Company ID is required.`);
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyBills = db.bills.filter(b => b.companyId === companyId).sort((a, b) => b.timestamp - a.timestamp);
    console.log(`${routeName} Found ${companyBills.length} bills for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyBills });
  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new bill and update inventory
export async function POST(req: NextRequest) {
  const routeName = "[API_BILLS_POST /api/bills]";
  console.log(`${routeName} Received request to create a new bill.`);
  try {
    const body = await req.json();
    const { billData, itemsData } = body;
    const { companyId, storeId, type: billType, isEstimate } = billData;

    if (!companyId || !billType || !itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
      console.warn(`${routeName} Missing required fields: companyId, billType, or itemsData.`);
      return NextResponse.json({ success: false, message: 'Company ID, bill type, and at least one item are required.' }, { status: 400 });
    }
    if (!['sell', 'buy', 'return'].includes(billType)) {
      console.warn(`${routeName} Invalid bill type: ${billType}.`);
      return NextResponse.json({ success: false, message: 'Invalid bill type provided.' }, { status: 400 });
    }


    const db = await readDB();
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    let productsToUpdate: Product[] = JSON.parse(JSON.stringify(companyProducts)); // Deep clone for modifications

    const currentDate = new Date();
    const newBillId = format(currentDate, 'ddMMyyHHmmssS') + `_${uuidv4().slice(0,4)}`;
    const billTimestamp = currentDate.getTime();
    
    let processedBillItems: BillItem[] = [];
    let billSubTotal = 0;
    let billTotalSGST = 0;
    let billTotalCGST = 0;

    for (const item of itemsData) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        console.warn(`${routeName} Invalid item data in request:`, item);
        return NextResponse.json({ success: false, message: `Invalid item data provided: ${JSON.stringify(item)}` }, { status: 400 });
      }
      const productIndex = productsToUpdate.findIndex(p => p.id === item.productId);
      if (productIndex === -1) {
        console.warn(`${routeName} Product with ID ${item.productId} not found for company ${companyId}.`);
        return NextResponse.json({ success: false, message: `Product with ID ${item.productId} not found for this company.` }, { status: 404 });
      }
      const product = productsToUpdate[productIndex];

      let sku: ProductSKU | undefined;
      const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(item.selectedVariantOptions || {}).sort()));
      sku = product.productSKUs.find(s => JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions);

      if (!sku) {
         const skuIdentifier = product.name + (Object.values(item.selectedVariantOptions || {}).length > 0 ? ` (${Object.values(item.selectedVariantOptions || {}).join(' - ')})` : '');
         console.warn(`${routeName} SKU not found for ${product.name} with options ${JSON.stringify(item.selectedVariantOptions)}. Creating conceptual SKU. Product ID: ${product.id}`);
         sku = { id: uuidv4(), optionValues: item.selectedVariantOptions || {}, skuIdentifier, stockLayers: [] };
         product.productSKUs.push(sku); // Add to product in memory for this transaction
      }
      
      const itemProductName = sku.skuIdentifier || product.name;
      let itemCostPrice = item.costPrice || 0;
      let itemSellPrice = item.sellPrice || 0;
      let itemSgstAmount = 0;
      let itemCgstAmount = 0;

      if (billType === 'sell' && !isEstimate) {
        if (product.trackQuantity) {
          let quantityToSell = item.quantity;
          let costOfGoodsSoldThisItem = 0;
          const relevantLayers = sku.stockLayers
            .filter(l => (l.storeId === storeId || !l.storeId || storeId === undefined) && l.quantity > 0) // Match storeId or use unassigned if storeId not provided
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

          if (relevantLayers.reduce((sum, l) => sum + l.quantity, 0) < quantityToSell) {
            console.warn(`${routeName} Insufficient stock for ${itemProductName} at store ${storeId}. Available: ${relevantLayers.reduce((sum, l) => sum + l.quantity, 0)}, needed: ${quantityToSell}`);
            return NextResponse.json({ success: false, message: `Insufficient stock for ${itemProductName}${storeId ? ` at store ${storeId}` : ''}. Available: ${relevantLayers.reduce((sum, l) => sum + l.quantity, 0)}` }, { status: 400 });
          }

          for (let i = 0; i < relevantLayers.length && quantityToSell > 0; i++) {
            const layer = relevantLayers[i];
            const sellFromThisLayer = Math.min(quantityToSell, layer.quantity);
            costOfGoodsSoldThisItem += sellFromThisLayer * layer.costPrice;
            layer.quantity -= sellFromThisLayer;
            quantityToSell -= sellFromThisLayer;
          }
          itemCostPrice = item.quantity > 0 ? costOfGoodsSoldThisItem / item.quantity : 0; // This is COGS
        } else {
          itemCostPrice = product.productSKUs[0]?.stockLayers[0]?.costPrice || 0; // For non-tracked, COGS might be a default
        }
        if (!item.productId.startsWith('SERVICE_ITEM_') && !item.isAdditionalCharge) {
            const itemPreTaxValue = itemSellPrice * item.quantity;
            itemSgstAmount = (itemPreTaxValue * (product.sgstRate || 0)) / 100;
            itemCgstAmount = (itemPreTaxValue * (product.cgstRate || 0)) / 100;
        }
      } else if (billType === 'buy') {
        if (itemCostPrice <= 0 && product.trackQuantity) {
           console.warn(`${routeName} Cost price must be > 0 for tracked purchases: ${itemProductName}`);
           return NextResponse.json({ success: false, message: `Cost price must be greater than 0 for tracked purchase: ${itemProductName}.`}, { status: 400 });
        }
        if (itemSellPrice <= 0 && product.trackQuantity) {
            console.warn(`${routeName} Sell price must be > 0 for tracked purchases when setting batch price: ${itemProductName}`);
            return NextResponse.json({ success: false, message: `Sell price for purchased batch must be greater than 0: ${itemProductName}.`}, { status: 400 });
        }
        if (product.trackQuantity) {
          const newLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(newLayer);
        }
      } else if (billType === 'return') {
        itemCostPrice = product.productSKUs[0]?.stockLayers.find(sl => sl.quantity > 0)?.costPrice || 0; // Simplified: Avg cost or last cost
        if (product.trackQuantity && !item.isDefective) {
          const returnLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(returnLayer);
        }
        if (!item.productId.startsWith('SERVICE_ITEM_') && !item.isAdditionalCharge) {
            const itemPreTaxValue = itemSellPrice * item.quantity;
            itemSgstAmount = (itemPreTaxValue * (product.sgstRate || 0)) / 100;
            itemCgstAmount = (itemPreTaxValue * (product.cgstRate || 0)) / 100;
        }
      }
      
      const currentItemSubTotal = itemSellPrice * item.quantity;
      billSubTotal += currentItemSubTotal;
      billTotalSGST += itemSgstAmount;
      billTotalCGST += itemCgstAmount;

      processedBillItems.push({
        id: uuidv4(), productId: product.id, productName: itemProductNameForBill,
        quantity: item.quantity, costPrice: itemCostPrice, sellPrice: itemSellPrice,
        isDefective: item.isDefective, selectedVariantOptions: item.selectedVariantOptions,
        sgstAmount: itemSgstAmount, cgstAmount: itemCgstAmount,
        isAdditionalCharge: item.isAdditionalCharge, sourceChargeDefinitionId: item.sourceChargeDefinitionId,
      });
    }
    
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

    let grandTotalAmount;
    if (billType === 'buy') {
        grandTotalAmount = processedBillItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
        billSubTotal = grandTotalAmount; billTotalSGST = 0; billTotalCGST = 0;
    } else if ((billType === 'sell' || billType === 'return') && isEstimate) {
        grandTotalAmount = billSubTotal; billTotalSGST = 0; billTotalCGST = 0;
    } else {
        grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST;
    }
    
    const staffUser = db.users.find(u => u.id === billData.billedByStaffId && u.companyId === companyId);
    const storeDetails = storeId ? db.stores.find(s => s.id === storeId && s.companyId === companyId) : undefined;

    const newBill: Bill = {
      id: newBillId, type: billType, date: currentDate.toISOString(), timestamp: billTimestamp,
      vendorOrCustomerName: billData.vendorOrCustomerName, customerPhone: billData.customerPhone,
      items: processedBillItems, subTotal: billSubTotal, totalSGST: billTotalSGST, totalCGST: billTotalCGST,
      totalAmount: grandTotalAmount, isEstimate: !!isEstimate, notes: billData.notes,
      paymentStatus: billData.paymentStatus, billedByStaffId: staffUser?.id, billedByStaffName: staffUser?.name,
      storeId: storeDetails?.id, storeName: storeDetails?.name, companyId: companyId,
    };

    db.bills.push(newBill);
    db.products = db.products.map(p => {
      const updatedProduct = productsToUpdate.find(up => up.id === p.id);
      return updatedProduct || p;
    });

    await writeDB(db);
    console.log(`${routeName} New bill (ID: ${newBillId}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newBill }, { status: 201 });

  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred during bill creation.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
