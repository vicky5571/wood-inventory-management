import { NextResponse } from 'next/server';
import { SEED_WOOD_RECORDS } from '@/src/persistence/seed-data';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: SEED_WOOD_RECORDS,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: 'Record received',
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid payload' },
      { status: 400 }
    );
  }
}
