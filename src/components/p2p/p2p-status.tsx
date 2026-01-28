
"use client";

import React from 'react';
import { useP2P } from '@/hooks/use-p2p';
import { Wifi, WifiOff, Users, Loader2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const P2PStatus = () => {
    const { isConnected, peers, syncStatus } = useP2P();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                        {isConnected ? (
                            <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 gap-1.5 px-2 py-0.5 h-7">
                                <Wifi className="h-3.5 w-3.5 animate-pulse" />
                                <span className="text-[11px] font-semibold">{peers.length} Peer{peers.length !== 1 ? 's' : ''}</span>
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="border-muted-foreground/30 bg-muted/10 text-muted-foreground gap-1.5 px-2 py-0.5 h-7 opacity-70">
                                <WifiOff className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-semibold">Local Only</span>
                            </Badge>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs p-3 max-w-[200px] flex flex-col gap-2">
                    <div className="font-bold flex items-center gap-2">
                        {isConnected ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3" />}
                        {isConnected ? 'P2P Network Active' : 'P2P Offline'}
                    </div>
                    <p className="text-muted-foreground">
                        {isConnected
                            ? `Connected to ${peers.length} other device(s) on your WiFi. Billing data will sync automatically.`
                            : "No other StockFlow devices found on this network. Open StockFlow on another device to start P2P sync."}
                    </p>
                    {syncStatus === 'syncing' && (
                        <div className="flex items-center gap-2 text-primary">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Syncing data...
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
