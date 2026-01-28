
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useInventoryStore } from './use-inventory-store';
import { v4 as uuidv4 } from 'uuid';

interface P2PContextType {
    peerId: string;
    peers: string[];
    isConnected: boolean;
    syncStatus: 'idle' | 'syncing' | 'connected';
}

const P2PContext = createContext<P2PContextType | undefined>(undefined);

export const P2PProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [peerId, setPeerId] = useState<string>('');
    const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected'>('idle');

    const connections = useRef<Record<string, RTCPeerConnection>>({});
    const dataChannels = useRef<Record<string, RTCDataChannel>>({});
    const isProcessingRemoteUpdate = useRef(false);

    // Initialize Peer ID
    useEffect(() => {
        let id = localStorage.getItem('p2p_peer_id');
        if (!id) {
            id = `peer_${uuidv4().slice(0, 8)}`;
            localStorage.setItem('p2p_peer_id', id);
        }
        setPeerId(id);
    }, []);

    // Signaling Loop
    useEffect(() => {
        if (!peerId) return;

        const register = async () => {
            try {
                await fetch('/api/p2p/signaling', {
                    method: 'POST',
                    body: JSON.stringify({ peerId, action: 'register', name: typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 20) : 'Device' })
                });
            } catch (e) {
                console.error("P2P Register failed", e);
            }
        };

        const pollSignals = async () => {
            try {
                const res = await fetch(`/api/p2p/signaling?action=poll&peerId=${peerId}`);
                const data = await res.json();
                if (data.success && data.signals) {
                    for (const signalEntry of data.signals) {
                        handleSignal(signalEntry.from, signalEntry.signal);
                    }
                }
            } catch (e) {
                // Ignore poll errors
            }
        };

        const listPeers = async () => {
            try {
                const res = await fetch('/api/p2p/signaling?action=list');
                const data = await res.json();
                if (data.success && data.peers) {
                    const otherPeers = Object.keys(data.peers).filter(id => id !== peerId);
                    for (const otherId of otherPeers) {
                        if (!connections.current[otherId]) {
                            initiateConnection(otherId);
                        }
                    }
                }
            } catch (e) {
                // Ignore list errors
            }
        };

        register();
        const signalInterval = setInterval(pollSignals, 2000);
        const listInterval = setInterval(listPeers, 10000);

        return () => {
            clearInterval(signalInterval);
            clearInterval(listInterval);
        };
    }, [peerId]);

    const handleSignal = async (fromPeerId: string, signal: any) => {
        let pc = connections.current[fromPeerId];

        if (!pc) {
            pc = createPeerConnection(fromPeerId);
        }

        if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(fromPeerId, answer);
        } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
        }
    };

    const initiateConnection = async (targetPeerId: string) => {
        const pc = createPeerConnection(targetPeerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(targetPeerId, offer);
    };

    const createPeerConnection = (targetPeerId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(targetPeerId, event.candidate);
            }
        };

        pc.ondatachannel = (event) => {
            setupDataChannel(targetPeerId, event.channel);
        };

        // Create data channel if we are the initiator
        const dc = pc.createDataChannel('sync');
        setupDataChannel(targetPeerId, dc);

        connections.current[targetPeerId] = pc;
        return pc;
    };

    const setupDataChannel = (targetPeerId: string, dc: RTCDataChannel) => {
        dc.onopen = () => {
            console.log(`P2P: Connected to ${targetPeerId}`);
            dataChannels.current[targetPeerId] = dc;
            setConnectedPeers(prev => [...new Set([...prev, targetPeerId])]);
            setIsConnected(true);
            setSyncStatus('connected');

            // On connect, request state to get initial data
            dc.send(JSON.stringify({ type: 'request_sync', senderId: peerId }));
        };

        dc.onclose = () => {
            console.log(`P2P: Disconnected from ${targetPeerId}`);
            delete dataChannels.current[targetPeerId];
            delete connections.current[targetPeerId];
            setConnectedPeers(prev => prev.filter(id => id !== targetPeerId));
            if (Object.keys(dataChannels.current).length === 0) {
                setIsConnected(false);
            }
        };

        dc.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };
    };

    const sendSignal = async (targetPeerId: string, signal: any) => {
        try {
            await fetch('/api/p2p/signaling', {
                method: 'POST',
                body: JSON.stringify({ peerId, targetPeerId, signal, action: 'signal' })
            });
        } catch (e) {
            console.error("Send signal failed", e);
        }
    };

    const handleMessage = (message: any) => {
        if (message.type === 'update_state') {
            console.log("P2P: Received update state from", message.senderId);
            isProcessingRemoteUpdate.current = true;
            useInventoryStore.setState(message.payload);
            setTimeout(() => { isProcessingRemoteUpdate.current = false; }, 100);
            setSyncStatus('connected');
        } else if (message.type === 'request_sync') {
            console.log("P2P: Received sync request from", message.senderId);
            broadcastState();
        }
    };

    const broadcastState = () => {
        const state = useInventoryStore.getState();
        const message = {
            type: 'update_state',
            senderId: peerId,
            payload: {
                products: state.products,
                bills: state.bills,
                categories: state.categories,
                customers: state.customers,
                staffs: state.staffs,
                stores: state.stores,
            }
        };

        const msgString = JSON.stringify(message);
        Object.values(dataChannels.current).forEach(dc => {
            if (dc.readyState === 'open') {
                dc.send(msgString);
            }
        });
    };

    // Broadcast state changes
    useEffect(() => {
        const unsubscribe = useInventoryStore.subscribe((state, prevState) => {
            if (isProcessingRemoteUpdate.current) return;

            // Only broadcast if data actually changed
            if (state.products !== prevState.products ||
                state.bills !== prevState.bills ||
                state.categories !== prevState.categories ||
                state.customers !== prevState.customers) {
                broadcastState();
            }
        });

        return () => unsubscribe();
    }, [peerId]);

    return (
        <P2PContext.Provider value={{ peerId, peers: connectedPeers, isConnected, syncStatus }}>
            {children}
        </P2PContext.Provider>
    );
};

export const useP2P = () => {
    const context = useContext(P2PContext);
    if (context === undefined) {
        throw new Error('useP2P must be used within a P2PProvider');
    }
    return context;
};
