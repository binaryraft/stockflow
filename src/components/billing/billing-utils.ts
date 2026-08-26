
import { BillItem, BillMode, Product } from '@/types';

export const calculateItemTax = (
    item: BillItem,
    currentQuantity: number,
    currentSellPrice: number,
    currentDiscountValue: number = 0,
    currentDiscountType: 'amount' | 'percentage' = 'amount',
    taxType: 'intra-state' | 'inter-state',
    product?: Product | null
) => {
    const subTotal = currentSellPrice * currentQuantity;
    let discountAmount = 0;

    if (currentDiscountValue > 0) {
        if (currentDiscountType === 'percentage') {
            discountAmount = (subTotal * currentDiscountValue) / 100;
        } else {
            // Treat fixed amount as per-unit discount if needed, or total. 
            // Current logic in original generic file treated it relative to total or unit?
            // Original: discountAmount = currentDiscountValue * currentQuantity;
            discountAmount = currentDiscountValue * currentQuantity;
        }
    }

    const taxableValue = Math.max(0, subTotal - discountAmount);
    let sgst = 0, cgst = 0, igst = 0;

    if (product) {
        if (taxType === 'intra-state') {
            sgst = (taxableValue * (product.sgstRate || 0)) / 100;
            cgst = (taxableValue * (product.cgstRate || 0)) / 100;
        } else {
            const rate = product.igstRate !== undefined ? product.igstRate : ((product.sgstRate || 0) + (product.cgstRate || 0));
            igst = (taxableValue * rate) / 100;
        }
    }

    return { sgst, cgst, igst, discountAmount };
};

export const calculateBillTotals = (
    items: BillItem[],
    mode: BillMode,
    isEstimateMode: boolean,
    taxType: 'intra-state' | 'inter-state'
) => {
    let subTotal = 0;
    let totalSGST = 0;
    let totalCGST = 0;
    let totalIGST = 0;
    let totalDiscount = 0;

    items.forEach(item => {
        if (mode === 'buy') {
            subTotal += item.costPrice * item.quantity;
        } else {
            // Sell or Return
            subTotal += item.sellPrice * item.quantity;
            if (!item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
                totalDiscount += item.discountAmount || 0;
                if (!isEstimateMode) {
                    totalSGST += item.sgstAmount || 0;
                    totalCGST += item.cgstAmount || 0;
                    totalIGST += item.igstAmount || 0;
                }
            }
        }
    });

    let grandTotal = 0;
    if (mode === 'buy') {
        grandTotal = subTotal;
    } else {
        // Sell/Return
        if (isEstimateMode) {
            grandTotal = subTotal - totalDiscount;
        } else {
            grandTotal = (subTotal - totalDiscount) + totalSGST + totalCGST + totalIGST;
        }
    }

    return { subTotal, totalSGST, totalCGST, totalIGST, totalDiscount, grandTotal };
};
