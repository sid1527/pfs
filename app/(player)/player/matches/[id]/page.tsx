"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MatchCard, type Match } from "@/components/MatchCard"
import { RSVPButton } from "@/components/RSVPButton"
import { Loader2, Calendar, MapPin, ArrowLeft, CheckCircle2, XCircle, Wallet } from "lucide-react"

type PlayerInfo = {
  id: string
  full_name: string | null
  nickname: string | null
  profile_photo_url: string | null
}

type RsvpWithUser = {
  user_id: string
  status: string
  users: PlayerInfo | PlayerInfo[] | null
}

type AttendanceRow = {
  user_id: string
  attended: boolean
  users: PlayerInfo | PlayerInfo[] | null
}

type DueRow = {
  user_id: string
  amount_owed: number
  is_paid: boolean
  users: PlayerInfo | PlayerInfo[] | null
}

function getUserName(u: PlayerInfo | PlayerInfo[] | null): string {
  if (!u) return "—"
  const user = Array.isArray(u) ? u[0] : u
  return (user.nickname || user.full_name) ?? "—"
}

export default function PlayerMatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [confirmed, setConfirmed] = useState<PlayerInfo[]>([])
  const [waitlisted, setWaitlisted] = useState<PlayerInfo[]>([])
  const [out, setOut] = useState<PlayerInfo[]>([])
  const [attendance, setAttendance] = useState<{ user: PlayerInfo; attended: boolean }[]>([])
  const [dues, setDues] = useState<{ user: PlayerInfo; amountOwed: number; isPaid: boolean }[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace("/login")
      return
    }
    setUserId(user.id)

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
    const userIsAdmin = profile?.role === "admin"
    setIsAdmin(userIsAdmin)

    const { data: matchData } = await supabase
      .from("matches")
      .select("id, title, match_type, opponent_name, match_date, venue, max_capacity, status")
      .eq("id", matchId)
      .single()

    if (!matchData) {
      setLoading(false)
      return
    }
    setMatch({
      ...matchData,
      confirmed_count: 0,
      user_rsvp: null,
    })

    const { data: rsvpsData } = await supabase
      .from("rsvps")
      .select(`
        user_id,
        status,
        users (id, full_name, nickname, profile_photo_url)
      `)
      .eq("match_id", matchId)

    const confirmedList: PlayerInfo[] = []
    const waitlistedList: PlayerInfo[] = []
    const outList: PlayerInfo[] = []

    for (const r of rsvpsData ?? []) {
      const row = r as unknown as RsvpWithUser
      const u = Array.isArray(row.users) ? row.users[0] : row.users
      if (!u) continue
      const uu = u as { id?: string; full_name?: string | null; nickname?: string | null; profile_photo_url?: string | null }
      const player: PlayerInfo = { id: row.user_id, full_name: uu.full_name ?? null, nickname: uu.nickname ?? null, profile_photo_url: uu.profile_photo_url ?? null }
      if (row.status === "CONFIRMED") confirmedList.push(player)
      else if (row.status === "WAITLISTED") waitlistedList.push(player)
      else outList.push(player)
    }

    setConfirmed(confirmedList)
    setWaitlisted(waitlistedList)
    setOut(outList)
    setConfirmedCount(confirmedList.length)

    const userRsvp = rsvpsData?.find((r: { user_id: string }) => r.user_id === user.id) as RsvpWithUser | undefined

    if (matchData.status === "Completed") {
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(`
          user_id,
          attended,
          users (id, full_name, nickname, profile_photo_url)
        `)
        .eq("match_id", matchId)

      const attendanceList = (attendanceData ?? []).map((a: AttendanceRow) => ({
        user: Array.isArray(a.users) ? a.users[0] : a.users,
        attended: a.attended,
      })).filter((x: { user: PlayerInfo | null }) => x.user) as { user: PlayerInfo; attended: boolean }[]

      setAttendance(attendanceList)

      const { data: duesData } = await supabase
        .from("user_dues")
        .select(`
          user_id,
          amount_owed,
          is_paid,
          users (id, full_name, nickname, profile_photo_url)
        `)
        .eq("match_id", matchId)
        .gt("amount_owed", 0)

      const duesList = (duesData ?? []).map((d: DueRow) => ({
        user: Array.isArray(d.users) ? d.users[0] : d.users,
        amountOwed: Number(d.amount_owed),
        isPaid: d.is_paid,
      })).filter((x: { user: PlayerInfo | null }) => x.user) as { user: PlayerInfo; amountOwed: number; isPaid: boolean }[]

      if (userIsAdmin) {
        setDues(duesList)
      } else {
        setDues(duesList.filter((d) => d.user?.id === user.id))
      }
    } else {
      setMatch((m) => m ? { ...m, user_rsvp: userRsvp ? { status: userRsvp.status } : null, confirmed_count: confirmedList.length } : null)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [matchId])

  if (loading || !match) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isUpcoming = match.status === "Upcoming"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/player/dashboard"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">{match.title}</h1>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date(match.match_date).toLocaleDateString("en-IN", { dateStyle: "long" })}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {match.venue}
        </div>
        {match.opponent_name && (
          <p>vs {match.opponent_name}</p>
        )}
      </div>

      {isUpcoming && userId && (
        <div onClick={(e) => e.stopPropagation()} role="presentation">
          <RSVPButton
            matchId={match.id}
            userId={userId}
            currentStatus={match.user_rsvp?.status}
            confirmedCount={confirmedCount}
            maxCapacity={match.max_capacity}
            matchTitle={match.title}
            onSuccess={fetchData}
          />
        </div>
      )}

      {isUpcoming && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmed</CardTitle>
              <CardDescription>{confirmed.length} players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {confirmed.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.profile_photo_url ? (
                      <Image src={p.profile_photo_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {(getUserName(p) ?? "?")[0]}
                      </div>
                    )}
                  </div>
                  <span>{getUserName(p)}</span>
                </div>
              ))}
              {confirmed.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Waitlisted</CardTitle>
              <CardDescription>{waitlisted.length} players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {waitlisted.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.profile_photo_url ? (
                      <Image src={p.profile_photo_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {(getUserName(p) ?? "?")[0]}
                      </div>
                    )}
                  </div>
                  <span>{getUserName(p)}</span>
                </div>
              ))}
              {waitlisted.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Out</CardTitle>
              <CardDescription>{out.length} players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {out.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.profile_photo_url ? (
                      <Image src={p.profile_photo_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {(getUserName(p) ?? "?")[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground">{getUserName(p)}</span>
                </div>
              ))}
              {out.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {!isUpcoming && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
              <CardDescription>Who attended the match</CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {attendance.map(({ user, attended }) => (
                    <div key={user.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                          {user.profile_photo_url ? (
                            <Image src={user.profile_photo_url} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                              {(getUserName(user) ?? "?")[0]}
                            </div>
                          )}
                        </div>
                        <span>{getUserName(user)}</span>
                      </div>
                      {attended ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" /> Attended
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-4 w-4" /> Did not attend
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Status</CardTitle>
              <CardDescription>
                {isAdmin ? "Payment status for all players" : "Your payment status"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dues for this match.</p>
              ) : (
                <div className="space-y-2">
                  {dues.map(({ user, amountOwed, isPaid }) => (
                    <div key={user.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span>{getUserName(user)}</span>
                      </div>
                      {isPaid ? (
                        <span className="text-green-600">Paid</span>
                      ) : (
                        <span className="text-amber-600">₹{amountOwed} pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
