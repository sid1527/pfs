import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const LOGIN_PATH = "/login"
const SIGNUP_PATH = "/signup"
const AUTH_CALLBACK_PATH = "/auth/callback"

export async function middleware(request: NextRequest) {
  const { user, supabase, response } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Allow auth callback and static assets
  if (pathname.startsWith(AUTH_CALLBACK_PATH) || pathname.startsWith("/_next") || pathname.includes(".")) {
    return response
  }

  // Public auth pages
  if (pathname === LOGIN_PATH || pathname === SIGNUP_PATH) {
    if (user) {
      let { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

      // Create profile if missing (e.g. email signup before trigger, or trigger not run)
      if (!profile) {
        const fullName =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "Player"
        const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
        const playerType = user.user_metadata?.player_type ?? null
        await supabase.from("users").upsert(
          {
            id: user.id,
            full_name: fullName,
            email: user.email ?? "",
            role: "player",
            player_type: playerType,
            profile_photo_url: avatarUrl,
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        profile = { role: "player" }
      }

      const role = profile?.role as string | undefined
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      }
      if (role === "player") {
        return NextResponse.redirect(new URL("/player/dashboard", request.url))
      }
      if (pathname === LOGIN_PATH) {
        return NextResponse.redirect(new URL(SIGNUP_PATH, request.url))
      }
    }
    return response
  }

  const ensureProfile = async () => {
    let { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user!.id)
      .single()

    if (!profile) {
      const fullName =
        user!.user_metadata?.full_name ??
        user!.user_metadata?.name ??
        user!.email?.split("@")[0] ??
        "Player"
      const avatarUrl = user!.user_metadata?.avatar_url ?? user!.user_metadata?.picture ?? null
      const playerType = user!.user_metadata?.player_type ?? null
      await supabase.from("users").upsert(
        {
          id: user!.id,
          full_name: fullName,
          email: user!.email ?? "",
          role: "player",
          player_type: playerType,
          profile_photo_url: avatarUrl,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      profile = { role: "player" }
    }
    return profile
  }

  // Protected: /admin/*
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    }
    const profile = await ensureProfile()
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/player/dashboard", request.url))
    }
    return response
  }

  // Protected: /player/*
  if (pathname.startsWith("/player")) {
    if (!user) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    }
    const profile = await ensureProfile()
    if (profile?.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }
    return response
  }

  // Root: redirect to login (or dashboard if logged in)
  if (pathname === "/") {
    if (user) {
      const profile = await ensureProfile()
      if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      }
      return NextResponse.redirect(new URL("/player/dashboard", request.url))
    }
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
