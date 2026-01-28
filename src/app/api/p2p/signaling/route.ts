
import { NextRequest, NextResponse } from 'next/server';

// In-memory signaling store
// Note: In an Electron-hosted Next.js app, this survives as long as the app is open.
const peers: Record<string, { lastSeen: number; name: string; passcode: string }> = {};
const signals: Record<string, any[]> = {}; // targetPeerId -> list of signals

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const peerId = searchParams.get('peerId');
    const action = searchParams.get('action');
    const passcode = searchParams.get('passcode') || 'default';

    if (action === 'list') {
        const now = Date.now();
        // Clean up old peers (15s timeout for faster discovery response)
        Object.keys(peers).forEach(id => {
            if (now - peers[id].lastSeen > 15000) {
                delete peers[id];
                delete signals[id];
            }
        });

        // Filter peers by the same passcode
        const matchingPeers = Object.fromEntries(
            Object.entries(peers).filter(([id, data]) => data.passcode === passcode)
        );

        return NextResponse.json({ success: true, peers: matchingPeers });
    }

    if (action === 'poll') {
        if (!peerId) return NextResponse.json({ success: false, message: 'peerId required' }, { status: 400 });

        // Update heartbeat
        if (peers[peerId]) {
            peers[peerId].lastSeen = Date.now();
        }

        const pending = signals[peerId] || [];
        delete signals[peerId]; // Clear after polling
        return NextResponse.json({ success: true, signals: pending });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { peerId, action, targetPeerId, signal, name, passcode } = body;
    const effectivePasscode = passcode || 'default';

    if (action === 'register') {
        peers[peerId] = {
            lastSeen: Date.now(),
            name: name || 'Unknown Device',
            passcode: effectivePasscode
        };
        return NextResponse.json({ success: true });
    }

    if (action === 'signal') {
        if (!targetPeerId || !signal) {
            return NextResponse.json({ success: false, message: 'targetPeerId and signal required' }, { status: 400 });
        }

        // Ensure signaling only between peers with same passcode (security layer)
        const sender = peers[peerId];
        const receiver = peers[targetPeerId];

        if (!sender || !receiver || sender.passcode !== receiver.passcode) {
            return NextResponse.json({ success: false, message: 'Passcode mismatch or peer not found' }, { status: 403 });
        }

        if (!signals[targetPeerId]) signals[targetPeerId] = [];
        (signals[targetPeerId] as any).push({ from: peerId, signal });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
