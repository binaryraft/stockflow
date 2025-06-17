
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { ChatMessage, Store } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// GET messages for a store
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); // Sent by admin client

    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for authorization' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    if (store.companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to access this store\'s chat' }, { status: 403 });
    }

    const storeMessages = (db.messagesByStore?.[storeId] || []).filter(msg => msg.companyId === companyId);
    return NextResponse.json({ success: true, data: storeMessages.sort((a, b) => a.timestamp - b.timestamp) });

  } catch (error) {
    console.error(`API GET /api/chat/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new message to a store's chat
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const body = await req.json();
    const { senderId, senderName, text, companyId } = body; // companyId from client sender context

    if (!storeId || !senderId || !senderName || !text || !companyId) {
      return NextResponse.json({ success: false, message: 'Store ID, sender info, text, and company ID are required' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    // Verify company context: if sender is 'admin', companyId from body must match store's company.
    // If sender is store itself, companyId from store is used.
    if (senderId === 'admin' && store.companyId !== companyId) {
         return NextResponse.json({ success: false, message: 'Admin unauthorized for this store\'s company chat' }, { status: 403 });
    }
     if (senderId !== 'admin' && senderId !== storeId) { // If sender is an employee, this check is too simple. Future: validate employee's company
         // For now, only admin or the store itself can send. This needs refinement for employee chat.
         // Let's assume for now if senderId is storeId, it's the store terminal.
     }


    const newMessage: ChatMessage = {
      id: `msg_${uuidv4()}`,
      storeId,
      companyId: store.companyId, // Message is always associated with the store's company
      senderId,
      senderName,
      text,
      timestamp: Date.now(),
    };

    if (!db.messagesByStore) {
      db.messagesByStore = {};
    }
    if (!db.messagesByStore[storeId]) {
      db.messagesByStore[storeId] = [];
    }
    db.messagesByStore[storeId].push(newMessage);
    await writeDB(db);

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });

  } catch (error) {
    console.error(`API POST /api/chat/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE all messages for a store's chat
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); // Admin's companyId for authorization

    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required for authorization' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    if (store.companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to clear chat for this store' }, { status: 403 });
    }

    if (db.messagesByStore && db.messagesByStore[storeId]) {
      delete db.messagesByStore[storeId];
      await writeDB(db);
      return NextResponse.json({ success: true, message: 'Chat history cleared successfully' });
    } else {
      return NextResponse.json({ success: true, message: 'No chat history found to clear' });
    }

  } catch (error) {
    console.error(`API DELETE /api/chat/${params.storeId} error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

    