import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCorrelationId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    // Get session from cookie
    const sessionCookie = cookies().get('hyperswitch_session');
    
    if (sessionCookie) {
      const sessionData = JSON.parse(sessionCookie.value);
      
      // Call Hyperswitch logout API if we have a token
      if (sessionData.token) {
        try {
          await fetch(`${process.env.HYPERSWITCH_BASE_URL}/user/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.token}`,
              'X-Correlation-ID': correlationId,
            },
          });
        } catch (error) {
          // Log error but continue with client-side logout
          console.error('Error calling Hyperswitch logout API:', error);
        }
      }
    }

    // Clear all auth-related cookies
    cookies().delete('hyperswitch_session');
    cookies().delete('hyperswitch_temp_session');

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, clear the cookies
    cookies().delete('hyperswitch_session');
    cookies().delete('hyperswitch_temp_session');
    
    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  }
}

