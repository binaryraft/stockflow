
import { format } from 'date-fns';
import type { Bill, BillItem, ProductSKU, Product, UserProfile } from '@/types';
import { DEFAULT_COMPANY_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from '@/lib/constants';
import { getCurrencySymbol } from './utils'; // Import the new helper

// Helper function to get SKU details - simplified, assumes product and SKU exist
const getProductSkuForPrint = (
    productId: string, 
    selectedOptions: Record<string, string> | undefined,
    products: Product[]
): ProductSKU | undefined => {
    const product = products.find(p => p.id === productId);
    if (!product) return undefined;
    if (productId.startsWith('SERVICE_ITEM_') || productId.startsWith('CHARGE_ITEM_')) return undefined;

    const targetOptionValues = selectedOptions || {};
    return product.productSKUs.find(sku =>
        JSON.stringify(Object.fromEntries(Object.entries(sku.optionValues).sort())) ===
        JSON.stringify(Object.fromEntries(Object.entries(targetOptionValues).sort()))
    );
};


const getBillTypeNameForPrint = (bill: Bill): string => {
    if (bill.type === 'buy') return 'Expense Bill';
    if (bill.type === 'sell' && bill.isEstimate) return 'Estimate';
    if (bill.type === 'sell') return 'Tax Invoice';
    if (bill.type === 'return' && bill.items.some(item => item.isDefective)) return 'Return (Defective)';
    if (bill.type === 'return') return 'Return';
    return 'Bill';
};

const getPartyDetailsTitleForPrint = (billType: Bill['type']): string => {
  if (billType === 'buy') return 'Vendor Details';
  if (billType === 'sell' || billType === 'return') return 'Customer Details';
  return 'Party Details';
};

const getPartyNameLabelForPrint = (billType: Bill['type']): string => {
  if (billType === 'buy') return 'Vendor Name';
  if (billType === 'sell' || billType === 'return') return 'Customer Name';
  return 'Name';
};


export const generateBillPrintContent = (
    billToPrint: Bill, 
    userProfile: UserProfile | undefined,
    products: Product[]
): string => {
  const currencySymbol = getCurrencySymbol(userProfile?.companyCurrency);
  let content = '<html><head><title>Print Bill</title>';
  const styles =
    "<style>\n" +
    "  body { font-family: Arial, Helvetica, sans-serif; margin: 20px; line-height: 1.6; color: #333; font-size: 10pt; }\n" +
    "  @page { size: auto; margin: 0.5in; }\n" +
    "  .print-container { max-width: 750px; margin: auto; }\n" +
    "  .header, .bill-to, .bill-info, .items-section, .notes-section, .summary-section, .billed-by-section { margin-bottom: 15px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; page-break-inside: avoid; background-color: #fff; }\n" +
    "  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 25px; background-color: transparent; border-radius: 0; border-left: 0; border-right: 0; }\n" +
    "  .header h1 { margin: 0 0 5px 0; font-size: 18pt; font-weight: bold; color: #000; }\n" +
    "  .header p { margin: 2px 0; font-size: 9pt; color: #444; }\n" +
    "  h3, h4 { margin-top: 0; margin-bottom: 8px; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #111; }\n" +
    "  h4 { font-size: 10pt; }\n" +
    "  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }\n" +
    "  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }\n" +
    "  th { background-color: #f7f7f7; font-weight: bold; color: #222; }\n" +
    "  .text-right { text-align: right; }\n" +
    "  .font-medium { font-weight: bold; }\n" +
    "  .text-muted-foreground { color: #555; font-size: 0.9em; }\n" +
    "  .badge { display: inline-block; padding: 0.25em 0.6em; font-size: 0.75em; font-weight: bold; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.375rem; border: 1px solid transparent; }\n" +
    "  .badge-destructive { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; }\n" +
    "  .badge-success { color: #155724; background-color: #d4edda; border-color: #c3e6cb; }\n" +
    "  .badge-paid { color: #155724; background-color: #d4edda; border-color: #c3e6cb; } \n" +
    "  .badge-unpaid { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; } \n" +
    "  .total-row td { font-weight: bold; background-color: #f7f7f7; font-size: 10pt; }\n" +
    "  .items-section .variant-options { font-size: 0.8em; color: #555; margin-left: 10px; margin-top: 3px; display: block; font-style: italic; }\n" +
    "  .items-section .item-sub-detail { font-size: 0.85em; color: #444; margin-top: 2px; display: block; } \n" +
    "  .notes-content { white-space: pre-wrap; font-style: italic; background-color: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #eee; }\n" +
    "  .no-print { display: none !important; } \n" +
    "</style>\n";
  content += styles;
  content += '</head><body>';
  content += '<div class="print-container">';

  content += '<div class="header">';
  content += `<h1>${userProfile?.companyName || DEFAULT_COMPANY_NAME}</h1>`;
  content += `<p>${userProfile?.companyAddress || COMPANY_ADDRESS}</p>`; // Use profile address
  content += `<p>Phone: ${userProfile?.companyPhone || 'N/A'} | GSTIN: ${userProfile?.companyGstNo || 'N/A'}</p>`; // Use profile phone/GST
  content += `<h2>${billToPrint.type === 'sell' && billToPrint.isEstimate ? 'ESTIMATE' : (billToPrint.type === 'sell' ? 'TAX INVOICE' : getBillTypeNameForPrint(billToPrint).toUpperCase())}</h2>`;
  content += '</div>';

  content += '<table style="width:100%; margin-bottom: 20px; border:0;"><tr><td style="width:50%; vertical-align:top; border:0;">';
  if (billToPrint.vendorOrCustomerName || billToPrint.customerPhone) {
    content += '<div class="bill-to">';
    content += `<h4>${getPartyDetailsTitleForPrint(billToPrint.type)}</h4>`;
    if (billToPrint.vendorOrCustomerName) content += `<p><strong>${getPartyNameLabelForPrint(billToPrint.type)}:</strong> ${billToPrint.vendorOrCustomerName}</p>`;
    if (billToPrint.customerPhone) content += `<p><strong>Phone:</strong> ${billToPrint.customerPhone}</p>`;
    content += '</div>';
  }
  content += '</td><td style="width:50%; vertical-align:top; border:0;">';
  content += '<div class="bill-info text-right">';
  content += `<h4>Bill Information</h4>`;
  content += `<p><strong>Bill ID:</strong> ${billToPrint.id}</p>`;
  content += `<p><strong>Date:</strong> ${format(new Date(billToPrint.date), 'PPpp')}</p>`;
  if (!(billToPrint.type === 'sell' && billToPrint.isEstimate)) {
    content += `<p><strong>Type:</strong> ${getBillTypeNameForPrint(billToPrint)}</p>`;
  }
  if (billToPrint.paymentStatus && (billToPrint.type === 'sell' || billToPrint.type === 'buy') && !billToPrint.isEstimate) {
    content += `<p><strong>Payment:</strong> <span class="badge badge-${billToPrint.paymentStatus === 'paid' ? 'paid' : 'unpaid'}">${billToPrint.paymentStatus.charAt(0).toUpperCase() + billToPrint.paymentStatus.slice(1)}</span></p>`;
  }
  content += '</div>';
  content += '</td></tr></table>';

  if (billToPrint.billedByStaffName || billToPrint.storeName) {
    content += '<div class="billed-by-section">';
    content += `<h4>Transaction Origin</h4>`;
    if (billToPrint.storeName) content += `<p><strong>Store:</strong> ${billToPrint.storeName}</p>`;
    if (billToPrint.billedByStaffName) content += `<p><strong>Billed by:</strong> ${billToPrint.billedByStaffName}</p>`;
    content += '</div>';
  }

  content += '<div class="items-section">';
  content += '<h3>Items</h3>';
  
  const showTaxDetailsInItems = billToPrint.type === 'sell' && !billToPrint.isEstimate;

  if (billToPrint.type === 'buy') { 
    content += '<table><thead><tr><th>#</th><th>Product Details</th><th>Purch. Qty</th><th>Sold Qty</th><th>Rem. Qty</th><th>Cost/Unit</th><th>Sell Price (Set)</th><th>Item Total</th></tr></thead><tbody>';
    billToPrint.items.forEach((item, index) => {
        const sku = getProductSkuForPrint(item.productId, item.selectedVariantOptions, products);
        const layerForThisBillItem = sku?.stockLayers.find(l => l.purchaseBillId === billToPrint.id && l.costPrice === item.costPrice && Math.abs(l.initialQuantity - item.quantity) < 0.001 );
        
        const purchasedQty = layerForThisBillItem ? layerForThisBillItem.initialQuantity : item.quantity;
        const soldQty = layerForThisBillItem ? layerForThisBillItem.initialQuantity - layerForThisBillItem.quantity : 0;
        const remainingQty = layerForThisBillItem ? layerForThisBillItem.quantity : 0;
        const costPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
        const sellPriceSet = typeof (layerForThisBillItem?.sellPrice ?? item.sellPrice) === 'number' ? (layerForThisBillItem?.sellPrice ?? item.sellPrice) : 0;

        content += '<tr>';
        content += `<td>${index + 1}</td>`;
        content += `<td>${item.productName}`;
        if (item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
            content += '<span class="variant-options">';
            content += Object.entries(item.selectedVariantOptions).map(([key, value]) => `${key}: ${value}`).join(', ');
            content += '</span>';
        }
        content += '</td>';
        content += `<td class="text-right">${purchasedQty.toFixed(2)}</td>`;
        content += `<td class="text-right" style="color: green;">${soldQty.toFixed(2)}</td>`;
        content += `<td class="text-right font-medium">${remainingQty.toFixed(2)}</td>`;
        content += `<td class="text-right">${currencySymbol}${costPrice.toFixed(2)}</td>`;
        content += `<td class="text-right">${currencySymbol}${sellPriceSet.toFixed(2)}</td>`;
        content += `<td class="text-right font-medium">${currencySymbol}${(item.quantity * costPrice).toFixed(2)}</td>`;
        content += '</tr>';
    });
  } else { 
    const itemSubTotalColName = showTaxDetailsInItems ? "Subtotal" : "Item Total";
    content += '<table><thead><tr><th>#</th><th>Product/Charge</th><th>Qty</th><th>Price/Unit</th>';
    if (showTaxDetailsInItems && billToPrint.items.some(i => !i.isAdditionalCharge)) { 
      content += '<th>SGST</th><th>CGST</th>';
    }
    content += `<th class="text-right">${itemSubTotalColName}</th></tr></thead><tbody>`;
    
    billToPrint.items.forEach((item, index) => {
        const sellPrice = typeof item.sellPrice === 'number' ? item.sellPrice : 0;
        const itemPreTaxSubtotal = item.quantity * sellPrice;
        const itemSgst = item.sgstAmount || 0;
        const itemCgst = item.cgstAmount || 0;
        const itemTotalWithTax = itemPreTaxSubtotal + itemSgst + itemCgst;

        content += '<tr>';
        content += `<td>${index + 1}</td>`;
        content += `<td>${item.productName}`;
        if (item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
            content += '<span class="variant-options">';
            content += Object.entries(item.selectedVariantOptions).map(([key, value]) => `${key}: ${value}`).join(', ');
            content += '</span>';
        }
        if (billToPrint.type === 'return') {
           if (item.isDefective) {
            content += ' <span class="badge badge-destructive">Defective</span>';
          } else {
            content += ' <span class="badge badge-success">Restocked</span>';
          }
        }
        content += '</td>';
        content += `<td class="text-right">${item.quantity.toFixed(2)}</td>`;
        content += `<td class="text-right">${currencySymbol}${sellPrice.toFixed(2)}</td>`;
        if (showTaxDetailsInItems && billToPrint.items.some(i => !i.isAdditionalCharge)) {
          if (item.isAdditionalCharge) {
            content += `<td class="text-right">-</td>`;
            content += `<td class="text-right">-</td>`;
          } else {
            content += `<td class="text-right">${currencySymbol}${itemSgst.toFixed(2)}</td>`;
            content += `<td class="text-right">${currencySymbol}${itemCgst.toFixed(2)}</td>`;
          }
        }
        content += `<td class="text-right font-medium">${currencySymbol}${(showTaxDetailsInItems && !item.isAdditionalCharge ? itemTotalWithTax : itemPreTaxSubtotal).toFixed(2)}</td>`;
        content += '</tr>';
    });
  }
  content += '</tbody></table>';
  content += '</div>';

  if (billToPrint.notes) {
    content += '<div class="notes-section">';
    content += '<h4>Notes</h4>';
    content += `<p class="notes-content">${billToPrint.notes}</p>`;
    content += '</div>';
  }

  content += '<div class="summary-section">';
  content += '<h4>Summary</h4>';
  content += `<table style="width: auto; margin-left: auto; border: none;">`; 
  
  if (billToPrint.type === 'buy') {
    const expectedRevenue = billToPrint.items.reduce((acc, item) => {
        const sku = getProductSkuForPrint(item.productId, item.selectedVariantOptions, products);
        const layerForThisBillItem = sku?.stockLayers.find(l => l.purchaseBillId === billToPrint.id && l.costPrice === item.costPrice && Math.abs(l.initialQuantity - item.quantity) < 0.001);
        const sellPriceForCalc = typeof (layerForThisBillItem?.sellPrice ?? item.sellPrice) === 'number' ? (layerForThisBillItem?.sellPrice ?? item.sellPrice) : 0;
        return acc + (sellPriceForCalc * item.quantity);
    }, 0);
    const expectedProfitOrLoss = expectedRevenue - billToPrint.totalAmount;
    const profitLossColor = expectedProfitOrLoss >= 0 ? '#166534' : '#b91c1c'; 
    content += `<tr class="total-row"><td style="text-align:right; border: none; color: #b91c1c;"><strong>Total Cost (This Expense Bill):</strong></td><td class="text-right" style="border: none; color: #b91c1c;"><strong>${currencySymbol}${billToPrint.totalAmount.toFixed(2)}</strong></td></tr>`;
    content += `<tr><td style="text-align:right; border: none;">Expected Revenue (from items in this bill):</td><td class="text-right" style="border: none;">${currencySymbol}${expectedRevenue.toFixed(2)}</td></tr>`;
    content += `<tr><td style="text-align:right; border: none;">Expected Profit/(Loss) (from items in this bill):</td><td class="text-right" style="color:${profitLossColor}; border: none; font-weight: bold;">${currencySymbol}${expectedProfitOrLoss.toFixed(2)}</td></tr>`;
  } else if (billToPrint.type === 'sell' || billToPrint.type === 'return') {
     if (showTaxDetailsInItems) { 
        content += `<tr><td style="text-align:right; border: none;">Subtotal:</td><td class="text-right" style="border: none;">${currencySymbol}${(billToPrint.subTotal || 0).toFixed(2)}</td></tr>`;
        content += `<tr><td style="text-align:right; border: none;">Total SGST:</td><td class="text-right" style="border: none;">${currencySymbol}${(billToPrint.totalSGST || 0).toFixed(2)}</td></tr>`;
        content += `<tr><td style="text-align:right; border: none;">Total CGST:</td><td class="text-right" style="border: none;">${currencySymbol}${(billToPrint.totalCGST || 0).toFixed(2)}</td></tr>`;
     }
     const totalRowColor = billToPrint.type === 'sell' ? (billToPrint.isEstimate ? '#1d4ed8' : '#166534') : '#b45309';
     const totalLabel = billToPrint.type === 'sell' && billToPrint.isEstimate ? 'Estimate Total:' : 'Grand Total:';
     content += `<tr class="total-row"><td style="text-align:right; border: none; color: ${totalRowColor};"><strong>${totalLabel}</strong></td><td class="text-right" style="border: none; color: ${totalRowColor};"><strong>${currencySymbol}${billToPrint.totalAmount.toFixed(2)}</strong></td></tr>`;
  }
  content += '</table>';
  content += '</div>';

  content += '</div>'; 
  content += '</body></html>';
  return content;
};

export const generateReportPrintContent = (
    reportHtml: string,
    reportTitle: string,
    userProfile: UserProfile | undefined
): string => {
  let content = '<html><head><title>Print Report - ' + reportTitle + '</title>';
  const styles =
    "<style>\n" +
    "  body { font-family: Arial, Helvetica, sans-serif; margin: 20px; line-height: 1.4; color: #333; font-size: 10pt; }\n" +
    "  @page { size: auto; margin: 0.5in; }\n" +
    "  .print-container { max-width: 800px; margin: auto; }\n" +
    "  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 25px; }\n" +
    "  .header h1 { margin: 0 0 5px 0; font-size: 18pt; font-weight: bold; color: #000; }\n" +
    "  .header p { margin: 2px 0; font-size: 9pt; color: #444; }\n" +
    "  h3 { font-size: 14pt; margin-bottom: 15px; text-align: center; }\n" +
    "  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }\n" +
    "  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }\n" +
    "  th { background-color: #f7f7f7; font-weight: bold; color: #222; }\n" +
    "  .card { border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 15px; page-break-inside: avoid; }\n" +
    "  .card-header { padding: 15px; border-bottom: 1px solid #eee; }\n" +
    "  .card-title { font-size: 14pt; margin: 0; font-weight: bold; }\n" +
    "  .card-description { font-size: 9pt; color: #555; margin: 4px 0 0 0; }\n" +
    "  .card-content { padding: 15px; }\n" +
    "  .card-footer { padding: 15px; border-top: 1px solid #eee; background-color: #f9f9f9; font-size: 8pt; }\n" +
    "  .text-right { text-align: right; }\n" +
    "  .text-destructive { color: #dc2626 !important; } \n" +
    "  .text-green-600 { color: #16a34a !important; } \n" +
    "  .flex { display: flex !important; } .justify-between { justify-content: space-between !important; } .items-center { align-items: center !important; } \n" +
    "  .font-bold { font-weight: bold; } .font-semibold { font-weight: 600; } \n" +
    "  .text-muted-foreground { color: #555; } \n" +
    "  .no-print { display: none !important; } \n" +
    "</style>\n";
  content += styles;
  content += '</head><body>';
  content += '<div class="print-container">';

  content += '<div class="header">';
  content += `<h1>${userProfile?.companyName || DEFAULT_COMPANY_NAME}</h1>`;
  content += `<p>${userProfile?.companyAddress || COMPANY_ADDRESS}</p>`;
  content += `<p>Date Generated: ${format(new Date(), 'PPpp')}</p>`;
  content += '</div>';

  content += `<h3>${reportTitle}</h3>`;
  content += reportHtml;

  content += '</div></body></html>';
  return content;
};


export const triggerPrint = (content: string) => {
    const printWindow = window.open('', '_blank', 'height=800,width=600');
    if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    } else {
        alert("Please allow popups to print the bill.");
    }
};
