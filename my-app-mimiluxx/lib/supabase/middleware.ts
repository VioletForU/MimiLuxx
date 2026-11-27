import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthPage, isPublicPath } from '@/lib/auth/routes'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() asks Supabase to verify the session (it does not just trust the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl
  const isPublic = isPublicPath(pathname)

  // Redirects must carry over any refreshed session cookies.
  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  // 1. Not logged in + protected URL (pasted link, bookmark, expired session) -> block.
  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('next', pathname + search) // return here after signing in
    return redirectTo(loginUrl)
  }

  // 2. Already logged in -> no need to see the login / signup forms again.
  if (user && isAuthPage(pathname)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
    return redirectTo(dashboardUrl)
  }

  // 3. Keep private pages out of browser/proxy caches, so the Back button or a
  //    shared computer can't show them again after logout.
  if (!isPublic) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store')
  }

  return supabaseResponse
}
