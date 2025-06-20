
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Bill, Product, ProductSKU, StockLayer, BillItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

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
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

    console.log(`${routeLogName} Found ${companyBills.length} bills for company ${companyId}.`);
    return NextResponse.json({ success: true, data: companyBills });
  } catch (error) {
    console.error(`${routeLogName} Error:`, error);
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
    
    // Validate main billData fields
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
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    let productsToUpdate: Product[] = JSON.parse(JSON.stringify(companyProducts)); // Deep clone for modifications

    const currentDate = new Date();
    // Generate a more readable and sortable bill ID
    const newBillId = format(currentDate, 'yyyyMMddHHmmssS') + `_${uuidv4().slice(0,6)}`;
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
      
      const productIndex = productsToUpdate.findIndex(p => p.id === item.productId);
      if (productIndex === -1 && !item.productId.startsWith('SERVICE_ITEM_') && !item.productId.startsWith('CHARGE_ITEM_')) {
        console.warn(`${routeLogName} Product with ID ${item.productId} not found for company ${companyId}.`);
        return NextResponse.json({ success: false, message: `Product with ID ${item.productId} not found for this company.` }, { status: 404 });
      }
      const product = productIndex !== -1 ? productsToUpdate[productIndex] : null; // product can be null for service/charge items

      let sku: ProductSKU | undefined;
      if (product && item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
        const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(item.selectedVariantOptions || {}).sort()));
        sku = product.productSKUs.find(s => JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions);
      } else if (product) {
        sku = product.productSKUs.find(s => Object.keys(s.optionValues || {}).length === 0) || product.productSKUs[0];
      }
      
      if (product && !sku && product.variants && product.variants.length > 0) {
         // If product has variants defined but no matching SKU was found, this is an issue.
         // For simplicity, we might create a conceptual SKU, but better to error if strict.
         // For robustness, let's assume SKU should exist if variants are involved.
         const skuIdentifierFromName = product.name + (Object.values(item.selectedVariantOptions || {}).length > 0 ? ` (${Object.values(item.selectedVariantOptions || {}).join(' - ')})` : '');
         console.warn(`${routeLogName} SKU not found for variant product ${skuIdentifierFromName}. Product ID: ${product.id}. This may indicate missing SKU setup.`);
         // Create a conceptual SKU for this transaction to proceed, server-side.
         // This SKU won't have pre-existing stock layers.
         sku = { id: uuidv4(), optionValues: item.selectedVariantOptions || {}, skuIdentifier: skuIdentifierFromName, stockLayers: [] };
         product.productSKUs.push(sku);
      } else if (product && !sku && (!product.variants || product.variants.length === 0)) {
         // No variants, but no default SKU found either (e.g., a new product not yet purchased)
         sku = product.productSKUs[0] || { id: uuidv4(), optionValues: {}, skuIdentifier: product.name, stockLayers: [] };
         if (!product.productSKUs.includes(sku)) product.productSKUs.push(sku);
      }


      const itemProductNameForBill = sku?.skuIdentifier || product?.name || item.productName || "Service/Charge"; // Fallback for service/charge items
      let itemCostPrice = item.costPrice || 0; // For sales, this is COGS
      let itemSellPrice = item.sellPrice || 0;
      let itemSgstAmount = 0;
      let itemCgstAmount = 0;

      if (billType === 'sell' && !isEstimate && product) {
        if (product.trackQuantity) {
          let quantityToSell = item.quantity;
          let costOfGoodsSoldThisItem = 0;
          const relevantLayers = (sku?.stockLayers || [])
            .filter(l => (l.storeId === storeId || !l.storeId || storeId === undefined) && l.quantity > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()); // FIFO

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
          itemCostPrice = sku?.stockLayers[0]?.costPrice || 0; // Non-tracked: use default/last cost for COGS reference
        }
      } else if (billType === 'buy' && product) {
        if (itemCostPrice <= 0 && product.trackQuantity) {
           console.warn(`${routeLogName} Cost price must be > 0 for tracked purchases: ${itemProductNameForBill}`);
           return NextResponse.json({ success: false, message: `Cost price must be > 0 for tracked purchase: ${itemProductNameForBill}.`}, { status: 400 });
        }
        if (itemSellPrice <= 0 && product.trackQuantity && itemCostPrice > 0) { // Ensure sell price is also set if cost price is set
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
        // Determine cost price for return: either from item data (if provided from original bill) or estimate based on current stock
        itemCostPrice = item.costPrice || sku?.stockLayers.find(sl => sl.quantity > 0)?.costPrice || 0;
        if (product.trackQuantity && !item.isDefective && sku) { // Restock non-defective items
          const returnLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, // Link to this return bill
            purchaseDate: currentDate.toISOString(), initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, storeId: storeId,
          };
          sku.stockLayers.push(returnLayer);
        }
      }
      
      // Calculate taxes for sell/return items if not an estimate and product exists
      if ((billType === 'sell' || billType === 'return') && !isEstimate && product && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
          const itemPreTaxValue = itemSellPrice * item.quantity;
          itemSgstAmount = (itemPreTaxValue * (product.sgstRate || 0)) / 100;
          itemCgstAmount = (itemPreTaxValue * (product.cgstRate || 0)) / 100;
      }
      
      const currentItemSubTotal = itemSellPrice * item.quantity;
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
    
    // Process additional charges based on product definitions for sell/return bills
    if (billType === 'sell' || billType === 'return') {
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
                    billSubTotal += chargeValue; // Add to subtotal, taxes for charges are typically handled differently or not applied
                });
            }
        }
    }


    let grandTotalAmount;
    if (billType === 'buy') { // For 'buy' bills, total amount is based on cost price of items.
        grandTotalAmount = processedBillItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
        billSubTotal = grandTotalAmount; // For purchase, subtotal equals total cost. Taxes are input-side.
        billTotalSGST = 0; billTotalCGST = 0; // SGST/CGST are typically for sales-side.
    } else if ((billType === 'sell' || billType === 'return') && isEstimate) { // Estimates don't include taxes in grand total
        grandTotalAmount = billSubTotal;
        billTotalSGST = 0; billTotalCGST = 0; // No taxes for estimates
    } else { // Sell or Return (non-estimate)
        grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST;
    }
    
    const staffUser = billedByStaffId ? db.users.find(u => u.id === billedByStaffId && u.companyId === companyId) : undefined;
    const storeDetails = storeId ? db.stores.find(s => s.id === storeId && s.companyId === companyId) : undefined;

    const newBill: Bill = {
      id: newBillId, type: billType, date: currentDate.toISOString(), timestamp: billTimestamp,
      vendorOrCustomerName: billData.vendorOrCustomerName || undefined, 
      customerPhone: billData.customerPhone || undefined,
      items: processedBillItems, 
      subTotal: billSubTotal, totalSGST: billTotalSGST, totalCGST: billTotalCGST,
      totalAmount: grandTotalAmount, 
      isEstimate: !!isEstimate, 
      notes: billData.notes || undefined,
      paymentStatus: billData.paymentStatus, 
      billedByStaffId: staffUser?.id, billedByStaffName: staffUser?.name,
      storeId: storeDetails?.id, storeName: storeDetails?.name, 
      companyId: companyId,
    };

    db.bills.push(newBill);
    // Persist product updates (stock changes, conceptual SKU creation)
    db.products = db.products.map(p => {
      const updatedProduct = productsToUpdate.find(up => up.id === p.id);
      return updatedProduct || p;
    });

    await writeDB(db);
    console.log(`${routeLogName} New bill (ID: ${newBillId}) created successfully for company ${companyId}.`);
    return NextResponse.json({ success: true, data: newBill }, { status: 201 });

  } catch (error) {
    console.error(`${routeLogName} Error creating bill:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred during bill creation.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
