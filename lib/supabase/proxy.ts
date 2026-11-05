import { createServerClient, type SetAllCookies } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const pendingCookies: Parameters<SetAllCookies>[0] = []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        pendingCookies.push(...cookiesToSet)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboard = pathname === "/barbeiro" || pathname.endsWith("/barbeiro")

  let response: NextResponse
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("reason", "proxy_no_user")
    response = NextResponse.redirect(url)
  } else {
    // Forward the request headers after Supabase has refreshed the cookies.
    response = NextResponse.next({ request })
  }

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  if (pendingCookies.length > 0) {
    response.headers.set("Cache-Control", "private, no-store")
  }

  return response
}
