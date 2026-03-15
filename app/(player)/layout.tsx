import { PlayerNav } from "@/components/PlayerNav"

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto max-w-2xl px-4 py-6">{children}</main>
      <PlayerNav />
    </div>
  )
}
