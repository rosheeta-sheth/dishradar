import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes that require login
  const protectedRoutes = ['/explore', '/profile', '/saved', '/recipes', '/restaurant'];
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r));

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in user hasn't completed quiz, redirect to onboarding
  // (except when already on onboarding, auth pages, or api routes)
  const skipOnboardingCheck = ['/onboarding', '/login', '/callback', '/api'].some(r =>
    pathname.startsWith(r)
  );

  if (user && isProtected && !skipOnboardingCheck) {
    // Check quiz_completed on the profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('quiz_completed')
      .eq('id', user.id)
      .single();

    // If there is a database error (e.g. stale cache missing quiz_completed), let them through
    if (error) {
      console.warn('Bypassing quiz check due to database error:', JSON.stringify(error));
    } else if (!profile?.quiz_completed) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = '/onboarding';
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
