import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true })
  }

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Player"
  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
  const playerType = user.user_metadata?.player_type ?? null

  const { error } = await supabase.from("users").upsert(
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
