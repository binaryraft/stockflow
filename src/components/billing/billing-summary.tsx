
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Printer, IndianRupee } from 'lucide-react';
import { BillMode } from '@/types';
import { cn } from '@/lib/utils';

interface BillingSummaryProps {
    totals: {
        subTotal: number;
        totalSGST: number;
        totalCGST: number;
        totalIGST: number;
        totalDiscount: number;
        grandTotal: number;
    };
    mode: BillMode;
    notes: string;
    setNotes: (val: string) => void;
    onSave: () => void;
    isSaving: boolean;
}

export const BillingSummary: React.FC<BillingSummaryProps> = ({
    totals, mode, notes, setNotes, onSave, isSaving
}) => {
    return (
        <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Notes Section */}
                <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add remarks..."
                    />
                </div>

                {/* Spacer */}
                <div className="hidden md:block"></div>

                {/* Financials */}
                <div className="md:col-span-1 space-y-2 text-sm bg-muted/30 p-4 rounded-lg border">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">₹{totals.subTotal.toFixed(2)}</span>
                    </div>
                    {totals.totalDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                        </div>
                    )}
                    {totals.totalSGST > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>SGST:</span>
                            <span>₹{totals.totalSGST.toFixed(2)}</span>
                        </div>
                    )}
                    {totals.totalCGST > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>CGST:</span>
                            <span>₹{totals.totalCGST.toFixed(2)}</span>
                        </div>
                    )}
                    {totals.totalIGST > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>IGST:</span>
                            <span>₹{totals.totalIGST.toFixed(2)}</span>
                        </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-bold text-primary">
                        <span>Total:</span>
                        <span>₹{totals.grandTotal.toFixed(2)}</span>
                    </div>

                    <Button onClick={onSave} isLoading={isSaving} className="w-full mt-4 h-12 text-lg shadow-lg">
                        <Save className="mr-2 h-5 w-5" />
                        Save Bill
                    </Button>
                </div>
            </div>
        </div>
    );
};
