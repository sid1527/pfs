import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    const user = data.user
    if (user) {
      // Upsert user profile: map Google display name and avatar, or use signup metadata
      const fullName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.user_name ??
        ""
      const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
      const playerType = user.user_metadata?.player_type ?? null

      await supabase.from("users").upsert(
        {
          id: user.id,
          full_name: fullName || user.email?.split("@")[0] || "Player",
          email: user.email ?? "",
          role: "player",
          player_type: playerType,
          profile_photo_url: avatarUrl,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

      // Fetch role for redirect
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

      const redirectUrl =
        profile?.role === "admin" ? `${origin}/admin/dashboard` : `${origin}/player/dashboard`
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
