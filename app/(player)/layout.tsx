import { Suspense } from "react"
import { PlayerNav } from "@/components/PlayerNav"
import { PlayerHeader } from "@/components/PlayerHeader"

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)]">
      <Suspense fallback={<div className="h-12 border-b" />}>
        <PlayerHeader />
      </Suspense>
      <main className="container mx-auto max-w-2xl px-4 py-6">{children}</main>
      <PlayerNav />
    </div>
  )
}
