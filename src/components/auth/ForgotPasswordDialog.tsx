"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, KeyRound } from 'lucide-react';

interface ForgotPasswordDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ isOpen, onOpenChange }: ForgotPasswordDialogProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address." });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, action: 'send_otp' }),
            });
            const data = await response.json();

            if (data.success) {
                toast({ title: "OTP Sent", description: `An OTP has been sent to ${email}.` });
                setStep('otp');
            } else {
                toast({ variant: "destructive", title: "Error", description: data.message || "Failed to send OTP." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Network error occurred." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword) {
            toast({ variant: "destructive", title: "Incomplete", description: "Please enter OTP and new password." });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword, action: 'reset_password' }),
            });
            const data = await response.json();

            if (data.success) {
                toast({ title: "Password Reset", description: "Your password has been reset successfully. Please login." });
                onOpenChange(false);
                setStep('email');
                setEmail('');
                setOtp('');
                setNewPassword('');
            } else {
                toast({ variant: "destructive", title: "Reset Failed", description: data.message || "Invalid OTP or error." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Network error occurred." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{step === 'email' ? 'Forgot Password' : 'Reset Password'}</DialogTitle>
                    <DialogDescription>
                        {step === 'email'
                            ? "Enter your email address to receive a One-Time Password (OTP)."
                            : "Enter the OTP sent to your email and your new password."}
                    </DialogDescription>
                </DialogHeader>

                {step === 'email' ? (
                    <form onSubmit={handleSendOtp} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="forgot-email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Send OTP
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp-input">OTP Code</Label>
                            <Input
                                id="otp-input"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="Enter new password"
                                    className="pl-9"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button type="button" variant="outline" onClick={() => setStep('email')} disabled={isLoading}>
                                Back
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Reset Password
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
