
import { NextRequest, NextResponse } from 'next/server';

// In-memory signaling store
// Note: In an Electron-hosted Next.js app, this survives as long as the app is open.
const peers: Record<string, { lastSeen: number; name: string }> = {};
const signals: Record<string, any[]> = {};

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const peerId = searchParams.get('peerId');
    const action = searchParams.get('action');

    if (action === 'list') {
        const now = Date.now();
        // Clean up old peers (30s timeout)
        Object.keys(peers).forEach(id => {
            if (now - peers[id].lastSeen > 30000) {
                delete peers[id];
                delete signals[id];
            }
        });
        return NextResponse.json({ success: true, peers });
    }

    if (action === 'poll') {
        if (!peerId) return NextResponse.json({ success: false, message: 'peerId required' }, { status: 400 });

        // Update heartbeat
        if (peers[peerId]) {
            peers[peerId].lastSeen = Date.now();
        }

        const pending = signals[peerId] || [];
        signals[peerId] = []; // Clear after polling
        return NextResponse.json({ success: true, signals: pending });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { peerId, action, targetPeerId, signal, name } = body;

    if (action === 'register') {
        peers[peerId] = { lastSeen: Date.now(), name: name || 'Unknown Device' };
        if (!signals[peerId]) signals[peerId] = [];
        return NextResponse.json({ success: true });
    }

    if (action === 'signal') {
        if (!targetPeerId || !signal) {
            return NextResponse.json({ success: false, message: 'targetPeerId and signal required' }, { status: 400 });
        }
        if (!signals[targetPeerId]) signals[targetPeerId] = [];
        signals[targetPeerId].push({ from: peerId, signal });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
