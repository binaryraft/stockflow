
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { Bill, Product, ProductSKU, StockLayer, BillItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// GET all bills for a company (can be filtered by storeId, etc., via query params later)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const db = await readDB();
    const companyBills = db.bills.filter(b => b.companyId === companyId).sort((a, b) => b.timestamp - a.timestamp);
    return NextResponse.json({ success: true, data: companyBills });
  } catch (error) {
    console.error('API GET /api/bills error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new bill and update inventory
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { billData, itemsData } = body;
    const { companyId, storeId, type: billType, isEstimate } = billData;

    if (!companyId || !billType || !itemsData || itemsData.length === 0) {
      return NextResponse.json({ success: false, message: 'Company ID, bill type, and items are required' }, { status: 400 });
    }

    const db = await readDB();
    const companyProducts = db.products.filter(p => p.companyId === companyId);
    let productsToUpdate: Product[] = JSON.parse(JSON.stringify(companyProducts)); // Deep clone for modifications

    const currentDate = new Date();
    const newBillId = format(currentDate, 'ddMMyyHHmmssS'); // Added S for milliseconds for more uniqueness
    const billTimestamp = currentDate.getTime();
    
    let processedBillItems: BillItem[] = [];
    let billSubTotal = 0;
    let billTotalSGST = 0;
    let billTotalCGST = 0;

    for (const item of itemsData) {
      const productIndex = productsToUpdate.findIndex(p => p.id === item.productId);
      if (productIndex === -1) {
        return NextResponse.json({ success: false, message: `Product with ID ${item.productId} not found for this company.` }, { status: 404 });
      }
      const product = productsToUpdate[productIndex];

      let sku: ProductSKU | undefined;
      const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(item.selectedVariantOptions || {}).sort()));
      sku = product.productSKUs.find(s => JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions);

      if (!sku) { // Should ideally be created if not found during product selection logic, but ensure here.
         const skuIdentifier = product.name + (Object.values(item.selectedVariantOptions || {}).length > 0 ? ` (${Object.values(item.selectedVariantOptions || {}).join(' - ')})` : '');
         sku = { id: uuidv4(), optionValues: item.selectedVariantOptions || {}, skuIdentifier, stockLayers: [] };
         product.productSKUs.push(sku);
      }
      
      const itemProductName = sku.skuIdentifier || product.name;
      let itemCostPrice = item.costPrice || 0; // Will be calculated for sales, taken from input for buys/returns
      let itemSellPrice = item.sellPrice || 0;
      let itemSgstAmount = 0;
      let itemCgstAmount = 0;

      if (billType === 'sell' && !isEstimate) {
        if (product.trackQuantity) {
          let quantityToSell = item.quantity;
          let costOfGoodsSoldThisItem = 0;
          const relevantLayers = sku.stockLayers
            .filter(l => (l.storeId === storeId || !l.storeId) && l.quantity > 0) // Match storeId or use unassigned layers
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

          if (relevantLayers.reduce((sum, l) => sum + l.quantity, 0) < quantityToSell) {
            return NextResponse.json({ success: false, message: `Insufficient stock for ${itemProductName} at store ${storeId}. Available: ${relevantLayers.reduce((sum, l) => sum + l.quantity, 0)}` }, { status: 400 });
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
          // For non-tracked items, cost price might be a default or average if set.
          // Assuming it's passed in item.costPrice from client if needed, or 0.
          itemCostPrice = product.productSKUs[0]?.stockLayers[0]?.costPrice || 0;
        }
        // Calculate tax for sales bill items (non-service, non-additionalCharge)
        if (!item.productId.startsWith('SERVICE_ITEM_') && !item.isAdditionalCharge) {
            const itemPreTaxValue = itemSellPrice * item.quantity;
            itemSgstAmount = (itemPreTaxValue * (product.sgstRate || 0)) / 100;
            itemCgstAmount = (itemPreTaxValue * (product.cgstRate || 0)) / 100;
        }
      } else if (billType === 'buy') {
        if (product.trackQuantity) {
          const newLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, // Sell price set at time of purchase
            storeId: storeId,
          };
          sku.stockLayers.push(newLayer);
        }
      } else if (billType === 'return') {
        // Cost price for return should be COGS from original sale or avg cost. For now, using item.costPrice.
        if (product.trackQuantity && !item.isDefective) {
          const returnLayer: StockLayer = {
            id: uuidv4(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
            initialQuantity: item.quantity, quantity: item.quantity,
            costPrice: itemCostPrice, sellPrice: itemSellPrice, // Price at which it was returned
            storeId: storeId,
          };
          sku.stockLayers.push(returnLayer);
        }
      }
      
      const currentItemSubTotal = itemSellPrice * item.quantity;
      billSubTotal += currentItemSubTotal;
      billTotalSGST += itemSgstAmount;
      billTotalCGST += itemCgstAmount;

      processedBillItems.push({
        id: uuidv4(), productId: product.id, productName: itemProductName,
        quantity: item.quantity, costPrice: itemCostPrice, sellPrice: itemSellPrice,
        isDefective: item.isDefective, selectedVariantOptions: item.selectedVariantOptions,
        sgstAmount: itemSgstAmount, cgstAmount: itemCgstAmount,
        isAdditionalCharge: item.isAdditionalCharge, sourceChargeDefinitionId: item.sourceChargeDefinitionId,
      });
    }
    
    // Handle additional charges that are part of the main product definition
    // These are added *after* main product items so their percentages can be based on main item's value
    const mainProductBillItems = processedBillItems.filter(it => !it.isAdditionalCharge && !it.productId.startsWith('SERVICE_ITEM_'));
    for (const mainItem of mainProductBillItems) {
        const productDef = productsToUpdate.find(p => p.id === mainItem.productId);
        if (productDef?.additionalChargeDefinitions && productDef.additionalChargeDefinitions.length > 0) {
            productDef.additionalChargeDefinitions.forEach(chargeDef => {
                let chargeValue = 0;
                if (chargeDef.type === 'fixed') {
                    chargeValue = chargeDef.value;
                } else if (chargeDef.type === 'percentage') {
                    // Calculate percentage based on the specific main item's line total
                    chargeValue = ((mainItem.sellPrice * mainItem.quantity) * chargeDef.value) / 100;
                }
                
                const chargeBillItem: BillItem = {
                    id: uuidv4(), productId: `CHARGE_ITEM_${chargeDef.id}`, productName: chargeDef.name,
                    quantity: 1, costPrice: 0, sellPrice: chargeValue,
                    sgstAmount: 0, cgstAmount: 0, isAdditionalCharge: true, sourceChargeDefinitionId: chargeDef.id,
                };
                processedBillItems.push(chargeBillItem);
                billSubTotal += chargeValue; // Add to bill's subtotal if it's a sales/return type
            });
        }
    }


    let grandTotalAmount;
    if (billType === 'buy') {
        grandTotalAmount = processedBillItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
        billSubTotal = grandTotalAmount; // For buy bills, subtotal is total cost
        billTotalSGST = 0; billTotalCGST = 0; // No output tax on buy bills
    } else if ((billType === 'sell' || billType === 'return') && isEstimate) {
        grandTotalAmount = billSubTotal;
        billTotalSGST = 0; billTotalCGST = 0; // No tax on estimates
    } else { // Sell (non-estimate) or Return
        grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST;
    }
    
    const staffUser = db.users.find(u => u.id === billData.billedByStaffId && u.companyId === companyId);
    const storeDetails = db.stores.find(s => s.id === storeId && s.companyId === companyId);

    const newBill: Bill = {
      id: newBillId,
      type: billType,
      date: currentDate.toISOString(),
      timestamp: billTimestamp,
      vendorOrCustomerName: billData.vendorOrCustomerName,
      customerPhone: billData.customerPhone,
      items: processedBillItems,
      subTotal: billSubTotal,
      totalSGST: billTotalSGST,
      totalCGST: billTotalCGST,
      totalAmount: grandTotalAmount,
      isEstimate: !!isEstimate,
      notes: billData.notes,
      paymentStatus: billData.paymentStatus,
      billedByStaffId: staffUser?.id,
      billedByStaffName: staffUser?.name,
      storeId: storeDetails?.id,
      storeName: storeDetails?.name,
      companyId: companyId,
    };

    db.bills.push(newBill);
    // Update the main products array with modified stock layers
    db.products = db.products.map(p => {
      const updatedProduct = productsToUpdate.find(up => up.id === p.id);
      return updatedProduct || p;
    });

    await writeDB(db);
    return NextResponse.json({ success: true, data: newBill }, { status: 201 });

  } catch (error) {
    console.error('API POST /api/bills error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred during bill creation.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
