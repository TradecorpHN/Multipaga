import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiUrl } from '@/src/lib/environment';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = cookies().get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null,
      });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    if (sessionData.loginTime) {
      const sessionAge = Date.now() - sessionData.loginTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (sessionAge > maxAge) {
        cookies().delete('session');
        return NextResponse.json({
          isAuthenticated: false,
          user: null,
        });
      }
    }

    // Optionally re-validate session with Hyperswitch API if needed
    // const HYPERSWITCH_API_URL = getApiUrl();
    // if (HYPERSWITCH_API_URL) {
    //   const validationResponse = await fetch(`${HYPERSWITCH_API_URL}/user/validate-session`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${sessionData.token}`,
    //     },
    //   });
    //   if (!validationResponse.ok) {
    //     cookies().delete('session');
    //     return NextResponse.json({
    //       isAuthenticated: false,
    //       user: null,
    //     });
    //   }
    // }

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        name: sessionData.name,
        merchantId: sessionData.merchantId,
        profileId: sessionData.profileId,
        orgId: sessionData.orgId,
        roleId: sessionData.roleId,
        permissions: sessionData.permissions || [],
        has2FA: sessionData.has2FA || false,
      },
    });

  } catch (error) {
    console.error('Session check error:', error);
    
    cookies().delete('session');
    
    return NextResponse.json({
      isAuthenticated: false,
      user: null,
    });
  }
}


