"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchCard } from "@/components/MatchCard"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarX } from "lucide-react"
import { toast } from "sonner"
import type { Match } from "@/components/MatchCard"

const PROMOTED_KEY = "pfs_promoted_matches"

export default function PlayerDashboardPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchMatches = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, title, match_type, opponent_name, match_date, venue, max_capacity, status")
      .eq("status", "Upcoming")
      .order("match_date", { ascending: true })

    if (!matchesData?.length) {
      setMatches([])
      setLoading(false)
      return
    }

    const { data: rsvpsData } = await supabase
      .from("rsvps")
      .select("match_id, status")
      .eq("user_id", user.id)
      .in("match_id", matchesData.map((m) => m.id))

    const rsvpMap = new Map(rsvpsData?.map((r) => [r.match_id, r]) ?? [])

    const { data: countsData } = await supabase
      .from("rsvps")
      .select("match_id")
      .eq("status", "CONFIRMED")

    const countMap = new Map<string, number>()
    countsData?.forEach((r) => {
      countMap.set(r.match_id, (countMap.get(r.match_id) ?? 0) + 1)
    })

    const enriched: Match[] = matchesData.map((m) => ({
      ...m,
      confirmed_count: countMap.get(m.id) ?? 0,
      user_rsvp: rsvpMap.get(m.id) ?? null,
    }))

    setMatches(enriched)

    // Check for auto-promotion toast
    try {
      const promoted = JSON.parse(sessionStorage.getItem(PROMOTED_KEY) ?? "{}") as Record<string, boolean>
      enriched.forEach((m) => {
        const rsvp = rsvpMap.get(m.id)
        if (rsvp?.status === "CONFIRMED" && !promoted[m.id]) {
          const wasWaitlisted = sessionStorage.getItem(`pfs_was_waitlisted_${m.id}`) === "1"
          if (wasWaitlisted) {
            toast.success(`You've been promoted to the playing squad for ${m.title}!`)
            promoted[m.id] = true
            sessionStorage.removeItem(`pfs_was_waitlisted_${m.id}`)
          }
        }
        if (rsvp?.status === "WAITLISTED") {
          sessionStorage.setItem(`pfs_was_waitlisted_${m.id}`, "1")
        }
      })
      sessionStorage.setItem(PROMOTED_KEY, JSON.stringify(promoted))
    } catch {
      // ignore
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Upcoming Matches</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Upcoming Matches</h1>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <CalendarX className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No upcoming matches scheduled!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back later or ask your captain to add matches.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              userId={userId!}
              onRsvpChange={fetchMatches}
            />
          ))}
        </div>
      )}
    </div>
  )
}
