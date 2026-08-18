
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import type { ChatMessage, Store } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const routeNamePrefix = "[API_CHAT_STORE /api/chat/[storeId]]";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} GET /api/chat/${params.storeId}`;
  try {
    const { db } = await connectToDatabase();
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!storeId || !companyId) {
      return NextResponse.json({ success: false, message: 'Store ID and Company ID are required.' }, { status: 400 });
    }
    
    const store = await db.collection<Store>('stores').findOne({ id: storeId, companyId: companyId });
    if (!store) {
      return NextResponse.json({ success: false, message: 'Unauthorized or store not found.' }, { status: 404 });
    }
    
    const storeMessages = await db.collection<ChatMessage>('messages')
      .find({ storeId: storeId, companyId: companyId })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: storeMessages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} POST /api/chat/${params.storeId}`;
  try {
    const { db } = await connectToDatabase();
    const { storeId } = params;
    const body = await req.json();
    const { senderId, senderName, text, companyId } = body;

    if (!storeId || !senderId || !senderName || !text || !companyId) {
      return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 });
    }
    
    const store = await db.collection<Store>('stores').findOne({ id: storeId, companyId: companyId });
    if (!store) {
      return NextResponse.json({ success: false, message: 'Unauthorized or store not found.' }, { status: 404 });
    }
    
    const newMessage: ChatMessage = {
      id: `msg_${uuidv4()}`,
      storeId,
      companyId: store.companyId,
      senderId,
      senderName: senderName.trim(),
      text: text.trim(),
      timestamp: Date.now(),
    };

    await db.collection<ChatMessage>('messages').insertOne(newMessage);
    
    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
  const routeLogName = `${routeNamePrefix} DELETE /api/chat/${params.storeId}`;
  try {
    const { db } = await connectToDatabase();
    const { storeId } = params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!storeId || !companyId) {
      return NextResponse.json({ success: false, message: 'Store ID and Company ID are required.' }, { status: 400 });
    }
    
    const store = await db.collection<Store>('stores').findOne({ id: storeId, companyId: companyId });
    if (!store) {
      return NextResponse.json({ success: false, message: 'Unauthorized or store not found.' }, { status: 404 });
    }
    
    await db.collection<ChatMessage>('messages').deleteMany({ storeId: storeId, companyId: companyId });
    
    return NextResponse.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
