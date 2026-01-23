
"use client";

import React, { useState, useEffect } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Building, Save, Phone, MapPin, Receipt, Mail } from 'lucide-react';

export default function LocalProfilePage() {
    const { userProfile, updateUserProfileFields } = useInventoryStore();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        companyName: '',
        companyPhone: '',
        companyAddress: '',
        companyGstNo: '',
        companyEmail: '',
        companySlogan: '',
    });

    useEffect(() => {
        if (userProfile) {
            setFormData({
                companyName: userProfile.companyName || '',
                companyPhone: userProfile.companyPhone || '',
                companyAddress: userProfile.companyAddress || '',
                companyGstNo: userProfile.companyGstNo || '',
                companyEmail: userProfile.companyEmail || '',
                companySlogan: userProfile.companySlogan || '',
            });
        }
    }, [userProfile]);

    const handleSave = async () => {
        try {
            await updateUserProfileFields(formData as any, 'local');
            toast({ title: "Profile Updated", description: "Your local company profile has been saved." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageTitle title="Company Profile" icon={Building} />

            <Card className="shadow-md border-t-2 border-t-primary">
                <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Update your company details for bills and reports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                value={formData.companyName}
                                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                placeholder="My Business Name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="companySlogan">Slogan / Tagline</Label>
                            <Input
                                id="companySlogan"
                                value={formData.companySlogan}
                                onChange={e => setFormData(prev => ({ ...prev, companySlogan: e.target.value }))}
                                placeholder="Excellence in Service"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="companyPhone">Phone Number</Label>
                            <div className="relative">
                                <Input
                                    id="companyPhone"
                                    value={formData.companyPhone}
                                    onChange={e => setFormData(prev => ({ ...prev, companyPhone: e.target.value }))}
                                    className="pl-9"
                                    placeholder="+91 9876543210"
                                />
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="companyEmail">Business Email</Label>
                            <div className="relative">
                                <Input
                                    id="companyEmail"
                                    value={formData.companyEmail}
                                    onChange={e => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                                    className="pl-9"
                                    placeholder="contact@business.com"
                                />
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="companyGstNo">GSTIN / Tax ID</Label>
                        <div className="relative">
                            <Input
                                id="companyGstNo"
                                value={formData.companyGstNo}
                                onChange={e => setFormData(prev => ({ ...prev, companyGstNo: e.target.value }))}
                                className="pl-9"
                                placeholder="22AAAAA0000A1Z5"
                            />
                            <Receipt className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="companyAddress">Business Address</Label>
                        <div className="relative">
                            <Textarea
                                id="companyAddress"
                                value={formData.companyAddress}
                                onChange={e => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                                className="pl-9"
                                placeholder="123, Business Park, Tech City"
                                rows={3}
                            />
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/50 py-4">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" /> Save Profile
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
