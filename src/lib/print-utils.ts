
import { format } from 'date-fns';
import type { Bill, BillItem, ProductSKU, Product, UserProfile, Store } from '@/types';
import { DEFAULT_COMPANY_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from '@/lib/constants';
import { getCurrencySymbol } from './utils';

const getBillTypeNameForPrint = (bill: Bill): string => {
  if (bill.type === 'buy') return 'EXPENSE RECEIPT';
  if (bill.type === 'sell' && bill.isEstimate) return 'ESTIMATE';
  if (bill.type === 'sell') return 'TAX INVOICE';
  if (bill.type === 'return') return 'RETURN RECEIPT';
  return 'RECEIPT';
};

const getPartyLabel = (billType: Bill['type']): string => {
  if (billType === 'buy') return 'Vendor';
  if (billType === 'sell' || billType === 'return') return 'Customer';
  return 'Party';
};

export const generateBillPrintContent = (
  billToPrint: Bill,
  userProfile: UserProfile | undefined,
  products: Product[],
  allStores?: Store[]
): string => {
  const currencySymbol = getCurrencySymbol(userProfile?.companyCurrency);
  const store = allStores?.find(s => s.id === billToPrint.storeId);
  const headerName = store?.name || userProfile?.companyName || DEFAULT_COMPANY_NAME;
  const headerAddress = store?.address || userProfile?.companyAddress || COMPANY_ADDRESS;
  const headerPhone = store?.phone || userProfile?.companyPhone || 'N/A';
  const headerGstin = store?.gstin || userProfile?.companyGstNo;
  const billTitle = getBillTypeNameForPrint(billToPrint);

  const formattedDate = format(new Date(billToPrint.date), 'dd/MM/yyyy h:mm a');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Print Receipt</title>
      <style>
        /* Reset and Base Styles */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Courier New', Courier, monospace; /* Monospace is good for receipts */
          background: #fff; 
          color: #000; 
          font-size: 12px; 
          line-height: 1.4;
        }
        
        /* Container */
        .receipt-container {
          width: 100%;
          max-width: 80mm; /* Default to thermal width for preview */
          margin: 0 auto;
          padding: 10px;
        }

        /* Utility Classes */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .border-b { border-bottom: 1px dashed #000; }
        .border-t { border-top: 1px dashed #000; }
        .py-1 { padding-top: 4px; padding-bottom: 4px; }
        .my-2 { margin-top: 8px; margin-bottom: 8px; }

        /* Header */
        .header { margin-bottom: 10px; }
        .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .header p { font-size: 10px; }
        
        /* Bill Meta */
        .invoice-title { font-size: 14px; font-weight: bold; margin: 8px 0; border: 1px solid #000; padding: 4px; display: inline-block; }
        .meta-table { width: 100%; font-size: 10px; margin-bottom: 10px; }
        .meta-table td { padding: 2px 0; }

        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
        .items-table th { border-bottom: 1px solid #000; text-align: left; padding: 4px 0; }
        .items-table td { padding: 4px 0; }
        .items-table .qty { width: 15%; text-align: center; }
        .items-table .price { width: 25%; text-align: right; }
        .items-table .total { width: 25%; text-align: right; }
        .items-table .desc { width: 35%; }

        /* Totals */
        .totals-section { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
        .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
        .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-top: 5px; }

        /* Footer */
        .footer { margin-top: 20px; text-align: center; font-size: 10px; }

        /* A4 / A5 Specific Overrides */
        @media print {
          @page { margin: 0; }
          body { -webkit-print-color-adjust: exact; }

          /* Default is Thermal (Small) - optimized above */
          
          /* If the user prints on A4 or A5 paper, we can expand */
          @media (min-width: 150mm) {
            .receipt-container {
              max-width: 100%;
              padding: 40px;
              font-family: Arial, sans-serif; /* Clean font for large paper */
              font-size: 14px;
            }
            .header h1 { font-size: 24px; color: #1e3a8a; }
            .items-table th { background-color: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; }
            .items-table td { padding: 8px; border: 1px solid #e5e7eb; }
            .items-table .desc { width: auto; }
            .invoice-title { border: 2px solid #1e3a8a; color: #1e3a8a; padding: 10px 20px; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
          }
        }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="receipt-container">
        
        <!-- Header -->
        <div class="header text-center">
          <h1>${headerName}</h1>
          <p>${headerAddress}</p>
          <p>Phone: ${headerPhone}</p>
          ${headerGstin ? `<p>GSTIN: ${headerGstin}</p>` : ''}
        </div>

        <div class="text-center">
          <div class="invoice-title uppercase">${billTitle}</div>
        </div>

        <!-- Meta Info -->
        <table class="meta-table">
          <tr>
            <td><strong>Invoice No:</strong> ${billToPrint.invoiceNumber || billToPrint.id.substring(0, 8).toUpperCase()}</td>
            <td class="text-right"><strong>Date:</strong> ${formattedDate}</td>
          </tr>
          <tr>
             <td colspan="2"><strong>${getPartyLabel(billToPrint.type)}:</strong> ${billToPrint.vendorOrCustomerName || 'Walk-in'}</td>
          </tr>
          ${billToPrint.customerPhone ? `<tr><td colspan="2">Phone: ${billToPrint.customerPhone}</td></tr>` : ''}
          ${billToPrint.gstin ? `<tr><td colspan="2">GSTIN: ${billToPrint.gstin}</td></tr>` : ''}
        </table>

        <!-- Items -->
        <table class="items-table">
          <thead>
            <tr>
              <th class="desc">Item</th>
              <th class="qty">Qty</th>
              <th class="price">Rate</th>
              <th class="total">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${billToPrint.items.map(item => `
              <tr>
                <td class="desc">
                  ${item.productName}
                  ${item.selectedVariantOptions ? `<br/><span style="font-size: 9px; color: #555;">${Object.values(item.selectedVariantOptions).join(', ')}</span>` : ''}
                </td>
                <td class="qty">${item.quantity}</td>
                <td class="price">${currencySymbol}${(item.sellPrice || 0).toFixed(2)}</td>
                <td class="total">${currencySymbol}${(item.quantity * (item.sellPrice || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${currencySymbol}${(billToPrint.subTotal || 0).toFixed(2)}</span>
          </div>
          
          ${(billToPrint.totalDiscount || 0) > 0 ? `
            <div class="totals-row">
              <span>Discount</span>
              <span>-${currencySymbol}${(billToPrint.totalDiscount || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${(billToPrint.totalSGST || 0) > 0 ? `
            <div class="totals-row">
              <span>SGST</span>
              <span>${currencySymbol}${(billToPrint.totalSGST || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${(billToPrint.totalCGST || 0) > 0 ? `
            <div class="totals-row">
              <span>CGST</span>
              <span>${currencySymbol}${(billToPrint.totalCGST || 0).toFixed(2)}</span>
            </div>
          ` : ''}

          ${(billToPrint.totalIGST || 0) > 0 ? `
             <div class="totals-row">
               <span>IGST</span>
               <span>${currencySymbol}${(billToPrint.totalIGST || 0).toFixed(2)}</span>
             </div>
           ` : ''}

          <div class="totals-row grand-total">
            <span>TOTAL</span>
            <span>${currencySymbol}${(billToPrint.totalAmount || 0).toFixed(2)}</span>
          </div>
           <div class="totals-row">
             <span>Status</span>
             <span>${billToPrint.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}</span>
           </div>
        </div>

        ${billToPrint.notes ? `
          <div class="my-2 border-t py-1">
            <strong>Notes:</strong> ${billToPrint.notes}
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Inventory System by StockFlow</p>
        </div>

      </div>
    </body>
    </html>
  `;
};

export const generateReportPrintContent = (
  reportHtml: string,
  reportTitle: string,
  userProfile: UserProfile | undefined
): string => {
  return `
    <html>
      <head>
        <title>Print Report - ${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .report-container { max-width: 100%; margin: 0 auto; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          h1 { text-align: center; color: #333; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="report-container">
          <h1>${reportTitle}</h1>
          <p style="text-align: center;">Generated by ${userProfile?.companyName || DEFAULT_COMPANY_NAME}</p>
          ${reportHtml}
        </div>
      </body>
    </html>
  `;
};

export const triggerPrint = (content: string) => {
  // Use a hidden iframe to print to avoid popup blockers
  const iframeId = 'print-iframe-service';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(content);
    doc.close();

    // Small delay to ensure styles and images are loaded
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  } else {
    console.error("Could not access iframe document for printing.");
    // Fallback
    const win = window.open('', '_blank');
    win?.document.write(content);
    win?.print();
  }
};
