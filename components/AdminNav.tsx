"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CalendarPlus, BarChart3, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoutButton } from "@/components/LogoutButton"
import { createClient } from "@/lib/supabase/client"

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/matches/new", label: "New Match", icon: CalendarPlus },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]

export function AdminNav() {
  const pathname = usePathname()
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground truncate max-w-[180px]">
            Prime Force Spartans{userName ? ` | ${userName}` : ""}
          </span>
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
