"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { MatchCard } from "@/components/MatchCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarX, CheckCircle2, XCircle, Wallet } from "lucide-react"
import { toast } from "sonner"
import type { Match } from "@/components/MatchCard"

const PROMOTED_KEY = "pfs_promoted_matches"

type PastMatch = Match & {
  attended?: boolean
  amount_owed?: number
  is_paid?: boolean
}

export default function PlayerDashboardPage() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [pastMatches, setPastMatches] = useState<PastMatch[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchMatches = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    // Upcoming matches
    const { data: upcomingData } = await supabase
      .from("matches")
      .select("id, title, match_type, opponent_name, match_date, venue, max_capacity, status")
      .eq("status", "Upcoming")
      .order("match_date", { ascending: true })

    if (upcomingData?.length) {
      const { data: rsvpsData } = await supabase
        .from("rsvps")
        .select("match_id, status")
        .eq("user_id", user.id)
        .in("match_id", upcomingData.map((m) => m.id))

      const rsvpMap = new Map(rsvpsData?.map((r) => [r.match_id, r]) ?? [])

      const { data: countsData } = await supabase
        .from("rsvps")
        .select("match_id")
        .eq("status", "CONFIRMED")

      const countMap = new Map<string, number>()
      countsData?.forEach((r) => {
        countMap.set(r.match_id, (countMap.get(r.match_id) ?? 0) + 1)
      })

      const enriched: Match[] = upcomingData.map((m) => ({
        ...m,
        confirmed_count: countMap.get(m.id) ?? 0,
        user_rsvp: rsvpMap.get(m.id) ?? null,
      }))

      setUpcomingMatches(enriched)

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
    } else {
      setUpcomingMatches([])
    }

    // Past matches
    const { data: pastData } = await supabase
      .from("matches")
      .select("id, title, match_type, opponent_name, match_date, venue, max_capacity, status")
      .eq("status", "Completed")
      .order("match_date", { ascending: false })

    if (pastData?.length) {
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("match_id, attended")
        .eq("user_id", user.id)
        .in("match_id", pastData.map((m) => m.id))

      const { data: duesData } = await supabase
        .from("user_dues")
        .select("match_id, amount_owed, is_paid")
        .eq("user_id", user.id)
        .in("match_id", pastData.map((m) => m.id))

      const attendanceMap = new Map(attendanceData?.map((a) => [a.match_id, a.attended]) ?? [])
      const duesMap = new Map(duesData?.map((d) => [d.match_id, d]) ?? [])

      const enrichedPast: PastMatch[] = pastData.map((m) => {
        const due = duesMap.get(m.id)
        return {
          ...m,
          confirmed_count: 0,
          user_rsvp: null,
          attended: attendanceMap.get(m.id),
          amount_owed: due?.amount_owed ?? 0,
          is_paid: due?.is_paid ?? false,
        }
      })

      setPastMatches(enrichedPast)
    } else {
      setPastMatches([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Matches</h1>
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
      <h1 className="text-xl font-semibold">Matches</h1>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <CalendarX className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No upcoming matches scheduled!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back later or ask your captain to add matches.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                <Link key={match.id} href={`/player/matches/${match.id}`}>
                  <MatchCard
                    match={match}
                    userId={userId!}
                    onRsvpChange={fetchMatches}
                  />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <CalendarX className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No past matches yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed matches will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastMatches.map((match) => (
                <Link key={match.id} href={`/player/matches/${match.id}`}>
                  <MatchCard
                    match={match}
                    userId={userId!}
                    onRsvpChange={fetchMatches}
                    pastMatchInfo={
                      match.attended !== undefined
                        ? {
                            attended: match.attended,
                            amountOwed: match.amount_owed ?? 0,
                            isPaid: match.is_paid ?? false,
                          }
                        : undefined
                    }
                  />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
