
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
    const { isConnected, peers, syncStatus, passcode, setPasscode } = useP2P();
    const [localPasscode, setLocalPasscode] = React.useState(passcode);

    const handlePasscodeSave = () => {
        setPasscode(localPasscode);
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                        {isConnected ? (
                            <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 gap-1.5 py-1">
                                <Wifi className="h-3.5 w-3.5 animate-pulse" />
                                <span className="text-xs font-semibold">{peers.length} Peers</span>
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="border-muted-foreground/30 bg-muted/30 text-muted-foreground gap-1.5 py-1">
                                <WifiOff className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Local Only</span>
                            </Badge>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="p-4 w-72 space-y-4 shadow-xl border-primary/20">
                    <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm font-semibold">P2P Network Status</span>
                        <Badge variant={isConnected ? "default" : "secondary"} className="h-5 text-[10px]">
                            {isConnected ? 'Sync Active' : 'Offline'}
                        </Badge>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Network Passcode</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={localPasscode}
                                onChange={(e) => setLocalPasscode(e.target.value)}
                                className="flex-1 bg-muted border border-border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary outline-none"
                                placeholder="Enter passcode..."
                            />
                            <button
                                onClick={handlePasscodeSave}
                                disabled={localPasscode === passcode}
                                className="bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded font-medium disabled:opacity-50 transition-opacity"
                            >
                                Set
                            </button>
                        </div>
                        <p className="text-[9px] text-muted-foreground">Devices must share the same passcode to sync.</p>
                    </div>

                    {isConnected && (
                        <div className="space-y-2 pt-2 border-t">
                            <p className="text-xs font-medium">Connected Devices:</p>
                            <ul className="space-y-1">
                                {peers.map(peer => (
                                    <li key={peer.id} className="text-xs flex items-center gap-2 bg-muted/50 p-1.5 rounded border border-border/50">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        <span className="font-medium truncate">{peer.name}</span>
                                        <Badge variant="outline" className="ml-auto h-4 text-[9px] px-1 border-green-500/30 text-green-600">Live</Badge>
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {syncStatus === 'syncing' ? (
                                    <>
                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                        Syncing data...
                                    </>
                                ) : (
                                    <>
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        All data synchronized
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {!isConnected && (
                        <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                No other devices found on this passcode. Connect another device on the same WiFi with the same passcode to sync.
                            </p>
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
