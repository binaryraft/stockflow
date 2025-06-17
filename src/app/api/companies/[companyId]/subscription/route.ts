
// This file is no longer needed as subscription updates are handled by
// PUT /api/companies/[companyId]
// It can be safely deleted.
// To prevent build errors if it's somehow still referenced,
// we'll return a 404 or a "deprecated" message.

import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { companyId: string } }) {
  return NextResponse.json(
    { success: false, message: 'This endpoint is deprecated. Use PUT /api/companies/[companyId] to update subscriptions.' },
    { status: 410 } // Gone
  );
}
    