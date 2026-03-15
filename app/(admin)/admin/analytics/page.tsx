"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

type PlayerRow = {
  id: string
  full_name: string | null
  player_type: string | null
  matches_played: number
  reliability_percent: number
  total_unpaid: number
  last_active: string | null
}

type SortKey = "full_name" | "player_type" | "matches_played" | "reliability_percent" | "total_unpaid" | "last_active"

export default function AdminAnalyticsPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("full_name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, player_type, last_active")
        .eq("role", "player")

      if (!users?.length) {
        setPlayers([])
        setLoading(false)
        return
      }

      const { data: attendance } = await supabase
        .from("attendance")
        .select("user_id")
        .eq("attended", true)

      const playedMap = new Map<string, number>()
      attendance?.forEach((a) => {
        playedMap.set(a.user_id, (playedMap.get(a.user_id) ?? 0) + 1)
      })

      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("user_id, match_id")
        .in("status", ["CONFIRMED", "WAITLISTED"])

      const { data: completed } = await supabase
        .from("matches")
        .select("id")
        .eq("status", "Completed")
      const completedIds = new Set(completed?.map((m) => m.id) ?? [])

      const rsvpedCompletedMap = new Map<string, number>()
      rsvps?.forEach((r) => {
        if (completedIds.has(r.match_id)) {
          rsvpedCompletedMap.set(r.user_id, (rsvpedCompletedMap.get(r.user_id) ?? 0) + 1)
        }
      })

      const { data: dues } = await supabase
        .from("user_dues")
        .select("user_id, amount_owed")
        .eq("is_paid", false)

      const unpaidMap = new Map<string, number>()
      dues?.forEach((d) => {
        unpaidMap.set(d.user_id, (unpaidMap.get(d.user_id) ?? 0) + Number(d.amount_owed))
      })

      const rows: PlayerRow[] = users.map((u) => {
        const played = playedMap.get(u.id) ?? 0
        const rsvped = rsvpedCompletedMap.get(u.id) ?? 0
        const reliability = rsvped > 0 ? Math.round((played / rsvped) * 100) : 0
        return {
          id: u.id,
          full_name: u.full_name,
          player_type: u.player_type,
          matches_played: played,
          reliability_percent: reliability,
          total_unpaid: unpaidMap.get(u.id) ?? 0,
          last_active: u.last_active,
        }
      })

      setPlayers(rows)
      setLoading(false)
    }
    fetch()
  }, [])

  const sorted = [...players].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case "full_name":
        cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "")
        break
      case "player_type":
        cmp = (a.player_type ?? "").localeCompare(b.player_type ?? "")
        break
      case "matches_played":
        cmp = a.matches_played - b.matches_played
        break
      case "reliability_percent":
        cmp = a.reliability_percent - b.reliability_percent
        break
      case "total_unpaid":
        cmp = a.total_unpaid - b.total_unpaid
        break
      case "last_active":
        cmp = new Date(a.last_active ?? 0).getTime() - new Date(b.last_active ?? 0).getTime()
        break
    }
    return sortDir === "asc" ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    setSortKey(key)
    setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"))
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? (
        <ArrowUp className="ml-1 inline h-4 w-4" />
      ) : (
        <ArrowDown className="ml-1 inline h-4 w-4" />
      )
    ) : (
      <ArrowUpDown className="ml-1 inline h-4 w-4 opacity-50" />
    )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Player Analytics</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Player Analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>Sortable overview of registered players</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("full_name")}
                      className="flex items-center font-medium"
                    >
                      Player Name
                      <SortIcon col="full_name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("player_type")}
                      className="flex items-center font-medium"
                    >
                      Type
                      <SortIcon col="player_type" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("matches_played")}
                      className="flex items-center font-medium"
                    >
                      Matches Played
                      <SortIcon col="matches_played" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("reliability_percent")}
                      className="flex items-center font-medium"
                    >
                      Reliability %
                      <SortIcon col="reliability_percent" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("total_unpaid")}
                      className="flex items-center font-medium"
                    >
                      Total Unpaid
                      <SortIcon col="total_unpaid" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("last_active")}
                      className="flex items-center font-medium"
                    >
                      Last Active
                      <SortIcon col="last_active" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "-"}</TableCell>
                    <TableCell>{p.player_type ?? "-"}</TableCell>
                    <TableCell>{p.matches_played}</TableCell>
                    <TableCell>{p.reliability_percent}%</TableCell>
                    <TableCell>₹{p.total_unpaid.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      {p.last_active
                        ? new Date(p.last_active).toLocaleDateString("en-IN")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {players.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No players yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
