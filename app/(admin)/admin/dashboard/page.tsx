"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users } from "lucide-react"

type Match = {
  id: string
  title: string
  match_date: string
  venue: string
  status: string
  match_type: string
  opponent_name: string | null
}

export default function AdminDashboardPage() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [pastMatches, setPastMatches] = useState<Match[]>([])
  const [playerCount, setPlayerCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: upcomingData } = await supabase
        .from("matches")
        .select("id, title, match_date, venue, status, match_type, opponent_name")
        .eq("status", "Upcoming")
        .order("match_date", { ascending: true })
        .limit(10)

      setUpcomingMatches(upcomingData ?? [])

      const { data: pastData } = await supabase
        .from("matches")
        .select("id, title, match_date, venue, status, match_type, opponent_name")
        .eq("status", "Completed")
        .order("match_date", { ascending: false })
        .limit(10)

      setPastMatches(pastData ?? [])

      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "player")

      setPlayerCount(count ?? 0)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{playerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Matches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcomingMatches.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
          <CardDescription>Upcoming and past matches</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4">
              {upcomingMatches.length === 0 ? (
                <p className="text-muted-foreground">No upcoming matches.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingMatches.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/admin/matches/${m.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                      >
                        <div>
                          <p className="font-medium">{m.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(m.match_date).toLocaleDateString("en-IN")} · {m.venue}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">{m.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/admin/matches/new"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                + Create new match
              </Link>
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              {pastMatches.length === 0 ? (
                <p className="text-muted-foreground">No past matches.</p>
              ) : (
                <ul className="space-y-2">
                  {pastMatches.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/admin/matches/${m.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                      >
                        <div>
                          <p className="font-medium">{m.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(m.match_date).toLocaleDateString("en-IN")} · {m.venue}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">{m.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
