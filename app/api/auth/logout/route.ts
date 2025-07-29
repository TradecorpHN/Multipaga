import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().delete('hyperswitch_session');
  cookies().delete('hyperswitch_env');
  return NextResponse.json({ success: true });
}