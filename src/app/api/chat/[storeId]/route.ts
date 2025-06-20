
import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-access';
import type { ChatMessage, Store } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_CHAT_STORE /api/chat/[storeId]]";

// GET messages for a store
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/chat/${params.storeId}`;
  console.log(`${routeLogName} Received request.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); 

    if (!storeId) {
      console.warn(`${routeLogName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required.' }, { status: 400 });
    }
    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for authorization.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for authorization.' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      console.warn(`${routeLogName} Store not found (ID: ${storeId}).`);
      return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });
    }
    // Authorization check: ensure the store belongs to the requesting company
    if (store.companyId !== companyId) {
      console.warn(`${routeLogName} Unauthorized access attempt to store's chat. Requesting company: ${companyId}, Store's company: ${store.companyId}.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to access this store\'s chat.' }, { status: 403 });
    }

    const storeMessages = (db.messagesByStore?.[storeId] || [])
      .filter(msg => msg.companyId === companyId) // Ensure messages also belong to the same company
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by oldest first

    console.log(`${routeLogName} Found ${storeMessages.length} messages for store ${storeId} (Company: ${companyId}).`);
    return NextResponse.json({ success: true, data: storeMessages });

  } catch (error) {
    console.error(`${routeLogName} Error fetching messages:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST a new message to a store's chat
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} POST /api/chat/${params.storeId}`;
  console.log(`${routeLogName} Received request to post a new message.`);
  try {
    const { storeId } = params;
    const body = await req.json();
    const { senderId, senderName, text, companyId } = body;

    if (!storeId || !senderId || !senderName || !text || typeof text !== 'string' || text.trim() === '' || !companyId) {
      console.warn(`${routeLogName} Missing required fields for sending message: storeId, senderId, senderName, non-empty text, companyId.`);
      return NextResponse.json({ success: false, message: 'Store ID, sender information, non-empty text, and company ID are required.' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      console.warn(`${routeLogName} Store not found (ID: ${storeId}). Cannot post message.`);
      return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });
    }
    // Authorization check: ensure the message's company context matches the store's company
    if (store.companyId !== companyId) {
      console.warn(`${routeLogName} Message company context (${companyId}) does not match store's company (${store.companyId}). Message rejected.`);
      return NextResponse.json({ success: false, message: 'Message company context does not match store\'s company.' }, { status: 403 });
    }

    const newMessage: ChatMessage = {
      id: `msg_${uuidv4()}`,
      storeId,
      companyId: store.companyId, // Use companyId from the verified store
      senderId,
      senderName: senderName.trim(),
      text: text.trim(),
      timestamp: Date.now(),
    };

    if (!db.messagesByStore) db.messagesByStore = {};
    if (!db.messagesByStore[storeId]) db.messagesByStore[storeId] = [];
    
    db.messagesByStore[storeId].push(newMessage);
    await writeDB(db);

    console.log(`${routeLogName} New message (ID: ${newMessage.id}) posted successfully to store ${storeId} by ${senderName}.`);
    return NextResponse.json({ success: true, data: newMessage }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error(`${routeLogName} Error posting message:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE all messages for a store's chat (admin action)
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/chat/${params.storeId}`;
  console.log(`${routeLogName} Received request to clear chat.`);
  try {
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId'); // Admin must provide companyId for authorization

    if (!storeId) {
      console.warn(`${routeLogName} Store ID is required.`);
      return NextResponse.json({ success: false, message: 'Store ID is required.' }, { status: 400 });
    }
    if (!companyId) {
      console.warn(`${routeLogName} Company ID is required for authorization to clear chat.`);
      return NextResponse.json({ success: false, message: 'Company ID is required for authorization.' }, { status: 400 });
    }

    const db = await readDB();
    const store = db.stores.find(s => s.id === storeId);

    if (!store) {
      console.warn(`${routeLogName} Store not found (ID: ${storeId}). Cannot clear chat.`);
      return NextResponse.json({ success: false, message: 'Store not found.' }, { status: 404 });
    }
    // Authorization check: ensure the store belongs to the company requesting chat clearance
    if (store.companyId !== companyId) {
      console.warn(`${routeLogName} Unauthorized attempt to clear chat. Requesting company: ${companyId}, Store's company: ${store.companyId}.`);
      return NextResponse.json({ success: false, message: 'Unauthorized to clear chat for this store.' }, { status: 403 });
    }

    if (db.messagesByStore && db.messagesByStore[storeId]) {
      // For DELETE, we simply remove the entry for the store, effectively clearing all its messages.
      // The messages were already filtered by companyId on creation and retrieval.
      delete db.messagesByStore[storeId];
      await writeDB(db);
      console.log(`${routeLogName} Chat history cleared successfully for store ${storeId} (Company: ${companyId}).`);
      return NextResponse.json({ success: true, message: 'Chat history cleared successfully.' });
    } else {
      console.log(`${routeLogName} No chat history found to clear for store ${storeId}.`);
      return NextResponse.json({ success: true, message: 'No chat history found to clear.' }); // Still a success, just nothing to do.
    }

  } catch (error) {
    console.error(`${routeLogName} Error clearing chat:`, error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
