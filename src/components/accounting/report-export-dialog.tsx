
"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Table as TableIcon, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: ExportConfig) => void;
    reportType: string;
}

export interface ExportConfig {
    templateId: string;
    includeHeader: boolean;
    includeSignature: boolean;
    compactMode: boolean;
}

const TEMPLATES = [
    {
        id: 'standard',
        name: 'Standard Statement',
        description: 'Clean, professional summary layout for internal reviews.',
        icon: FileText
    },
    {
        id: 'tax_compliant',
        name: 'Tax Rules Compliant',
        description: 'Includes mandatory tax fields, HSN codes, and business details.',
        icon: ShieldCheck
    },
    {
        id: 'detailed_table',
        name: 'Detailed Taxation',
        description: 'Item-wise breakdown with individual tax components listed.',
        icon: TableIcon
    },
    {
        id: 'compact',
        name: 'Audit Ready (Compact)',
        description: 'Dense layout for long reports, saving paper and space.',
        icon: Layers
    }
];

export function ReportExportDialog({ isOpen, onClose, onConfirm, reportType }: ReportExportDialogProps) {
    const [selectedTemplate, setSelectedTemplate] = useState('standard');
    const [includeHeader, setIncludeHeader] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(true);
    const [compactMode, setCompactMode] = useState(false);

    const handleConfirm = () => {
        onConfirm({
            templateId: selectedTemplate,
            includeHeader,
            includeSignature,
            compactMode
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Export Report Configuration</DialogTitle>
                    <DialogDescription>
                        Select a template and options for your {reportType.toUpperCase()} report.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Select Template</Label>
                        <RadioGroup
                            value={selectedTemplate}
                            onValueChange={setSelectedTemplate}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                            {TEMPLATES.map((template) => (
                                <div key={template.id}>
                                    <RadioGroupItem
                                        value={template.id}
                                        id={template.id}
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor={template.id}
                                        className={cn(
                                            "flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full transition-all",
                                            selectedTemplate === template.id ? "border-primary bg-primary/5" : ""
                                        )}
                                    >
                                        <template.icon className="mb-3 h-6 w-6 text-primary" />
                                        <div className="space-y-1">
                                            <p className="font-medium leading-none">{template.name}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {template.description}
                                            </p>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Additional Options</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="header"
                                    checked={includeHeader}
                                    onCheckedChange={(checked) => setIncludeHeader(!!checked)}
                                />
                                <Label htmlFor="header" className="text-sm cursor-pointer">Include Company Header</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="signature"
                                    checked={includeSignature}
                                    onCheckedChange={(checked) => setIncludeSignature(!!checked)}
                                />
                                <Label htmlFor="signature" className="text-sm cursor-pointer">Include Signature Area</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="compact"
                                    checked={compactMode}
                                    onCheckedChange={(checked) => setCompactMode(!!checked)}
                                />
                                <Label htmlFor="compact" className="text-sm cursor-pointer">Force Compact Mode</Label>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
                        Generate & Print
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
