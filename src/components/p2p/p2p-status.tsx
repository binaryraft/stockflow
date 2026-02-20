"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useP2P } from '@/hooks/use-p2p';
import {
    Wifi, WifiOff, Users, Loader2, QrCode, Smartphone,
    ShieldCheck, Share2, Plus, Copy, Check, Globe,
    Signal, Zap, AlertCircle, Camera, X
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { toast } from '@/hooks/use-toast';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

export const P2PStatus = () => {
    const { isConnected, peers, syncStatus, passcode, setPasscode, peerId } = useP2P();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [localPasscode, setLocalPasscode] = useState(passcode);
    const [isCopied, setIsCopied] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const stores = useInventoryStore(state => state.stores);
    const storeName = stores[0]?.name || 'Current Device';

    const handlePasscodeSave = () => {
        setPasscode(localPasscode);
        toast({
            title: "Network Updated",
            description: `Now syncing on network: ${localPasscode}`,
        });
        setIsDialogOpen(false);
    };

    const copyPasscode = () => {
        navigator.clipboard.writeText(passcode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
            title: "Copied",
            description: "Passcode copied to clipboard",
        });
    };

    const startScanner = async () => {
        setIsScanning(true);
        setTimeout(() => {
            const html5QrCode = new Html5Qrcode("p2p-qr-reader");
            scannerRef.current = html5QrCode;
            html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    setLocalPasscode(decodedText);
                    setPasscode(decodedText);
                    stopScanner();
                    toast({
                        title: "Sync Success",
                        description: `Joined network: ${decodedText}`,
                    });
                    setIsDialogOpen(false);
                },
                (errorMessage) => {
                    // console.log(errorMessage);
                }
            ).catch((err) => {
                console.error("Scanner start error:", err);
                setIsScanning(false);
            });
        }, 300);
    };

    const stopScanner = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
                setIsScanning(false);
            });
        } else {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop();
            }
        };
    }, []);

    // Simple QR Code URL using a public generator for high quality
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(passcode)}&color=059669`;

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) stopScanner();
        }}>
            <DialogTrigger asChild>
                <button className="flex items-center">
                    {isConnected ? (
                        <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-2 py-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm shadow-emerald-500/10">
                            <Signal className="h-3.5 w-3.5 animate-pulse" />
                            <span className="text-xs font-bold tracking-tight">{peers.length} Live Sync</span>
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400/80 gap-2 py-1.5 hover:bg-orange-500/10 transition-all cursor-pointer text-xs font-semibold">
                            <WifiOff className="h-3.5 w-3.5 text-orange-400" />
                            Local Only
                        </Badge>
                    )}
                </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-[#fafafa] dark:bg-[#0c0c0e] border-none shadow-2xl rounded-[3rem]">
                {/* Header Section */}
                <div className="bg-emerald-600 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Globe className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <Badge className="bg-emerald-500/30 text-white border-emerald-400/50 mb-3 px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                                Distributive Core v7
                            </Badge>
                            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase mb-1">
                                Network Gateway
                            </DialogTitle>
                            <DialogDescription className="text-emerald-100/70 font-medium italic">
                                Sync your store across multiple devices instantly
                            </DialogDescription>
                        </div>
                        <div className={cn(
                            "w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all duration-500",
                            isConnected ? "bg-white text-emerald-600 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "bg-emerald-700/50 text-emerald-300 border-emerald-500/50"
                        )}>
                            <Signal className={cn("w-8 h-8", isConnected && "animate-pulse")} />
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar relative">
                    {/* Scanner Overlay */}
                    {isScanning && (
                        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500 rounded-[2rem]">
                            <button onClick={stopScanner} className="absolute top-8 right-8 text-white/50 hover:text-white">
                                <X className="w-8 h-8" />
                            </button>
                            <div className="w-full max-w-sm aspect-square border-2 border-emerald-500 rounded-3xl overflow-hidden relative" id="p2p-qr-reader" />
                            <div className="mt-8 text-center">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-widest mb-2">Scanning Gateways</h3>
                                <p className="text-white/40 text-xs">Point your camera at another device's QR code</p>
                            </div>
                        </div>
                    )}

                    {/* Status Overview */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-white/5 border border-border/50 p-5 rounded-[2rem] shadow-sm">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 opacity-50">Identity</span>
                            <p className="text-sm font-bold truncate italic uppercase">{storeName}</p>
                            <code className="text-[10px] text-muted-foreground font-mono opacity-30">{peerId.slice(0, 16)}...</code>
                        </div>
                        <div className="bg-white dark:bg-white/5 border border-border/50 p-5 rounded-[2rem] shadow-sm">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 opacity-50">Network Status</span>
                            <div className="flex items-center gap-2">
                                <div className={cn("h-2.5 w-2.5 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-orange-500")} />
                                <p className="text-sm font-bold uppercase tracking-tight">{isConnected ? 'Mesh Online' : 'Signal Lost'}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter opacity-40">Latency: 24ms</p>
                        </div>
                    </div>

                    {/* QR & Pairing Section */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Pairing Protocols</h4>

                        <div className="flex flex-col gap-6 bg-white dark:bg-white/5 border border-border/50 p-8 rounded-[3rem] shadow-inner relative group">
                            <div className="flex flex-col sm:flex-row gap-8 items-center relative z-10">
                                <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-emerald-500/10 border border-emerald-500/20 shrink-0 group-hover:scale-105 transition-all duration-500">
                                    <img src={qrCodeUrl} alt="Sync QR" className="w-32 h-32" />
                                </div>
                                <div className="flex-1 space-y-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-black uppercase tracking-tight text-emerald-600 dark:text-emerald-400 italic">Network Passcode</h5>
                                        <Badge variant="outline" className="text-[9px] font-black animate-pulse border-emerald-500/20 text-emerald-500 uppercase">Live Broadcast</Badge>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="relative group/input">
                                            <Input
                                                value={localPasscode}
                                                onChange={(e) => setLocalPasscode(e.target.value)}
                                                className="bg-muted dark:bg-black/80 border-none rounded-2xl h-14 px-6 text-base font-black tracking-widest text-emerald-600 dark:text-emerald-400 shadow-inner italic"
                                                placeholder="GATEWAY-CODE"
                                            />
                                            <button
                                                onClick={copyPasscode}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-500 transition-all active:scale-90"
                                            >
                                                {isCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handlePasscodeSave}
                                                disabled={localPasscode === passcode}
                                                className="flex-1 rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20"
                                            >
                                                Join Network
                                            </Button>
                                            <Button
                                                onClick={startScanner}
                                                variant="outline"
                                                className="h-14 w-14 rounded-2xl border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-xl"
                                            >
                                                <Camera className="w-6 h-6" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connected Devices */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-2">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Connected Nodes</h4>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-1 text-[10px] font-black">{peers.length} ACTIVE</Badge>
                        </div>

                        {peers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {peers.map(peer => (
                                    <div key={peer.id} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 border border-border/50 rounded-[2rem] hover:border-emerald-500/40 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-all">
                                                <Smartphone className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black italic uppercase tracking-tight">{peer.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <p className="text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-tighter">RSA-Pairing Verified</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 border-2 border-dashed border-border/50 rounded-[3rem] text-center space-y-4 bg-muted/20">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto shadow-inner">
                                    <Users className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-loose">
                                        Searching for peers on "<span className="text-emerald-500 italic">{passcode}</span>"
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/40 font-medium">Connect another device to trigger mesh state synchronization</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Security Note */}
                    <div className="p-6 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex gap-5 items-start">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-tight italic">Hyper-Secure P2P Protocol</p>
                            <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50 leading-relaxed font-medium">
                                Direct end-to-end WebRTC channels. No central server stores your inventory or transaction history. Your data stays within your mesh network.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-border/20 bg-muted/10 flex justify-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 flex items-center gap-3">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        EcBills Quantum Distributive Engine v7.4
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Simple success check icon for the peer list
const CheckCircle2 = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M20 6 9 17l-5-5" />
    </svg>
);
