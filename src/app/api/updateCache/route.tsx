import { NextRequest, NextResponse } from 'next/server';
import { updateCache } from '@/lib/match_data';

export async function POST(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      await updateCache();
      return NextResponse.json({ message: 'Cache updated successfully' });
    } catch (error) {
      console.error('Error updating cache:', error);
      return NextResponse.json({ error: 'Failed to update cache' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}