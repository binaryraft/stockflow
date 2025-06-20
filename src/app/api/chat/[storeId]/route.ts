
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { ChatMessage, Store } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// GET messages for a store
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeName = `[API_CHAT_GET /api/chat/${params.storeId}]`;
  console.log(`${routeName} Received request.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); 

    if (!storeId) {
      console.warn(`${routeName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }
    if (!companyId) {
      console.warn(`${routeName} Company ID is required for authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for authorization' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      console.warn(`${routeName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    if (store.companyId !== companyId) {
      console.warn(`${routeName} Unauthorized access attempt to store's chat. Requesting company: ${companyId}, Store's company: ${store.companyId}.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to access this store\'s chat' }, { status: 403 });
    }

    const storeMessages = (db.messagesByStore?.[storeId] || []).filter(msg => msg.companyId === companyId);
    console.log(`${routeName} Found ${storeMessages.length} messages for store ${storeId}.`);
    return NextResponse.json({ success: true, data: storeMessages.sort((a, b) => a.timestamp - b.timestamp) });

  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new message to a store's chat
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeName = `[API_CHAT_POST /api/chat/${params.storeId}]`;
  console.log(`${routeName} Received request to post a new message.`);
  try {
    const { storeId } = params;
    const body = await req.json();
    const { senderId, senderName, text, companyId } = body;

    if (!storeId || !senderId || !senderName || !text || typeof text !== 'string' || text.trim() === '' || !companyId) {
      console.warn(`${routeName} Missing required fields for sending message.`);
      return NextResponse.json({ success: false, message: 'Store ID, sender info, non-empty text, and company ID are required' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      console.warn(`${routeName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    if (store.companyId !== companyId) {
      console.warn(`${routeName} Message company context (${companyId}) does not match store's company (${store.companyId}).`);
      return NextResponse.json({ success: false, message: 'Message company context does not match store\'s company.' }, { status: 403 });
    }

    const newMessage: ChatMessage = {
      id: `msg_${uuidv4()}`,
      storeId,
      companyId: store.companyId,
      senderId,
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };

    if (!db.messagesByStore) db.messagesByStore = {};
    if (!db.messagesByStore[storeId]) db.messagesByStore[storeId] = [];
    
    db.messagesByStore[storeId].push(newMessage);
    await writeDB(db);

    console.log(`${routeName} New message (ID: ${newMessage.id}) posted successfully to store ${storeId}.`);
    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });

  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE all messages for a store's chat
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeName = `[API_CHAT_DELETE /api/chat/${params.storeId}]`;
  console.log(`${routeName} Received request to clear chat.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); 

    if (!storeId) {
      console.warn(`${routeName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });
    }
    if (!companyId) {
      console.warn(`${routeName} Company ID is required for authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for authorization' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      console.warn(`${routeName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }
    if (store.companyId !== companyId) {
      console.warn(`${routeName} Unauthorized attempt to clear chat. Requesting company: ${companyId}, Store's company: ${store.companyId}.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to clear chat for this store' }, { status: 403 });
    }

    if (db.messagesByStore && db.messagesByStore[storeId]) {
      // It's safer to assume all messages in store's chat belong to its company.
      // If strict filtering is needed, it's already done on GET. For DELETE, removing the key is fine.
      delete db.messagesByStore[storeId];
      await writeDB(db);
      console.log(`${routeName} Chat history cleared successfully for store ${storeId}.`);
      return NextResponse.json({ success: true, message: 'Chat history cleared successfully' });
    } else {
      console.log(`${routeName} No chat history found to clear for store ${storeId}.`);
      return NextResponse.json({ success: true, message: 'No chat history found to clear' });
    }

  } catch (error) {
    console.error(`${routeName} Error:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
