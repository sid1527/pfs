"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function PlayerHeader() {
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, nickname")
        .eq("id", user.id)
        .single()
      const name = profile?.nickname || profile?.full_name || user.email?.split("@")[0] || "User"
      setUserName(name)
    }
    fetchUser()
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-center px-4">
        <span className="text-sm font-medium text-muted-foreground">
          Prime Force Spartans{userName ? ` | ${userName}` : ""}
        </span>
      </div>
    </header>
  )
}
