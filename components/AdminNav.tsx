"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CalendarPlus, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoutButton } from "@/components/LogoutButton"

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/matches/new", label: "New Match", icon: CalendarPlus },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-4">
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
        <LogoutButton />
      </div>
    </header>
  )
}
