import { NextRequest, NextResponse } from 'next/server';
import { fetchTeams } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const { teams } = await fetchTeams();
  const team = teams.find(t => t.id.toString() === id);
  
  if (!team || !team.logoUrl) {
    return new NextResponse('Logo not found', { status: 404 });
  }

  // Remove the "data:image/png;base64," prefix if it exists
  const base64Data = team.logoUrl.includes('base64,') ? team.logoUrl.split(',')[1] : team.logoUrl;
  const buffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
