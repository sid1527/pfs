"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton({ variant = "ghost", size = "sm", className }: { variant?: "default" | "ghost" | "outline"; size?: "default" | "sm"; className?: string }) {
  return (
    <form action="/auth/logout" method="post">
      <Button variant={variant} size={size} className={className} type="submit">
        <LogOut className="mr-2 h-4 w-4" />
        Log Out
      </Button>
    </form>
  )
}
