
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Send, ShoppingBag, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { BillMode, Store, SubscriptionPlan } from '@/types';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';

interface BillingHeaderProps {
    mode: BillMode;
    setMode: (mode: BillMode) => void;
    allowedModes?: BillMode[];

    customerVendorName: string;
    setCustomerVendorName: (val: string) => void;

    customerPhone: string;
    setCustomerPhone: (val: string) => void;

    gstin: string; // New field
    setGstin: (val: string) => void;

    billDate: Date | undefined;
    setBillDate: (date: Date | undefined) => void;

    isAdminContext: boolean;
    allStores: Store[];
    activePlan?: SubscriptionPlan;
    selectedStoreIdForAdmin?: string;
    setSelectedStoreIdForAdmin: (id: string) => void;

    isEstimateMode: boolean;
    setIsEstimateMode: (val: boolean) => void;

    taxType: 'intra-state' | 'inter-state';
    setTaxType: (val: 'intra-state' | 'inter-state') => void;
}

export const BillingHeader: React.FC<BillingHeaderProps> = ({
    mode, setMode, allowedModes,
    customerVendorName, setCustomerVendorName,
    customerPhone, setCustomerPhone,
    gstin, setGstin,
    billDate, setBillDate,
    isAdminContext, allStores, activePlan,
    selectedStoreIdForAdmin, setSelectedStoreIdForAdmin,
    isEstimateMode, setIsEstimateMode,
    taxType, setTaxType
}) => {
    const displayModes = allowedModes || ['sell', 'buy', 'return'];

    const activeModeConfig = {
        sell: { icon: Send, color: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", label: "Sales" },
        buy: { icon: ShoppingBag, color: "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground", label: "Purchase" },
        return: { icon: RotateCcw, color: "data-[state=active]:bg-amber-400 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950", label: "Return" },
    };

    const showAdminStoreSelector = isAdminContext &&
        activePlan &&
        activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER &&
        activePlan.id !== SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY &&
        allStores.length > 1;

    return (
        <div className="space-y-4">
            {/* Mode Selection Tabs */}
            <div className="flex justify-center">
                <Tabs value={mode} onValueChange={(v) => setMode(v as BillMode)} className="w-auto">
                    <TabsList className="grid w-full grid-cols-3 gap-1 h-11">
                        {displayModes.includes('sell') && (
                            <TabsTrigger value="sell" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.sell.color)}>
                                <activeModeConfig.sell.icon size={18} />{activeModeConfig.sell.label}
                            </TabsTrigger>
                        )}
                        {displayModes.includes('buy') && (
                            <TabsTrigger value="buy" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.buy.color)}>
                                <activeModeConfig.buy.icon size={18} />{activeModeConfig.buy.label}
                            </TabsTrigger>
                        )}
                        {displayModes.includes('return') && (
                            <TabsTrigger value="return" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.return.color)}>
                                <activeModeConfig.return.icon size={18} />{activeModeConfig.return.label}
                            </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>
            </div>

            {/* Admin Store Selector */}
            {showAdminStoreSelector && (
                <div className="space-y-1.5 pb-4 border-b border-dashed">
                    <Label htmlFor="adminStoreSelect" className="flex items-center gap-1.5 text-base font-medium text-primary">
                        <Building size={18} /> Store for this Bill
                    </Label>
                    <Select value={selectedStoreIdForAdmin || ""} onValueChange={setSelectedStoreIdForAdmin}>
                        <SelectTrigger id="adminStoreSelect" className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a store..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allStores.map(store => (
                                <SelectItem key={store.id} value={store.id}>{store.name} ({store.location})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Customer / Vendor Info & Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/40 rounded-lg border">
                {/* Name */}
                <div className="space-y-1.5">
                    <Label htmlFor="customerVendorName">{mode === 'buy' ? 'Vendor Name' : (mode === 'sell' ? 'Customer Name' : 'Party Name')}</Label>
                    <Input
                        id="customerVendorName"
                        value={customerVendorName}
                        onChange={(e) => setCustomerVendorName(e.target.value)}
                        placeholder={`Enter ${mode === 'buy' ? 'vendor' : 'customer'} name`}
                    />
                </div>

                {/* Phone */}
                {mode !== 'buy' && (
                    <div className="space-y-1.5">
                        <Label htmlFor="customerPhone">Customer Phone</Label>
                        <Input
                            id="customerPhone"
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Enter customer phone"
                        />
                    </div>
                )}

                {/* GSTIN (New) */}
                <div className="space-y-1.5">
                    <Label htmlFor="gstin">GSTIN (Optional)</Label>
                    <Input
                        id="gstin"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        maxLength={15}
                    />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                    <Label>Bill Date</Label>
                    <DatePicker date={billDate} setDate={setBillDate} />
                </div>
            </div>

            {/* Toggles */}
            {mode === 'sell' && (
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                    <div className="flex items-center space-x-2 bg-secondary/30 px-3 py-1.5 rounded-md border text-sm">
                        <Switch id="estimate-mode" checked={isEstimateMode} onCheckedChange={setIsEstimateMode} />
                        <Label htmlFor="estimate-mode" className="cursor-pointer">Estimate/Quotation</Label>
                    </div>
                    {!isEstimateMode && (
                        <div className="flex items-center space-x-2 bg-secondary/30 px-3 py-1.5 rounded-md border text-sm">
                            <Switch
                                id="tax-mode"
                                checked={taxType === 'inter-state'}
                                onCheckedChange={(c) => setTaxType(c ? 'inter-state' : 'intra-state')}
                            />
                            <Label htmlFor="tax-mode" className="cursor-pointer">IGST</Label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
