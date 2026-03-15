"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/player/dashboard", label: "Home", icon: Home },
  { href: "/player/profile", label: "Profile", icon: User },
  { href: "/player/dues", label: "Dues", icon: Wallet },
]

export function PlayerNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14 min-h-[44px] items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-6 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
