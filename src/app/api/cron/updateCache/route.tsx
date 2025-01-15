import { NextRequest, NextResponse } from 'next/server';
import { updateCache } from '@/lib/match_data';

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await updateCache();
    return NextResponse.json({ message: 'Cache updated and games processed successfully' });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ error: 'Failed to process updates' }, { status: 500 });
  }
}